const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const API_KEY = 'pc_42e61ae9d66283627c08d1958f15c8778e0d1fa69dc14cef'
const sb = createClient(
  'https://jtheycxwbkweehfezyem.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0aGV5Y3h3Ymt3ZWVoZmV6eWVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgwNDE5MCwiZXhwIjoyMDkxMzgwMTkwfQ.LA3if2M8C_oMYxUh-tbjo7L7uisoqBys2lphAvivmbg'
)

const PROGRESS_FILE = path.join(__dirname, '.poketrace-progress.json')
const DAILY_LIMIT = 240
const DELAY_MS = 8000 // 8s between requests to avoid burst rate limit

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')) }
  catch { return { completedSets: [], dailyCalls: 0, lastResetDate: new Date().toDateString(), cursor: null, currentSet: null } }
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2))
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const r = await fetch(url, { headers: { 'X-API-Key': API_KEY } })
    if (r.status === 429) {
      const wait = 30 + i * 30 // 30s, 60s, 90s
      console.log(`  [429] Waiting ${wait}s...`)
      await new Promise(r => setTimeout(r, wait * 1000))
      continue
    }
    return r
  }
  return null
}

async function syncSet(setSlug, progress) {
  let cursor = progress.currentSet === setSlug ? progress.cursor : null
  let totalSaved = 0

  while (true) {
    if (progress.lastResetDate !== new Date().toDateString()) {
      progress.dailyCalls = 0
      progress.lastResetDate = new Date().toDateString()
      console.log('\n  [NEW DAY] Counter reset')
    }
    if (progress.dailyCalls >= DAILY_LIMIT) {
      progress.currentSet = setSlug
      progress.cursor = cursor
      saveProgress(progress)
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 5, 0, 0)
      const waitMs = tomorrow - now
      const waitH = Math.round(waitMs / 3600000 * 10) / 10
      console.log(`\n  DAILY LIMIT. Sleeping ${waitH}h until ${tomorrow.toLocaleString()}...`)
      await new Promise(r => setTimeout(r, waitMs))
      progress.dailyCalls = 0
      progress.lastResetDate = new Date().toDateString()
      console.log('  [RESUMED]')
    }

    let url = `https://api.poketrace.com/v1/cards?set=${setSlug}&limit=20`
    if (cursor) url += `&cursor=${cursor}`

    const r = await fetchWithRetry(url)
    progress.dailyCalls++

    if (!r || !r.ok) {
      console.log(' ERR:', r?.status || 'null')
      break
    }

    const d = await r.json()
    const cards = d.data || []
    if (cards.length === 0) break

    for (const card of cards) {
      const ebay = card.prices?.ebay?.NEAR_MINT
      const tcg = card.prices?.tcgplayer?.NEAR_MINT
      if (!ebay?.avg && !tcg?.avg) continue

      const topPrice = ebay?.avg && tcg?.avg
        ? Math.round((ebay.avg * 0.5 + tcg.avg * 0.5) * 100) / 100
        : ebay?.avg || tcg?.avg || null

      await sb.from('prices').upsert({
        card_name: card.name,
        card_number: card.cardNumber,
        set_slug: card.set?.slug || setSlug,
        set_name: card.set?.name || setSlug,
        poketrace_id: card.id,
        market: card.market || 'US',
        currency: card.currency || 'USD',
        ebay_avg: ebay?.avg || null, ebay_low: ebay?.low || null, ebay_high: ebay?.high || null,
        ebay_avg7d: ebay?.avg7d || null, ebay_avg30d: ebay?.avg30d || null, ebay_sales: ebay?.saleCount || null,
        tcg_avg: tcg?.avg || null, tcg_low: tcg?.low || null, tcg_high: tcg?.high || null,
        tcg_avg7d: tcg?.avg7d || null, tcg_avg30d: tcg?.avg30d || null, tcg_sales: tcg?.saleCount || null,
        top_price: topPrice, total_sales: card.totalSaleCount || null,
        has_graded: !!(card.prices?.ebay?.PSA_10 || card.prices?.ebay?.PSA_9),
        psa10_avg: card.prices?.ebay?.PSA_10?.avg || null,
        condition: 'NEAR_MINT',
        tier: (topPrice || 0) >= 20 ? 'hot' : (topPrice || 0) >= 1 ? 'warm' : 'cold',
        variant: card.variant || null,
        source: 'poketrace',
        fetched_at: new Date().toISOString(),
      }, { onConflict: 'poketrace_id,condition' })
      totalSaved++
    }

    cursor = d.pagination?.nextCursor || null
    process.stdout.write('.')

    if (!d.pagination?.hasMore || !cursor) break
    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  return totalSaved
}

async function run() {
  console.log('=== POKETRACE FULL SYNC ===')
  console.log('Daily limit:', DAILY_LIMIT, '| Delay:', DELAY_MS/1000 + 's')
  console.log('Started:', new Date().toLocaleString())

  const progress = loadProgress()
  console.log('Progress:', progress.completedSets.length, 'sets done,', progress.dailyCalls, 'calls today\n')

  const r = await fetchWithRetry('https://api.poketrace.com/v1/sets')
  progress.dailyCalls++
  if (!r || !r.ok) { console.log('Cannot fetch sets'); return }
  const sets = (await r.json()).data || []
  console.log('Total sets:', sets.length)

  const remaining = sets.filter(s => !progress.completedSets.includes(s.slug))
  console.log('Remaining:', remaining.length, '\n')

  await new Promise(r => setTimeout(r, DELAY_MS))

  for (let i = 0; i < remaining.length; i++) {
    const set = remaining[i]
    const start = Date.now()
    process.stdout.write(`[${i+1}/${remaining.length}] ${set.slug.substring(0,28).padEnd(28)} `)

    const saved = await syncSet(set.slug, progress)
    const elapsed = Math.round((Date.now() - start) / 1000)
    console.log(` ${saved} cards (${elapsed}s) [${progress.dailyCalls}/${DAILY_LIMIT}]`)

    progress.completedSets.push(set.slug)
    progress.currentSet = null
    progress.cursor = null
    saveProgress(progress)

    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  console.log('\n=== DONE ===')
  console.log('Finished:', new Date().toLocaleString())
}

run().catch(e => { console.error('FATAL:', e); process.exit(1) })
