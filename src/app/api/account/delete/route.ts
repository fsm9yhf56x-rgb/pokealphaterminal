/**
 * Account deletion — wipes the user's profile + Better Auth identity.
 *
 * Better Auth default tables: "user", "session", "account", "verification".
 * If you renamed them in the BA config, adjust the table names below.
 *
 * DETTE: les données métier (portfolio_cards, waitlist, etc.) ne sont PAS
 * purgées ici. À brancher en cascade quand le schéma user_id sera stabilisé.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { sql } from '@/lib/db/sql'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  if (body?.confirm !== 'SUPPRIMER') {
    return NextResponse.json({ error: 'Confirmation manquante' }, { status: 400 })
  }

  // Each DELETE is isolated so one failing table doesn't block the others.
  const attempts: Array<[string, () => Promise<unknown>]> = [
    ['session',  () => sql.query('DELETE FROM "session" WHERE "userId" = $1', [userId])],
    ['account',  () => sql.query('DELETE FROM "account" WHERE "userId" = $1', [userId])],
    ['profiles', () => sql.query('DELETE FROM "profiles" WHERE id = $1', [userId])],
    ['user',     () => sql.query('DELETE FROM "user" WHERE id = $1', [userId])],
  ]

  const failures: string[] = []
  for (const [name, fn] of attempts) {
    try {
      await fn()
    } catch (e: any) {
      console.error(`[account/delete] ${name} failed:`, e?.message)
      failures.push(name)
    }
  }

  // If the user row itself wasn't deleted, treat as failure.
  if (failures.includes('user')) {
    return NextResponse.json(
      { error: 'Suppression incomplète', failures },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, warnings: failures })
}
