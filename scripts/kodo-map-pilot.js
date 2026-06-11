require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
const KEY = process.env.POKETRACE_API_KEY
const BASE = 'https://api.poketrace.com/v1'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function get(path) {
  const r = await fetch(BASE + path, { headers: { 'X-API-Key': KEY } })
  if (r.status === 429) { await sleep(12000); return get(path) }
  if (r.status !== 200) throw new Error('HTTP ' + r.status + ' sur ' + path)
  return r.json()
}

async function fetchSet(slug) {
  let all = [], cursor = null
  for (let i = 0; i < 30; i++) {
    const body = await get('/cards?set=' + slug + '&limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''))
    all = all.concat(body.data || [])
    cursor = body.pagination && body.pagination.nextCursor
    if (!cursor) break
    await sleep(700)
  }
  return all
}

const num = s => {
  const m = String(s || '').match(/\d+/)
  return m ? parseInt(m[0], 10) : null
}

;(async () => {
  const KODO_SET = 'en-ex1'
  const US_SLUG = 'ruby-and-sapphire'
  const EU_SLUG = 'ex-ruby-sapphire'

  const myCards = await sql`SELECT id, name FROM tcg_cards WHERE id LIKE ${KODO_SET + '-%'}`
  const byNum = {}
  for (const c of myCards) {
    const n = num(c.id.slice(KODO_SET.length + 1))
    if (n != null) byNum[n] = c
  }
  console.log('Catalogue Kodo:', myCards.length, 'cartes')

  console.log('Fetch PokeTrace US (' + US_SLUG + ')...')
  const us = await fetchSet(US_SLUG)
  console.log('  →', us.length, 'entrees')
  console.log('Fetch PokeTrace EU (' + EU_SLUG + ')...')
  const eu = await fetchSet(EU_SLUG)
  console.log('  →', eu.length, 'entrees')

  const refs = {}
  const ensure = n => refs[n] || (refs[n] = {})
  const nameMismatch = []

  for (const c of us) {
    const n = num(c.cardNumber)
    if (n == null || !byNum[n]) continue
    const slot = ensure(n)
    const holo = /holo/i.test(c.variant || '')
    slot[holo ? 'us_holo' : 'us'] = c.id
    if (!slot.tcgp && c.refs && c.refs.tcgplayerId) slot.tcgp = String(c.refs.tcgplayerId)
    const a = (byNum[n].name || '').toLowerCase().replace(/[^a-z]/g, '')
    const b = (c.name || '').toLowerCase().replace(/[^a-z]/g, '')
    if (a && b && !a.includes(b) && !b.includes(a)) nameMismatch.push(n + ': kodo=' + byNum[n].name + ' vs PT=' + c.name)
  }
  for (const c of eu) {
    const n = num(c.cardNumber)
    if (n == null || !byNum[n]) continue
    const slot = ensure(n)
    const holo = /holo/i.test(c.variant || '')
    slot[holo ? 'eu_holo' : 'eu'] = c.id
    if (!slot.cm && c.refs && c.refs.cardmarketId) slot.cm = String(c.refs.cardmarketId)
  }

  let full = 0, partial = 0, none = 0
  const missing = []
  for (const n of Object.keys(byNum)) {
    const s = refs[n]
    if (!s) { none++; missing.push(n + ' ' + byNum[n].name); continue }
    const score = ['us','us_holo','eu','eu_holo'].filter(k => s[k]).length
    score >= 2 ? full++ : partial++

    await sql`INSERT INTO source_refs (kodo_card_id, tcgplayer_id, poketrace_us_id, poketrace_us_holo_id,
        poketrace_eu_id, poketrace_eu_holo_id, cardmarket_id, mapped_at, map_method, map_confidence)
      VALUES (${byNum[n].id}, ${s.tcgp || null}, ${s.us || null}, ${s.us_holo || null},
        ${s.eu || null}, ${s.eu_holo || null}, ${s.cm || null}, now(), 'set+number', ${score / 4})
      ON CONFLICT (kodo_card_id) DO UPDATE SET
        tcgplayer_id = EXCLUDED.tcgplayer_id,
        poketrace_us_id = EXCLUDED.poketrace_us_id,
        poketrace_us_holo_id = EXCLUDED.poketrace_us_holo_id,
        poketrace_eu_id = EXCLUDED.poketrace_eu_id,
        poketrace_eu_holo_id = EXCLUDED.poketrace_eu_holo_id,
        cardmarket_id = EXCLUDED.cardmarket_id,
        mapped_at = now(), map_method = 'set+number', map_confidence = EXCLUDED.map_confidence`
  }

  console.log('\n=== RAPPORT PILOTE ===')
  console.log('Mappees (2+ refs):', full, '| Partielles (1 ref):', partial, '| Introuvables:', none)
  if (missing.length) console.log('Introuvables:', missing.join(' | '))
  if (nameMismatch.length) {
    console.log('\nALERTES nom different (' + nameMismatch.length + ') — a verifier:')
    console.log(nameMismatch.slice(0, 15).join('\n'))
  } else {
    console.log('Aucune divergence de nom — match par numero fiable sur ce set.')
  }

  const check = await sql`SELECT count(*) AS n, count(poketrace_eu_id) AS eu, count(poketrace_us_id) AS us,
    count(tcgplayer_id) AS tcgp, count(cardmarket_id) AS cm FROM source_refs`
  console.log('\nsource_refs:', JSON.stringify(check[0]))
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
