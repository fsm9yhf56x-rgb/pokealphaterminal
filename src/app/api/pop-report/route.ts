/**
 * /api/pop-report?card_id=xxx
 *
 * Returns PSA population data for a card.
 * psa_pop_reports.card_ref is unprefixed (e.g. "base1-4"), so we strip lang prefix.
 * Returns multiple psa_spec_ids (Unlimited / 1st Edition / Shadowless variants).
 */

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'
const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const cardId = req.nextUrl.searchParams.get('card_id')
  if (!cardId) return NextResponse.json({ error: 'card_id required' }, { status: 400 })

  // Strip lang prefix (psa_pop_reports.card_ref is unprefixed)
  const shortRef = cardId.replace(/^(en|fr|jp|aopkm)-/i, '')

  try {
    const rows = await sql`
      SELECT psa_spec_id,
             pop_10, pop_9_5, pop_9, pop_8_5, pop_8,
             pop_7_5, pop_7, pop_6_5, pop_6, pop_5_5, pop_5,
             pop_4_5, pop_4, pop_3_5, pop_3,
             pop_2_5, pop_2, pop_1_5, pop_1
      FROM psa_pop_reports
      WHERE card_ref = ${shortRef}
      ORDER BY pop_10 DESC NULLS LAST
    ` as Array<any>

    const variants = rows.map(r => {
      const grades: Record<string, number> = {}
      let total = 0
      for (const k of Object.keys(r)) {
        if (k.startsWith('pop_') && r[k] != null) {
          const grade = k.replace('pop_', '').replace('_', '.')
          grades[grade] = Number(r[k])
          total += Number(r[k])
        }
      }
      return {
        psa_spec_id: r.psa_spec_id,
        grades,
        total,
      }
    })

    return NextResponse.json({ variants, shortRef }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (e: any) {
    console.error('[pop-report] error:', e?.message)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
