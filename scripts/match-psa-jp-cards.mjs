#!/usr/bin/env node
/**
 * Card-level matching: TCGdex aopkm-* cards ↔ PSA jp-* cards
 *
 * Strategy:
 *   For each set already mapped in psa_set_mappings (verified|auto):
 *     1. Fetch all TCGdex cards (set_id = aopkm-XXX)
 *     2. Fetch all PSA cards (card_ref LIKE jp-PSA_CODE-%)
 *     3. Try match by card_number first (modern sets, 90%+ match)
 *     4. If number-match fails, try match by normalized Pokémon name
 *     5. Insert into psa_card_mappings
 *
 * Output: matched / ambiguous / unmatched report per set.
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

// Normalise Pokémon name for matching
// "Dark Charizard-Holo" → "dark charizard"
// "Erika's Invitation" → "erika invitation"
function normalizeName(s) {
  if (!s) return ''
  return s
    .toLowerCase()
    .replace(/-holo$|-holo-.*$/i, '')        // strip -Holo suffix
    .replace(/[''`]/g, '')                   // strip apostrophes
    .replace(/\b(ex|gx|v|vmax|vstar)\b/g, '')// strip card-type suffixes (we keep them implicit)
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Pad card number to match PSA convention: "1" → "001"
function padNumber(n, width = 3) {
  const num = String(n).replace(/[^0-9]/g, '')
  return num.padStart(width, '0')
}

console.log('=== Load mappings ===')
const setMappings = await sql`
  SELECT psa_set_code, tcg_set_id, set_name
  FROM psa_set_mappings
  WHERE confidence IN ('verified', 'auto')
`
console.log(`  ${setMappings.length} set mappings to process\n`)

let totalMatched = 0
let totalByNumber = 0
let totalByName = 0
let totalUnmatched = 0
const unmatchedSamples = []

for (const sm of setMappings) {
  const tcgSetId = sm.tcg_set_id
  const psaCode = sm.psa_set_code

  // Fetch TCGdex cards
  const tcgCards = await sql`
    SELECT id, local_id, name
    FROM tcg_cards
    WHERE set_id = ${tcgSetId}
  `
  if (tcgCards.length === 0) continue

  // Fetch PSA cards for this set
  const psaCards = await sql`
    SELECT DISTINCT card_ref, card_number, subject_name
    FROM psa_pop_reports
    WHERE card_ref LIKE ${'jp-' + psaCode + '-%'}
  `
  if (psaCards.length === 0) continue

  // Build PSA index by card_number AND by normalized name
  const psaByNumber = new Map()  // "001" → psa_card_ref
  const psaByName = new Map()    // "dark charizard" → [psa_card_ref, ...]

  for (const p of psaCards) {
    if (p.card_number) {
      psaByNumber.set(padNumber(p.card_number), p.card_ref)
    }
    const nameNorm = normalizeName(p.subject_name)
    if (nameNorm) {
      if (!psaByName.has(nameNorm)) psaByName.set(nameNorm, [])
      psaByName.get(nameNorm).push(p.card_ref)
    }
  }

  let setMatched = 0
  let setNumber = 0
  let setName = 0

  for (const tc of tcgCards) {
    const tcgNum = padNumber(tc.local_id)
    const tcgNameNorm = normalizeName(tc.name)
    let psaRef = null
    let method = null

    // STRATEGY 1: match by number, validate by name
    const candidateByNum = psaByNumber.get(tcgNum)
    if (candidateByNum) {
      // Find the subject_name of this PSA card
      const psaCard = psaCards.find(p => p.card_ref === candidateByNum)
      const psaNameNorm = normalizeName(psaCard?.subject_name)

      if (psaNameNorm && tcgNameNorm && (
        psaNameNorm === tcgNameNorm ||
        psaNameNorm.includes(tcgNameNorm) ||
        tcgNameNorm.includes(psaNameNorm)
      )) {
        psaRef = candidateByNum
        method = 'number'
        setNumber++
      }
    }

    // STRATEGY 2: match by name only (vintage sets where numbers diverge)
    if (!psaRef && tcgNameNorm) {
      const candidates = psaByName.get(tcgNameNorm)
      if (candidates && candidates.length === 1) {
        psaRef = candidates[0]
        method = 'name'
        setName++
      }
      // If multiple matches by name → ambiguous, skip
    }

    if (psaRef && method) {
      try {
        await sql`
          INSERT INTO psa_card_mappings (tcg_card_id, psa_card_ref, match_method, confidence, notes)
          VALUES (${tc.id}, ${psaRef}, ${method}, 'auto', ${`Auto: ${method}-match in ${psaCode}`})
          ON CONFLICT (tcg_card_id) DO UPDATE SET
            psa_card_ref = EXCLUDED.psa_card_ref,
            match_method = EXCLUDED.match_method,
            updated_at = NOW()
        `
        setMatched++
      } catch (e) {
        // ignore conflict errors
      }
    } else if (unmatchedSamples.length < 20) {
      unmatchedSamples.push(`  ${tc.id} '${tc.name}' (tcgNum=${tcgNum})`)
    }
  }

  totalMatched += setMatched
  totalByNumber += setNumber
  totalByName += setName
  totalUnmatched += (tcgCards.length - setMatched)

  if (tcgCards.length >= 50) {  // log only sets with significant volume
    const pct = ((setMatched / tcgCards.length) * 100).toFixed(0)
    console.log(`  ${psaCode.slice(0, 40).padEnd(40)} ${setMatched}/${tcgCards.length} (${pct}%) [num=${setNumber} name=${setName}]`)
  }
}

console.log(`\n=== Summary ===`)
console.log(`  Total matched: ${totalMatched}`)
console.log(`    by number:  ${totalByNumber}`)
console.log(`    by name:    ${totalByName}`)
console.log(`  Unmatched:    ${totalUnmatched}`)

console.log(`\n=== Sample unmatched cards (top 20) ===`)
unmatchedSamples.forEach(s => console.log(s))

const final = await sql`SELECT COUNT(*) as n FROM psa_card_mappings`
console.log(`\n✓ Total in psa_card_mappings: ${final[0].n}`)
