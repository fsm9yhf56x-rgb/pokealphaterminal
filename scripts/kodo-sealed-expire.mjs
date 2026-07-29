// scripts/kodo-sealed-expire.mjs
// Perime les cotes scelle qui ne sont plus revues par les ingests.
// Idempotent. Dry-run par defaut.
//
//   node scripts/kodo-sealed-expire.mjs --check
//   node scripts/kodo-sealed-expire.mjs --commit
//
// POURQUOI : un produit qui disparait des annonces n'est plus vu par l'ingest,
// donc plus jamais reecrit — et il garde sa derniere cote INDEFINIMENT. Un display
// a 1 980 EUR pourrait rester affiche des mois apres que le marche l'ait quitte.
// C'est le meme defaut que les orphelins de price_signals corriges le 23/06 :
// l'INSERT...SELECT ne touche que ce qu'il voit, jamais ce qui a disparu.
//
// On ne SUPPRIME rien : le produit reste au catalogue (il a existe, il existera
// peut-etre encore), c'est sa COTE qui tombe a NULL + insufficient_data. Mieux
// vaut "Donnees insuffisantes" qu'un prix mort affiche comme actuel.
//
// Seuils differents par langue car les cadences d'ingestion different :
//   FR = eBay, quotidien      -> 14 jours sans relecture = mort
//   EN = PPT, hebdomadaire    -> 21 jours (3 passages manques)

import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('Manque DATABASE_URL'); process.exit(1); }
const sql = neon(DB_URL);

const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const DAYS = {
  fr: Number(process.env.KODO_SEALED_EXPIRE_FR || 14),
  en: Number(process.env.KODO_SEALED_EXPIRE_EN || 21),
  jp: Number(process.env.KODO_SEALED_EXPIRE_JP || 21),
};

console.log((COMMIT ? '>>> COMMIT' : '>>> DRY-RUN') + ' | seuils : ' +
  Object.entries(DAYS).map(([k, v]) => k + ' ' + v + 'j').join(' · ') + '\n');

const etat = await sql.query(
  `SELECT p.lang,
          count(*)::int total,
          count(sp.market_eur)::int cotes,
          count(*) FILTER (WHERE sp.updated_at < now() - (($2::int) || ' days')::interval
                             AND sp.market_eur IS NOT NULL)::int perimes,
          max(sp.updated_at) derniere_ecriture
     FROM k_sealed_products p
     JOIN sealed_prices sp ON sp.sealed_id = p.id
    WHERE p.lang = $1
    GROUP BY 1`,
  ['fr', DAYS.fr]
);

for (const lang of ['fr', 'en', 'jp']) {
  const r = await sql.query(
    `SELECT count(*)::int total,
            count(sp.market_eur)::int cotes,
            count(*) FILTER (WHERE sp.updated_at < now() - (($2::int) || ' days')::interval
                               AND sp.market_eur IS NOT NULL)::int perimes,
            max(sp.updated_at) derniere
       FROM k_sealed_products p
       JOIN sealed_prices sp ON sp.sealed_id = p.id
      WHERE p.lang = $1`,
    [lang, DAYS[lang]]
  );
  const x = r[0];
  if (!x || !x.total) continue;
  const age = x.derniere ? Math.round((Date.now() - new Date(x.derniere).getTime()) / 86400000) : null;
  console.log('  ' + lang.toUpperCase() + ' : ' + x.total + ' produits · ' + x.cotes + ' cotes · '
    + x.perimes + ' perimes · derniere ecriture il y a ' + (age == null ? '?' : age + 'j'));
}

if (!COMMIT) {
  console.log('\nDRY-RUN : rien ecrit. Relancer avec --commit.');
  process.exit(0);
}

let total = 0;
for (const lang of ['fr', 'en', 'jp']) {
  const rows = await sql.query(
    `UPDATE sealed_prices sp
        SET market_eur = NULL, low_eur = NULL, raw_eur = NULL,
            sellers = NULL, sample_size = NULL,
            method = 'insufficient_data'
       FROM k_sealed_products p
      WHERE p.id = sp.sealed_id
        AND p.lang = $1
        AND sp.market_eur IS NOT NULL
        AND sp.updated_at < now() - (($2::int) || ' days')::interval
      RETURNING sp.sealed_id`,
    [lang, DAYS[lang]]
  );
  if (rows.length) console.log('  ' + lang.toUpperCase() + ' : ' + rows.length + ' cotes perimees');
  total += rows.length;
}
console.log('\n' + total + ' cotes retirees. Les produits restent au catalogue.');
void etat;
