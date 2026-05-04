// Test scraper TCGPlayer — pas un vrai sync, juste valider la donnée
const TCGP = 'https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=true'
const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0',
  'Origin': 'https://www.tcgplayer.com',
  'Referer': 'https://www.tcgplayer.com/',
}

function payload(productLine, setName, from = 0, size = 50) {
  return {
    algorithm: '', from, size,
    filters: { term: { productLineName: [productLine], setName: [setName] }, range: {}, match: {} },
    listingSearch: { filters: { term: {}, range: { quantity: { gte: 1 } }, exclude: { channelExclusion: 0, listingType: 'Custom' } }, context: { cart: {} } },
    context: { cart: {}, shippingCountry: 'US', userProfile: { productLineAffinity: '', priceAffinity: 0 } },
    sort: {},
  }
}

async function fetchSet(productLine, setName) {
  const all = []
  let from = 0
  while (true) {
    const r = await fetch(TCGP, { method: 'POST', headers: HEADERS, body: JSON.stringify(payload(productLine, setName, from, 50)) })
    if (!r.ok) { console.error(`HTTP ${r.status}`); break }
    const data = await r.json()
    const hits = data?.results?.[0]?.results || []
    if (!hits.length) break
    all.push(...hits)
    if (hits.length < 50) break
    from += 50
    await new Promise(r => setTimeout(r, 300))
  }
  return all
}

function summarize(label, hits) {
  console.log(`\n═══ ${label} ═══`)
  console.log(`Total products: ${hits.length}`)
  if (!hits.length) return
  
  // Sample first card
  const c = hits[0]
  console.log(`\nFirst card structure:`)
  console.log(`  productId:    ${c.productId}`)
  console.log(`  productName:  ${c.productName}`)
  console.log(`  number:       ${c.customAttributes?.number || c.number || '?'}`)
  console.log(`  setUrlName:   ${c.setUrlName}`)
  console.log(`  marketPrice:  ${c.marketPrice}`)
  console.log(`  lowPrice:     ${c.lowPrice}`)
  console.log(`  rarity:       ${c.rarityName}`)
  console.log(`  productUrlName: ${c.productUrlName}`)
  console.log(`  All keys:     ${Object.keys(c).join(', ')}`)
  
  // Print all cards summary
  console.log(`\nAll cards summary:`)
  hits.slice(0, 10).forEach(h => {
    const num = h.customAttributes?.number || h.number || '?'
    const mp = h.marketPrice != null ? `$${h.marketPrice}` : 'null'
    console.log(`  #${num} ${h.productName} → market=${mp}`)
  })
  if (hits.length > 10) console.log(`  ... +${hits.length - 10} more`)
}

async function main() {
  console.log('TCGPlayer test scraper — validating endpoint behavior\n')
  
  // Test 1 — Base Set EN
  const baseEN = await fetchSet('pokemon', 'base-set')
  summarize('EN — Base Set', baseEN)
  
  // Test 2 — un set JP (essayer un setName JP courant)
  // On va d'abord lister les setNames JP disponibles via aggregation
  const aggR = await fetch(TCGP, { method: 'POST', headers: HEADERS, body: JSON.stringify(payload('pokemon-japan', '', 0, 1)) })
  const aggData = await aggR.json()
  const jpSets = aggData?.results?.[0]?.aggregations?.setName?.slice(0, 5) || []
  console.log('\n═══ JP Sets discovered (top 5 by count) ═══')
  jpSets.forEach(s => console.log(`  ${s.urlValue.padEnd(40)} (${s.count} cards)`))
  
  // Test on the first JP set found
  if (jpSets.length) {
    const firstJP = jpSets[0].urlValue
    const jpCards = await fetchSet('pokemon-japan', firstJP)
    summarize(`JP — ${firstJP}`, jpCards)
  }
}

main().catch(console.error)
