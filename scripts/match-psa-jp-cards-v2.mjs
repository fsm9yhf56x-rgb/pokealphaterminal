#!/usr/bin/env node
/**
 * v2: Card-level matching with UNIQUENESS enforcement
 *
 * Improvements over v1:
 *  1. Each PSA card_ref can match AT MOST one TCG card (no duplicates)
 *  2. Skip PSA refs without a real card_number (like "jp-XY-PROMO-2016-XY-P")
 *  3. Better fuzzy matching for vintage sets
 *  4. Audit: detect and clean existing duplicates
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

function normalizeName(s) {
  if (!s) return ''
  return s
    .toLowerCase()
    .replace(/-holo$|-holo-.*$/i, '')
    .replace(/[''`]/g, '')
    .replace(/\b(ex|gx|v|vmax|vstar)\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function padNumber(n, width = 3) {
  const num = String(n).replace(/[^0-9]/g, '')
  if (!num) return null
  return num.padStart(width, '0')
}

// Validation : PSA ref doit avoir un vrai numéro à la fin (pas "XY-P", "BW-P", etc.)
function hasValidNumber(card_ref) {
  // Pattern: 'jp-XXX-DIGITS' avec digits à la fin
  return /-\d+$/.test(card_ref)
}

console.log('=== Step 1: Clean existing duplicate mappings ===')
// Identifier les PSA refs avec > 1 mapping, et garder seulement celui où la carte
// TCG est la plus "représentative" (le local_id le plus petit = première occurrence du nom)
const dups = await sql`
  SELECT psa_card_ref, COUNT(*) as n
  FROM psa_card_mappings
  GROUP BY psa_card_ref
  HAVING COUNT(*) > 1
`
console.log(`  Found ${dups.length} duplicate PSA refs to clean`)

// Pour chaque ref dupliquée: garder seulement le tcg_card_id le plus petit (premier ordre canonique)
for (const d of dups) {
  await sql`
    DELETE FROM psa_card_mappings
    WHERE psa_card_ref = ${d.psa_card_ref}
      AND tcg_card_id NOT IN (
        SELECT tcg_card_id FROM psa_card_mappings
        WHERE psa_card_ref = ${d.psa_card_ref}
        ORDER BY tcg_card_id LIMIT 1
      )
  `
}
console.log('  Duplicates cleaned')

console.log('\n=== Step 2: Truncate and redo matching with uniqueness ===')
// Truncate complètement et re-do, comme ça on a un état propre garanti
await sql`TRUNCATE psa_card_mappings`
console.log('  psa_card_mappings truncated, redoing matching...')

console.log('\n=== Step 3: Re-run matching with PSA ref uniqueness ===')
const setMappings = await sql`
  SELECT DISTINCT tcg_set_id
  FROM psa_set_mappings
  WHERE confidence IN ('verified', 'auto')
`
console.log(`  ${setMappings.length} tcg_sets to process`)

let totalMatched = 0
let totalByNumber = 0
let totalByName = 0
let totalSkippedNoNumber = 0
let totalSkippedConflict = 0

for (const sm of setMappings) {
  const tcgSetId = sm.tcg_set_id

  // Fetch all PSA codes that map to THIS tcg_set (N→1 support)
  const psaCodesRes = await sql`
    SELECT psa_set_code FROM psa_set_mappings
    WHERE tcg_set_id = ${tcgSetId} AND confidence IN ('verified', 'auto')
  `
  const psaCodes = psaCodesRes.map(r => r.psa_set_code)

  const tcgCards = await sql`SELECT id, local_id, name FROM tcg_cards WHERE set_id = ${tcgSetId}`
  if (tcgCards.length === 0) continue

  // Fetch all PSA cards for these PSA codes
  const psaPatterns = psaCodes.map(c => `jp-${c}-%`)
  const psaCards = await sql`
    SELECT DISTINCT card_ref, card_number, subject_name
    FROM psa_pop_reports
    WHERE card_ref LIKE ANY(${psaPatterns})
  `
  if (psaCards.length === 0) continue

  // Filter PSA cards : keep only those with a valid number at end of card_ref
  const validPsa = psaCards.filter(p => hasValidNumber(p.card_ref))
  const invalid = psaCards.length - validPsa.length
  totalSkippedNoNumber += invalid

  // Build indexes
  const psaByNumber = new Map()  // padded_number → [psa_card]
  const psaByName = new Map()    // normalized_name → [psa_card, ...]
  for (const p of validPsa) {
    const padded = padNumber(p.card_number)
    if (padded) {
      if (!psaByNumber.has(padded)) psaByNumber.set(padded, [])
      psaByNumber.get(padded).push(p)
    }
    const nameNorm = normalizeName(p.subject_name)
    if (nameNorm) {
      if (!psaByName.has(nameNorm)) psaByName.set(nameNorm, [])
      psaByName.get(nameNorm).push(p)
    }
  }

  // Track used PSA refs (one PSA card_ref = max 1 TCG card)
  const usedPsaRefs = new Set()

  for (const tc of tcgCards) {
    const tcgNum = padNumber(tc.local_id)
    const tcgNameNorm = normalizeName(tc.name)
    let psaRef = null
    let method = null

    // STRATEGY 1: match by number, validate by name
    if (tcgNum && psaByNumber.has(tcgNum)) {
      const candidates = psaByNumber.get(tcgNum).filter(p => !usedPsaRefs.has(p.card_ref))
      for (const c of candidates) {
        const cNorm = normalizeName(c.subject_name)
        if (cNorm && tcgNameNorm && (
          cNorm === tcgNameNorm ||
          cNorm.includes(tcgNameNorm) ||
          tcgNameNorm.includes(cNorm)
        )) {
          psaRef = c.card_ref
          method = 'number'
          totalByNumber++
          break
        }
      }
    }

    // STRATEGY 2: match by name (only if unique unused match)
    if (!psaRef && tcgNameNorm) {
      const candidates = (psaByName.get(tcgNameNorm) || []).filter(p => !usedPsaRefs.has(p.card_ref))
      if (candidates.length === 1) {
        psaRef = candidates[0].card_ref
        method = 'name'
        totalByName++
      } else if (candidates.length > 1) {
        totalSkippedConflict++  // ambiguous, skip rather than guess
      }
    }

    if (psaRef && method) {
      usedPsaRefs.add(psaRef)
      try {
        await sql`
          INSERT INTO psa_card_mappings (tcg_card_id, psa_card_ref, match_method, confidence, notes)
          VALUES (${tc.id}, ${psaRef}, ${method}, 'auto', ${`v2: ${method} match`})
        `
        totalMatched++
      } catch (e) {
        // ignore PK conflicts
      }
    }
  }
}

console.log(`\n=== Summary ===`)
console.log(`  Matched: ${totalMatched}`)
console.log(`    by number: ${totalByNumber}`)
console.log(`    by name:   ${totalByName}`)
console.log(`  Skipped (no valid number in PSA ref): ${totalSkippedNoNumber}`)
console.log(`  Skipped (ambiguous, multiple name candidates): ${totalSkippedConflict}`)

const final = await sql`SELECT COUNT(*) as n, COUNT(DISTINCT psa_card_ref) as unique FROM psa_card_mappings`
console.log(`\n  Total: ${final[0].n}`)
console.log(`  Unique PSA refs: ${final[0].unique}`)
console.log(`  Duplicates: ${final[0].n - final[0].unique} (should be 0)`)

const tot = await sql`SELECT COUNT(*) as n FROM tcg_cards WHERE set_id LIKE 'aopkm-%'`
console.log(`  Coverage: ${((final[0].n / tot[0].n) * 100).toFixed(1)}%`)
