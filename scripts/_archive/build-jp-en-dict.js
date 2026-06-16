const fs = require('fs')
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchJSON(url) {
  try { const r = await fetch(url); if (!r.ok) return null; return r.json() } catch { return null }
}

async function main() {
  console.log('═══ Building comprehensive JP→EN Pokémon name dictionary ═══\n')

  // 1. Fetch ALL TCGDex JP sets
  const jpSets = await fetchJSON('https://api.tcgdex.net/v2/ja/sets')
  const enSets = await fetchJSON('https://api.tcgdex.net/v2/en/sets')
  if (!jpSets || !enSets) { console.error('Failed to fetch sets'); return }

  console.log(`TCGDex: ${jpSets.length} JP sets, ${enSets.length} EN sets`)

  // 2. Build localId-based name map for ALL EN sets
  const enCardsBySetAndLid = new Map() // "setId-localId" → enName
  console.log('Loading all EN cards...')
  for (let i = 0; i < enSets.length; i++) {
    const set = await fetchJSON(`https://api.tcgdex.net/v2/en/sets/${enSets[i].id}`)
    if (set?.cards) {
      set.cards.forEach(c => {
        enCardsBySetAndLid.set(`${enSets[i].id}-${c.localId}`, c.name)
      })
    }
    if ((i+1) % 20 === 0) process.stdout.write(`  EN: ${i+1}/${enSets.length}\r`)
    await sleep(30)
  }
  console.log(`\nEN cards indexed: ${enCardsBySetAndLid.size}`)

  // 3. For each TCGDex JP set, try to find its EN equivalent
  // Strategy: a JP set matches an EN set if >50% of localIds overlap
  console.log('\nMatching JP sets to EN sets...')
  
  const jpEnSetPairs = [] // [{jpSetId, enSetId, jpCards, enCards}]
  
  for (let i = 0; i < jpSets.length; i++) {
    const jpSet = await fetchJSON(`https://api.tcgdex.net/v2/ja/sets/${jpSets[i].id}`)
    if (!jpSet?.cards || jpSet.cards.length === 0) continue

    const jpLids = new Set(jpSet.cards.map(c => c.localId))

    // Try each EN set for overlap
    let bestMatch = null
    let bestOverlap = 0

    for (const enSet of enSets) {
      let overlap = 0
      for (const lid of jpLids) {
        if (enCardsBySetAndLid.has(`${enSet.id}-${lid}`)) overlap++
      }
      const ratio = overlap / jpLids.size
      if (ratio > 0.4 && overlap > bestOverlap) {
        bestOverlap = overlap
        bestMatch = enSet.id
      }
    }

    if (bestMatch) {
      jpEnSetPairs.push({
        jpSetId: jpSets[i].id,
        enSetId: bestMatch,
        cards: jpSet.cards,
        overlap: bestOverlap,
      })
    }

    if ((i+1) % 10 === 0) process.stdout.write(`  JP: ${i+1}/${jpSets.length} → ${jpEnSetPairs.length} matched\r`)
    await sleep(40)
  }
  console.log(`\nMatched ${jpEnSetPairs.length} JP→EN set pairs`)

  // 4. Build precise per-card translations from matched pairs
  const translations = new Map() // "jpSetId:jpName" → enName (precise, per-set)
  const globalDict = new Map()   // jpName → enName (global, from majority vote)
  const nameVotes = new Map()    // jpName → Map<enName, count>

  for (const pair of jpEnSetPairs) {
    for (const card of pair.cards) {
      if (!card.name) continue
      const enName = enCardsBySetAndLid.get(`${pair.enSetId}-${card.localId}`)
      if (enName) {
        translations.set(`${pair.jpSetId}:${card.name}:${card.localId}`, enName)
        
        // Vote for global dict
        if (!nameVotes.has(card.name)) nameVotes.set(card.name, new Map())
        const votes = nameVotes.get(card.name)
        votes.set(enName, (votes.get(enName) || 0) + 1)
      }
    }
  }
  console.log(`Precise translations: ${translations.size}`)

  // Build global dict from majority vote (only if unanimous or >70%)
  for (const [jpName, votes] of nameVotes) {
    const total = [...votes.values()].reduce((a, b) => a + b, 0)
    const sorted = [...votes.entries()].sort((a, b) => b[1] - a[1])
    const [bestName, bestCount] = sorted[0]
    if (bestCount / total >= 0.7) {
      globalDict.set(jpName, bestName)
    }
  }
  console.log(`Global dictionary: ${globalDict.size} reliable translations`)

  // 5. Apply to our JP cards
  const jpCards = JSON.parse(fs.readFileSync('public/data/cards-JP.json', 'utf8'))
  const jpSetsData = JSON.parse(fs.readFileSync('public/data/sets-JP.json', 'utf8'))
  const enSetsData = JSON.parse(fs.readFileSync('public/data/sets-EN.json', 'utf8'))
  const enSetNameMap = new Map(enSetsData.map(s => [s.id, s.name]))

  // Map our storage set codes → TCGDex JP set IDs
  // Try exact match first, then the matched pairs
  const storageToTcgdex = new Map()
  for (const pair of jpEnSetPairs) {
    storageToTcgdex.set(pair.jpSetId, pair)
  }

  let enriched = 0, fromGlobal = 0, total = 0
  Object.entries(jpCards).forEach(([setId, cards]) => {
    const pair = storageToTcgdex.get(setId)
    
    cards.forEach(c => {
      total++
      delete c.en

      // Strategy 1: precise per-set match (if we matched this set)
      if (pair) {
        // Try by name+localId in this set
        const precise = translations.get(`${setId}:${c.n}:${c.lid}`)
        if (precise) {
          c.en = precise
          enriched++
          return
        }
      }

      // Strategy 2: global dictionary (unanimous translations)
      const global = globalDict.get(c.n)
      if (global) {
        c.en = global
        fromGlobal++
        enriched++
      }
    })
  })
  console.log(`\nCards enriched: ${enriched} / ${total} (${(enriched/total*100).toFixed(1)}%)`)
  console.log(`  Precise: ${enriched - fromGlobal}, Global dict: ${fromGlobal}`)

  // 6. EN set names
  let setsEnriched = 0
  const pairMap = new Map(jpEnSetPairs.map(p => [p.jpSetId, p.enSetId]))
  jpSetsData.forEach(s => {
    delete s.enName
    const enId = pairMap.get(s.id)
    if (enId && enSetNameMap.has(enId)) {
      s.enName = enSetNameMap.get(enId)
      setsEnriched++
    }
  })
  console.log(`Sets enriched: ${setsEnriched} / ${jpSetsData.length}`)

  // 7. Write
  fs.writeFileSync('public/data/sets-JP.json', JSON.stringify(jpSetsData))
  fs.writeFileSync('public/data/cards-JP.json', JSON.stringify(jpCards))
  console.log(`\ncards-JP.json: ${(fs.statSync('public/data/cards-JP.json').size/1024/1024).toFixed(2)} MB`)
  console.log('\n✅ Done — professional-grade JP→EN mapping')
}

main().catch(console.error)
