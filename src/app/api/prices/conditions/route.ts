/**
 * GET /api/prices/conditions?card_ref=<id>
 *
 * Returns the per-condition price breakdown for a card.
 * Source: prices_v2_by_condition view (1 row per (card_ref, source, condition)).
 *
 * Response shape:
 *   {
 *     data: {
 *       ebay: { NEAR_MINT: { price_avg, price_low, ... }, LIGHTLY_PLAYED: {...}, ... },
 *       tcgplayer: { NEAR_MINT: {...}, ... }
 *     },
 *     stats: { conditions_found, sources_found }
 *   }
 */

import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cardRef = searchParams.get('card_ref')

  if (!cardRef) {
    return NextResponse.json(
      { error: 'Missing card_ref query parameter' },
      { status: 400 }
    )
  }

  const supabase = getAdminClient()

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

  // Build breakdown structure: { ebay: { NEAR_MINT: {...} }, tcgplayer: { ... } }
  const breakdown: any = { ebay: {}, tcgplayer: {} }
  let conditionsFound = new Set<string>()
  let sourcesFound = new Set<string>()

  for (const row of (data || [])) {
    const src = row.source
    const cond = row.condition
    if (!src || !cond) continue
    if (src !== 'ebay' && src !== 'tcgplayer') continue

    // Skip if we already saw this (source, condition) — keep the most recent
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
    },
  })
}
