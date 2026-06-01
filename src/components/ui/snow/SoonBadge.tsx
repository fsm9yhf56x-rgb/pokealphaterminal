'use client'
import type { CSSProperties } from 'react'
import { FONT } from '@/lib/design/snow'

interface SoonBadgeProps {
  version: 'v2.0' | 'v3.0' | 'v4.0'
  variant?: 'inline' | 'floating' | 'pill'
  style?: CSSProperties
  onClick?: () => void
}

/**
 * SoonBadge v8 - ULTRA discret.
 *
 * Sur la nav: juste un dot subtle + version, pour ne PAS decaler le label
 * et ne PAS competitionner visuellement.
 * Sur les cards (variant pill): plus visible avec le mot 'Bientot'.
 */
export function SoonBadge({ version, variant = 'inline', style, onClick }: SoonBadgeProps) {
  const isFloat = variant === 'floating'
  const isPill = variant === 'pill'

  // Inline (nav): minimaliste, juste un dot + version
  if (variant === 'inline') {
    return (
      <span
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 9.5,
          fontWeight: 600,
          fontFamily: FONT.display,
          letterSpacing: '-0.005em',
          color: '#AEAEB2',
          cursor: onClick ? 'pointer' : 'inherit',
          whiteSpace: 'nowrap' as const,
          opacity: 0.85,
          ...style,
        }}
      >
        <span style={{
          width: 4, height: 4, borderRadius: '50%',
          background: '#C7C7CC',
          flexShrink: 0,
        }} />
        {version}
      </span>
    )
  }

  // Pill (cards/modals): plus de presence avec mot 'Bientot'
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 11px',
        fontSize: 10.5,
        fontWeight: 600,
        fontFamily: FONT.display,
        letterSpacing: '0.04em',
        textTransform: 'uppercase' as const,
        color: '#86868B',
        background: 'rgba(255,255,255,0.45)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.04)',
        borderRadius: 6,
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap' as const,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
        ...(isFloat ? {
          position: 'absolute' as const,
          top: 12, right: 12,
          zIndex: 2,
        } : {}),
        ...style,
      }}
    >
      <span style={{ color: '#C7C7CC', fontSize: 7 }}>●</span>
      <span>Bientôt</span>
      <span style={{ color: '#1D1D1F', fontWeight: 700, letterSpacing: '-0.01em', textTransform: 'none' as const }}>· {version}</span>
    </span>
  )
}
