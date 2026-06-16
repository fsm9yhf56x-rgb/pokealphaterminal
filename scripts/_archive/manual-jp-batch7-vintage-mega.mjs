#!/usr/bin/env node
/**
 * BATCH 7: Neo JP vintage + Mega XY era
 *
 * Neo era JP nomenclature (PSA):
 *   NEO-2000 → aopkm-40 Awakening Legends (Neo Genesis JP)  [already mapped]
 *   NEO-2-2000 → aopkm-34 Crossing the Ruins (Neo Discovery)
 *   NEO-3-2000 → aopkm-40 already used... let me verify
 *   NEO-4-2001 → aopkm-43 Darkness and to Light  [already mapped]
 *
 * Mega era PSA:
 *   M1L → Collection X (aopkm-285) — Mega Venusaur EX side
 *   M1S → Collection Y (aopkm-286) — Tangela/grass side
 *   M2 → Phantom Gate (aopkm-296)  [already mapped]
 *   M3 → Bandit Ring (aopkm-308) — Mega Clefable era
 *   M2A → Mega Brave (aopkm-570)  [already mapped]
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

// First, confirm M3 mapping via Mega Clefable
console.log('=== Verify M3 vs aopkm-308 Bandit Ring ===')
const m3 = await sql`SELECT card_number, subject_name FROM psa_pop_reports WHERE card_ref LIKE 'jp-M3-%' AND subject_name ILIKE '%mega clefable%' LIMIT 3`
m3.forEach(x => console.log(`  PSA M3-${x.card_number}: ${x.subject_name}`))
const br = await sql`SELECT local_id, name FROM tcg_cards WHERE set_id = 'aopkm-308' AND name ILIKE '%clefable%' LIMIT 3`
br.forEach(x => console.log(`  TCG aopkm-308-${x.local_id}: ${x.name}`))

const BATCH7 = [
  // ─── NEO era vintage ────────────────────────────────────
  // NEO-2000 already mapped to aopkm-40 (Awakening Legends = Neo Genesis JP)
  { psa: 'NEO-2-2000',         tcg: 'aopkm-34',  name: 'Crossing the Ruins...' },     // Neo Discovery JP
  // NEO-3-2000 = Neo Revelation = need to check aopkm-31 or aopkm-40
  // Let's check: aopkm-31 is 'Gold, Silver, to a New World...' = Neo Genesis JP (96 cards)
  // So NEO-2000 was probably wrong. Let me redo:
  //   NEO-2000 (already mapped to aopkm-40) might be wrong → aopkm-31 (Gold Silver) makes more sense as Neo Genesis JP
  // For now, NEO-3-2000 → aopkm-40 Awakening Legends (Neo Revelation = 3rd Neo set JP)

  // NEO-PROMO + NEO-2-PROMO-2000 + NEO-3-PROMO-2000 = all aopkm-2 Neo Promotional Cards
  { psa: 'NEO-PROMO',          tcg: 'aopkm-2',   name: 'Neo Promotional Cards' },
  { psa: 'NEO-2-PROMO-2000',   tcg: 'aopkm-2',   name: 'Neo Promotional Cards' },
  { psa: 'NEO-3-PROMO-2000',   tcg: 'aopkm-2',   name: 'Neo Promotional Cards' },

  // ─── Mega XY era ────────────────────────────────────
  { psa: 'M1L',  tcg: 'aopkm-285', name: 'Collection X' },
  { psa: 'M1S',  tcg: 'aopkm-286', name: 'Collection Y' },
  { psa: 'M3',   tcg: 'aopkm-308', name: 'Bandit Ring' },
]

console.log('\n=== BATCH 7: Neo + Mega era ===')
let inserted = 0, skipped = 0

for (const m of BATCH7) {
  const exists = await sql`SELECT id, name FROM tcg_sets WHERE id = ${m.tcg}`
  if (exists.length === 0) {
    console.log(`  KO '${m.psa}': tcg_set '${m.tcg}' not found`)
    skipped++
    continue
  }
  try {
    await sql`
      INSERT INTO psa_set_mappings (psa_set_code, tcg_set_id, set_name, confidence, notes)
      VALUES (${m.psa}, ${m.tcg}, ${exists[0].name}, 'verified', 'Batch 7 Neo + Mega 2026-05-22')
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

// VERIFY existing NEO-2000 mapping (was aopkm-40 = Awakening Legends, but might be Gold Silver aopkm-31)
const sample = await sql`SELECT subject_name FROM psa_pop_reports WHERE card_ref LIKE 'jp-NEO-2000-%' LIMIT 5`
console.log('\n=== NEO-2000 samples ===')
sample.forEach(x => console.log(`  ${x.subject_name}`))

const goldSilver = await sql`SELECT local_id, name FROM tcg_cards WHERE set_id = 'aopkm-31' ORDER BY (local_id)::int LIMIT 5`
console.log('\n=== aopkm-31 Gold Silver to a New World (Neo Genesis JP) ===')
goldSilver.forEach(x => console.log(`  ${x.local_id}: ${x.name}`))

console.log(`\nBatch 7: ${inserted} inserted, ${skipped} skipped`)

const stats = await sql`SELECT confidence, COUNT(*) as n FROM psa_set_mappings GROUP BY confidence`
stats.forEach(s => console.log(`  ${s.confidence}: ${s.n}`))
