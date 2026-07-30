// scripts/prune-price-history.mjs
// Elague price_history : ne garde que les CHANGEMENTS de prix, plus un point de
// controle hebdomadaire par serie. Dry-run par defaut, --commit pour appliquer.
//
//   node scripts/prune-price-history.mjs --check
//   node scripts/prune-price-history.mjs --commit
//
// MESURE DU 30/07 : 16 928 014 lignes dont 15 942 486 IDENTIQUES a la precedente.
// Seuls 985 528 points portent une information. La table pese 2881 MB pour ~170 MB
// de donnee utile, et un simple lag() y prend 167 secondes.
//
// POURQUOI C'EST SANS PERTE : un graphique de prix se reconstruit exactement a
// partir des seuls points de changement — l'UI relie les points, donc un prix
// stable donne une ligne plate, ce qui est precisement la verite. Ce qu'on
// supprime, ce sont 15,9 millions de repetitions du meme chiffre.
//
// LE POINT HEBDOMADAIRE : sans lui, une carte stable depuis deux mois n'aurait
// aucun point recent et sa courbe s'arreterait net. On garde donc le dernier
// point de chaque semaine ISO, meme inchange, pour que la serie reste continue.
//
// PRUDENCE : suppression par lots de 25 000 (jamais d'un bloc sur Neon), et
// JAMAIS de VACUUM FULL. Le dernier point de chaque serie est toujours conserve,
// quelle que soit son anciennete — c'est lui que lit la fiche produit.

import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('Manque DATABASE_URL'); process.exit(1); }
const sql = neon(DB_URL);

const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const LOT = Number(process.env.PRUNE_LOT || 25000);
const MAX_MIN = Number(process.env.PRUNE_MAX_MINUTES || 40);
const START = Date.now();

// Une ligne est SUPERFLUE si elle repete le prix precedent de sa serie
// ET qu'elle n'est ni le dernier point de sa semaine, ni le dernier point connu.
const TABLE_TEMP = 'ph_prune_todo';

async function build() {
  console.log('construction de la liste (une passe, cote serveur)...');
  const t0 = Date.now();
  await sql.query(`DROP TABLE IF EXISTS ${TABLE_TEMP}`);
  await sql.query(`
    CREATE TABLE ${TABLE_TEMP} AS
    WITH marque AS (
      SELECT print_id, day, tier, source, price,
             lag(price) OVER w AS prev,
             row_number() OVER (PARTITION BY print_id, tier, source,
                                date_trunc('week', day) ORDER BY day DESC) AS rang_semaine,
             row_number() OVER (PARTITION BY print_id, tier, source
                                ORDER BY day DESC) AS rang_serie
        FROM price_history
      WINDOW w AS (PARTITION BY print_id, tier, source ORDER BY day)
    )
    SELECT print_id, day, tier, source
      FROM marque
     WHERE prev IS NOT NULL
       AND price = prev            -- repete le precedent
       AND rang_semaine > 1        -- pas le point de controle hebdomadaire
       AND rang_serie > 1          -- jamais le dernier point connu
  `);
  const n = await sql.query(`SELECT count(*)::bigint n FROM ${TABLE_TEMP}`);
  console.log('  ' + Number(n[0].n).toLocaleString('fr-FR') + ' lignes superflues (' + Math.round((Date.now() - t0) / 1000) + 's)');
  return Number(n[0].n);
}

const avant = await sql.query(
  `SELECT count(*)::bigint lignes, pg_size_pretty(pg_total_relation_size('price_history')) taille FROM price_history`
);
console.log('avant : ' + Number(avant[0].lignes).toLocaleString('fr-FR') + ' lignes · ' + avant[0].taille + '\n');

const aSupprimer = await build();

if (!COMMIT) {
  const reste = Number(avant[0].lignes) - aSupprimer;
  console.log('\napres elagage : ' + reste.toLocaleString('fr-FR') + ' lignes ('
    + Math.round((reste / Number(avant[0].lignes)) * 100) + '% conservees)');
  await sql.query(`DROP TABLE IF EXISTS ${TABLE_TEMP}`);
  console.log('\nDRY-RUN : rien supprime. Relancer avec --commit.');
  process.exit(0);
}

await sql.query(`CREATE INDEX ON ${TABLE_TEMP} (print_id, day, tier, source)`);
console.log('\nsuppression par lots de ' + LOT.toLocaleString('fr-FR') + '...');
let total = 0;
for (;;) {
  if ((Date.now() - START) / 60000 > MAX_MIN) { console.log('  plafond de temps atteint, arret propre'); break; }
  const r = await sql.query(`
    WITH cible AS (
      SELECT print_id, day, tier, source FROM ${TABLE_TEMP} LIMIT ${LOT}
    ), sup AS (
      DELETE FROM price_history ph
       USING cible c
       WHERE ph.print_id = c.print_id AND ph.day = c.day
         AND ph.tier = c.tier AND ph.source = c.source
      RETURNING 1
    ), nettoie AS (
      DELETE FROM ${TABLE_TEMP} t
       USING cible c
       WHERE t.print_id = c.print_id AND t.day = c.day
         AND t.tier = c.tier AND t.source = c.source
      RETURNING 1
    )
    SELECT (SELECT count(*)::int FROM sup) AS n`);
  const n = r[0] ? Number(r[0].n) : 0;
  if (!n) break;
  total += n;
  if (total % (LOT * 10) === 0 || n < LOT) {
    console.log('  ' + total.toLocaleString('fr-FR') + ' supprimees');
  }
}

await sql.query(`DROP TABLE IF EXISTS ${TABLE_TEMP}`);
await sql.query(`ANALYZE price_history`);

const apres = await sql.query(
  `SELECT count(*)::bigint lignes, pg_size_pretty(pg_total_relation_size('price_history')) taille FROM price_history`
);
console.log('\napres : ' + Number(apres[0].lignes).toLocaleString('fr-FR') + ' lignes · ' + apres[0].taille);
console.log(total.toLocaleString('fr-FR') + ' lignes supprimees.');
console.log('\nL espace disque se libere progressivement (autovacuum). JAMAIS de VACUUM FULL sur Neon.');
