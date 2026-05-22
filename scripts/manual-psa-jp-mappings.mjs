#!/usr/bin/env node
/**
 * Manual mappings for PSA jp-* sets that couldn't be auto-matched
 * or had ambiguous matches.
 *
 * Verified by cross-referencing psacard.com set listings with
 * artofpkm.com (tcgdex) set listings.
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

// Recent Scarlet & Violet series (high volume)
const MANUAL_MAPPINGS = [
  // PSA short codes (Scarlet & Violet era)
  { psa: 'SV2A',   tcg: 'aopkm-490', name: 'Pokémon Card 151' },
  { psa: 'SV3',    tcg: 'aopkm-493', name: 'Ruler of the Black Flame' },
  { psa: 'SV4A',   tcg: 'aopkm-506', name: 'Shiny Treasure ex' },
  { psa: 'SV5A',   tcg: 'aopkm-516', name: 'Crimson Haze' },
  { psa: 'SV8A',   tcg: 'aopkm-552', name: 'Terastal Festival ex' },
  { psa: 'SV11B',  tcg: 'aopkm-565', name: 'Black Bolt' },
  { psa: 'SV11W',  tcg: 'aopkm-566', name: 'White Flare' },

  // Mega era
  { psa: 'M2',     tcg: 'aopkm-579', name: 'Mega Dream ex' },
  { psa: 'M2A',    tcg: null,       name: '(à vérifier)' }, // Skip for now

  // Ambiguous fixes - pick the right candidate
  { psa: 'MAGMA-VS-AQUA-2003',                       tcg: 'aopkm-79',  name: 'Magma VS Aqua: Two Ambitions' },
  { psa: 'PREMIUM-CHAMPION-PACK-2016',               tcg: 'aopkm-531', name: 'Premium Champion Pack EX x M x BREAK' },
  { psa: 'VENUSAUR-CHARIZARD-BLASTOISE-RANDOM-CONS-2004', tcg: 'aopkm-87', name: 'Venusaur, Charizard, Blastoise Random Constructed Starter Deck' },
]

console.log('=== Manual mappings ===')
let inserted = 0
let skipped = 0

for (const m of MANUAL_MAPPINGS) {
  if (!m.tcg) {
    console.log(`  SKIP '${m.psa}': ${m.name}`)
    skipped++
    continue
  }

  // Verify tcg_set exists
  const exists = await sql`SELECT id, name FROM tcg_sets WHERE id = ${m.tcg}`
  if (exists.length === 0) {
    console.log(`  KO '${m.psa}': tcg_set '${m.tcg}' not found`)
    skipped++
    continue
  }

  try {
    await sql`
      INSERT INTO psa_set_mappings (psa_set_code, tcg_set_id, set_name, confidence, notes)
      VALUES (${m.psa}, ${m.tcg}, ${exists[0].name}, 'verified', 'Manually mapped 2026-05-22')
      ON CONFLICT (psa_set_code) DO UPDATE SET
        tcg_set_id = EXCLUDED.tcg_set_id,
        set_name = EXCLUDED.set_name,
        confidence = 'verified',
        notes = EXCLUDED.notes,
        updated_at = NOW()
    `
    console.log(`  OK '${m.psa}' → ${m.tcg} (${exists[0].name})`)
    inserted++
  } catch (e) {
    console.log(`  KO '${m.psa}': ${e.message}`)
    skipped++
  }
}

const final = await sql`SELECT COUNT(*) as n FROM psa_set_mappings`
const byConf = await sql`SELECT confidence, COUNT(*) as n FROM psa_set_mappings GROUP BY confidence`
console.log(`\nTotal mappings: ${final[0].n}`)
byConf.forEach(r => console.log(`  ${r.confidence}: ${r.n}`))
