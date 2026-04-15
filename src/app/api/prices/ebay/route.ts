import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EBAY_APP_ID = process.env.EBAY_APP_ID || ''
const EBAY_CERT_ID = process.env.EBAY_CERT_ID || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function getEbayToken(): Promise<string | null> {
  const auth = Buffer.from(EBAY_APP_ID + ':' + EBAY_CERT_ID).toString('base64')
  const r = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Basic ' + auth },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
  })
  const d = await r.json()
  return d.access_token || null
}

function buildQuery(cardName: string, setName: string, edition?: string): string {
  let q = `pokemon card ${cardName} ${setName} holo`
  if (edition === '1st') q += ' 1st edition'
  if (edition === 'shadowless') q += ' shadowless'
  return q
}

function extractPrice(items: any[]): { avg: number | null; low: number | null; high: number | null; count: number } {
  const prices = items
    .map(i => parseFloat(i.price?.value || '0'))
    .filter(p => p > 0 && p < 500000) // filter outliers
    .sort((a, b) => a - b)

  if (prices.length === 0) return { avg: null, low: null, high: null, count: 0 }

  // Remove top and bottom 10% to reduce noise
  const trim = Math.max(1, Math.floor(prices.length * 0.1))
  const trimmed = prices.length > 4 ? prices.slice(trim, -trim) : prices

  const avg = Math.round((trimmed.reduce((s, p) => s + p, 0) / trimmed.length) * 100) / 100
  return { avg, low: prices[0], high: prices[prices.length - 1], count: prices.length }
}

export async function POST(request: Request) {
  const { cards = [] } = await request.json().catch(() => ({}))
  // cards = [{ name, set, number, edition, setSlug }]

  if (!cards.length) return NextResponse.json({ error: 'No cards provided' }, { status: 400 })
  if (cards.length > 20) return NextResponse.json({ error: 'Max 20 cards per request' }, { status: 400 })

  if (!EBAY_APP_ID || !EBAY_CERT_ID) {
    return NextResponse.json({ error: 'eBay env vars missing', hasAppId: !!EBAY_APP_ID, hasCertId: !!EBAY_CERT_ID }, { status: 500 })
  }
  const token = await getEbayToken()
  if (!token) return NextResponse.json({ error: 'eBay auth failed' }, { status: 500 })

  const results: any[] = []

  for (const card of cards) {
    const q = buildQuery(card.name, card.set, card.edition)
    try {
      const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(q)}&category_ids=183454&limit=20&sort=price`
      const r = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + token, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' }
      })
      const d = await r.json()
      const items = d.itemSummaries || []
      const price = extractPrice(items)

      if (price.avg) {
        // Store in prices table
        await supabase.from('prices').upsert({
          card_name: card.name,
          card_number: card.number || null,
          set_slug: card.setSlug || 'ebay-' + card.set.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          set_name: card.set,
          poketrace_id: 'ebay-' + card.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + (card.number || ''),
          market: 'US',
          currency: 'USD',
          ebay_avg: price.avg,
          ebay_low: price.low,
          ebay_high: price.high,
          ebay_sales: price.count,
          top_price: price.avg,
          condition: 'NEAR_MINT',
          tier: price.avg >= 20 ? 'hot' : price.avg >= 1 ? 'warm' : 'cold',
          variant: card.edition === '1st' ? '1st_Edition_Holofoil' : card.edition === 'shadowless' ? 'Unlimited_Holofoil' : null,
          source: 'ebay',
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'poketrace_id,condition' })

        results.push({ name: card.name, set: card.set, edition: card.edition, price })
      } else {
        results.push({ name: card.name, set: card.set, edition: card.edition, price: null })
      }

      await sleep(500) // respect rate limits
    } catch (e: any) {
      results.push({ name: card.name, error: e.message })
    }
  }

  return NextResponse.json({ results, count: results.length })
}
