'use client'
import type { CSSProperties, ReactNode } from 'react'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

type Tone =
  | 'neutral'
  | 'success'    // green - "Prix réel", succès
  | 'warning'    // amber - confiance moyenne, attention
  | 'danger'     // red - erreur, prix élevé
  | 'info'       // blue - PSA slab
  | 'pink'       // CGC slab
  | 'green'      // BGS slab
  | 'purple'     // SGC slab

interface SnowPillProps {
  children: ReactNode
  tone?: Tone
  size?: 'xs' | 'sm' | 'md'
  uppercase?: boolean
  style?: CSSProperties
}

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: SNOW.surface, fg: SNOW.muted },
  success: { bg: SNOW.greenLight, fg: SNOW.green },
  warning: { bg: SNOW.amber, fg: SNOW.amberDark },
  danger: { bg: SNOW.redLight, fg: SNOW.redDark },
  info: { bg: SNOW.blue, fg: SNOW.blueDark },
  pink: { bg: SNOW.pink, fg: SNOW.pinkDark },
  green: { bg: '#F4FAF0', fg: SNOW.green },
  purple: { bg: SNOW.purple, fg: SNOW.purpleDark },
}

const SIZE_STYLES: Record<NonNullable<SnowPillProps['size']>, { padding: string; fontSize: number }> = {
  xs: { padding: '2px 6px', fontSize: 9 },
  sm: { padding: '3px 8px', fontSize: 10 },
  md: { padding: '4px 10px', fontSize: 11 },
}

/**
 * Badge / pill Snow+ — pour grades (PSA/CGC), confidence, status, count, etc.
 *
 * Usage:
 *   <SnowPill tone="info">PSA 9</SnowPill>
 *   <SnowPill tone="success" size="xs">18 ventes</SnowPill>
 */
export function SnowPill({
  children,
  tone = 'neutral',
  size = 'sm',
  uppercase = false,
  style,
}: SnowPillProps) {
  const t = TONE_STYLES[tone]
  const s = SIZE_STYLES[size]
  return (
    <span
      style={{
        display: 'inline-block',
        background: t.bg,
        color: t.fg,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 600,
        borderRadius: RADIUS.sm,
        fontFamily: FONT.data,
        letterSpacing: uppercase ? '0.04em' : 'normal',
        textTransform: uppercase ? 'uppercase' : 'none',
        lineHeight: 1.2,
        ...style,
      }}
    >
      {children}
    </span>
  )
}
