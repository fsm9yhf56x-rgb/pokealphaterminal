/**
 * Shared types for price history feature.
 * Used by both the /api/prices/history endpoint and the <PriceHistoryChart> component.
 */

export type PriceTimeframe = '7d' | '30d' | '90d' | '1y' | 'all';
export type PriceSource = 'ebay' | 'tcgplayer' | 'cardmarket' | 'poketrace';
export type PriceVariant = 'raw' | 'psa10' | 'psa9' | 'psa8' | 'bgs10' | 'bgs9.5';

/** A single data point in a time series (one bucket). */
export interface PricePoint {
  date: string;           // ISO date
  price: number;          // main value (avg of the bucket)
  low?: number | null;    // min in the bucket
  high?: number | null;   // max in the bucket
  nb_sales?: number | null;
}

/** A time series for a given (source, variant) pair. */
export interface PriceSeries {
  source: PriceSource;
  variant: PriceVariant;
  points: PricePoint[];
}

/** Top-level statistics computed server-side. */
export interface PriceStats {
  current: number | null;
  ath: { price: number; date: string } | null;
  atl: { price: number; date: string } | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
}

/** Full response shape of /api/prices/history. */
export interface PriceHistoryResponse {
  card_ref: string;
  currency: string;
  timeframe: PriceTimeframe;
  /** Detailed series, one per (source, variant) pair. Used when front toggles "SPLIT". */
  series: PriceSeries[];
  /** Pre-computed consolidated series (top_price across sources). Default render. */
  consolidated: PricePoint[];
  stats: PriceStats;
  /** True when there are not enough points to draw a meaningful chart. */
  insufficient_data: boolean;
  /** Required threshold: >= 5 points over >= 5 distinct days. */
  min_points_required: number;
  min_days_span_required: number;
  /** Total raw snapshots found (before bucketing). Useful for "2/5" progress UI. */
  raw_count: number;
  distinct_days: number;
}

/** Error shape for 4xx responses. */
export interface PriceHistoryError {
  error: string;
  code: 'MISSING_PARAMS' | 'PRO_REQUIRED' | 'INTERNAL';
}
