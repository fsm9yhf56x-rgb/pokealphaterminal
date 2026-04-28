/**
 * Centralized logger for cron/sync jobs.
 * Writes to public.sync_logs table (id, job_name, started_at, finished_at, status, stats, error, triggered_by).
 *
 * Usage:
 *   const log = await startSyncLog('prices_poketrace', 'cron');
 *   try {
 *     // ... do work
 *     await finishSyncLog(log, 'success', { totalCards: 213, callsUsed: 11 });
 *   } catch (e) {
 *     await finishSyncLog(log, 'error', null, e.message);
 *   }
 */

import { getAdminClient } from './db';

export type SyncStatus = 'success' | 'error' | 'partial' | 'skipped';
export type SyncTrigger = 'cron' | 'manual' | 'event' | 'unknown';

export interface SyncLogHandle {
  id: string;
  job_name: string;
  started_at: string;
}

/**
 * Insert a "started" row in sync_logs and return the handle.
 * Returns null if logging fails — caller should NOT crash because of logging.
 */
export async function startSyncLog(
  jobName: string,
  triggeredBy: SyncTrigger = 'unknown'
): Promise<SyncLogHandle | null> {
  try {
    const supabase = getAdminClient();
    const startedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('sync_logs')
      .insert({
        job_name: jobName,
        started_at: startedAt,
        status: 'running' as any,
        triggered_by: triggeredBy,
      })
      .select('id, job_name, started_at')
      .single();

    if (error || !data) {
      console.warn('[sync-logger] startSyncLog failed (non-fatal):', error?.message);
      return null;
    }
    return data as SyncLogHandle;
  } catch (e: any) {
    console.warn('[sync-logger] startSyncLog crashed:', e?.message);
    return null;
  }
}

/**
 * Update the row with finished_at, status, stats and optional error.
 */
export async function finishSyncLog(
  handle: SyncLogHandle | null,
  status: SyncStatus,
  stats: Record<string, unknown> | null = null,
  error: string | null = null
): Promise<void> {
  if (!handle) return;
  try {
    const supabase = getAdminClient();
    const finishedAt = new Date();
    const startedAt = new Date(handle.started_at);
    const duration_ms = finishedAt.getTime() - startedAt.getTime();

    await supabase
      .from('sync_logs')
      .update({
        finished_at: finishedAt.toISOString(),
        status,
        stats: { ...(stats || {}), duration_ms },
        error,
      })
      .eq('id', handle.id);
  } catch (e: any) {
    console.warn('[sync-logger] finishSyncLog crashed:', e?.message);
  }
}

/**
 * Convenience wrapper: runs `fn`, logs start+finish automatically.
 * `fn` should return the stats object that gets stored.
 */
export async function withSyncLog<T extends Record<string, unknown>>(
  jobName: string,
  triggeredBy: SyncTrigger,
  fn: () => Promise<T>
): Promise<T> {
  const handle = await startSyncLog(jobName, triggeredBy);
  try {
    const stats = await fn();
    await finishSyncLog(handle, 'success', stats);
    return stats;
  } catch (e: any) {
    await finishSyncLog(handle, 'error', null, e?.message ?? String(e));
    throw e;
  }
}
