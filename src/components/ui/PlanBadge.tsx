'use client'

import { SNOW, FONT, RADIUS, SHADOW } from '@/lib/design/snow'

type Plan = 'free' | 'pro' | 'premium'
type Size = 'sm' | 'md'

const VARIANTS: Record<Plan, { label: string; bg: string; color: string; border: string }> = {
  free: {
    label: 'FREE',
    bg: SNOW.surface,
    color: SNOW.muted,
    border: SNOW.border,
  },
  pro: {
    label: 'PRO',
    bg: SNOW.amber,
    color: SNOW.amberDark,
    border: 'rgba(138,101,0,0.28)',
  },
  premium: {
    label: 'PREMIUM',
    bg: SNOW.ink,
    color: '#FFFFFF',
    border: 'rgba(255,255,255,0.16)',
  },
}

const SIZES: Record<Size, { fontSize: number; padding: string; radius: number }> = {
  sm: { fontSize: 9, padding: '3px 7px', radius: RADIUS.sm },
  md: { fontSize: 10, padding: '4px 9px', radius: RADIUS.sm + 1 },
}

export function PlanBadge({
  plan,
  size = 'md',
  hideFree = false,
}: {
  plan: Plan
  size?: Size
  hideFree?: boolean
}) {
  if (plan === 'free' && hideFree) return null
  const v = VARIANTS[plan]
  const sz = SIZES[size]
  const isInk = plan === 'premium'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: FONT.display,
        fontSize: sz.fontSize,
        fontWeight: 700,
        letterSpacing: '.09em',
        lineHeight: 1,
        padding: sz.padding,
        borderRadius: sz.radius,
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        boxShadow: isInk
          ? '0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.18)'
          : SHADOW.insetSubtle,
        whiteSpace: 'nowrap',
      }}
    >
      {v.label}
    </span>
  )
}
