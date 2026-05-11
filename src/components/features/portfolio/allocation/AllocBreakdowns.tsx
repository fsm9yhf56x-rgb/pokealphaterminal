'use client'

import type { AllocAggregates, AllocBucket } from './Allocation'

/**
 * 4 stacked bars : langue / ère / rareté / condition.
 * Vue analytique : où est l'argent par dimension.
 */
export function AllocBreakdowns({ agg }: { agg: AllocAggregates }) {
  return (
    <div>
      <SectionTitle>Répartition par dimension</SectionTitle>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '14px',
      }}>
        <BreakdownCard title="Par langue"    buckets={agg.byLang} />
        <BreakdownCard title="Par ère"       buckets={agg.byEra} />
        <BreakdownCard title="Par rareté"    buckets={agg.byRarity} />
        <BreakdownCard title="Par état"      buckets={agg.byCondition} />
      </div>
    </div>
  )
}

/* Snow+ data palette : ordered for visual hierarchy */
const PALETTE = [
  '#1D1D1F',  // ink dominant
  '#E03020',  // accent red
  '#1D9E75',  // perf-up
  '#D4AF37',  // premium gold
  '#6E6E73',  // ink-muted
  '#AEAEB2',  // ink-faint
  '#C7C7CC',  // border-strong
  '#E5E5EA',  // border (last)
]

function BreakdownCard({ title, buckets }: { title: string; buckets: AllocBucket[] }) {
  if (buckets.length === 0) {
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px 18px',
      }}>
        <CardTitle title={title} />
        <div style={{
          padding: '20px 0',
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--ink-faint)',
          fontFamily: 'var(--font-display)',
        }}>Pas de données</div>
      </div>
    )
  }

  const colored = buckets.map((b, i) => ({
    ...b,
    color: PALETTE[i % PALETTE.length],
  }))

  // Top bucket signals concentration
  const topPct = colored[0]?.pct || 0
  const isHighConcentration = topPct > 60

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '16px 18px',
    }}>
      <CardTitle title={title} />

      {/* Stacked bar */}
      <div style={{
        display: 'flex',
        height: '10px',
        borderRadius: '6px',
        overflow: 'hidden',
        marginBottom: '14px',
        gap: '2px',
        background: 'var(--border)',
      }}>
        {colored.map((b) => (
          <div
            key={b.label}
            title={`${b.label} : ${(b.pct ?? 0).toFixed(1)}%`}
            style={{
              width: `${Math.max(b.pct, 0.3)}%`,
              background: b.color,
              minWidth: b.pct > 1 ? undefined : '3px',
              transition: 'width 0.4s ease',
            }}
          />
        ))}
      </div>

      {/* Legend rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {colored.map((b) => (
          <div
            key={b.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '8px 1fr auto auto',
              alignItems: 'center',
              gap: '8px',
              minWidth: 0,
            }}
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              background: b.color,
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '12px',
              color: 'var(--ink)',
              fontFamily: 'var(--font-display)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{b.label}</span>
            <span style={{
              fontSize: '11px',
              color: 'var(--ink-muted)',
              fontFamily: 'var(--font-data, var(--font-display))',
              minWidth: '32px',
              textAlign: 'right',
            }}>{(b.pct ?? 0).toFixed(1)}%</span>
            <span style={{
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--ink)',
              fontFamily: 'var(--font-data, var(--font-display))',
              minWidth: '60px',
              textAlign: 'right',
            }}>{formatEURcompact(b.value)}</span>
          </div>
        ))}
      </div>

      {/* Concentration footnote */}
      {isHighConcentration && (
        <div style={{
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: '1px solid var(--border)',
          fontSize: '10px',
          color: 'var(--accent)',
          fontFamily: 'var(--font-display)',
        }}>
          ▲ Forte concentration sur "{colored[0].label}"
        </div>
      )}
    </div>
  )
}

function CardTitle({ title }: { title: string }) {
  return (
    <div style={{
      fontSize: '10px',
      fontWeight: 600,
      color: 'var(--ink-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontFamily: 'var(--font-display)',
      marginBottom: '14px',
    }}>{title}</div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      marginBottom: '12px',
    }}>
      <div style={{
        width: '5px', height: '5px',
        borderRadius: '50%',
        background: 'var(--accent)',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: '10px', fontWeight: 600,
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontFamily: 'var(--font-display)',
      }}>{children}</span>
      <div style={{
        flex: 1, height: '1px',
        background: 'linear-gradient(90deg, var(--border), transparent)',
      }} />
    </div>
  )
}

function formatEURcompact(v: number): string {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `€${(v / 1_000).toFixed(1)}K`
  return `€${(v ?? 0).toFixed(0)}`
}
