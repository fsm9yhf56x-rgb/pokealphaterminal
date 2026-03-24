'use client'

export type TickerItem = {
  name:   string
  price:  string
  change: number
  type?:  'fire' | 'water' | 'psychic' | 'dark' | 'electric' | 'grass'
}

const DOT_COLORS: Record<string, string> = {
  fire:     '#FF6B35',
  water:    '#42A5F5',
  psychic:  '#C855D4',
  dark:     '#7E57C2',
  electric: '#D4A800',
  grass:    '#3DA85A',
}

export function Ticker({ items }: { items: TickerItem[] }) {
  const doubled = [...items, ...items]

  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes live-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        .ticker-track       { animation: ticker-scroll 60s linear infinite; }
        .ticker-track:hover { animation-play-state: paused; }
        .ticker-item:hover  { background: rgba(0,0,0,0.04); }
      `}</style>

      <div style={{
        background: '#F0EFED',
        height: "31px",
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        borderBottom: '1px solid #DDDBD8',
      }}>

        {/* LIVE */}
        <div style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '0 16px 0 14px',
          background: '#F0EFED',
          zIndex: 2,
          borderRight: '1px solid #DDDBD8',
          flexShrink: 0,
        }}>
          <div style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: '#E03020',
            animation: 'live-pulse 1.8s ease-in-out infinite',
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: '11px', fontWeight: 700,
            color: '#E03020', letterSpacing: '0.08em',
            fontFamily: 'var(--font-display)', lineHeight: 1,
          }}>
            LIVE
          </span>
        </div>

        {/* TRACK */}
        <div style={{ overflow: 'hidden', width: '100%' }}>
          <div className="ticker-track" style={{ display: 'inline-flex', alignItems: 'center', paddingLeft: '100px' }}>
            {doubled.map((item, i) => (
              <div
                key={i}
                className="ticker-item"
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '0 28px', height: "31px",
                  borderRight: '1px solid #DDDBD8',
                  whiteSpace: 'nowrap', cursor: 'default',
                  transition: 'background 0.1s',
                }}
              >
                {item.type && (
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: DOT_COLORS[item.type] ?? '#888',
                    display: 'inline-block', flexShrink: 0,
                  }} />
                )}
                <span style={{
                  fontSize: '13px', color: '#444',
                  fontFamily: 'var(--font-sans)', fontWeight: 400,
                }}>
                  {item.name}
                </span>
                <span style={{
                  fontSize: '14px', fontWeight: 600, color: '#111',
                  fontFamily: 'var(--font-display)', letterSpacing: '-0.02em',
                }}>
                  {item.price}
                </span>
                <span style={{
                  fontSize: '12px', fontWeight: 600,
                  color: item.change >= 0 ? '#1A8A50' : '#D42020',
                  fontFamily: 'var(--font-display)',
                }}>
                  {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change)}%
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
