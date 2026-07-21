import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { sql } from '@/lib/db/sql'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** GET — la liste des codes de sets auxquels l'utilisateur est abonne. */
export async function GET() {
  const user = await getCurrentUser().catch(() => null)
  if (!user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const rows = (await sql`
    SELECT set_code FROM set_alerts WHERE user_id = ${user.id}
  `) as any[]
  return NextResponse.json({ codes: rows.map(r => r.set_code) })
}

/** POST — bascule l'abonnement. Body: { code, name? }.
 *  Renvoie { subscribed: true|false } selon le nouvel etat. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser().catch(() => null)
  if (!user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch { /* pas de body */ }
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  if (!code) return NextResponse.json({ error: 'code manquant' }, { status: 400 })
  const name = typeof body?.name === 'string' ? body.name.slice(0, 120) : null

  // Existe deja ? -> on retire (toggle off). Sinon -> on ajoute (toggle on).
  const existing = (await sql`
    SELECT id FROM set_alerts WHERE user_id = ${user.id} AND set_code = ${code}
  `) as any[]

  if (existing.length) {
    await sql`DELETE FROM set_alerts WHERE user_id = ${user.id} AND set_code = ${code}`
    return NextResponse.json({ subscribed: false })
  }

  await sql`
    INSERT INTO set_alerts (user_id, set_code, set_name)
    VALUES (${user.id}, ${code}, ${name})
    ON CONFLICT (user_id, set_code) DO NOTHING
  `
  return NextResponse.json({ subscribed: true })
}
