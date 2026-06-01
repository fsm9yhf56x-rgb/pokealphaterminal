'use client'

import type { PerfAggregates, EnrichedHolding } from './Performance'

/**
 * Top 5 hausse / Top 5 baisse côte à côte (Snow+ split UI)
 */
export function PerfMovers({ agg }: { agg: PerfAggregates }) {
  if (agg.topGainers.length === 0 && agg.topLosers.length === 0) {
    return null
  }

  return (
    <div>
      <SectionTitle>Top movers</SectionTitle>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '14px',
      }}>
        <MoversList
          title="Plus fortes hausses"
          holdings={agg.topGainers}
          variant="up"
        />
        <MoversList
          title="Plus fortes baisses"
          holdings={agg.topLosers.filter(h => h.roiPct < 0)}
          variant="down"
          emptyMessage="Aucune carte en perte"
        />
      </div>
    </div>
  )
}

function MoversList({
  title, holdings, variant, emptyMessage,
}: {
  title: string
  holdings: EnrichedHolding[]
  variant: 'up' | 'down'
  emptyMessage?: string
}) {
  const color = variant === 'up' ? 'var(--perf-up)' : 'var(--perf-down)'
  const sign = variant === 'up' ? '+' : ''

  if (holdings.length === 0) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: 14,
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
      }}>
        <ListHeader title={title} />
        <div style={{
          padding: '24px 0', textAlign: 'center',
          fontSize: 12.5, color: '#AEAEB2',
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
        }}>
          {emptyMessage || 'Pas de données'}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.65)',
      backdropFilter: 'blur(14px) saturate(180%)',
      WebkitBackdropFilter: 'blur(14px) saturate(180%)',
      border: '1px solid rgba(0,0,0,0.05)',
      borderRadius: 14,
      padding: '16px 0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
    }}>
      <div style={{ padding: '0 20px' }}>
        <ListHeader title={title} />
      </div>

      {holdings.map((h, i) => (
        <div
          key={h.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            alignItems: 'center',
            gap: 12,
            padding: '12px 20px',
            borderTop: i === 0 ? '1px solid rgba(0,0,0,0.05)' : 'none',
            borderBottom: i < holdings.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
            transition: 'background .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: '#1D1D1F',
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: 3,
            }}>{h.name}</div>
            <div style={{
              fontSize: 10.5,
              color: '#86868B',
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {h.set_name || '—'} · {h.lang}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 14.5,
              fontWeight: 700,
              color,
              fontFamily: 'var(--font-data, "Space Mono", monospace)',
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
            }}>
              {sign}{h.roiPct.toFixed(1)}%
            </div>
            <div style={{
              fontSize: 10.5,
              color,
              fontFamily: 'var(--font-data, "Space Mono", monospace)',
              opacity: 0.85,
              marginTop: 2,
            }}>
              {sign}{formatEUR(h.gain)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ListHeader({ title }: { title: string }) {
  return (
    <div style={{
      fontSize: 10.5,
      fontWeight: 700,
      color: '#86868B',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontFamily: 'var(--font-sora, Sora, sans-serif)',
      marginBottom: 6,
    }}>{title}</div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 14,
    }}>
      <div style={{
        width: 5, height: 5,
        borderRadius: '50%',
        background: '#C42E1F',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 10.5, fontWeight: 600,
        color: '#86868B',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
      }}>{children}</span>
      <div style={{
        flex: 1, height: 1,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.06), transparent)',
      }} />
    </div>
  )
}

function formatEUR(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
}
