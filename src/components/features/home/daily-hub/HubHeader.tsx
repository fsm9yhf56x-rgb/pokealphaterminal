'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { HubStreak } from './HubStreak'

/**
 * Header Daily Hub : salutation contextuelle + clock live + market status indicator.
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
  const marketStatus = getMarketStatus(now)

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

        <div style={{ marginTop: '10px' }}>
          <HubStreak />
        </div>
      </div>

      {/* Right : market status + clock */}
      <div style={{ textAlign: 'right' }}>
        {/* Market status pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          background: marketStatus.bg,
          border: `1px solid ${marketStatus.border}`,
          borderRadius: '999px',
          marginBottom: '8px',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: marketStatus.color,
            animation: marketStatus.live ? 'pulse-dot 2s ease-in-out infinite' : 'none',
            boxShadow: marketStatus.live ? `0 0 0 0 ${marketStatus.color}` : 'none',
          }} />
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            color: marketStatus.color,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'var(--font-display)',
          }}>{marketStatus.label}</span>
        </div>

        {/* Clock */}
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

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
          50%      { box-shadow: 0 0 0 6px transparent; opacity: 0.7; }
        }
      `}</style>
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
  const name = meta?.first_name
            || meta?.firstName
            || meta?.name?.split(' ')[0]
            || meta?.full_name?.split(' ')[0]
            || null
  if (!name) {
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

interface MarketStatus {
  label: string
  color: string
  bg: string
  border: string
  live: boolean
}

function getMarketStatus(d: Date): MarketStatus {
  const day = d.getDay() // 0 = sunday, 6 = saturday
  const hour = d.getHours()

  // Weekend : marché actif (eBay/CM ouvrent 24/7 en réalité, mais on simule des heures de pic)
  if (day === 0 || day === 6) {
    if (hour >= 10 && hour < 23) {
      return {
        label: 'Pic activité',
        color: '#1D9E75',
        bg: 'rgba(29, 158, 117, 0.08)',
        border: 'rgba(29, 158, 117, 0.2)',
        live: true,
      }
    }
    return {
      label: 'Activité réduite',
      color: '#86868B',
      bg: 'rgba(134, 134, 139, 0.08)',
      border: 'rgba(134, 134, 139, 0.2)',
      live: false,
    }
  }

  // Weekdays
  if (hour >= 9 && hour < 18) {
    return {
      label: 'Marché actif',
      color: '#1D9E75',
      bg: 'rgba(29, 158, 117, 0.08)',
      border: 'rgba(29, 158, 117, 0.2)',
      live: true,
    }
  }
  if (hour >= 18 && hour < 23) {
    return {
      label: 'Soirée active',
      color: '#EF9F27',
      bg: 'rgba(239, 159, 39, 0.08)',
      border: 'rgba(239, 159, 39, 0.2)',
      live: true,
    }
  }
  return {
    label: 'Activité réduite',
    color: '#86868B',
    bg: 'rgba(134, 134, 139, 0.08)',
    border: 'rgba(134, 134, 139, 0.2)',
    live: false,
  }
}
