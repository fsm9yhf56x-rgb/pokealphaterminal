// scripts/migrate-sealed-last-priced.mjs
// Ajoute sealed_prices.last_priced_at : la date du dernier calcul AVEC des
// annonces reelles. Idempotent. --check pour sonder, --commit pour appliquer.
//
// POURQUOI CETTE COLONNE, ET PAS updated_at :
//   updated_at est pose par le trigger a CHAQUE ecriture, y compris quand on
//   reecrit une ligne sans nouvelle donnee. Il dit "quand on a touche la ligne",
//   pas "quand le marche a parle". Meme distinction que as_of / updated_at sur
//   price_matrix (17/07) : sans elle, impossible de savoir si un prix est frais
//   ou simplement recopie.
//
// REGLE PRODUIT (decision Alon) : quand un produit disparait des annonces, on
//   NE SUPPRIME PLUS son prix. Un display Set de Base passe trois fois par an —
//   l'effacer laisserait la fiche vide onze mois sur douze, alors que
//   "dernier releve : 79 000 EUR, il y a 3 mois" est exactement ce dont un
//   collectionneur de vintage a besoin. Le prix reapparait en clair des qu'une
//   annonce similaire revient.
//   Ce n'est pas un renoncement au principe Kodo : un prix DATE n'est pas un
//   prix invente. Ce qu'on s'interdit, c'est de le faire passer pour actuel.

import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('Manque DATABASE_URL'); process.exit(1); }
const sql = neon(DB_URL);

const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');

const cols = await sql.query(
  `SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sealed_prices'`
);
const has = (c) => cols.some((x) => x.column_name === c);

console.log('sealed_prices.last_priced_at : ' + (has('last_priced_at') ? '[x] presente' : '[ ] absente'));

const etat = await sql.query(
  `SELECT p.lang, count(*)::int total, count(sp.market_eur)::int avec_prix
     FROM k_sealed_products p JOIN sealed_prices sp ON sp.sealed_id = p.id
    GROUP BY 1 ORDER BY 1`
);
for (const r of etat) console.log('  ' + r.lang + ' : ' + r.total + ' lignes · ' + r.avec_prix + ' avec prix');

if (!COMMIT) {
  console.log('\nDRY-RUN : relancer avec --commit pour appliquer.');
  process.exit(0);
}

await sql.query(`ALTER TABLE sealed_prices ADD COLUMN IF NOT EXISTS last_priced_at timestamptz`);
console.log('\n  colonne ajoutee');

// Backfill : toute ligne qui PORTE un prix a forcement ete calculee avec des
// annonces. On date depuis computed_at, la meilleure approximation disponible.
const b = await sql.query(
  `UPDATE sealed_prices
      SET last_priced_at = COALESCE(computed_at, as_of, updated_at, now())
    WHERE last_priced_at IS NULL AND market_eur IS NOT NULL
    RETURNING sealed_id`
);
console.log('  backfill : ' + b.length + ' lignes datees');

await sql.query(`CREATE INDEX IF NOT EXISTS idx_sealed_prices_last_priced ON sealed_prices (last_priced_at)`);
console.log('  index : ok');

const apres = await sql.query(
  `SELECT count(*)::int total, count(last_priced_at)::int dates,
          min(last_priced_at) plus_ancien, max(last_priced_at) plus_recent
     FROM sealed_prices WHERE market_eur IS NOT NULL`
);
const a = apres[0];
console.log('\n  ' + a.dates + '/' + a.total + ' prix dates · du ' + String(a.plus_ancien || '').slice(0, 10) + ' au ' + String(a.plus_recent || '').slice(0, 10));
