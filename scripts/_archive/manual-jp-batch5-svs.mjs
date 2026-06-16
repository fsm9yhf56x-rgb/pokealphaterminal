import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

// FIX SV7A wrong mapping : it was aopkm-544 Paradise Dragona, but Paradise Dragona is SV2A-P or another code
// Let's verify SV7A first
console.log('=== Verify SV7A subjects ===')
const sv7a = await sql`SELECT card_number, subject_name FROM psa_pop_reports WHERE card_ref LIKE 'jp-SV7A-%' ORDER BY (card_number)::int LIMIT 5`
sv7a.forEach(x => console.log(`  SV7A-${x.card_number}: ${x.subject_name}`))

const BATCH5 = [
  // Confirmed via card names matching
  { psa: 'SV2P',  tcg: 'aopkm-484', name: 'Snow Hazard' },         // Wo-Chien, Chien-Pao, Baxcalibur
  { psa: 'SV4K',  tcg: 'aopkm-501', name: 'Ancient Roar' },        // Magby, Armarouge, Chi-Yu
  { psa: 'SV9A',  tcg: 'aopkm-557', name: 'Hot Wind Arena' },      // Cynthia's Roselia, Yanmega, Crustle (was wrongly verified to Paradise Dragona)

  // Sister sets : SV1V/SV1S already mapped (Violet ex / Scarlet ex), let's see SV1P
  // SV3K/SV3M = sister sets of SV3 (Ruler of Black Flame). Hmm.
]

console.log('\n=== BATCH 5: SV codes confirmed by card subjects ===')
let inserted = 0, skipped = 0

for (const m of BATCH5) {
  const exists = await sql`SELECT id, name FROM tcg_sets WHERE id = ${m.tcg}`
  if (exists.length === 0) {
    console.log(`  KO '${m.psa}': tcg_set '${m.tcg}' not found`)
    skipped++
    continue
  }
  try {
    await sql`
      INSERT INTO psa_set_mappings (psa_set_code, tcg_set_id, set_name, confidence, notes)
      VALUES (${m.psa}, ${m.tcg}, ${exists[0].name}, 'verified', 'Batch 5 SV mapping confirmed by card subjects 2026-05-22')
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

// FIX: SV7A wrongly verified - need to check before
const sv7aMapping = await sql`SELECT * FROM psa_set_mappings WHERE psa_set_code = 'SV7A'`
if (sv7aMapping.length > 0) {
  console.log(`\n  Note: SV7A currently → ${sv7aMapping[0].tcg_set_id} (${sv7aMapping[0].set_name}) - needs verification`)
}

const stats = await sql`SELECT confidence, COUNT(*) as n FROM psa_set_mappings GROUP BY confidence`
console.log('\nFinal stats:')
stats.forEach(s => console.log(`  ${s.confidence}: ${s.n}`))
