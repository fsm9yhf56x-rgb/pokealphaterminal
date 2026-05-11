/**
 * GET /api/prices/history
 *
 * Query params:
 *   - card_ref (required)
 *   - timeframe (optional, default '30d'): one of 7d | 30d | 90d | 1y | all
 *
 * Pro gating:
 *   - 7d / 30d: free
 *   - 90d / 1y / all: requires profile.is_pro = true
 *
 * Backend: Better Auth session + Neon (via compat client passed to buildPriceHistory).
 */
import { NextResponse } from 'next/server'
import { getCurrentUserWithProfile } from '@/lib/auth/helpers'
import { db } from '@/lib/db/supabase-compat'
import {
  buildPriceHistory,
  PRO_TIMEFRAMES,
  TIMEFRAME_DAYS,
} from '@/lib/prices/history'
import type { PriceTimeframe, PriceHistoryError } from '@/components/features/prices/types'

export const revalidate = 60

function errorResponse(err: PriceHistoryError, status: number) {
  return NextResponse.json(err, { status })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const card_ref = searchParams.get('card_ref')
  const timeframeRaw = (searchParams.get('timeframe') || '30d') as PriceTimeframe

  if (!card_ref) {
    return errorResponse({ error: 'card_ref is required', code: 'MISSING_PARAMS' }, 400)
  }
  if (!(timeframeRaw in TIMEFRAME_DAYS)) {
    return errorResponse(
      { error: `invalid timeframe "${timeframeRaw}"`, code: 'MISSING_PARAMS' },
      400,
    )
  }

  // Pro gating
  if (PRO_TIMEFRAMES.includes(timeframeRaw)) {
    const userWithProfile = await getCurrentUserWithProfile()
    if (!userWithProfile?.isPro) {
      return errorResponse(
        {
          error: `timeframe "${timeframeRaw}" requires a Pro subscription`,
          code: 'PRO_REQUIRED',
        },
        403,
      )
    }
  }

  try {
    const response = await buildPriceHistory({
      supabase: db as any,
      card_ref,
      timeframe: timeframeRaw,
    })
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (err: any) {
    console.error('[api/prices/history] error:', err)
    return errorResponse(
      { error: err?.message || 'internal error', code: 'INTERNAL' },
      500,
    )
  }
}
