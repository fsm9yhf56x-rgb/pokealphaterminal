'use client'

import type { HotCard } from '@/lib/useMarketData'
import { SNOW, FONT, GLASS } from '@/lib/design/snow'

const POS = SNOW.greenAccent
const NEG = SNOW.red
const EDGE = '0 0 0 0.5px rgba(255,255,255,0.7)'

export function TermHotCards({ cards }: { cards: HotCard[] }) {
  if (cards.length === 0) {
    return <EmptyCard title="Cartes les plus tradées" subtitle="Pas encore de données de volume disponibles" />
  }

  const sorted = [...cards].sort((a, b) => b.volume_24h - a.volume_24h)
  const maxVol = sorted[0]?.volume_24h || 1

  return (
    <div style={{ ...GLASS.card, overflow:'hidden', boxShadow:`${GLASS.card.boxShadow as string}, ${EDGE}` }}>
      <style>{`
        @keyframes hotIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .hot-row{transition:background .12s}
        .hot-row:hover{background:rgba(0,0,0,0.025)}
        @keyframes pulse-hot { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media (prefers-reduced-motion: reduce){ .hot-row{animation:none !important} }
      `}</style>
      <Header title="Cartes les plus tradées" subtitle="Volume 24h" />
      <div>
        {sorted.map((card, i) => (
          <CardRow key={card.card_ref} card={card} rank={i+1} maxVol={maxVol} idx={i} />
        ))}
      </div>
    </div>
  )
}

function CardRow({ card, rank, maxVol, idx }: { card: HotCard; rank: number; maxVol: number; idx: number }) {
  const volRatio = maxVol > 0 ? card.volume_24h / maxVol : 0
  const isUp = card.change_pct >= 0
  const trendColor = isUp ? POS : NEG

  return (
    <div className="hot-row" style={{
      display:'grid', gridTemplateColumns:'24px 1fr auto', alignItems:'center', gap:'12px',
      padding:'11px 16px', borderTop:`1px solid ${SNOW.borderSoft}`, position:'relative',
      animation:`hotIn .35s cubic-bezier(.16,1,.3,1) ${idx*40}ms both`,
    }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${volRatio*100}%`, background:'linear-gradient(90deg, rgba(224,48,32,0.05) 0%, rgba(224,48,32,0) 100%)', pointerEvents:'none', zIndex:0 }} />

      <div style={{ fontSize:'10px', fontWeight:700, color:rank<=3?SNOW.red:SNOW.mutedExtraLight, fontFamily:FONT.data, textAlign:'center', position:'relative', zIndex:1 }}>
        {rank.toString().padStart(2, '0')}
      </div>

      <div style={{ minWidth:0, position:'relative', zIndex:1 }}>
        <div style={{ fontSize:'12px', fontWeight:600, color:SNOW.ink, fontFamily:FONT.display, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:'2px' }}>{card.card_name}</div>
        <div style={{ fontSize:'10px', color:SNOW.mutedLight, fontFamily:FONT.body, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {[card.set_name, card.lang, card.source].filter(Boolean).join(' · ')}
        </div>
      </div>

      <div style={{ textAlign:'right', position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'4px', justifyContent:'flex-end', marginBottom:'2px' }}>
          <span style={{ fontSize:'9px', color:SNOW.red, fontWeight:700 }}>●</span>
          <span style={{ fontSize:'12px', fontWeight:700, color:SNOW.ink, fontFamily:FONT.data, fontVariantNumeric:'tabular-nums' }}>{card.volume_24h.toLocaleString('fr-FR')}</span>
          <span style={{ fontSize:'9px', color:SNOW.mutedLight, textTransform:'uppercase', letterSpacing:'0.05em' }}>vol</span>
        </div>
        <div style={{ fontSize:'10px', color:card.change_pct!==0?trendColor:SNOW.mutedLight, fontFamily:FONT.data, fontVariantNumeric:'tabular-nums' }}>
          {formatEUR(card.current_price)}
          {card.change_pct !== 0 && (
            <span style={{ marginLeft:'4px' }}>({card.change_pct >= 0 ? '+' : ''}{Number(card.change_pct ?? 0).toFixed(1)}%)</span>
          )}
        </div>
      </div>
    </div>
  )
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ padding:'14px 16px', display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:'10px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:SNOW.red, flexShrink:0, animation:'pulse-hot 2s ease-in-out infinite' }} />
        <span style={{ fontSize:'10px', fontWeight:600, color:SNOW.muted, textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:FONT.display }}>{title}</span>
      </div>
      <span style={{ fontSize:'9px', color:SNOW.mutedExtraLight, fontFamily:FONT.display, textTransform:'uppercase', letterSpacing:'0.05em' }}>{subtitle}</span>
    </div>
  )
}

function EmptyCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ ...GLASS.card, padding:'14px 16px 32px', boxShadow:`${GLASS.card.boxShadow as string}, ${EDGE}` }}>
      <Header title={title} subtitle="Volume 24h" />
      <div style={{ textAlign:'center', fontSize:'11px', color:SNOW.mutedExtraLight, fontFamily:FONT.display, marginTop:'20px' }}>{subtitle}</div>
      <style>{`@keyframes pulse-hot { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}

function formatEUR(v: number): string {
  if (v >= 1000) return `€${Number(v / 1000).toFixed(1)}K`
  return `€${Number(v ?? 0).toFixed(0)}`
}
