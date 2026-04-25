/**
 * Mapping: our setId to PSA (categoryId, headingId).
 * categoryId for TCG Cards = 156940.
 * Discovered via scripts/discover-psa-headings.mjs (year-by-year crawler).
 */

export const PSA_TCG_CATEGORY_ID = 156940

export const PSA_HEADINGS = {
  // Base WOTC era
  base1:   { headingId: 57801,  label: 'Pokemon Game (1999)' },
  base2:   { headingId: 58977,  label: 'Pokemon Jungle' },
  base3:   { headingId: 57617,  label: 'Pokemon Fossil' },
  base4:   { headingId: 57809,  label: 'Pokemon Game Base II' },
  base5:   { headingId: 61534,  label: 'Pokemon Rocket' },
  basep:   { headingId: 57938,  label: 'Pokemon Game Promo' },
  // Gym era
  gym1:    { headingId: 58312,  label: 'Pokemon Gym Heroes' },
  gym2:    { headingId: 58311,  label: 'Pokemon Gym Challenge' },
  // Neo era
  neo1:    { headingId: 60079,  label: 'Pokemon Neo Genesis' },
  neo2:    { headingId: 60078,  label: 'Pokemon Neo Discovery' },
  neo3:    { headingId: 60119,  label: 'Pokemon Neo Revelation' },
  neo4:    { headingId: 87131,  label: 'Pokemon Neo Destiny' },
  // e-Card era
  lc:      { headingId: 59164,  label: 'Pokemon Legendary Collection' },
  ecard1:  { headingId: 87125,  label: 'Pokemon Expedition' },
  // EX era (2003-2007)
  ex1:     { headingId: 57279,  label: 'Pokemon EX Ruby & Sapphire' },
  ex2:     { headingId: 97902,  label: 'Pokemon EX Sandstorm' },
  ex3:     { headingId: 57275,  label: 'Pokemon EX Dragon' },
  ex4:     { headingId: 57281,  label: 'Pokemon EX Team Magma VS Team Aqua' },
  ex5:     { headingId: 57277,  label: 'Pokemon EX Hidden Legends' },
  ex6:     { headingId: 57276,  label: 'Pokemon EX Fire Red & Leaf Green' },
  ex7:     { headingId: 57282,  label: 'Pokemon EX Team Rocket Returns' },
  ex8:     { headingId: 57274,  label: 'Pokemon EX Deoxys' },
  ex9:     { headingId: 64136,  label: 'Pokemon EX Emerald' },
  ex10:    { headingId: 57283,  label: 'Pokemon EX Unseen Forces' },
  ex11:    { headingId: 57273,  label: 'Pokemon EX Delta Species' },
  ex12:    { headingId: 88344,  label: 'Pokemon EX Legend Maker' },
  ex13:    { headingId: 64149,  label: 'Pokemon EX Holon Phantoms' },
  ex14:    { headingId: 87132,  label: 'Pokemon EX Crystal Guardians' },
  ex15:    { headingId: 87126,  label: 'Pokemon EX Dragon Frontiers' },
  ex16:    { headingId: 87122,  label: 'Pokemon EX Power Keepers' },
}

export function getPsaConfig(setId) {
  const entry = PSA_HEADINGS[setId]
  if (!entry) {
    throw new Error('No PSA mapping for setId=' + setId)
  }
  return { categoryId: PSA_TCG_CATEGORY_ID, headingId: entry.headingId, label: entry.label }
}

export function listMappedSets() {
  return Object.keys(PSA_HEADINGS)
}
