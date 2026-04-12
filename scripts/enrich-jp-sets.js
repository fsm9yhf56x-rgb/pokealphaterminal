const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchJSON(url) {
  try { const r = await fetch(url); if (!r.ok) return null; return r.json() } catch { return null }
}

// Map storage set codes → TCGDex JP set IDs + series/eras
const ERA_MAP = {
  // Scarlet & Violet
  SV1S:'Scarlet & Violet', SV1V:'Scarlet & Violet', SV1a:'Scarlet & Violet', SV2D:'Scarlet & Violet', SV2P:'Scarlet & Violet',
  SV2a:'Scarlet & Violet', SV3:'Scarlet & Violet', SV3a:'Scarlet & Violet', SV4K:'Scarlet & Violet', SV4M:'Scarlet & Violet',
  SV4a:'Scarlet & Violet', SV5K:'Scarlet & Violet', SV5M:'Scarlet & Violet', SV5a:'Scarlet & Violet',
  SV6:'Scarlet & Violet', SV6a:'Scarlet & Violet', SV7:'Scarlet & Violet', SV7a:'Scarlet & Violet',
  SV8:'Scarlet & Violet', SV8a:'Scarlet & Violet', SV9:'Scarlet & Violet', SV9a:'Scarlet & Violet',
  SV10:'Scarlet & Violet', SV11B:'Scarlet & Violet', SV11W:'Scarlet & Violet',
  SVLS:'Scarlet & Violet', SVLN:'Scarlet & Violet', SVK:'Scarlet & Violet',
  SVAL:'Scarlet & Violet', SVAM:'Scarlet & Violet', SVAW:'Scarlet & Violet',
  SVB:'Scarlet & Violet', SVC:'Scarlet & Violet', SVD:'Scarlet & Violet',
  SVEL:'Scarlet & Violet', SVEM:'Scarlet & Violet', SVF:'Scarlet & Violet', SVG:'Scarlet & Violet',
  SVHK:'Scarlet & Violet', SVHM:'Scarlet & Violet', SVI:'Scarlet & Violet',
  SVJL:'Scarlet & Violet', SVJP:'Scarlet & Violet', SVK:'Scarlet & Violet',
  SVLN:'Scarlet & Violet', SVLS:'Scarlet & Violet', SVM:'Scarlet & Violet', SVN:'Scarlet & Violet',
  SVOD:'Scarlet & Violet', SVOM:'Scarlet & Violet',
  'SV-P':'Scarlet & Violet',
  // Mega Evolution
  M1S:'Mega Evolution', M1L:'Mega Evolution', M2:'Mega Evolution', M2a:'Mega Evolution',
  M3:'Mega Evolution', M4:'Mega Evolution', MA:'Mega Evolution',
  'M-P':'Mega Evolution',
  // Sword & Shield
  S1H:'Sword & Shield', S1W:'Sword & Shield', S2:'Sword & Shield', S3:'Sword & Shield', S3a:'Sword & Shield',
  S4:'Sword & Shield', S4a:'Sword & Shield', S5R:'Sword & Shield', S5I:'Sword & Shield',
  S6K:'Sword & Shield', S6H:'Sword & Shield', S7R:'Sword & Shield', S7D:'Sword & Shield',
  S8:'Sword & Shield', S8a:'Sword & Shield', 'S8a-G':'Sword & Shield', S8b:'Sword & Shield',
  S9:'Sword & Shield', S9a:'Sword & Shield', S10b:'Sword & Shield',
  S10:'Sword & Shield', S11a:'Sword & Shield', S12:'Sword & Shield', S12a:'Sword & Shield',
  SA:'Sword & Shield', SB:'Sword & Shield', SC2:'Sword & Shield', SCS:'Sword & Shield',
  SD:'Sword & Shield', SEF:'Sword & Shield', SEK:'Sword & Shield', SF:'Sword & Shield',
  SGG:'Sword & Shield', SGI:'Sword & Shield', SH:'Sword & Shield', SI:'Sword & Shield',
  SJ:'Sword & Shield', SK:'Sword & Shield', SLD:'Sword & Shield', SLL:'Sword & Shield',
  SN:'Sword & Shield', SNPo:'Sword & Shield', SO:'Sword & Shield',
  'S-P':'Sword & Shield',
  // Sun & Moon
  SM1S:'Sun & Moon', SM1M:'Sun & Moon', SM1p:'Sun & Moon', SM2p:'Sun & Moon',
  SM3p:'Sun & Moon', SM4p:'Sun & Moon', SM5S:'Sun & Moon', SM5M:'Sun & Moon',
  SM5p:'Sun & Moon', SM6:'Sun & Moon', SM6b:'Sun & Moon', SM7:'Sun & Moon', SM7a:'Sun & Moon',
  SM8:'Sun & Moon', SM8b:'Sun & Moon', SM9:'Sun & Moon', SM9a:'Sun & Moon', SM9b:'Sun & Moon',
  SM10:'Sun & Moon', SM11:'Sun & Moon', SM11a:'Sun & Moon', SM12a:'Sun & Moon',
  SMA:'Sun & Moon', SMB:'Sun & Moon', SMC:'Sun & Moon', SMD:'Sun & Moon',
  SME:'Sun & Moon', SMF:'Sun & Moon', SMG:'Sun & Moon', SMH:'Sun & Moon',
  SMI:'Sun & Moon', SMJ:'Sun & Moon', SMK:'Sun & Moon', SML:'Sun & Moon',
  SMM:'Sun & Moon', SMN:'Sun & Moon', SMP:'Sun & Moon',
  // XY
  XYA:'XY', XYB:'XY', XYC:'XY', XYD:'XY', XYE:'XY', XYF:'XY', XYG:'XY', XYH:'XY',
  'XY-P':'XY', XYP:'XY',
  // BW
  BW:'BW', BWP:'BW', 'BW1-Bb':'BW', 'BW1-Bw':'BW', 'BW3-Bp':'BW', 'BW4-B':'BW',
  'BW5-Brn':'BW', 'BW7-B':'BW', 'BW9-B':'BW',
  BKB:'BW', BKR:'BW', BKW:'BW', BKZ:'BW', BKc:'BW', BKt:'BW', BKv:'BW',
  Bb:'BW', Bd:'BW', Bk:'BW', Br:'BW',
  BTV:'BW',
  // DP / Platinum / HGSS / Legend
  DP:'DP', DP1:'DP', DP2:'DP', DP3:'DP', DP4:'DP', DP5:'DP', DPP:'DP',
  'DPs-S':'DP', 'DPt-EPd':'Platinum', 'DPt-EPg':'Platinum', 'DPt-EPp':'Platinum',
  'DPt-GBhi':'Platinum', 'DPt-GBna':'Platinum', 'DPt-GBpi':'Platinum', 'DPt-GBpo':'Platinum',
  'DPt2-Se':'Platinum', 'DPt2-Sg':'Platinum', 'DPt3-Sg':'Platinum', 'DPt3-Sl':'Platinum',
  'DPt4-B':'Platinum', 'DPt4-Sgf':'Platinum', 'DPt4-Slp':'Platinum', DPtP:'Platinum',
  HSPm:'HGSS', HSPp:'HGSS', HSPt:'HGSS', HSZm:'HGSS', HSZp:'HGSS', HSZt:'HGSS',
  HSm:'HGSS', HSp:'HGSS', HSt:'HGSS',
  'L1-Bhg':'Legend', 'L1-Bss':'Legend', 'L2-B':'Legend', 'L2-Sh':'Legend', LP:'Legend',
  // EX / PCG
  HXY:'EX', KK:'EX', KLD:'EX',
  PCG1:'PCG', PCG2:'PCG', PCG3:'PCG', PCG4:'PCG', PCG5:'PCG', PCG6:'PCG',
  PCG7:'PCG', PCG8:'PCG', PCG9:'PCG',
  // E-Card
  E1:'e-Card', E2:'e-Card', E3:'e-Card', E4:'e-Card', E5:'e-Card',
  // VS / Web
  VS1:'VS', web1:'Web',
  // Neo
  neo1:'Neo', neo2:'Neo', neo3:'Neo', neo4:'Neo',
  // Base
  PMCG1:'Base', PMCG2:'Base', PMCG3:'Base', PMCG4:'Base', PMCG5:'Base', PMCG6:'Base',
  // Special
  '20th':'Special', CLF:'Special', CLK:'Special', CLL:'Special',
  CP4:'Special', CP6:'Special', ENE:'Énergie', Em:'Special',
  GBR:'Special', MBD:'Special', MBG:'Special', MC:'Special', MDB:'Special', MG:'Special',
  'MMB-P':'Special', 'MMB-S':'Special', PBG:'Special', PPD:'Special',
  SP2:'Special', SP4:'Special', SPD:'Special', SPZ:'Special',
  WCP:'Special', WCS23:'Special', WAK:'Special',
  X30:'Special', Y30:'Special',
  SZD:'Special',
}

async function main() {
  console.log('═══ Enriching JP sets — logos, dates, series ═══\n')

  // 1. Load TCGDex JP sets for release dates + symbols
  const tcgdexSets = await fetchJSON('https://api.tcgdex.net/v2/ja/sets')
  const tcgdexMap = new Map()
  if (tcgdexSets) {
    for (const s of tcgdexSets) {
      const detail = await fetchJSON(`https://api.tcgdex.net/v2/ja/sets/${s.id}`)
      if (detail) {
        tcgdexMap.set(s.id, {
          name: s.name,
          releaseDate: detail.releaseDate || null,
          symbol: detail.symbol ? detail.symbol + '.png' : null,
          logo: detail.logo ? detail.logo + '.png' : null,
        })
      }
      await sleep(50)
    }
    console.log(`TCGDex: ${tcgdexMap.size} JP sets enriched`)
  }

  // 2. Load current JP sets JSON
  const currentSets = JSON.parse(fs.readFileSync('public/data/sets-JP.json', 'utf8'))
  const currentCards = JSON.parse(fs.readFileSync('public/data/cards-JP.json', 'utf8'))
  console.log(`Current: ${currentSets.length} sets, ${Object.values(currentCards).flat().length} cards`)

  // 3. Enrich sets
  const enriched = currentSets.map(s => {
    // Try TCGDex match
    const tcg = tcgdexMap.get(s.id)
    const serie = ERA_MAP[s.id] || 'Autre'

    return {
      id: s.id,
      name: tcg?.name || s.name,
      logo: tcg?.logo || tcg?.symbol || null,
      serie: serie,
      releaseDate: tcg?.releaseDate || s.releaseDate || null,
      total: s.total,
    }
  })

  // Sort by release date (newest first), then by name
  enriched.sort((a, b) => {
    if (a.releaseDate && b.releaseDate) return b.releaseDate.localeCompare(a.releaseDate)
    if (a.releaseDate) return -1
    if (b.releaseDate) return 1
    return a.name.localeCompare(b.name)
  })

  // Stats
  const withLogo = enriched.filter(s => s.logo).length
  const withDate = enriched.filter(s => s.releaseDate).length
  const withSerie = enriched.filter(s => s.serie && s.serie !== 'Autre').length
  console.log(`\nEnriched: ${withLogo} logos, ${withDate} dates, ${withSerie} series`)

  // 4. Write
  fs.writeFileSync('public/data/sets-JP.json', JSON.stringify(enriched))
  console.log(`Written sets-JP.json (${enriched.length} sets)`)

  console.log('\n✅ Done')
}

main().catch(console.error)
