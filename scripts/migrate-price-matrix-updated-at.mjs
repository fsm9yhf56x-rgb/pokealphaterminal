/**
 * Kodo Engine — price_matrix.updated_at : QUAND NOUS AVONS ECRIT.
 *
 * LE MANQUE (revele le 17/07 apres 5 sondes contradictoires) :
 * price_matrix n'avait que `as_of` = age de la donnee CHEZ LA SOURCE
 * (card.lastUpdated de PokeTrace). Impossible de distinguer :
 *   - "le cron ne tourne plus"           (panne)
 *   - "le cron ecrit une donnee datee"   (normal, la source n'a pas bouge)
 * Consequences vecues :
 *   - diagnostic faux 2x de suite sur une prétendue panne silencieuse EN ;
 *   - sync-health surveille max(as_of) -> il mesure la fraicheur de la SOURCE,
 *     pas l'activite du pipeline : le garde-fou ne garde rien ;
 *   - le backlog "cote il y a 3 jours" sur la fiche est incodable ;
 *   - pour un produit qui vend la confiance dans la donnee, ne pas pouvoir
 *     prouver quand elle a ete rafraichie est un trou de fond.
 *
 * POURQUOI UN TRIGGER ET PAS "une ligne dans chaque INSERT" :
 * au moins 6 scripts ecrivent dans price_matrix (kodo-ingest-prices,
 * kodo-ingest-eu-lang, kodo-merge-ppt, kodo-graded-fr, ebay-fr-ed1,
 * price-by-state). Un oubli dans un seul = la colonne ment, et une colonne
 * de fraicheur qui ment est PIRE que pas de colonne. Avec le trigger, tout
 * script PRESENT OU FUTUR herite de la verite — y compris l'API B2B.
 * Meme principe que resolvePlan et la regle gradee : la regle vit a UN seul
 * endroit, personne ne peut la contourner.
 *
 * USAGE :
 *   DATABASE_URL=$DBURL node scripts/migrate-price-matrix-updated-at.mjs
 *   DATABASE_URL=$DBURL node scripts/migrate-price-matrix-updated-at.mjs --check
 *
 * IDEMPOTENT : re-executable sans risque.
 * Le backfill initialise updated_at = as_of (approximation honnete du passe :
 * on ne SAIT pas quand ces lignes ont ete ecrites — c'est tout le probleme).
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const checkOnly = process.argv.includes('--check');

async function migrate() {
  console.log('1. colonne updated_at...');
  await sql`ALTER TABLE price_matrix ADD COLUMN IF NOT EXISTS updated_at timestamptz`;

  console.log('2. fonction trigger...');
  await sql`
    CREATE OR REPLACE FUNCTION kodo_touch_updated_at() RETURNS trigger AS $$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql`;

  console.log('3. trigger BEFORE INSERT OR UPDATE...');
  await sql`DROP TRIGGER IF EXISTS trg_price_matrix_updated_at ON price_matrix`;
  await sql`
    CREATE TRIGGER trg_price_matrix_updated_at
    BEFORE INSERT OR UPDATE ON price_matrix
    FOR EACH ROW EXECUTE FUNCTION kodo_touch_updated_at()`;

  console.log('4. backfill (updated_at = as_of pour l existant)...');
  // Par lots de 25k : jamais d'UPDATE massif d'un bloc sur Neon.
  let total = 0;
  for (;;) {
    const r = await sql`
      UPDATE price_matrix SET updated_at = as_of
      WHERE ctid IN (
        SELECT ctid FROM price_matrix WHERE updated_at IS NULL LIMIT 25000
      ) RETURNING 1`;
    if (!r.length) break;
    total += r.length;
    process.stdout.write('   ' + total + ' lignes\r');
  }
  console.log('   ' + total + ' lignes backfillees        ');

  console.log('5. index (pour sync-health et les sondes de fraicheur)...');
  await sql`CREATE INDEX IF NOT EXISTS idx_price_matrix_updated_at ON price_matrix (updated_at DESC)`;

  console.log('\nOK — toute ecriture future horodate d elle-meme.');
}

async function check() {
  const [c] = await sql`
    SELECT COUNT(*)::int AS total,
           COUNT(updated_at)::int AS avec_updated_at
    FROM price_matrix`;
  console.log('=== colonne : ' + c.avec_updated_at + ' / ' + c.total + ' lignes horodatees');

  const t = await sql`
    SELECT tgname FROM pg_trigger
    WHERE tgrelid = 'price_matrix'::regclass AND NOT tgisinternal`;
  console.log('=== trigger : ' + (t.length ? t.map(x => x.tgname).join(', ') : 'ABSENT'));

  console.log('\n=== ACTIVITE REELLE DU PIPELINE (ce que as_of ne pouvait pas dire)');
  const a = await sql`
    SELECT split_part(kodo_card_id,'-',1) AS lang,
           COUNT(*) FILTER (WHERE updated_at > now() - interval '24 hours')::int AS ecrit_24h,
           COUNT(*) FILTER (WHERE updated_at > now() - interval '7 days')::int  AS ecrit_7j,
           max(updated_at) AS derniere_ecriture
    FROM price_matrix
    WHERE split_part(kodo_card_id,'-',1) IN ('en','fr','jp')
    GROUP BY 1 ORDER BY 1`;
  for (const r of a) {
    console.log('  ' + r.lang.padEnd(4) + '24h: ' + String(r.ecrit_24h).padStart(7) +
      '   7j: ' + String(r.ecrit_7j).padStart(7) +
      '   derniere: ' + String(r.derniere_ecriture).slice(0, 16));
  }

  console.log('\n=== AGE DE LA DONNEE SOURCE (as_of) — le vrai go/no-go');
  const f = await sql`
    SELECT split_part(kodo_card_id,'-',1) AS lang,
           COUNT(DISTINCT kodo_card_id) FILTER (WHERE as_of > now() - interval '7 days')::int  AS src_7j,
           COUNT(DISTINCT kodo_card_id) FILTER (WHERE as_of < now() - interval '30 days')::int AS src_30j,
           COUNT(DISTINCT kodo_card_id)::int AS cartes
    FROM price_matrix
    WHERE tier = 'NEAR_MINT' AND is_asking = false
      AND split_part(kodo_card_id,'-',1) IN ('en','fr','jp')
    GROUP BY 1 ORDER BY 1`;
  for (const r of f) {
    console.log('  ' + r.lang.padEnd(4) + '<7j: ' + String(r.src_7j).padStart(6) +
      '   >30j: ' + String(r.src_30j).padStart(6) + '   total: ' + r.cartes);
  }
  console.log('\nLire : "ecrit 24h" > 0 = le pipeline tourne. ">30j" = ce qu un testeur');
  console.log('pourrait voir de perime. Les deux etaient INDISCERNABLES avant aujourd hui.');
}

(checkOnly ? check() : migrate().then(check))
  .then(() => process.exit(0))
  .catch(e => { console.error('ERREUR', e.message); process.exit(1); });
