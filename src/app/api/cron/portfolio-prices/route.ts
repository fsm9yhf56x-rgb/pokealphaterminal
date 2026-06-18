/**
 * GET /api/cron/portfolio-prices
 *
 * Valorise chaque ligne de portfolio selon SON exemplaire (Kodo Engine) :
 *  - Gradee ("PSA 10", "BGS 8.5"...) -> tier exact {COMPANY}_{GRADE} de price_matrix
 *  - Raw -> tier d'etat (NEAR_MINT par defaut tant que le formulaire ne capture pas l'etat)
 *  - Carte FR raw -> cote FR (price_signals) prioritaire
 *  - Fallback universel -> fair value (price_basis le trace)
 * Sources sold uniquement (is_asking=false). Conversion via fx_rates.
 * Protege par CRON_SECRET (Bearer ou ?secret=).
 */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { priceCards } from '@/lib/portfolio-pricing'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  const authHeader = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  const ok = expected && (secret === expected || authHeader === `Bearer ${expected}`)
  if (!ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    // Pricing via la source de verite unique (meme regle que l'ajout immediat).
    const priced = await priceCards(sql, {})
    const updated = priced.length

    const totals = (await sql`
      SELECT COUNT(*)::int AS cards_priced,
             ROUND(SUM(current_price * COALESCE(qty,1))::numeric, 2) AS total_value_eur,
             COUNT(*) FILTER (WHERE price_basis LIKE 'tier:%')::int AS tier_exact,
             COUNT(*) FILTER (WHERE price_basis = 'fair_value_fallback')::int AS fallbacks
      FROM portfolio_cards
      WHERE current_price IS NOT NULL
    `) as Array<{ cards_priced: number; total_value_eur: string | null; tier_exact: number; fallbacks: number }>

    const snap = (await sql`
      INSERT INTO portfolio_value_snapshots (user_id, day, total_value, total_cost, currency)
      SELECT user_id, CURRENT_DATE,
             ROUND(COALESCE(SUM(current_price * COALESCE(qty,1)),0)::numeric, 2),
             ROUND(COALESCE(SUM(buy_price * COALESCE(qty,1)),0)::numeric, 2),
             'EUR'
      FROM portfolio_cards
      WHERE current_price IS NOT NULL
      GROUP BY user_id
      ON CONFLICT (user_id, day) DO UPDATE SET
        total_value = EXCLUDED.total_value,
        total_cost = EXCLUDED.total_cost
      RETURNING user_id
    `) as Array<{ user_id: string }>

    return NextResponse.json({
      ok: true,
      snapshots: snap.length,
      updated,
      cards_priced: totals[0]?.cards_priced ?? 0,
      tier_exact: totals[0]?.tier_exact ?? 0,
      fallbacks: totals[0]?.fallbacks ?? 0,
      total_value_eur: totals[0]?.total_value_eur ? Number(totals[0].total_value_eur) : 0,
      ran_at: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('[cron/portfolio-prices]', e?.message)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
