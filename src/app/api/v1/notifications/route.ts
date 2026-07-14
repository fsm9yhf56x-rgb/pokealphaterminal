import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { sql } from '@/lib/db/sql'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** GET — 50 dernières notifications + nombre de non-lues. */
export async function GET() {
  const user = await getCurrentUser().catch(() => null)
  if (!user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const [items, unread] = (await Promise.all([
    sql`SELECT id, type, title, body, data, (read_at IS NOT NULL) AS read,
               to_char(created_at, 'DD/MM à HH24:MI') AS at
        FROM notifications WHERE user_id = ${user.id}
        ORDER BY created_at DESC LIMIT 50`,
    sql`SELECT count(*)::int AS n FROM notifications WHERE user_id = ${user.id} AND read_at IS NULL`,
  ])) as any[]

  return NextResponse.json({ items: items || [], unread: unread[0]?.n ?? 0 })
}

/** POST — marquer lu. Body: { id } (une) ou { all: true } (toutes). */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser().catch(() => null)
  if (!user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch { /* pas de body */ }

  if (body?.all) {
    await sql`UPDATE notifications SET read_at = now() WHERE user_id = ${user.id} AND read_at IS NULL`
  } else if (body?.id) {
    await sql`UPDATE notifications SET read_at = now() WHERE user_id = ${user.id} AND id = ${body.id} AND read_at IS NULL`
  }
  return NextResponse.json({ ok: true })
}
