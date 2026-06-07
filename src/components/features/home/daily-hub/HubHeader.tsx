'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { usePersona } from '@/lib/usePersona'
import { HubStreak } from './HubStreak'
import { SNOW, FONT, GLASS, RADIUS } from '@/lib/design/snow'

/**
 * Header Daily Hub Snow+ : salutation + date + streak + market status + clock.
 * Glass pills + typo display sora + cohérence v1.0.
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
  const { isCollector } = usePersona()
  const marketStatus = getMarketStatus(now)

  return (
    <div className="hub-header-root" style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      {/* Left : greeting + date + streak */}
      <div className="hub-header-left">
        <p style={{
          fontSize: 10,
          color: SNOW.mutedLight,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          margin: '0 0 4px',
          fontFamily: FONT.display,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{
            display: 'inline-block',
            width: 3, height: 10,
            background: SNOW.ink,
            borderRadius: 2,
          }} />
          Daily Hub
        </p>

        <h1 className="hub-greeting" style={{
          fontSize: 32,
          fontWeight: 700,
          color: SNOW.ink,
          fontFamily: FONT.display,
          letterSpacing: '-0.8px',
          margin: 0,
          lineHeight: 1.1,
        }}>
          {greeting}{firstName ? <>, <span style={{ color: SNOW.red }}>{firstName}</span></> : ''}
        </h1>

        <p style={{
          fontSize: 13,
          color: SNOW.muted,
          fontFamily: FONT.body,
          marginTop: 8,
          marginBottom: 0,
          textTransform: 'capitalize',
        }}>
          {dateStr}
        </p>


      </div>

      {/* Right : market status pill glass + clock */}
      <div className="hub-header-right" style={{ textAlign: 'right' }}>
        {/* Market status pill - glass v5 — investisseur uniquement */}
        {!isCollector && <div style={{
          ...GLASS.cardSoft,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '5px 12px',
          borderRadius: 999,
          marginBottom: 10,
          // Surchage légère - tinted vers la couleur du statut
          background: `linear-gradient(180deg, ${withAlpha(marketStatus.color, 0.18)} 0%, ${withAlpha(marketStatus.color, 0.10)} 100%)`,
          border: `1px solid ${withAlpha(marketStatus.color, 0.3)}`,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: marketStatus.color,
            animation: marketStatus.live ? 'pulse-dot 2s ease-in-out infinite' : 'none',
            boxShadow: marketStatus.live ? `0 0 0 0 ${marketStatus.color}` : 'none',
          }} />
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: marketStatus.color,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: FONT.data,
          }}>
            {marketStatus.label}
          </span>
        </div>}

        {/* Clock */}
        <div className="hub-clock">
        <div className="hub-clock-time" style={{
          fontSize: 28,
          fontWeight: 600,
          color: SNOW.ink,
          fontFamily: FONT.data,
          letterSpacing: '-0.5px',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}>
          {timeStr}
        </div>
        <div style={{
          fontSize: 9,
          color: SNOW.mutedLight,
          fontFamily: FONT.display,
          marginTop: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 600,
        }}>
          Heure locale
        </div>
        {/* Streak sous l'heure, aligne a droite */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <HubStreak />
        </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
          50%      { box-shadow: 0 0 0 6px transparent; opacity: 0.7; }
        }
        /* Mobile : on garde le layout desktop (greeting gauche / statut+heure
           droite). On empeche juste le wrap et on compacte legerement pour que
           le bloc droite tienne sur petit ecran. */
        @media (max-width: 1023px) {
          .hub-header-root { flex-wrap: nowrap !important; gap: 12px !important; }
          .hub-header-left { min-width: 0; flex: 1; }
          .hub-header-right { flex-shrink: 0; }
          .hub-clock-time { font-size: 24px !important; }
        }
        @media (max-width: 400px) {
          .hub-clock-time { font-size: 21px !important; }
        }
        /* Mobile : titre compacte pour eviter le wrap sur 2 lignes */
        @media (max-width: 1023px) {
          .hub-greeting { font-size: 26px !important; }
        }
        @media (max-width: 400px) {
          .hub-greeting { font-size: 23px !important; }
        }
      `}</style>
    </div>
  )
}

/* ── Helpers ─────────────────────────────── */

function withAlpha(hex: string, alpha: number): string {
  // hex peut etre "#RRGGBB" ou "rgba()" - on rebuild proprement
  if (hex.startsWith('#')) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return hex
}

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
  live: boolean
}

function getMarketStatus(d: Date): MarketStatus {
  const day = d.getDay()
  const hour = d.getHours()

  if (day === 0 || day === 6) {
    if (hour >= 10 && hour < 23) {
      return { label: 'Pic activité', color: '#26A65B', live: true }
    }
    return { label: 'Activité réduite', color: SNOW.mutedLight, live: false }
  }

  if (hour >= 9 && hour < 18) {
    return { label: 'Marché actif', color: '#26A65B', live: true }
  }
  if (hour >= 18 && hour < 23) {
    return { label: 'Soirée active', color: '#EF9F27', live: true }
  }
  return { label: 'Activité réduite', color: SNOW.mutedLight, live: false }
}
