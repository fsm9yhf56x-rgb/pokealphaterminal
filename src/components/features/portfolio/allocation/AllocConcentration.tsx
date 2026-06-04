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
      value: `${Number(agg.topCardPct ?? 0).toFixed(1)}%`,
      sub: agg.topHoldings[0] ? truncate(agg.topHoldings[0].name, 22) : '—',
      color: thresholdColor(agg.topCardPct, [40, 25]),  // >40% danger, >25% warn
    },
    {
      label: 'Top 5 cartes',
      value: `${Number(agg.top5Pct ?? 0).toFixed(1)}%`,
      sub: `${agg.cardsCount} carte${agg.cardsCount > 1 ? 's' : ''} au total`,
      color: thresholdColor(agg.top5Pct, [70, 50]),
    },
    {
      label: 'Indice HHI',
      value: Number(agg.hhi ?? 0).toFixed(0),
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
    <>
      <style>{`
        .alloc-kpi-grid { grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; }
        .alloc-conc-kpi:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
        }
        @media (max-width: 640px) {
          .alloc-kpi-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
          .alloc-kpi-val-text { font-size: 13.5px !important; }
        }
      `}</style>
      <div className="alloc-kpi-grid" style={{ display: 'grid' }}>
        {kpis.map((k, i) => (
          <div
            key={i}
            className="alloc-conc-kpi"
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
            <div
              className={k.isText ? 'alloc-kpi-val-text' : undefined}
              style={{
              fontSize: k.isText ? 16 : 24,
              fontWeight: 700,
              color: k.color,
              fontFamily: 'var(--font-data, "Space Mono", monospace)',
              letterSpacing: '-0.3px',
              lineHeight: 1.15,
              marginBottom: 5,
              whiteSpace: k.isText ? 'normal' : 'nowrap',
              overflow: k.isText ? 'visible' : 'hidden',
              textOverflow: k.isText ? 'clip' : 'ellipsis',
            }}>{k.value}</div>
            <div style={{
              fontSize: 11,
              color: '#86868B',
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{k.sub}</div>
          </div>
        ))}
      </div>
    </>
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
