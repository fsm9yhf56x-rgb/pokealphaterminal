// scripts/migrate-sealed-asks-raw.mjs
// Cree sealed_asks_raw : le JOURNAL de toutes les annonces scelle croisees.
// Idempotent. --check pour sonder, --commit pour appliquer.
//
// POURQUOI CETTE TABLE EST LE SEUL MOYEN D'ATTEINDRE LE VINTAGE
//   Mesure du 29/07 : "display pokemon set de base francais" ramene 3 annonces,
//   et ces 3 annonces sont 3 PRODUITS DIFFERENTS a 449 / 79 000 / 85 EUR.
//   Aucune mediane ne peut sortir de la. Elargir a l'Europe n'apporte RIEN
//   (FR 3 / EU 3 : verifie). Le scelle vintage ne se vend pas sur eBay au
//   quotidien — il passe trois fois par an.
//
//   Le probleme n'est donc pas la source, c'est LA FENETRE. Un display Set de
//   Base ne trouve pas 3 vendeurs le meme jour, mais il en trouve 12 sur 90 jours.
//   Cette donnee-la, personne ne la possede : elle ne s'achete pas, elle
//   s'accumule. Chaque nuit sans ce journal est une nuit perdue POUR TOUJOURS.
//
// CE QU'ON GARDE, ET POURQUOI TOUT
//   Les ingests ne retiennent aujourd'hui que ce qui passe le seuil de 3 vendeurs.
//   Ici on garde TOUT, y compris l'annonce unique : c'est precisement elle qui,
//   accumulee, finit par former un echantillon. On garde aussi les annonces
//   exclues (lot, boite vide, autre langue) avec leur motif — pour pouvoir
//   auditer le parseur plus tard sans avoir a re-interroger eBay.
//
// DEDUP PAR itemId : une meme annonce vue 40 nuits de suite reste UNE ligne.
// first_seen_at / last_seen_at donnent sa duree de vie, ce qui est en soi un
// signal (une annonce qui disparait vite s'est probablement vendue).

import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('Manque DATABASE_URL'); process.exit(1); }
const sql = neon(DB_URL);

const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');

const existe = await sql.query(
  `SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name='sealed_asks_raw'`
);
console.log('sealed_asks_raw : ' + (existe.length ? '[x] presente' : '[ ] absente'));

if (existe.length) {
  const s = await sql.query(`
    SELECT lang, count(*)::int annonces, count(DISTINCT sealed_id)::int produits,
           min(first_seen_at)::date depuis, count(*) FILTER (WHERE excluded)::int exclues
      FROM sealed_asks_raw GROUP BY 1 ORDER BY 1`);
  for (const x of s) {
    console.log('  ' + x.lang + ' : ' + x.annonces + ' annonces · ' + x.produits
      + ' produits · depuis le ' + x.depuis + ' · ' + x.exclues + ' exclues');
  }
}

if (!COMMIT) {
  console.log('\nDRY-RUN : relancer avec --commit pour appliquer.');
  process.exit(0);
}

await sql.query(`
  CREATE TABLE IF NOT EXISTS sealed_asks_raw (
    item_id        text PRIMARY KEY,          -- identifiant eBay de l'annonce
    lang           text NOT NULL,             -- fr | en | jp
    sealed_id      text,                      -- produit apparie, NULL si non resolu
    kodo_set_id    text,                      -- serie reconnue dans le titre
    sku            text,                      -- display, etb, case...
    content_qty    integer,
    content_unit   text,
    title          text NOT NULL,             -- titre BRUT : on ne le reecrit jamais
    price          numeric NOT NULL,
    currency       text NOT NULL,
    seller         text,                      -- pour la dedup par vendeur au calcul
    condition_raw  text,                      -- champ condition eBay tel quel
    ebay_epid      text,
    image_url      text,
    excluded       boolean NOT NULL DEFAULT false,
    exclude_reason text,                      -- lot, vide, autre_langue, preco...
    first_seen_at  timestamptz NOT NULL DEFAULT now(),
    last_seen_at   timestamptz NOT NULL DEFAULT now()
  )`);
console.log('\n  table creee');

// Le calcul de cote lit (sealed_id, last_seen_at) et filtre sur excluded.
await sql.query(`CREATE INDEX IF NOT EXISTS idx_sar_produit ON sealed_asks_raw (sealed_id, last_seen_at DESC) WHERE NOT excluded`);
// La fenetre glissante balaie par date.
await sql.query(`CREATE INDEX IF NOT EXISTS idx_sar_fenetre ON sealed_asks_raw (lang, last_seen_at DESC)`);
// L'audit du parseur passe par le motif d'exclusion.
await sql.query(`CREATE INDEX IF NOT EXISTS idx_sar_motif ON sealed_asks_raw (exclude_reason) WHERE excluded`);
// Les annonces non appariees : gisement pour ameliorer le matching.
await sql.query(`CREATE INDEX IF NOT EXISTS idx_sar_orphelines ON sealed_asks_raw (lang, last_seen_at DESC) WHERE sealed_id IS NULL AND NOT excluded`);
console.log('  4 index poses');

// Vue de lecture : la cote sur fenetre glissante, une voix par vendeur.
// C'est la MEME regle que aggregateAsks (mediane des medianes vendeur, decote 0.88),
// mais appliquee a 90 jours au lieu de l'instantane.
await sql.query(`
  CREATE OR REPLACE VIEW sealed_ask_window AS
  WITH par_vendeur AS (
    SELECT sealed_id, lang,
           COALESCE(seller, 'anon:' || item_id) AS voix,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS prix_vendeur
      FROM sealed_asks_raw
     WHERE NOT excluded
       AND sealed_id IS NOT NULL
       AND last_seen_at > now() - interval '90 days'
     GROUP BY 1, 2, 3
  )
  SELECT sealed_id, lang,
         count(*)::int AS vendeurs,
         round(percentile_cont(0.5) WITHIN GROUP (ORDER BY prix_vendeur)::numeric, 2) AS mediane_brute,
         round((percentile_cont(0.5) WITHIN GROUP (ORDER BY prix_vendeur) * 0.88)::numeric, 2) AS cote_decotee,
         round(min(prix_vendeur)::numeric, 2) AS plancher,
         round(max(prix_vendeur)::numeric, 2) AS plafond
    FROM par_vendeur
   GROUP BY 1, 2`);
console.log('  vue sealed_ask_window creee (fenetre 90 jours, une voix par vendeur)');

const v = await sql.query(`SELECT count(*)::int n FROM sealed_ask_window`);
console.log('\n  ' + v[0].n + ' produits cotables via la fenetre (0 attendu au premier run)');
console.log('\nLa table se remplit aux prochains passages des ingests.');
