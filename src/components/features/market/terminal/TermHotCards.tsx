'use client'

import type { HotCard } from '@/lib/useMarketData'

/**
 * Hot cards : cartes avec le plus gros volume de transactions sur 24h.
 * Différent de Movers (qui regarde les variations de prix) : ici, focus volume.
 */
export function TermHotCards({ cards }: { cards: HotCard[] }) {
  if (cards.length === 0) {
    return (
      <EmptyCard
        title="Cartes les plus tradées"
        subtitle="Pas encore de données de volume disponibles"
      />
    )
  }

  // Sort by volume desc (sécurité, le hook renvoie déjà trié)
  const sorted = [...cards].sort((a, b) => b.volume_24h - a.volume_24h)
  const maxVol = sorted[0]?.volume_24h || 1

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      <Header title="Cartes les plus tradées" subtitle="Volume 24h" />

      <div>
        {sorted.map((card, i) => (
          <CardRow
            key={card.card_ref}
            card={card}
            rank={i + 1}
            maxVol={maxVol}
            isLast={i === sorted.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

function CardRow({
  card, rank, maxVol, isLast,
}: {
  card: HotCard
  rank: number
  maxVol: number
  isLast: boolean
}) {
  const volRatio = maxVol > 0 ? card.volume_24h / maxVol : 0
  const isUp = card.change_pct >= 0
  const trendColor = isUp ? 'var(--perf-up)' : 'var(--perf-down)'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr auto',
        alignItems: 'center',
        gap: '12px',
        padding: '11px 16px',
        borderTop: '1px solid var(--border)',
        position: 'relative',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.015)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Background fill bar (volume intensity) */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: `${volRatio * 100}%`,
        background: 'linear-gradient(90deg, rgba(224,48,32,0.04) 0%, rgba(224,48,32,0) 100%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Rank */}
      <div style={{
        fontSize: '10px',
        fontWeight: 600,
        color: rank <= 3 ? 'var(--accent)' : 'var(--ink-faint)',
        fontFamily: 'var(--font-data, var(--font-display))',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        {rank.toString().padStart(2, '0')}
      </div>

      {/* Name + meta */}
      <div style={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
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

      {/* Right : volume + price */}
      <div style={{
        textAlign: 'right',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          justifyContent: 'flex-end',
          marginBottom: '2px',
        }}>
          <span style={{
            fontSize: '9px',
            color: 'var(--accent)',
            fontWeight: 700,
          }}>●</span>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--ink)',
            fontFamily: 'var(--font-data, var(--font-display))',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {card.volume_24h.toLocaleString('fr-FR')}
          </span>
          <span style={{
            fontSize: '9px',
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>vol</span>
        </div>
        <div style={{
          fontSize: '10px',
          color: card.change_pct !== 0 ? trendColor : 'var(--ink-muted)',
          fontFamily: 'var(--font-data, var(--font-display))',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formatEUR(card.current_price)}
          {card.change_pct !== 0 && (
            <span style={{ marginLeft: '4px' }}>
              ({card.change_pct >= 0 ? '+' : ''}{card.change_pct.toFixed(1)}%)
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: '10px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{
          width: '5px', height: '5px',
          borderRadius: '50%',
          background: 'var(--accent)',
          flexShrink: 0,
          animation: 'pulse-hot 2s ease-in-out infinite',
        }} />
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          color: 'var(--ink-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontFamily: 'var(--font-display)',
        }}>{title}</span>
      </div>

      <span style={{
        fontSize: '9px',
        color: 'var(--ink-faint)',
        fontFamily: 'var(--font-display)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>{subtitle}</span>

      <style>{`
        @keyframes pulse-hot {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

function EmptyCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '14px 16px 32px',
    }}>
      <Header title={title} subtitle="Volume 24h" />
      <div style={{
        textAlign: 'center',
        fontSize: '11px',
        color: 'var(--ink-faint)',
        fontFamily: 'var(--font-display)',
        marginTop: '20px',
      }}>{subtitle}</div>
    </div>
  )
}

function formatEUR(v: number): string {
  if (v >= 1000) return `€${(v / 1000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}
