/**
 * API usage tracking for external rate-limited APIs (PokeTrace etc.).
 * Tracks daily call usage in the `api_usage` table.
 *
 * Used by server-side routes that consume external APIs with a daily quota.
 */

import { getAdminClient } from './db';

export const DEFAULT_DAILY_MAX = 250;

export interface Usage {
  used: number;
  max: number;
}

/**
 * Returns today's usage. Creates the row if it doesn't exist yet.
 */
export async function getUsage(): Promise<Usage> {
  const supabase = getAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from('api_usage')
    .select('*')
    .eq('date', today)
    .single();

  if (data) {
    return {
      used: data.calls_used ?? 0,
      max: data.max_calls ?? DEFAULT_DAILY_MAX,
    };
  }

  await supabase
    .from('api_usage')
    .insert({ date: today, calls_used: 0, max_calls: DEFAULT_DAILY_MAX });

  return { used: 0, max: DEFAULT_DAILY_MAX };
}

/**
 * Increments today's usage by N calls (defaults to 1).
 */
export async function incrementUsage(n = 1): Promise<void> {
  const supabase = getAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const current = await getUsage();
  await supabase
    .from('api_usage')
    .update({ calls_used: current.used + n })
    .eq('date', today);
}
