/**
 * Mapping: our setId ↔ PSA (categoryId, headingId).
 *
 * categoryId is constant for "TCG Cards" = 156940.
 * headingId identifies the specific set within PSA.
 *
 * Discovery method: navigate manually to https://www.psacard.com/pop/tcg-cards/{year}
 * then click the set. The URL becomes /pop/tcg-cards/{year}/{slug}/{headingId}.
 *
 * To add a new set:
 *   1. Find on PSA the matching set page
 *   2. Note the headingId (last path segment)
 *   3. Add the entry below
 */

export const PSA_TCG_CATEGORY_ID = 156940

export const PSA_HEADINGS = {
  // ─── Base WOTC era ──────────────────────────────────────
  'base1':   { headingId: 57801, label: 'Pokemon Game (1999)' },
  // 'base2':   { headingId: TBD,   label: 'Pokemon Jungle' },
  // 'base3':   { headingId: TBD,   label: 'Pokemon Fossil' },
  // 'base4':   { headingId: TBD,   label: 'Pokemon Base Set 2' },
  // 'base5':   { headingId: TBD,   label: 'Pokemon Team Rocket' },

  // ─── Gym era ────────────────────────────────────────────
  // 'gym1':    { headingId: TBD, label: 'Pokemon Gym Heroes' },
  // 'gym2':    { headingId: TBD, label: 'Pokemon Gym Challenge' },

  // ─── Neo era ────────────────────────────────────────────
  // 'neo1':    { headingId: TBD, label: 'Pokemon Neo Genesis' },
  // 'neo2':    { headingId: TBD, label: 'Pokemon Neo Discovery' },
  // 'neo3':    { headingId: TBD, label: 'Pokemon Neo Revelation' },
  // 'neo4':    { headingId: TBD, label: 'Pokemon Neo Destiny' },
}

/**
 * Get PSA scrape config for a given setId.
 * Throws if setId is unknown — must be added to PSA_HEADINGS first.
 */
export function getPsaConfig(setId) {
  const entry = PSA_HEADINGS[setId]
  if (!entry) {
    throw new Error(`No PSA mapping for setId="${setId}". Add it to scripts/lib/psa-headings.mjs first.`)
  }
  return {
    categoryId: PSA_TCG_CATEGORY_ID,
    headingId: entry.headingId,
    label: entry.label,
  }
}

export function listMappedSets() {
  return Object.keys(PSA_HEADINGS)
}
