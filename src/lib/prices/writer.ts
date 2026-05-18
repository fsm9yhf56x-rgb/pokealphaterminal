/**
 * Unified write layer for all price snapshots.
 * Every adapter emits PriceSnapshot objects — this file writes them.
 */

import { getAdminClient } from '../db';
import { sql } from '../db/sql';
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

  // Refresh materialized view prices_latest in fire-and-forget mode.
  // Non-blocking : even if it fails, the snapshots are already persisted.
  refreshPricesLatest().catch((e) => {
    console.warn('[writeSnapshots] refresh failed (non-fatal):', e?.message);
  });
}

/**
 * Triggers a REFRESH of the prices_latest materialized view.
 * Call this after a batch of writes to update the "latest" cache.
 * CONCURRENTLY variant allows reads during refresh.
 */
export async function refreshPricesLatest(): Promise<void> {
  // Direct SQL call (server-side only). Bypasses the compat layer's rpc()
  // which doesn't proxy to Neon properly.
  try {
    await sql.query('SELECT refresh_prices_latest()', []);
  } catch (e: any) {
    console.warn('[refreshPricesLatest] failed (non-fatal):', e?.message);
  }
}
