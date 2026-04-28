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
    />
  )
}
