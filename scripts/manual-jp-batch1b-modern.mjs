import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

const BATCH1B = [
  // SV récents trouvés
  { psa: 'SV3A',  tcg: 'aopkm-502', name: 'Raging Surf' },
  { psa: 'SV4M',  tcg: 'aopkm-503', name: 'Future Flash' },
  { psa: 'SV5K',  tcg: 'aopkm-508', name: 'Wild Force' },
  { psa: 'SV5M',  tcg: 'aopkm-509', name: 'Cyber Judge' },
  { psa: 'SV6A',  tcg: 'aopkm-519', name: 'Night Wanderer' },
  { psa: 'SV9',   tcg: 'aopkm-556', name: 'Battle Partners' },
  // SV8 = Super Electric Breaker, SV10 = Heat Wave Arena → pas trouvé dans tcg, on cherche autrement
]

console.log('=== BATCH 1b: SV remaining ===')
let inserted = 0, skipped = 0

for (const m of BATCH1B) {
  const exists = await sql`SELECT id, name FROM tcg_sets WHERE id = ${m.tcg}`
  if (exists.length === 0) {
    console.log(`  KO '${m.psa}': tcg_set '${m.tcg}' not found`)
    skipped++
    continue
  }
  try {
    await sql`
      INSERT INTO psa_set_mappings (psa_set_code, tcg_set_id, set_name, confidence, notes)
      VALUES (${m.psa}, ${m.tcg}, ${exists[0].name}, 'verified', 'Batch 1b modern JP 2026-05-22')
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

console.log(`\nBatch 1b: ${inserted} inserted, ${skipped} skipped`)
