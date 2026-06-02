'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Compte de 0 → `to` une seule fois, au montage (ease-out cubic).
 * Respecte prefers-reduced-motion (affiche directement la valeur finale).
 * Re-déclenche si `to` change (ex: data arrive après loading).
 */
export function useCountUp(to: number, durationMs = 1100): number {
  const [val, setVal] = useState(0)
  const fromRef = useRef(0)
  const rafRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') { setVal(to); return }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || to === 0) { setVal(to); return }

    const from = fromRef.current
    const start = performance.now()
    cancelAnimationFrame(rafRef.current)

    const tick = (now: number) => {
      const p = Math.min((now - start) / durationMs, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(from + (to - from) * eased)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [to, durationMs])

  return val
}
