/**
 * Verrous de plan cote serveur — helper unique pour toutes les routes API.
 * Usage:
 *   const gate = await requirePlan('premium')
 *   if (!gate.ok) return gate.res
 *   // gate.user dispo ensuite
 */
import { NextResponse } from 'next/server'
import { getCurrentUserWithProfile } from '@/lib/auth/helpers'

type PlanLevel = 'pro' | 'premium'
const LEVEL: Record<string, number> = { free: 0, pro: 1, premium: 2 }

export async function requirePlan(min: PlanLevel) {
  const user = await getCurrentUserWithProfile()
  if (!user) {
    return { ok: false as const, res: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  }
  if ((LEVEL[user.plan] ?? 0) < LEVEL[min]) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: 'plan_required', need: min, current: user.plan }, { status: 403 }),
    }
  }
  return { ok: true as const, user }
}
