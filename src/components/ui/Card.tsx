import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

type CardVariant = 'default' | 'raised' | 'signal' | 'ghost'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?:   boolean
}

const variants: Record<CardVariant, string> = {
  default: 'card',
  raised:  'card-raised',
  signal:  'card-signal',
  ghost:   'bg-bg rounded-xl border border-border',
}

const paddings = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-5',
}

export function Card({
  variant = 'default',
  padding = 'md',
  hover   = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        variants[variant],
        paddings[padding],
        hover && 'hover-lift cursor-pointer',
        'animate-fade-in',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}