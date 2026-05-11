'use client'

import type { AllocAggregates, AllocHolding } from './Allocation'

/**
 * Top 10 holdings classés par valeur absolue.
 * Vue "qui pèse le plus" avec barre de progression visuelle.
 */
export function AllocTopHoldings({ agg }: { agg: AllocAggregates }) {
  if (agg.topHoldings.length === 0) return null

  // Max weight for normalizing the bar widths
  const maxWeight = agg.topHoldings[0]?.weightPct || 1

  return (
    <div>
      <SectionTitle>
        Top {agg.topHoldings.length} cartes par poids
      </SectionTitle>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {agg.topHoldings.map((h, i) => (
          <Row
            key={h.id}
            holding={h}
            rank={i + 1}
            maxWeight={maxWeight}
            isLast={i === agg.topHoldings.length - 1}
          />
        ))}
      </div>

      {/* Footer hint */}
      <div style={{
        marginTop: '8px',
        fontSize: '10px',
        color: 'var(--ink-faint)',
        fontFamily: 'var(--font-display)',
        textAlign: 'right',
      }}>
        {agg.topHoldings.length < agg.cardsCount
          ? `Affichage du top ${agg.topHoldings.length} sur ${agg.cardsCount} cartes`
          : `${agg.cardsCount} carte${agg.cardsCount > 1 ? 's' : ''} au total`}
      </div>
    </div>
  )
}

function Row({
  holding, rank, maxWeight, isLast,
}: {
  holding: AllocHolding
  rank: number
  maxWeight: number
  isLast: boolean
}) {
  const isUp = holding.gain >= 0
  const trendColor = isUp ? 'var(--perf-up)' : 'var(--perf-down)'
  const sign = isUp ? '+' : ''
  const hasNoBuy = holding.buy_price == null || holding.buy_price === 0
  const barWidthPct = maxWeight > 0 ? (holding.weightPct / maxWeight) * 100 : 0

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr auto auto',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 18px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.015)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Rank */}
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        color: rank <= 3 ? 'var(--accent)' : 'var(--ink-faint)',
        fontFamily: 'var(--font-data, var(--font-display))',
        textAlign: 'center',
      }}>
        {rank.toString().padStart(2, '0')}
      </div>

      {/* Name + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--ink)',
          fontFamily: 'var(--font-display)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '4px',
        }}>{holding.name}</div>

        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          marginBottom: '6px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {[holding.set_name, holding.lang, holding.rarity, `×${holding.qty}`]
            .filter(Boolean)
            .join(' · ')}
        </div>

        {/* Weight bar */}
        <div style={{
          width: '100%',
          height: '4px',
          borderRadius: '2px',
          background: 'var(--border)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${barWidthPct}%`,
            height: '100%',
            background: rank === 1 ? 'var(--accent)' : 'var(--ink)',
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Value + weight % */}
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--ink)',
          fontFamily: 'var(--font-data, var(--font-display))',
          lineHeight: 1.1,
        }}>{formatEUR(holding.value)}</div>
        <div style={{
          fontSize: '11px',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-data, var(--font-display))',
          marginTop: '2px',
        }}>{(holding.weightPct ?? 0).toFixed(1)}%</div>
      </div>

      {/* ROI */}
      <div style={{ textAlign: 'right', minWidth: '60px' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: hasNoBuy ? 'var(--ink-faint)' : trendColor,
          fontFamily: 'var(--font-data, var(--font-display))',
          lineHeight: 1.1,
        }}>
          {hasNoBuy ? '—' : `${sign}${(holding.roiPct ?? 0).toFixed(1)}%`}
        </div>
        <div style={{
          fontSize: '10px',
          color: hasNoBuy ? 'var(--ink-faint)' : trendColor,
          fontFamily: 'var(--font-data, var(--font-display))',
          marginTop: '2px',
        }}>
          {hasNoBuy ? '—' : `${sign}${formatEURcompact(holding.gain)}`}
        </div>
      </div>
    </div>
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

function formatEURcompact(v: number): string {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `€${(v / 1_000).toFixed(1)}K`
  return `€${(v ?? 0).toFixed(0)}`
}
