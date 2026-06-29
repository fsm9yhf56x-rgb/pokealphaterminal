/**
 * /api/prices/graded
 *
 * Prix gradés d'une carte, AVEC SÉPARATION STRICTE DES MARCHÉS.
 *
 *  - Carte FR  → marché FR uniquement : price_matrix (kodo_card_id='fr-…',
 *                market='EU') = annonces Cardmarket FR gradées + ventes/annonces
 *                CCC (source='ebay_fr'). Annonces DÉCOTÉES (×0.88) et filtrées
 *                des aberrations (bornées autour du raw FR). JAMAIS de données US.
 *  - Carte EN/JP → inchangé : graded_prices_ppt (eBay sold US, PokemonPriceTracker).
 *
 * Règle Kodo : chaque prix son marché. On ne mélange jamais US et FR. Aucune
 * valeur inventée — une annonce aberrante est rejetée, pas corrigée.
 *
 * Réponse (shape préservée) :
 *   { data: { "psa_10": { price_avg, currency, source, nb_sales, ... }, ... },
 *     tcg_card_id, metadata }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requirePlan } from '@/lib/plan'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'

const sql = neon(process.env.DATABASE_URL!)
const USD_TO_EUR = 0.92
const ASK_DISCOUNT = 0.88 // décote annonces (asks) — même logique que le raw FR

// Bornes anti-aberration relatives au raw : un gradé plausible vaut entre
// 0.4× (note basse) et 80× (PSA10 d'une carte rare) le prix raw. Au-delà =
// annonce délirante (ex Dracaufeu FR PSA10 à 1 000 000 €) → rejetée.
const GRADE_MIN_RATIO = 0.4
const GRADE_MAX_RATIO = 80

function numberVariants(localId: string): string[] {
  const raw = String(localId).replace(/\D/g, '').replace(/^0+/, '') || '0'
  return [raw, raw.padStart(2, '0'), raw.padStart(3, '0')]
    .filter((v, i, a) => a.indexOf(v) === i)
}

// PPT variant key → notre variant ("psa10" → "psa_10", "cgc9_5" → "cgc_9.5")
function normalizeVariant(pptKey: string): string {
  const m = pptKey.match(/^([a-z]+)(\d+)(?:_(\d+))?$/i)
  if (!m) return pptKey
  const [, slab, intPart, fracPart] = m
  const grade = fracPart ? `${intPart}_${fracPart}` : intPart
  return `${slab.toLowerCase()}_${grade}`
}

// tier price_matrix ("CCC_9_5", "PSA_10") → notre variant ("ccc_9.5", "psa_10")
function tierToVariant(tier: string): string {
  const m = tier.match(/^([A-Z]+)_(\d+)(?:_(\d+))?(?:_(BLACK|GOLD))?$/i)
  if (!m) return tier.toLowerCase()
  const [, slab, intPart, fracPart, special] = m
  let grade = fracPart ? `${intPart}.${fracPart}` : intPart
  if (special) grade += special.toLowerCase() === 'gold' ? 'g' : 'b'
  return `${slab.toLowerCase()}_${grade}`
}

interface GradedPriceOutput {
  price_avg: number
  price_low: number | null
  price_high: number | null
  currency: string
  source: string
  fetched_at: string
  nb_sales: number | null
  confidence: string | null
  market_trend: string | null
  smart_method: string | null
  median: number | null
}

export async function GET(req: NextRequest) {
  const gate = await requirePlan('premium')
  if (!gate.ok) return gate.res

  const params = req.nextUrl.searchParams
  const tcgCardId = params.get('tcg_card_id')
  const setSlug = params.get('set_slug')
  const cardNumber = params.get('card_number')
  const lang = (params.get('lang') || '').toLowerCase()

  if (!tcgCardId && !(setSlug && cardNumber)) {
    return NextResponse.json(
      { error: 'Must provide tcg_card_id OR (set_slug + card_number)' },
      { status: 400 },
    )
  }

  // Langue effective : param explicite, sinon préfixe de l'id.
  const isFr =
    lang === 'fr' || (!!tcgCardId && /^fr-/i.test(tcgCardId))

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // CARTE FR — marché FR uniquement (price_matrix EU), JAMAIS d'US.
    // ═══════════════════════════════════════════════════════════════════════
    if (isFr) {
      // print_id non préfixé (base1-4) à partir de l'id ou set+number.
      let printId: string | null = null
      if (tcgCardId) {
        printId = tcgCardId.replace(/^(en|fr|jp|ja|aopkm)-/i, '')
      } else if (setSlug && cardNumber) {
        const num = String(cardNumber).split('/')[0].replace(/\D/g, '').replace(/^0+/, '') || '0'
        printId = `${setSlug}-${num}`
      }
      if (!printId) {
        return NextResponse.json({ data: {}, tcg_card_id: tcgCardId, _info: 'fr_unresolved' })
      }
      const kodoCardId = `fr-${printId}`

      // Raw FR de référence pour borner les aberrations.
      const sig = await sql`
        SELECT cote_fr_eur, fair_value_eur
        FROM price_signals
        WHERE print_id = ${printId}
        ORDER BY (lang = 'fr') DESC, computed_at DESC NULLS LAST
        LIMIT 1
      ` as Array<{ cote_fr_eur: string | null; fair_value_eur: string | null }>
      const rawFr = sig.length
        ? Number((sig[0].cote_fr_eur ?? sig[0].fair_value_eur) ?? 0)
        : 0

      // Gradés FR : annonces Cardmarket FR + CCC ebay_fr. EU seulement.
      const gradeRows = await sql`
        SELECT tier, source, spot, median30d, avg30d, low, high, sale_count, is_asking, as_of
        FROM price_matrix
        WHERE kodo_card_id = ${kodoCardId}
          AND market = 'EU'
          AND tier ~ '^(PSA|CGC|BGS|SGC|TAG|ACE|PCA|CCC)_'
        ORDER BY tier
      ` as Array<{
        tier: string; source: string
        spot: string | null; median30d: string | null; avg30d: string | null
        low: string | null; high: string | null
        sale_count: number | null; is_asking: boolean; as_of: string
      }>

      const data: Record<string, GradedPriceOutput> = {}
      let kept = 0, rejected = 0

      for (const r of gradeRows) {
        const base = Number(r.median30d ?? r.spot ?? r.avg30d ?? 0)
        if (!base || base <= 0) continue

        // Annonce → décotée. Vente (CCC ebay_fr is_asking=false) → brute.
        const isAsk = r.is_asking !== false
        const price = Math.round(base * (isAsk ? ASK_DISCOUNT : 1) * 100) / 100

        // Garde-fou anti-aberration : borné autour du raw FR (si raw connu).
        if (rawFr > 0) {
          if (price < rawFr * GRADE_MIN_RATIO || price > rawFr * GRADE_MAX_RATIO) {
            rejected++
            continue
          }
        }
        // Plancher de robustesse : annonce isolée (n<=1) tolérée seulement si
        // elle reste dans une fourchette serrée du raw (évite le prix unique fou).
        if ((r.sale_count ?? 0) <= 1 && rawFr > 0 && price > rawFr * 30) {
          rejected++
          continue
        }

        const variant = tierToVariant(r.tier)
        data[variant] = {
          price_avg: price,
          price_low: r.low != null ? Math.round(Number(r.low) * (isAsk ? ASK_DISCOUNT : 1) * 100) / 100 : null,
          price_high: r.high != null ? Math.round(Number(r.high) * (isAsk ? ASK_DISCOUNT : 1) * 100) / 100 : null,
          currency: 'EUR',
          source: r.source === 'ebay_fr' ? 'ccc_ebay_fr' : 'cardmarket_fr_ask',
          fetched_at: r.as_of,
          nb_sales: r.sale_count ?? null,
          // Annonces FR : confiance basse par nature (asks, pas ventes).
          confidence: isAsk ? 'low' : 'medium',
          market_trend: null,
          smart_method: isAsk ? 'cardmarket_ask_discounted' : 'ccc_ebay_fr',
          median: r.median30d != null ? Math.round(Number(r.median30d) * (isAsk ? ASK_DISCOUNT : 1) * 100) / 100 : null,
        }
        kept++
      }

      return NextResponse.json({
        data,
        tcg_card_id: tcgCardId,
        _market: 'FR',
        _info: kept === 0 ? 'no_reliable_fr_graded' : undefined,
        metadata: {
          market: 'FR',
          raw_fr_eur: rawFr || null,
          graded_kept: kept,
          graded_rejected: rejected,
          source: 'cardmarket_fr_ask + ccc_ebay_fr',
          note: 'Annonces FR décotées, aberrations exclues. Aucune donnée US.',
        },
      })
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CARTE EN/JP — inchangé : graded_prices_ppt (eBay sold US via PPT).
    // ═══════════════════════════════════════════════════════════════════════
    let resolvedSetName: string | null = null
    let resolvedLocalIdPadded: string | null = null

    if (tcgCardId) {
      const parts = tcgCardId.split('-')
      const localId = parts[parts.length - 1]
      resolvedLocalIdPadded = String(localId).replace(/\D/g, '').replace(/^0+/, '') || '0'

      const idCandidates = [tcgCardId]
      if (!/^(en|fr|jp|ja)-/.test(tcgCardId)) {
        idCandidates.push('en-' + tcgCardId, 'fr-' + tcgCardId, 'jp-' + tcgCardId)
      }
      let setRow: Array<{ set_name: string | null }> = []
      for (const cid of idCandidates) {
        setRow = await sql`
          SELECT s.name AS set_name
          FROM k_cards_export c
          LEFT JOIN k_sets_export s ON s.id = c.set_id
          WHERE c.id = ${cid}
          LIMIT 1
        ` as Array<{ set_name: string | null }>
        if (setRow.length && setRow[0].set_name) break
      }
      resolvedSetName = setRow[0]?.set_name ?? null
    } else if (setSlug && cardNumber) {
      resolvedLocalIdPadded = String(cardNumber).split('/')[0].replace(/\D/g, '').replace(/^0+/, '') || '0'

      let setRow = await sql`
        SELECT name FROM k_sets_export WHERE id = ${'en-' + setSlug} OR id = ${setSlug} LIMIT 1
      ` as Array<{ name: string | null }>
      if (!setRow.length) {
        const asName = setSlug.replace(/-/g, ' ')
        setRow = await sql`
          SELECT name FROM k_sets_export WHERE lower(name) = ${asName} AND lang='EN' LIMIT 1
        ` as Array<{ name: string | null }>
      }
      resolvedSetName = setRow[0]?.name ?? null
    }

    if (!resolvedSetName || !resolvedLocalIdPadded) {
      return NextResponse.json({ data: {}, tcg_card_id: tcgCardId, _info: 'set_not_resolved' })
    }

    const patterns = numberVariants(resolvedLocalIdPadded).map((v) => v + '/%')
    const [pp1, pp2, pp3] = [patterns[0] || '___', patterns[1] || '___', patterns[2] || '___']

    const rows = await sql`
      SELECT card_name, card_number, raw_market_usd, total_sales,
             grades, fetched_at, language
      FROM graded_prices_ppt
      WHERE set_name = ${resolvedSetName}
        AND (card_number LIKE ${pp1} OR card_number LIKE ${pp2} OR card_number LIKE ${pp3})
      ORDER BY fetched_at DESC
      LIMIT 1
    ` as Array<{
      card_name: string
      card_number: string
      raw_market_usd: string | null
      total_sales: number | null
      grades: Record<string, any>
      fetched_at: string
      language: string
    }>

    if (rows.length === 0) {
      return NextResponse.json({
        data: {},
        tcg_card_id: tcgCardId,
        _info: 'no_graded_data_for_card',
        _matched_set: resolvedSetName,
        _matched_number: resolvedLocalIdPadded,
      })
    }

    const row = rows[0]
    const data: Record<string, GradedPriceOutput> = {}

    for (const [pptKey, g] of Object.entries(row.grades || {})) {
      const grade = g as any
      if (!grade || typeof grade !== 'object' || grade.smartPrice == null) continue

      const variantKey = normalizeVariant(pptKey)
      const priceUsd = Number(grade.smartPrice)
      const priceEur = Math.round(priceUsd * USD_TO_EUR * 100) / 100

      data[variantKey] = {
        price_avg: priceEur,
        price_low: grade.min != null ? Math.round(Number(grade.min) * USD_TO_EUR * 100) / 100 : null,
        price_high: grade.max != null ? Math.round(Number(grade.max) * USD_TO_EUR * 100) / 100 : null,
        currency: 'EUR',
        source: 'ppt_ebay_sold',
        fetched_at: row.fetched_at,
        nb_sales: grade.count ?? null,
        confidence: grade.confidence ?? null,
        market_trend: grade.marketTrend ?? null,
        smart_method: grade.method ?? null,
        median: grade.median != null ? Math.round(Number(grade.median) * USD_TO_EUR * 100) / 100 : null,
      }
    }

    return NextResponse.json({
      data,
      tcg_card_id: tcgCardId,
      _market: 'US',
      _matched: { set_name: resolvedSetName, card_number: row.card_number, card_name: row.card_name },
      metadata: {
        total_sales: row.total_sales,
        raw_market_usd: row.raw_market_usd ? Number(row.raw_market_usd) : null,
        raw_market_eur: row.raw_market_usd ? Math.round(Number(row.raw_market_usd) * USD_TO_EUR * 100) / 100 : null,
        source: 'pokemonpricetracker_ebay_sold',
      },
    })
  } catch (e: any) {
    console.error('[prices/graded] error:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
