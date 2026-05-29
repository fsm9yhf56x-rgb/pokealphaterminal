'use client'
import type { CSSProperties, ReactNode } from 'react'
import { GLASS, RADIUS, TRANSITION } from '@/lib/design/snow'

interface SnowCardProps {
  children: ReactNode
  variant?: 'card' | 'cardSoft' | 'cardElevated'
  padding?: number | string
  style?: CSSProperties
  className?: string
  onClick?: () => void
  interactive?: boolean
}

/**
 * Card glass Snow+ — l'unité de surface de base de l'app.
 *
 * variant:
 *   - 'card' (défaut) : glass principal, blur 20px, pour sections de contenu
 *   - 'cardSoft' : sous-blocs, glass plus discret
 *   - 'cardElevated' : modals, popovers, glass + shadow forte
 *
 * Hover lift automatique si interactive=true.
 */
export function SnowCard({
  children,
  variant = 'card',
  padding = 16,
  style,
  className,
  onClick,
  interactive = false,
}: SnowCardProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        ...GLASS[variant],
        padding,
        cursor: interactive || onClick ? 'pointer' : 'default',
        transition: interactive || onClick ? TRANSITION.all : undefined,
        ...style,
      }}
      onMouseEnter={interactive ? (e) => {
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)'
      } : undefined}
      onMouseLeave={interactive ? (e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = GLASS[variant].boxShadow as string
      } : undefined}
    >
      {children}
    </div>
  )
}
