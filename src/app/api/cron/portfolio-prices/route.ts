/**
 * GET /api/cron/portfolio-prices
 *
 * Rafraîchit portfolio_cards.current_price depuis la vue card_price_resolved
 * (source de référence : PPT pour EN/JP, PokeTrace pour FR — selon ce que la vue résout).
 * Cache durable : le Hero / Holdings lisent current_price sans recalcul.
 *
 * 1×/jour après les crons prix. Protégé par CRON_SECRET (Bearer ou ?secret=).
 */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

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
    const res = (await sql`
      UPDATE portfolio_cards pc
      SET current_price = r.price_eur,
          updated_at = now()
      FROM card_price_resolved r
      WHERE r.set_id = pc.set_id
        AND r.card_number = ltrim(pc.card_number, '0')
        AND r.lang = pc.lang
        AND pc.current_price IS DISTINCT FROM r.price_eur
    `) as unknown as { rowCount?: number }

    const updated = (res as any)?.rowCount ?? null

    const totals = (await sql`
      SELECT
        COUNT(*)::int AS cards_priced,
        ROUND(SUM(current_price * COALESCE(qty,1))::numeric, 2) AS total_value_eur
      FROM portfolio_cards
      WHERE current_price IS NOT NULL
    `) as Array<{ cards_priced: number; total_value_eur: string | null }>

    return NextResponse.json({
      ok: true,
      updated,
      cards_priced: totals[0]?.cards_priced ?? 0,
      total_value_eur: totals[0]?.total_value_eur ? Number(totals[0].total_value_eur) : 0,
      ran_at: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('[cron/portfolio-prices]', e?.message)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
