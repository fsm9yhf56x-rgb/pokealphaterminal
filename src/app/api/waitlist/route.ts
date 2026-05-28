import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Validation email simple mais robuste
function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Sync Brevo best-effort : n'echoue JAMAIS la requete si Brevo down/non-configure.
// La table waitlist_jp (Neon) reste la source de verite.
async function syncToBrevo(email: string): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY
  const listId = process.env.BREVO_WAITLIST_JP_LIST_ID
  if (!apiKey || !listId) return false // non configure → skip silencieux

  try {
    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        listIds: [Number(listId)],
        updateEnabled: true, // contact existant → ajoute a la liste sans erreur
      }),
      signal: AbortSignal.timeout(5000),
    })
    return res.ok || res.status === 204
  } catch {
    return false // timeout / reseau → best-effort
  }
}

export async function POST(req: NextRequest) {
  let body: { email?: string; cardId?: string; source?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const cardId = body.cardId || null
  const source = body.source || 'jp_pricing'

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  // INSERT dedup natif : ON CONFLICT sur lower(email) → no-op si deja inscrit
  try {
    await sql.query(
      `INSERT INTO waitlist_jp (email, card_id, source)
       VALUES ($1, $2, $3)
       ON CONFLICT (lower(email)) DO NOTHING`,
      [email, cardId, source]
    )
  } catch (e: any) {
    console.error('[waitlist] DB insert failed:', e?.message)
    return NextResponse.json({ error: 'Erreur enregistrement' }, { status: 500 })
  }

  // Sync Brevo best-effort (ne bloque pas le succes)
  const brevoSynced = await syncToBrevo(email)
  if (brevoSynced) {
    try {
      await sql.query(`UPDATE waitlist_jp SET brevo_synced = true WHERE lower(email) = lower($1)`, [email])
    } catch { /* best-effort */ }
  }

  return NextResponse.json({ ok: true, brevoSynced })
}
