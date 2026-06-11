require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const KEY = process.env.POKETRACE_API_KEY
const BASE = 'https://api.poketrace.com/v1'
const H = { 'X-API-Key': KEY }
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function get(path) {
  const r = await fetch(BASE + path, { headers: H })
  if (r.status === 429) { await sleep(12000); return get(path) }
  return { status: r.status, body: await r.json().catch(() => null) }
}

;(async () => {
  console.log('=== PAGINATION SET COMPLET ===')
  let all = []
  let cursor = null
  for (let i = 0; i < 12; i++) {
    const path = '/cards?set=ex-ruby-sapphire&limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '')
    const r = await get(path)
    const rows = (r.body && r.body.data) || []
    all = all.concat(rows)
    const pag = r.body && r.body.pagination
    console.log('page', i + 1, ':', rows.length, 'cartes | hasMore:', pag && pag.hasMore)
    cursor = pag && pag.nextCursor
    if (!cursor) break
    await sleep(500)
  }
  console.log('TOTAL:', all.length, '(catalogue Kodo: 109)')

  const variants = {}
  for (const c of all) variants[c.variant || 'null'] = (variants[c.variant || 'null'] || 0) + 1
  console.log('Variants:', JSON.stringify(variants))

  const haris = all.filter(c => /hariyama/i.test(c.name))
  console.log('\nHariyama trouvees:', haris.map(c => c.id + ' | ' + c.variant + ' | n°' + c.cardNumber + ' | tcgplayerId:' + (c.refs && c.refs.tcgplayerId)).join('\n  '))

  const target = haris.find(c => /holo/i.test(c.variant || '')) || haris[0] || all.find(c => /holo/i.test(c.variant || ''))
  if (target) {
    console.log('\n=== DETAIL', target.name, target.variant, '===')
    const d = await get('/cards/' + target.id)
    const card = d.body && d.body.data
    if (card) {
      const pt = (card.prices && card.prices.tcgplayer) || {}
      const pe = (card.prices && card.prices.ebay) || {}
      console.log('NM tcgplayer:', JSON.stringify(pt.NEAR_MINT || null))
      console.log('NM ebay:', JSON.stringify(pe.NEAR_MINT || null))
      console.log('PSA_10:', JSON.stringify(pe.PSA_10 || null))
      console.log('PSA_9:', JSON.stringify(pe.PSA_9 || null))
      console.log('topPrice:', card.topPrice, '| totalSaleCount:', card.totalSaleCount, '| lastUpdated:', card.lastUpdated)
    }
  }

  console.log('\n=== EU: COTE FR ===')
  const eu = await get('/cards?q=hariyama&market=EU&limit=10')
  const euRows = ((eu.body && eu.body.data) || [])
  console.log('Hariyama EU:', euRows.map(c => c.id + ' | ' + (c.set && c.set.name) + ' | cardmarketId:' + (c.refs && c.refs.cardmarketId)).join('\n  ') || 'rien')
  if (euRows[0]) {
    const d = await get('/cards/' + euRows[0].id)
    const card = d.body && d.body.data
    if (card && card.prices) {
      const cm = card.prices.cardmarket || {}
      const cmu = card.prices.cardmarket_unsold || {}
      console.log('Price Trend:', JSON.stringify(cm.AGGREGATED || null))
      const nm = cmu.NEAR_MINT
      if (nm) {
        console.log('NM annonces — avg:', nm.avg, '| pays:', Object.keys(nm.country || {}).join(','))
        if (nm.country && nm.country.FR) console.log('NM FRANCE:', JSON.stringify(nm.country.FR).slice(0, 400))
      } else {
        console.log('cardmarket_unsold tiers:', Object.keys(cmu).join(','))
      }
    }
  }
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
