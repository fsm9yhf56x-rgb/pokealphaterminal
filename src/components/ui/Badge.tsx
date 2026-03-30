import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

type BadgeVariant =
  | 'default'
  | 'red'
  | 'green'
  | 'tier-s'
  | 'tier-a'
  | 'tier-b'
  | 'energy-fire'
  | 'energy-water'
  | 'energy-psychic'
  | 'energy-dark'
  | 'energy-electric'
  | 'pro'
  | 'outline'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?:     boolean
  animate?: boolean
}

const variants: Record<BadgeVariant, string> = {
  default:          'bg-bg text-ink-muted border-border',
  red:              'bg-red-light text-red border-red-border',
  green:            'bg-green-light text-green border-green-border',
  'tier-s':         'bg-tier-s_bg text-amber-700 border-tier-s/40',
  'tier-a':         'bg-tier-a_bg text-purple-700 border-tier-a/30',
  'tier-b':         'bg-tier-b_bg text-green border-green-border',
  'energy-fire':    'bg-orange-50 text-orange-700 border-orange-200',
  'energy-water':   'bg-blue-50 text-blue-700 border-blue-200',
  'energy-psychic': 'bg-purple-50 text-purple-700 border-purple-200',
  'energy-dark':    'bg-slate-100 text-slate-700 border-slate-200',
  'energy-electric':'bg-yellow-50 text-yellow-700 border-yellow-200',
  pro:              'bg-ink text-white border-ink',
  outline:          'bg-transparent text-ink border-border-strong',
}

// Energy type dot colors
const energyDots: Partial<Record<BadgeVariant, string>> = {
  'energy-fire':    'bg-energy-fire',
  'energy-water':   'bg-energy-water',
  'energy-psychic': 'bg-energy-psychic',
  'energy-dark':    'bg-energy-dark',
  'energy-electric':'bg-energy-electric',
}

export function Badge({
  variant  = 'default',
  dot      = false,
  animate  = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const isEnergyType = variant.startsWith('energy-')

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        'font-display font-medium border',
        'text-[10px] px-2 py-0.5 rounded-[4px]',
        'leading-none whitespace-nowrap',
        variants[variant],
        animate && 'animate-float',
        className
      )}
      {...props}
    >
      {(dot || isEnergyType) && (
        <span
          className={cn(
            'inline-block w-1.5 h-1.5 rounded-full flex-shrink-0',
            isEnergyType ? energyDots[variant] : 'bg-current opacity-60'
          )}
        />
      )}
      {children}
    </span>
  )
}