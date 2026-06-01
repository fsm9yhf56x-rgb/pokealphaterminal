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
 * Badge SOON v7 - premium glass desirable, pas warning amber.
 *
 * Design Snow+ v7 ref SpotDrawer:
 * - Glass micro-pill rgba blanc 0.7 + blur 12px
 * - Bordure invisible rgba(0,0,0,0.05)
 * - Inset shadow subtle pour profondeur
 * - Texte ink soft (gris fonce 6E6E73) + version en ink fonce
 * - Pas de dot pulsant (trop agressif)
 *
 * variant:
 *   - inline : a cote du label nav, ultra discret
 *   - floating : coin haut-droit absolu sur cards
 *   - pill : standalone, taille standard
 */
export function SoonBadge({ version, variant = 'inline', style, onClick }: SoonBadgeProps) {
  const isFloat = variant === 'floating'
  const isPill = variant === 'pill'

  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: isPill ? '5px 11px' : '2px 8px',
        fontSize: isPill ? 11 : 9,
        fontWeight: 600,
        fontFamily: FONT.display,
        letterSpacing: '0.05em',
        textTransform: 'uppercase' as const,
        color: '#86868B',
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: RADIUS.sm,
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap' as const,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
        transition: 'all .2s cubic-bezier(.2,.8,.2,1)',
        ...(isFloat ? {
          position: 'absolute' as const,
          top: 12, right: 12,
          zIndex: 2,
        } : {}),
        ...style,
      }}
    >
      <span style={{
        fontSize: isPill ? 9 : 7,
        color: '#AEAEB2',
        fontWeight: 500,
      }}>○</span>
      <span>Bientôt</span>
      <span style={{
        color: '#1D1D1F',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        textTransform: 'none' as const,
      }}>· {version}</span>
    </span>
  )
}
