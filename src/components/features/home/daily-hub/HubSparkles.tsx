'use client'

import { useEffect, useState, useMemo } from 'react'

interface PortfolioCard {
  qty?: number
  current_price?: number | null
}

/**
 * Sparkles burst quand un milestone est atteint pour la première fois.
 * Storage : localStorage pour éviter de re-fire à chaque visite.
 */
export function HubSparkles({ cards }: { cards: PortfolioCard[] }) {
  const [active, setActive] = useState(false)
  const [milestone, setMilestone] = useState<string | null>(null)

  const { cardsCount, totalValue } = useMemo(() => {
    let count = 0
    let value = 0
    for (const c of cards) {
      const qty = c.qty || 1
      count += qty
      value += (c.current_price ?? 0) * qty
    }
    return { cardsCount: count, totalValue: value }
  }, [cards])

  useEffect(() => {
    if (cardsCount === 0) return

    // Detect a fresh milestone
    const cardMilestones = [10, 25, 50, 100, 250, 500, 1000]
    const valueMilestones = [1000, 5000, 10000, 25000, 50000, 100000]

    const passedCardMs = cardMilestones.filter(m => cardsCount >= m).pop()
    const passedValueMs = valueMilestones.filter(m => totalValue >= m).pop()

    let triggered: string | null = null
    if (passedCardMs) {
      const key = `pka_ms_cards_${passedCardMs}`
      if (!localStorage.getItem(key)) {
        triggered = `${passedCardMs} cartes !`
        localStorage.setItem(key, String(Date.now()))
      }
    }
    if (!triggered && passedValueMs) {
      const key = `pka_ms_value_${passedValueMs}`
      if (!localStorage.getItem(key)) {
        triggered = `${formatCompact(passedValueMs)}€ atteint !`
        localStorage.setItem(key, String(Date.now()))
      }
    }

    if (triggered) {
      setMilestone(triggered)
      setActive(true)
      const t = setTimeout(() => {
        setActive(false)
        setTimeout(() => setMilestone(null), 500)
      }, 3500)
      return () => clearTimeout(t)
    }
  }, [cardsCount, totalValue])

  if (!milestone) return null

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 200,
      pointerEvents: 'none',
      opacity: active ? 1 : 0,
      transition: 'opacity 0.5s ease',
    }}>
      {/* Toast banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.95) 0%, rgba(184,134,11,0.95) 100%)',
        color: '#fff',
        padding: '14px 24px',
        borderRadius: '14px',
        fontSize: '15px',
        fontWeight: 600,
        fontFamily: 'var(--font-display)',
        letterSpacing: '-0.2px',
        boxShadow: '0 8px 32px rgba(212, 175, 55, 0.45)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: active
          ? 'milestone-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
          : 'milestone-fade 0.4s ease forwards',
      }}>
        <span style={{ fontSize: '20px' }}>🎉</span>
        <span>Bravo · {milestone}</span>
      </div>

      {/* Sparkles */}
      {active && Array.from({ length: 20 }).map((_, i) => (
        <Sparkle key={i} index={i} />
      ))}

      <style>{`
        @keyframes milestone-pop {
          0%   { transform: scale(0.5) translateY(20px); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1)    translateY(0);  opacity: 1; }
        }
        @keyframes milestone-fade {
          to { opacity: 0; transform: translateY(-12px); }
        }
        @keyframes sparkle-fly {
          0%   { transform: translate(0, 0) scale(0); opacity: 1; }
          15%  { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.4); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

/* ── Sparkle particle ────────────────────── */

function Sparkle({ index }: { index: number }) {
  const angle = (index / 20) * Math.PI * 2
  const distance = 80 + Math.random() * 60
  const dx = Math.cos(angle) * distance
  const dy = Math.sin(angle) * distance
  const size = 4 + Math.random() * 4
  const delay = Math.random() * 200
  const colors = ['#D4AF37', '#FFD66B', '#E8C56A', '#FFFFFF']
  const color = colors[index % colors.length]

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: `${size}px`,
      height: `${size}px`,
      background: color,
      borderRadius: '50%',
      transform: 'translate(-50%, -50%)',
      animation: `sparkle-fly 1.4s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms forwards`,
      boxShadow: `0 0 8px ${color}`,
      pointerEvents: 'none',
      ['--dx' as any]: `${dx}px`,
      ['--dy' as any]: `${dy}px`,
    } as React.CSSProperties} />
  )
}

/* ── Helpers ─────────────────────────────── */

function formatCompact(v: number): string {
  if (v >= 1000000) return `${Number(v / 1000000).toFixed(1)}M`
  if (v >= 1000)    return `${Number(v / 1000).toFixed(0)}K`
  return v.toString()
}
