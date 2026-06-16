#!/usr/bin/env node
/**
 * Manual mappings for vintage WotC Japanese sets
 *
 * Sources: psacard.com browsing + tcgdex/artofpkm catalog
 * Convention: PMCG1-6 = "Pokemon Card Game" series 1-6 (Team Rocket era 2003-2005)
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

const VINTAGE_MAPPINGS = [
  // PMCG = Pokemon Card Game (e-Card era, Team Rocket Returns)
  { psa: 'PMCG4',                  tcg: 'aopkm-10',   name: 'Rocket Gang' },
  { psa: 'PMCG1',                  tcg: null,         name: '? PCG series 1 - to research' },

  // WotC JP vintage cores
  { psa: 'WEB-2001',               tcg: 'aopkm-50',   name: 'Pokémon Card★web' },
  { psa: 'VS-2001',                tcg: 'aopkm-46',   name: 'Pokémon Card★VS' },
  { psa: 'EXPEDITION-2001',        tcg: null,         name: '? Need to identify aopkm equivalent' },

  // Sword & Shield Dark Phantasma → aopkm-462 (Dark Fantasma)
  { psa: 'SWORD-SHIELD-DARK-PHANTASMA-2022', tcg: 'aopkm-462', name: 'Dark Fantasma' },

  // Diamond & Pearl sets - patterns: "Secret of the Lakes" = "Bonds to the End of Time" era
  // Let me skip the ambiguous ones and only do high-confidence

  // Stormfront 2008 → DP4-ish in Japan
  // Not 100% sure → skip for now

  // M2A (Mega series 2A) - probably an aopkm-* close to M2 (which we mapped to aopkm-579 = Mega Dream ex)
  // Need to check what M2A is exactly
]

console.log('=== Vintage WotC JP mappings ===')
let inserted = 0
let skipped = 0

for (const m of VINTAGE_MAPPINGS) {
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
      VALUES (${m.psa}, ${m.tcg}, ${exists[0].name}, 'verified', 'Manually mapped 2026-05-22 (vintage WotC JP)')
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

console.log(`\nInserted: ${inserted}, Skipped: ${skipped}`)

const total = await sql`SELECT COUNT(*) as n FROM psa_set_mappings WHERE confidence IN ('verified', 'auto')`
console.log(`Total usable mappings: ${total[0].n}`)
