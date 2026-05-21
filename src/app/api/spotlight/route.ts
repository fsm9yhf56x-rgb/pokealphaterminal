/**
 * /api/spotlight?card_id=xxx&lang=FR
 *
 * Unified endpoint that returns ALL data needed for SpotlightV2:
 * - card info (name, set, rarity)
 * - multi-source latest prices (cardmarket + ebay raw + tcgplayer + estimated)
 * - portfolio context (if user owns it)
 * - prices history (sparkline data, cardmarket primarily)
 *
 * Other endpoints stay separate for caching:
 * - /api/prices/conditions (existing)
 * - /api/prices/graded (existing)
 * - /api/pop-report (new)
 * - /api/activity (new)
 */

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  let cardId = params.get('card_id')
  const lang = (params.get('lang') || '').toUpperCase()

  if (!cardId) {
    return NextResponse.json({ error: 'card_id required' }, { status: 400 })
  }

  // Resolve short ID (e.g. "base1-4") to canonical with lang
  if (!cardId.match(/^(en|fr|jp|aopkm)-/i)) {
    const langOrder = lang === 'FR' ? ['fr', 'en', 'jp']
                    : lang === 'JP' || lang === 'JA' ? ['jp', 'aopkm', 'en', 'fr']
                    : ['en', 'fr', 'jp']
    const candidates = langOrder.map(l => `${l}-${cardId}`)
    const found = await sql`
      SELECT id FROM tcg_cards WHERE id = ANY(${candidates as any}) LIMIT 5
    ` as Array<{ id: string }>
    if (found.length > 0) {
      for (const prefix of langOrder) {
        const match = found.find(r => r.id.startsWith(prefix + '-'))
        if (match) { cardId = match.id; break }
      }
    }
  }

  try {
    // 1. Card info
    const cardRows = await sql`
      SELECT c.id, c.name, c.local_id, c.lang, c.rarity_normalized, c.image_url,
             c.set_id, s.name AS set_name, s.release_date, s.era
      FROM tcg_cards c
      LEFT JOIN tcg_sets s ON s.id = c.set_id
      WHERE c.id = ${cardId}
    ` as Array<any>

    if (cardRows.length === 0) {
      return NextResponse.json({ error: 'Card not found', resolved_id: cardId }, { status: 404 })
    }
    const card = cardRows[0]

    // 2. Multi-source latest prices (separated by source for the spec grid)
    const latestPrices = await sql`
      SELECT DISTINCT ON (source, variant, condition)
        source, variant, condition, price_avg, price_low, price_high,
        currency, nb_sales, fetched_at
      FROM prices_canonical
      WHERE tcg_card_id = ${cardId}
        AND price_avg IS NOT NULL
        AND price_avg > 0
      ORDER BY source, variant, condition, fetched_at DESC
    ` as Array<any>

    // 2b. Cardmarket history (for sparkline chart)
    const historyRows = await sql`
      SELECT fetched_at, price_avg
      FROM prices_canonical
      WHERE tcg_card_id = ${cardId}
        AND source = 'cardmarket'
        AND variant = 'raw'
        AND price_avg > 0
      ORDER BY fetched_at ASC
      LIMIT 120
    ` as Array<any>
    const history = historyRows.map(r => ({
      date: r.fetched_at,
      price: Number(r.price_avg),
    }))

    // Group by source: cardmarket / ebay / tcgplayer
    const bySource: Record<string, any> = {}
    for (const r of latestPrices) {
      const key = r.source
      if (!bySource[key]) bySource[key] = []
      bySource[key].push({
        variant: r.variant,
        condition: r.condition,
        price_avg: Number(r.price_avg),
        price_low: r.price_low ? Number(r.price_low) : null,
        price_high: r.price_high ? Number(r.price_high) : null,
        currency: r.currency,
        nb_sales: r.nb_sales,
        fetched_at: r.fetched_at,
      })
    }

    // Compute "Marché estimé" = average of cardmarket-trend + ebay-raw-NM + tcgplayer
    const cmTrend = bySource.cardmarket?.find((p: any) => p.variant === 'raw' && p.condition === 'CARDMARKET_TREND')
    const ebayRawNm = bySource.ebay?.find((p: any) => p.variant === 'raw' && p.condition === 'NEAR_MINT')
    const tcgPrice = bySource.tcgplayer?.find((p: any) => p.variant === 'raw' || p.variant === 'holo')
    const sources = [cmTrend, ebayRawNm, tcgPrice].filter(Boolean) as any[]
    const marketEst = sources.length > 0
      ? sources.reduce((sum, p) => sum + p.price_avg, 0) / sources.length
      : null

    return NextResponse.json({
      card,
      prices: {
        bySource,
        marketEst,
        primaryCurrency: 'EUR',
        history,
      },
      resolved_id: cardId,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (e: any) {
    console.error('[spotlight] error:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
