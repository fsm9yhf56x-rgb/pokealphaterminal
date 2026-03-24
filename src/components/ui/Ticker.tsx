'use client'

export type TickerItem = {
  name:   string
  price:  string
  change: number
  type?:  'fire' | 'water' | 'psychic' | 'dark' | 'electric' | 'grass'
}

const dotColors: Record<string, string> = {
  fire: '#FF6B35', water: '#42A5F5', psychic: '#C855D4',
  dark: '#7E57C2', electric: '#FFD700', grass: '#66BB6A',
}

export function Ticker({ items }: { items: TickerItem[] }) {
  const doubled = [...items, ...items]
  return (
    <div style={{
      background: '#1A1210', borderRadius: '10px',
      padding: '8px 0', overflow: 'hidden', position: 'relative',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
        background: '#E03020', color: '#fff', fontSize: '8px', fontWeight: 600,
        padding: '2px 7px', borderRadius: '20px', letterSpacing: '0.06em', zIndex: 2,
        fontFamily: 'var(--font-space, system-ui)',
      }}>
        LIVE
      </div>
      <div style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'inline-flex',
          animation: 'ticker 30s linear infinite',
          paddingLeft: '64px',
        }}>
          {doubled.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '0 16px',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              fontSize: '11px', whiteSpace: 'nowrap',
            }}>
              {item.type && (
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: dotColors[item.type] ?? '#888',
                  flexShrink: 0, display: 'inline-block',
                }} />
              )}
              <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-sans, system-ui)' }}>
                {item.name}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontFamily: 'var(--font-space, system-ui)', letterSpacing: '-0.02em' }}>
                {item.price}
              </span>
              <span style={{
                color: item.change >= 0 ? '#2E9E6A' : '#E03020',
                fontSize: '10px', fontWeight: 600,
                fontFamily: 'var(--font-space, system-ui)',
              }}>
                {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
