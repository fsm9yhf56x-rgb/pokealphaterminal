'use client'

import type { AllocAggregates } from './Allocation'

/**
 * 4 KPI cards : Top 1 / Top 5 / HHI / Diversité label
 * Snow+ minimal, lecture rapide façon dashboard financier.
 */
export function AllocConcentration({ agg }: { agg: AllocAggregates }) {
  const kpis = [
    {
      label: 'Top 1 carte',
      value: `${agg.topCardPct.toFixed(1)}%`,
      sub: agg.topHoldings[0] ? truncate(agg.topHoldings[0].name, 22) : '—',
      color: thresholdColor(agg.topCardPct, [40, 25]),  // >40% danger, >25% warn
    },
    {
      label: 'Top 5 cartes',
      value: `${agg.top5Pct.toFixed(1)}%`,
      sub: `${agg.cardsCount} carte${agg.cardsCount > 1 ? 's' : ''} au total`,
      color: thresholdColor(agg.top5Pct, [70, 50]),
    },
    {
      label: 'Indice HHI',
      value: agg.hhi.toFixed(0),
      sub: hhiHint(agg.hhi),
      color: thresholdColor(agg.hhi, [2500, 1500]),
    },
    {
      label: 'Diversification',
      value: agg.diversityLabel,
      sub: 'Score de répartition global',
      color: agg.diversityColor,
      isText: true,  // value is a label, not a number → smaller font
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
            background: 'var(--surface)',
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
            fontSize: k.isText ? '15px' : '22px',
            fontWeight: 600,
            color: k.color,
            fontFamily: 'var(--font-data, var(--font-display))',
            letterSpacing: '-0.3px',
            lineHeight: 1.15,
            marginBottom: '4px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{k.value}</div>
          <div style={{
            fontSize: '11px',
            color: 'var(--ink-muted)',
            fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{k.sub}</div>
        </div>
      ))}
    </div>
  )
}

function thresholdColor(value: number, [danger, warn]: [number, number]): string {
  if (value >= danger) return 'var(--perf-down)'
  if (value >= warn)   return 'var(--premium)'
  return 'var(--perf-up)'
}

function hhiHint(hhi: number): string {
  if (hhi < 1500)  return 'Marché diversifié'
  if (hhi < 2500)  return 'Modérément concentré'
  return 'Hautement concentré'
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
