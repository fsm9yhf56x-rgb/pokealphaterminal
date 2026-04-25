/**
 * PSA Variety → card_ref mapper.
 *
 * Logic:
 *   1. Normalize PSA Variety into a known bucket (unlimited / shadowless / 1st_edition / unknown)
 *   2. Apply bucket to base setId (base1 → base1-shadowless / base1-1st)
 *   3. Lookup in tcg_cards. If found → match. If not → fallback to canonical setId.
 *   4. Always return a card_ref (never null) — permissive mapping per Sprint 1 decision.
 */

/**
 * Strip "-Holo" / "-Reverse Holo" suffixes from PSA SubjectName.
 * @example "Charizard-Holo" → "Charizard"
 */
export function stripSubjectSuffix(subjectName) {
  if (!subjectName) return ''
  return subjectName
    .replace(/-Holo$/i, '')
    .replace(/-Reverse Holo$/i, '')
    .trim()
}

/**
 * Categorize a PSA Variety string into a known bucket.
 * Returns 'unlimited' for empty/unrecognized varieties.
 */
export function categorizeVariety(variety) {
  if (!variety) return 'unlimited'
  const v = variety.toLowerCase()

  // Order matters: check most specific first
  if (v.includes('1st edition')) return '1st_edition'
  if (v.includes('shadowless')) return 'shadowless'
  if (v.includes('base set 1999-2000')) return 'base_1999_2000' // rare reprint subset
  if (v.includes('unlimited')) return 'unlimited'

  // Anything else (Black Dot Error, Inverted Back, Trainer Deck, Red Cheeks, E3 Stamp, etc.)
  // is treated as a sub-variant of the canonical card.
  return 'exotic'
}

/**
 * Apply variety bucket to base setId to get target setId.
 *
 * Per Sprint 1 architecture decision: ALL varieties map to the canonical setId.
 * The "variety" field on the row distinguishes between Unlimited / Shadowless /
 * 1st Edition / Base Set 1999-2000 / Black Dot Error / etc.
 *
 * This keeps the UI simple: SELECT WHERE card_ref = 'base1-4' returns ALL
 * variants for Charizard, ordered by variety.
 *
 * @example applyBucket('base1', '1st_edition') → 'base1' (canonical)
 */
export function applyBucket(baseSetId, _bucket) {
  if (!baseSetId) return baseSetId
  // Strip any existing variant suffix to get the true canonical base
  return baseSetId.replace(/-(shadowless|shadowless-ns|1st)$/, '')
}

/**
 * Main entry point. Maps a PSA entry to a canonical card_ref.
 *
 * card_ref format is LANGUAGE-AGNOSTIC: just `${setId}-${cardNumber}` (e.g. 'base1-4').
 * The PSA pop is universal — it represents how many physical cards have been
 * graded by PSA, regardless of language. The UI joins on tcg_cards by stripping
 * the language prefix at query time.
 *
 * Confidence is 1.0 if the card exists in tcg_cards (in any language), 0.5 otherwise.
 *
 * @param {object} args
 * @param {string} args.setId       Base setId (e.g. 'base1')
 * @param {string} args.cardNumber  PSA CardNumber (e.g. '4')
 * @param {string} args.variety     PSA Variety (e.g. '1st Edition' or '')
 * @param {Set<string>} args.knownCardRefs Set of canonical refs in DB (preloaded)
 *
 * @returns {{ card_ref: string, confidence: number, bucket: string }}
 */
export function mapToCardRef({ setId, cardNumber, variety, knownCardRefs }) {
  const bucket = categorizeVariety(variety)
  const card_ref = `${setId}-${cardNumber}`
  const exists = knownCardRefs.has(card_ref)

  return {
    card_ref,
    confidence: exists ? 1.0 : 0.5,
    bucket,
  }
}
