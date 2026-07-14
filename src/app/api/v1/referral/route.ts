import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { sql } from '@/lib/db/sql'
import { getReferralOverview } from '@/lib/referral/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kodocards.com'

/** GET — mon code, mon lien, mes stats de parrainage. */
export async function GET() {
  const user = await getCurrentUser().catch(() => null)
  if (!user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const ov = await getReferralOverview(user.id)
  return NextResponse.json({ ...ov, link: `${APP_URL}?ref=${ov.code}` })
}

/** POST — attribue un parrain au user courant (le filleul). Body: { code? }.
 *  Sans code dans le body, on lit le cookie kodo_ref (attribution auto via lien). */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser().catch(() => null)
  if (!user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch { /* pas de body */ }
  const manual = typeof body?.code === 'string' && body.code.trim() ? body.code : null
  const cookieRef = req.cookies.get('kodo_ref')?.value || null
  const raw = String(manual || cookieRef || '').trim().toLowerCase()
  const isManual = !!manual

  const respond = (payload: any, status = 200) => {
    const res = NextResponse.json(payload, { status })
    res.cookies.set('kodo_ref', '', { maxAge: 0, path: '/' })
    return res
  }

  if (!raw) return NextResponse.json({ ok: false, reason: 'no_code' })

  const already = (await sql`SELECT 1 FROM referrals WHERE referred_id = ${user.id} LIMIT 1`) as any[]
  if (already[0]) {
    return respond(isManual ? { error: 'already_referred' } : { ok: false, reason: 'already_referred' }, isManual ? 409 : 200)
  }

  const owner = (await sql`SELECT user_id FROM referral_codes WHERE lower(code) = ${raw} LIMIT 1`) as any[]
  const referrerId = owner[0]?.user_id
  if (!referrerId) {
    return respond(isManual ? { error: 'invalid_code' } : { ok: false, reason: 'invalid_code' }, isManual ? 400 : 200)
  }
  if (referrerId === user.id) {
    return respond(isManual ? { error: 'self_referral' } : { ok: false, reason: 'self_referral' }, isManual ? 400 : 200)
  }

  try {
    await sql`INSERT INTO referrals (referrer_id, referred_id, code) VALUES (${referrerId}, ${user.id}, ${raw})`
  } catch {
    return respond({ ok: false, reason: 'already_referred' })
  }

  return respond({ ok: true })
}
