"use client"

import { type HTMLAttributes } from 'react'

type Variant = 'default' | 'raised' | 'signal' | 'ghost'
type Padding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
  padding?: Padding
  hover?:   boolean
}

const shadows: Record<Variant, string> = {
  default: '0 1px 3px rgba(0,0,0,0.06)',
  raised:  '0 4px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
  signal:  '0 4px 20px rgba(224,48,32,0.07)',
  ghost:   'none',
}

const pads: Record<Padding, string> = {
  none: '0', sm: '12px', md: '16px', lg: '20px',
}

export function Card({
  variant = 'default',
  padding = 'md',
  hover   = false,
  style,
  children,
  ...props
}: CardProps) {
  return (
    <div
      style={{
        background: variant === 'ghost' ? '#F5F5F5' : '#fff',
        border: '1px solid #EBEBEB',
        borderRadius: variant === 'raised' || variant === 'signal' ? '16px' : '12px',
        padding: pads[padding],
        boxShadow: shadows[variant],
        position: 'relative',
        overflow: variant === 'signal' ? 'hidden' : undefined,
        transition: hover ? 'transform 0.15s, box-shadow 0.15s' : undefined,
        cursor: hover ? 'pointer' : undefined,
        ...style,
      }}
      onMouseEnter={hover ? e => {
        const el = e.currentTarget
        el.style.transform = 'translateY(-1px)'
        el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'
      } : undefined}
      onMouseLeave={hover ? e => {
        const el = e.currentTarget
        el.style.transform = ''
        el.style.boxShadow = shadows[variant]
      } : undefined}
      {...props}
    >
      {variant === 'signal' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: '2.5px',
          background: 'linear-gradient(90deg, #FFD700, #FF8C00, #E03020)',
        }} />
      )}
      {children}
    </div>
  )
}
