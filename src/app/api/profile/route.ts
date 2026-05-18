/**
 * Profile API — business data attached to a user (is_pro, full_name, etc.)
 * Identity is managed by Better Auth (table "user"), this is a side-table.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { sql } from '@/lib/db/sql'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

async function getCurrentUserId(): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session?.user?.id ?? null
}

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ profile: null }, { status: 401 })

  try {
    const rows = (await sql`
      SELECT * FROM "profiles" WHERE id = ${userId} LIMIT 1
    `) as any[]

    if (rows.length === 0) {
      // Auto-provision a default profile row
      await sql`
        INSERT INTO "profiles" (id, is_pro, created_at, updated_at)
        VALUES (${userId}, false, now(), now())
        ON CONFLICT (id) DO NOTHING
      `
      const fresh = (await sql`
        SELECT * FROM "profiles" WHERE id = ${userId} LIMIT 1
      `) as any[]
      return NextResponse.json({ profile: fresh[0] ?? null })
    }

    return NextResponse.json({ profile: rows[0] })
  } catch (e: any) {
    console.error('[api/profile GET]', e)
    return NextResponse.json({ profile: null, error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  // Whitelist of editable fields
  const allowed = ['display_name', 'username', 'avatar_url', 'theme', 'lang'] as const
  const updates: Record<string, any> = {}
  for (const k of allowed) {
    if (k in body) updates[k] = body[k]
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, noop: true })
  }

  try {
    // Build the UPDATE dynamically (each field becomes its own templated call)
    // Easier: do one query per field. For 1-5 fields this is fine.
    for (const [k, v] of Object.entries(updates)) {
      // Use sql.query for dynamic column names (can't templatize identifiers)
      // Validate column name first to prevent injection
      if (!/^[a-z_][a-z0-9_]*$/.test(k)) continue
      await sql.query(
        `UPDATE "profiles" SET "${k}" = $1, updated_at = now() WHERE id = $2`,
        [v, userId],
      )
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[api/profile PATCH]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
