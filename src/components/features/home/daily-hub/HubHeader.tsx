'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'

/**
 * Header Daily Hub : salutation contextuelle (matin/après-midi/soir) + clock live.
 * Tone friendly mais pro. Pas d'emoji superflu.
 */
export function HubHeader() {
  const { user } = useAuth()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const greeting = getGreeting(now.getHours())
  const firstName = getFirstName(user)
  const dateStr = formatLongDate(now)
  const timeStr = formatTime(now)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap',
    }}>
      {/* Left : greeting + name */}
      <div>
        <p style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: '0 0 4px',
          fontFamily: 'var(--font-display)',
        }}>Daily Hub</p>

        <h1 style={{
          fontSize: '28px',
          fontWeight: 600,
          color: 'var(--ink)',
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.5px',
          margin: 0,
          lineHeight: 1.1,
        }}>
          {greeting}{firstName ? `, ${firstName}` : ''}
        </h1>

        <p style={{
          fontSize: '12px',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-display)',
          marginTop: '6px',
          textTransform: 'capitalize',
        }}>{dateStr}</p>
      </div>

      {/* Right : live clock */}
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 500,
          color: 'var(--ink)',
          fontFamily: 'var(--font-data, var(--font-display))',
          letterSpacing: '-0.4px',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}>{timeStr}</div>
        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-display)',
          marginTop: '2px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>Heure locale</div>
      </div>
    </div>
  )
}

/* ── Helpers ─────────────────────────────── */

function getGreeting(hour: number): string {
  if (hour < 6)  return 'Bonsoir'
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function getFirstName(user: any): string | null {
  if (!user) return null
  const meta = user.user_metadata
  // Try various fields where the first name might be stored
  const name = meta?.first_name
            || meta?.firstName
            || meta?.name?.split(' ')[0]
            || meta?.full_name?.split(' ')[0]
            || null
  if (!name) {
    // Fallback : use email local part, capitalized
    const local = user.email?.split('@')[0]
    if (local) return capitalize(local.replace(/[._-]/g, ' ').split(' ')[0])
  }
  return name ? capitalize(name) : null
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function formatLongDate(d: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

function formatTime(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}
