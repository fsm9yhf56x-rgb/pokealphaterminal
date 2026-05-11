'use client'

import type { TickerItem } from '@/lib/useMarketData'

/**
 * Ticker bar Bloomberg-style : bandeau scrolling horizontal avec les top movers.
 * Pause au hover, animation CSS pure (pas de JS).
 */
export function TermTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null

  // Duplicate items for seamless loop
  const looped = [...items, ...items]

  return (
    <div style={{
      width: '100%',
      background: 'var(--ink)',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
    }}>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-scroll-track {
          animation: ticker-scroll 60s linear infinite;
        }
        .ticker-scroll-container:hover .ticker-scroll-track {
          animation-play-state: paused;
        }
      `}</style>

      {/* Left fade gradient */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: '40px',
        background: 'linear-gradient(90deg, var(--ink), transparent)',
        pointerEvents: 'none',
        zIndex: 2,
      }} />

      {/* Right fade gradient */}
      <div style={{
        position: 'absolute',
        right: 0, top: 0, bottom: 0,
        width: '40px',
        background: 'linear-gradient(-90deg, var(--ink), transparent)',
        pointerEvents: 'none',
        zIndex: 2,
      }} />

      {/* "LIVE" badge */}
      <div style={{
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 3,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'var(--ink)',
        padding: '4px 8px',
        borderRadius: '4px',
        boxShadow: '4px 0 8px var(--ink)',
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: 'var(--accent)',
          animation: 'pulse-dot 2s ease-in-out infinite',
        }} />
        <span style={{
          color: 'var(--surface)',
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          fontFamily: 'var(--font-display)',
        }}>LIVE</span>
      </div>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>

      {/* Scrolling track */}
      <div className="ticker-scroll-container" style={{
        padding: '12px 0 12px 80px',
        overflow: 'hidden',
      }}>
        <div className="ticker-scroll-track" style={{
          display: 'inline-flex',
          gap: '32px',
          whiteSpace: 'nowrap',
        }}>
          {looped.map((item, i) => (
            <TickerCell key={`${item.card_ref}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TickerCell({ item }: { item: TickerItem }) {
  const isUp = item.change_pct >= 0
  const trendColor = isUp ? '#5BC495' : '#F08373'  // Lighter on dark bg
  const sign = isUp ? '+' : ''

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexShrink: 0,
    }}>
      <span style={{
        fontSize: '11px',
        color: 'var(--surface)',
        fontFamily: 'var(--font-display)',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}>{truncate(item.card_name, 28)}</span>

      <span style={{
        fontSize: '11px',
        color: '#AEAEB2',
        fontFamily: 'var(--font-data, var(--font-display))',
        fontVariantNumeric: 'tabular-nums',
      }}>{formatEUR(item.current_price)}</span>

      {item.change_pct !== 0 && (
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          color: trendColor,
          fontFamily: 'var(--font-data, var(--font-display))',
          fontVariantNumeric: 'tabular-nums',
          padding: '2px 5px',
          background: isUp ? 'rgba(91, 196, 149, 0.12)' : 'rgba(240, 131, 115, 0.12)',
          borderRadius: '3px',
        }}>
          {isUp ? '▲' : '▼'} {sign}{Number(item.change_pct ?? 0).toFixed(1)}%
        </span>
      )}
    </div>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function formatEUR(v: number): string {
  if (v >= 1000) return `€${Number(v / 1000).toFixed(1)}K`
  return `€${Number(v ?? 0).toFixed(0)}`
}
