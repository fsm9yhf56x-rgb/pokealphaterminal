'use client'

import { useState, useEffect } from 'react'

/**
 * Header Terminal : titre + badge OPEN/CLOSED + horloge live + last update.
 * L'horloge tourne en temps réel pour le feel "Bloomberg en direct".
 */
export function TermStatus({
  status, lastUpdate,
}: {
  status: 'open' | 'closed'
  lastUpdate: Date | null
}) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const isOpen = status === 'open'

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap',
    }}>
      {/* Left : title + market status */}
      <div>
        <p style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: '0 0 4px',
          fontFamily: 'var(--font-display)',
        }}>Market</p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <h1 style={{
            fontSize: '26px',
            fontWeight: 600,
            color: 'var(--ink)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.5px',
            margin: 0,
          }}>Terminal</h1>

          <StatusBadge status={status} />
        </div>
      </div>

      {/* Right : live clock + last update */}
      <div style={{
        textAlign: 'right',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: 500,
          color: 'var(--ink)',
          fontFamily: 'var(--font-data, var(--font-display))',
          letterSpacing: '-0.3px',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}>
          {formatClock(now)}
          <span style={{
            fontSize: '11px',
            color: 'var(--ink-muted)',
            marginLeft: '6px',
            fontWeight: 400,
            letterSpacing: '0.05em',
          }}>{getTimezoneAbbr(now)}</span>
        </div>

        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-display)',
        }}>
          {lastUpdate
            ? <>Dernière mise à jour · <span style={{ color: 'var(--ink)' }}>{formatRelative(lastUpdate, now)}</span></>
            : '—'}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'open' | 'closed' }) {
  const isOpen = status === 'open'
  const dotColor = isOpen ? 'var(--perf-up)' : 'var(--ink-muted)'
  const bg       = isOpen ? 'var(--perf-up-soft)' : 'var(--surface)'
  const border   = isOpen ? 'var(--green-border)' : 'var(--border)'
  const text     = isOpen ? 'var(--perf-up)' : 'var(--ink-muted)'

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: '6px',
    }}>
      <div style={{
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        background: dotColor,
        animation: isOpen ? 'pulse-status 2s ease-in-out infinite' : 'none',
      }} />
      <span style={{
        fontSize: '10px',
        fontWeight: 600,
        color: text,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: 'var(--font-display)',
      }}>
        {isOpen ? 'Open' : 'Closed'}
      </span>
      <style>{`
        @keyframes pulse-status {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  )
}

function formatClock(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  const s = d.getSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

function getTimezoneAbbr(d: Date): string {
  // Intl gives a short timezone label, fallback to UTC offset
  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'short',
    }).formatToParts(d)
    const tz = formatted.find(p => p.type === 'timeZoneName')?.value
    if (tz) return tz
  } catch {}
  const offsetMin = d.getTimezoneOffset()
  const sign = offsetMin <= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  const hh = Math.floor(abs / 60).toString().padStart(2, '0')
  return `UTC${sign}${hh}`
}

function formatRelative(then: Date, now: Date): string {
  const diff = (now.getTime() - then.getTime()) / 1000
  if (diff < 5)    return 'à l\'instant'
  if (diff < 60)   return `il y a ${Math.floor(diff)}s`
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}
