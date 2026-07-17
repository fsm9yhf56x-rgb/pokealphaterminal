/**
 * Profile API — business data attached to a user (is_pro, full_name, etc.)
 * Identity is managed by Better Auth (table "user"), this is a side-table.
 *
 * PLAN : le GET renvoie desormais plan / planSource / betaUntil / paidPlan
 * RESOLUS COTE SERVEUR (planFromRow -> resolvePlan). Le client ne derive plus
 * rien : useAuth se contente de lire. Le serveur reste seul arbitre.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { sql } from '@/lib/db/sql'
import { headers } from 'next/headers'
import { planFromRow } from '@/lib/plan/from-profile'

export const dynamic = 'force-dynamic'

async function getSessionUser(): Promise<{ id: string; email: string } | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  const u = session?.user
  if (!u?.id) return null
  return { id: u.id, email: (u as { email?: string }).email ?? '' }
}

/** Le profil enrichi renvoye au client. beta_tier est CONSOMME ici et jamais
 *  expose : le client n'a pas a savoir qu'il figure sur une liste. */
function withPlan(row: Record<string, unknown>) {
  const resolved = planFromRow(row as Parameters<typeof planFromRow>[0])
  return {
    ...row,
    beta_tier: undefined, // JSON.stringify supprime les undefined
    plan: resolved.plan,
    planSource: resolved.source,
    betaUntil: resolved.betaUntil,
    paidPlan: resolved.paidPlan,
  }
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ profile: null }, { status: 401 })

  try {
    // BETA : LEFT JOIN, zero aller-retour supplementaire. Retirer les 2 lignes
    // du JOIN + l'import planFromRow pour demanteler (cf. beta.ts, etape 4).
    const rows = (await sql`
      SELECT p.*, bi.tier AS beta_tier
      FROM "profiles" p
      LEFT JOIN beta_invites bi ON bi.email = lower(${user.email})
      WHERE p.id = ${user.id}
      LIMIT 1
    `) as any[]

    if (rows.length === 0) {
      // Auto-provision a default profile row
      await sql`
        INSERT INTO "profiles" (id, is_pro, created_at, updated_at)
        VALUES (${user.id}, false, now(), now())
        ON CONFLICT (id) DO NOTHING
      `
      const fresh = (await sql`
        SELECT p.*, bi.tier AS beta_tier
        FROM "profiles" p
        LEFT JOIN beta_invites bi ON bi.email = lower(${user.email})
        WHERE p.id = ${user.id}
        LIMIT 1
      `) as any[]
      // Un testeur invite AVANT d'avoir un compte a donc son Premium des la
      // toute premiere lecture, sans claim ni second passage.
      return NextResponse.json({ profile: fresh[0] ? withPlan(fresh[0]) : null })
    }

    return NextResponse.json({ profile: withPlan(rows[0]) })
  } catch (e: any) {
    console.error('[api/profile GET]', e)
    return NextResponse.json({ profile: null, error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  // Whitelist of editable fields — `plan` n'y figure pas et ne doit JAMAIS y
  // figurer : il est ecrit par le webhook Stripe, jamais par le client.
  const allowed = ['display_name', 'username', 'avatar_url', 'theme', 'lang', 'persona', 'persona_onboarded'] as const
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
        [v, user.id],
      )
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[api/profile PATCH]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
