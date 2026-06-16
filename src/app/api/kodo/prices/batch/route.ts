import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'

export const dynamic = 'force-dynamic'

// GET /api/kodo/prices/batch?ids=en-ex1-8,fr-ex1-8,... (max 200)
// Reponse legere pour grilles: fairValue + cote langue + liquidite
export async function GET(req: NextRequest) {
  try {
    const idsParam = req.nextUrl.searchParams.get('ids') || ''
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 200)
    if (!ids.length) return NextResponse.json({ prices: {} })

    const rows = await sql.query(
      `SELECT kc.id, kc.lang,
              ps.fair_value_eur, ps.fair_value_method, ps.cote_fr_eur,
              ps.liquidity_score, ps.computed_at
       FROM k_cards kc
       LEFT JOIN price_signals ps ON ps.print_id = kc.print_id AND ps.lang = kc.lang
       WHERE kc.id = ANY($1)`, [ids])

    const prices: Record<string, any> = {}
    for (const r of rows as any[]) {
      const fair = r.fair_value_eur != null ? Number(r.fair_value_eur) : null
      const coteFr = r.cote_fr_eur != null ? Number(r.cote_fr_eur) : null
      prices[r.id] = {
        fairValueEur: fair,
        // Pour une carte FR, privilegier la cote FR quand elle existe
        displayEur: r.lang === 'fr' && coteFr != null ? coteFr : fair,
        coteFrEur: coteFr,
        method: r.fair_value_method ?? null,
        liquidity: r.liquidity_score ?? null,
      }
    }
    return NextResponse.json({ prices, engine: 'kodo-v1' })
  } catch (e: any) {
    console.error('[kodo/prices/batch]', e.message)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
