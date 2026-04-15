import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const POKETRACE_KEY = process.env.POKETRACE_API_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BASE = 'https://api.poketrace.com/v1'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function ptFetch(path: string) {
  const r = await fetch(`${BASE}${path}`, { headers: { 'X-API-Key': POKETRACE_KEY } })
  if (r.status === 429) { await sleep(10000); return fetch(`${BASE}${path}`, { headers: { 'X-API-Key': POKETRACE_KEY } }) }
  return r
}

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

function getTier(topPrice: number | null): string {
  const p = topPrice || 0
  if (p >= 20) return 'hot'
  if (p >= 1) return 'warm'
  return 'cold'
}

export async function POST(request: Request) {
  const { sets = [] } = await request.json().catch(() => ({}))
  if (!sets.length) return NextResponse.json({ skipped: true, reason: 'no sets' })

  // Load set mapping
  let setMapping: Record<string, string> = {}
  try {
    const fs = require('fs')
    const path = require('path')
    setMapping = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/data/set-mapping-poketrace.json'), 'utf8'))
  } catch {}

  // Resolve setIds to PokeTrace slugs
  const cleanSet = (s: string) => s.replace(/-shadowless(-ns)?|-1st/g, '')
  const slugs: { setId: string; slug: string }[] = []
  const seen = new Set<string>()
  for (const sid of sets) {
    const slug = setMapping[sid] || setMapping[cleanSet(sid)]
    if (slug && !seen.has(slug)) { seen.add(slug); slugs.push({ setId: sid, slug }) }
  }

  if (!slugs.length) return NextResponse.json({ skipped: true, reason: 'no mapped sets' })

  // Check which sets have stale Hot prices (>6h)
  const stale: typeof slugs = []
  for (const s of slugs) {
    const { data: latest } = await supabase
      .from('prices')
      .select('fetched_at, tier')
      .eq('set_slug', s.slug)
      .eq('tier', 'hot')
      .order('fetched_at', { ascending: false })
      .limit(1)

    if (!latest || latest.length === 0) {
      stale.push(s) // never fetched
    } else {
      const age = Date.now() - new Date(latest[0].fetched_at).getTime()
      if (age > 6 * 60 * 60 * 1000) stale.push(s) // >6h old
    }
  }

  if (!stale.length) return NextResponse.json({ skipped: true, reason: 'all prices fresh' })

  // Budget check
  const usage = await getUsage()
  const budget = Math.min(20, usage.max - usage.used) // max 20 req per user refresh
  if (budget <= 0) return NextResponse.json({ skipped: true, reason: 'daily limit reached' })

  let callsUsed = 0
  let totalCards = 0

  for (const s of stale) {
    if (callsUsed >= budget) break

    let cursor: string | undefined
    let hasMore = true

    while (hasMore && callsUsed < budget) {
      const url = cursor
        ? `/cards?set=${s.slug}&limit=20&cursor=${cursor}`
        : `/cards?set=${s.slug}&limit=20`

      const r = await ptFetch(url)
      callsUsed++
      if (!r.ok) break

      const data = await r.json()
      for (const card of (data.data || [])) {
        const ebay = card.prices?.ebay?.NEAR_MINT
        const tcg = card.prices?.tcgplayer?.NEAR_MINT
        const psa10 = card.prices?.ebay?.PSA_10
        const topPrice = card.topPrice || ebay?.avg || tcg?.avg || null

        await supabase.from('prices').upsert({
          card_name: card.name, card_number: card.cardNumber,
          set_slug: s.slug, set_name: card.set?.name, poketrace_id: card.id,
          variant: card.variant || null,
          market: card.market || 'US', currency: card.currency || 'USD',
          ebay_avg: ebay?.avg || null, ebay_low: ebay?.low || null, ebay_high: ebay?.high || null,
          ebay_avg7d: ebay?.avg7d || null, ebay_avg30d: ebay?.avg30d || null, ebay_sales: ebay?.saleCount || null,
          tcg_avg: tcg?.avg || null, tcg_low: tcg?.low || null, tcg_high: tcg?.high || null,
          tcg_avg7d: tcg?.avg7d || null, tcg_avg30d: tcg?.avg30d || null, tcg_sales: tcg?.saleCount || null,
          top_price: topPrice, total_sales: card.totalSaleCount || null,
          condition: 'NEAR_MINT', tier: getTier(topPrice),
          has_graded: card.hasGraded || false, psa10_avg: psa10?.avg || null,
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'poketrace_id,condition' })
        totalCards++
      }

      cursor = data.pagination?.nextCursor
      hasMore = data.pagination?.hasMore || false
      if (hasMore) await sleep(3000)
    }
    await sleep(3000)
  }

  await incUsage(callsUsed)

  return NextResponse.json({
    refreshed: true,
    setsRefreshed: stale.length,
    callsUsed,
    totalCards,
    callsRemaining: usage.max - usage.used - callsUsed,
  })
}
