'use client'

import { useState, useRef, useEffect } from 'react'
import { formatEUR } from '@/lib/formatPrice'

/**
 * Compteur animé isolé pour la valeur totale du portefeuille.
 *
 * Extrait de Holdings pour confiner l'animation : le requestAnimationFrame
 * ne re-rend QUE ce composant (pas tout Holdings qui est lourd).
 *
 * Props:
 *   - target: valeur cible (EUR)
 *   - ready:  si false (prix en chargement), affiche un placeholder discret
 */
export function AnimatedTotal({ target, ready = true }: { target: number; ready?: boolean }) {
  const [displayValue, setDisplayValue] = useState(0)
  const [pulse, setPulse] = useState<false | 'up' | 'down'>(false)
  const prevTotal = useRef(0)

  useEffect(() => {
    if (!ready) return
    const from = prevTotal.current
    if (from === target) { setDisplayValue(target); return }

    setPulse(target > from ? 'up' : 'down')
    const pulseTimer = setTimeout(() => setPulse(false), 600)

    const duration = 800
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplayValue(Math.round((from + (target - from) * eased) * 100) / 100)
      if (progress < 1) raf = requestAnimationFrame(tick)
      else prevTotal.current = target
    }
    raf = requestAnimationFrame(tick)

    return () => { cancelAnimationFrame(raf); clearTimeout(pulseTimer) }
  }, [target, ready])

  if (!ready) {
    return <span style={{ opacity: 0.4 }}>—</span>
  }

  return (
    <span
      style={{
        transition: 'color 0.3s ease',
        color: pulse === 'up' ? 'var(--perf-up, #1D9E75)'
             : pulse === 'down' ? 'var(--perf-down, #E03020)'
             : 'inherit',
      }}
    >
      {formatEUR(displayValue)}
    </span>
  )
}
