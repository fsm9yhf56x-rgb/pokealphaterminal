/**
 * /api/activity?card_id=xxx&limit=10
 *
 * Returns recent market events for a card from prices_snapshots:
 * - PRICE_UPDATE: new snapshot ingested (any source/variant)
 * - GRADED_DETECTED: first time a graded variant appears
 *
 * Optional: alpha_signals also surfaced when available.
 */

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'
const sql = neon(process.env.DATABASE_URL!)

interface ActivityEvent {
  kind: 'PRICE_UPDATE' | 'GRADED_DETECTED' | 'ALPHA_SIGNAL'
  variant?: string
  condition?: string | null
  source?: string
  price?: number
  currency?: string
  ts: string
  meta?: any
}

export async function GET(req: NextRequest) {
  const cardId = req.nextUrl.searchParams.get('card_id')
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '15', 10), 30)
  if (!cardId) return NextResponse.json({ error: 'card_id required' }, { status: 400 })

  try {
    // Latest snapshots all sources & variants
    const snapshots = await sql`
      SELECT source, variant, condition, price_avg, currency, nb_sales, fetched_at
      FROM prices_snapshots
      WHERE card_ref = ${cardId}
        AND price_avg IS NOT NULL
        AND price_avg > 0
      ORDER BY fetched_at DESC
      LIMIT ${limit}
    ` as Array<any>

    const events: ActivityEvent[] = snapshots.map(s => ({
      kind: (s.variant && s.variant.match(/^(psa|cgc|bgs|sgc|pca|ccc)_/i))
        ? 'GRADED_DETECTED'
        : 'PRICE_UPDATE',
      variant: s.variant,
      condition: s.condition,
      source: s.source,
      price: Number(s.price_avg),
      currency: s.currency,
      ts: s.fetched_at,
      meta: { nb_sales: s.nb_sales },
    }))

    // Try to add alpha signals (table may not exist or be empty)
    try {
      const alpha = await sql`
        SELECT computed_at, market_target, confidence_pct, ai_reason, tier
        FROM alpha_signals
        WHERE card_ref = ${cardId}
        ORDER BY computed_at DESC
        LIMIT 3
      ` as Array<any>
      for (const a of alpha) {
        events.push({
          kind: 'ALPHA_SIGNAL',
          ts: a.computed_at,
          meta: {
            target: a.market_target ? Number(a.market_target) : null,
            confidence: a.confidence_pct,
            reason: a.ai_reason,
            tier: a.tier,
          },
        })
      }
    } catch { /* alpha_signals optional */ }

    events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

    return NextResponse.json({ events: events.slice(0, limit) })
  } catch (e: any) {
    console.error('[activity] error:', e?.message)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
