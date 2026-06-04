/**
 * GET  /api/streak  → lit le streak de l'utilisateur courant
 * POST /api/streak  → enregistre la visite du jour (calcul consecutif cote serveur)
 *
 * Remplace le localStorage pka_streak_v1 par une persistance Neon liee au compte.
 * Logique de streak 100% en SQL (atomique, anti-race) :
 *   - jamais visite        → ligne creee (current=1)
 *   - deja visite aujourd'hui → inchange
 *   - visite hier (J-1)    → current +1, longest = max(longest, current)
 *   - rupture (> 1 jour)   → current reset a 1
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { sql } from '@/lib/db/sql'

export const dynamic = 'force-dynamic'

type StreakRow = {
  current: number
  longest: number
  total_visits: number
  last_visit: string
}

function serialize(r: StreakRow | undefined) {
  if (!r) return { current: 0, longest: 0, totalVisits: 0, lastVisit: null }
  return {
    current: Number(r.current ?? 0),
    longest: Number(r.longest ?? 0),
    totalVisits: Number(r.total_visits ?? 0),
    lastVisit: r.last_visit,
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const rows = (await sql`
      SELECT current, longest, total_visits, last_visit
      FROM user_streaks
      WHERE user_id = ${user.id}
    `) as StreakRow[]
    return NextResponse.json(serialize(rows[0]))
  } catch (e: any) {
    console.error('[api/streak GET]', e?.message)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    // Tout le calcul est fait en SQL de maniere atomique.
    // CURRENT_DATE et l'ecart en jours sont evalues cote Postgres.
    const rows = (await sql`
      INSERT INTO user_streaks (user_id, current, longest, total_visits, last_visit)
      VALUES (${user.id}, 1, 1, 1, CURRENT_DATE)
      ON CONFLICT (user_id) DO UPDATE SET
        current = CASE
          WHEN user_streaks.last_visit = CURRENT_DATE THEN user_streaks.current
          WHEN user_streaks.last_visit = CURRENT_DATE - INTERVAL '1 day' THEN user_streaks.current + 1
          ELSE 1
        END,
        longest = GREATEST(
          user_streaks.longest,
          CASE
            WHEN user_streaks.last_visit = CURRENT_DATE THEN user_streaks.current
            WHEN user_streaks.last_visit = CURRENT_DATE - INTERVAL '1 day' THEN user_streaks.current + 1
            ELSE 1
          END
        ),
        total_visits = user_streaks.total_visits
          + CASE WHEN user_streaks.last_visit = CURRENT_DATE THEN 0 ELSE 1 END,
        last_visit = CURRENT_DATE,
        updated_at = now()
      RETURNING current, longest, total_visits, last_visit
    `) as StreakRow[]
    return NextResponse.json(serialize(rows[0]))
  } catch (e: any) {
    console.error('[api/streak POST]', e?.message)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
