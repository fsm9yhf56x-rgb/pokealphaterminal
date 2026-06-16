require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
const KEY = process.env.POKETRACE_API_KEY
if (!KEY) { console.error('POKETRACE_API_KEY manquante'); process.exit(1) }

const BASE = 'https://api.poketrace.com/v1'
const H = { 'X-API-Key': KEY }
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function get(path) {
  const r = await fetch(BASE + path, { headers: H })
  const plan = r.headers.get('x-plan')
  const remaining = r.headers.get('x-ratelimit-remaining')
  if (r.status === 429) { console.log('  [429] pause 12s...'); await sleep(12000); return get(path) }
  const body = await r.json().catch(() => null)
  return { status: r.status, plan, remaining, body }
}

;(async () => {
  console.log('=== 1. PLAN & ACCES ===')
  const h = await get('/cards?q=charizard&limit=1')
  console.log('Status:', h.status, '| Plan:', h.plan, '| Quota restant:', h.remaining)
  if (h.plan !== 'Pro' && h.plan !== 'Scale') {
    console.log('ATTENTION: plan detecte =', h.plan, '— la cle Pro ne semble pas active')
  }

  console.log('\n=== 2. SETS POKETRACE ===')
  let allSets = []
  let cursor = null
  for (let i = 0; i < 10; i++) {
    const path = '/sets?limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '')
    const r = await get(path)
    const rows = r.body && (r.body.data || r.body.sets || [])
    if (!rows || !rows.length) break
    allSets = allSets.concat(rows)
    cursor = r.body.pagination && r.body.pagination.nextCursor
    if (!cursor) break
    await sleep(500)
  }
  console.log('Total sets PokeTrace:', allSets.length)

  const probe = ['ruby', 'sapphire', 'deoxys', 'dragon frontiers', 'diamond', 'pearl', 'platinum', 'heartgold', 'black', 'white', 'plasma', 'flashfire', 'evolutions']
  console.log('\nSets matchant les eres manquantes de PPT:')
  for (const s of allSets) {
    const n = (s.name || '').toLowerCase()
    if (probe.some(p => n.includes(p))) console.log(' -', s.slug || s.id, '|', s.name)
  }

  console.log('\n=== 3. TEST RUBY & SAPPHIRE ===')
  const rs = await get('/cards?q=' + encodeURIComponent('Hariyama') + '&limit=10')
  const cards = (rs.body && rs.body.data) || []
  console.log('Resultats "Hariyama":', cards.length)
  for (const c of cards.slice(0, 6)) {
    console.log(' -', c.id, '|', c.name, '|', c.set && c.set.name, '|', c.cardNumber,
      '| market:', c.market, '| tcgplayerId:', c.refs && c.refs.tcgplayerId,
      '| cardmarketId:', c.refs && c.refs.cardmarketId,
      '| hasGraded:', c.hasGraded, '| topPrice:', c.topPrice)
  }

  console.log('\n=== 4. ACCES EU + GRADED (cle Pro) ===')
  const eu = await get('/cards?q=' + encodeURIComponent('Charizard ex obsidian') + '&limit=5')
  const euCards = ((eu.body && eu.body.data) || []).filter(c => c.market === 'EU')
  console.log('Cartes EU retournees:', euCards.length, euCards.length ? '→ ACCES EU OK' : '→ AUCUNE (filtre market a tester autrement)')
  const any = ((eu.body && eu.body.data) || [])[0]
  if (any) {
    const detail = await get('/cards/' + any.id)
    const d = detail.body && detail.body.data
    if (d) {
      const sources = Object.keys(d.prices || {})
      const tiers = sources.flatMap(s => Object.keys(d.prices[s] || {}))
      console.log('Carte', d.name, '| market:', d.market, '| sources:', sources.join(','))
      console.log('Tiers dispo:', tiers.slice(0, 20).join(', '))
      console.log('gradedOptions:', JSON.stringify(d.gradedOptions || []))
    }
  }

  console.log('\n=== 5. MAPPING AVEC TON CATALOGUE ===')
  const myEn = await sql`SELECT count(*) AS n FROM tcg_cards WHERE id LIKE 'en-%'`
  console.log('Cartes EN catalogue Kodo:', myEn[0].n)
  console.log('Sets EN catalogue Kodo: 221 | Sets PokeTrace:', allSets.length)
  console.log('\nQuota restant fin de probe:', (await get('/health')).remaining)
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
