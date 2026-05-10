'use client'

import { useEffect, useState } from 'react'

interface StreakData {
  current: number      // current streak (days)
  longest: number      // best ever
  totalVisits: number  // lifetime
  lastVisit: string    // ISO date YYYY-MM-DD
}

const STORAGE_KEY = 'pka_streak_v1'

/**
 * Streak visites : compteur localStorage honnête (pas de fake gamification XP).
 * Compte les jours consécutifs de visite. Reset à 1 si > 1 jour d'écart.
 */
export function HubStreak() {
  const [data, setData] = useState<StreakData | null>(null)
  const [isFresh, setIsFresh] = useState(false)  // visited today first time

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const stored = loadStreak()

    let current = 1
    let longest = 1
    let totalVisits = 1
    let fresh = true

    if (stored) {
      const last = new Date(stored.lastVisit)
      const today = new Date(todayStr)
      const diffMs = today.getTime() - last.getTime()
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        // Already visited today — keep state, don't bump
        current = stored.current
        longest = stored.longest
        totalVisits = stored.totalVisits
        fresh = false
      } else if (diffDays === 1) {
        // Consecutive : extend
        current = stored.current + 1
        longest = Math.max(stored.longest, current)
        totalVisits = stored.totalVisits + 1
        fresh = true
      } else {
        // Broken : reset
        current = 1
        longest = stored.longest
        totalVisits = stored.totalVisits + 1
        fresh = true
      }
    }

    const next: StreakData = { current, longest, totalVisits, lastVisit: todayStr }
    saveStreak(next)
    setData(next)
    setIsFresh(fresh)
  }, [])

  if (!data) return null

  const flameLevel = data.current >= 30 ? 3
                   : data.current >= 7 ? 2
                   : data.current >= 3 ? 1
                   : 0
  const flameColor = flameLevel === 3 ? '#E03020'
                   : flameLevel === 2 ? '#F08328'
                   : flameLevel === 1 ? '#EF9F27'
                   : 'var(--ink-muted)'

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '999px',
      fontFamily: 'var(--font-display)',
      transition: 'all 0.2s ease',
    }}
    title={`Plus longue série : ${data.longest} jours · ${data.totalVisits} visites au total`}>
      {/* Flame icon */}
      <span style={{
        fontSize: '13px',
        filter: flameLevel === 0 ? 'grayscale(1) opacity(0.5)' : 'none',
        animation: isFresh ? 'streak-flame 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        display: 'inline-block',
      }}>🔥</span>

      {/* Counter */}
      <span style={{
        fontSize: '11px',
        fontWeight: 600,
        color: flameColor,
        fontFamily: 'var(--font-data, var(--font-display))',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {data.current} jour{data.current > 1 ? 's' : ''}
      </span>

      {data.current >= 7 && (
        <span style={{
          fontSize: '9px',
          color: 'var(--ink-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 500,
        }}>{data.current >= 30 ? 'Feu sacré' : 'Régulier'}</span>
      )}

      <style>{`
        @keyframes streak-flame {
          0%   { transform: scale(1)    rotate(0deg); }
          30%  { transform: scale(1.4)  rotate(-8deg); }
          60%  { transform: scale(1.15) rotate(5deg); }
          100% { transform: scale(1)    rotate(0deg); }
        }
      `}</style>
    </div>
  )
}

/* ── Storage ─────────────────────────────── */

function loadStreak(): StreakData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StreakData
  } catch {
    return null
  }
}

function saveStreak(d: StreakData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
  } catch {
    // localStorage might be disabled — silently fail
  }
}
