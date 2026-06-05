'use client'

import type { AllocAggregates, AllocHolding } from './Allocation'
import { usePersona } from '@/lib/usePersona'

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
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
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
        marginTop: 10,
        fontSize: 10.5,
        color: '#AEAEB2',
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
        textAlign: 'right' as const,
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
  const { show } = usePersona()
  const trendColor = isUp ? 'var(--perf-up)' : 'var(--perf-down)'
  const sign = isUp ? '+' : ''
  const hasNoBuy = holding.buy_price == null || holding.buy_price === 0
  const barWidthPct = maxWeight > 0 ? (holding.weightPct / maxWeight) * 100 : 0

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr auto auto',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.04)',
        transition: 'background .15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.4)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Rank - top 3 en gold cuivre */}
      <div style={{
        fontSize: 11.5,
        fontWeight: 700,
        color: rank === 1 ? '#B8763B' : rank <= 3 ? '#C9A84C' : '#AEAEB2',
        fontFamily: 'var(--font-data, "Space Mono", monospace)',
        textAlign: 'center' as const,
        letterSpacing: '-0.02em',
      }}>
        {rank.toString().padStart(2, '0')}
      </div>

      {/* Name + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#1D1D1F',
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
          whiteSpace: 'nowrap' as const,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: 5,
        }}>{holding.name}</div>

        <div style={{
          fontSize: 10.5,
          color: '#86868B',
          marginBottom: 7,
          whiteSpace: 'nowrap' as const,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
        }}>
          {[holding.set_name, holding.lang, holding.rarity, `×${holding.qty}`]
            .filter(Boolean)
            .join(' · ')}
        </div>

        {/* Weight bar - gradient gold pour #1, ink degrade pour les autres */}
        <div style={{
          width: '100%',
          height: 5,
          borderRadius: 3,
          background: 'rgba(0,0,0,0.05)',
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            width: `${barWidthPct}%`,
            height: '100%',
            background: rank === 1
              ? 'linear-gradient(90deg, #B8763B, #D7935A)'
              : rank <= 3
                ? 'linear-gradient(90deg, #1D1D1F, #2C2C2E)'
                : '#48484A',
            transition: 'width .6s cubic-bezier(.2,.85,.3,1)',
            boxShadow: rank === 1 ? '0 0 4px rgba(184,118,59,0.3)' : 'none',
          }} />
        </div>
      </div>

      {/* Value + weight % */}
      <div style={{ textAlign: 'right' as const }}>
        <div style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: '#1D1D1F',
          fontFamily: 'var(--font-data, "Space Mono", monospace)',
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
        }}>{formatEUR(holding.value)}</div>
        <div style={{
          fontSize: 11,
          color: '#86868B',
          fontFamily: 'var(--font-data, "Space Mono", monospace)',
          marginTop: 3,
          fontWeight: 600,
        }}>{Number(holding.weightPct ?? 0).toFixed(1)}%</div>
      </div>

      {/* ROI — masqué en mode collector */}
      {show.pnl && <div style={{ textAlign: 'right' as const, minWidth: 64 }}>
        <div style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: hasNoBuy ? '#C7C7CC' : trendColor,
          fontFamily: 'var(--font-data, "Space Mono", monospace)',
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
        }}>
          {hasNoBuy ? '—' : `${sign}${Number(holding.roiPct ?? 0).toFixed(1)}%`}
        </div>
        <div style={{
          fontSize: 10.5,
          color: hasNoBuy ? '#C7C7CC' : trendColor,
          fontFamily: 'var(--font-data, "Space Mono", monospace)',
          marginTop: 3,
          opacity: 0.85,
        }}>
          {hasNoBuy ? '—' : `${sign}${formatEURcompact(holding.gain)}`}
        </div>
      </div>}
    </div>
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
        textTransform: 'uppercase' as const,
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

function formatEURcompact(v: number): string {
  if (v >= 1_000_000) return `€${Number(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `€${Number(v / 1_000).toFixed(1)}K`
  return `€${Number(v ?? 0).toFixed(0)}`
}
