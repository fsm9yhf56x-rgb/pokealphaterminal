'use client'

import { Ticker } from '@/components/ui/Ticker'
import type { TickerItem } from '@/components/ui/Ticker'

const TICKER_ITEMS: TickerItem[] = [
  { name: 'Charizard Alt Art', price: '€ 920',   change: 53,  type: 'fire'     },
  { name: 'Gengar VMAX',       price: '€ 340',   change: 18,  type: 'psychic'  },
  { name: 'Mewtwo V',          price: '€ 280',   change: 12,  type: 'psychic'  },
  { name: 'Umbreon VMAX',      price: '€ 880',   change: 24,  type: 'dark'     },
  { name: 'Blastoise Base',    price: '€ 620',   change: -4,  type: 'water'    },
  { name: 'Pikachu Illustr.',  price: '€ 4,200', change: 8,   type: 'electric' },
  { name: 'Lugia Neo',         price: '€ 1,100', change: 7,   type: 'water'    },
  { name: 'Rayquaza Gold',     price: '€ 740',   change: 31,  type: 'electric' },
]

export function Header() {
  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 'var(--sidebar-width)',
      right: 0,
      height: 'var(--header-height)',
      background: '#fff',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      zIndex: 30,
      padding: '0 0 0 20px',
    }}>

      {/* Ticker — prend tout l'espace */}
      <div style={{ flex: 1, marginRight: '16px' }}>
        <Ticker items={TICKER_ITEMS} />
      </div>

      {/* Actions droite */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        paddingRight: '20px',
        flexShrink: 0,
      }}>
        {/* Badge Pro */}
        <div style={{
          fontSize: '10px', fontWeight: 500,
          background: '#FFF0EE', color: '#E03020',
          border: '1px solid #FFD8D0',
          padding: '3px 9px', borderRadius: '20px',
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.02em',
        }}>
          Pro ✦
        </div>

        {/* Notif dot */}
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', color: 'var(--ink-muted)',
            background: '#fff',
          }}>
            ◎
          </div>
          <div style={{
            position: 'absolute', top: '6px', right: '6px',
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#E03020', border: '1.5px solid #fff',
          }} />
        </div>

        {/* Avatar */}
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #FFB8C8, #FF7090)',
          border: '2px solid #fff',
          boxShadow: '0 0 0 1.5px #FFD0DC',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 600, color: '#fff',
          cursor: 'pointer',
        }}>
          A
        </div>
      </div>

    </header>
  )
}
