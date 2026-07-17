require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
const { selectRefreshBatch, markAttempts, tierSummary } = require(process.cwd() + '/scripts/lib/kodo-refresh-tiers.js')
const KEY = process.env.POKETRACE_API_KEY
const BASE = 'https://api.poketrace.com/v1'
const sleep = ms => new Promise(r => setTimeout(r, ms))

const MAX_REQ = Number(process.env.KODO_MAX_REQ) || 6000
const MAX_MS = 22 * 60 * 1000  // le job coupe a 25 min (timeout-minutes)
const START = Date.now()
let reqCount = 0

// QUOTA EPUISE — arret propre.
// Avant : `if (429) { await sleep(12000); reqCount--; return get(path) }`
// = recursion SANS sortie ni re-verification du budget, et reqCount-- empeche
// le compteur de monter -> budget() reste vrai a jamais. Quota epuise =
// BOUCLE INFINIE de 12 s (constate le 17/07 : run bloque > 1 h). En prod :
// job GitHub zombie pendant 75 min, chaine FR/Consolidate decalee, zero log.
// Desormais : 429 isole = rate-limit court -> retry avec backoff (2 essais) ;
// 429 en rafale = quota journalier -> on arrete, insister ne sert a rien.
const MAX_429_STREAK = 8
let streak429 = 0
let quotaDead = false
const budget = () => !quotaDead && reqCount < MAX_REQ && (Date.now() - START) < MAX_MS

async function get(path, tries = 0) {
  if (!budget()) return null
  reqCount++
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 15000)
  let r
  try {
    r = await fetch(BASE + path, { headers: { 'X-API-Key': KEY }, signal: ctrl.signal })
  } catch (e) {
    clearTimeout(to)
    if (e.name === 'AbortError') { console.warn('timeout 15s:', path); return null }
    throw e
  }
  clearTimeout(to)
  if (r.status === 429) {
    reqCount--            // un refus ne consomme pas de quota
    streak429++
    if (streak429 >= MAX_429_STREAK) {
      quotaDead = true
      console.warn('[quota] ' + MAX_429_STREAK + ' x 429 d affilee -> quota PokeTrace epuise, arret propre du run')
      return null
    }
    if (tries >= 2) return null     // borne dure : jamais de recursion sans fin
    await sleep(4000 * (tries + 1)) // backoff 4s / 8s
    return get(path, tries + 1)
  }
  streak429 = 0
  if (r.status !== 200) return null
  return r.json()
}

/**
 * Precharge print_id + tcgShared pour un LOT de cartes (1 requete au lieu de 2
 * par carte). tcgShared : les variants (Shadowless/1st Ed) partagent le meme
 * tcgplayer_id, TCGplayer ne les distingue pas -> on ecarte ses sources pour
 * ces prints (eBay/Cardmarket, eux, distinguent).
 */
async function preloadMeta(cardIds) {
  if (!cardIds.length) return {}
  const rows = await sql`
    SELECT kc.id, kc.print_id,
           EXISTS (
             SELECT 1 FROM k_prints a
             JOIN k_prints b ON b.tcgplayer_id = a.tcgplayer_id AND b.id <> a.id
             WHERE a.id = kc.print_id AND a.tcgplayer_id IS NOT NULL
           ) AS tcg_shared
    FROM k_cards kc WHERE kc.id = ANY(${cardIds})`
  const out = {}
  for (const r of rows) out[r.id] = { printId: r.print_id, tcgShared: r.tcg_shared }
  return out
}

async function ingestOne(kodoCardId, ptId, meta) {
  const body = await get('/cards/' + ptId)
  await sleep(120)
  const card = body && body.data
  if (!card || !card.prices) return 0
  const market = card.market || 'US'
  const currency = card.currency || (market === 'EU' ? 'EUR' : 'USD')
  const variant = card.variant || null
  const asOf = card.lastUpdated || new Date().toISOString()

  // meta precharge par lot ; repli sur les SELECT unitaires si l'appelant n'en
  // fournit pas (le mode fill n'est pas touche).
  let printId = null, tcgShared = false
  if (meta) {
    printId = meta.printId
    tcgShared = meta.tcgShared
  } else {
    const kcRow = await sql`SELECT print_id FROM k_cards WHERE id = ${kodoCardId}`
    printId = kcRow[0] ? kcRow[0].print_id : null
    if (printId) {
      const sh = await sql`SELECT 1 FROM k_prints a JOIN k_prints b ON b.tcgplayer_id = a.tcgplayer_id AND b.id <> a.id WHERE a.id = ${printId} AND a.tcgplayer_id IS NOT NULL LIMIT 1`
      tcgShared = sh.length > 0
    }
  }

  // Collecte en memoire, puis UN SEUL INSERT GROUPE. Avant : ~16 INSERT par
  // carte, chacun un aller-retour HTTP vers Neon Frankfurt depuis un runner US
  // (~150 ms) = le vrai goulot (428 cartes en 22 min, 3,1 s/carte).
  const c = { id: [], print: [], mkt: [], tier: [], src: [], vari: [], spot: [], low: [], high: [],
              a7: [], a30: [], m7: [], m30: [], sc: [], ask: [], cur: [], cb: [], as_of: [] }
  for (const [source, tiers] of Object.entries(card.prices)) {
    if (tcgShared && (source === 'tcgplayer' || source === 'ppt_tcgplayer')) continue
    const isAsking = source === 'cardmarket_unsold'
    for (const [tier, d] of Object.entries(tiers || {})) {
      if (!d || typeof d !== 'object') continue
      c.id.push(kodoCardId); c.print.push(printId); c.mkt.push(market); c.tier.push(tier)
      c.src.push(source); c.vari.push(variant)
      c.spot.push(d.avg ?? null); c.low.push(d.low ?? null); c.high.push(d.high ?? null)
      c.a7.push(d.avg7d ?? null); c.a30.push(d.avg30d ?? null)
      c.m7.push(d.median7d ?? null); c.m30.push(d.median30d ?? null)
      c.sc.push(d.saleCount ?? null); c.ask.push(isAsking); c.cur.push(currency)
      c.cb.push(d.country ? JSON.stringify(d.country) : null); c.as_of.push(asOf)
    }
  }
  if (!c.id.length) return 0

  await sql.query(
    `INSERT INTO price_matrix (kodo_card_id, print_id, market, tier, source, variant,
       spot, low, high, avg7d, avg30d, median7d, median30d, sale_count, is_asking,
       currency, country_breakdown, as_of)
     SELECT * FROM unnest(
       $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
       $7::numeric[], $8::numeric[], $9::numeric[], $10::numeric[], $11::numeric[],
       $12::numeric[], $13::numeric[], $14::int[], $15::boolean[], $16::text[],
       $17::jsonb[], $18::timestamptz[])
     ON CONFLICT (kodo_card_id, market, tier, source, variant) DO UPDATE SET
       variant=EXCLUDED.variant, spot=EXCLUDED.spot, low=EXCLUDED.low, high=EXCLUDED.high,
       avg7d=EXCLUDED.avg7d, avg30d=EXCLUDED.avg30d, median7d=EXCLUDED.median7d,
       median30d=EXCLUDED.median30d, sale_count=EXCLUDED.sale_count,
       is_asking=EXCLUDED.is_asking, currency=EXCLUDED.currency,
       country_breakdown=EXCLUDED.country_breakdown, as_of=EXCLUDED.as_of,
       print_id=COALESCE(EXCLUDED.print_id, price_matrix.print_id)`,
    [c.id, c.print, c.mkt, c.tier, c.src, c.vari, c.spot, c.low, c.high,
     c.a7, c.a30, c.m7, c.m30, c.sc, c.ask, c.cur, c.cb, c.as_of],
  )
  return c.id.length
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
    // Selection PRIORISEE (module partage Kodo Engine) : univers = cartes
    // reellement interrogeables, tiers (detenues/wishlist/>=20 EUR d'abord,
    // communes 1x/an), rotation sur la TENTATIVE et non sur le succes.
    // Avant : selection sur price_matrix -> 1499/1500 cartes sans source_ref,
    // aucun appel emis, 1 seule carte rafraichie par nuit.
    const selection = await selectRefreshBatch(sql, {
      prefixes: ['en-%', 'jp-%', 'ja-%'],
      budget: maintBudget,
      idScope: 'any',
      // Passes multiples dans la meme nuit : chacune attaque la suite de la
      // file au lieu de refaire le T1 (cf. kodo-refresh-tiers.js).
      minAgeHours: Number(process.env.KODO_MIN_AGE_H) || 20,
    })
    let mPending = selection.map(r => r.kodo_card_id)
    let mDone = 0, mRows = 0
    console.log('Maintenance EN/JP:', mPending.length, 'cartes |', tierSummary(selection))
    while (mPending.length && budget()) {
      const batch = mPending.slice(0, 50)
      const refs = await sql`SELECT kodo_card_id, poketrace_us_id, poketrace_us_holo_id,
        poketrace_eu_id, poketrace_eu_holo_id FROM source_refs WHERE kodo_card_id = ANY(${batch})`
      const byId = Object.fromEntries(refs.map(r => [r.kodo_card_id, r]))
      const metaById = await preloadMeta(batch)
      const attempts = []
      for (const cardId of batch) {
        if (!budget()) break
        mPending = mPending.filter(x => x !== cardId)
        const r = byId[cardId]
        if (!r) { mDone++; continue }
        const usId = r.poketrace_us_holo_id || r.poketrace_us_id
        const euId = r.poketrace_eu_holo_id || r.poketrace_eu_id
        let got = 0
        const meta = metaById[cardId]
        if (usId) got += await ingestOne(cardId, usId, meta)
        // Appel EU CONDITIONNEL : uniquement si le marche US n'a rien donne.
        // Avant, chaque carte consommait 2 requetes systematiquement ; 14 374
        // cartes ont une donnee US et s'arretent donc au 1er appel (~35% de
        // requetes economisees, ce qui fait tenir le Tier 1 dans le run).
        if (got === 0 && euId && budget()) got += await ingestOne(cardId, euId, meta)
        mRows += got
        attempts.push({ id: cardId, ok: got > 0 })
        mDone++
      }
      // Journal : la rotation suit la tentative -> aucune carte muette ne peut
      // squatter la file indefiniment.
      if (attempts.length) await markAttempts(sql, attempts)
    }
    await sql`UPDATE kodo_sync_state SET requests_used = requests_used + ${reqCount},
      last_run_at = now(), notes = ${'maintenance: ' + new Date().toISOString()}
      WHERE job_id = ${JOB}`
    console.log('=== FIN MAINTENANCE EN/JP === cartes:', mDone, '| rows:', mRows, '| req:', reqCount,
      quotaDead ? '| ARRET: QUOTA EPUISE' : '')
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
