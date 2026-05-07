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
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '12px',
    }}>
      {kpis.map((k, i) => (
        <div
          key={i}
          style={{
            background: k.bg,
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px 18px',
          }}
        >
          <div style={{
            fontSize: '9px',
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: 'var(--font-display)',
            marginBottom: '8px',
          }}>{k.label}</div>
          <div style={{
            fontSize: '22px',
            fontWeight: 600,
            color: k.color,
            fontFamily: 'var(--font-data, var(--font-display))',
            letterSpacing: '-0.5px',
            lineHeight: 1.1,
            marginBottom: '4px',
          }}>{k.value}</div>
          <div style={{
            fontSize: '11px',
            color: 'var(--ink-muted)',
            fontFamily: 'var(--font-display)',
          }}>{k.sub}</div>
        </div>
      ))}
    </div>
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
