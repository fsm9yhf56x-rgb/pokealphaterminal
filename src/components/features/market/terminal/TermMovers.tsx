'use client'

import type { MoverCard } from '@/lib/useMarketData'

/**
 * Top movers : 2 colonnes côte à côte (hausses ▲ / baisses ▼).
 * Vue liste compact, cohérent avec le pattern PerfMovers du portfolio.
 */
export function TermMovers({
  gainers, losers,
}: {
  gainers: MoverCard[]
  losers: MoverCard[]
}) {
  if (gainers.length === 0 && losers.length === 0) return null

  return (
    <div>
      <SectionTitle>Top movers · 24h</SectionTitle>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '14px',
      }}>
        <MoversList
          title="Plus fortes hausses"
          icon="▲"
          cards={gainers}
          variant="up"
        />
        <MoversList
          title="Plus fortes baisses"
          icon="▼"
          cards={losers}
          variant="down"
        />
      </div>
    </div>
  )
}

function MoversList({
  title, icon, cards, variant,
}: {
  title: string
  icon: string
  cards: MoverCard[]
  variant: 'up' | 'down'
}) {
  const accentColor = variant === 'up' ? 'var(--perf-up)' : 'var(--perf-down)'
  const accentSoft  = variant === 'up' ? 'var(--perf-up-soft)' : 'var(--perf-down-soft)'

  if (cards.length === 0) {
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '14px 18px',
      }}>
        <ListHeader title={title} icon={icon} accentColor={accentColor} />
        <div style={{
          padding: '24px 0',
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--ink-faint)',
          fontFamily: 'var(--font-display)',
        }}>Pas de données</div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 18px 8px' }}>
        <ListHeader title={title} icon={icon} accentColor={accentColor} />
      </div>

      <div>
        {cards.map((card, i) => (
          <CardRow
            key={card.card_ref}
            card={card}
            rank={i + 1}
            variant={variant}
            accentColor={accentColor}
            accentSoft={accentSoft}
            isLast={i === cards.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

function CardRow({
  card, rank, variant, accentColor, accentSoft, isLast,
}: {
  card: MoverCard
  rank: number
  variant: 'up' | 'down'
  accentColor: string
  accentSoft: string
  isLast: boolean
}) {
  const sign = variant === 'up' ? '+' : ''

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '24px 1fr auto auto',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 18px',
      borderTop: '1px solid var(--border)',
      borderBottom: isLast ? 'none' : 'none',
      transition: 'background 0.1s',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.015)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Rank */}
      <div style={{
        fontSize: '10px',
        fontWeight: 600,
        color: rank <= 3 ? accentColor : 'var(--ink-faint)',
        fontFamily: 'var(--font-data, var(--font-display))',
        textAlign: 'center',
      }}>
        {rank.toString().padStart(2, '0')}
      </div>

      {/* Name + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--ink)',
          fontFamily: 'var(--font-display)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '2px',
        }}>{card.card_name}</div>
        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {[card.set_name, card.lang, card.source].filter(Boolean).join(' · ')}
        </div>
      </div>

      {/* Price */}
      <div style={{
        textAlign: 'right',
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--ink)',
        fontFamily: 'var(--font-data, var(--font-display))',
        fontVariantNumeric: 'tabular-nums',
        minWidth: '56px',
      }}>{formatEUR(card.current_price)}</div>

      {/* Change pill */}
      <div style={{
        textAlign: 'right',
        minWidth: '64px',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '3px 7px',
          background: accentSoft,
          borderRadius: '4px',
        }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: accentColor,
            fontFamily: 'var(--font-data, var(--font-display))',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {sign}{card.change_pct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}

function ListHeader({
  title, icon, accentColor,
}: {
  title: string
  icon: string
  accentColor: string
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <span style={{
        fontSize: '11px',
        color: accentColor,
        fontWeight: 700,
      }}>{icon}</span>
      <span style={{
        fontSize: '10px',
        fontWeight: 600,
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: 'var(--font-display)',
      }}>{title}</span>
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
  if (v >= 1000) return `€${(v / 1000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}
