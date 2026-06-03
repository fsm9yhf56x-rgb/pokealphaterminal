'use client'

import { useState, useEffect } from 'react'
import type { TradeEvent } from '@/lib/useMarketData'
import { SNOW, FONT, GLASS } from '@/lib/design/snow'

const EDGE = '0 0 0 0.5px rgba(255,255,255,0.7)'

export function TermActivityFeed({ events }: { events: TradeEvent[] }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  if (events.length === 0) {
    return (
      <div>
        <SectionTitle>Activité récente</SectionTitle>
        <div style={{ ...GLASS.card, padding:'40px 20px', textAlign:'center', fontSize:'11px', color:SNOW.mutedExtraLight, fontFamily:FONT.display, boxShadow:`${GLASS.card.boxShadow as string}, ${EDGE}` }}>
          Aucune activité récente sur le marché.
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionTitle>Activité récente · {events.length} transactions</SectionTitle>
      <style>{`
        .af-row{transition:background .12s}
        .af-row:hover{background:rgba(0,0,0,0.022)}
        @keyframes flash-row { 0%{background:rgba(38,166,91,0.16)} 100%{background:transparent} }
        @media (prefers-reduced-motion: reduce){ .af-flash{animation:none !important} }
      `}</style>

      <div style={{ ...GLASS.card, overflow:'hidden', boxShadow:`${GLASS.card.boxShadow as string}, ${EDGE}` }}>
        <div style={{ display:'grid', gridTemplateColumns:'70px 1fr 60px 80px 90px', gap:'12px', padding:'8px 16px', background:'rgba(245,245,247,.6)', borderBottom:`1px solid ${SNOW.borderSoft}`, fontSize:'9px', fontWeight:600, color:SNOW.muted, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:FONT.display }}>
          <div>Source</div>
          <div>Carte</div>
          <div style={{ textAlign:'center' }}>Lang</div>
          <div style={{ textAlign:'right' }}>Prix</div>
          <div style={{ textAlign:'right' }}>Quand</div>
        </div>

        <div style={{ maxHeight:'320px', overflowY:'auto' }}>
          {events.map((evt, i) => (
            <EventRow key={evt.id} evt={evt} now={now} isFirst={i === 0} isLast={i === events.length - 1} />
          ))}
        </div>
      </div>
    </div>
  )
}

function EventRow({ evt, now, isFirst, isLast }: { evt: TradeEvent; now: Date; isFirst: boolean; isLast: boolean }) {
  const sourceStyle = SOURCE_STYLES[evt.source] || SOURCE_STYLES.cardmarket

  return (
    <div className={`af-row${isFirst ? ' af-flash' : ''}`} style={{
      display:'grid', gridTemplateColumns:'70px 1fr 60px 80px 90px', alignItems:'center', gap:'12px',
      padding:'10px 16px', borderBottom:isLast?'none':`1px solid ${SNOW.borderSoft}`,
      animation:isFirst?'flash-row 1.5s ease-out':'none',
    }}>
      <div>
        <span style={{ display:'inline-block', padding:'2px 6px', background:sourceStyle.bg, color:sourceStyle.color, fontSize:'9px', fontWeight:700, fontFamily:FONT.data, textTransform:'uppercase', letterSpacing:'0.05em', borderRadius:'4px' }}>{sourceStyle.label}</span>
      </div>

      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:'12px', fontWeight:600, color:SNOW.ink, fontFamily:FONT.display, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:'1px' }}>{evt.card_name}</div>
        {evt.variant && evt.variant !== 'raw' && (
          <div style={{ fontSize:'9px', color:SNOW.mutedLight, fontFamily:FONT.display, textTransform:'uppercase', letterSpacing:'0.05em' }}>{evt.variant}</div>
        )}
      </div>

      <div style={{ textAlign:'center', fontSize:'10px', color:SNOW.muted, fontFamily:FONT.data, fontWeight:600 }}>{evt.lang || '—'}</div>
      <div style={{ textAlign:'right', fontSize:'12px', fontWeight:700, color:SNOW.ink, fontFamily:FONT.data, fontVariantNumeric:'tabular-nums' }}>{formatEUR(evt.price)}</div>
      <div style={{ textAlign:'right', fontSize:'10px', color:SNOW.mutedLight, fontFamily:FONT.display }}>{formatRelative(new Date(evt.fetched_at), now)}</div>
    </div>
  )
}

const SOURCE_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  ebay:       { label:'eBay', bg:'#E8F0FE', color:'#1A56DB' },
  cardmarket: { label:'CM',   bg:'#FEF3E8', color:'#B95A0B' },
  tcgplayer:  { label:'TCGP', bg:'#FCE8F3', color:'#A8237A' },
  poketrace:  { label:'PT',   bg:'rgba(38,166,91,.12)', color:SNOW.greenAccent },
}

function formatRelative(then: Date, now: Date): string {
  const diff = (now.getTime() - then.getTime()) / 1000
  if (diff < 5)     return 'à l\'instant'
  if (diff < 60)    return `${Math.floor(diff)}s`
  if (diff < 3600)  return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}j`
}

function formatEUR(v: number): string {
  if (v >= 1000) return `€${Number(v / 1000).toFixed(1)}K`
  return `€${Number(v ?? 0).toFixed(0)}`
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
      <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:SNOW.red, flexShrink:0 }} />
      <span style={{ fontSize:'10px', fontWeight:600, color:SNOW.muted, textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:FONT.display }}>{children}</span>
      <div style={{ flex:1, height:'1px', background:`linear-gradient(90deg, ${SNOW.border}, transparent)` }} />
    </div>
  )
}
