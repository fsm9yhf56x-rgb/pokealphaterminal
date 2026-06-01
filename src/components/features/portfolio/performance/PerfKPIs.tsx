'use client'

import type { PerfAggregates } from './Performance'

/**
 * 4 KPI cards Snow+ : Valeur totale, Gain, ROI, Cards count
 */
export function PerfKPIs({ agg }: { agg: PerfAggregates }) {
  const isUp = agg.totalGain >= 0
  const trendColor = isUp ? 'var(--perf-up)' : 'var(--perf-down)'
  const trendBg    = isUp ? 'var(--perf-up-soft)' : 'var(--perf-down-soft)'
  const sign       = isUp ? '+' : ''

  const kpis = [
    {
      label: 'Valeur portfolio',
      value: formatEUR(agg.totalValue),
      sub: `Coût d'acquisition: ${formatEUR(agg.totalCost)}`,
      color: 'var(--ink)',
      bg: 'var(--surface)',
    },
    {
      label: 'Gain / perte',
      value: `${sign}${formatEUR(agg.totalGain)}`,
      sub: agg.totalCost > 0 ? `${sign}${agg.totalROI.toFixed(1)}% global` : 'N/A',
      color: trendColor,
      bg: trendBg,
    },
    {
      label: 'ROI moyen',
      value: agg.totalCost > 0 ? `${sign}${agg.totalROI.toFixed(1)}%` : '—',
      sub: 'Sur l\'ensemble du portefeuille',
      color: trendColor,
      bg: 'var(--surface)',
    },
    {
      label: 'Top performer',
      value: agg.bestPerformer ? `+${agg.bestPerformer.roiPct.toFixed(0)}%` : '—',
      sub: agg.bestPerformer ? truncate(agg.bestPerformer.name, 22) : 'N/A',
      color: 'var(--premium)',
      bg: 'var(--surface)',
    },
  ]

  return (
    <>
      <style>{`
        .perf-kpi:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
        }
      `}</style>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: 14,
      }}>
      {kpis.map((k, i) => (
        <div
          key={i}
          className="perf-kpi"
          style={{
            background: 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(14px) saturate(180%)',
            WebkitBackdropFilter: 'blur(14px) saturate(180%)',
            border: '1px solid rgba(0,0,0,0.05)',
            borderRadius: 14,
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
            transition: 'all .3s cubic-bezier(.2,.85,.3,1)',
          }}
        >
          <div style={{
            fontSize: 9.5,
            color: '#86868B',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            fontWeight: 600,
            marginBottom: 10,
          }}>{k.label}</div>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: k.color,
            fontFamily: 'var(--font-data, "Space Mono", monospace)',
            letterSpacing: '-0.5px',
            lineHeight: 1.1,
            marginBottom: 5,
          }}>{k.value}</div>
          <div style={{
            fontSize: 11,
            color: '#86868B',
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
          }}>{k.sub}</div>
        </div>
      ))}
      </div>
    </>
  )
}

function formatEUR(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
