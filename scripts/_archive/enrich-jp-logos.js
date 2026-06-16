const fs = require('fs')
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchJSON(url) {
  try { const r = await fetch(url); if (!r.ok) return null; return r.json() } catch { return null }
}

// Map JP set codes → EN TCGDex set IDs (for logo)
const JP_TO_EN = {
  // SV era
  SV1S:'sv01', SV1V:'sv01', SV1a:'sv03.5', SV2D:'sv02', SV2P:'sv02', SV2a:'sv03.5',
  SV3:'sv03', SV3a:'sv03', SV4K:'sv04', SV4M:'sv04', SV4a:'sv04.5',
  SV5K:'sv05', SV5M:'sv05', SV5a:'sv05', SV6:'sv06', SV6a:'sv06.5',
  SV7:'sv07', SV7a:'sv07', SV8:'sv08', SV8a:'sv08.5', SV9:'sv09', SV9a:'sv09',
  SV10:'sv10', SV11B:'sv10.5b', SV11W:'sv10.5w',
  'SV-P':'svp',
  // Mega
  M1S:'me01', M1L:'me01', M2:'me02', M2a:'me02.5', M3:'me03', M4:'me03',
  // Sword & Shield
  S1H:'swsh1', S1W:'swsh1', S2:'swsh2', S3:'swsh3', S3a:'swsh3.5',
  S4:'swsh4', S4a:'swsh4.5', S5R:'swsh5', S5I:'swsh5',
  S6K:'swsh6', S6H:'swsh6', S7R:'swsh7', S7D:'swsh7',
  S8:'swsh8', S8a:'swsh9', S8b:'swsh9', S9:'swsh10', S9a:'swsh10',
  S10b:'swsh11', S12:'swsh12', S12a:'swsh12.5',
  SA:'swsh1', SB:'swsh2', 'S-P':'swshp',
  // Sun & Moon
  SM1S:'sm1', SM1M:'sm1', SM5S:'sm5', SM5M:'sm5',
  SM6:'sm6', SM6b:'sm6', SM7:'sm7', SM7a:'sm7',
  SM8:'sm8', SM8b:'sm8', SM9:'sm9', SM9a:'sm9', SM9b:'sm9',
  SM10:'sm10', SM11:'sm11', SM11a:'sm11', SM12a:'sm12',
  SMA:'sm115', SMB:'sm1', SMP:'smp',
  // XY
  XYA:'xy1', XYB:'xy2', XYC:'xy3', XYD:'xy4', XYE:'xy5', XYF:'xy6', XYG:'xy7', XYH:'xy8',
  'XY-P':'xyp', XYP:'xyp',
  // BW
  BW:'bw1', BWP:'bwp',
  // DP
  DP:'dp1', DP1:'dp1', DP2:'dp2', DP3:'dp3', DP4:'dp4', DP5:'dp5', DPP:'dpp',
  // Classic
  PMCG1:'base1', PMCG2:'base2', PMCG3:'base3', PMCG4:'base5', PMCG5:'gym1', PMCG6:'gym2',
  neo1:'neo1', neo2:'neo2', neo3:'neo3', neo4:'neo4',
  E1:'ecard1', E2:'ecard2', E3:'ecard3',
}

async function main() {
  console.log('═══ Adding logos from EN sets ═══\n')

  // 1. Fetch all EN set logos from TCGDex
  const enSets = await fetchJSON('https://api.tcgdex.net/v2/en/sets')
  const logoMap = new Map()

  for (const s of enSets) {
    const detail = await fetchJSON(`https://api.tcgdex.net/v2/en/sets/${s.id}`)
    if (detail?.logo) logoMap.set(s.id, detail.logo + '.png')
    if (detail?.symbol) logoMap.set('sym-' + s.id, detail.symbol + '.png')
    await sleep(30)
  }
  console.log(`EN logos loaded: ${logoMap.size / 2}`)

  // 2. Load current JP sets
  const sets = JSON.parse(fs.readFileSync('public/data/sets-JP.json', 'utf8'))

  // 3. Enrich with logos
  let added = 0
  for (const s of sets) {
    if (s.logo) continue
    const enId = JP_TO_EN[s.id]
    if (enId) {
      const logo = logoMap.get(enId) || logoMap.get('sym-' + enId)
      if (logo) {
        s.logo = logo
        added++
      }
    }
  }

  console.log(`Logos added: ${added} / ${sets.length}`)

  // 4. Fill missing dates from TCGDex JP
  const jpSets = await fetchJSON('https://api.tcgdex.net/v2/ja/sets')
  const jpDateMap = new Map()
  if (jpSets) {
    for (const s of jpSets) {
      const d = await fetchJSON(`https://api.tcgdex.net/v2/ja/sets/${s.id}`)
      if (d?.releaseDate) jpDateMap.set(s.id, d.releaseDate)
      await sleep(30)
    }
  }

  let datesAdded = 0
  for (const s of sets) {
    if (s.releaseDate) continue
    // Try direct match
    const date = jpDateMap.get(s.id)
    if (date) { s.releaseDate = date; datesAdded++ }
  }
  console.log(`Dates added: ${datesAdded}`)

  // 5. Stats
  const withLogo = sets.filter(s => s.logo).length
  const withDate = sets.filter(s => s.releaseDate).length
  const withSerie = sets.filter(s => s.serie && s.serie !== 'Autre').length
  console.log(`\nFinal: ${withLogo} logos, ${withDate} dates, ${withSerie} series out of ${sets.length} sets`)

  // 6. Write
  fs.writeFileSync('public/data/sets-JP.json', JSON.stringify(sets))
  console.log('Written sets-JP.json')
  console.log('\n✅ Done')
}

main().catch(console.error)
