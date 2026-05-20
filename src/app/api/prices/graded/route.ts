/**
 * /api/prices/graded
 *
 * Returns graded price breakdown for a single card.
 * Reads from prices_canonical, filtered to variants matching grade patterns
 * (psa_*, cgc_*, bgs_*, sgc_*, pca_*, ccc_*).
 *
 * Query params (one of):
 *   - tcg_card_id (e.g. "en-base1-4", "aopkm-100-67")
 *   - set_slug + card_number (resolves via card_aliases.tcg_card_id mapping)
 *
 * Response: { data: { psa_10: {price_avg, currency, source, fetched_at}, ... } }
 */

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'

const sql = neon(process.env.DATABASE_URL!)

interface GradedPrice {
  price_avg: number
  price_low: number | null
  price_high: number | null
  currency: string
  source: string
  fetched_at: string
  nb_sales: number | null
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const tcgCardId = params.get('tcg_card_id')
  const setSlug = params.get('set_slug')
  const cardNumber = params.get('card_number')
  const lang = (params.get('lang') || '').toLowerCase() // 'en' | 'fr' | 'jp' | ''

  if (!tcgCardId && !(setSlug && cardNumber)) {
    return NextResponse.json(
      { error: 'Must provide tcg_card_id OR (set_slug + card_number)' },
      { status: 400 },
    )
  }

  try {
    let canonicalId = tcgCardId
    // Resolve from set_slug + card_number via card_aliases
    if (!canonicalId && setSlug && cardNumber) {
      const rows = await sql`
        SELECT tcg_card_id FROM card_aliases
        WHERE set_slug = ${setSlug}
          AND card_number_clean = LPAD(${cardNumber}, 3, '0')
          AND tcg_card_id IS NOT NULL
        LIMIT 1
      ` as Array<{ tcg_card_id: string }>
      canonicalId = rows[0]?.tcg_card_id ?? null
    }

    // If tcg_card_id was provided without lang prefix (e.g. "base1-4"),
    // build candidates and prefer the requested lang.
    if (canonicalId && !canonicalId.match(/^(en|fr|jp|aopkm)-/i)) {
      // Prefer requested lang; fall back to any match
      const langOrder = lang === 'fr' ? ['fr', 'en', 'jp']
                      : lang === 'jp' ? ['jp', 'aopkm', 'en', 'fr']
                      : ['en', 'fr', 'jp']
      const candidates = langOrder.map(l => `${l}-${canonicalId}`).concat([canonicalId])
      const found = await sql`
        SELECT id FROM tcg_cards WHERE id = ANY(${candidates as any}) LIMIT 5
      ` as Array<{ id: string }>
      if (found.length > 0) {
        // Pick the first match in our preferred order
        for (const prefix of langOrder) {
          const match = found.find(r => r.id.startsWith(prefix + '-'))
          if (match) { canonicalId = match.id; break }
        }
        if (!langOrder.some(p => canonicalId!.startsWith(p + '-'))) {
          canonicalId = found[0].id
        }
      }
    }

    if (!canonicalId) {
      return NextResponse.json({ data: {} })
    }

    const rows = await sql`
      SELECT DISTINCT ON (variant)
        variant, price_avg, price_low, price_high, currency, source,
        fetched_at, nb_sales
      FROM prices_canonical
      WHERE tcg_card_id = ${canonicalId}
        AND variant ~ '^(psa|cgc|bgs|sgc|pca|ccc)_'
        AND price_avg IS NOT NULL
        AND price_avg > 0
      ORDER BY variant, fetched_at DESC
    ` as Array<{
      variant: string
      price_avg: string
      price_low: string | null
      price_high: string | null
      currency: string
      source: string
      fetched_at: string
      nb_sales: number | null
    }>

    const data: Record<string, GradedPrice> = {}
    for (const r of rows) {
      data[r.variant] = {
        price_avg: Number(r.price_avg),
        price_low: r.price_low ? Number(r.price_low) : null,
        price_high: r.price_high ? Number(r.price_high) : null,
        currency: r.currency,
        source: r.source,
        fetched_at: r.fetched_at,
        nb_sales: r.nb_sales,
      }
    }

    return NextResponse.json({ data, tcg_card_id: canonicalId })
  } catch (e: any) {
    console.error('[prices/graded] error:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
