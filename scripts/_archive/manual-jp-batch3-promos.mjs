#!/usr/bin/env node
/**
 * BATCH 3 : Mappings PROMOS JP (high volume)
 *
 * PSA stocke par ANNÉE, TCGdex regroupe par série.
 * Plusieurs PSA codes → même tcg_set_id (N→1 mapping, valide).
 *
 * Also fix: M2 was wrongly mapped to aopkm-579 (Mega Dream ex 2025).
 * M2 is actually Phantom Gate JP / Mega Charizard era 2014.
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

const BATCH3 = [
  // BW-P Promotional Cards (aopkm-226) → tous les BLACK-WHITE-PROMO PSA
  { psa: 'BLACK-WHITE-PROMO-2010', tcg: 'aopkm-226', name: 'BW-P Promotional cards' },
  { psa: 'BLACK-WHITE-PROMO-2011', tcg: 'aopkm-226', name: 'BW-P Promotional cards' },
  { psa: 'BLACK-WHITE-PROMO-2012', tcg: 'aopkm-226', name: 'BW-P Promotional cards' },
  { psa: 'BLACK-WHITE-PROMO-2013', tcg: 'aopkm-226', name: 'BW-P Promotional cards' },

  // XY Promos (aopkm-279) → tous les XY-PROMO PSA
  { psa: 'XY-2013',       tcg: 'aopkm-279', name: 'XY Promos' },
  { psa: 'XY-PROMO-2014', tcg: 'aopkm-279', name: 'XY Promos' },
  { psa: 'XY-PROMO-2015', tcg: 'aopkm-279', name: 'XY Promos' },
  { psa: 'XY-PROMO-2016', tcg: 'aopkm-279', name: 'XY Promos' },

  // Sun & Moon Promos (aopkm-324)
  { psa: 'SM-PROMO-2017', tcg: 'aopkm-324', name: 'Sun & Moon Promos' },
  { psa: 'SM-PROMO-2018', tcg: 'aopkm-324', name: 'Sun & Moon Promos' },
  { psa: 'SM-PROMO-2019', tcg: 'aopkm-324', name: 'Sun & Moon Promos' },

  // Sword & Shield Promos (aopkm-397) → S-PROMO PSA codes
  { psa: 'S-PROMO-2020',  tcg: 'aopkm-397', name: 'Sword & Shield Promos' },
  { psa: 'S-PROMO-2021',  tcg: 'aopkm-397', name: 'Sword & Shield Promos' },
  { psa: 'S-PROMO-2022',  tcg: 'aopkm-397', name: 'Sword & Shield Promos' },

  // PCG Promotional Cards (aopkm-89, ADV era) → PROMO-2003/2004/2005
  { psa: 'PROMO-2003', tcg: 'aopkm-89', name: 'PCG Promotional Cards' },
  { psa: 'PROMO-2004', tcg: 'aopkm-89', name: 'PCG Promotional Cards' },
  { psa: 'PROMO-2005', tcg: 'aopkm-89', name: 'PCG Promotional Cards' },
  { psa: 'PROMO-2006', tcg: 'aopkm-89', name: 'PCG Promotional Cards' },

  // DP-P Promotional Cards (aopkm-145, DP era) → PROMO-2007 to 2010
  { psa: 'PROMO-2007', tcg: 'aopkm-145', name: 'DP-P Promotional Cards' },
  { psa: 'PROMO-2008', tcg: 'aopkm-145', name: 'DP-P Promotional Cards' },
  { psa: 'PROMO-2009', tcg: 'aopkm-145', name: 'DP-P Promotional Cards' },
  { psa: 'PROMO-2010', tcg: 'aopkm-145', name: 'DP-P Promotional Cards' },

  // ─── FIX M2 (was wrongly mapped to aopkm-579) ──────────────────────
  // M2 = Phantom Gate JP / Mega era 2014 = aopkm-272 (Megalo Cannon)? non, c'est SP
  // → Mega Charizard era. Pour l'instant on retire M2 (mauvais mapping)
  // M2A = Mega Brave (aopkm-570) déjà mappé en Batch 1, on vérifie
]

console.log('=== BATCH 3: PROMOS JP (multi-year → single TCG set) ===')
let inserted = 0, skipped = 0

for (const m of BATCH3) {
  const exists = await sql`SELECT id, name FROM tcg_sets WHERE id = ${m.tcg}`
  if (exists.length === 0) {
    console.log(`  KO '${m.psa}': tcg_set '${m.tcg}' not found`)
    skipped++
    continue
  }
  try {
    await sql`
      INSERT INTO psa_set_mappings (psa_set_code, tcg_set_id, set_name, confidence, notes)
      VALUES (${m.psa}, ${m.tcg}, ${exists[0].name}, 'verified', 'Batch 3 promos JP 2026-05-22')
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

// FIX: retirer le mauvais mapping M2 → aopkm-579 (sera réajouté après recherche)
const fix = await sql`
  DELETE FROM psa_set_mappings WHERE psa_set_code = 'M2' AND tcg_set_id = 'aopkm-579'
`
console.log(`\n  Removed incorrect M2 → aopkm-579 mapping`)

console.log(`\nBatch 3: ${inserted} inserted, ${skipped} skipped`)

const total = await sql`SELECT confidence, COUNT(*) as n FROM psa_set_mappings GROUP BY confidence`
console.log('\nFinal stats:')
total.forEach(s => console.log(`  ${s.confidence}: ${s.n}`))
