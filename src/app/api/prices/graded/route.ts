/**
 * /api/prices/graded
 *
 * Returns graded prices for a card, fetched from graded_prices_ppt
 * (real eBay sold data via PokemonPriceTracker API).
 *
 * Replaces previous version which read prices_canonical (asks listings,
 * delivered delirium pricing like Dracaufeu FR CGC10 = 21199€).
 *
 * Query params (any combination):
 *   - tcg_card_id (e.g. "en-base1-4")
 *   - set_slug + card_number (e.g. "base-set" + "4")
 *   - lang ('fr' | 'en' | 'jp')
 *
 * Matching strategy:
 *   PPT card_number is zero-padded 3 digits ("004/102").
 *   We LPAD our local_id and match against the prefix.
 *
 * Response shape (preserved from previous version):
 *   {
 *     data: {
 *       "psa_10": { price_avg, currency, source, fetched_at, nb_sales, ... },
 *       "psa_9": {...},
 *       ...
 *     },
 *     tcg_card_id: resolved,
 *     metadata: { confidence, sales_velocity, total_sales }
 *   }
 *
 * Currency: PPT delivers USD. We convert to EUR using fixed rate
 * (kept consistent with rest of app — see USD_TO_EUR in useCardPrices.ts).
 */

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'

const sql = neon(process.env.DATABASE_URL!)
const USD_TO_EUR = 0.92

// Mapping PPT variant key → notre variant string (préserve le format existant)
// PPT: "psa10", "cgc9_5", "bgs10" → notre: "psa_10", "cgc_9.5", "bgs_10"
function normalizeVariant(pptKey: string): string {
  // psa10 → psa_10, psa9_5 → psa_9.5, cgc8_5 → cgc_8.5
  const m = pptKey.match(/^([a-z]+)(\d+)(?:_(\d+))?$/i)
  if (!m) return pptKey
  const [, slab, intPart, fracPart] = m
  const grade = fracPart ? `${intPart}.${fracPart}` : intPart
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
  // Bonus metadata (le composant peut l'utiliser ou pas)
  confidence: string | null
  market_trend: string | null
  smart_method: string | null
  median: number | null
}

export async function GET(req: NextRequest) {
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

  try {
    // Step 1: Résoudre vers (set_name, local_id_padded)
    // PPT stocke card_number en "004/102", on doit matcher contre ça.
    let resolvedSetName: string | null = null
    let resolvedLocalIdPadded: string | null = null

    if (tcgCardId) {
      // tcgCardId format: "en-base1-4" ou "fr-base1-4" ou "aopkm-X-Y" ou "base1-4"
      // On extrait local_id (dernier segment) et on cherche le set via tcg_cards
      const parts = tcgCardId.split('-')
      const localId = parts[parts.length - 1]
      resolvedLocalIdPadded = String(localId).padStart(3, '0')

      // Récupère le set_name via tcg_cards
      const setRow = await sql`
        SELECT s.name AS set_name
        FROM tcg_cards c
        LEFT JOIN tcg_sets s ON s.id = c.set_id
        WHERE c.id = ${tcgCardId}
        LIMIT 1
      ` as Array<{ set_name: string | null }>
      resolvedSetName = setRow[0]?.set_name ?? null
    } else if (setSlug && cardNumber) {
      // set_slug "base-set" → set_name "Base Set" via tcg_sets
      const num = String(cardNumber).split('/')[0].replace(/^0+/, '') || '0'
      resolvedLocalIdPadded = String(num).padStart(3, '0')

      const setRow = await sql`
        SELECT name FROM tcg_sets WHERE id LIKE ${'%' + setSlug.replace(/-/g, '%') + '%'} LIMIT 1
      ` as Array<{ name: string | null }>
      resolvedSetName = setRow[0]?.name ?? null
    }

    if (!resolvedSetName) {
      return NextResponse.json({ data: {}, tcg_card_id: tcgCardId, _info: 'set_not_resolved' })
    }

    // Step 2: Query graded_prices_ppt
    // card_number commence par "004/" pour local_id 4
    const numberPrefix = resolvedLocalIdPadded + '/'

    const rows = await sql`
      SELECT card_name, card_number, raw_market_usd, total_sales,
             grades, fetched_at, language
      FROM graded_prices_ppt
      WHERE set_name = ${resolvedSetName}
        AND card_number LIKE ${numberPrefix + '%'}
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

    // Step 3: Convertir le JSONB grades en shape attendue par le hook
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
