'use client'

import { Button }  from '@/components/ui/Button'
import { Badge }   from '@/components/ui/Badge'
import { Input }   from '@/components/ui/Input'
import { Card }    from '@/components/ui/Card'
import { Ticker }  from '@/components/ui/Ticker'
import type { TickerItem } from '@/components/ui/Ticker'

const TICKER: TickerItem[] = [
  { name: 'Charizard Alt Art', price: '€ 920',   change: 53,  type: 'fire'     },
  { name: 'Gengar VMAX',       price: '€ 340',   change: 18,  type: 'psychic'  },
  { name: 'Mewtwo V',          price: '€ 280',   change: 12,  type: 'psychic'  },
  { name: 'Umbreon VMAX',      price: '€ 880',   change: 24,  type: 'dark'     },
  { name: 'Blastoise Base',    price: '€ 620',   change: -4,  type: 'water'    },
  { name: 'Pikachu Illustr.',  price: '€ 4,200', change: 8,   type: 'electric' },
]

const PALETTE = [
  { label: 'bg',           hex: '#FAFAFA', border: true  },
  { label: 'surface',      hex: '#FFFFFF', border: true  },
  { label: 'border',       hex: '#EBEBEB', border: true  },
  { label: 'ink',          hex: '#111111', border: false },
  { label: 'ink-muted',    hex: '#888888', border: false },
  { label: 'ink-faint',    hex: '#BBBBBB', border: false },
  { label: 'red',          hex: '#E03020', border: false },
  { label: 'green',        hex: '#2E9E6A', border: false },
  { label: 'tier-s',       hex: '#FFD700', border: false },
  { label: 'energy-fire',  hex: '#FF6B35', border: false },
  { label: 'energy-water', hex: '#42A5F5', border: false },
  { label: 'energy-psy',   hex: '#C855D4', border: false },
  { label: 'energy-dark',  hex: '#7E57C2', border: false },
  { label: 'energy-elec',  hex: '#FFD700', border: false },
]

const sec = {
  fontSize: '10px', fontWeight: 600, color: '#888',
  textTransform: 'uppercase' as const, letterSpacing: '0.1em',
  display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px',
}

export default function DevUIPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', padding: '2rem', fontFamily: 'system-ui' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600&display=swap');
        @keyframes ticker { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        @keyframes float  { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
        @keyframes spin   { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>

        {/* Header */}
        <div style={{ borderBottom: '1px solid #EBEBEB', paddingBottom: '20px' }}>
          <p style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', fontFamily: 'Space Grotesk, system-ui' }}>
            PokéAlpha Terminal
          </p>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#111', fontFamily: 'Space Grotesk, system-ui', letterSpacing: '-0.3px' }}>
            Design System
          </h1>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '4px', fontFamily: 'Outfit, system-ui' }}>
            Japan Terminal · Bloc 02
          </p>
        </div>

        {/* Palette */}
        <div>
          <div style={sec}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#E03020', display: 'inline-block' }} />
            Palette
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
            {PALETTE.map(c => (
              <div key={c.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ height: '36px', borderRadius: '8px', background: c.hex, border: c.border ? '1px solid #EBEBEB' : 'none' }} />
                <span style={{ fontSize: '8px', color: '#888', fontFamily: 'monospace' }}>{c.label}</span>
                <span style={{ fontSize: '8px', color: '#BBB', fontFamily: 'monospace' }}>{c.hex}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div>
          <div style={sec}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#E03020', display: 'inline-block' }} />
            Typography
          </div>
          <Card padding="lg">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontFamily: 'Space Grotesk, system-ui', fontSize: '24px', fontWeight: 600, color: '#111', letterSpacing: '-0.3px' }}>Space Grotesk — Display 24px</div>
              <div style={{ fontFamily: 'Space Grotesk, system-ui', fontSize: '14px', fontWeight: 500, color: '#111' }}>Space Grotesk — Medium 14px · Headers, labels, nav</div>
              <div style={{ fontFamily: 'Outfit, system-ui', fontSize: '14px', fontWeight: 400, color: '#111' }}>Outfit — Regular 14px · Body text, descriptions</div>
              <div style={{ fontFamily: 'Outfit, system-ui', fontSize: '12px', fontWeight: 300, color: '#888' }}>Outfit — Light 12px · Secondary labels, hints</div>
              <div style={{ fontFamily: 'Space Grotesk, system-ui', fontSize: '28px', fontWeight: 600, color: '#111', letterSpacing: '-1px', fontFeatureSettings: '"tnum"' }}>€ 1,240.00</div>
            </div>
          </Card>
        </div>

        {/* Ticker */}
        <div>
          <div style={sec}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#E03020', display: 'inline-block' }} />
            Ticker live
          </div>
          <Ticker items={TICKER} />
        </div>

        {/* Buttons */}
        <div>
          <div style={sec}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#E03020', display: 'inline-block' }} />
            Buttons
          </div>
          <Card padding="lg">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="tier-s">✦ Tier S</Button>
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="lg">Large</Button>
              <Button variant="primary" loading>Loading</Button>
              <Button variant="secondary" disabled>Disabled</Button>
            </div>
          </Card>
        </div>

        {/* Badges */}
        <div>
          <div style={sec}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#E03020', display: 'inline-block' }} />
            Badges
          </div>
          <Card padding="lg">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <Badge>Default</Badge>
              <Badge variant="red">Signal</Badge>
              <Badge variant="green">+24%</Badge>
              <Badge variant="tier-s" animate>Tier S</Badge>
              <Badge variant="tier-a">Tier A</Badge>
              <Badge variant="tier-b">Tier B</Badge>
              <Badge variant="pro">Pro ✦</Badge>
              <Badge variant="outline">Free</Badge>
              <Badge variant="energy-fire">Fire</Badge>
              <Badge variant="energy-water">Water</Badge>
              <Badge variant="energy-psychic">Psychic</Badge>
              <Badge variant="energy-dark">Dark</Badge>
              <Badge variant="energy-electric">Electric</Badge>
            </div>
          </Card>
        </div>

        {/* Inputs */}
        <div>
          <div style={sec}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#E03020', display: 'inline-block' }} />
            Inputs
          </div>
          <Card padding="lg">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Input label="Rechercher une carte" placeholder="Ex: Charizard Alt Art..." />
              <Input label="Avec préfixe" prefix="€" placeholder="0.00" />
              <Input label="Avec erreur" error="Carte introuvable" defaultValue="Xyz" />
              <Input label="Avec hint" hint="Format: Nom · Set · Numéro" placeholder="Charizard · SV · 006" />
            </div>
          </Card>
        </div>

        {/* Cards */}
        <div>
          <div style={sec}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#E03020', display: 'inline-block' }} />
            Cards
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <Card variant="default" padding="md">
              <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px', fontFamily: 'Space Grotesk, system-ui' }}>Default</p>
              <p style={{ fontSize: '20px', fontWeight: 600, color: '#111', fontFamily: 'Space Grotesk, system-ui', letterSpacing: '-0.5px' }}>€ 920</p>
            </Card>
            <Card variant="raised" padding="md" hover>
              <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px', fontFamily: 'Space Grotesk, system-ui' }}>Raised · hover</p>
              <p style={{ fontSize: '20px', fontWeight: 600, color: '#111', fontFamily: 'Space Grotesk, system-ui', letterSpacing: '-0.5px' }}>€ 1,240</p>
            </Card>
            <Card variant="signal" padding="md">
              <div style={{ paddingTop: '6px' }}>
                <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px', fontFamily: 'Space Grotesk, system-ui' }}>Signal</p>
                <p style={{ fontSize: '20px', fontWeight: 600, color: '#111', fontFamily: 'Space Grotesk, system-ui', letterSpacing: '-0.5px' }}>€ 4,200</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #EBEBEB', paddingTop: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#BBB', fontFamily: 'monospace' }}>
            PokéAlpha Terminal · Design System · Bloc 02 ✓
          </p>
        </div>

      </div>
    </div>
  )
}
