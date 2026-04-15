import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const POKETRACE_KEY = process.env.POKETRACE_API_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BASE = 'https://api.poketrace.com/v1'
const CRON_SECRET = process.env.CRON_SECRET

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
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
  if (data) return { used: data.calls_used, max: data.max_calls }
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
      setInfo[p.set_slug] = { tier: p.tier, lastFetched: p.fetched_at }
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

  return NextResponse.json({
    success: true,
    callsUsed,
    callsRemaining: usage.max - usage.used - callsUsed,
    totalCards,
    setsProcessed,
    setsSkipped,
    errors: errors.length ? errors : undefined,
    nextRun: 'in 6 hours',
  })
}
