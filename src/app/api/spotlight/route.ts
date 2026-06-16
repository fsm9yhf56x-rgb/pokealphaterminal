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
      SELECT id FROM k_cards_export WHERE id = ANY(${candidates as any}) LIMIT 5
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
             c.set_id, s.name AS set_name, s.release_date, NULL AS era
      FROM k_cards_export c
      LEFT JOIN k_sets_export s ON s.id = c.set_id
      WHERE c.id = ${cardId}
    ` as Array<any>

    if (cardRows.length === 0) {
      return NextResponse.json({ error: 'Card not found', resolved_id: cardId }, { status: 404 })
    }
    const card = cardRows[0]

    // 2. Multi-source latest prices (cardmarket / ebay / tcgplayer asks)
    // Kodo Engine: matrice de prix par print (remplace prices_canonical vide)
    const fxRow = await sql`SELECT rate FROM fx_rates WHERE from_currency='USD' AND to_currency='EUR' ORDER BY rate_date DESC LIMIT 1` as Array<any>
    const USD_EUR = Number(fxRow[0]?.rate || 0.92)
    // Kodo Engine: signaux derives (fair value, cote FR, liquidite, grade EV)
    const sigRows = await sql`
      SELECT ps.fair_value_eur, ps.fair_value_method, ps.cote_fr_eur, ps.cote_lang,
             ps.liquidity_score, ps.spread_us_eu_pct, ps.grade_ev_psa10_eur
      FROM k_cards kc JOIN price_signals ps ON ps.print_id = kc.print_id AND ps.lang = kc.lang
      WHERE kc.id = ${cardId} LIMIT 1
    ` as Array<any>
    const sig = sigRows[0] || null
    const kodo = sig ? {
      fairValueEur: sig.fair_value_eur != null ? Number(sig.fair_value_eur) : null,
      fairValueMethod: sig.fair_value_method || null,
      coteFrEur: sig.cote_fr_eur != null ? Number(sig.cote_fr_eur) : null,
      coteLang: sig.cote_lang || null,
      liquidityScore: sig.liquidity_score != null ? Number(sig.liquidity_score) : null,
      spreadUsEuPct: sig.spread_us_eu_pct != null ? Number(sig.spread_us_eu_pct) : null,
      gradeEvPsa10Eur: sig.grade_ev_psa10_eur != null ? Number(sig.grade_ev_psa10_eur) : null,
    } : null
    const matrixRows = await sql`
      SELECT pm.market, pm.tier, pm.source, pm.spot, pm.low, pm.high,
             pm.sale_count, pm.is_asking, pm.currency, pm.as_of
      FROM k_cards kc
      JOIN price_matrix pm ON pm.print_id = kc.print_id
      WHERE kc.id = ${cardId} AND pm.spot IS NOT NULL AND pm.spot > 0
    ` as Array<any>
    const RAW_TIERS: Record<string, string> = {
      NEAR_MINT: 'NEAR_MINT', LIGHTLY_PLAYED: 'LIGHTLY_PLAYED', MODERATELY_PLAYED: 'MODERATELY_PLAYED',
      HEAVILY_PLAYED: 'HEAVILY_PLAYED', DAMAGED: 'DAMAGED', MINT: 'MINT', AGGREGATED: 'CARDMARKET_TREND',
    }
    const toEur = (v: any, cur: string) => v == null ? null : (cur === 'USD' ? Math.round(Number(v) * USD_EUR * 100) / 100 : Number(v))
    const latestPrices = matrixRows
      .filter((r: any) => !r.is_asking || r.source === 'cardmarket')
      .map((r: any) => {
        const isGrade = /^(PSA|BGS|CGC|SGC|ACE|TAG)_/.test(r.tier)
        const src = r.source === 'ppt_tcgplayer' ? 'tcgplayer' : (r.source === 'ppt_ebay' ? 'ebay' : r.source)
        return {
          source: src,
          variant: isGrade ? r.tier.toLowerCase() : 'raw',
          condition: isGrade ? null : (RAW_TIERS[r.tier] || r.tier),
          price_avg: toEur(r.spot, r.currency),
          price_low: toEur(r.low, r.currency),
          price_high: toEur(r.high, r.currency),
          currency: 'EUR',
          nb_sales: r.sale_count,
          fetched_at: r.as_of,
        }
      })
      .filter((r: any) => r.price_avg != null && r.price_avg > 0)

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
      // UNE seule serie coherente: priorite NM tcgplayer > NM ppt > Trend cardmarket.
      // Jamais melanger les tiers (variation fictive sinon).
      const khRows = await sql`
        WITH series AS (
          SELECT ph.tier, ph.source, count(*) AS pts,
            CASE WHEN ph.tier='NEAR_MINT' AND ph.source='tcgplayer' THEN 0
                 WHEN ph.tier='NEAR_MINT' AND ph.source='ppt_tcgplayer' THEN 1
                 WHEN ph.tier='AGGREGATED' AND ph.source='cardmarket' THEN 2
                 ELSE 9 END AS prio
          FROM k_cards kc JOIN price_history ph ON ph.print_id = kc.print_id
          WHERE kc.id = ${cardId} AND ph.price > 0
          GROUP BY ph.tier, ph.source
        ), best AS (
          SELECT tier, source FROM series WHERE prio < 9 ORDER BY prio, pts DESC LIMIT 1
        )
        SELECT ph.day, ph.price, ph.currency
        FROM k_cards kc
        JOIN price_history ph ON ph.print_id = kc.print_id
        JOIN best b ON b.tier = ph.tier AND b.source = ph.source
        WHERE kc.id = ${cardId} AND ph.price > 0
        ORDER BY ph.day ASC LIMIT 365
      ` as Array<any>
      history = khRows.map((r: any) => ({
        date: String(r.day),
        price: r.currency === 'USD' ? Math.round(Number(r.price) * USD_EUR * 100) / 100 : Number(r.price),
      }))
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
      pptGradedEntries.sort((a, b) => {
        const aPsa = String(a.variant).startsWith('psa_') ? 1 : 0
        const bPsa = String(b.variant).startsWith('psa_') ? 1 : 0
        if (aPsa !== bPsa) return bPsa - aPsa
        return (b.nb_sales ?? 0) - (a.nb_sales ?? 0)
      })
      bySource.ppt_graded = pptGradedEntries
    }

    // ── Qualite: le grade vient de PPT uniquement (eBay sold reels). ─────
    // Les variantes gradees des autres sources (legacy prices_canonical,
    // asks figees) sont exclues — donnees perimees, prix non fiables.
    {
      const GRADE_PREFIXES_Q = ['psa_', 'bgs_', 'cgc_', 'sgc_', 'ace_', 'tag_', 'cca_', 'pca_', 'ccc_']
      const isGradedQ = (v: any) => GRADE_PREFIXES_Q.some(p => String(v ?? '').toLowerCase().startsWith(p))
      for (const src of Object.keys(bySource)) {
        if (src === 'ppt_graded' || src.startsWith('__')) continue
        bySource[src] = (bySource[src] as any[]).filter(e => !isGradedQ(e?.variant))
      }
    }

    // ── Verrou Premium sur le grade, TOUTES SOURCES confondues ──────────
    // Les variantes gradees existent dans ppt_graded ET dans ebay
    // (prices_canonical asks). Troncature unique apres construction complete:
    // non-Premium = 1 note teaser (la plus parlante), le reste retire serveur.
    // Donnees jamais envoyees = verrou reel.
    {
      const GRADE_PREFIXES = ['psa_', 'bgs_', 'cgc_', 'sgc_', 'ace_', 'tag_', 'cca_', 'pca_', 'ccc_']
      const isGradedVariant = (v: any) => GRADE_PREFIXES.some(p => String(v ?? '').toLowerCase().startsWith(p))
      const u = await getCurrentUserWithProfile().catch(() => null)
      const isPremium = u?.isPremium === true
      if (!isPremium) {
        const allGraded: { src: string; entry: any }[] = []
        for (const [src, entries] of Object.entries(bySource)) {
          if (src.startsWith('__')) continue
          for (const e of entries as any[]) {
            if (isGradedVariant(e?.variant)) allGraded.push({ src, entry: e })
          }
        }
        if (allGraded.length > 1) {
          // Teaser: PSA d'abord, puis volume de ventes
          allGraded.sort((a, b) => {
            const aPsa = String(a.entry.variant).startsWith('psa_') ? 1 : 0
            const bPsa = String(b.entry.variant).startsWith('psa_') ? 1 : 0
            if (aPsa !== bPsa) return bPsa - aPsa
            return (b.entry.nb_sales ?? 0) - (a.entry.nb_sales ?? 0)
          })
          const keep = allGraded[0]
          for (const src of Object.keys(bySource)) {
            if (src.startsWith('__')) continue
            bySource[src] = (bySource[src] as any[]).filter(
              e => !isGradedVariant(e?.variant) || e === keep.entry
            )
          }
          ;(bySource as any).__gradedLocked = true
          ;(bySource as any).__gradedHiddenCount = allGraded.length - 1
        } else if (allGraded.length === 1) {
          // Une seule note au total: on la laisse, pas de lock (rien a cacher)
        }
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
      kodo,
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
