const fs = require('fs')
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchJSON(url) {
  try { const r = await fetch(url); if (!r.ok) return null; return r.json() } catch { return null }
}

async function main() {
  console.log('═══ Building JP→EN Pokémon name dict from PokéAPI ═══\n')

  // 1. Fetch all Pokémon species names (JP→EN) from PokéAPI
  const nameDict = new Map()
  
  // Get total count
  const first = await fetchJSON('https://pokeapi.co/api/v2/pokemon-species?limit=1')
  const total = first?.count || 1025
  console.log(`Fetching ${total} Pokémon species...\n`)

  // Fetch in batches
  const all = await fetchJSON(`https://pokeapi.co/api/v2/pokemon-species?limit=${total}`)
  
  let processed = 0
  for (const species of all.results) {
    const data = await fetchJSON(species.url)
    if (!data?.names) continue

    const jpName = data.names.find(n => n.language.name === 'ja' || n.language.name === 'ja-Hrkt')?.name
    const enName = data.names.find(n => n.language.name === 'en')?.name

    if (jpName && enName) {
      nameDict.set(jpName, enName)
      
      // Also add common TCG suffixes
      const suffixes = ['ex','EX','GX','V','VMAX','VSTAR','BREAK','δ','☆','◇']
      suffixes.forEach(suf => {
        nameDict.set(jpName + suf, enName + ' ' + suf)
        nameDict.set(jpName + ' ' + suf, enName + ' ' + suf)
      })
      // Special format: ピカチュウex → Pikachu ex
      nameDict.set(jpName + 'ｅｘ', enName + ' ex')
    }

    // Also get ja-Hrkt (katakana) if different
    const jpKata = data.names.find(n => n.language.name === 'ja-Hrkt')?.name
    const jpKanji = data.names.find(n => n.language.name === 'ja')?.name
    if (jpKata && jpKata !== jpName && enName) {
      nameDict.set(jpKata, enName)
      const suffixes = ['ex','EX','GX','V','VMAX','VSTAR','BREAK']
      suffixes.forEach(suf => {
        nameDict.set(jpKata + suf, enName + ' ' + suf)
        nameDict.set(jpKata + ' ' + suf, enName + ' ' + suf)
      })
    }
    if (jpKanji && jpKanji !== jpName && jpKanji !== jpKata && enName) {
      nameDict.set(jpKanji, enName)
    }

    processed++
    if (processed % 100 === 0) process.stdout.write(`  ${processed}/${total}\r`)
    await sleep(30)
  }
  console.log(`\nBase dict: ${nameDict.size} translations`)

  // Sanity checks
  const checks = [
    ['リザードン', 'Charizard'], ['ピカチュウ', 'Pikachu'],
    ['フシギダネ', 'Bulbasaur'], ['ゼニガメ', 'Squirtle'],
    ['ミュウツー', 'Mewtwo'], ['ルギア', 'Lugia'],
    ['リザードンex', 'Charizard ex'], ['ピカチュウex', 'Pikachu ex'],
    ['ブラッキー', 'Umbreon'], ['レックウザ', 'Rayquaza'],
    ['ゲンガー', 'Gengar'], ['カイリュー', 'Dragonite'],
  ]
  console.log('\nSanity checks:')
  for (const [jp, expected] of checks) {
    const got = nameDict.get(jp)
    console.log(`  ${jp} → ${got || 'MISSING'} ${got === expected ? '✅' : '⚠️'}`)
  }

  // 2. Load JP data
  const jpCards = JSON.parse(fs.readFileSync('public/data/cards-JP.json', 'utf8'))
  const jpSets = JSON.parse(fs.readFileSync('public/data/sets-JP.json', 'utf8'))

  // 3. Apply EN names
  let enriched = 0, totalCards = 0
  Object.values(jpCards).forEach(cards => {
    cards.forEach(c => {
      totalCards++
      delete c.en

      // Direct match
      let enName = nameDict.get(c.n)
      if (enName) { c.en = enName; enriched++; return }

      // Try without spaces
      enName = nameDict.get(c.n.replace(/\s+/g, ''))
      if (enName) { c.en = enName; enriched++; return }

      // Try base name (before ex/V/etc)
      const base = c.n.replace(/(ex|EX|GX|V|VMAX|VSTAR|BREAK|ｅｘ)$/g, '').trim()
      if (base !== c.n) {
        enName = nameDict.get(base)
        if (enName) {
          const suffix = c.n.slice(base.length).replace('ｅｘ', 'ex')
          c.en = enName + ' ' + suffix
          enriched++
          return
        }
      }
    })
  })
  console.log(`\nCards: ${enriched} / ${totalCards} with EN name (${(enriched/totalCards*100).toFixed(1)}%)`)

  // 4. Set EN names
  const VERIFIED_SET_NAMES = {
    SV1S:'Scarlet ex', SV1V:'Violet ex',
    SV1a:'Triplet Beat', SV2D:'Snow Hazard', SV2P:'Clay Burst',
    SV2a:'Pokémon Card 151', SV3:'Ruler of the Black Flame', SV3a:'Raging Surf',
    SV4K:'Ancient Roar', SV4M:'Future Flash', SV4a:'Shiny Treasure ex',
    SV5K:'Wild Force', SV5M:'Cyber Judge', SV5a:'Crimson Haze',
    SV6:'Mask of Change', SV6a:'Night Wanderer',
    SV7:'Stellar Miracle', SV7a:'Paradise Dragona',
    SV8:'Super Electric Breaker', SV8a:'Terastal Fest ex',
    SV9:'Battle Partners', SV9a:'Heat Wave Arena',
    SV10:'Glory of Team Rocket', SV11B:'Black Bolt', SV11W:'White Flare',
    M1S:'Mega Symphony', M2:'Mega Evolution 2', M2a:'Mega Evolution 2a',
    M3:'Munekis Zero', M4:'Perfect Order',
    S1H:'Shield', S1W:'Sword', S2:'Rebellion Crash',
    S3:'Infinity Zone', S3a:'Legendary Heartbeat',
    S4:'Amazing Volt Tackle', S4a:'Shiny Star V',
    S5R:'Rapid Strike Master', S5I:'Single Strike Master',
    S6K:'Jet-Black Spirit', S6H:'Silver Lance',
    S7R:'Blue Sky Stream', S7D:'Skyscraping Perfect',
    S8:'Fusion Arts', S8a:'25th Anniv. Collection', S8b:'VMAX Climax',
    S9:'Star Birth', S9a:'Battle Region',
    S10b:'Lost Abyss', S12:'Paradigm Trigger', S12a:'VSTAR Universe',
    SM1S:'Collection Sun', SM1M:'Collection Moon',
    SM5S:'Ultra Sun', SM5M:'Ultra Moon',
    SM6:'Forbidden Light', SM7:'Celestial Storm', SM8:'Lost Thunder',
    SM9:'Tag Bolt', SM10:'Double Blaze', SM11:'Miracle Twins', SM12a:'Tag All Stars',
    PMCG1:'Base Set', PMCG2:'Jungle', PMCG3:'Fossil', PMCG4:'Team Rocket',
    PMCG5:'Gym Heroes', PMCG6:'Gym Challenge',
    neo1:'Neo Genesis', neo2:'Neo Discovery', neo3:'Neo Revelation', neo4:'Neo Destiny',
    E1:'Expedition', E2:'Aquapolis', E3:'Skyridge',
    DP1:'Diamond & Pearl', DP2:'Mysterious Treasures', DP3:'Secret Wonders',
    DP4:'Great Encounters', DP5:'Majestic Dawn',
  }

  jpSets.forEach(s => {
    delete s.enName
    if (VERIFIED_SET_NAMES[s.id]) s.enName = VERIFIED_SET_NAMES[s.id]
  })
  const setsWithEn = jpSets.filter(s => s.enName).length
  console.log(`Sets: ${setsWithEn} / ${jpSets.length} with EN name`)

  // 5. Write
  fs.writeFileSync('public/data/sets-JP.json', JSON.stringify(jpSets))
  fs.writeFileSync('public/data/cards-JP.json', JSON.stringify(jpCards))
  console.log(`\ncards-JP.json: ${(fs.statSync('public/data/cards-JP.json').size/1024/1024).toFixed(2)} MB`)
  console.log('\n✅ Done — all EN names from official PokéAPI')
}

main().catch(console.error)
