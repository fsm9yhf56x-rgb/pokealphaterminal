/**
 * GET /api/cron/portfolio-prices
 *
 * Rafraîchit portfolio_cards.current_price depuis Kodo Engine
 * (price_signals via k_card_id : cote FR pour les cartes FR, fair value sinon).
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
    // Kodo Engine: resolution via k_card_id -> print -> signals.
    // Cote FR pour les cartes FR si dispo, sinon fair value.
    const res = (await sql`
      UPDATE portfolio_cards pc
      SET current_price = v.price_eur,
          updated_at = now()
      FROM (
        SELECT kc.id AS k_card_id,
               CASE WHEN kc.lang = 'fr' AND ps.cote_fr_eur IS NOT NULL
                    THEN ps.cote_fr_eur ELSE ps.fair_value_eur END AS price_eur
        FROM k_cards kc
        JOIN price_signals ps ON ps.print_id = kc.print_id
      ) v
      WHERE v.k_card_id = pc.k_card_id
        AND v.price_eur IS NOT NULL
        AND pc.current_price IS DISTINCT FROM v.price_eur
    `) as unknown as { rowCount?: number }

    const updated = (res as any)?.rowCount ?? null

    const totals = (await sql`
      SELECT
        COUNT(*)::int AS cards_priced,
        ROUND(SUM(current_price * COALESCE(qty,1))::numeric, 2) AS total_value_eur
      FROM portfolio_cards
      WHERE current_price IS NOT NULL
    `) as Array<{ cards_priced: number; total_value_eur: string | null }>

    // Snapshot quotidien de la valeur par user (1 ligne/user/jour, idempotent)
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
      total_value_eur: totals[0]?.total_value_eur ? Number(totals[0].total_value_eur) : 0,
      ran_at: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('[cron/portfolio-prices]', e?.message)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
