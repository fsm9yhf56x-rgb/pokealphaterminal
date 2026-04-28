/**
 * GET /api/prices/conditions
 *
 * Resolves the per-condition price breakdown for a card.
 * Two ways to identify the card:
 *   1. ?card_ref=<UUID>             (PokeTrace UUID directly)
 *   2. ?set_slug=X&card_number=N    (we resolve to UUID via prices_v2)
 *
 * Source: prices_v2_by_condition view (1 row per (card_ref, source, condition)).
 *
 * Response shape:
 *   {
 *     data: {
 *       ebay: { NEAR_MINT: {price_avg, price_low, ...}, LIGHTLY_PLAYED: {...}, ... },
 *       tcgplayer: { NEAR_MINT: {...}, ... }
 *     },
 *     stats: { conditions_found, sources_found, total_rows, resolved_card_ref }
 *   }
 */

import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  let cardRef = searchParams.get('card_ref')
  const setSlug = searchParams.get('set_slug')
  const cardNumber = searchParams.get('card_number')

  const supabase = getAdminClient()

  // If no card_ref but we have (set_slug + card_number), resolve to UUID via prices_v2
  if (!cardRef && setSlug && cardNumber) {
    const normalizedNum = String(cardNumber).split('/')[0].replace(/^0+/, '') || '0'
    const { data: priceRows } = await (supabase as any)
      .from('prices_v2')
      .select('poketrace_id, card_number')
      .eq('set_slug', setSlug)
      .limit(500)

    if (priceRows) {
      const match = priceRows.find((r: any) => {
        const num = String(r.card_number || '').split('/')[0].replace(/^0+/, '') || '0'
        return num === normalizedNum
      })
      if (match?.poketrace_id) cardRef = match.poketrace_id
    }
  }

  if (!cardRef) {
    return NextResponse.json(
      { error: 'Missing card_ref or (set_slug + card_number)' },
      { status: 400 }
    )
  }

  // 'as any': prices_v2_by_condition n'est pas encore dans les types Supabase générés.
  // À régénérer avec: npx supabase gen types typescript
  const { data, error } = await (supabase as any)
    .from('prices_v2_by_condition')
    .select('source, variant, condition, price_avg, price_low, price_high, price_median, nb_sales, currency, fetched_at')
    .eq('card_ref', cardRef)
    .eq('variant', 'raw')
    .order('fetched_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: 'Database error: ' + error.message },
      { status: 500 }
    )
  }

  // Build breakdown structure
  const breakdown: any = { ebay: {}, tcgplayer: {} }
  const conditionsFound = new Set<string>()
  const sourcesFound = new Set<string>()

  for (const row of (data || [])) {
    const src = row.source
    const cond = row.condition
    if (!src || !cond) continue
    if (src !== 'ebay' && src !== 'tcgplayer') continue

    // Skip if already seen (source, condition) — keep the most recent
    if (breakdown[src][cond]) continue

    breakdown[src][cond] = {
      price_avg: row.price_avg,
      price_low: row.price_low,
      price_high: row.price_high,
      price_median: row.price_median,
      nb_sales: row.nb_sales,
      currency: row.currency || 'USD',
      fetched_at: row.fetched_at,
    }
    conditionsFound.add(cond)
    sourcesFound.add(src)
  }

  return NextResponse.json({
    data: breakdown,
    stats: {
      conditions_found: conditionsFound.size,
      sources_found: sourcesFound.size,
      total_rows: (data || []).length,
      resolved_card_ref: cardRef,
    },
  })
}
