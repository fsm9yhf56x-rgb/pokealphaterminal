'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { SNOW, FONT, GLASS, RADIUS } from '@/lib/design/snow'

type Size = 'sm' | 'md' | 'lg'

interface GlassButtonProps {
  children: ReactNode
  onClick?: () => void
  size?: Size
  disabled?: boolean
  fullWidth?: boolean
  /** Icône à gauche (rouge accent comme la réf Home) */
  icon?: ReactNode
  iconRight?: ReactNode
  /** pill (défaut) ou coins arrondis */
  pill?: boolean
  /** État sélectionné — pour tabs/segments/toggles (glass dense + encre) */
  active?: boolean
  type?: 'button' | 'submit'
  ariaLabel?: string
  title?: string
  style?: CSSProperties
}

const SIZES: Record<Size, { padding: string; fontSize: number; gap: number }> = {
  sm: { padding: '8px 16px',  fontSize: 12, gap: 6 },
  md: { padding: '10px 16px', fontSize: 13, gap: 8 },  // = HubQuickActions
  lg: { padding: '13px 24px', fontSize: 14, gap: 8 },
}

// Surfaces glass — alignées sur les tabs .vtab validés
const SURFACE_IDLE   = 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.40) 100%)'
const SURFACE_ACTIVE = 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.70) 100%)'

const SHADOW_IDLE   = '0 1px 4px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)'
const SHADOW_HOVER  = '0 8px 22px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)'
const SHADOW_ACTIVE = '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95)'

export function GlassButton({
  children, onClick, size = 'md', disabled = false, fullWidth = false,
  icon, iconRight, pill = true, active = false,
  type = 'button', ariaLabel, title, style,
}: GlassButtonProps) {
  const [hover, setHover] = useState(false)
  const sz = SIZES[size]

  const background = active ? SURFACE_ACTIVE : SURFACE_IDLE
  const color = active ? SNOW.ink : (hover ? SNOW.ink : SNOW.muted)
  const boxShadow = active ? SHADOW_ACTIVE : (hover && !disabled ? SHADOW_HOVER : SHADOW_IDLE)

  return (
    <>
      <style>{`@media (prefers-reduced-motion: reduce){ .kc-gb{transition:none !important} }`}</style>
      <button
        type={type}
        aria-label={ariaLabel}
        title={title}
        disabled={disabled}
        onClick={onClick}
        className="kc-gb"
        onMouseEnter={() => !disabled && setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: sz.gap,
          width: fullWidth ? '100%' : undefined,
          padding: sz.padding,
          borderRadius: pill ? RADIUS.pill : RADIUS.lg,
          border: '0.5px solid rgba(255,255,255,0.6)',
          background,
          backdropFilter: 'blur(20px) saturate(190%)',
          WebkitBackdropFilter: 'blur(20px) saturate(190%)',
          fontFamily: FONT.display,
          fontWeight: 600,
          fontSize: sz.fontSize,
          color,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          whiteSpace: 'nowrap',
          transition: 'transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .25s, color .2s, background .2s',
          transform: !active && hover && !disabled ? 'translateY(-2px)' : 'none',
          boxShadow,
          WebkitTapHighlightColor: 'transparent',
          ...style,
        }}
      >
        {icon && <span style={{ color: SNOW.red, display: 'inline-flex', flexShrink: 0 }}>{icon}</span>}
        {children}
        {iconRight && <span style={{ display: 'inline-flex', flexShrink: 0 }}>{iconRight}</span>}
      </button>
    </>
  )
}
