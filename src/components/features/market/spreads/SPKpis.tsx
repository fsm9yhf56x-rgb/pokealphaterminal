'use client'

import type { SpreadSignal } from '@/lib/useSpreads'

interface Stats {
  total: number
  sCount: number
  aCount: number
  bCount: number
  avgUpside: number
  bestSignal: SpreadSignal | null
}

/**
 * 4 KPIs résumé : Total signaux · S-tier · Avg upside · Top signal.
 * Donne le pulse global du marché en un coup d'œil.
 */
export function SPKpis({
  stats, loading,
}: {
  stats: Stats
  loading: boolean
}) {
  const kpis = [
    {
      label: 'Signaux actifs',
      value: stats.total.toLocaleString('fr-FR'),
      sub: stats.total > 0 ? `Détectés sur le marché` : 'Aucun pour l\'instant',
      color: 'var(--ink)',
    },
    {
      label: 'Tier S',
      value: stats.sCount.toLocaleString('fr-FR'),
      sub: stats.sCount > 0
        ? `${((stats.sCount / Math.max(1, stats.total)) * 100).toFixed(0)}% des signaux`
        : 'Aucun signal fort',
      color: '#B8860B',  // gold
    },
    {
      label: 'Upside moyen',
      value: `+${stats.avgUpside.toLocaleString('fr-FR')}%`,
      sub: 'Sur tous les signaux',
      color: 'var(--perf-up)',
    },
    {
      label: 'Top opportunité',
      value: stats.bestSignal
        ? `+${stats.bestSignal.upside_pct.toFixed(0)}%`
        : '—',
      sub: stats.bestSignal
        ? truncate(stats.bestSignal.card_name, 24)
        : 'En attente',
      color: 'var(--accent)',
    },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '12px',
    }}>
      {kpis.map((k, i) => (
        <KpiCard
          key={i}
          label={k.label}
          value={k.value}
          sub={k.sub}
          color={k.color}
          loading={loading}
        />
      ))}
    </div>
  )
}

function KpiCard({
  label, value, sub, color, loading,
}: {
  label: string
  value: string
  sub: string
  color: string
  loading: boolean
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '14px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Loading shimmer overlay */}
      {loading && (
        <>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.04) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer-kpi 1.4s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <style>{`
            @keyframes shimmer-kpi {
              0%   { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </>
      )}

      <div style={{
        fontSize: '9px',
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: 'var(--font-display)',
        marginBottom: '6px',
      }}>{label}</div>

      <div style={{
        fontSize: '22px',
        fontWeight: 600,
        color: loading ? 'var(--ink-faint)' : color,
        fontFamily: 'var(--font-data, var(--font-display))',
        letterSpacing: '-0.4px',
        lineHeight: 1.1,
        marginBottom: '4px',
        fontVariantNumeric: 'tabular-nums',
      }}>{loading ? '—' : value}</div>

      <div style={{
        fontSize: '10px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-display)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{loading ? 'Chargement…' : sub}</div>
    </div>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
