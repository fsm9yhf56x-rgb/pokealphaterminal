/**
 * Centralized queries for the admin dashboard.
 * All queries use the admin client (service_role) to bypass RLS.
 * Only call from server components after requireAdmin() has passed.
 */

import { getAdminClient } from './db';

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface SystemStats {
  totalCards: number;
  cardsWithImage: number;
  totalSets: number;
  totalPrices: number;
  totalPortfolioCards: number;
  totalUsers: number;
  coverageByLang: Array<{ lang: string; withImage: number; total: number; pct: number }>;
}

export interface SetGap {
  set_id: string;
  lang: string | null;
  set_name: string | null;
  missing: number;
  total: number;
  pct: number;
}

export interface RecentSync {
  id: string;
  job_name: string;
  status: string;
  stats: any;
  error: string | null;
  triggered_by: string | null;
  started_at: string;
  finished_at: string | null;
  duration_sec: number | null;
}

export interface PricesOverview {
  totalRows: number;
  bySource: Array<{ source: string; count: number }>;
  byTier: Array<{ tier: string; count: number }>;
  lastUpdated: string | null;
}

// ─────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────

export async function getSystemStats(): Promise<SystemStats> {
  const supa = getAdminClient();

  const [totalCards, cardsWithImage, totalSets, totalPrices, totalPortfolio, totalUsers] =
    await Promise.all([
      supa.from('tcg_cards').select('*', { count: 'exact', head: true }),
      supa.from('tcg_cards').select('*', { count: 'exact', head: true }).eq('has_image', true),
      supa.from('tcg_sets').select('*', { count: 'exact', head: true }),
      supa.from('_deprecated_prices').select('*', { count: 'exact', head: true }),
      supa.from('portfolio_cards').select('*', { count: 'exact', head: true }),
      supa.from('profiles').select('*', { count: 'exact', head: true }),
    ]);

  // Coverage by lang
  const langs = ['EN', 'FR', 'JP'] as const;
  const coverageByLang = await Promise.all(
    langs.map(async (L) => {
      const prefix = L.toLowerCase();
      const [withImage, total] = await Promise.all([
        supa
          .from('tcg_cards')
          .select('*', { count: 'exact', head: true })
          .ilike('id', `${prefix}-%`)
          .eq('has_image', true),
        supa
          .from('tcg_cards')
          .select('*', { count: 'exact', head: true })
          .ilike('id', `${prefix}-%`),
      ]);
      const t = total.count ?? 0;
      const w = withImage.count ?? 0;
      return { lang: L, withImage: w, total: t, pct: t > 0 ? (w / t) * 100 : 0 };
    })
  );

  return {
    totalCards: totalCards.count ?? 0,
    cardsWithImage: cardsWithImage.count ?? 0,
    totalSets: totalSets.count ?? 0,
    totalPrices: totalPrices.count ?? 0,
    totalPortfolioCards: totalPortfolio.count ?? 0,
    totalUsers: totalUsers.count ?? 0,
    coverageByLang,
  };
}

/**
 * Returns the N sets with the most images missing.
 */
export async function getSetsWithGaps(limit = 10): Promise<SetGap[]> {
  const supa = getAdminClient();

  // Grouper en SQL via rpc() serait plus efficace, mais on stay simple :
  // on fetch les cartes has_image=false et on groupe côté app.
  const { data: missingCards, error } = await supa
    .from('tcg_cards')
    .select('set_id, lang')
    .eq('has_image', false);

  if (error || !missingCards) return [];

  // Group by set_id
  const gapMap = new Map<string, { set_id: string; lang: string | null; missing: number }>();
  for (const card of missingCards) {
    const sid = card.set_id || 'unknown';
    const existing = gapMap.get(sid);
    if (existing) existing.missing++;
    else gapMap.set(sid, { set_id: sid, lang: card.lang, missing: 1 });
  }

  // Get total per set (pour calculer le %)
  const sets = Array.from(gapMap.values())
    .sort((a, b) => b.missing - a.missing)
    .slice(0, limit);

  // Fetch set metadata + total count for top N
  const results: SetGap[] = [];
  for (const s of sets) {
    const [{ count: total }, { data: setMeta }] = await Promise.all([
      supa.from('tcg_cards').select('*', { count: 'exact', head: true }).eq('set_id', s.set_id),
      supa.from('tcg_sets').select('name').eq('id', s.set_id).maybeSingle(),
    ]);
    const t = total ?? 0;
    results.push({
      set_id: s.set_id,
      lang: s.lang,
      set_name: setMeta?.name ?? null,
      missing: s.missing,
      total: t,
      pct: t > 0 ? (s.missing / t) * 100 : 0,
    });
  }

  return results;
}

/**
 * Returns the N most recent sync runs (any status).
 */
export async function getRecentSyncs(limit = 20): Promise<RecentSync[]> {
  const supa = getAdminClient();
  const { data, error } = await supa
    .from('sync_logs')
    .select('id, job_name, status, stats, error, triggered_by, started_at, finished_at')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((r) => {
    let duration: number | null = null;
    if (r.started_at && r.finished_at) {
      duration = Math.round(
        (new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000
      );
    }
    return {
      id: r.id,
      job_name: r.job_name,
      status: r.status,
      stats: r.stats,
      error: r.error,
      triggered_by: r.triggered_by,
      started_at: r.started_at,
      finished_at: r.finished_at,
      duration_sec: duration,
    };
  });
}

export async function getPricesOverview(): Promise<PricesOverview> {
  const supa = getAdminClient();

  const [totalRows, priceRows, lastRow] = await Promise.all([
    supa.from('_deprecated_prices').select('*', { count: 'exact', head: true }),
    supa.from('_deprecated_prices').select('source, tier').limit(5000),
    supa
      .from('_deprecated_prices')
      .select('fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const bySourceMap = new Map<string, number>();
  const byTierMap = new Map<string, number>();
  for (const p of priceRows.data || []) {
    const s = p.source || 'unknown';
    bySourceMap.set(s, (bySourceMap.get(s) || 0) + 1);
    const t = p.tier || 'unknown';
    byTierMap.set(t, (byTierMap.get(t) || 0) + 1);
  }

  return {
    totalRows: totalRows.count ?? 0,
    bySource: Array.from(bySourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    byTier: Array.from(byTierMap.entries())
      .map(([tier, count]) => ({ tier, count }))
      .sort((a, b) => b.count - a.count),
    lastUpdated: lastRow.data?.fetched_at ?? null,
  };
}
