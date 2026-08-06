import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'
import { checkPublicRateLimit } from '@/lib/rate-limit'
export const dynamic = 'force-dynamic'

/** POST /api/v1/scan/feedback — chaque confirmation humaine enrichit la
 *  mémoire collective : le scan apprend SEUL, pour tous. */
export async function POST(req: NextRequest) {
  const _rl = await checkPublicRateLimit(req, 'scan')
  if (_rl) return _rl
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  const kCardId = String(body?.k_card_id ?? '').trim()
  const keys: string[] = Array.isArray(body?.keys) ? body.keys.slice(0, 8).map((k: any) => String(k).slice(0, 120)) : []
  if (!kCardId || !keys.length) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  try {
    for (const k of keys) {
      await sql`
        INSERT INTO scan_aliases (read_key, k_card_id)
        VALUES (${k}, ${kCardId})
        ON CONFLICT (read_key, k_card_id)
        DO UPDATE SET confirmations = scan_aliases.confirmations + 1, last_seen = now()`
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[scan/feedback]', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
