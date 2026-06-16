const fs = require('fs')

const SERIES = {
  // Base/WotC
  PMCG1:'Base',PMCG2:'Base',PMCG3:'Base',PMCG4:'Base',PMCG5:'Base',PMCG6:'Base',
  // Neo
  neo1:'Neo',neo2:'Neo',neo3:'Neo',neo4:'Neo',
  // e-Card
  E1:'e-Card',E2:'e-Card',E3:'e-Card',E4:'e-Card',E5:'e-Card',
  // VS/Web
  VS1:'VS',web1:'Web',
  // PCG (ADV/EX era)
  PCG1:'EX',PCG2:'EX',PCG3:'EX',PCG4:'EX',PCG5:'EX',PCG6:'EX',PCG7:'EX',PCG8:'EX',PCG9:'EX',
  // DP / Platinum
  DP:'DP',DP1:'DP',DP2:'DP',DP3:'DP',DP4:'DP',DP5:'DP',DPP:'DP',
  'DPs-B':'DP','DPs-S':'DP',
  'DPt-EPd':'Platinum','DPt-EPg':'Platinum','DPt-EPp':'Platinum',
  'DPt-GBhi':'Platinum','DPt-GBna':'Platinum','DPt-GBpi':'Platinum','DPt-GBpo':'Platinum',
  'DPt-MRP09':'Platinum',
  'DPt1-B':'Platinum','DPt2-B':'Platinum','DPt2-Se':'Platinum','DPt2-Sg':'Platinum',
  'DPt3-B':'Platinum','DPt3-Sg':'Platinum','DPt3-Sl':'Platinum',
  'DPt4-B':'Platinum','DPt4-Sgf':'Platinum','DPt4-Slp':'Platinum',DPtP:'Platinum',
  // HGSS / Legend
  HSm:'HGSS',HSp:'HGSS',HSt:'HGSS',HSPm:'HGSS',HSPp:'HGSS',HSPt:'HGSS',
  HSZm:'HGSS',HSZp:'HGSS',HSZt:'HGSS',
  'L1-Bhg':'Legend','L1-Bss':'Legend','L2-B':'Legend','L2-Sh':'Legend','L2-Sb':'Legend',
  'L3-B':'Legend',LP:'Legend',LL:'Legend',
  // BW
  BW:'BW',BWP:'BW',
  'BW1-Bb':'BW','BW1-Bw':'BW','BW2-B':'BW','BW3-Bh':'BW','BW3-Bp':'BW',
  'BW4-B':'BW','BW5-Brn':'BW','BW5-Brz':'BW','BW6-Bc':'BW','BW6-Bf':'BW',
  'BW7-B':'BW','BW8-Brf':'BW','BW8-Brn':'BW','BW9-B':'BW','BW10-B':'BW',
  BTV:'BW',Bb:'BW',Bd:'BW',Bk:'BW',Br:'BW',
  BKB:'BW',BKR:'BW',BKW:'BW',BKZ:'BW',BKc:'BW',BKt:'BW',BKv:'BW',
  // XY
  XY:'XY',XYP:'XY','XY-P':'XY',
  XY1:'XY','XY1-Bx':'XY','XY1-By':'XY',
  XY2:'XY',XY3:'XY',XY4:'XY',
  'XY5-Bg':'XY','XY5-Bt':'XY','XY6-B':'XY','XY7-B':'XY',
  'XY8-Bb':'XY','XY8-Br':'XY','XY9-B':'XY','XY10-B':'XY',
  'XY11-Bb':'XY','XY11-Br':'XY',
  XYA:'XY',XYB:'XY',XYC:'XY',XYD:'XY',XYE:'XY',XYF:'XY',XYG:'XY',XYH:'XY',
  HXY:'XY',
  CP1:'XY',CP2:'XY',CP3:'XY',CP4:'XY',CP5:'XY',CP6:'XY',
  CPm:'XY',CPr:'XY',CPs:'XY',
  // Sun & Moon
  SM1S:'Sun & Moon',SM1M:'Sun & Moon',SM1p:'Sun & Moon',SMP1:'Sun & Moon',
  SM2K:'Sun & Moon',SM2L:'Sun & Moon',SM2p:'Sun & Moon',
  SM3H:'Sun & Moon',SM3N:'Sun & Moon',SM3p:'Sun & Moon',
  SM4A:'Sun & Moon',SM4S:'Sun & Moon',SM4p:'Sun & Moon',
  SM5S:'Sun & Moon',SM5M:'Sun & Moon',SM5p:'Sun & Moon',
  SM6:'Sun & Moon',SM6a:'Sun & Moon',SM6b:'Sun & Moon',
  SM7:'Sun & Moon',SM7a:'Sun & Moon',SM7b:'Sun & Moon',
  SM8:'Sun & Moon',SM8a:'Sun & Moon',SM8b:'Sun & Moon',
  SM9:'Sun & Moon',SM9a:'Sun & Moon',SM9b:'Sun & Moon',
  SM10:'Sun & Moon',SM10a:'Sun & Moon',SM10b:'Sun & Moon',
  SM11:'Sun & Moon',SM11a:'Sun & Moon',SM11b:'Sun & Moon',
  SM12:'Sun & Moon',SM12a:'Sun & Moon',
  SMA:'Sun & Moon',SMB:'Sun & Moon',SMC:'Sun & Moon',SMD:'Sun & Moon',
  SME:'Sun & Moon',SMF:'Sun & Moon',SMG:'Sun & Moon',SMH:'Sun & Moon',
  SMI:'Sun & Moon',SMJ:'Sun & Moon',SMK:'Sun & Moon',SML:'Sun & Moon',
  SMM:'Sun & Moon',SMN:'Sun & Moon',SMP:'Sun & Moon',SMP2:'Sun & Moon',
  'SM-XY':'Sun & Moon',
  // Sword & Shield
  S1H:'Sword & Shield',S1W:'Sword & Shield',S1a:'Sword & Shield',
  S2:'Sword & Shield',S2a:'Sword & Shield',
  S3:'Sword & Shield',S3a:'Sword & Shield',
  S4:'Sword & Shield',S4a:'Sword & Shield',
  S5R:'Sword & Shield',S5I:'Sword & Shield',S5a:'Sword & Shield',
  S6K:'Sword & Shield',S6H:'Sword & Shield',S6a:'Sword & Shield',
  S7R:'Sword & Shield',S7D:'Sword & Shield',
  S8:'Sword & Shield','S8a-G':'Sword & Shield',S8a:'Sword & Shield',S8b:'Sword & Shield',
  S9:'Sword & Shield',S9a:'Sword & Shield',
  S10b:'Sword & Shield',S10D:'Sword & Shield',S10P:'Sword & Shield',S10a:'Sword & Shield',
  S11:'Sword & Shield',S11a:'Sword & Shield',
  S12:'Sword & Shield',S12a:'Sword & Shield',
  'S-P':'Sword & Shield',
  SA:'Sword & Shield',SB:'Sword & Shield',SC:'Sword & Shield',SC2:'Sword & Shield',
  SCS:'Sword & Shield',SD:'Sword & Shield',SEF:'Sword & Shield',SEK:'Sword & Shield',
  SF:'Sword & Shield',SGG:'Sword & Shield',SGI:'Sword & Shield',
  SH:'Sword & Shield',SI:'Sword & Shield',SJ:'Sword & Shield',SK:'Sword & Shield',
  SLD:'Sword & Shield',SLL:'Sword & Shield',SN:'Sword & Shield',SNPo:'Sword & Shield',
  SO:'Sword & Shield',SPD:'Sword & Shield',SPZ:'Sword & Shield',SZD:'Sword & Shield',
  // Scarlet & Violet
  SV1S:'Scarlet & Violet',SV1V:'Scarlet & Violet',SV1a:'Scarlet & Violet',
  SV2D:'Scarlet & Violet',SV2P:'Scarlet & Violet',SV2a:'Scarlet & Violet',
  SV3:'Scarlet & Violet',SV3a:'Scarlet & Violet',
  SV4K:'Scarlet & Violet',SV4M:'Scarlet & Violet',SV4a:'Scarlet & Violet',
  SV5K:'Scarlet & Violet',SV5M:'Scarlet & Violet',SV5a:'Scarlet & Violet',
  SV6:'Scarlet & Violet',SV6a:'Scarlet & Violet',
  SV7:'Scarlet & Violet',SV7a:'Scarlet & Violet',
  SV8:'Scarlet & Violet',SV8a:'Scarlet & Violet',
  SV9:'Scarlet & Violet',SV9a:'Scarlet & Violet',
  SV10:'Scarlet & Violet',SV11B:'Scarlet & Violet',SV11W:'Scarlet & Violet',
  'SV-P':'Scarlet & Violet',
  SVAL:'Scarlet & Violet',SVAM:'Scarlet & Violet',SVAW:'Scarlet & Violet',
  SVB:'Scarlet & Violet',SVC:'Scarlet & Violet',SVD:'Scarlet & Violet',
  SVEL:'Scarlet & Violet',SVEM:'Scarlet & Violet',SVF:'Scarlet & Violet',SVG:'Scarlet & Violet',
  SVHK:'Scarlet & Violet',SVHM:'Scarlet & Violet',SVI:'Scarlet & Violet',
  SVJL:'Scarlet & Violet',SVJP:'Scarlet & Violet',SVK:'Scarlet & Violet',
  SVLN:'Scarlet & Violet',SVLS:'Scarlet & Violet',SVM:'Scarlet & Violet',SVN:'Scarlet & Violet',
  SVOD:'Scarlet & Violet',SVOM:'Scarlet & Violet',
  // Mega Evolution
  M1S:'Mega Evolution',M1L:'Mega Evolution',M2:'Mega Evolution',M2a:'Mega Evolution',
  M3:'Mega Evolution',M4:'Mega Evolution',MA:'Mega Evolution',
  'M-P':'Mega Evolution',MBD:'Mega Evolution',MBG:'Mega Evolution',
  MC:'Mega Evolution',MDB:'Mega Evolution',MG:'Mega Evolution',
  'MMB-P':'Mega Evolution','MMB-S':'Mega Evolution',
  // Misc
  '20th':'Special',ENE:'Énergie',
  DS:'Special',El:'Special',Em:'Special',GBR:'Special',KK:'Special',KLD:'Special',
  PBG:'Special',PPD:'Special',Ran:'Special',
  WAK:'Special',WCP:'Special',WCS23:'Special',
  X30:'Special',Y30:'Special',
  BGSt:'Special',BGSv:'Special',
}

const sets = JSON.parse(fs.readFileSync('public/data/sets-JP.json', 'utf8'))
let fixed = 0

sets.forEach(s => {
  if (SERIES[s.id]) {
    s.serie = SERIES[s.id]
    fixed++
  }
})

const autre = sets.filter(s => !s.serie || s.serie === 'Autre')
fs.writeFileSync('public/data/sets-JP.json', JSON.stringify(sets))

console.log(`Fixed: ${fixed} sets`)
console.log(`Still "Autre": ${autre.length} sets`)
if (autre.length) autre.forEach(s => console.log('  ' + s.id + ' | ' + s.name + ' | ' + s.total))
