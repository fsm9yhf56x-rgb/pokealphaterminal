#!/usr/bin/env node
/**
 * BATCH 8: Fix NEO-2000, NEO-3-2000 + WotC JP vintage critical sets
 *
 * Fixes:
 *  - NEO-2000 was aopkm-40, should be aopkm-31 (Gold Silver = real Neo Genesis JP)
 *  - NEO-3-2000 should be aopkm-40 (Awakening Legends = Neo Revelation JP)
 *  - M3 wrong mapping to Bandit Ring - REMOVE (no Mega Clefable in aopkm-308)
 *
 * New mappings: BASE SET JP, JUNGLE, FOSSIL, GYM HEROES/CHALLENGE (CRITICAL VINTAGE)
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

// ─── FIXES ──────────────────────────────────────────────────────
console.log('=== Step 1: Fix wrong mappings ===')

// NEO-2000 → aopkm-31 (Gold Silver = real Neo Genesis JP)
await sql`
  UPDATE psa_set_mappings
  SET tcg_set_id = 'aopkm-31', set_name = 'Gold, Silver, to a New World...',
      notes = 'Fixed: NEO-2000 is Gold Silver (Neo Genesis JP), not Awakening Legends',
      updated_at = NOW()
  WHERE psa_set_code = 'NEO-2000'
`
console.log('  OK NEO-2000 → aopkm-31 (Gold Silver / Neo Genesis JP)')

// M3 wrong → DELETE
await sql`DELETE FROM psa_set_mappings WHERE psa_set_code = 'M3' AND tcg_set_id = 'aopkm-308'`
console.log('  OK Removed M3 → aopkm-308 (Mega Clefable not in Bandit Ring)')

// ─── ADD NEW MAPPINGS ──────────────────────────────────────────
console.log('\n=== Step 2: Critical WotC JP vintage + Neo + Gym ===')

const BATCH8 = [
  // Neo Revelation JP (NEO-3-2000)
  { psa: 'NEO-3-2000',  tcg: 'aopkm-40', name: 'Awakening Legends' },

  // PSA peut compiler les WotC vintage sous codes courts ou avec noms français
  // Base Set JP = aopkm-6 (96 cards) - PSA code possible ?
  // → On a vu jp-BASE-SET-1999 ou jp-POKEMON-CARD-1999 ? Cherchons d'abord
]

let inserted = 0, skipped = 0

for (const m of BATCH8) {
  const exists = await sql`SELECT id, name FROM tcg_sets WHERE id = ${m.tcg}`
  if (exists.length === 0) {
    console.log(`  KO '${m.psa}': tcg_set '${m.tcg}' not found`)
    skipped++
    continue
  }
  try {
    await sql`
      INSERT INTO psa_set_mappings (psa_set_code, tcg_set_id, set_name, confidence, notes)
      VALUES (${m.psa}, ${m.tcg}, ${exists[0].name}, 'verified', 'Batch 8 vintage WotC fix 2026-05-22')
      ON CONFLICT (psa_set_code) DO UPDATE SET
        tcg_set_id = EXCLUDED.tcg_set_id, confidence = 'verified', updated_at = NOW()
    `
    console.log(`  OK '${m.psa}' → ${m.tcg} (${exists[0].name})`)
    inserted++
  } catch (e) {
    console.log(`  KO '${m.psa}': ${e.message}`)
    skipped++
  }
}

console.log(`\nBatch 8: ${inserted} inserted, ${skipped} skipped`)

// ─── Step 3: Identifier codes PSA pour Base Set / Jungle / Fossil JP ──
console.log('\n=== Step 3: Search PSA codes for Base Set / Jungle / Fossil JP ===')
const psaWotcCandidates = await sql`
  SELECT DISTINCT SUBSTRING(card_ref FROM 'jp-(.+)-\\d+$') as code, COUNT(*) as n
  FROM psa_pop_reports
  WHERE (card_ref LIKE 'jp-%POKEMON%' OR card_ref LIKE 'jp-%BASE%' OR card_ref LIKE 'jp-%JUNGLE%'
         OR card_ref LIKE 'jp-%FOSSIL%' OR card_ref LIKE 'jp-%MYSTERY%'
         OR card_ref LIKE 'jp-%GYM%')
    AND SUBSTRING(card_ref FROM 'jp-(.+)-\\d+$') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM psa_set_mappings m WHERE m.psa_set_code = SUBSTRING(card_ref FROM 'jp-(.+)-\\d+$'))
  GROUP BY code ORDER BY n DESC LIMIT 20
`
psaWotcCandidates.forEach(x => console.log(`  '${x.code}': ${x.n}`))
