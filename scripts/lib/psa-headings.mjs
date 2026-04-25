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
  // DP era (2007-2010)
  dp1:    { headingId: 90106,  label: 'Pokemon Diamond & Pearl' },
  dp2:    { headingId: 101066, label: 'Pokemon Diamond & Pearl Mysterious Treasures' },
  dp3:    { headingId: 90102,  label: 'Pokemon Diamond & Pearl Secret Wonders' },
  dp4:    { headingId: 90090,  label: 'Pokemon Diamond & Pearl Great Encounters' },
  dp5:    { headingId: 90091,  label: 'Pokemon Diamond & Pearl Majestic Dawn' },
  dp6:    { headingId: 90098,  label: 'Pokemon Diamond & Pearl Legends Awakened' },
  dp7:    { headingId: 90097,  label: 'Pokemon Diamond & Pearl Stormfront' },
  // Platinum era
  pl1:    { headingId: 98626,  label: 'Pokemon Platinum' },
  pl2:    { headingId: 94032,  label: 'Pokemon Platinum Rising Rivals' },
  pl3:    { headingId: 90094,  label: 'Pokemon Platinum Supreme Victors' },
  pl4:    { headingId: 90105,  label: 'Pokemon Platinum Arceus' },
  // HGSS era
  hgss1:  { headingId: 96083,  label: 'Pokemon Heartgold & Soulsilver' },
  hgss2:  { headingId: 98581,  label: 'Pokemon Heartgold & Soulsilver Unleashed' },
  hgss3:  { headingId: 98630,  label: 'Pokemon Heartgold & Soulsilver Undaunted' },
  hgss4:  { headingId: 97792,  label: 'Pokemon Heartgold & Soulsilver Triumphant' },
  // BW era (2011-2013) - main sets
  col1:           { headingId: 98660,  label: 'Pokemon Call of Legends' },
  bw1:            { headingId: 100559, label: 'Pokemon Black & White' },
  bw2:            { headingId: 101680, label: 'Pokemon Black & White Emerging Powers' },
  bw3:            { headingId: 102646, label: 'Pokemon Black & White Noble Victories' },
  bw4:            { headingId: 103390, label: 'Pokemon Black & White Next Destinies' },
  bw5:            { headingId: 104076, label: 'Pokemon Black & White Dark Explorers' },
  bw6:            { headingId: 107134, label: 'Pokemon Black & White Dragons Exalted' },
  bw7:            { headingId: 108112, label: 'Pokemon Black & White Boundaries Crossed' },
  bw8:            { headingId: 109064, label: 'Pokemon Black & White Plasma Storm' },
  bw9:            { headingId: 112538, label: 'Pokemon Black & White Plasma Freeze' },
  bw10:           { headingId: 115640, label: 'Pokemon Black & White Plasma Blast' },
  bw11:           { headingId: 116903, label: 'Pokemon Black & White Legendary Treasures' },
  rc:             { headingId: 118232, label: 'Pokemon Black & White Legendary Treasures Radiant Collection' },
  dv1:            { headingId: 108140, label: 'Pokemon Black & White Dragon Vault' },
  // BW Promos (3 separate yearly headings)
  'bwp-2011':     { headingId: 101538, label: 'Pokemon Black & White Promo 2011' },
  'bwp-2012':     { headingId: 111823, label: 'Pokemon Black & White Promo 2012' },
  'bwp-2013':     { headingId: 114698, label: 'Pokemon Black & White Promo 2013' },
  // BW Decks & Trainer Kits
  'bw-theme':     { headingId: 270331, label: 'Pokemon Black & White Theme Deck' },
  'bw-tk-excadrill': { headingId: 204526, label: 'Pokemon BW Trainer Kit Excadrill' },
  'bw-tk-zoroark':   { headingId: 194770, label: 'Pokemon BW Trainer Kit Zoroark' },
  // Battle Arena Decks 2013
  'ba-keldeo':    { headingId: 228402, label: 'Pokemon Battle Arena Keldeo VS Rayquaza' },
  'ba-xerneas':   { headingId: 249451, label: 'Pokemon Battle Arena Xerneas vs Yveltal' },
  'ba-energies':  { headingId: 326433, label: 'Pokemon Battle Deck Energies' },
  // Generic Pokemon Promos & Insert Cards
  'pkmn-promo-2011': { headingId: 150731, label: 'Pokemon Promo 2011' },
  'pkmn-promo-2013': { headingId: 151573, label: 'Pokemon Promo 2013' },
  'insert-2011':  { headingId: 238590, label: 'Pokemon Insert Cards 2011' },
  'insert-2012':  { headingId: 238592, label: 'Pokemon Insert Cards 2012' },
  'insert-2013':  { headingId: 238589, label: 'Pokemon Insert Cards 2013' },
  // McDonald's Collections
  'mcd-2011':     { headingId: 101683, label: "Pokemon McDonald's Collection 2011" },
  'mcd-2012':     { headingId: 129432, label: "Pokemon McDonald's Collection 2012" },
  // Special / League / Worlds
  'league-2011':  { headingId: 201209, label: 'Pokemon League Play! Promo' },
  'illusion-2011':{ headingId: 117652, label: "Pokemon World of Illusion's Promo" },
  'worlds-2011':  { headingId: 100095, label: 'Pokemon World Championships Promo 2011' },
  'worlds-2012':  { headingId: 112945, label: 'Pokemon World Championships Promo 2012' },
  'worlds-2013-promo': { headingId: 297671, label: 'Pokemon World Championship Promo 2013' },
  'worlds-2013-deck':  { headingId: 153515, label: 'Pokemon World Championship Deck Promo 2013' },


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
