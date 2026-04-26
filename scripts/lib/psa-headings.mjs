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
  // XY era (2014-2016) - main sets
  xy1:                     { headingId: 118490, label: 'Pokemon XY' },
  xy2:                     { headingId: 120509, label: 'Pokemon XY Flashfire' },
  xy3:                     { headingId: 123525, label: 'Pokemon XY Furious Fists' },
  xy4:                     { headingId: 124939, label: 'Pokemon XY Phantom Forces' },
  xy5:                     { headingId: 127027, label: 'Pokemon XY Primal Clash' },
  xy6:                     { headingId: 128976, label: 'Pokemon XY Roaring Skies' },
  xy7:                     { headingId: 130818, label: 'Pokemon XY Ancient Origins' },
  xy8:                     { headingId: 132633, label: 'Pokemon XY Breakthrough' },
  xy9:                     { headingId: 134404, label: 'Pokemon XY Breakpoint' },
  xy10:                    { headingId: 135578, label: 'Pokemon XY Fates Collide' },
  xy11:                    { headingId: 137632, label: 'Pokemon XY Steam Siege' },
  xy12:                    { headingId: 139659, label: 'Pokemon XY Evolutions' },
  // XY specials
  g1:                      { headingId: 134410, label: 'Pokemon XY Generations' },
  'rc-xy':                 { headingId: 134532, label: 'Pokemon XY Generations Radiant Collection' },
  dc1:                     { headingId: 128408, label: 'Pokemon XY Double Crisis' },
  // XY Black Star Promos (3 yearly)
  'xyp-2014':              { headingId: 120962, label: 'Pokemon XY Black Star Promo 2014' },
  'xyp-2015':              { headingId: 127228, label: 'Pokemon XY Black Star Promos 2015' },
  'xyp-2016':              { headingId: 134704, label: 'Pokemon XY Black Star Promo 2016' },
  // XY Trainer Kits
  'xy-tk-sylveon':         { headingId: 153227, label: 'Pokemon XY Sylveon Half Deck' },
  'xy-tk-bisharp':         { headingId: 223570, label: 'Pokemon XY Trainer Kit Bisharp' },
  'xy-tk-noivern':         { headingId: 232578, label: 'Pokemon XY Trainer Kit Noivern' },
  'xy-tk-wigglytuff':      { headingId: 234623, label: 'Pokemon XY Trainer Kit Wigglytuff' },
  'xy-tk-latias':          { headingId: 181043, label: 'Pokemon XY Trainer Kit Latias' },
  'xy-tk-latios':          { headingId: 181044, label: 'Pokemon XY Trainer Kit Latios' },
  'xy-tk-pikalibre':       { headingId: 137227, label: 'Pokemon XY Trainer Kit Pikachu Libre' },
  'xy-tk-suicune':         { headingId: 143333, label: 'Pokemon XY Trainer Kit Suicune' },
  // XY Decks & Special
  'xy-collector-chest':    { headingId: 126545, label: 'Pokemon XY Collector Chest' },
  'xy-bt-blister':         { headingId: 239400, label: 'Pokemon XY Breakthrough Blister Exclusive' },
  'ba-mewtwo-darkrai':     { headingId: 224294, label: 'Pokemon Battle Arena Mewtwo vs Darkrai' },
  'battle-articuno':       { headingId: 170435, label: 'Pokemon Articuno Legendary Battle Deck' },
  'art-academy':           { headingId: 132650, label: 'Pokemon Art Academy Competition' },
  'pokken-2015':           { headingId: 248306, label: 'Pokemon Promo Pokken Tournament 2015' },
  'pokken-2016':           { headingId: 155879, label: 'Pokemon Promo Pokken Tournament 2016' },
  // Generic promos & inserts
  'bwp-2014':              { headingId: 230182, label: 'Pokemon Black & White Promo 2014' },
  'pkmn-promo-2014':       { headingId: 125173, label: 'Pokemon Promo 2014' },
  'pkmn-promo-2015':       { headingId: 134085, label: 'Pokemon Promo 2015' },
  'insert-2014':           { headingId: 236527, label: 'Pokemon Insert Cards 2014' },
  'insert-2015':           { headingId: 232200, label: 'Pokemon Insert Cards 2015' },
  'insert-2016':           { headingId: 236798, label: 'Pokemon Insert Cards 2016' },
  'online-2015':           { headingId: 238486, label: 'Pokemon TCG Online Insert Code Cards 2015' },
  'online-2016':           { headingId: 238567, label: 'Pokemon TCG Online Insert Code Cards 2016' },
  'mcd-2014':              { headingId: 129105, label: "Pokemon McDonald's Collection 2014" },
  'mcd-2015':              { headingId: 137938, label: "Pokemon McDonald's Collection 2015" },
  'mcd-2016':              { headingId: 151889, label: "Pokemon McDonald's Collection 2016" },
  'worlds-2014':           { headingId: 160773, label: 'Pokemon World Championships Promo 2014' },
  'worlds-2015':           { headingId: 139838, label: 'Pokemon World Championships Promo 2015' },
  'worlds-2016':           { headingId: 159553, label: 'Pokemon World Championships Promo 2016' },
  'worlds-2016-deck':      { headingId: 143516, label: 'Pokemon World Championships Deck Promo 2016' },
  'scrap-2014':            { headingId: 213174, label: 'Pokemon Scrap 2014' },
  // SM era (2017) - main sets
  sm1:                     { headingId: 141595, label: 'Pokemon Sun & Moon' },
  sm2:                     { headingId: 143858, label: 'Pokemon Sun & Moon Guardians Rising' },
  sm3:                     { headingId: 150963, label: 'Pokemon Sun & Moon Burning Shadows' },
  sm35:                    { headingId: 152105, label: 'Pokemon Sun & Moon Shining Legends' },
  sm4:                     { headingId: 153167, label: 'Pokemon Sun & Moon Crimson Invasion' },
  // SM era (2018)
  sm5:                     { headingId: 155531, label: 'Pokemon Sun & Moon Ultra Prism' },
  sm6:                     { headingId: 157096, label: 'Pokemon Sun & Moon Forbidden Light' },
  sm7:                     { headingId: 159060, label: 'Pokemon Sun & Moon Celestial Storm' },
  sm75:                    { headingId: 160274, label: 'Pokemon Sun & Moon Dragon Majesty' },
  sm8:                     { headingId: 161784, label: 'Pokemon Sun & Moon Lost Thunder' },
  // SM era (2019)
  sm9:                     { headingId: 163951, label: 'Pokemon Sun & Moon Team Up' },
  sm10:                    { headingId: 166187, label: 'Pokemon Sun & Moon Unbroken Bonds' },
  sm11:                    { headingId: 168480, label: 'Pokemon Sun & Moon Unified Minds' },
  sm115:                   { headingId: 169494, label: 'Pokemon Sun & Moon Hidden Fates' },
  sm12:                    { headingId: 171151, label: 'Pokemon Sun & Moon Cosmic Eclipse' },
  // SM specials
  det1:                    { headingId: 165816, label: 'Pokemon Sun & Moon Detective Pikachu' },
  // SM Promos (3 yearly)
  'smp-2017':              { headingId: 142125, label: 'Pokemon SM Black Star Promo 2017' },
  'smp-2018':              { headingId: 157151, label: 'Pokemon SM Black Star Promo 2018' },
  'smp-2019':              { headingId: 163809, label: 'Pokemon SM Black Star Promo 2019' },
  // SM Trainer Kits
  'sm-tk-aloraichu':       { headingId: 151139, label: 'Pokemon SM Trainer Kit Alolan Raichu' },
  'sm-tk-lycanroc':        { headingId: 192704, label: 'Pokemon SM Trainer Kit Lycanroc' },
  'sm-tk-aloninetales':    { headingId: 159061, label: 'Pokemon SM Trainer Kit Alolan Ninetales' },
  'sm-tk-alosandslash':    { headingId: 159062, label: 'Pokemon SM Trainer Kit Alolan Sandslash' },
  // 2017 specials
  'ba-blackwhitekyurem':   { headingId: 153918, label: 'Pokemon Battle Arena Black Kyurem VS White Kyurem' },
  'mega-powers':           { headingId: 144411, label: 'Pokemon Mega Powers Collection Promo' },
  'premium-trainer-xy':    { headingId: 153615, label: 'Pokemon Premium Trainer XY Collection Promo' },
  'pokken-2017':           { headingId: 298178, label: 'Pokemon Promo Pokken Tournament 2017' },
  'xy-bt-2017':            { headingId: 273512, label: 'Pokemon XY Ancient Origins Reissue 2017' },
  'xyp-2017':              { headingId: 141657, label: 'Pokemon XY Black Star Promo 2017' },
  'xy-bp-2017':            { headingId: 246400, label: 'Pokemon XY Breakpoint Reissue 2017' },
  'xy-br-2017':            { headingId: 246402, label: 'Pokemon XY Breakthrough Reissue 2017' },
  // 2018 specials
  'ba-mchar-mblast':       { headingId: 161510, label: 'Pokemon Battle Arena Mega Charizard X VS Mega Blastoise' },
  'card-game-mtd':         { headingId: 233312, label: 'Pokemon Card Game Mini Trial Deck' },
  // 2019 specials & Worlds Decks
  'kanto-friends-mini':    { headingId: 169844, label: 'Pokemon Kanto Friends Mini Tins' },
  'kanto-power-mini':      { headingId: 173124, label: 'Pokemon Kanto Power Mini Tins' },
  'worlds-2019-fire':      { headingId: 313607, label: 'Pokemon 2019 World Championships Deck: Fire Box' },
  'worlds-2019-mind':      { headingId: 313608, label: 'Pokemon 2019 World Championships Deck: Mind Blown' },
  'worlds-2019-perf':      { headingId: 313609, label: 'Pokemon 2019 World Championships Deck: Perfection' },
  'worlds-2019-pika':      { headingId: 313610, label: 'Pokemon 2019 World Championships Deck: Pikarom Judge' },
  // Generic promos & inserts
  'pkmn-promo-2018':       { headingId: 169075, label: 'Pokemon Promo 2018' },
  'insert-2017':           { headingId: 231928, label: 'Pokemon Insert Cards 2017' },
  'insert-2018':           { headingId: 238569, label: 'Pokemon Insert Cards 2018' },
  'insert-2019':           { headingId: 237746, label: 'Pokemon Insert Cards 2019' },
  'online-2017':           { headingId: 238574, label: 'Pokemon TCG Online Insert Code Cards 2017' },
  'online-2018':           { headingId: 238572, label: 'Pokemon TCG Online Insert Code Cards 2018' },
  'online-2019':           { headingId: 238487, label: 'Pokemon TCG Online Insert Code Cards 2019' },
  'mcd-2017':              { headingId: 152023, label: "Pokemon McDonald's Collection 2017" },
  'mcd-2018':              { headingId: 161829, label: "Pokemon McDonald's Collection 2018" },
  'mcd-2019':              { headingId: 172983, label: "Pokemon McDonald's Collection 2019" },
  'worlds-2017':           { headingId: 155462, label: 'Pokemon World Championships Promo 2017' },
  'worlds-2018':           { headingId: 163538, label: 'Pokemon World Championship Promo 2018' },
  'worlds-2018-bis':       { headingId: 319339, label: 'Pokemon World Championships Promo 2018 (bis)' },
  'worlds-2019':           { headingId: 170281, label: 'Pokemon World Championships Promo 2019' },




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
