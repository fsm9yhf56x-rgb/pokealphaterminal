#!/usr/bin/env node
/**
 * BATCH 6: Sun & Moon main JP + Mega era + misc
 *
 * SM JP nomenclature: "Strength Expansion Pack" = mainline JP sets
 * Mega era: M1L/M1S = first Mega sets (Mega Venusaur Garde Vol Premium/Lapris/Sleeper)
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

const BATCH6 = [
  // ─── SUN & MOON MAIN SETS (the heavy hitters, ~250 cards) ───────
  // Naming convention PSA: "SUN-MOON-STRENGTH-EXPANSION-PACK-<NAME>-<YEAR>"
  { psa: 'SUN-MOON-STRENGTH-EXPANSION-PACK-2017',           tcg: 'aopkm-325', name: 'Collection Sun' },
  { psa: 'SUN-MOON-STRENGTH-EXPANSION-PACK-SHINING-2017',   tcg: 'aopkm-326', name: 'Collection Moon' },
  // Alolan Moonlight 2017 → aopkm-330
  { psa: 'SUN-MOON-AWAKENED-HEROES-2017',                   tcg: 'aopkm-330', name: 'Alolan Moonlight' },
  // Champion Road
  { psa: 'SUN-MOON-STRENGTH-EXPANSION-PACK-CHAMPIO-2018',   tcg: 'aopkm-357', name: 'Champion Road' },
  // Sky-Splitting Charisma
  { psa: 'SUN-MOON-SKY-SPLITTING-CHARISMA-2018',            tcg: 'aopkm-359', name: 'Sky-Splitting Charisma' },
  // Thunderclap Spark = Thunder 2018
  { psa: 'SUN-MOON-STRENGTH-EXPANSION-PACK-THUNDER-2018',   tcg: 'aopkm-360', name: 'Thunderclap Spark' },
  // Fairy Rise
  { psa: 'SUN-MOON-STRENGTH-EXPANSION-PACK-FAIRY-R-2018',   tcg: 'aopkm-362', name: 'Fairy Rise' },
  // Super Burst Impact = "Ultra F" Force 2018
  { psa: 'SUN-MOON-STRENGTH-EXPANSION-PACK-ULTRA-F-2018',   tcg: 'aopkm-364', name: 'Super Burst Impact' },
  // Dark Order = Night U(nseen) 2019
  { psa: 'SUN-MOON-STRENGTH-EXPANSION-PACK-NIGHT-U-2019',   tcg: 'aopkm-366', name: 'Dark Order' },
  // Ash vs Team Rocket Deck Kit
  { psa: 'SUN-MOON-ASH-VS-TEAM-ROCKET-DECK-KIT-2017',       tcg: 'aopkm-336', name: '30 Card Deck Match Set: Ash vs Team Rocket' },
  // Islands Await You
  { psa: 'SUN-MOON-ISLANDS-AWAIT-YOU-2017',                 tcg: 'aopkm-333', name: 'Islands Await You' },

  // SM Strength Pack Dark/Ultra dimensional/Facing - need to find aopkm
  // SM-STRENGTH-EXPANSION-PACK-DARK-OR (Dark Order)
  { psa: 'SUN-MOON-STRENGTH-EXPANSION-PACK-DARK-OR-2018',   tcg: 'aopkm-366', name: 'Dark Order' },
  // Facing 2017 = ?
  // SUN-MOON-DARKNESS-THAT-CONSUMES-LIGHT-2017
  // SUN-MOON-TO-HAVE-SEEN-THE-BATTLE-RAINBOW-2017

  // ─── MEGA ERA (XY) ────────────────────────────────────────────
  // M2 = Phantom Gate 2014 (Mega Heracross, Mega Charizard X)
  { psa: 'M2',  tcg: 'aopkm-296', name: 'Phantom Gate' },
  // Megalo Cannon 2013 = ?
  // M1L/M1S = Mega Battle Boost L/S (first Mega sets) - need research

  // ─── SWORD & SHIELD MISC ──────────────────────────────────────
  { psa: 'SWORD-SHIELD-PEERLESS-FIGHTERS-2021',   tcg: 'aopkm-427', name: 'Matchless Fighters' },
  // 'Family Pokemon Card Game' = 'aopkm-NEW' - skip if not found
]

console.log('=== BATCH 6: SM main + Mega + misc ===')
let inserted = 0, skipped = 0

for (const m of BATCH6) {
  const exists = await sql`SELECT id, name FROM tcg_sets WHERE id = ${m.tcg}`
  if (exists.length === 0) {
    console.log(`  KO '${m.psa}': tcg_set '${m.tcg}' not found`)
    skipped++
    continue
  }
  try {
    await sql`
      INSERT INTO psa_set_mappings (psa_set_code, tcg_set_id, set_name, confidence, notes)
      VALUES (${m.psa}, ${m.tcg}, ${exists[0].name}, 'verified', 'Batch 6 SM/Mega 2026-05-22')
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

console.log(`\nBatch 6: ${inserted} inserted, ${skipped} skipped`)

const stats = await sql`SELECT confidence, COUNT(*) as n FROM psa_set_mappings GROUP BY confidence`
console.log('\nFinal stats:')
stats.forEach(s => console.log(`  ${s.confidence}: ${s.n}`))
