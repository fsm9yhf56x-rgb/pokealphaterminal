import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { sql } from '@/lib/db/sql'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/analytics/track — enregistre un événement analytics (first-party).
 *
 * Base légale :
 *  - Utilisateur connecté  -> intérêt légitime (consent='legitimate').
 *  - Visiteur anonyme      -> uniquement si le client signale le consentement
 *    « statistiques » (consent='statistics'). Sinon on n'enregistre rien.
 *
 * user_id est résolu CÔTÉ SERVEUR via la session (jamais depuis le client).
 * Réponse 204 immédiate, jamais bloquante pour l'appelant.
 */
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return new NextResponse(null, { status: 204 }) }

  const user = await getCurrentUser().catch(() => null)
  const userId = user?.id || null

  const consent = userId ? 'legitimate' : (body?.consent === 'statistics' ? 'statistics' : null)
  if (!userId && consent !== 'statistics') {
    return new NextResponse(null, { status: 204 }) // pas de base légale -> pas de tracking
  }

  const event = typeof body?.event === 'string' ? body.event.slice(0, 80) : null
  if (!event) return new NextResponse(null, { status: 204 })

  const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : null)

  try {
    await sql`
      INSERT INTO analytics_events (user_id, anon_id, session_id, event, path, referrer, props, utm, consent)
      VALUES (
        ${userId},
        ${userId ? null : clip(body.anon_id, 64)},
        ${clip(body.session_id, 64)},
        ${event},
        ${clip(body.path, 512)},
        ${clip(body.referrer, 512)},
        ${body.props ? JSON.stringify(body.props) : null}::jsonb,
        ${body.utm ? JSON.stringify(body.utm) : null}::jsonb,
        ${consent}
      )
    `
  } catch {
    // non bloquant : on n'échoue jamais l'appelant
  }
  return new NextResponse(null, { status: 204 })
}
