/**
 * GET /api/market/filter-options
 * Options des filtres de l'Explorer (Kodo): sets ayant au moins une carte pricee + raretes.
 * slug = k_sets.id (= c.set_id attendu par /api/market/explorer). Remplace la lecture prices_v2.
 */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const [setsRaw, raritiesRaw] = await Promise.all([
      sql`
        SELECT ks.id AS slug, ks.name
        FROM k_sets ks
        WHERE EXISTS (
          SELECT 1 FROM k_prints kp
          JOIN price_signals ps ON ps.print_id = kp.id AND ps.fair_value_eur > 0
          WHERE kp.set_id = ks.id
        )
        ORDER BY ks.name
      `,
      sql`
        SELECT DISTINCT rarity_normalized AS r
        FROM k_cards
        WHERE rarity_normalized IS NOT NULL
        ORDER BY rarity_normalized
      `,
    ])
    const sets = (setsRaw as Array<any>)
      .map((s) => ({ slug: String(s.slug ?? ''), name: String(s.name ?? '') }))
      .filter((s) => s.slug && s.name)
    const rarities = (raritiesRaw as Array<any>)
      .map((x) => x.r)
      .filter(Boolean)
    return NextResponse.json(
      { sets, rarities },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } },
    )
  } catch (e: any) {
    return NextResponse.json({ sets: [], rarities: [], error: e?.message ?? 'error' }, { status: 200 })
  }
}
