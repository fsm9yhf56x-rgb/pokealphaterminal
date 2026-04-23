import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const POKETRACE_KEY = process.env.POKETRACE_API_KEY!
const BASE = 'https://api.poketrace.com/v1'
const CRON_SECRET = process.env.CRON_SECRET

const supabase = getAdminClient()
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function ptFetch(path: string) {
  const r = await fetch(`${BASE}${path}`, {
    headers: { 'X-API-Key': POKETRACE_KEY },
  })
  if (r.status === 429) {
    await sleep(10000)
    return fetch(`${BASE}${path}`, { headers: { 'X-API-Key': POKETRACE_KEY } })
  }
  return r
}

// ── Usage tracking ──
async function getUsage(): Promise<{ used: number; max: number }> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase.from('api_usage').select('*').eq('date', today).single()
  if (data) return { used: data.calls_used ?? 0, max: data.max_calls ?? 250 }
  await supabase.from('api_usage').insert({ date: today, calls_used: 0, max_calls: 250 })
  return { used: 0, max: 250 }
}

async function incUsage(count: number) {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase.from('api_usage').select('calls_used').eq('date', today).single()
  await supabase.from('api_usage').update({ calls_used: (data?.calls_used || 0) + count }).eq('date', today)
}

// ── Tier logic ──
function getTier(topPrice: number | null): string {
  const p = topPrice || 0
  if (p >= 20) return 'hot'
  if (p >= 1) return 'warm'
  return 'cold'
}

function shouldSync(tier: string, lastFetched: string | null): boolean {
  if (!lastFetched) return true // never fetched
  const age = Date.now() - new Date(lastFetched).getTime()
  const hours = age / (1000 * 60 * 60)
  if (tier === 'hot') return hours >= 6    // every 6h
  if (tier === 'warm') return hours >= 168 // every 7 days
  return false                              // cold = never
}

// ── eBay complement ──
const EBAY_APP_ID = process.env.EBAY_APP_ID || ''
const EBAY_CERT_ID = process.env.EBAY_CERT_ID || ''

async function getEbayToken(): Promise<string | null> {
  if (!EBAY_APP_ID || !EBAY_CERT_ID) return null
  try {
    const auth = Buffer.from(EBAY_APP_ID + ':' + EBAY_CERT_ID).toString('base64')
    const r = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Basic ' + auth },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
    })
    const d = await r.json()
    return d.access_token || null
  } catch { return null }
}

async function ebayFillGaps(budget: number): Promise<{ calls: number; filled: number }> {
  const token = await getEbayToken()
  if (!token) return { calls: 0, filled: 0 }

  // Find cards with missing prices or 1st Edition with suspicious low prices
  const { data: gaps } = await supabase.from('prices')
    .select('card_name, card_number, set_slug, variant, top_price')
    .or('top_price.is.null,top_price.lt.1')
    .eq('condition', 'NEAR_MINT')
    .limit(budget * 2)

  // Also find 1st Edition cards priced lower than their Shadowless counterpart
  const { data: firstEds } = await supabase.from('prices')
    .select('card_name, card_number, set_slug, variant, top_price')
    .eq('variant', '1st_Edition_Holofoil')
    .not('top_price', 'is', null)
    .order('top_price', { ascending: false })
    .limit(20)

  const cardsToFill: { name: string; number: string; setSlug: string; edition: string }[] = []

  // Add null-price cards
  for (const g of (gaps || [])) {
    if (cardsToFill.length >= budget) break
    const edition = g.variant?.includes('1st') ? '1st' : g.variant?.includes('Unlimited') ? 'shadowless' : ''
    cardsToFill.push({ name: g.card_name, number: g.card_number?.split('/')[0] || '', setSlug: g.set_slug, edition })
  }

  // Add 1st Edition cards that might need eBay validation
  for (const fe of (firstEds || [])) {
    if (cardsToFill.length >= budget) break
    if (cardsToFill.find(c => c.name === fe.card_name && c.edition === '1st')) continue
    // Check if there's a Shadowless version priced higher
    const { data: shadowless } = await supabase.from('prices')
      .select('top_price')
      .eq('card_name', fe.card_name)
      .eq('set_slug', fe.set_slug)
      .eq('variant', 'Unlimited_Holofoil')
      .limit(1)
    const shadowPrice = shadowless?.[0]?.top_price || 0
    if (fe.top_price && fe.top_price < shadowPrice) {
      cardsToFill.push({ name: fe.card_name, number: fe.card_number?.split('/')[0] || '', setSlug: fe.set_slug, edition: '1st' })
    }
  }

  let calls = 0, filled = 0
  const setNameMap: Record<string, string> = { 'base-set': 'Base Set', 'base-set-shadowless': 'Base Set' }

  for (const card of cardsToFill) {
    if (calls >= budget) break
    const setName = setNameMap[card.setSlug] || card.setSlug.replace(/-/g, ' ')
    let q = card.name
    if (card.number) q += ' ' + card.number + '/102'
    q += ' ' + setName
    if (card.edition === '1st') q += ' 1st edition'
    if (card.edition === 'shadowless') q += ' shadowless'
    q += ' holo -custom -proxy -reprint -style -fan -art -sticker -lot -bundle'
    const minPrice = card.edition === '1st' ? 100 : card.edition === 'shadowless' ? 20 : 5

    try {
      const url = 'https://api.ebay.com/buy/browse/v1/item_summary/search?q=' + encodeURIComponent(q) + '&category_ids=183454&filter=price:[' + minPrice + '..],conditionIds:{1000|1500|2000|2500|3000}&limit=20&sort=price'
      const r = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + token, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' }
      })
      calls++
      const d = await r.json()
      const items = d.itemSummaries || []
      const prices = items.map((i: any) => parseFloat(i.price?.value || '0')).filter((p: number) => p >= minPrice && p < 500000).sort((a: number, b: number) => a - b)

      if (prices.length > 0) {
        const trimLow = Math.max(1, Math.floor(prices.length * 0.1))
        const trimHigh = Math.max(1, Math.floor(prices.length * 0.2))
        const trimmed = prices.length > 5 ? prices.slice(trimLow, -trimHigh) : prices
        const avg = Math.round((trimmed.reduce((s: number, p: number) => s + p, 0) / trimmed.length) * 100) / 100

        await supabase.from('prices').upsert({
          card_name: card.name,
          card_number: card.number ? card.number.padStart(3, '0') + '/102' : null,
          set_slug: card.setSlug,
          set_name: setName,
          poketrace_id: 'ebay-' + card.setSlug + '-' + (card.edition || 'std') + '-' + (card.number || card.name.toLowerCase().replace(/[^a-z0-9]/g, '')),
          market: 'US', currency: 'USD',
          ebay_avg: avg, ebay_low: trimmed[0], ebay_high: trimmed[trimmed.length - 1],
          ebay_sales: prices.length, top_price: avg,
          condition: 'NEAR_MINT',
          tier: avg >= 20 ? 'hot' : avg >= 1 ? 'warm' : 'cold',
          variant: card.edition === '1st' ? '1st_Edition_Holofoil' : card.edition === 'shadowless' ? 'Unlimited_Holofoil' : null,
          source: 'ebay',
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'poketrace_id,condition' })
        filled++
      }
      await sleep(500)
    } catch {}
  }
  return { calls, filled }
}

export async function GET(request: Request) {
  // Verify cron secret (Vercel sends this)
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const usage = await getUsage()
  const budget = Math.min(80, usage.max - usage.used) // max 80 req per cron run
  if (budget <= 0) {
    return NextResponse.json({ error: 'Daily limit reached', used: usage.used }, { status: 429 })
  }

  // ── Load set mapping ──
  let setMapping: Record<string, string> = {}
  try {
    const fs = require('fs')
    const path = require('path')
    setMapping = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/data/set-mapping-poketrace.json'), 'utf8'))
  } catch {}

  // ── Get ALL portfolio sets across ALL users ──
  const { data: allCards } = await supabase.from('portfolio_cards').select('set_id')
  const rawSets = [...new Set((allCards || []).map((c: any) => c.set_id).filter(Boolean))]
  const cleanSet = (s: string) => s.replace(/-shadowless(-ns)?|-1st/g, '')
  
  // Resolve: exact match first, then cleaned
  const setsToSync: string[] = []
  const seen = new Set<string>()
  for (const raw of rawSets) {
    const slug = setMapping[raw] || setMapping[cleanSet(raw)]
    if (slug && !seen.has(slug)) {
      seen.add(slug)
      setsToSync.push(raw)
    }
  }

  // ── Check which sets need sync based on tier ──
  const { data: existingPrices } = await supabase
    .from('prices')
    .select('set_slug, tier, fetched_at')
    .order('fetched_at', { ascending: false })

  // Group by set_slug: get oldest fetch + dominant tier
  const setInfo: Record<string, { tier: string; lastFetched: string | null }> = {}
  for (const p of (existingPrices || [])) {
    if (!setInfo[p.set_slug]) {
      setInfo[p.set_slug] = { tier: p.tier ?? 'cold', lastFetched: p.fetched_at }
    }
  }

  let callsUsed = 0
  let totalCards = 0
  let setsProcessed = 0
  let setsSkipped = 0
  const errors: string[] = []

  for (const setId of setsToSync) {
    if (callsUsed >= budget) break

    const ptSlug = setMapping[setId] || setMapping[cleanSet(setId)]
    if (!ptSlug) continue

    const info = setInfo[ptSlug]
    const tier = info?.tier || 'hot' // new sets = hot priority
    
    if (!shouldSync(tier, info?.lastFetched || null)) {
      setsSkipped++
      continue
    }

    try {
      let cursor: string | undefined = undefined
      let hasMore = true

      while (hasMore && callsUsed < budget) {
        const url = cursor 
          ? `/cards?set=${ptSlug}&limit=20&cursor=${cursor}`
          : `/cards?set=${ptSlug}&limit=20`
        
        const r = await ptFetch(url)
        callsUsed++

        if (!r.ok) { errors.push(`${ptSlug}: ${r.status}`); break }
        const data = await r.json()
        const cards = data.data || []

        for (const card of cards) {
          const ebay = card.prices?.ebay?.NEAR_MINT
          const tcg = card.prices?.tcgplayer?.NEAR_MINT
          const psa10 = card.prices?.ebay?.PSA_10
          const topPrice = card.topPrice || ebay?.avg || tcg?.avg || null

          await supabase.from('prices').upsert({
            card_name: card.name,
            card_number: card.cardNumber,
            set_slug: ptSlug,
            set_name: card.set?.name,
            poketrace_id: card.id,
            variant: card.variant || null,
            market: card.market || 'US',
            currency: card.currency || 'USD',
            ebay_avg: ebay?.avg || null,
            ebay_low: ebay?.low || null,
            ebay_high: ebay?.high || null,
            ebay_avg7d: ebay?.avg7d || null,
            ebay_avg30d: ebay?.avg30d || null,
            ebay_sales: ebay?.saleCount || null,
            tcg_avg: tcg?.avg || null,
            tcg_low: tcg?.low || null,
            tcg_high: tcg?.high || null,
            tcg_avg7d: tcg?.avg7d || null,
            tcg_avg30d: tcg?.avg30d || null,
            tcg_sales: tcg?.saleCount || null,
            top_price: topPrice,
            total_sales: card.totalSaleCount || null,
            condition: 'NEAR_MINT',
            tier: getTier(topPrice),
            has_graded: card.hasGraded || false,
            psa10_avg: psa10?.avg || null,
            fetched_at: new Date().toISOString(),
            source: 'poketrace',
          }, { onConflict: 'poketrace_id,condition' })
          totalCards++
        }

        cursor = data.pagination?.nextCursor
        hasMore = data.pagination?.hasMore || false
        if (hasMore) await sleep(3000)
      }

      setsProcessed++
      await sleep(5000) // pause between sets
    } catch (e: any) {
      errors.push(`${ptSlug}: ${e.message}`)
    }
  }

  await incUsage(callsUsed)

  // ── Phase 2: eBay complement for gaps ──
  const ebayBudget = Math.min(10, usage.max - usage.used - callsUsed)
  let ebayResult = { calls: 0, filled: 0 }
  if (ebayBudget > 0) {
    ebayResult = await ebayFillGaps(ebayBudget)
  }

  return NextResponse.json({
    success: true,
    callsUsed,
    callsRemaining: usage.max - usage.used - callsUsed,
    totalCards,
    setsProcessed,
    setsSkipped,
    errors: errors.length ? errors : undefined,
    ebay: ebayResult,
    nextRun: 'in 6 hours',
  })
}
