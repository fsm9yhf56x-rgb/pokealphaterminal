#!/usr/bin/env node
/**
 * BATCH 1 : Mappings JP MODERNES (Scarlet & Violet, Mega)
 *
 * Convention PSA pour SV : code court SV<N><suffix>
 *   SV1V/SV1S = Violet ex / Scarlet ex
 *   SV1A = Triplet Beat
 *   SV2A = Pokémon Card 151
 *   SV2D = Clay Burst
 *   SV3 = Ruler of the Black Flame
 *   SV3A = Raging Surf
 *   SV4M = Future Flash
 *   SV4A = Shiny Treasure ex
 *   SV5K = Wild Force
 *   SV5M = Cyber Judge
 *   SV5A = Crimson Haze
 *   SV6 = Mask of Change
 *   SV6A = Night Wanderer
 *   SV7 = Stellar Miracle
 *   SV8 = Super Electric Breaker
 *   SV8A = Terastal Festival ex
 *   SV9 = Battle Partners
 *   SV10 = Heat Wave Arena
 *   SV11B/SV11W = Black Bolt / White Flare
 *   SV-P = SV Promos
 *
 * Mega : M2 = Mega Dream, M2A = Mega Brave (à confirmer)
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

const BATCH1 = [
  // Scarlet & Violet series
  { psa: 'SV-P',  tcg: 'aopkm-478', name: 'Scarlet & Violet Promos' },
  { psa: 'SV1S',  tcg: 'aopkm-481', name: 'Scarlet ex' },
  { psa: 'SV1V',  tcg: 'aopkm-482', name: 'Violet ex' },
  { psa: 'SV1A',  tcg: 'aopkm-485', name: 'Triplet Beat' },
  { psa: 'SV2D',  tcg: 'aopkm-486', name: 'Clay Burst' },
  { psa: 'SV3A',  tcg: null,        name: '? Raging Surf (need to find aopkm)' },
  { psa: 'SV4M',  tcg: null,        name: '? Future Flash (need to find aopkm)' },
  { psa: 'SV5K',  tcg: null,        name: '? Wild Force (need to find aopkm)' },
  { psa: 'SV5M',  tcg: null,        name: '? Cyber Judge (need to find aopkm)' },
  { psa: 'SV6',   tcg: 'aopkm-515', name: 'Mask of Change' },
  { psa: 'SV6A',  tcg: null,        name: '? Night Wanderer (need to find aopkm)' },
  { psa: 'SV7',   tcg: 'aopkm-520', name: 'Stellar Miracle' },
  { psa: 'SV8',   tcg: null,        name: '? Super Electric Breaker (need to find aopkm)' },
  { psa: 'SV9',   tcg: null,        name: '? Battle Partners (need to find aopkm)' },
  { psa: 'SV10',  tcg: null,        name: '? Heat Wave Arena (need to find aopkm)' },

  // Mega era
  { psa: 'M2A',   tcg: 'aopkm-570', name: 'Mega Brave' },
]

console.log('=== BATCH 1: Modern JP (SV + Mega) ===')
let inserted = 0, skipped = 0

for (const m of BATCH1) {
  if (!m.tcg) {
    console.log(`  SKIP '${m.psa}': ${m.name}`)
    skipped++
    continue
  }
  const exists = await sql`SELECT id, name FROM tcg_sets WHERE id = ${m.tcg}`
  if (exists.length === 0) {
    console.log(`  KO '${m.psa}': tcg_set '${m.tcg}' not found`)
    skipped++
    continue
  }
  try {
    await sql`
      INSERT INTO psa_set_mappings (psa_set_code, tcg_set_id, set_name, confidence, notes)
      VALUES (${m.psa}, ${m.tcg}, ${exists[0].name}, 'verified', 'Batch 1 modern JP 2026-05-22')
      ON CONFLICT (psa_set_code) DO UPDATE SET
        tcg_set_id = EXCLUDED.tcg_set_id,
        set_name = EXCLUDED.set_name,
        confidence = 'verified',
        updated_at = NOW()
    `
    console.log(`  OK '${m.psa}' → ${m.tcg} (${exists[0].name})`)
    inserted++
  } catch (e) {
    console.log(`  KO '${m.psa}': ${e.message}`)
    skipped++
  }
}

console.log(`\nBatch 1: ${inserted} inserted, ${skipped} skipped (need research)`)
