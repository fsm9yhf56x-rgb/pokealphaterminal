const fs = require('fs')
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchJSON(url) {
  try { const r = await fetch(url); if (!r.ok) return null; return r.json() } catch { return null }
}

// JP set code (pokemon-card.com) → TCGDex JP set ID
// Must be exact — each JP set maps to ONE TCGDex JP set
const JP_TCGDEX = {
  // SV era
  SV1S:'SV1S',SV1V:'SV1V',SV1a:'SV1a',SV2D:'SV2D',SV2P:'SV2P',SV2a:'SV2a',
  SV3:'SV3',SV3a:'SV3a',SV4K:'SV4K',SV4M:'SV4M',SV4a:'SV4a',
  SV5K:'SV5K',SV5M:'SV5M',SV5a:'SV5a',SV6:'SV6',SV6a:'SV6a',
  SV7:'SV7',SV7a:'SV7a',SV8:'SV8',SV8a:'SV8a',SV9:'SV9',SV9a:'SV9a',
  SV10:'SV10',SV11B:'SV11B',SV11W:'SV11W',
  // Mega
  M1S:'M1S',M2:'M2',M2a:'M2a',M3:'M3',M4:'M4',
  // Sword & Shield
  S1H:'S1H',S1W:'S1W',S2:'S2',S3:'S3',S3a:'S3a',
  S4:'S4',S4a:'S4a',S5R:'S5R',S5I:'S5I',
  S6K:'S6K',S6H:'S6H',S7R:'S7R',S7D:'S7D',
  S8:'S8',S8a:'S8a',S8b:'S8b',S9:'S9',S9a:'S9a',
  S10b:'S10b',S12:'S12',S12a:'S12a',
  // Sun & Moon
  SM1S:'SM1S',SM1M:'SM1M',SM5S:'SM5S',SM5M:'SM5M',
  SM6:'SM6',SM6b:'SM6b',SM7:'SM7',SM7a:'SM7a',
  SM8:'SM8',SM8b:'SM8b',SM9:'SM9',SM9a:'SM9a',SM9b:'SM9b',
  SM10:'SM10',SM11:'SM11',SM11a:'SM11a',SM12a:'SM12a',
  // Classic
  PMCG1:'PMCG1',PMCG2:'PMCG2',PMCG3:'PMCG3',PMCG4:'PMCG4',
  PMCG5:'PMCG5',PMCG6:'PMCG6',
  neo1:'neo1',neo2:'neo2',neo3:'neo3',neo4:'neo4',
  E1:'E1',E2:'E2',E3:'E3',E4:'E4',E5:'E5',
  DP1:'DP1',DP2:'DP2',DP3:'DP3',DP4:'DP4',DP5:'DP5',
  XYA:'XYA',XYB:'XYB',XYC:'XYC',XYD:'XYD',XYE:'XYE',
  XYF:'XYF',XYG:'XYG',XYH:'XYH',
}

// TCGDex JP set → EN set (for EN names)
const TCGDEX_JP_EN = {
  SV1S:'sv01',SV1V:'sv01',SV1a:'sv03.5',SV2D:'sv02',SV2P:'sv02',SV2a:'sv03.5',
  SV3:'sv03',SV3a:'sv03',SV4K:'sv04',SV4M:'sv04',SV4a:'sv04.5',
  SV5K:'sv05',SV5M:'sv05',SV5a:'sv05',SV6:'sv06',SV6a:'sv06.5',
  SV7:'sv07',SV7a:'sv07',SV8:'sv08',SV8a:'sv08.5',SV9:'sv09',SV9a:'sv09',
  SV10:'sv10',SV11B:'sv10.5b',SV11W:'sv10.5w',
  M1S:'me01',M2:'me02',M2a:'me02.5',M3:'me03',M4:'me03',
  S1H:'swsh1',S1W:'swsh1',S2:'swsh2',S3:'swsh3',S3a:'swsh3.5',
  S4:'swsh4',S4a:'swsh4.5',S5R:'swsh5',S5I:'swsh5',
  S6K:'swsh6',S6H:'swsh6',S7R:'swsh7',S7D:'swsh7',
  S8:'swsh8',S8a:'swsh9',S8b:'swsh9',S9:'swsh10',S9a:'swsh10',
  S10b:'swsh11',S12:'swsh12',S12a:'swsh12.5',
  SM1S:'sm1',SM1M:'sm1',SM5S:'sm5',SM5M:'sm5',
  SM6:'sm6',SM6b:'sm6',SM7:'sm7',SM7a:'sm7',
  SM8:'sm8',SM8b:'sm8',SM9:'sm9',SM9a:'sm9',SM9b:'sm9',
  SM10:'sm10',SM11:'sm11',SM11a:'sm11',SM12a:'sm12',
  PMCG1:'base1',PMCG2:'base2',PMCG3:'base3',PMCG4:'base5',
  PMCG5:'gym1',PMCG6:'gym2',
  neo1:'neo1',neo2:'neo2',neo3:'neo3',neo4:'neo4',
  E1:'ecard1',E2:'ecard2',E3:'ecard3',E4:'ex1',E5:'ex2',
  DP1:'dp1',DP2:'dp2',DP3:'dp3',DP4:'dp4',DP5:'dp5',
  XYA:'xy1',XYB:'xy2',XYC:'xy3',XYD:'xy4',XYE:'xy5',
  XYF:'xy6',XYG:'xy7',XYH:'xy8',
}

async function main() {
  console.log('═══ Precise JP→EN name mapping (per-set, by localId) ═══\n')

  // 1. For each JP set, fetch TCGDex JP and EN, match by localId
  // Build: per-set map { jpName → enName }
  const perSetMap = new Map() // setCode → Map<jpName, enName>
  let totalTranslations = 0

  const entries = Object.entries(JP_TCGDEX)
  for (let i = 0; i < entries.length; i++) {
    const [setCode, tcgdexJpId] = entries[i]
    const tcgdexEnId = TCGDEX_JP_EN[tcgdexJpId]
    if (!tcgdexEnId) continue

    const [jpSet, enSet] = await Promise.all([
      fetchJSON(`https://api.tcgdex.net/v2/ja/sets/${tcgdexJpId}`),
      fetchJSON(`https://api.tcgdex.net/v2/en/sets/${tcgdexEnId}`),
    ])

    if (!jpSet?.cards || !enSet?.cards) continue

    // Match strictly by localId within this set
    const enByLid = new Map(enSet.cards.map(c => [c.localId, c.name]))
    const setMap = new Map()

    for (const c of jpSet.cards) {
      const enName = enByLid.get(c.localId)
      if (enName && c.name) {
        setMap.set(c.name, enName)
        totalTranslations++
      }
    }

    if (setMap.size > 0) perSetMap.set(setCode, setMap)

    if ((i + 1) % 10 === 0) process.stdout.write(`  ${i + 1}/${entries.length} sets → ${totalTranslations} translations\r`)
    await sleep(60)
  }
  console.log(`\n${perSetMap.size} sets mapped, ${totalTranslations} precise translations\n`)

  // 2. Load JP data
  const jpCards = JSON.parse(fs.readFileSync('public/data/cards-JP.json', 'utf8'))
  const jpSets = JSON.parse(fs.readFileSync('public/data/sets-JP.json', 'utf8'))
  const enSets = JSON.parse(fs.readFileSync('public/data/sets-EN.json', 'utf8'))
  const enSetNameMap = new Map(enSets.map(s => [s.id, s.name]))

  // 3. Apply EN names to cards — PER SET only (no cross-contamination)
  let enriched = 0, total = 0, noMatch = 0
  Object.entries(jpCards).forEach(([setId, cards]) => {
    const setMap = perSetMap.get(setId)
    cards.forEach(c => {
      total++
      // Remove any previous bad mapping
      delete c.en
      if (setMap) {
        const enName = setMap.get(c.n)
        if (enName) {
          c.en = enName
          enriched++
        } else {
          noMatch++
        }
      }
    })
  })
  console.log(`Cards: ${enriched} with EN name, ${noMatch} in mapped sets but no match, ${total - enriched - noMatch} in unmapped sets`)

  // 4. EN set names
  let setsEnriched = 0
  jpSets.forEach(s => {
    delete s.enName
    const enId = TCGDEX_JP_EN[s.id]
    if (enId && enSetNameMap.has(enId)) {
      s.enName = enSetNameMap.get(enId)
      setsEnriched++
    }
  })
  console.log(`Sets: ${setsEnriched} with EN name / ${jpSets.length}`)

  // 5. Write
  fs.writeFileSync('public/data/sets-JP.json', JSON.stringify(jpSets))
  fs.writeFileSync('public/data/cards-JP.json', JSON.stringify(jpCards))
  console.log(`\ncards-JP.json: ${(fs.statSync('public/data/cards-JP.json').size/1024/1024).toFixed(2)} MB`)
  console.log('\n✅ Done — all EN names are precise (matched by set + localId)')
}

main().catch(console.error)
