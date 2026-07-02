// scripts/sync-ebay-fr-raw.mjs
// Resynchronise ccc_price_raw + psa_price_raw -> ebay_fr_price_raw (unifiee).
// UPSERT : les prix/last_seen changent chaque nuit, on met a jour (pas DO NOTHING).
// first_seen preserve. Lance dans le cron entre l'ingest et le match.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS ebay_fr_price_raw (
    company text NOT NULL, item_id text NOT NULL, title text NOT NULL,
    price numeric, currency text, grade_num numeric, grade_label text, tier text,
    card_number text, set_total text, lang text, variant_hint text, edition_hint text,
    is_lot boolean, excluded boolean, exclude_reason text, url text,
    fetched_at timestamptz NOT NULL, first_seen timestamptz, last_seen timestamptz,
    PRIMARY KEY (company, item_id)
  )`;

const COLS = 'item_id,title,price,currency,grade_num,grade_label,tier,card_number,set_total,lang,variant_hint,edition_hint,is_lot,excluded,exclude_reason,url,fetched_at,first_seen,last_seen';
const UPD = ['title','price','currency','grade_num','grade_label','tier','card_number','set_total','lang','variant_hint','edition_hint','is_lot','excluded','exclude_reason','url','fetched_at','last_seen']
  .map(c => `${c}=EXCLUDED.${c}`).join(', ');

for (const [company, table] of [['CCC','ccc_price_raw'], ['PSA','psa_price_raw']]) {
  const res = await sql.query(
    `INSERT INTO ebay_fr_price_raw (company,${COLS})
     SELECT '${company}',${COLS} FROM ${table}
     ON CONFLICT (company,item_id) DO UPDATE SET ${UPD}`);
  console.log(`  ${company} <- ${table} : sync OK`);
}
const r = await sql`SELECT company, COUNT(*)::int n FROM ebay_fr_price_raw GROUP BY company ORDER BY company`;
console.log('ebay_fr_price_raw :', r.map(x => `${x.company}=${x.n}`).join(' '));
