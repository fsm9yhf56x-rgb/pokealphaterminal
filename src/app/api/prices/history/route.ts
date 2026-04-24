/**
 * GET /api/prices/history
 *
 * Query params:
 *   - card_ref (required): the card identifier (poketrace_id-style)
 *   - timeframe (optional, default '30d'): one of 7d | 30d | 90d | 1y | all
 *
 * Pro gating:
 *   - 7d / 30d: free for all users
 *   - 90d / 1y / all: requires profile.is_pro = true
 *
 * Cache:
 *   - Edge cache: 60s (prices refresh via cron every 6h anyway)
 */

import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import {
  buildPriceHistory,
  PRO_TIMEFRAMES,
  TIMEFRAME_DAYS,
} from '@/lib/prices/history';
import type { PriceTimeframe, PriceHistoryError } from '@/components/features/prices/types';

export const revalidate = 60;

function errorResponse(err: PriceHistoryError, status: number) {
  return NextResponse.json(err, { status });
}

// Narrow helper to check if user is Pro (server-side only).
// Returns { userId, isPro } or null if not authenticated.
async function getUserPlan(
  supabase: ReturnType<typeof getServerSupabase>
): Promise<{ userId: string; isPro: boolean } | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro')
    .eq('id', user.id)
    .maybeSingle();

  return { userId: user.id, isPro: profile?.is_pro === true };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const card_ref = searchParams.get('card_ref');
  const timeframeRaw = (searchParams.get('timeframe') || '30d') as PriceTimeframe;

  // Param validation
  if (!card_ref) {
    return errorResponse({ error: 'card_ref is required', code: 'MISSING_PARAMS' }, 400);
  }
  if (!(timeframeRaw in TIMEFRAME_DAYS)) {
    return errorResponse(
      { error: `invalid timeframe "${timeframeRaw}"`, code: 'MISSING_PARAMS' },
      400
    );
  }

  const supabase = getServerSupabase();

  // Pro gating for 90d / 1y / all
  if (PRO_TIMEFRAMES.includes(timeframeRaw)) {
    const plan = await getUserPlan(supabase);
    if (!plan || !plan.isPro) {
      return errorResponse(
        {
          error: `timeframe "${timeframeRaw}" requires a Pro subscription`,
          code: 'PRO_REQUIRED',
        },
        403
      );
    }
  }

  // Build response
  try {
    const response = await buildPriceHistory({
      supabase,
      card_ref,
      timeframe: timeframeRaw,
    });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err: any) {
    console.error('[api/prices/history] error:', err);
    return errorResponse(
      { error: err?.message || 'internal error', code: 'INTERNAL' },
      500
    );
  }
}
