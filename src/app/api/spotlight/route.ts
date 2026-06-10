/**
 * /api/spotlight?card_id=xxx&lang=FR
 *
 * Unified endpoint that returns ALL data needed for SpotlightV2.
 *
 * Sources mergees dans prices.bySource :
 *   - cardmarket : prix raw NM (Cardmarket EUR via TCGdex)
 *   - ebay       : eBay listings (asks, prices_canonical)
 *   - tcgplayer  : prix raw TCGplayer (en USD->EUR)
 *   - ppt_graded : NEW. eBay sold graded data via graded_prices_ppt (real sold)
 *
 * Le composant SpotlightStates lit bySource.ppt_graded pour les notes gradees.
 * Le bloc raw NM continue de venir de bySource.cardmarket + bySource.ebay.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserWithProfile } from '@/lib/auth/helpers'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'

const sql = neon(process.env.DATABASE_URL!)
const USD_TO_EUR = 0.92

// Convert PPT key (psa10, cgc8_5) -> spotlight variant (psa_10, cgc_8_5)
function normalizeGradedVariant(pptKey: string): string {
  const m = pptKey.match(/^([a-z]+)(\d+)(?:_(\d+))?$/i)
  if (!m) return pptKey
  const [, slab, intPart, fracPart] = m
  const grade = fracPart ? `${intPart}_${fracPart}` : intPart
  return `${slab.toLowerCase()}_${grade}`
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  let cardId = params.get('card_id')
  const lang = (params.get('lang') || '').toUpperCase()
  const conditionRaw = params.get('condition') || ''

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

    // 2. Multi-source latest prices (cardmarket / ebay / tcgplayer asks)
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

    // 2b. History selon condition de l'user
    //  - User a un grade (PSA 9, CGC 10...) -> timeseries graded eBay sold (grades_history)
    //  - User raw NM -> raw history TCGplayer (plus dense) si dispo, sinon Cardmarket fallback
    let history: Array<{ date: string; price: number }> = []

    // Detecte si condition = grade (ex: "PSA 9", "CGC 10")
    const gradeMatch = conditionRaw.match(/^([A-Za-z]+)\s+(\d+(?:\.\d+)?)$/)
    const isGraded = !!gradeMatch

    if (isGraded) {
      // Convert "PSA 9" -> "psa9", "CGC 9.5" -> "cgc9_5" (format key dans grades_history)
      const slab = gradeMatch![1].toLowerCase()
      const grade = gradeMatch![2].replace('.', '_')
      const gradeKey = slab + grade

      const gradedHistRows = await sql`
        SELECT grades_history->${gradeKey} AS hist
        FROM graded_prices_ppt
        WHERE set_name = ${card.set_name}
          AND card_number LIKE ${String(card.local_id ?? '').padStart(3, '0') + '/%'}
        LIMIT 1
      ` as Array<{ hist: Record<string, any> | null }>

      const histObj = gradedHistRows[0]?.hist || {}
      // Convert { "2025-12-18": { sevenDayAverage: 2691, average: 3000 }, ... } -> sorted array
      const USD_TO_EUR = 0.92
      history = Object.entries(histObj)
        .map(([date, pt]: [string, any]) => ({
          date,
          price: Math.round((Number(pt.sevenDayAverage || pt.average || 0)) * USD_TO_EUR * 100) / 100,
        }))
        .filter(p => p.price > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    // Fallback raw : raw_history TCGplayer NM (dense) sinon Cardmarket (clairseme mais existant)
    if (history.length === 0) {
      // 1. Tente raw_history TCGplayer Near Mint (depuis graded_prices_ppt.raw_history)
      const rawHistRows = await sql`
        SELECT raw_history->'conditions'->'Near Mint'->'history' AS nm_hist
        FROM graded_prices_ppt
        WHERE set_name = ${card.set_name}
          AND card_number LIKE ${String(card.local_id ?? '').padStart(3, '0') + '/%'}
        LIMIT 1
      ` as Array<{ nm_hist: Array<any> | null }>

      const nmHist = rawHistRows[0]?.nm_hist
      if (Array.isArray(nmHist) && nmHist.length > 0) {
        const USD_TO_EUR = 0.92
        history = nmHist
          .map((p: any) => ({
            date: typeof p.date === 'string' ? p.date : new Date(p.date).toISOString(),
            price: Math.round(Number(p.market || 0) * USD_TO_EUR * 100) / 100,
          }))
          .filter(p => p.price > 0)
          .sort((a, b) => a.date.localeCompare(b.date))
      }
    }

    // 2. Si toujours rien, fallback Cardmarket historique (l'ancien comportement)
    if (history.length === 0) {
      const cmHistRows = await sql`
        SELECT fetched_at, price_avg
        FROM prices_canonical
        WHERE tcg_card_id = ${cardId}
          AND source = 'cardmarket'
          AND variant = 'raw'
          AND price_avg > 0
        ORDER BY fetched_at ASC
        LIMIT 120
      ` as Array<any>
      history = cmHistRows.map(r => ({ date: r.fetched_at, price: Number(r.price_avg) }))
    }

    // 2c. NEW: PPT graded prices (real eBay sold).
    // Match via (set_name, card_number padded 3 digits)
    const localId = card.local_id ?? cardId.split('-').pop() ?? '0'
    const numberPrefix = String(localId).padStart(3, '0') + '/'
    const pptRows = await sql`
      SELECT card_name, card_number, raw_market_usd, total_sales, grades, fetched_at
      FROM graded_prices_ppt
      WHERE set_name = ${card.set_name}
        AND card_number LIKE ${numberPrefix + '%'}
      ORDER BY fetched_at DESC
      LIMIT 1
    ` as Array<any>

    const pptGradedEntries: any[] = []
    if (pptRows.length > 0) {
      const grades = pptRows[0].grades || {}
      for (const [pptKey, raw] of Object.entries(grades)) {
        const g = raw as any
        if (!g || g.smartPrice == null) continue
        // Noise filter: low confidence + 1 vente = trop fragile, on n'expose pas
        if (g.confidence === 'low' && (g.count ?? 0) < 2) continue

        const variant = normalizeGradedVariant(pptKey)
        pptGradedEntries.push({
          variant,
          condition: null,
          price_avg: Math.round(Number(g.smartPrice) * USD_TO_EUR * 100) / 100,
          price_low: g.min != null ? Math.round(Number(g.min) * USD_TO_EUR * 100) / 100 : null,
          price_high: g.max != null ? Math.round(Number(g.max) * USD_TO_EUR * 100) / 100 : null,
          currency: 'EUR',
          nb_sales: g.count ?? null,
          fetched_at: pptRows[0].fetched_at,
          // metadata enriched (consumed if Spotlight needs)
          confidence: g.confidence ?? null,
          market_trend: g.marketTrend ?? null,
        })
      }
    }

    // 3. Group by source
    const bySource: Record<string, any[]> = {}
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
    if (pptGradedEntries.length > 0) {
      // Verrou Premium: les non-Premium recoivent UNE seule note gradee
      // (teaser de conversion) + flag gradedLocked. Donnees jamais envoyees
      // = verrou reel, pas un masquage client.
      const u = await getCurrentUserWithProfile().catch(() => null)
      const isPremium = u?.isPremium === true
      if (isPremium) {
        bySource.ppt_graded = pptGradedEntries
      } else if (pptGradedEntries.length > 0) {
        bySource.ppt_graded = [pptGradedEntries[0]]
        ;(bySource as any).__gradedLocked = true
        ;(bySource as any).__gradedHiddenCount = pptGradedEntries.length - 1
      }
    }

    // 4. Marche estime (raw NM cross-source average, inchange)
    const cmTrend = bySource.cardmarket?.find(p => p.variant === 'raw' && p.condition === 'CARDMARKET_TREND')
    const ebayRawNm = bySource.ebay?.find(p => p.variant === 'raw' && p.condition === 'NEAR_MINT')
    const tcgPrice = bySource.tcgplayer?.find(p => p.variant === 'raw' || p.variant === 'holo')
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
