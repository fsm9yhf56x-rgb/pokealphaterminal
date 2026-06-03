'use client'

import { SNOW, FONT } from '@/lib/design/snow'

export type TickerItem = {
  name: string
  price: number
  changePct: number | null
  type?: 'fire' | 'water' | 'psychic' | 'dark' | 'electric' | 'grass' | 'fighting' | 'steel' | 'fairy' | 'dragon'
}

const DOT: Record<string, string> = {
  fire: '#FF6B35', water: '#42A5F5', psychic: '#C855D4', dark: '#7E57C2',
  electric: '#FFD700', grass: '#66BB6A', fighting: '#C0392B', steel: '#8E9BA8',
  fairy: '#F48FB1', dragon: '#5C6BC0',
}

function fmtEUR(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.', ',')} K€`
  if (v >= 100) return `${Math.round(v)} €`
  return `${v.toFixed(2).replace('.', ',')} €`
}

export function Ticker({ items, speed = 42 }: { items: TickerItem[]; speed?: number }) {
  if (!items.length) return null
  const doubled = [...items, ...items]

  return (
    <>
      <style>{`
        @keyframes kc-ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes kc-live { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.7)} }
        .kc-track { animation: kc-ticker ${speed}s linear infinite; will-change: transform; }
        .kc-track:hover { animation-play-state: paused; }
        .kc-live { animation: kc-live 1.8s ease-in-out infinite; }
        .kc-item { transition: background .15s; }
        .kc-item:hover { background: rgba(0,0,0,.03); }
        @media (prefers-reduced-motion: reduce) {
          .kc-track { animation: none; transform: translateX(0); }
          .kc-live { animation: none; }
        }
      `}</style>

      <div style={{
        position: 'relative', height: '34px', width: '100%', overflow: 'hidden',
        background: 'rgba(255,255,255,0.62)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: `1px solid ${SNOW.borderSoft}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(255,255,255,0.4)',
        display: 'flex', alignItems: 'center',
      }}>
        {/* Cap LIVE */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 2,
          display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px 0 14px',
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderRight: `1px solid ${SNOW.borderSoft}`, flexShrink: 0,
        }}>
          <span className="kc-live" style={{ width: '6px', height: '6px', borderRadius: '50%', background: SNOW.red, flexShrink: 0 }} />
          <span style={{ fontSize: '10px', fontWeight: 700, color: SNOW.red, letterSpacing: '.1em', fontFamily: FONT.display, lineHeight: 1 }}>LIVE</span>
        </div>

        {/* Piste défilante */}
        <div className="kc-track" style={{ display: 'inline-flex', alignItems: 'center', paddingLeft: '92px', whiteSpace: 'nowrap' }}>
          {doubled.map((it, i) => {
            const c = it.changePct
            const up = (c ?? 0) >= 0
            const col = c == null ? SNOW.mutedLight : up ? SNOW.greenAccent : SNOW.red
            return (
              <div key={i} className="kc-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0 22px', height: '34px', borderRight: `1px solid ${SNOW.borderSoft}` }}>
                {it.type && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: DOT[it.type] ?? SNOW.mutedLight, flexShrink: 0 }} />}
                <span style={{ fontSize: '12px', color: SNOW.muted, fontFamily: FONT.body, fontWeight: 500 }}>{it.name}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: SNOW.ink, fontFamily: FONT.data, letterSpacing: '-.01em', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR(it.price)}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: col, fontFamily: FONT.data, fontVariantNumeric: 'tabular-nums', minWidth: c == null ? undefined : '46px' }}>
                  {c == null ? '·' : `${up ? '▲' : '▼'} ${Math.abs(c).toFixed(1)}%`}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
