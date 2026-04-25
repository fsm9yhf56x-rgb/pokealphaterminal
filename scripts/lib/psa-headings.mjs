/**
 * Mapping: our setId to PSA (categoryId, headingId).
 * categoryId for TCG Cards = 156940.
 */

export const PSA_TCG_CATEGORY_ID = 156940

export const PSA_HEADINGS = {
  base1:  { headingId: 57801, label: "Pokemon Game (1999)" },
  base2:  { headingId: 58977, label: "Pokemon Jungle" },
  base3:  { headingId: 57617, label: "Pokemon Fossil" },
  base4:  { headingId: 57809, label: "Pokemon Game Base II" },
  base5:  { headingId: 61534, label: "Pokemon Rocket" },
  basep:  { headingId: 57938, label: "Pokemon Game Promo" },
  gym1:   { headingId: 58312, label: "Pokemon Gym Heroes" },
  gym2:   { headingId: 58311, label: "Pokemon Gym Challenge" },
  neo1:   { headingId: 60079, label: "Pokemon Neo Genesis" },
  neo2:   { headingId: 60078, label: "Pokemon Neo Discovery" },
  neo3:   { headingId: 60119, label: "Pokemon Neo Revelation" },
  neo4:   { headingId: 87131, label: "Pokemon Neo Destiny" },
  lc:     { headingId: 59164, label: "Pokemon Legendary Collection" },
  ecard1: { headingId: 87125, label: "Pokemon Expedition" },
}

export function getPsaConfig(setId) {
  const entry = PSA_HEADINGS[setId]
  if (!entry) {
    throw new Error("No PSA mapping for setId=" + setId)
  }
  return { categoryId: PSA_TCG_CATEGORY_ID, headingId: entry.headingId, label: entry.label }
}

export function listMappedSets() { return Object.keys(PSA_HEADINGS) }
