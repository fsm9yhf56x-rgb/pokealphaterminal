import { type HTMLAttributes } from 'react'

type BadgeVariant =
  | 'default' | 'red' | 'green'
  | 'tier-s' | 'tier-a' | 'tier-b'
  | 'energy-fire' | 'energy-water' | 'energy-psychic'
  | 'energy-dark' | 'energy-electric'
  | 'pro' | 'outline'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  animate?: boolean
}

const styles: Record<BadgeVariant, string> = {
  'default':          'background:#F5F5F5;color:#888;border:1px solid #EBEBEB',
  'red':              'background:#FFF0EE;color:#E03020;border:1px solid #FFD8D0',
  'green':            'background:#F0FFF6;color:#2E9E6A;border:1px solid #AAEEC8',
  'tier-s':           'background:#FFFDE0;color:#B8860B;border:1px solid #FFD70066',
  'tier-a':           'background:#F5EAFF;color:#7B2D8B;border:1px solid #C855D440',
  'tier-b':           'background:#F0FFF6;color:#2E9E6A;border:1px solid #AAEEC8',
  'energy-fire':      'background:#FFF0EB;color:#C84B00;border:1px solid #FFCBB0',
  'energy-water':     'background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE',
  'energy-psychic':   'background:#FAF5FF;color:#7E22CE;border:1px solid #E9D5FF',
  'energy-dark':      'background:#F5F3FF;color:#4C1D95;border:1px solid #DDD6FE',
  'energy-electric':  'background:#FEFCE8;color:#854D0E;border:1px solid #FEF08A',
  'pro':              'background:#111;color:#fff;border:1px solid #111',
  'outline':          'background:transparent;color:#111;border:1px solid #D4D4D4',
}

const energyDotColors: Partial<Record<BadgeVariant, string>> = {
  'energy-fire':     '#FF6B35',
  'energy-water':    '#42A5F5',
  'energy-psychic':  '#C855D4',
  'energy-dark':     '#7E57C2',
  'energy-electric': '#FFD700',
}

export function Badge({
  variant = 'default',
  animate = false,
  style,
  children,
  ...props
}: BadgeProps) {
  const isEnergy = variant.startsWith('energy-')
  const dotColor = energyDotColors[variant]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '10px',
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: '4px',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-space, system-ui)',
        animation: animate ? 'float 3s ease-in-out infinite' : undefined,
        ...Object.fromEntries(
          styles[variant].split(';').filter(Boolean).map(s => {
            const [k, v] = s.split(':')
            const key = k.trim().replace(/-([a-z])/g, (_: string, l: string) => l.toUpperCase())
            return [key, v.trim()]
          })
        ),
        ...style,
      }}
      {...props}
    >
      {isEnergy && dotColor && (
        <span style={{
          display: 'inline-block',
          width: '6px', height: '6px',
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  )
}
