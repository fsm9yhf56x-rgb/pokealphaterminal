import { Ticker } from '@/components/ui/Ticker'
import type { TickerItem } from '@/components/ui/Ticker'

const ITEMS: TickerItem[] = [
  { name: 'Charizard Alt Art', price: '€ 920',   change: 53,  type: 'fire'     },
  { name: 'Gengar VMAX',       price: '€ 340',   change: 18,  type: 'psychic'  },
  { name: 'Mewtwo V',          price: '€ 280',   change: 12,  type: 'psychic'  },
  { name: 'Umbreon VMAX',      price: '€ 880',   change: 24,  type: 'dark'     },
  { name: 'Blastoise Base',    price: '€ 620',   change: -4,  type: 'water'    },
  { name: 'Pikachu Illustr.',  price: '€ 4,200', change: 8,   type: 'electric' },
  { name: 'Lugia Neo',         price: '€ 1,100', change: 7,   type: 'water'    },
  { name: 'Rayquaza Gold',     price: '€ 740',   change: 31,  type: 'electric' },
]

export function TickerBar() {
  return (
    <div style={{
      height: '36px',
      background: '#fff',
      borderBottom: '1px solid #EBEBEB',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      flexShrink: 0,
    }}>
      <Ticker items={ITEMS} />
    </div>
  )
}
