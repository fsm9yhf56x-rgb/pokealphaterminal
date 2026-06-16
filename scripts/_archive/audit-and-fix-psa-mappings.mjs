#!/usr/bin/env node
/**
 * AUDIT + FIX des mappings PSA jp-* ↔ aopkm-*
 *
 * 1. Corrige les mappings manuels erronés (SV5A)
 * 2. Audite les 165 mappings 'auto' :
 *    - Compare PSA card count vs tcg_set total_cards (doit être proche)
 *    - Si écart énorme → flag comme suspect
 * 3. Produit un rapport
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

console.log('=== Step 1: Re-add SV5A with correct mapping ===')
await sql`
  INSERT INTO psa_set_mappings (psa_set_code, tcg_set_id, set_name, confidence, notes)
  VALUES ('SV5A', 'aopkm-513', 'Crimson Haze', 'verified', 'Manually fixed 2026-05-22')
  ON CONFLICT (psa_set_code) DO UPDATE SET
    tcg_set_id = 'aopkm-513', set_name = 'Crimson Haze',
    confidence = 'verified', updated_at = NOW()
`
console.log('  OK SV5A → aopkm-513 (Crimson Haze)')

console.log('\n=== Step 2: Audit 165 auto-matched mappings ===')

const auto = await sql`
  SELECT m.psa_set_code, m.tcg_set_id, m.set_name,
         t.total_cards as tcg_cards,
         (SELECT COUNT(*) FROM psa_pop_reports
          WHERE card_ref LIKE 'jp-' || m.psa_set_code || '-%') as psa_cards
  FROM psa_set_mappings m
  JOIN tcg_sets t ON t.id = m.tcg_set_id
  WHERE m.confidence = 'auto'
  ORDER BY (SELECT COUNT(*) FROM psa_pop_reports
            WHERE card_ref LIKE 'jp-' || m.psa_set_code || '-%') DESC
`

console.log(`  Audit ${auto.length} mappings...\n`)

const suspect = []
const validated = []

for (const m of auto) {
  const tcg = Number(m.tcg_cards) || 0
  const psa = Number(m.psa_cards) || 0
  // Ratio: psa_cards devrait être <= tcg_cards (PSA grade un sous-ensemble)
  // Et tcg_cards devrait être >= max(psa_cards) - bounce 20% pour secrets/promos
  const ratio = tcg > 0 ? psa / tcg : 99

  if (psa > tcg * 1.5) {
    // psa > 150% du total tcg → mapping suspect (probablement pas la bonne version JP du set)
    suspect.push({ ...m, ratio })
  } else {
    validated.push({ ...m, ratio })
  }
}

console.log(`  Validated: ${validated.length}`)
console.log(`  Suspect (PSA cards > 150% TCG total): ${suspect.length}\n`)

console.log('=== Top suspect mappings (ratio > 1.5) ===')
suspect.slice(0, 15).forEach(s => {
  console.log(`  ⚠️  '${s.psa_set_code}' → ${s.tcg_set_id} (${s.set_name})`)
  console.log(`      TCG: ${s.tcg_cards} cards | PSA: ${s.psa_cards} cards | ratio ${s.ratio.toFixed(1)}x`)
})

// Auto-clean suspect mappings : marquer 'manual' pour review
if (suspect.length > 0) {
  console.log(`\n=== Mark ${suspect.length} suspects as 'manual' for review ===`)
  for (const s of suspect) {
    await sql`
      UPDATE psa_set_mappings
      SET confidence = 'manual',
          notes = ${`Auto-flagged: PSA ${s.psa_cards} > TCG ${s.tcg_cards} (ratio ${s.ratio.toFixed(1)}x). Needs human review.`},
          updated_at = NOW()
      WHERE psa_set_code = ${s.psa_set_code}
    `
  }
  console.log(`  Done`)
}

console.log('\n=== Final state ===')
const final = await sql`
  SELECT confidence, COUNT(*) as n FROM psa_set_mappings GROUP BY confidence
`
final.forEach(r => console.log(`  ${r.confidence}: ${r.n}`))

const ready = await sql`
  SELECT COUNT(*) as n FROM psa_set_mappings WHERE confidence IN ('verified', 'auto')
`
console.log(`\n✓ Ready to use (verified + auto validated): ${ready[0].n} mappings`)
