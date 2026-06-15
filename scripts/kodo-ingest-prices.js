require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
const KEY = process.env.POKETRACE_API_KEY
const BASE = 'https://api.poketrace.com/v1'
const sleep = ms => new Promise(r => setTimeout(r, ms))

const MAX_REQ = Number(process.env.KODO_MAX_REQ) || 6000
const MAX_MS = 18 * 60 * 1000
const START = Date.now()
let reqCount = 0
const budget = () => reqCount < MAX_REQ && (Date.now() - START) < MAX_MS

async function get(path) {
  reqCount++
  const r = await fetch(BASE + path, { headers: { 'X-API-Key': KEY } })
  if (r.status === 429) { await sleep(12000); reqCount--; return get(path) }
  if (r.status !== 200) return null
  return r.json()
}

async function ingestOne(kodoCardId, ptId) {
  const body = await get('/cards/' + ptId)
  await sleep(380)
  const card = body && body.data
  if (!card || !card.prices) return 0
  const market = card.market || 'US'
  const currency = card.currency || (market === 'EU' ? 'EUR' : 'USD')
  const variant = card.variant || null
  const asOf = card.lastUpdated || new Date().toISOString()
  const kcRow = await sql`SELECT print_id FROM k_cards WHERE id = ${kodoCardId}`
  const printId = kcRow[0] ? kcRow[0].print_id : null
  let rows = 0

  for (const [source, tiers] of Object.entries(card.prices)) {
    const isAsking = source === 'cardmarket_unsold'
    for (const [tier, d] of Object.entries(tiers || {})) {
      if (!d || typeof d !== 'object') continue
      await sql`INSERT INTO price_matrix (kodo_card_id, print_id, market, tier, source, variant,
          spot, low, high, avg7d, avg30d, median7d, median30d, sale_count, is_asking,
          currency, country_breakdown, as_of)
        VALUES (${kodoCardId}, ${printId}, ${market}, ${tier}, ${source}, ${variant},
          ${d.avg ?? null}, ${d.low ?? null}, ${d.high ?? null},
          ${d.avg7d ?? null}, ${d.avg30d ?? null}, ${d.median7d ?? null}, ${d.median30d ?? null},
          ${d.saleCount ?? null}, ${isAsking}, ${currency},
          ${d.country ? JSON.stringify(d.country) : null}, ${asOf})
        ON CONFLICT (kodo_card_id, market, tier, source, variant) DO UPDATE SET
          variant=EXCLUDED.variant, spot=EXCLUDED.spot, low=EXCLUDED.low, high=EXCLUDED.high,
          avg7d=EXCLUDED.avg7d, avg30d=EXCLUDED.avg30d, median7d=EXCLUDED.median7d,
          median30d=EXCLUDED.median30d, sale_count=EXCLUDED.sale_count,
          is_asking=EXCLUDED.is_asking, currency=EXCLUDED.currency,
          country_breakdown=EXCLUDED.country_breakdown, as_of=EXCLUDED.as_of,
          print_id=COALESCE(EXCLUDED.print_id, price_matrix.print_id)`
      rows++
    }
  }
  return rows
}

;(async () => {
  const JOB = 'kodo_ingest_prices_v1'
  let st = (await sql`SELECT * FROM kodo_sync_state WHERE job_id=${JOB}`)[0]
  if (!st) {
    console.log('Initialisation du job (ordre de priorite)...')
    const ordered = await sql`
      SELECT r.kodo_card_id FROM source_refs r
      JOIN tcg_cards c ON c.id = r.kodo_card_id
      JOIN kodo_set_map m ON m.kodo_set_id = c.set_id AND m.method NOT IN ('excluded','variant-of-parent')
      LEFT JOIN (SELECT DISTINCT set_id || '-' || card_number AS pid FROM portfolio_cards) p ON p.pid = r.kodo_card_id
      WHERE r.poketrace_us_id IS NOT NULL OR r.poketrace_us_holo_id IS NOT NULL
         OR r.poketrace_eu_id IS NOT NULL OR r.poketrace_eu_holo_id IS NOT NULL
      ORDER BY
        CASE WHEN p.pid IS NOT NULL THEN 0
             WHEN c.set_id ~ '^en-(base|gym|neo|ex|ecard|lc)' THEN 1
             ELSE 2 END,
        c.set_id`
    const pending = ordered.map(r => r.kodo_card_id)
    await sql`INSERT INTO kodo_sync_state (job_id, status, items_pending, items_total)
      VALUES (${JOB}, 'running', ${JSON.stringify(pending)}, ${pending.length})`
    st = { items_pending: pending, items_done: 0 }
    console.log('Job initialise:', pending.length, 'cartes')
  } else if (st.status === 'completed') {
    // MODE MAINTENANCE: job rempli 100% -> rafraichir les cartes au as_of le plus vieux
    console.log('Job COMPLETED -> mode MAINTENANCE (refresh des plus vieux prix)')
    const maintBudget = Number(process.env.KODO_MAINT_REQ) || Math.floor(MAX_REQ / 2)
    const oldestCards = await sql`
      SELECT kodo_card_id FROM (
        SELECT kodo_card_id, MAX(as_of) AS last_seen
        FROM price_matrix
        WHERE (kodo_card_id LIKE 'en-%' OR kodo_card_id LIKE 'jp-%' OR kodo_card_id LIKE 'ja-%')
        GROUP BY kodo_card_id
      ) t ORDER BY last_seen ASC LIMIT ${maintBudget}`
    let mPending = oldestCards.map(r => r.kodo_card_id)
    let mDone = 0, mRows = 0
    console.log('Maintenance: ' + mPending.length + ' cartes EN/JP a rafraichir (plus vieilles)')
    while (mPending.length && budget()) {
      const batch = mPending.slice(0, 50)
      const refs = await sql`SELECT kodo_card_id, poketrace_us_id, poketrace_us_holo_id,
        poketrace_eu_id, poketrace_eu_holo_id FROM source_refs WHERE kodo_card_id = ANY(${batch})`
      const byId = Object.fromEntries(refs.map(r => [r.kodo_card_id, r]))
      for (const cardId of batch) {
        if (!budget()) break
        mPending = mPending.filter(x => x !== cardId)
        const r = byId[cardId]
        if (!r) { mDone++; continue }
        const usId = r.poketrace_us_holo_id || r.poketrace_us_id
        const euId = r.poketrace_eu_holo_id || r.poketrace_eu_id
        if (usId) mRows += await ingestOne(cardId, usId)
        if (euId && budget()) mRows += await ingestOne(cardId, euId)
        mDone++
      }
    }
    await sql`UPDATE kodo_sync_state SET requests_used = requests_used + ${reqCount},
      last_run_at = now(), notes = ${'maintenance: ' + new Date().toISOString()}
      WHERE job_id = ${JOB}`
    console.log('=== FIN MAINTENANCE EN/JP === cartes:', mDone, '| rows:', mRows, '| req:', reqCount)
    return
  }

  let pending = st.items_pending
  let done = st.items_done
  let cardsThisRun = 0, rowsThisRun = 0

  while (pending.length && budget()) {
    const batch = pending.slice(0, 50)
    const refs = await sql`SELECT kodo_card_id, poketrace_us_id, poketrace_us_holo_id,
      poketrace_eu_id, poketrace_eu_holo_id FROM source_refs
      WHERE kodo_card_id = ANY(${batch})`
    const byId = Object.fromEntries(refs.map(r => [r.kodo_card_id, r]))

    for (const cardId of batch) {
      if (!budget()) break
      const r = byId[cardId]
      if (!r) { pending = pending.filter(x => x !== cardId); done++; continue }
      const usId = r.poketrace_us_holo_id || r.poketrace_us_id
      const euId = r.poketrace_eu_holo_id || r.poketrace_eu_id
      if (usId) rowsThisRun += await ingestOne(cardId, usId)
      if (euId && budget()) rowsThisRun += await ingestOne(cardId, euId)
      pending = pending.slice(pending.indexOf(cardId) === 0 ? 1 : 0)
      if (pending[0] !== cardId && pending.includes(cardId)) pending = pending.filter(x => x !== cardId)
      done++
      cardsThisRun++
    }

    await sql`UPDATE kodo_sync_state SET items_pending=${JSON.stringify(pending)}, items_done=${done},
      requests_used = requests_used + ${reqCount}, last_run_at=now(),
      status=${pending.length ? 'running' : 'completed'} WHERE job_id=${JOB}`
    console.log('Progression:', done, 'cartes | rows matrice ce run:', rowsThisRun, '| req:', reqCount, '| restantes:', pending.length)
  }

  console.log('\n=== FIN DE RUN ===')
  console.log('Cartes:', cardsThisRun, '| rows:', rowsThisRun, '| requetes:', reqCount)
  console.log(pending.length ? 'PAUSE — relancer pour continuer (' + pending.length + ' restantes)' : 'JOB COMPLETED')
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
