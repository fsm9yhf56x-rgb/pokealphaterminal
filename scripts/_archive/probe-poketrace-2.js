require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const KEY = process.env.POKETRACE_API_KEY
const BASE = 'https://api.poketrace.com/v1'
const H = { 'X-API-Key': KEY }

async function get(path) {
  const r = await fetch(BASE + path, { headers: H })
  return { status: r.status, body: await r.json().catch(() => null) }
}

;(async () => {
  console.log('=== A. Cartes par set slug ===')
  for (const param of ['set=ex-ruby-sapphire', 'set_slug=ex-ruby-sapphire', 'setSlug=ex-ruby-sapphire']) {
    const r = await get('/cards?' + param + '&limit=3')
    const rows = (r.body && r.body.data) || []
    console.log(param, '→', r.status, '|', rows.length, 'cartes |', rows.map(c => c.name + ' ' + (c.cardNumber || '')).join(', '))
  }

  console.log('\n=== B. Marche EU ===')
  for (const param of ['q=charizard&market=EU', 'q=charizard&market=eu']) {
    const r = await get('/cards?' + param + '&limit=3')
    const rows = (r.body && r.body.data) || []
    console.log(param, '→', r.status, '|', rows.map(c => c.market + ' ' + c.name + ' (' + (c.currency || '?') + ')').join(' | ') || 'rien')
  }

  console.log('\n=== C. Detail 1 carte EX Ruby Sapphire ===')
  const rs = await get('/cards?set=ex-ruby-sapphire&limit=50')
  const all = (rs.body && rs.body.data) || []
  console.log('Total retourne pour le set:', all.length)
  const hari = all.find(c => /hariyama/i.test(c.name)) || all[0]
  if (hari) {
    const d = await get('/cards/' + hari.id)
    const card = d.body && d.body.data
    if (card) {
      console.log(card.name, card.cardNumber, '| variant:', card.variant, '| tcgplayerId:', card.refs && card.refs.tcgplayerId)
      const pe = (card.prices && card.prices.ebay) || {}
      const pt = (card.prices && card.prices.tcgplayer) || {}
      console.log('NM tcgplayer:', JSON.stringify(pt.NEAR_MINT || null))
      console.log('NM ebay:', JSON.stringify(pe.NEAR_MINT || null))
      console.log('PSA_10 ebay:', JSON.stringify(pe.PSA_10 || null))
      console.log('gradedOptions:', JSON.stringify(card.gradedOptions || []).slice(0, 300))
    }
  }
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
