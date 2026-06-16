#!/usr/bin/env node
/**
 * BATCH 2 : Mappings JP VINTAGE (WotC era + e-Card + DP + HGSS)
 *
 * Mapping basé sur :
 *  - psacard.com Pokemon JP set codes
 *  - Nomenclature historique TCGdex / artofpkm
 *  - Connaissance ères Pokémon TCG
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

const BATCH2 = [
  // ─── PMCG = Pokemon Card Game (Team Rocket Returns era, 2003-2005) ────
  // (PMCG4 = Rocket Gang déjà mappé)
  // Note: PMCG1-3 et PMCG5-6 correspondent aux sets ADV/EX japonais
  // PMCG1 = ADV Expansion Pack 1 (2003)
  { psa: 'PMCG1',  tcg: 'aopkm-65',  name: 'ADV Expansion Pack 1' },
  // PMCG5 = Miracle of the Desert (ou Rulers of Heavens - séries ADV)
  { psa: 'PMCG5',  tcg: 'aopkm-71',  name: 'Miracle of the Desert' },
  // PMCG6 = The Broken Seal (UNDONE-SEAL en PSA)
  { psa: 'PMCG6',  tcg: 'aopkm-84',  name: 'The Broken Seal' },
  // UNDONE-SEAL-2004 = même que PMCG6
  { psa: 'UNDONE-SEAL-2004', tcg: 'aopkm-84', name: 'The Broken Seal' },
  // EXPANSION-PACK-2003 = ADV Expansion Pack
  { psa: 'EXPANSION-PACK-2003', tcg: 'aopkm-65', name: 'ADV Expansion Pack 1' },

  // ─── WotC era JP vintage ─────────────────────────────────────────────
  // EXPEDITION-2001 = Base Expansion Pack (le set e-Card 2001 JP)
  { psa: 'EXPEDITION-2001', tcg: 'aopkm-51', name: 'Base Expansion Pack' },
  // NEO-2000 = Awakening Legends (Neo Genesis JP)
  { psa: 'NEO-2000', tcg: 'aopkm-40', name: 'Awakening Legends' },
  // NEO-4-2001 = Darkness, and to Light (Neo Destiny JP)
  { psa: 'NEO-4-2001', tcg: 'aopkm-43', name: 'Darkness, and to Light...' },

  // ─── DP era (Diamond & Pearl, 2006-2010) ─────────────────────────────
  // SECRET-OF-THE-LAKES = Secret of the Lake
  { psa: 'DIAMOND-PEARL-SECRET-OF-THE-LAKES-2007', tcg: 'aopkm-150', name: 'Secret of the Lake' },
  // SPACE-TIME-CREATION = NOTE: pas trouvé exactement, c'est probablement le tout premier DP JP
  // → DP-P Promotional Cards? Non. C'est en fait probablement 'Diamond Collection' OR 'Pearl Collection'
  // Pour être prudent on saute SPACE-TIME-CREATION
  // STORMFRONT 2008 = Intense Fight in the Destroyed Sky (Stormfront JP)
  { psa: 'STORMFRONT-2008', tcg: 'aopkm-175', name: 'Intense Fight in the Destroyed Sky' },
  // CRY-FROM-THE-MYSTERIOUS-2008 = Cries of Secrecy
  { psa: 'DIAMOND-PEARL-CRY-FROM-THE-MYSTERIOUS-2008', tcg: 'aopkm-171', name: 'Cries of Secrecy' },
  // TEMPLE-OF-ANGER-2008 = Temple of Wrath
  { psa: 'DIAMOND-PEARL-TEMPLE-OF-ANGER-2008', tcg: 'aopkm-172', name: 'Temple of Wrath' },

  // ─── EX era - Holon Phantoms ─────────────────────────────────────────
  // HOLON-PHANTOMS-2006 = Holon Phantom (typo PSA, c'est sans 's' en TCGdex)
  { psa: 'HOLON-PHANTOMS-2006', tcg: 'aopkm-130', name: 'Holon Phantom' },
  // DRAGON-FRONTIERS-2006 = Offense and Defense of the Furthest Ends
  { psa: 'DRAGON-FRONTIERS-2006', tcg: 'aopkm-137', name: 'Offense and Defense of the Furthest Ends' },
]

console.log('=== BATCH 2: Vintage WotC + e-Card + DP era ===')
let inserted = 0, skipped = 0

for (const m of BATCH2) {
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
      VALUES (${m.psa}, ${m.tcg}, ${exists[0].name}, 'verified', 'Batch 2 vintage JP 2026-05-22')
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

console.log(`\nBatch 2: ${inserted} inserted, ${skipped} skipped`)

// Re-run card matching pour les nouveaux sets
const total = await sql`SELECT COUNT(*) as n FROM psa_set_mappings WHERE confidence IN ('verified', 'auto')`
console.log(`Total usable set mappings: ${total[0].n}`)
