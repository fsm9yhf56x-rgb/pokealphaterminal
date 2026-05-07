'use client'

import { useState, useEffect } from 'react'
import type { TradeEvent } from '@/lib/useMarketData'

/**
 * Live feed des dernières transactions détectées (snapshots prices).
 * Façon "tape" Bloomberg : flux temporel des derniers prix scrappés.
 */
export function TermActivityFeed({ events }: { events: TradeEvent[] }) {
  const [now, setNow] = useState(new Date())

  // Tick every 30s to refresh "il y a Xs"
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  if (events.length === 0) {
    return (
      <div>
        <SectionTitle>Activité récente</SectionTitle>
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '40px 20px',
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--ink-faint)',
          fontFamily: 'var(--font-display)',
        }}>
          Aucune activité récente sur le marché.
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionTitle>Activité récente · {events.length} transactions</SectionTitle>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {/* Column header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '70px 1fr 60px 80px 90px',
          gap: '12px',
          padding: '8px 16px',
          background: '#FAFAFA',
          borderBottom: '1px solid var(--border)',
          fontSize: '9px',
          fontWeight: 600,
          color: 'var(--ink-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-display)',
        }}>
          <div>Source</div>
          <div>Carte</div>
          <div style={{ textAlign: 'center' }}>Lang</div>
          <div style={{ textAlign: 'right' }}>Prix</div>
          <div style={{ textAlign: 'right' }}>Quand</div>
        </div>

        {/* Rows */}
        <div style={{
          maxHeight: '320px',
          overflowY: 'auto',
        }}>
          {events.map((evt, i) => (
            <EventRow
              key={evt.id}
              evt={evt}
              now={now}
              isFirst={i === 0}
              isLast={i === events.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function EventRow({
  evt, now, isFirst, isLast,
}: {
  evt: TradeEvent
  now: Date
  isFirst: boolean
  isLast: boolean
}) {
  const sourceStyle = SOURCE_STYLES[evt.source] || SOURCE_STYLES.cardmarket

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '70px 1fr 60px 80px 90px',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 16px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        transition: 'background 0.1s',
        animation: isFirst ? 'flash-row 1.5s ease-out' : 'none',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.015)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <style>{`
        @keyframes flash-row {
          0% { background: rgba(91, 196, 149, 0.18); }
          100% { background: transparent; }
        }
      `}</style>

      {/* Source badge */}
      <div>
        <span style={{
          display: 'inline-block',
          padding: '2px 6px',
          background: sourceStyle.bg,
          color: sourceStyle.color,
          fontSize: '9px',
          fontWeight: 600,
          fontFamily: 'var(--font-data, var(--font-display))',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderRadius: '3px',
        }}>{sourceStyle.label}</span>
      </div>

      {/* Card name + variant */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--ink)',
          fontFamily: 'var(--font-display)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '1px',
        }}>{evt.card_name}</div>
        {evt.variant && evt.variant !== 'raw' && (
          <div style={{
            fontSize: '9px',
            color: 'var(--ink-muted)',
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>{evt.variant}</div>
        )}
      </div>

      {/* Lang */}
      <div style={{
        textAlign: 'center',
        fontSize: '10px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-data, var(--font-display))',
        fontWeight: 500,
      }}>{evt.lang || '—'}</div>

      {/* Price */}
      <div style={{
        textAlign: 'right',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--ink)',
        fontFamily: 'var(--font-data, var(--font-display))',
        fontVariantNumeric: 'tabular-nums',
      }}>{formatEUR(evt.price)}</div>

      {/* Relative time */}
      <div style={{
        textAlign: 'right',
        fontSize: '10px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-display)',
      }}>{formatRelative(new Date(evt.fetched_at), now)}</div>
    </div>
  )
}

const SOURCE_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  ebay:       { label: 'eBay',  bg: '#E8F0FE', color: '#1A56DB' },
  cardmarket: { label: 'CM',    bg: '#FEF3E8', color: '#B95A0B' },
  tcgplayer:  { label: 'TCGP',  bg: '#FCE8F3', color: '#A8237A' },
  poketrace:  { label: 'PT',    bg: 'var(--perf-up-soft)', color: 'var(--perf-up)' },
}

function formatRelative(then: Date, now: Date): string {
  const diff = (now.getTime() - then.getTime()) / 1000
  if (diff < 5)     return 'à l\'instant'
  if (diff < 60)    return `${Math.floor(diff)}s`
  if (diff < 3600)  return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}j`
}

function formatEUR(v: number): string {
  if (v >= 1000) return `€${(v / 1000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
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
