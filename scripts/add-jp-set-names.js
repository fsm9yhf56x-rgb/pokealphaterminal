const fs = require('fs')

const EN_NAMES = {
  // SV Starter/Deck
  SVLN:'Starter Set Stellar Sylveon ex',SVLS:'Starter Set Stellar Ceruledge ex',
  SVK:'Deck Build Box Stellar Miracle',
  // Sword & Shield JP exclusive
  S11a:'Incandescent Arcana',S11:'Triplet Beat',
  S10a:'Dark Phantasma',S10D:'Time Gazer',S10P:'Space Juggler',
  S6a:'Eevee Heroes',S5a:'Matchless Fighters',S2a:'Explosive Walker',S1a:'VMAX Rising',
  // Sun & Moon JP exclusive
  SM12:'Alter Genesis',SM11b:'Dream League',SM11a:'Remix Bout',
  SM10b:'Sky Legend',SM10a:'GG End',SMP2:'Detective Pikachu',
  SM9b:'Full Metal Wall',SM9a:'Night Unison',SM8a:'Dark Order',SM8b:'GX Ultra Shiny',
  SM7a:'Thunderclap Spark',SM7b:'Fairy Rise',SM6b:'Champion Road',SM6a:'Dragon Storm',
  SM4A:'Ultra Beast Invasion',SM4S:'Awakened Heroes',
  SM3H:'To Have Seen the Battle Rainbow',SM3N:'Darkness that Consumes Light',
  SM2K:'Islands Await You',SM2L:'Moonlight of Alola',
  SM1p:'Strength Expansion Pack Sun & Moon',SM2p:'Strength Expansion Pack SM2',
  SM3p:'Strength Expansion Pack SM3',SM4p:'GX Battle Boost',SM5p:'Ultra Force',
  SMA:'GX Starter Decks',SMC:'Starter Set TAG TEAM GX',
  SMD:'Family Pokémon Card Game',SME:'Starter Decks',
  SMH:'GX Ultra Shiny High Class',SMI:'Tag Team GX Decks',
  SMJ:'Remix Bout Decks',SMK:'Dream League Decks',SML:'Tag All Stars',
  SMM:'Miracle Twin Decks',SMN:'Alter Genesis Decks',SMP:'SM Promo Cards',
  // CP (Collection Packs)
  CP6:'20th Anniversary Expansion Pack',CP5:'Cruel Traitor',
  CP4:'Premium Champion Pack EX×M×BREAK',CP3:'PokeKyun Collection',
  CP2:'Legendary Shine Collection',CP1:'Magma vs Aqua Double Crisis',
  // XY JP exclusive
  XY3:'Rising Fist',XY4:'Phantom Gate',XY2:'Wild Blaze',
  XY1:'Collection X / Y',XYA:'Collection X',XYC:'Rising Fist',XYE:'Tidal Storm',XYH:'Premium Champion',
  XY5:'Tidal Storm / Gaia Volcano',XY6:'Emerald Break',XY7:'Bandit Ring',
  XY8:'Blue Impact / Red Flash',XY9:'Rage of the Broken Sky',XY10:'Awakening Psychic King',
  XY11:'Cruel Traitor / Fever-Burst Fighter',XYP:'XY Promo Cards',
  // BW JP exclusive
  BW:'Black & White',BWP:'BW Promo Cards',
  'BW1-Bb':'Black Collection','BW1-Bw':'White Collection',
  'BW2-B':'Red Collection','BW3-Bh':'Hail Blizzard','BW3-Bp':'Psycho Drive',
  'BW4-B':'Dark Rush','BW5-Brn':'Dragon Blade','BW5-Brz':'Dragon Blast',
  'BW6-Bc':'Cold Flare','BW6-Bf':'Freeze Bolt',
  'BW7-B':'Plasma Gale','BW8-Brf':'Spiral Force','BW8-Brn':'Thunder Knuckle',
  'BW9-B':'Megalo Cannon','BW10-B':'Thunder Knuckle',
  BTV:'Best of XY',LL:'Lost Link',
  // DP / Platinum / HGSS / Legend
  DP:'Diamond & Pearl Entry Pack',DPP:'DP Promo Cards',
  'DPs-B':'Galactic\'s Conquest','DPs-S':'Starters',
  'DPt-MRP09':'Movie Random Pack 2009',
  'DPt1-B':'Giratina Half Deck','DPt2-B':'Bonds to the End of Time',
  'DPt3-B':'Beat of the Frontier','DPt4-B':'Advent of Arceus',DPtP:'Platinum Promo Cards',
  'L1-Bhg':'HeartGold Collection','L1-Bss':'SoulSilver Collection',
  'L2-B':'Reviving Legends','L3-B':'Clash at the Summit',LP:'Legend Promo Cards',
  // Mega Evolution / SV Special
  'M-P':'Mega Evolution Promo','M1L':'Mega Symphony (L)',MA:'Mega Arts',
  MBD:'Mega Battle Deck Dialga',MBG:'Mega Battle Deck Giratina',
  MC:'Mega Cards Collection',MDB:'Mega Deck Box',MG:'Mega Gardevoir Deck',
  'MMB-P':'Mega Master Battle Promo','MMB-S':'Mega Master Battle Starter',
  // Sword & Shield special
  'S-P':'S Promo Cards',SA:'Starter Set V',SB:'Starter Set VMAX',
  SC2:'Starter Set VSTAR',SCS:'Start Deck 100',
  SD:'VSTAR Special Set',SEF:'Starter Set VSTAR Eevee',
  SF:'VSTAR Universe Family',SGG:'GO Starter Decks',SGI:'Incandescent Arcana Decks',
  SH:'Shiny Box',SI:'Special Art Collection',SJ:'Special Jumbo Pack',
  SK:'Start Deck 100 Mirror',SLL:'Legendary Shine Collection',
  SN:'Starter Decks',SO:'Special Decks',
  SPD:'Special Deck Set Dialga',SPZ:'Special Deck Set Zacian',
  // SV Special
  'SV-P':'SV Promo Cards',SVAL:'ex Special Set Arcanine',
  SVAM:'ex Special Set Mewtwo',SVAW:'ex Special Set Alakazam',
  SVB:'ex Starter Set',SVC:'Starter Deck & Build Set',
  SVD:'ex Special Deck Set',SVEL:'Tera Starter Leafeon',SVEM:'Tera Starter Meowscarada',
  SVF:'Special Box Set',SVG:'High Class Pack Shiny Treasure',
  SVHK:'Battle Academy Koraidon',SVHM:'Battle Academy Miraidon',
  SVI:'Special Art Illustration Collection',SVJL:'Start Deck Lucario',
  SVM:'Special Box Set 2',SVN:'Start Decks',
  SVOD:'Obsidian Flames Decks',SVOM:'Paldean Fates Mini Tins',
  // Misc
  WAK:'World Art Collection',WCP:'World Champions Pack',WCS23:'World Championships 2023',
  ENE:'Energy Cards',HXY:'Hyper Metal Chain Deck',
  '20th':'20th Anniversary',
  // XY sub-sets
  'XY1-Bx':'Collection X','XY1-By':'Collection Y',
  'XY10-B':'Awakening Psychic King',
  'XY11-Bb':'Fever-Burst Fighter','XY11-Br':'Cruel Traitor',
  'XY5-Bg':'Gaia Volcano','XY5-Bt':'Tidal Storm',
  'XY6-B':'Emerald Break','XY7-B':'Bandit Ring',
  'XY8-Bb':'Blue Impact','XY8-Br':'Red Flash',
  'XY9-B':'Rage of the Broken Sky',XY:'XY Promo & Special',
}

const sets = JSON.parse(fs.readFileSync('public/data/sets-JP.json', 'utf8'))
let added = 0

sets.forEach(s => {
  if (!s.enName && EN_NAMES[s.id]) {
    s.enName = EN_NAMES[s.id]
    added++
  }
})

fs.writeFileSync('public/data/sets-JP.json', JSON.stringify(sets))

const total = sets.filter(s => s.enName).length
console.log(`Added: ${added} EN names`)
console.log(`Total with EN: ${total} / ${sets.length}`)
console.log(`Still missing:`, sets.filter(s => !s.enName && s.total > 10).map(s => s.id + '|' + s.name + '|' + s.total).join('\n  '))
