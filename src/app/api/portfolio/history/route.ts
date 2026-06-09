/**
 * GET /api/portfolio/history?period=1M
 *
 * Renvoie l'historique réel de la valeur du portfolio de l'utilisateur courant,
 * lu depuis portfolio_value_snapshots (1 point/jour, alimenté par le cron portfolio-prices).
 * hasEnoughData = false si < 2 points (courbe en construction).
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { sql } from '@/lib/db/sql'

export const dynamic = 'force-dynamic'

const PERIOD_DAYS: Record<string, number | null> = {
  '7J': 7, '1M': 30, '3M': 90, '6M': 180, '1A': 365, 'Tout': null,
}

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || '1M'
  const days = PERIOD_DAYS[period] ?? null

  try {
    const rows = (days === null
      ? await sql`
          SELECT day::text AS day, total_value, total_cost
          FROM portfolio_value_snapshots
          WHERE user_id = ${user.id}
          ORDER BY day ASC`
      : await sql`
          SELECT day::text AS day, total_value, total_cost
          FROM portfolio_value_snapshots
          WHERE user_id = ${user.id}
            AND day >= CURRENT_DATE - ${days}::int
          ORDER BY day ASC`
    ) as Array<{ day: string; total_value: string; total_cost: string }>

    const points = rows.map(r => ({
      day: r.day,
      value: Number(r.total_value ?? 0),
      cost: Number(r.total_cost ?? 0),
    }))

    return NextResponse.json({
      points,
      hasEnoughData: points.length >= 2,
      period,
    })
  } catch (e: any) {
    console.error('[portfolio/history]', e?.message)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
