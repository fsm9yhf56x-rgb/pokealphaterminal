'use client'
import type { CSSProperties, ReactNode, MouseEvent } from 'react'
import { SNOW, FONT, RADIUS, TRANSITION, GLASS } from '@/lib/design/snow'

type Variant = 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface SnowButtonProps {
  children: ReactNode
  variant?: Variant
  size?: Size
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  style?: CSSProperties
  className?: string
}

const SIZE_STYLES: Record<Size, { padding: string; fontSize: number; gap: number }> = {
  sm: { padding: '7px 12px', fontSize: 12, gap: 6 },
  md: { padding: '10px 16px', fontSize: 13, gap: 8 },
  lg: { padding: '13px 22px', fontSize: 14, gap: 10 },
}

function getVariantStyles(v: Variant, disabled: boolean): CSSProperties {
  if (disabled) return {
    background: '#F0F0F5',
    color: SNOW.mutedExtraLight,
    border: 'none',
    cursor: 'default',
  }
  switch (v) {
    case 'primary':
      return {
        background: SNOW.ink,
        color: '#FFFFFF',
        border: 'none',
      }
    case 'secondary':
      return {
        background: SNOW.surface,
        color: SNOW.inkSoft,
        border: `1px solid ${SNOW.border}`,
      }
    case 'ghost':
      return {
        background: 'transparent',
        color: SNOW.muted,
        border: 'none',
      }
    case 'glass':
      return {
        ...GLASS.button,
        color: SNOW.ink,
      }
    case 'danger':
      return {
        background: SNOW.red,
        color: '#FFFFFF',
        border: 'none',
      }
  }
}

/**
 * Bouton Snow+ unifié.
 *
 * Usage:
 *   <SnowButton variant="primary" onClick={...}>Ajouter au portfolio</SnowButton>
 *   <SnowButton variant="glass" size="sm">Annuler</SnowButton>
 */
export function SnowButton({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  type = 'button',
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  style,
  className,
}: SnowButtonProps) {
  const s = SIZE_STYLES[size]
  const v = getVariantStyles(variant, disabled)
  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...v,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 600,
        fontFamily: FONT.display,
        borderRadius: RADIUS.md,
        cursor: disabled ? 'default' : 'pointer',
        transition: TRANSITION.all,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        width: fullWidth ? '100%' : undefined,
        ...style,
      }}
      onMouseEnter={disabled ? undefined : (e) => {
        if (variant === 'primary') e.currentTarget.style.background = '#000'
        if (variant === 'secondary') {
          e.currentTarget.style.borderColor = SNOW.borderHover
          e.currentTarget.style.background = '#EDEDF0'
        }
        if (variant === 'ghost') e.currentTarget.style.color = SNOW.inkSoft
        if (variant === 'danger') e.currentTarget.style.background = SNOW.redDark
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={disabled ? undefined : (e) => {
        Object.assign(e.currentTarget.style, v)
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  )
}
