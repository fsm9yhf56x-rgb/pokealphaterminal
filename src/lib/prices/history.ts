/**
 * Price history helper.
 * Fetches raw snapshots from `prices_snapshots`, aggregates them into adaptive buckets,
 * computes stats (ATH/ATL/variations) and a consolidated series (top_price per day).
 *
 * Bucketing strategy (adaptive):
 *   - 7d / 30d  -> bucket by day
 *   - 90d / 1y  -> bucket by week
 *   - all       -> bucket by month
 *
 * The "consolidated" series uses the MAX price across all sources for each bucket
 * (same logic as top_price in prices_v2 — the most optimistic valuation).
 */

import type {
  PriceHistoryResponse,
  PricePoint,
  PriceSeries,
  PriceStats,
  PriceTimeframe,
  PriceSource,
  PriceVariant,
} from '@/components/features/prices/types';

// ─────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────

export const MIN_POINTS_REQUIRED = 5;
export const MIN_DAYS_SPAN_REQUIRED = 5;

export const TIMEFRAME_DAYS: Record<PriceTimeframe, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
  all: null, // null => no lower bound
};

export const PRO_TIMEFRAMES: PriceTimeframe[] = ['90d', '1y', 'all'];

// ─────────────────────────────────────────────────────────────────────────
// Bucketing logic
// ─────────────────────────────────────────────────────────────────────────

type BucketUnit = 'day' | 'week' | 'month';

function bucketUnitFor(timeframe: PriceTimeframe): BucketUnit {
  if (timeframe === '7d' || timeframe === '30d') return 'day';
  if (timeframe === '90d' || timeframe === '1y') return 'week';
  return 'month';
}

function truncDate(d: Date, unit: BucketUnit): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  if (unit === 'day') return x;
  if (unit === 'week') {
    // ISO week: anchor to Monday
    const day = x.getUTCDay();
    const diff = (day === 0 ? -6 : 1) - day;
    x.setUTCDate(x.getUTCDate() + diff);
    return x;
  }
  // month
  x.setUTCDate(1);
  return x;
}

// ─────────────────────────────────────────────────────────────────────────
// Raw snapshot shape (matches prices_snapshots table columns we read)
// ─────────────────────────────────────────────────────────────────────────

interface RawSnapshot {
  card_ref: string;
  source: string;
  variant: string;
  price_avg: number | null;
  price_low: number | null;
  price_high: number | null;
  nb_sales: number | null;
  currency: string;
  fetched_at: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Aggregation
// ─────────────────────────────────────────────────────────────────────────

function aggregateSeries(rows: RawSnapshot[], unit: BucketUnit): PriceSeries[] {
  const bySeriesKey = new Map<string, RawSnapshot[]>();
  for (const r of rows) {
    const key = `${r.source}::${r.variant}`;
    const arr = bySeriesKey.get(key) || [];
    arr.push(r);
    bySeriesKey.set(key, arr);
  }

  const out: PriceSeries[] = [];
  for (const [key, snaps] of bySeriesKey) {
    const [source, variant] = key.split('::') as [PriceSource, PriceVariant];
    const byBucket = new Map<string, RawSnapshot[]>();
    for (const s of snaps) {
      const bucket = truncDate(new Date(s.fetched_at), unit).toISOString();
      const arr = byBucket.get(bucket) || [];
      arr.push(s);
      byBucket.set(bucket, arr);
    }

    const points: PricePoint[] = [];
    for (const [bucketIso, group] of byBucket) {
      const prices = group.map((g) => g.price_avg).filter((x): x is number => x != null);
      if (prices.length === 0) continue;
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const lows = group.map((g) => g.price_low).filter((x): x is number => x != null);
      const highs = group.map((g) => g.price_high).filter((x): x is number => x != null);
      const sales = group.map((g) => g.nb_sales).filter((x): x is number => x != null);
      points.push({
        date: bucketIso,
        price: Math.round(avg * 100) / 100,
        low: lows.length ? Math.min(...lows) : null,
        high: highs.length ? Math.max(...highs) : null,
        nb_sales: sales.length ? sales.reduce((a, b) => a + b, 0) : null,
      });
    }
    points.sort((a, b) => (a.date < b.date ? -1 : 1));
    out.push({ source, variant, points });
  }

  return out;
}

function buildConsolidated(series: PriceSeries[]): PricePoint[] {
  // top_price convention (matches prices_v2 VIEW):
  //   GREATEST(ebay_raw, tcgplayer_raw, cardmarket_raw)
  // PokeTrace and graded variants (psa10/psa9/etc) are NOT included.
  // This keeps the consolidated series comparable with the "Prix marché" bloc.
  const TOP_PRICE_SOURCES = new Set(['ebay', 'tcgplayer', 'cardmarket']);
  const byDate = new Map<string, PricePoint[]>();
  for (const s of series) {
    if (!TOP_PRICE_SOURCES.has(s.source)) continue;
    if (s.variant !== 'raw') continue;
    for (const p of s.points) {
      const arr = byDate.get(p.date) || [];
      arr.push(p);
      byDate.set(p.date, arr);
    }
  }

  const out: PricePoint[] = [];
  for (const [date, points] of byDate) {
    const prices = points.map((p) => p.price);
    out.push({
      date,
      price: Math.max(...prices),
      low: Math.min(...points.map((p) => p.low ?? p.price)),
      high: Math.max(...points.map((p) => p.high ?? p.price)),
      nb_sales: points.reduce((acc, p) => acc + (p.nb_sales ?? 0), 0) || null,
    });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────────────────

function computeStats(consolidated: PricePoint[]): PriceStats {
  if (consolidated.length === 0) {
    return { current: null, ath: null, atl: null, change_7d_pct: null, change_30d_pct: null };
  }

  const current = consolidated[consolidated.length - 1].price;

  let ath = consolidated[0];
  let atl = consolidated[0];
  for (const p of consolidated) {
    if (p.price > ath.price) ath = p;
    if (p.price < atl.price) atl = p;
  }

  const now = Date.now();
  const D7 = 7 * 24 * 3600 * 1000;
  const D30 = 30 * 24 * 3600 * 1000;

  const findNearest = (targetMs: number): PricePoint | null => {
    let best: PricePoint | null = null;
    let bestDiff = Infinity;
    for (const p of consolidated) {
      const diff = Math.abs(new Date(p.date).getTime() - targetMs);
      if (diff < bestDiff) {
        best = p;
        bestDiff = diff;
      }
    }
    return best;
  };

  const p7 = findNearest(now - D7);
  const p30 = findNearest(now - D30);

  const pct = (from: number | null | undefined, to: number): number | null => {
    if (from == null || from === 0) return null;
    return Math.round(((to - from) / from) * 1000) / 10;
  };

  return {
    current,
    ath: { price: ath.price, date: ath.date },
    atl: { price: atl.price, date: atl.date },
    change_7d_pct: pct(p7?.price, current),
    change_30d_pct: pct(p30?.price, current),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────

export interface BuildHistoryOptions {
  supabase: any; // SupabaseClient — typed as any to avoid import coupling
  card_ref: string;
  timeframe: PriceTimeframe;
}

export async function buildPriceHistory(
  opts: BuildHistoryOptions
): Promise<PriceHistoryResponse> {
  const { supabase, card_ref, timeframe } = opts;

  let query = supabase
    .from('prices_snapshots')
    .select('card_ref,source,variant,price_avg,price_low,price_high,nb_sales,currency,fetched_at')
    .eq('card_ref', card_ref)
    .order('fetched_at', { ascending: true });

  const days = TIMEFRAME_DAYS[timeframe];
  if (days !== null) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
    query = query.gte('fetched_at', since);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []) as RawSnapshot[];
  const currency = rows[0]?.currency || 'USD';

  const unit = bucketUnitFor(timeframe);
  const series = aggregateSeries(rows, unit);
  const consolidated = buildConsolidated(series);
  const stats = computeStats(consolidated);

  const distinctDays = new Set(
    rows.map((r) => new Date(r.fetched_at).toISOString().slice(0, 10))
  ).size;

  const insufficient =
    consolidated.length < MIN_POINTS_REQUIRED || distinctDays < MIN_DAYS_SPAN_REQUIRED;

  return {
    card_ref,
    currency,
    timeframe,
    series,
    consolidated,
    stats,
    insufficient_data: insufficient,
    min_points_required: MIN_POINTS_REQUIRED,
    min_days_span_required: MIN_DAYS_SPAN_REQUIRED,
    raw_count: rows.length,
    distinct_days: distinctDays,
  };
}
