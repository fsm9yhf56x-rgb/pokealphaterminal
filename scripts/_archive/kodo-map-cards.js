require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
const KEY = process.env.POKETRACE_API_KEY
const BASE = 'https://api.poketrace.com/v1'
const sleep = ms => new Promise(r => setTimeout(r, ms))

const MAX_REQ = 6000
const MAX_MS = 25 * 60 * 1000
const START = Date.now()
let reqCount = 0

async function get(path) {
  reqCount++
  const r = await fetch(BASE + path, { headers: { 'X-API-Key': KEY } })
  if (r.status === 429) { await sleep(12000); reqCount--; return get(path) }
  if (r.status !== 200) return null
  return r.json()
}

async function fetchSet(slug) {
  let all = [], cursor = null
  for (let i = 0; i < 60; i++) {
    const body = await get('/cards?set=' + encodeURIComponent(slug) + '&limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''))
    if (!body) break
    all = all.concat(body.data || [])
    cursor = body.pagination && body.pagination.nextCursor
    if (!cursor) break
    await sleep(420)
  }
  return all
}

const num = s => { const m = String(s || '').match(/\d+/); return m ? parseInt(m[0], 10) : null }
const budget = () => reqCount < MAX_REQ && (Date.now() - START) < MAX_MS

;(async () => {
  const JOB = 'kodo_map_cards_v1'
  let st = (await sql`SELECT * FROM kodo_sync_state WHERE job_id=${JOB}`)[0]
  if (!st) {
    const sets = await sql`SELECT kodo_set_id FROM kodo_set_map
      WHERE validated=true AND method <> 'excluded' AND method <> 'variant-of-parent'
        AND (us_slug IS NOT NULL OR eu_slug IS NOT NULL) ORDER BY kodo_set_id`
    const pending = sets.map(s => s.kodo_set_id)
    await sql`INSERT INTO kodo_sync_state (job_id, status, items_pending, items_total)
      VALUES (${JOB}, 'running', ${JSON.stringify(pending)}, ${pending.length})`
    st = { items_pending: pending, items_done: 0, items_total: pending.length, requests_used: 0 }
    console.log('Job initialise:', pending.length, 'sets')
  } else if (st.status === 'completed') {
    console.log('Job deja COMPLETED.'); return
  }

  let pending = st.items_pending
  let done = st.items_done
  let totalMapped = 0, totalMissing = 0

  while (pending.length && budget()) {
    const kodoSetId = pending[0]
    const map = (await sql`SELECT us_slug, eu_slug FROM kodo_set_map WHERE kodo_set_id=${kodoSetId}`)[0]
    const myCards = await sql`SELECT id, name FROM tcg_cards WHERE set_id = ${kodoSetId}`
    const byNum = {}
    for (const c of myCards) {
      const n = num(c.id.split('-').pop())
      if (n != null) byNum[n] = c
    }

    const refs = {}
    const ensure = n => refs[n] || (refs[n] = {})

    if (map.us_slug && budget()) {
      for (const c of await fetchSet(map.us_slug)) {
        const n = num(c.cardNumber)
        if (n == null || !byNum[n]) continue
        const slot = ensure(n)
        const holo = /holo/i.test(c.variant || '') && !/reverse/i.test(c.variant || '')
        if (/reverse|1st/i.test(c.variant || '')) continue
        slot[holo ? 'us_holo' : 'us'] = c.id
        if (!slot.tcgp && c.refs && c.refs.tcgplayerId) slot.tcgp = String(c.refs.tcgplayerId)
      }
    }
    if (map.eu_slug && budget()) {
      for (const c of await fetchSet(map.eu_slug)) {
        const n = num(c.cardNumber)
        if (n == null || !byNum[n]) continue
        const slot = ensure(n)
        const holo = /holo/i.test(c.variant || '') && !/reverse/i.test(c.variant || '')
        if (/reverse|1st/i.test(c.variant || '')) continue
        slot[holo ? 'eu_holo' : 'eu'] = c.id
        if (!slot.cm && c.refs && c.refs.cardmarketId) slot.cm = String(c.refs.cardmarketId)
      }
    }

    let mapped = 0
    for (const n of Object.keys(byNum)) {
      const s = refs[n]
      if (!s) continue
      mapped++
      const score = ['us','us_holo','eu','eu_holo'].filter(k => s[k]).length
      await sql`INSERT INTO source_refs (kodo_card_id, tcgplayer_id, poketrace_us_id, poketrace_us_holo_id,
          poketrace_eu_id, poketrace_eu_holo_id, cardmarket_id, mapped_at, map_method, map_confidence)
        VALUES (${byNum[n].id}, ${s.tcgp || null}, ${s.us || null}, ${s.us_holo || null},
          ${s.eu || null}, ${s.eu_holo || null}, ${s.cm || null}, now(), 'set+number', ${score / 4})
        ON CONFLICT (kodo_card_id) DO UPDATE SET
          tcgplayer_id = COALESCE(EXCLUDED.tcgplayer_id, source_refs.tcgplayer_id),
          poketrace_us_id = COALESCE(EXCLUDED.poketrace_us_id, source_refs.poketrace_us_id),
          poketrace_us_holo_id = COALESCE(EXCLUDED.poketrace_us_holo_id, source_refs.poketrace_us_holo_id),
          poketrace_eu_id = COALESCE(EXCLUDED.poketrace_eu_id, source_refs.poketrace_eu_id),
          poketrace_eu_holo_id = COALESCE(EXCLUDED.poketrace_eu_holo_id, source_refs.poketrace_eu_holo_id),
          cardmarket_id = COALESCE(EXCLUDED.cardmarket_id, source_refs.cardmarket_id),
          mapped_at = now(), map_confidence = EXCLUDED.map_confidence`
    }
    totalMapped += mapped
    totalMissing += myCards.length - mapped

    pending = pending.slice(1)
    done++
    await sql`UPDATE kodo_sync_state SET items_pending=${JSON.stringify(pending)}, items_done=${done},
      requests_used=requests_used + ${reqCount}, last_run_at=now(),
      status=${pending.length ? 'running' : 'completed'} WHERE job_id=${JOB}`
    console.log(kodoSetId, ':', mapped, '/', myCards.length, 'mappees | req total:', reqCount, '| sets restants:', pending.length)
  }

  console.log('\n=== FIN DE RUN ===')
  console.log('Sets traites ce run | mappees:', totalMapped, '| manquantes:', totalMissing, '| requetes:', reqCount)
  console.log(pending.length ? 'Job en pause — relancer pour continuer (' + pending.length + ' sets restants)' : 'JOB COMPLETED')
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
