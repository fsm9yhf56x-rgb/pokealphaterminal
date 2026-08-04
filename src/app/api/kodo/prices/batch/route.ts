import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'
import { getDisplayPrices } from '@/lib/prices/display'
import { checkPublicRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/kodo/prices/batch?ids=en-ex1-8,fr-ex1-8,... (max 200)
// Reponse legere pour grilles: fairValue + cote langue + liquidite
export async function GET(req: NextRequest) {
  // Route publique : protection cout / abus (fail-open si Upstash down).
  const _rl = await checkPublicRateLimit(req, 'data')
  if (_rl) return _rl

  try {
    const idsParam = req.nextUrl.searchParams.get('ids') || ''
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 200)
    if (!ids.length) return NextResponse.json({ prices: {} })

    const prices = await getDisplayPrices(sql, ids)
    return NextResponse.json({ prices, engine: 'kodo-v1' })
  } catch (e: any) {
    console.error('[kodo/prices/batch]', e.message)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
