'use client'

import type { MoverCard } from '@/lib/useMarketData'
import { SNOW, FONT, GLASS } from '@/lib/design/snow'

const POS = SNOW.greenAccent
const NEG = SNOW.red
const POS_BG = 'rgba(38,166,91,.10)'
const NEG_BG = SNOW.redLight
const EDGE = '0 0 0 0.5px rgba(255,255,255,0.7)'

export function TermMovers({
  gainers, losers,
}: {
  gainers: MoverCard[]
  losers: MoverCard[]
}) {
  if (gainers.length === 0 && losers.length === 0) return null

  return (
    <div>
      <SectionTitle>Top movers · 24h</SectionTitle>
      <style>{`
        @keyframes mvIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .mv-row{transition:background .12s}
        .mv-row:hover{background:rgba(0,0,0,0.025)}
        @media (prefers-reduced-motion: reduce){ .mv-row{animation:none !important} }
      `}</style>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:'14px' }}>
        <MoversList title="Plus fortes hausses" icon="▲" cards={gainers} variant="up" />
        <MoversList title="Plus fortes baisses" icon="▼" cards={losers} variant="down" />
      </div>
    </div>
  )
}

function MoversList({
  title, icon, cards, variant,
}: {
  title: string; icon: string; cards: MoverCard[]; variant: 'up'|'down'
}) {
  const accent = variant === 'up' ? POS : NEG
  const soft   = variant === 'up' ? POS_BG : NEG_BG

  if (cards.length === 0) {
    return (
      <div style={{ ...GLASS.card, padding:'14px 18px', boxShadow:`${GLASS.card.boxShadow as string}, ${EDGE}` }}>
        <ListHeader title={title} icon={icon} accentColor={accent} />
        <div style={{ padding:'24px 0', textAlign:'center', fontSize:'11px', color:SNOW.mutedExtraLight, fontFamily:FONT.display }}>Pas de données</div>
      </div>
    )
  }

  return (
    <div style={{ ...GLASS.card, overflow:'hidden', boxShadow:`${GLASS.card.boxShadow as string}, ${EDGE}` }}>
      <div style={{ padding:'14px 18px 8px' }}>
        <ListHeader title={title} icon={icon} accentColor={accent} />
      </div>
      <div>
        {cards.map((card, i) => (
          <CardRow key={card.card_ref} card={card} rank={i+1} variant={variant} accentColor={accent} accentSoft={soft} idx={i} />
        ))}
      </div>
    </div>
  )
}

function CardRow({
  card, rank, variant, accentColor, accentSoft, idx,
}: {
  card: MoverCard; rank: number; variant: 'up'|'down'; accentColor: string; accentSoft: string; idx: number
}) {
  const sign = variant === 'up' ? '+' : ''
  return (
    <div className="mv-row" style={{
      display:'grid', gridTemplateColumns:'24px 1fr auto auto', alignItems:'center', gap:'10px',
      padding:'10px 18px', borderTop:`1px solid ${SNOW.borderSoft}`,
      animation:`mvIn .35s cubic-bezier(.16,1,.3,1) ${idx*40}ms both`,
    }}>
      <div style={{ fontSize:'10px', fontWeight:700, color:rank<=3?accentColor:SNOW.mutedExtraLight, fontFamily:FONT.data, textAlign:'center' }}>
        {rank.toString().padStart(2, '0')}
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:'12px', fontWeight:600, color:SNOW.ink, fontFamily:FONT.display, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:'2px' }}>{card.card_name}</div>
        <div style={{ fontSize:'10px', color:SNOW.mutedLight, fontFamily:FONT.body, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {[card.set_name, card.lang, card.source].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div style={{ textAlign:'right', fontSize:'12px', fontWeight:600, color:SNOW.ink, fontFamily:FONT.data, fontVariantNumeric:'tabular-nums', minWidth:'56px' }}>{formatEUR(card.current_price)}</div>
      <div style={{ textAlign:'right', minWidth:'64px' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:'3px', padding:'3px 7px', background:accentSoft, borderRadius:'5px' }}>
          <span style={{ fontSize:'11px', fontWeight:700, color:accentColor, fontFamily:FONT.data, fontVariantNumeric:'tabular-nums' }}>
            {sign}{Number(card.change_pct ?? 0).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}

function ListHeader({ title, icon, accentColor }: { title: string; icon: string; accentColor: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
      <span style={{ fontSize:'11px', color:accentColor, fontWeight:700 }}>{icon}</span>
      <span style={{ fontSize:'10px', fontWeight:600, color:SNOW.muted, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:FONT.display }}>{title}</span>
    </div>
  )
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

function formatEUR(v: number): string {
  if (v >= 1000) return `€${Number(v / 1000).toFixed(1)}K`
  return `€${Number(v ?? 0).toFixed(0)}`
}
