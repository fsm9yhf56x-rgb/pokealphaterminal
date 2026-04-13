import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const POKETRACE_KEY = process.env.POKETRACE_API_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BASE = 'https://api.poketrace.com/v1'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function ptFetch(path: string) {
  const r = await fetch(`${BASE}${path}`, {
    headers: { 'X-API-Key': POKETRACE_KEY },
  })
  if (r.status === 429) {
    await sleep(10000)
    const retry = await fetch(`${BASE}${path}`, {
      headers: { 'X-API-Key': POKETRACE_KEY },
    })
    return retry
  }
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

function getTier(topPrice: number | null, hasGraded: boolean, ebayAvg?: number | null, tcgAvg?: number | null): string {
  if (hasGraded) return 'hot'
  const price = topPrice || ebayAvg || tcgAvg || 0
  if (price < 1) return 'cold'
  if (price >= 20) return 'hot'
  return 'warm'
}

export async function POST(request: Request) {
  const { budget = 30, sets = [] } = await request.json().catch(() => ({}))
  
  const usage = await getUsage()
  const available = Math.min(budget, usage.max - usage.used)
  if (available <= 0) {
    return NextResponse.json({ error: 'Daily API limit reached', used: usage.used }, { status: 429 })
  }

  let setMapping: Record<string, string> = {}
  try {
    const fs = require('fs')
    const path = require('path')
    setMapping = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/data/set-mapping-poketrace.json'), 'utf8'))
  } catch {}

  let setsToSync: string[] = sets.length > 0 ? sets : []
  
  if (setsToSync.length === 0) {
    const { data: portfolioSets } = await supabase.from('portfolio_cards').select('set_id')
    const uniqueSets = [...new Set((portfolioSets || []).map((c: any) => c.set_id).filter(Boolean))]
    setsToSync = uniqueSets.filter(s => setMapping[s])
  }

  let totalCards = 0
  let callsUsed = 0
  const errors: string[] = []

  for (const setId of setsToSync) {
    if (callsUsed >= available) break
    const ptSlug = setMapping[setId]
    if (!ptSlug) continue

    try {
      const r = await ptFetch(`/cards?set=${ptSlug}&limit=20`)
      callsUsed++
      if (!r.ok) { errors.push(`${setId}: ${r.status}`); await sleep(3000); continue }
      const data = await r.json()
      const cards = data.data || []

      for (const card of cards) {
        const ebay = card.prices?.ebay?.NEAR_MINT
        const tcg = card.prices?.tcgplayer?.NEAR_MINT
        const psa10 = card.prices?.ebay?.PSA_10
        const psa9 = card.prices?.ebay?.PSA_9

        await supabase.from('prices').upsert({
          card_name: card.name, card_number: card.cardNumber,
          set_slug: ptSlug, set_name: card.set?.name, poketrace_id: card.id,
          market: card.market || 'US', currency: card.currency || 'USD',
          ebay_avg: ebay?.avg || null, ebay_low: ebay?.low || null, ebay_high: ebay?.high || null,
          ebay_avg7d: ebay?.avg7d || null, ebay_avg30d: ebay?.avg30d || null, ebay_sales: ebay?.saleCount || null,
          tcg_avg: tcg?.avg || null, tcg_low: tcg?.low || null, tcg_high: tcg?.high || null,
          tcg_avg7d: tcg?.avg7d || null, tcg_avg30d: tcg?.avg30d || null, tcg_sales: tcg?.saleCount || null,
          top_price: card.topPrice || ebay?.avg || tcg?.avg || null, total_sales: card.totalSaleCount || null,
          condition: 'NEAR_MINT', tier: getTier(card.topPrice, card.hasGraded, ebay?.avg, tcg?.avg),
          has_graded: card.hasGraded || false, psa10_avg: psa10?.avg || null, psa9_avg: psa9?.avg || null,
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'poketrace_id,condition' })
        totalCards++
      }

      let cursor = data.pagination?.nextCursor
      while (cursor && data.pagination?.hasMore && callsUsed < available) {
        await sleep(3000)
        const r2 = await ptFetch(`/cards?set=${ptSlug}&limit=20&cursor=${cursor}`)
        callsUsed++
        if (!r2.ok) break
        const d2 = await r2.json()
        for (const card of (d2.data || [])) {
          const ebay = card.prices?.ebay?.NEAR_MINT
          const tcg = card.prices?.tcgplayer?.NEAR_MINT
          const psa10 = card.prices?.ebay?.PSA_10
          await supabase.from('prices').upsert({
            card_name: card.name, card_number: card.cardNumber,
            set_slug: ptSlug, set_name: card.set?.name, poketrace_id: card.id,
            market: card.market || 'US', currency: card.currency || 'USD',
            ebay_avg: ebay?.avg || null, ebay_low: ebay?.low || null, ebay_high: ebay?.high || null,
            ebay_avg7d: ebay?.avg7d || null, ebay_avg30d: ebay?.avg30d || null, ebay_sales: ebay?.saleCount || null,
            tcg_avg: tcg?.avg || null, tcg_low: tcg?.low || null, tcg_high: tcg?.high || null,
            tcg_avg7d: tcg?.avg7d || null, tcg_avg30d: tcg?.avg30d || null, tcg_sales: tcg?.saleCount || null,
            top_price: card.topPrice || ebay?.avg || tcg?.avg || null, total_sales: card.totalSaleCount || null,
            condition: 'NEAR_MINT', tier: getTier(card.topPrice, card.hasGraded, ebay?.avg, tcg?.avg),
            has_graded: card.hasGraded || false, psa10_avg: psa10?.avg || null,
            fetched_at: new Date().toISOString(),
          }, { onConflict: 'poketrace_id,condition' })
          totalCards++
        }
        cursor = d2.pagination?.nextCursor
        if (!d2.pagination?.hasMore) break
      }
      await sleep(6000)
    } catch (e: any) {
      errors.push(`${setId}: ${e.message}`)
    }
  }

  await incUsage(callsUsed)

  return NextResponse.json({
    success: true, callsUsed,
    callsRemaining: usage.max - usage.used - callsUsed,
    totalCards, setsProcessed: setsToSync.length,
    errors: errors.length ? errors : undefined,
  })
}
