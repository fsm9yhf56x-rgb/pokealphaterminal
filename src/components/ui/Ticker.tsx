'use client'

import { cn } from '@/lib/utils/cn'

export type TickerItem = {
  name:     string
  price:    string
  change:   number
  type?:    'fire' | 'water' | 'psychic' | 'dark' | 'electric' | 'grass'
}

const energyColors: Record<string, string> = {
  fire:     'bg-energy-fire',
  water:    'bg-energy-water',
  psychic:  'bg-energy-psychic',
  dark:     'bg-energy-dark',
  electric: 'bg-energy-electric',
  grass:    'bg-green',
}

interface TickerProps {
  items:     TickerItem[]
  speed?:    'slow' | 'normal' | 'fast'
  className?: string
}

export function Ticker({ items, className }: TickerProps) {
  // Double items to create seamless loop
  const doubled = [...items, ...items]

  return (
    <div className={cn('ticker-container py-2', className)}>
      {/* LIVE badge */}
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 bg-red text-white text-[8px] font-display font-semibold px-2 py-0.5 rounded-full tracking-wider">
        LIVE
      </div>
      {/* Track */}
      <div className="overflow-hidden">
        <div className="ticker-track pl-16">
          {doubled.map((item, i) => (
            <div key={i} className="ticker-item">
              {/* Energy dot */}
              {item.type && (
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    energyColors[item.type] ?? 'bg-ink-faint'
                  )}
                />
              )}
              {/* Name */}
              <span className="text-white/40 font-sans">
                {item.name}
              </span>
              {/* Price */}
              <span className="text-white/90 font-display font-medium price-display">
                {item.price}
              </span>
              {/* Change */}
              <span
                className={cn(
                  'text-[10px] font-medium font-display',
                  item.change >= 0 ? 'text-green' : 'text-red'
                )}
              >
                {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}