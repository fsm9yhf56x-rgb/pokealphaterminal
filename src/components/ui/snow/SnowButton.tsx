'use client'
import type { CSSProperties, ReactNode, MouseEvent } from 'react'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

type Variant = 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface SnowButtonProps {
  children: ReactNode
  variant?: Variant
  size?: Size
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  style?: CSSProperties
  className?: string
}

const SIZE_STYLES: Record<Size, { height: number; padding: string; fontSize: number; gap: number }> = {
  sm: { height: 34, padding: '0 14px', fontSize: 12, gap: 6 },
  md: { height: 42, padding: '0 20px', fontSize: 13.5, gap: 8 },
  lg: { height: 50, padding: '0 28px', fontSize: 14.5, gap: 10 },
}

const EASE = 'cubic-bezier(.2,.85,.3,1)'
const TRANSITION = `all .25s ${EASE}`

/**
 * SnowButton v7 - glassmorphism premium SpotDrawer ref.
 *
 * Variants:
 *   primary  - noir Snow+ avec inset top white + shadow profonde + lift
 *   secondary - glass v7 surface (rgba 0.5 + blur 14px + inset)
 *   ghost    - transparent + hover glass subtle (zero presence au repos)
 *   glass    - glass v7 plus prononce (rgba 0.7 + blur 18px)
 *   danger   - rouge avec inset + shadow rouge
 *
 * States:
 *   hover    - lift translateY(-1.5px) + shadow renforcee + scale subtle
 *   active   - scale(0.98) (pressed feedback)
 *   disabled - opacity 0.5 + filter saturate 0.3
 *   loading  - spinner integre + disabled
 */
export function SnowButton({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  type = 'button',
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  style,
  className,
}: SnowButtonProps) {
  const s = SIZE_STYLES[size]
  const isDisabled = disabled || loading

  // ── Styles base par variant ─────────────────────────────────────────────
  const getBaseStyle = (): CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          background: SNOW.ink,
          color: '#FFFFFF',
          border: 'none',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.14)',
        }
      case 'secondary':
        return {
          background: 'rgba(255,255,255,0.55)',
          color: SNOW.ink,
          border: '1px solid rgba(0,0,0,0.06)',
          backdropFilter: 'blur(14px) saturate(180%)',
          WebkitBackdropFilter: 'blur(14px) saturate(180%)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
        }
      case 'ghost':
        return {
          background: 'transparent',
          color: SNOW.muted,
          border: 'none',
        }
      case 'glass':
        return {
          background: 'rgba(255,255,255,0.7)',
          color: SNOW.ink,
          border: '1px solid rgba(255,255,255,0.6)',
          backdropFilter: 'blur(18px) saturate(180%)',
          WebkitBackdropFilter: 'blur(18px) saturate(180%)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.95)',
        }
      case 'danger':
        return {
          background: SNOW.red,
          color: '#FFFFFF',
          border: 'none',
          boxShadow: '0 4px 14px rgba(224,48,32,0.28), 0 1px 3px rgba(224,48,32,0.12), inset 0 1px 0 rgba(255,255,255,0.18)',
        }
    }
  }

  const baseStyle = getBaseStyle()

  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={isDisabled}
      style={{
        ...baseStyle,
        height: s.height,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 600,
        fontFamily: FONT.display,
        letterSpacing: '0.005em',
        borderRadius: RADIUS.md,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: TRANSITION,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        width: fullWidth ? '100%' : undefined,
        position: 'relative' as const,
        whiteSpace: 'nowrap' as const,
        opacity: isDisabled ? 0.5 : 1,
        filter: isDisabled ? 'saturate(0.3)' : 'none',
        outline: 'none',
        ...style,
      }}
      // Hover lift + shadow enhanced
      onMouseEnter={isDisabled ? undefined : (e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(-1.5px)'
        switch (variant) {
          case 'primary':
            el.style.background = '#000'
            el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.18)'
            break
          case 'secondary':
            el.style.background = 'rgba(255,255,255,0.75)'
            el.style.boxShadow = '0 4px 14px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)'
            break
          case 'ghost':
            el.style.background = 'rgba(255,255,255,0.5)'
            el.style.color = SNOW.ink
            el.style.backdropFilter = 'blur(12px) saturate(180%)'
            ;(el.style as any).WebkitBackdropFilter = 'blur(12px) saturate(180%)'
            break
          case 'glass':
            el.style.background = 'rgba(255,255,255,0.85)'
            el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)'
            break
          case 'danger':
            el.style.background = SNOW.redDark
            el.style.boxShadow = '0 8px 24px rgba(224,48,32,0.35), 0 2px 6px rgba(224,48,32,0.16), inset 0 1px 0 rgba(255,255,255,0.22)'
            break
        }
      }}
      // Reset
      onMouseLeave={isDisabled ? undefined : (e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(0)'
        Object.assign(el.style, baseStyle)
      }}
      // Pressed feedback
      onMouseDown={isDisabled ? undefined : (e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(0.98)'
      }}
      onMouseUp={isDisabled ? undefined : (e) => {
        e.currentTarget.style.transform = 'translateY(-1.5px) scale(1)'
      }}
    >
      {loading && (
        <span style={{
          width: 14, height: 14,
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'snowBtnSpin .7s linear infinite',
          display: 'inline-block',
        }} />
      )}
      {!loading && leadingIcon}
      <span>{children}</span>
      {!loading && trailingIcon}

      <style>{`
        @keyframes snowBtnSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  )
}
