// Kodo Engine — ingestion multilingue EU (FR, puis DE/ES/IT...) par cardmarketId direct.
// Ne depend PAS de kodo_set_map: le cardmarketId est universel chez Cardmarket.
// Usage: node scripts/kodo-ingest-eu-lang.js fr   (ou de, es, it...)
require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
const { selectRefreshBatch, markAttempts, tierSummary } = require(process.cwd() + '/scripts/lib/kodo-refresh-tiers.js')
const KEY = process.env.POKETRACE_API_KEY
const BASE = 'https://api.poketrace.com/v1'

const LANG = (process.argv[2] || 'fr').toLowerCase()
const JOB = 'kodo_ingest_eu_' + LANG
const START = Date.now()
const MAX_MS = 22 * 60 * 1000  // le job coupe a 25 min (timeout-minutes)
const MAX_REQ = Number(process.env.KODO_MAX_REQ) || 5500
let reqCount = 0
const budget = () => reqCount < MAX_REQ && (Date.now() - START) < MAX_MS

const sleep = ms => new Promise(r => setTimeout(r, ms))
async function get(p, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    reqCount++
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    try {
      const r = await fetch(BASE + p, { headers: { 'X-API-Key': KEY }, signal: ctrl.signal })
      clearTimeout(timer)
      if (r.status === 429) { await sleep(12000); i--; continue }
      if (r.status === 200) return r.json()
    } catch (e) {
      clearTimeout(timer)
    }
    await sleep(i * 1500)
  }
  return null
}

async function ingestOne(kodoCardId, printId, ptId) {
  const body = await get('/cards/' + ptId)
  const card = body && body.data
  if (!card || !card.prices) return 0
  const asOf = card.lastUpdated || new Date().toISOString()
  const variant = /holo/i.test(card.variant || '') ? 'Holofoil' : 'Normal'

  // Collecte en memoire, puis UN SEUL INSERT GROUPE. Avant : ~5 INSERT par carte
  // (6616 lignes / 1273 cartes), chacun un aller-retour HTTP vers Neon Frankfurt
  // depuis un runner US -> 1,04 s/carte, run coupe a 22 min sur 1273 cartes
  // (57% du Tier 1 seulement). Le FR n'a aucun sleep : sa lenteur etait 100% de
  // la latence base.
  const c = { id: [], print: [], tier: [], src: [], vari: [], spot: [], low: [], high: [],
              a7: [], a30: [], m7: [], m30: [], sc: [], ask: [], cur: [], cb: [], as_of: [] }

  for (const [source, tiers] of Object.entries(card.prices)) {
    const isAsking = source === 'cardmarket_unsold'
    for (const [tier, d] of Object.entries(tiers || {})) {
      if (!d || typeof d !== 'object') continue
      // Garde-fou : rejeter les asks grades aberrants (prix de blocage Cardmarket
      // type 1M EUR/62500 EUR). Les vrais prix grades eventuellement >20k EUR
      // viennent de ebay_fr (pipeline propre), jamais de cardmarket_unsold.
      if (isAsking && /^(PSA|CGC|BGS|SGC|CCC|PCA|ACE|TAG|CCA|AOG|GSG|PGS)_/.test(tier) && Number(d.avg) > 20000) continue
      c.id.push(kodoCardId); c.print.push(printId); c.tier.push(tier)
      c.src.push(source); c.vari.push(variant)
      c.spot.push(d.avg ?? null); c.low.push(d.low ?? null); c.high.push(d.high ?? null)
      c.a7.push(d.avg7d ?? null); c.a30.push(d.avg30d ?? null)
      c.m7.push(d.median7d ?? null); c.m30.push(d.median30d ?? null)
      c.sc.push(d.saleCount ?? null); c.ask.push(isAsking); c.cur.push(d.currency || 'EUR')
      c.cb.push(d.country ? JSON.stringify(d.country) : null); c.as_of.push(asOf)
    }
  }
  if (!c.id.length) return 0

  await sql.query(
    `INSERT INTO price_matrix (kodo_card_id, print_id, market, tier, source, variant,
       spot, low, high, avg7d, avg30d, median7d, median30d, sale_count, is_asking,
       currency, country_breakdown, as_of)
     SELECT x.id, x.print, 'EU', x.tier, x.src, x.vari, x.spot, x.low, x.high,
            x.a7, x.a30, x.m7, x.m30, x.sc, x.ask, x.cur, x.cb, x.as_of
     FROM unnest(
       $1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
       $6::numeric[], $7::numeric[], $8::numeric[], $9::numeric[], $10::numeric[],
       $11::numeric[], $12::numeric[], $13::int[], $14::boolean[], $15::text[],
       $16::jsonb[], $17::timestamptz[])
       AS x(id, print, tier, src, vari, spot, low, high, a7, a30, m7, m30, sc, ask, cur, cb, as_of)
     ON CONFLICT (kodo_card_id, market, tier, source, variant) DO UPDATE SET
       spot=EXCLUDED.spot, low=EXCLUDED.low, high=EXCLUDED.high,
       avg7d=EXCLUDED.avg7d, avg30d=EXCLUDED.avg30d, median7d=EXCLUDED.median7d,
       median30d=EXCLUDED.median30d, sale_count=EXCLUDED.sale_count,
       is_asking=EXCLUDED.is_asking, currency=EXCLUDED.currency,
       country_breakdown=EXCLUDED.country_breakdown, as_of=EXCLUDED.as_of,
       print_id=COALESCE(EXCLUDED.print_id, price_matrix.print_id)`,
    [c.id, c.print, c.tier, c.src, c.vari, c.spot, c.low, c.high,
     c.a7, c.a30, c.m7, c.m30, c.sc, c.ask, c.cur, c.cb, c.as_of],
  )
  return c.id.length
}

;(async () => {
  let st = (await sql`SELECT * FROM kodo_sync_state WHERE job_id=${JOB}`)[0]
  if (!st) {
    console.log('Init job', JOB, '...')
    const ordered = await sql`
      SELECT r.kodo_card_id, kc.print_id,
        COALESCE(r.poketrace_eu_holo_id, r.poketrace_eu_id) AS eu_id
      FROM source_refs r
      JOIN k_cards kc ON kc.id = r.kodo_card_id
      LEFT JOIN (SELECT DISTINCT set_id || '-' || card_number AS pid FROM portfolio_cards) p ON p.pid = r.kodo_card_id
      WHERE r.kodo_card_id LIKE ${LANG + '-%'}
        AND (r.poketrace_eu_id IS NOT NULL OR r.poketrace_eu_holo_id IS NOT NULL)
      ORDER BY CASE WHEN p.pid IS NOT NULL THEN 0 ELSE 1 END, r.kodo_card_id`
    const pending = ordered.map(r => ({ id: r.kodo_card_id, print: r.print_id, eu: r.eu_id }))
    await sql`INSERT INTO kodo_sync_state (job_id, status, items_pending, items_total)
      VALUES (${JOB}, 'running', ${JSON.stringify(pending)}, ${pending.length})`
    st = { items_pending: pending, items_done: 0 }
    console.log('Job initialise:', pending.length, 'cartes', LANG.toUpperCase())
  } else if (st.status === 'completed') {
    // MODE MAINTENANCE: job FR rempli -> rafraichir les cartes au as_of le plus vieux
    console.log('Job', JOB, 'COMPLETED -> mode MAINTENANCE (refresh FR plus vieux)')
    const maintBudget = Number(process.env.KODO_MAINT_REQ) || Math.floor(MAX_REQ / 2)
    // Selection PRIORISEE (module partage Kodo Engine) : memes tiers que EN/JP.
    // T1 = detenues + wishlist + >=20 EUR ; T2 = rotation ; T3 = communes 1x/an.
    // Rotation sur la TENTATIVE (kodo_refresh_state), pas sur le succes.
    const selection = await selectRefreshBatch(sql, {
      prefixes: [LANG + '-%'],
      budget: maintBudget,
      idScope: 'eu',
    })
    const selIds = selection.map(r => r.kodo_card_id)
    const refRows = await sql`
      SELECT r.kodo_card_id, kc.print_id,
             COALESCE(r.poketrace_eu_holo_id, r.poketrace_eu_id) AS eu_id
      FROM source_refs r
      JOIN k_cards kc ON kc.id = r.kodo_card_id
      WHERE r.kodo_card_id = ANY(${selIds})`
    const refById = Object.fromEntries(refRows.map(r => [r.kodo_card_id, r]))
    // On repasse par selIds : l'ordre du module EST la priorite.
    let mPending = selIds
      .map(id => refById[id])
      .filter(Boolean)
      .map(r => ({ id: r.kodo_card_id, print: r.print_id, eu: r.eu_id }))
    let mDone = 0, mRows = 0
    console.log('Maintenance ' + LANG.toUpperCase() + ':', mPending.length, 'cartes |', tierSummary(selection))
    let attempts = []
    while (mPending.length && budget()) {
      const item = mPending[0]
      let got = 0
      if (item.eu) got = await ingestOne(item.id, item.print, item.eu)
      mRows += got
      attempts.push({ id: item.id, ok: got > 0 })
      mPending = mPending.slice(1)
      mDone++
      if (attempts.length >= 50) { await markAttempts(sql, attempts); attempts = [] }
    }
    if (attempts.length) await markAttempts(sql, attempts)
    await sql`UPDATE kodo_sync_state SET last_run_at = now(),
      notes = ${'maintenance ' + LANG + ': ' + new Date().toISOString()} WHERE job_id = ${JOB}`
    console.log('=== FIN MAINTENANCE ' + LANG.toUpperCase() + ' === cartes:', mDone, '| rows:', mRows, '| req:', reqCount)
    return
  }
  let pending = st.items_pending
  let done = st.items_done
  let rowsThisRun = 0, cardsThisRun = 0, req = 0
  while (pending.length && budget()) {
    const item = pending[0]
    if (item.eu) { rowsThisRun += await ingestOne(item.id, item.print, item.eu); req++ }
    pending = pending.slice(1)
    done++; cardsThisRun++
    if (cardsThisRun % 50 === 0) {
      await sql`UPDATE kodo_sync_state SET items_pending=${JSON.stringify(pending)}, items_done=${done} WHERE job_id=${JOB}`
      console.log('Progression ' + LANG.toUpperCase() + ': ' + done + ' | rows: ' + rowsThisRun + ' | req: ' + req + ' | restantes: ' + pending.length)
    }
  }
  const status = pending.length === 0 ? 'completed' : 'running'
  await sql`UPDATE kodo_sync_state SET items_pending=${JSON.stringify(pending)}, items_done=${done}, status=${status}, last_run_at=now() WHERE job_id=${JOB}`
  console.log('\n=== FIN DE RUN ' + LANG.toUpperCase() + ' ===')
  console.log('Cartes:', cardsThisRun, '| rows:', rowsThisRun, '| status:', status)
  if (status === 'running') console.log('PAUSE — relancer pour continuer (' + pending.length + ' restantes)')
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
