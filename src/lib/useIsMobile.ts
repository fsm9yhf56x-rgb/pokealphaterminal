'use client'

import { useEffect, useState } from 'react'

/**
 * Détecte si le viewport est sous un breakpoint donné (défaut 1024px,
 * aligné sur le breakpoint responsive de l'app). SSR-safe : false au départ,
 * puis se synchronise au montage via matchMedia.
 */
export function useIsMobile(maxWidth = 1024): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth - 1}px)`)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [maxWidth])
  return isMobile
}
