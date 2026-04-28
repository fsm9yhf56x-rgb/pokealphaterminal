'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

// ─────────────────────────────────────────────────────────────
// Snow+ design tokens (inline for /admin convention)
// ─────────────────────────────────────────────────────────────
const tokens = {
  bg: '#FFFFFF',
  surface: '#F5F5F7',
  border: '#E5E5EA',
  borderStrong: '#C7C7CC',
  ink: '#1D1D1F',
  muted: '#6E6E73',
  mutedSoft: '#86868B',
  accent: '#E03020',
  green: '#2E7D32',
  amber: '#F59E0B',
  red: '#DC2626',
  fontDisplay: 'var(--font-sora), -apple-system, BlinkMacSystemFont, sans-serif',
  fontBody: 'var(--font-dm), system-ui, sans-serif',
  fontMono: 'var(--font-data), var(--font-mono), ui-monospace, monospace',
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface JobStats {
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

interface SyncLog {
  id: string
  job_name: string
  started_at: string
  finished_at: string | null
  status: string
  stats: any
  error: string | null
  triggered_by: string | null
}

interface Props {
  userEmail: string
  jobs: JobStats[]
  logs: SyncLog[]
  kpis: {
    totalJobs: number
    runs24h: number
    successRate7d: number
    latestRunAt: string | null
    latestRunJob: string | null
    latestRunStatus: string | null
  }
  apiUsage: { used: number; max: number; date: string }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function fmtDuration(ms: number): string {
  if (!ms || isNaN(ms)) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

function statusColor(status: string | null): string {
  switch (status) {
    case 'success': return tokens.green
    case 'partial': return tokens.amber
    case 'error': return tokens.red
    case 'cancelled': return tokens.mutedSoft
    case 'running': return '#3B82F6'
    default: return tokens.muted
  }
}

function statusDot(status: string | null) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8, height: 8, borderRadius: '50%',
        background: statusColor(status),
        marginRight: 6,
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function SyncStatusClient(props: Props) {
  const { userEmail, jobs, logs, kpis, apiUsage } = props
  const [familyFilter, setFamilyFilter] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null)
  const [running, setRunning] = useState<string | null>(null)

  const families = useMemo(() => {
    return ['all', ...Array.from(new Set(jobs.map(j => j.family))).sort()]
  }, [jobs])

  const filteredJobs = useMemo(() => {
    if (familyFilter === 'all') return jobs
    return jobs.filter(j => j.family === familyFilter)
  }, [jobs, familyFilter])

  const usagePct = Math.round((apiUsage.used / Math.max(apiUsage.max, 1)) * 100)
  const usageColor = usagePct >= 80 ? tokens.red : usagePct >= 50 ? tokens.amber : tokens.green

  async function runNow(jobName: string) {
    setRunning(jobName)
    try {
      // Map job_name → API route
      const routeMap: Record<string, { url: string; method: 'GET' | 'POST' }> = {
        prices_poketrace_cron: { url: '/api/cron/prices', method: 'GET' },
        prices_poketrace_sync: { url: '/api/prices/sync', method: 'POST' },
        prices_tcgdex_en: { url: '/api/prices/tcgdex?lang=en', method: 'GET' },
        prices_tcgdex_fr: { url: '/api/prices/tcgdex?lang=fr', method: 'GET' },
      }
      const target = routeMap[jobName]
      if (!target) {
        alert(`No "Run now" mapping for job: ${jobName}`)
        return
      }
      const res = await fetch(target.url, {
        method: target.method,
        headers: { 'Content-Type': 'application/json' },
        body: target.method === 'POST' ? JSON.stringify({}) : undefined,
      })
      const json = await res.json().catch(() => ({}))
      alert(`${target.method} ${target.url}\n\nHTTP ${res.status}\n\n${JSON.stringify(json, null, 2).slice(0, 800)}`)
      // Refresh page to show new log
      setTimeout(() => window.location.reload(), 1500)
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setRunning(null)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.bg,
      fontFamily: tokens.fontBody,
      color: tokens.ink,
      padding: '24px',
      maxWidth: 1280,
      margin: '0 auto',
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: tokens.fontDisplay, fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: '-0.02em' }}>
            Sync Status
          </h1>
          <p style={{ fontSize: 13, color: tokens.muted, margin: '4px 0 0' }}>
            Live monitoring of all background jobs · last 7 days
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: tokens.muted }}>
          <Link href="/admin" style={{ color: tokens.accent, textDecoration: 'none' }}>← Back to Admin</Link>
          <span>{userEmail}</span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
        marginBottom: 32,
      }}>
        <Kpi
          label="Active jobs"
          value={kpis.totalJobs.toString()}
          sub="distinct job names"
        />
        <Kpi
          label="Runs (24h)"
          value={kpis.runs24h.toString()}
          sub="executions"
        />
        <Kpi
          label="Success rate (7d)"
          value={`${kpis.successRate7d}%`}
          sub="all jobs"
          accent={kpis.successRate7d >= 95 ? tokens.green : kpis.successRate7d >= 80 ? tokens.amber : tokens.red}
        />
        <Kpi
          label="Latest run"
          value={kpis.latestRunAt ? relativeTime(kpis.latestRunAt) : '—'}
          sub={kpis.latestRunJob || ''}
          accent={statusColor(kpis.latestRunStatus)}
        />
      </div>

      {/* ── PokeTrace API usage ── */}
      <div style={{
        background: tokens.surface,
        border: `1px solid ${tokens.border}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>PokeTrace API usage · {apiUsage.date}</span>
          <span style={{ fontFamily: tokens.fontMono, fontSize: 13, color: usageColor }}>
            {apiUsage.used} / {apiUsage.max} ({usagePct}%)
          </span>
        </div>
        <div style={{ background: tokens.border, borderRadius: 6, height: 8, overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(usagePct, 100)}%`,
            height: '100%',
            background: usageColor,
            transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {/* ── Family filter pills ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {families.map(f => (
          <button
            key={f}
            onClick={() => setFamilyFilter(f)}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontFamily: tokens.fontBody,
              border: `1px solid ${familyFilter === f ? tokens.ink : tokens.border}`,
              background: familyFilter === f ? tokens.ink : tokens.bg,
              color: familyFilter === f ? tokens.bg : tokens.ink,
              borderRadius: 999,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {f === 'all' ? 'All families' : f}
            <span style={{ marginLeft: 6, color: familyFilter === f ? tokens.mutedSoft : tokens.muted, fontSize: 11 }}>
              {f === 'all' ? jobs.length : jobs.filter(j => j.family === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Jobs Table ── */}
      <div style={{
        background: tokens.bg,
        border: `1px solid ${tokens.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 32,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 100px 110px 110px 110px 110px',
          padding: '12px 16px',
          background: tokens.surface,
          borderBottom: `1px solid ${tokens.border}`,
          fontSize: 12,
          fontWeight: 600,
          color: tokens.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          <div>Job</div>
          <div style={{ textAlign: 'right' }}>Last run</div>
          <div style={{ textAlign: 'right' }}>Avg duration</div>
          <div style={{ textAlign: 'right' }}>Runs (7d)</div>
          <div style={{ textAlign: 'right' }}>Success</div>
          <div style={{ textAlign: 'right' }}>Action</div>
        </div>
        {filteredJobs.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: tokens.muted, fontSize: 14 }}>
            No jobs in this family yet
          </div>
        )}
        {filteredJobs.map(job => {
          const successPct = job.totalRuns > 0
            ? Math.round((job.successRuns / job.totalRuns) * 100)
            : 0
          const canRun = ['prices_poketrace_cron', 'prices_poketrace_sync', 'prices_tcgdex_en', 'prices_tcgdex_fr'].includes(job.jobName)

          return (
            <div
              key={job.jobName}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 110px 110px 110px 110px',
                padding: '12px 16px',
                borderBottom: `1px solid ${tokens.border}`,
                fontSize: 13,
                alignItems: 'center',
              }}
            >
              <div>
                {statusDot(job.lastStatus)}
                <span style={{ fontFamily: tokens.fontMono, fontSize: 12 }}>{job.jobName}</span>
                <span style={{
                  marginLeft: 8,
                  fontSize: 10,
                  padding: '2px 6px',
                  background: tokens.surface,
                  border: `1px solid ${tokens.border}`,
                  borderRadius: 4,
                  color: tokens.muted,
                }}>
                  {job.family}
                </span>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: tokens.muted }}>
                {relativeTime(job.lastRun)}
              </div>
              <div style={{ textAlign: 'right', fontFamily: tokens.fontMono, fontSize: 12 }}>
                {fmtDuration(job.avgDurationMs)}
              </div>
              <div style={{ textAlign: 'right', fontFamily: tokens.fontMono, fontSize: 12 }}>
                {job.totalRuns}
              </div>
              <div style={{ textAlign: 'right', fontFamily: tokens.fontMono, fontSize: 12, color: statusColor(successPct >= 95 ? 'success' : successPct >= 80 ? 'partial' : 'error') }}>
                {successPct}%
              </div>
              <div style={{ textAlign: 'right' }}>
                {canRun ? (
                  <button
                    onClick={() => runNow(job.jobName)}
                    disabled={running === job.jobName}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      border: `1px solid ${tokens.border}`,
                      background: running === job.jobName ? tokens.surface : tokens.bg,
                      borderRadius: 6,
                      cursor: running === job.jobName ? 'wait' : 'pointer',
                      color: tokens.ink,
                      fontFamily: tokens.fontBody,
                    }}
                  >
                    {running === job.jobName ? 'Running…' : '⚡ Run'}
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: tokens.mutedSoft }}>—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Recent logs ── */}
      <h2 style={{ fontFamily: tokens.fontDisplay, fontSize: 20, fontWeight: 600, margin: '0 0 12px' }}>
        Recent runs
      </h2>
      <div style={{
        background: tokens.bg,
        border: `1px solid ${tokens.border}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {logs.map(log => {
          const dur = (log.stats as any)?.duration_ms
          return (
            <button
              key={log.id}
              onClick={() => setSelectedLog(log)}
              style={{
                display: 'grid',
                gridTemplateColumns: '20px 1fr 120px 80px 80px',
                padding: '10px 16px',
                borderBottom: `1px solid ${tokens.border}`,
                fontSize: 12,
                alignItems: 'center',
                width: '100%',
                background: tokens.bg,
                border: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: tokens.fontBody,
                color: tokens.ink,
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = tokens.surface }}
              onMouseLeave={(e) => { e.currentTarget.style.background = tokens.bg }}
            >
              <div>{statusDot(log.status)}</div>
              <div style={{ fontFamily: tokens.fontMono }}>{log.job_name}</div>
              <div style={{ color: tokens.muted, textAlign: 'right' }}>
                {new Date(log.started_at).toLocaleString('fr', { dateStyle: 'short', timeStyle: 'medium' })}
              </div>
              <div style={{ fontFamily: tokens.fontMono, color: tokens.muted, textAlign: 'right' }}>
                {fmtDuration(dur)}
              </div>
              <div style={{ fontSize: 10, color: tokens.muted, textAlign: 'right' }}>
                {log.triggered_by || '—'}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Log detail drawer ── */}
      {selectedLog && (
        <div
          onClick={() => setSelectedLog(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 50,
            display: 'flex', justifyContent: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 520,
              maxWidth: '100vw',
              height: '100vh',
              background: tokens.bg,
              padding: 24,
              overflowY: 'auto',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
            }}
          >
            <button
              onClick={() => setSelectedLog(null)}
              style={{
                fontSize: 14, padding: '4px 10px',
                border: `1px solid ${tokens.border}`,
                background: tokens.bg,
                borderRadius: 6, cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              ✕ Close
            </button>
            <h3 style={{ fontFamily: tokens.fontDisplay, fontSize: 18, margin: '0 0 4px' }}>
              {selectedLog.job_name}
            </h3>
            <div style={{ fontSize: 12, color: tokens.muted, marginBottom: 16 }}>
              {statusDot(selectedLog.status)}
              <span style={{ color: statusColor(selectedLog.status), fontWeight: 500 }}>
                {selectedLog.status}
              </span>
              {' · '}
              {new Date(selectedLog.started_at).toLocaleString('fr')}
            </div>
            <Field label="Triggered by" value={selectedLog.triggered_by || '—'} />
            <Field label="Started" value={new Date(selectedLog.started_at).toLocaleString('fr')} />
            <Field label="Finished" value={selectedLog.finished_at ? new Date(selectedLog.finished_at).toLocaleString('fr') : '—'} />
            <Field label="Duration" value={fmtDuration((selectedLog.stats as any)?.duration_ms)} />
            {selectedLog.error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                padding: 12,
                margin: '12px 0',
                fontSize: 12,
                fontFamily: tokens.fontMono,
                color: '#991B1B',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {selectedLog.error}
              </div>
            )}
            <div style={{ fontSize: 11, color: tokens.muted, marginTop: 16, marginBottom: 4 }}>STATS</div>
            <pre style={{
              background: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: 8,
              padding: 12,
              fontSize: 11,
              fontFamily: tokens.fontMono,
              overflowX: 'auto',
              margin: 0,
            }}>
              {JSON.stringify(selectedLog.stats, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────
function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: tokens.bg,
      border: `1px solid ${tokens.border}`,
      borderRadius: 12,
      padding: 16,
    }}>
      <div style={{ fontSize: 11, color: tokens.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{
        fontFamily: tokens.fontDisplay,
        fontSize: 28,
        fontWeight: 600,
        color: accent || tokens.ink,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: tokens.muted, marginTop: 4, fontFamily: tokens.fontMono }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${tokens.border}`, fontSize: 12 }}>
      <span style={{ color: tokens.muted }}>{label}</span>
      <span style={{ fontFamily: tokens.fontMono }}>{value}</span>
    </div>
  )
}
