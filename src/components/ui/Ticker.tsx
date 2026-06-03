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

export function Ticker({ items, speed = 56 }: { items: TickerItem[]; speed?: number }) {
  if (!items.length) return null
  const doubled = [...items, ...items]

  return (
    <>
      <style>{`
        @keyframes kc-ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes kc-live { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.7)} }
        .kc-track { animation: kc-ticker ${speed}s linear infinite; will-change: transform; }
        .kc-viewport:hover .kc-track { animation-play-state: paused; }
        .kc-live { animation: kc-live 1.8s ease-in-out infinite; }
        .kc-item { transition: background .18s ease; }
        .kc-item:hover { background: rgba(0,0,0,.025); }
        @media (prefers-reduced-motion: reduce) {
          .kc-track { animation: none; transform: translateX(0); }
          .kc-live { animation: none; }
        }
      `}</style>

      <div style={{
        position: 'relative', height: '36px', width: '100%', overflow: 'hidden',
        background: 'rgba(255,255,255,0.62)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: `1px solid ${SNOW.borderSoft}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -1px 0 rgba(255,255,255,0.45)',
        display: 'flex', alignItems: 'center',
      }}>
        {/* Cap LIVE */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 3,
          display: 'flex', alignItems: 'center', gap: '6px', padding: '0 18px 0 16px',
          background: 'rgba(255,255,255,0.74)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderRight: `1px solid ${SNOW.borderSoft}`,
          boxShadow: '8px 0 12px -8px rgba(0,0,0,0.06)', flexShrink: 0,
        }}>
          <span className="kc-live" style={{ width: '6px', height: '6px', borderRadius: '50%', background: SNOW.red, flexShrink: 0 }} />
          <span style={{ fontSize: '10px', fontWeight: 700, color: SNOW.red, letterSpacing: '.12em', fontFamily: FONT.display, lineHeight: 1 }}>LIVE</span>
        </div>

        {/* Viewport avec fondu sur les bords */}
        <div className="kc-viewport" style={{
          position: 'relative', overflow: 'hidden', width: '100%', height: '100%',
          maskImage: 'linear-gradient(90deg, transparent 0, #000 96px, #000 calc(100% - 64px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 96px, #000 calc(100% - 64px), transparent 100%)',
        }}>
          <div className="kc-track" style={{ display: 'inline-flex', alignItems: 'center', height: '100%', paddingLeft: '104px', whiteSpace: 'nowrap' }}>
            {doubled.map((it, i) => {
              const c = it.changePct
              const flat = c != null && Math.abs(c) < 0.05
              const up = (c ?? 0) >= 0
              const col = c == null || flat ? SNOW.mutedLight : up ? SNOW.greenAccent : SNOW.red
              const pillBg = c == null || flat ? 'rgba(0,0,0,0.04)' : up ? 'rgba(38,166,91,.10)' : SNOW.redLight
              return (
                <div key={i} className="kc-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '0 22px', height: '100%' }}>
                  {it.type && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: DOT[it.type] ?? SNOW.mutedLight, flexShrink: 0 }} />}
                  <span style={{ fontSize: '12px', color: SNOW.muted, fontFamily: FONT.body, fontWeight: 500 }}>{it.name}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: SNOW.ink, fontFamily: FONT.data, letterSpacing: '-.01em', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR(it.price)}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    padding: '2px 7px', borderRadius: '6px', background: pillBg,
                    fontSize: '10px', fontWeight: 700, color: col, fontFamily: FONT.data,
                    fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                  }}>
                    {c == null ? '·' : `${flat ? '' : up ? '▲ ' : '▼ '}${Math.abs(c).toFixed(1).replace('.', ',')} %`}
                  </span>
                  <span style={{ width: '1px', height: '15px', background: SNOW.border, opacity: 0.55, marginLeft: '13px', flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
