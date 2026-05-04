/**
 * Unified write layer for all price snapshots.
 * Every adapter emits PriceSnapshot objects — this file writes them.
 */

import { getAdminClient } from '../db';
import type { Database } from '../db/schema';
import type { PriceSnapshot } from './types';

type Json = Database['public']['Tables']['prices_snapshots']['Insert']['source_meta'];

/**
 * Inserts snapshots into prices_snapshots.
 *
 * - Accepts any number of snapshots in one call
 * - Fills currency='EUR' and fetched_at=now() if missing
 * - Throws on error (caller decides how to handle)
 */
export async function writeSnapshots(snapshots: PriceSnapshot[]): Promise<void> {
  if (snapshots.length === 0) return;

  const supabase = getAdminClient();

  const rows = snapshots.map((s) => ({
    card_ref: s.card_ref,
    source: s.source,
    variant: s.variant,
    condition: s.condition ?? null,
    lang: s.lang ?? null,
    price_avg: s.price_avg ?? null,
    price_low: s.price_low ?? null,
    price_high: s.price_high ?? null,
    price_median: s.price_median ?? null,
    nb_sales: s.nb_sales ?? null,
    period_days: s.period_days ?? null,
    currency: s.currency ?? 'EUR',
    source_meta: (s.source_meta ?? null) as Json,
    fetched_at: s.fetched_at?.toISOString() ?? new Date().toISOString(),
  }));

  // 'as any': la colonne 'condition' n'est pas encore reflétée dans les types
  // Supabase générés. À régénérer avec: npx supabase gen types typescript
  const { error } = await supabase.from('prices_snapshots').insert(rows as any);
  if (error) {
    throw new Error(`writeSnapshots failed: ${error.message}`);
  }
}

/**
 * Triggers a REFRESH of the prices_latest materialized view.
 * Call this after a batch of writes to update the "latest" cache.
 * CONCURRENTLY variant allows reads during refresh.
 */
export async function refreshPricesLatest(): Promise<void> {
  const supabase = getAdminClient();
  // Note: `CONCURRENTLY` requires the unique index we already created.
  const { error } = await supabase.rpc('refresh_prices_latest');
  if (error) {
    // Fallback: no RPC function yet, just log for now
    console.warn('refresh_prices_latest RPC not found — create it in SQL if needed:', error.message);
  }
}
