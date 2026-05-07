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
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '14px 18px',
      }}>
        <ListHeader title={title} />
        <div style={{
          padding: '24px 0', textAlign: 'center',
          fontSize: '12px', color: 'var(--ink-faint)',
        }}>
          {emptyMessage || 'Pas de données'}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '14px 0',
    }}>
      <div style={{ padding: '0 18px' }}>
        <ListHeader title={title} />
      </div>

      {holdings.map((h, i) => (
        <div
          key={h.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 18px',
            borderTop: i === 0 ? '1px solid var(--border)' : 'none',
            borderBottom: i < holdings.length - 1 ? '1px solid var(--border)' : 'none',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--ink)',
              fontFamily: 'var(--font-display)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: '2px',
            }}>{h.name}</div>
            <div style={{
              fontSize: '10px',
              color: 'var(--ink-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {h.set_name || '—'} · {h.lang}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color,
              fontFamily: 'var(--font-data, var(--font-display))',
              lineHeight: 1.1,
            }}>
              {sign}{h.roiPct.toFixed(1)}%
            </div>
            <div style={{
              fontSize: '10px',
              color,
              fontFamily: 'var(--font-data, var(--font-display))',
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
      fontSize: '10px',
      fontWeight: 600,
      color: 'var(--ink-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontFamily: 'var(--font-display)',
      marginBottom: '4px',
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

function formatEUR(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
}
