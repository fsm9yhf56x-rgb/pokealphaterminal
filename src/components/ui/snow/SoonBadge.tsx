'use client'
import type { CSSProperties } from 'react'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

interface SoonBadgeProps {
  version: 'v2.0' | 'v3.0' | 'v4.0'
  variant?: 'inline' | 'floating' | 'pill'
  style?: CSSProperties
  onClick?: () => void
}

/**
 * Badge "SOON · v2.0" pour features non encore livrees.
 * variant:
 *   - inline : a c\u00f4t\u00e9 d'un titre, petit
 *   - floating : coin haut-droit absolu (utile sur les cards)
 *   - pill : standalone, taille standard pill
 */
export function SoonBadge({ version, variant = 'inline', style, onClick }: SoonBadgeProps) {
  const isFloat = variant === 'floating'
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: variant === 'pill' ? '4px 10px' : '2px 7px',
        fontSize: variant === 'pill' ? 11 : 9,
        fontWeight: 700,
        fontFamily: FONT.data,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: SNOW.amberDark,
        background: SNOW.amber,
        borderRadius: RADIUS.sm,
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        ...(isFloat ? {
          position: 'absolute',
          top: 12, right: 12,
          zIndex: 2,
        } : {}),
        ...style,
      }}
    >
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: SNOW.amberDark, opacity: 0.7,
        animation: 'blink 2s ease-in-out infinite',
      }} />
      SOON · {version}
    </span>
  )
}
