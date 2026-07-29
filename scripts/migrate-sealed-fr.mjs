// scripts/migrate-sealed-fr.mjs
// Prepare l'etage scelle a accueillir le FR. IDEMPOTENT. Dry-run par defaut.
//
//   node scripts/migrate-sealed-fr.mjs --check    -> etat actuel, n'ecrit rien
//   node scripts/migrate-sealed-fr.mjs --commit   -> applique
//
// POURQUOI : aujourd'hui sealed_prices ne porte QUE market_eur/market_usd. Une cote eBay FR
// (annonces, decotees, marche EU) y serait indiscernable d'un unopenedPrice US converti.
// C'est exactement l'erreur que le Lot 2 a coute a reparer cote singles. On ferme avant d'ecrire.

import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('Manque DATABASE_URL'); process.exit(1); }
const sql = neon(DB_URL);

const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const CHECK = argv.includes('--check') || !COMMIT;

// product_type PPT (anglais, libre) -> sku Kodo (canonique, partage EN/FR/JP)
const PPT_TO_SKU = {
  'Booster Box': 'display',
  'Elite Trainer Box': 'etb',
  'Booster Bundle': 'bundle',
  'Booster Pack': 'booster',
  'Build & Battle': 'deck',
  'Premium Collection': 'coffret',
  'Collection': 'coffret',
  'Blister': 'blister',
  'Tin': 'tin',
  'Deck': 'deck',
  'Case': 'case',
  'Box': 'coffret',
};

async function state() {
  const cols = async (t) => (await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`, [t]
  )).map((r) => r.column_name);
  const kp = await cols('k_sealed_products');
  const sp = await cols('sealed_prices');
  const sh = await cols('sealed_price_history');
  const trg = await sql.query(
    `SELECT tgname FROM pg_trigger WHERE tgrelid='sealed_prices'::regclass AND NOT tgisinternal`
  );
  return { kp, sp, sh, trg: trg.map((r) => r.tgname) };
}

const st0 = await state();

if (CHECK) {
  const want = {
    'k_sealed_products': ['kodo_set_id', 'sku', 'content_qty', 'content_unit', 'source', 'first_seen_at', 'last_seen_at'],
    'sealed_prices': ['method', 'market', 'sample_size', 'is_asking', 'raw_eur', 'updated_at'],
    'sealed_price_history': ['method', 'sellers'],
  };
  const have = { 'k_sealed_products': st0.kp, 'sealed_prices': st0.sp, 'sealed_price_history': st0.sh };
  for (const [t, list] of Object.entries(want)) {
    console.log('\n=== ' + t);
    for (const c of list) console.log('   ' + (have[t].includes(c) ? '[x]' : '[ ]') + ' ' + c);
  }
  console.log('\ntriggers sealed_prices : ' + (st0.trg.length ? st0.trg.join(', ') : 'aucun'));

  const v = await sql.query(`SELECT lang, count(*)::int n FROM k_sealed_products GROUP BY 1 ORDER BY 1`);
  console.log('\nproduits par langue : ' + v.map((r) => r.lang + '=' + r.n).join(' '));
  if (st0.sp.includes('method')) {
    const m = await sql.query(`SELECT COALESCE(method,'(null)') m, count(*)::int n FROM sealed_prices GROUP BY 1 ORDER BY 2 DESC`);
    console.log('methodes de prix   : ' + m.map((r) => r.m + '=' + r.n).join(' '));
  }
  if (!COMMIT) { console.log('\nDRY-RUN : relancer avec --commit pour appliquer.'); process.exit(0); }
}

// ---------------------------------------------------------------- application

console.log('\n>>> application');

// 1. catalogue : pont vers k_sets + SKU canonique + provenance
await sql.query(`ALTER TABLE k_sealed_products
  ADD COLUMN IF NOT EXISTS kodo_set_id  text,
  ADD COLUMN IF NOT EXISTS sku          text,
  ADD COLUMN IF NOT EXISTS content_qty  integer,
  ADD COLUMN IF NOT EXISTS content_unit text,
  ADD COLUMN IF NOT EXISTS source       text,
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen_at  timestamptz`);
console.log('  k_sealed_products : colonnes ok');

// 2. prix : la METHODE et le MARCHE deviennent explicites. Sans ca, tout prix est un mensonge en puissance.
await sql.query(`ALTER TABLE sealed_prices
  ADD COLUMN IF NOT EXISTS method      text,
  ADD COLUMN IF NOT EXISTS market      text,
  ADD COLUMN IF NOT EXISTS sample_size integer,
  ADD COLUMN IF NOT EXISTS is_asking   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS raw_eur     numeric,
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz`);
await sql.query(`ALTER TABLE sealed_price_history
  ADD COLUMN IF NOT EXISTS method text`);
console.log('  sealed_prices / history : colonnes ok');

// 3. backfill AVANT le trigger.
//    Leçon du 17/07 sur price_matrix : trigger cree en premier -> tout le backfill porte now()
//    et la colonne ment pendant plusieurs nuits. Ici updated_at herite de computed_at.
const b1 = await sql.query(`UPDATE sealed_prices
   SET updated_at = COALESCE(updated_at, computed_at, as_of, now())
 WHERE updated_at IS NULL`);
const b2 = await sql.query(`UPDATE sealed_prices
   SET method = 'ppt_unopened', market = 'US', is_asking = false
 WHERE method IS NULL`);
console.log('  backfill prix : updated_at ' + (b1.rowCount ?? '?') + ' | method=ppt_unopened ' + (b2.rowCount ?? '?'));

const b3 = await sql.query(`UPDATE k_sealed_products SET source = 'ppt' WHERE source IS NULL`);
console.log('  backfill catalogue : source=ppt ' + (b3.rowCount ?? '?'));

let mapped = 0;
for (const [pt, sku] of Object.entries(PPT_TO_SKU)) {
  const r = await sql.query(`UPDATE k_sealed_products SET sku=$1 WHERE sku IS NULL AND product_type=$2`, [sku, pt]);
  mapped += r.rowCount ?? 0;
}
console.log('  backfill catalogue : sku derive de product_type ' + mapped);

// 4. trigger APRES le backfill : toute ecriture future, par n'importe quel script present ou a venir,
//    date automatiquement. La regle vit a UN endroit et devient incontournable.
await sql.query(`CREATE OR REPLACE FUNCTION kodo_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql`);
await sql.query(`DROP TRIGGER IF EXISTS kodo_touch_sealed_prices ON sealed_prices`);
await sql.query(`CREATE TRIGGER kodo_touch_sealed_prices
  BEFORE INSERT OR UPDATE ON sealed_prices
  FOR EACH ROW EXECUTE FUNCTION kodo_touch_updated_at()`);
console.log('  trigger kodo_touch_sealed_prices : pose');

// 5. index de lecture (fiche produit + listing par serie)
await sql.query(`CREATE INDEX IF NOT EXISTS idx_sealed_products_set  ON k_sealed_products (kodo_set_id, sku)`);
await sql.query(`CREATE INDEX IF NOT EXISTS idx_sealed_products_lang ON k_sealed_products (lang)`);
console.log('  index : ok');

const st1 = await state();
const m = await sql.query(`SELECT COALESCE(method,'(null)') m, count(*)::int n FROM sealed_prices GROUP BY 1 ORDER BY 2 DESC`);
const k = await sql.query(`SELECT COALESCE(sku,'(null)') s, count(*)::int n FROM k_sealed_products GROUP BY 1 ORDER BY 2 DESC`);
console.log('\n=== apres migration');
console.log('  triggers : ' + st1.trg.join(', '));
console.log('  methodes : ' + m.map((r) => r.m + '=' + r.n).join(' '));
console.log('  sku      : ' + k.map((r) => r.s + '=' + r.n).join(' '));
console.log('\nOK. Aucune donnee de prix modifiee : seules les colonnes de provenance ont ete remplies.');
