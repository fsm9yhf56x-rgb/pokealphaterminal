'use client'
import type { CSSProperties, ReactNode } from 'react'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'
import { SnowCard } from './SnowCard'

interface SnowSectionProps {
  title?: string
  subtitle?: ReactNode
  rightSlot?: ReactNode
  children: ReactNode
  variant?: 'card' | 'cardSoft' | 'cardElevated'
  padding?: number | string
  style?: CSSProperties
  bare?: boolean   // pas de card autour, juste header + content
}

/**
 * Section Snow+ avec header + optional subtitle + content slot.
 *
 * Usage:
 *   <SnowSection title="PRIX PAR ÉTAT" subtitle="Une carte en parfait état vaut plus...">
 *     <ConditionPriceTable />
 *   </SnowSection>
 */
export function SnowSection({
  title,
  subtitle,
  rightSlot,
  children,
  variant = 'card',
  padding = 16,
  style,
  bare = false,
}: SnowSectionProps) {
  const inner = (
    <>
      {(title || rightSlot) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: subtitle ? 4 : 12,
          gap: 12,
        }}>
          {title && (
            <h3 style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: SNOW.muted,
              fontFamily: FONT.display,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{
                display: 'inline-block',
                width: 3,
                height: 12,
                background: SNOW.ink,
                borderRadius: 2,
              }} />
              {title}
            </h3>
          )}
          {rightSlot}
        </div>
      )}
      {subtitle && (
        <p style={{
          fontSize: 12,
          color: SNOW.muted,
          margin: '0 0 12px',
          lineHeight: 1.5,
          fontFamily: FONT.body,
        }}>
          {subtitle}
        </p>
      )}
      {children}
    </>
  )

  if (bare) {
    return <div style={style}>{inner}</div>
  }

  return (
    <SnowCard variant={variant} padding={padding} style={style}>
      {inner}
    </SnowCard>
  )
}
