'use client'

import type { TickerItem } from '@/lib/useMarketData'
import { FONT } from '@/lib/design/snow'

export function TermTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null
  const looped = [...items, ...items]

  return (
    <div style={{
      width: '100%',
      background: 'linear-gradient(135deg,#1a1a1e 0%,#0d0d0f 100%)',
      borderRadius: '10px',
      overflow: 'hidden',
      position: 'relative',
      border: '.5px solid rgba(255,255,255,.08)',
      boxShadow: '0 4px 18px rgba(0,0,0,.14), inset 0 1px 0 rgba(255,255,255,.06)',
    }}>
      <style>{`
        @keyframes ticker-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .ticker-scroll-track { animation: ticker-scroll 60s linear infinite; }
        .ticker-scroll-container:hover .ticker-scroll-track { animation-play-state: paused; }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        @media (prefers-reduced-motion: reduce){
          .ticker-scroll-track{animation-duration:240s}
        }
      `}</style>

      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'48px', background:'linear-gradient(90deg,#0d0d0f,transparent)', pointerEvents:'none', zIndex:2 }} />
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:'48px', background:'linear-gradient(-90deg,#0d0d0f,transparent)', pointerEvents:'none', zIndex:2 }} />

      {/* LIVE badge */}
      <div style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', zIndex:3, display:'flex', alignItems:'center', gap:'6px', background:'#0d0d0f', padding:'4px 9px', borderRadius:'6px', boxShadow:'6px 0 12px #0d0d0f' }}>
        <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#E03020', animation:'pulse-dot 2s ease-in-out infinite' }} />
        <span style={{ color:'#fff', fontSize:'9px', fontWeight:700, letterSpacing:'0.12em', fontFamily:FONT.display }}>LIVE</span>
      </div>

      <div className="ticker-scroll-container" style={{ padding:'12px 0 12px 84px', overflow:'hidden' }}>
        <div className="ticker-scroll-track" style={{ display:'inline-flex', gap:'32px', whiteSpace:'nowrap' }}>
          {looped.map((item, i) => (
            <TickerCell key={`${item.card_ref}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TickerCell({ item }: { item: TickerItem }) {
  const isUp = item.change_pct >= 0
  const trendColor = isUp ? '#5BC495' : '#F08373'
  const sign = isUp ? '+' : ''

  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
      <span style={{ fontSize:'11px', color:'#F5F5F7', fontFamily:FONT.display, fontWeight:500, whiteSpace:'nowrap' }}>{truncate(item.card_name, 28)}</span>
      <span style={{ fontSize:'11px', color:'#AEAEB2', fontFamily:FONT.data, fontVariantNumeric:'tabular-nums' }}>{formatEUR(item.current_price)}</span>
      {item.change_pct !== 0 && (
        <span style={{ fontSize:'10px', fontWeight:600, color:trendColor, fontFamily:FONT.data, fontVariantNumeric:'tabular-nums', padding:'2px 5px', background:isUp?'rgba(91,196,149,0.14)':'rgba(240,131,115,0.14)', borderRadius:'4px' }}>
          {isUp ? '▲' : '▼'} {sign}{Number(item.change_pct ?? 0).toFixed(1)}%
        </span>
      )}
    </div>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function formatEUR(v: number): string {
  if (v >= 1000) return `€${Number(v / 1000).toFixed(1)}K`
  return `€${Number(v ?? 0).toFixed(0)}`
}
