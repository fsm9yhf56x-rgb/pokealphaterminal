import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

// Confirm: BW-2010 = Black Collection + White Collection (split JP)
const bw = await sql`SELECT card_number, subject_name FROM psa_pop_reports WHERE card_ref LIKE 'jp-BLACK-WHITE-2010-%' ORDER BY (card_number)::int LIMIT 10`
console.log('=== BLACK-WHITE-2010 samples ===')
bw.forEach(x => console.log(`  ${x.card_number}: ${x.subject_name}`))

// aopkm-227 Black Collection (60 cards) + aopkm-228 White Collection (~60 cards)
// PSA peut compiler les 2 sous BLACK-WHITE-2010
// → mapper sur aopkm-227 par défaut (le plus représentatif)

const BATCH10 = [
  // BW first sets JP (Black + White Collection 2010)
  { psa: 'BLACK-WHITE-2010',         tcg: 'aopkm-227', name: 'Black Collection' },
  // BEGINNING-SET 2010/2011 = aopkm-223
  { psa: 'BEGINNING-SET-2010',       tcg: 'aopkm-223', name: 'Beginning Set' },
  { psa: 'BEGINNING-SET-2011',       tcg: 'aopkm-223', name: 'Beginning Set' },
  // XY-BEGINNING-SET (2013) = ?
  { psa: 'XY-BEGINNING-SET-2013',    tcg: 'aopkm-289', name: 'XY Beginning Set' },
  // S-PROMO-2019 (BW era?) → BW-P aopkm-226 or SM-P
  // Actually S-PROMO is Sword & Shield era (2020+), so S-PROMO-2019 might be aopkm-397
  // But unsafe → skip
]

console.log('\n=== Search aopkm BW Beginning Set XY ===')
const x = await sql`SELECT id, name FROM tcg_sets WHERE id ~ '^aopkm-[0-9]+$' AND name ILIKE '%xy beginning%' LIMIT 5`
x.forEach(r => console.log(`  '${r.id}': '${r.name}'`))

console.log('\n=== BATCH 10 ===')
let inserted = 0, skipped = 0

for (const m of BATCH10) {
  const exists = await sql`SELECT id, name FROM tcg_sets WHERE id = ${m.tcg}`
  if (exists.length === 0) {
    console.log(`  KO '${m.psa}': tcg_set '${m.tcg}' not found`)
    skipped++
    continue
  }
  try {
    await sql`
      INSERT INTO psa_set_mappings (psa_set_code, tcg_set_id, set_name, confidence, notes)
      VALUES (${m.psa}, ${m.tcg}, ${exists[0].name}, 'verified', 'Batch 10 BW + Beginning sets')
      ON CONFLICT (psa_set_code) DO UPDATE SET
        tcg_set_id = EXCLUDED.tcg_set_id, set_name = EXCLUDED.set_name,
        confidence = 'verified', updated_at = NOW()
    `
    console.log(`  OK '${m.psa}' → ${m.tcg} (${exists[0].name})`)
    inserted++
  } catch (e) {
    console.log(`  KO '${m.psa}': ${e.message}`)
    skipped++
  }
}

console.log(`\nBatch 10: ${inserted} inserted, ${skipped} skipped`)
