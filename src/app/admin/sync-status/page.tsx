import { requireAdmin } from '@/lib/auth-admin'
import { getAdminClient } from '@/lib/db'
import SyncStatusClient from './SyncStatusClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function SyncStatusPage() {
  const user = await requireAdmin()
  const supabase = getAdminClient()

  // ── Last 7 days of logs ──
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: logs7d } = await supabase
    .from('sync_logs')
    .select('id, job_name, started_at, finished_at, status, stats, error, triggered_by')
    .gte('started_at', sevenDaysAgo)
    .order('started_at', { ascending: false })
    .limit(2000)

  const allLogs = logs7d || []

  // ── Group jobs by family ──
  // psa_pop_xxx → "PSA Pop", prices_xxx → "Prices", artofpkm_xxx → "ArtOfPkm"
  const jobFamily = (jobName: string): string => {
    if (jobName.startsWith('psa_pop_')) return 'PSA Pop'
    if (jobName.startsWith('prices_')) return 'Prices'
    if (jobName.startsWith('artofpkm_')) return 'ArtOfPkm'
    if (jobName.startsWith('tcgdex_')) return 'TCGdex'
    if (jobName.startsWith('catalog_')) return 'Catalog'
    return 'Other'
  }

  // ── Stats per job_name ──
  type JobStats = {
    jobName: string
    family: string
    totalRuns: number
    successRuns: number
    errorRuns: number
    partialRuns: number
    avgDurationMs: number
    lastRun: string | null
    lastStatus: string | null
    lastError: string | null
    lastStats: any
  }

  const byJob = new Map<string, JobStats>()
  for (const log of allLogs) {
    const k = log.job_name
    if (!byJob.has(k)) {
      byJob.set(k, {
        jobName: k,
        family: jobFamily(k),
        totalRuns: 0,
        successRuns: 0,
        errorRuns: 0,
        partialRuns: 0,
        avgDurationMs: 0,
        lastRun: null,
        lastStatus: null,
        lastError: null,
        lastStats: null,
      })
    }
    const j = byJob.get(k)!
    j.totalRuns++
    if (log.status === 'success') j.successRuns++
    else if (log.status === 'error') j.errorRuns++
    else if (log.status === 'partial') j.partialRuns++

    const dur = (log.stats as any)?.duration_ms
    if (typeof dur === 'number') {
      j.avgDurationMs = (j.avgDurationMs * (j.totalRuns - 1) + dur) / j.totalRuns
    }

    if (!j.lastRun || log.started_at > j.lastRun) {
      j.lastRun = log.started_at
      j.lastStatus = log.status
      j.lastError = log.error
      j.lastStats = log.stats
    }
  }

  const jobs = Array.from(byJob.values()).sort((a, b) => {
    // Sort: recent failures first, then by family, then by last run desc
    if (a.lastStatus === 'error' && b.lastStatus !== 'error') return -1
    if (b.lastStatus === 'error' && a.lastStatus !== 'error') return 1
    if (a.family !== b.family) return a.family.localeCompare(b.family)
    return (b.lastRun || '').localeCompare(a.lastRun || '')
  })

  // ── Global KPIs ──
  const successRate7d = allLogs.length
    ? Math.round((allLogs.filter(l => l.status === 'success').length / allLogs.length) * 100)
    : 0

  const last24h = allLogs.filter(l => {
    const age = Date.now() - new Date(l.started_at).getTime()
    return age < 24 * 60 * 60 * 1000
  })

  // Latest run across all jobs
  const latestRun = allLogs[0]

  // ── PokeTrace API usage today ──
  const today = new Date().toISOString().slice(0, 10)
  const { data: usage } = await supabase
    .from('api_usage')
    .select('*')
    .eq('date', today)
    .single()

  // ── Coverage Prix : stats agrégées des prix multi-source ──
  const { count: totalCardsInDb } = await supabase
    .from('tcg_cards')
    .select('*', { count: 'exact', head: true })

  const { count: pricesV2Count } = await supabase
    .from('prices_v2')
    .select('*', { count: 'exact', head: true })
    .not('top_price', 'is', null)

  // Conditions stats
  const { count: conditionsTotalRows } = await (supabase as any)
    .from('prices_v2_by_condition')
    .select('*', { count: 'exact', head: true })

  const { data: conditionsBreakdown } = await (supabase as any)
    .from('prices_v2_by_condition')
    .select('card_ref, source, condition')
    .limit(10000)

  const conditionsCardsSet = new Set<string>()
  const conditionsBySource: Record<string, number> = {}
  const conditionsByCondition: Record<string, number> = {}
  for (const row of (conditionsBreakdown || []) as any[]) {
    conditionsCardsSet.add(row.card_ref)
    conditionsBySource[row.source] = (conditionsBySource[row.source] || 0) + 1
    conditionsByCondition[row.condition] = (conditionsByCondition[row.condition] || 0) + 1
  }

  // Latest condition snapshot (freshness check)
  const { data: latestConditionRow } = await (supabase as any)
    .from('prices_v2_by_condition')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Coverage by source (poketrace, ebay, tcgdex, cardmarket)
  const { data: sourceBreakdown } = await supabase
    .from('prices_v2')
    .select('source')
    .not('top_price', 'is', null)
    .limit(50000)

  const coverageBySource: Record<string, number> = {}
  for (const row of (sourceBreakdown || []) as any[]) {
    coverageBySource[row.source] = (coverageBySource[row.source] || 0) + 1
  }

  return (
    <SyncStatusClient
      userEmail={user?.email || ''}
      jobs={jobs}
      logs={allLogs.slice(0, 50)}
      kpis={{
        totalJobs: jobs.length,
        runs24h: last24h.length,
        successRate7d,
        latestRunAt: latestRun?.started_at || null,
        latestRunJob: latestRun?.job_name || null,
        latestRunStatus: latestRun?.status || null,
      }}
      apiUsage={{
        used: usage?.calls_used ?? 0,
        max: usage?.max_calls ?? 250,
        date: today,
      }}
      coverage={{
        totalCardsInDb: totalCardsInDb ?? 0,
        cardsWithPrice: pricesV2Count ?? 0,
        coveragePct: totalCardsInDb ? Math.round((pricesV2Count ?? 0) / totalCardsInDb * 100) : 0,
        conditionsTotalRows: conditionsTotalRows ?? 0,
        conditionsCards: conditionsCardsSet.size,
        conditionsBySource,
        conditionsByCondition,
        latestConditionAt: (latestConditionRow as any)?.fetched_at ?? null,
        coverageBySource,
      }}
    />
  )
}
