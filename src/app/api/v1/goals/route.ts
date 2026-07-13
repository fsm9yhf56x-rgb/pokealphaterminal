import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { listGoals } from '@/lib/goals/service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/goals
 * Renvoie { targets, wishlist } de l'utilisateur connecté.
 * user_id résolu côté serveur via la session Better Auth (jamais depuis le client).
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const data = await listGoals(user.id)
    return NextResponse.json(data)
  } catch (e) {
    console.error('[GET /api/v1/goals]', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
