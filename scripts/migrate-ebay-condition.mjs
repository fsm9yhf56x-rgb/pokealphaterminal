// Migration : ajoute condition_raw (libelle eBay brut) + condition_tier (mappe
// NM/EX/LP/MP/HP/DMG) + condition_source (title|ebay_condition) a ebay_fr_ed1_raw.
// ADDITIVE et IDEMPOTENTE (IF NOT EXISTS) : aucune donnee touchee, relançable.
// Backfill des tiers depuis les TITRES existants (le champ condition eBay n'a
// pas ete stocke pour les annonces passees -> title-only, honnete).
//
// Usage : DATABASE_URL=... node scripts/migrate-ebay-condition.mjs
import { neon } from '@neondatabase/serverless';
import { extractConditionTier } from './lib/ebay-condition.mjs';

const sql = neon(process.env.DATABASE_URL);

console.log('1/3 — ALTER TABLE (additif, idempotent)');
await sql`ALTER TABLE ebay_fr_ed1_raw ADD COLUMN IF NOT EXISTS condition_raw text`;
await sql`ALTER TABLE ebay_fr_ed1_raw ADD COLUMN IF NOT EXISTS condition_tier text`;
await sql`ALTER TABLE ebay_fr_ed1_raw ADD COLUMN IF NOT EXISTS condition_source text`;

console.log('2/3 — Backfill depuis les titres existants (lots de 500)');
let done = 0, tagged = 0;
for (;;) {
  const rows = await sql`
    SELECT item_id, title FROM ebay_fr_ed1_raw
    WHERE condition_tier IS NULL AND condition_source IS NULL
    ORDER BY item_id LIMIT 500`;
  if (rows.length === 0) break;
  const ids = [], tiers = [], srcs = [];
  for (const r of rows) {
    const { tier, source } = extractConditionTier(r.title, null);
    ids.push(r.item_id);
    tiers.push(tier);                       // null si rien trouve
    srcs.push(source ?? 'none');            // 'none' = deja traite, rien trouve
  }
  await sql.query(
    `UPDATE ebay_fr_ed1_raw e SET condition_tier = x.tier, condition_source = x.src
     FROM unnest($1::text[], $2::text[], $3::text[]) AS x(item, tier, src)
     WHERE e.item_id = x.item`,
    [ids, tiers, srcs],
  );
  done += rows.length;
  tagged += tiers.filter(Boolean).length;
  console.log(`  ${done} traitees, ${tagged} avec etat detecte`);
}

console.log('3/3 — Etat final');
const stats = await sql`
  SELECT condition_tier, count(*)::int AS n FROM ebay_fr_ed1_raw
  GROUP BY condition_tier ORDER BY n DESC`;
for (const s of stats) console.log(`  ${String(s.condition_tier).padEnd(20)} ${s.n}`);
console.log('Migration terminee.');
