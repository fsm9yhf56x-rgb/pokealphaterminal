'use client'

import { useState, useEffect, useMemo } from 'react'
import { SNOW, FONT, GLASS, RADIUS } from '@/lib/design/snow'

type Whale = {
  id:string; handle:string; rank:'LEGEND'|'PRO'; verified:boolean
  avatar:string; color:string; bio:string
  portfolio:string; moves30d:number; avgTx:string; totalVol:string
  buyRatio:number; trend:number; focus:string[]; lastSeen:string
  spark:number[]
}

const WHALE_PROFILES: Whale[] = [
  { id:'1', handle:'RedDragonKai', rank:'LEGEND', verified:true, avatar:'RK', color:'#E0A800',
    bio:"Collectionneur vintage #1 France. Spécialisé Alt Art & PSA 10 japonais.",
    portfolio:'€ 2.4M', moves30d:48, avgTx:'€ 8 400', totalVol:'€ 403 200', buyRatio:88, trend:12,
    focus:['Alt Art','Vintage','PSA 10','JP Market'], lastSeen:'Il y a 2h',
    spark:[3,5,4,8,6,11,9,14,12,18] },
  { id:'2', handle:'SakuraTCG', rank:'LEGEND', verified:true, avatar:'ST', color:'#FF6B9D',
    bio:"Investisseur TCG — focus Evolving Skies & sets OOP. Arbitrage JP/EN.",
    portfolio:'€ 1.1M', moves30d:31, avgTx:'€ 4 200', totalVol:'€ 130 200', buyRatio:74, trend:6,
    focus:['Evolving Skies','OOP Sets','Arbitrage JP/EN'], lastSeen:'Il y a 5h',
    spark:[6,5,7,6,9,8,10,9,11,13] },
  { id:'3', handle:'GoldStarFR', rank:'PRO', verified:false, avatar:'GS', color:'#C855D4',
    bio:"Gold Star hunter. Cherche les PSA pop faibles en grade 9.",
    portfolio:'€ 340K', moves30d:18, avgTx:'€ 2 800', totalVol:'€ 50 400', buyRatio:42, trend:-8,
    focus:['Gold Star','PSA 9','EX Era'], lastSeen:'Il y a 1j',
    spark:[9,8,7,8,6,5,6,4,5,4] },
  { id:'4', handle:'VintageJP', rank:'PRO', verified:true, avatar:'VJ', color:'#42A5F5',
    bio:"Vintage JP specialist. Base Set, Neo, e-Series.",
    portfolio:'€ 280K', moves30d:12, avgTx:'€ 3 100', totalVol:'€ 37 200', buyRatio:55, trend:3,
    focus:['Vintage JP','e-Series','Neo Era'], lastSeen:'Il y a 3j',
    spark:[4,5,4,6,5,5,7,6,7,8] },
]

type Move = { id:number; handle:string; action:'Acheté'|'Vendu'; card:string; amount:number; vsMarket:number; time:string; color:string; signal:boolean }

const WHALE_FEED: Move[] = [
  { id:1,  handle:'RedDragonKai', action:'Acheté', card:'Charizard Alt Art PSA 10',     amount:4200,  vsMarket:-12, time:'Il y a 2h',  color:'#E0A800', signal:true  },
  { id:2,  handle:'RedDragonKai', action:'Acheté', card:'Umbreon VMAX Alt Art ×3',       amount:2640,  vsMarket:-7,  time:'Il y a 2h',  color:'#E0A800', signal:false },
  { id:3,  handle:'SakuraTCG',    action:'Acheté', card:'Rayquaza VMAX Alt Art',          amount:1480,  vsMarket:-15, time:'Il y a 5h',  color:'#FF6B9D', signal:true  },
  { id:4,  handle:'GoldStarFR',   action:'Vendu',  card:'Pikachu Gold Star PSA 9',        amount:3200,  vsMarket:8,   time:'Il y a 8h',  color:'#C855D4', signal:false },
  { id:5,  handle:'SakuraTCG',    action:'Acheté', card:'Evolving Skies Display EN',      amount:2200,  vsMarket:-4,  time:'Il y a 12h', color:'#FF6B9D', signal:false },
  { id:6,  handle:'VintageJP',    action:'Acheté', card:'Lugia Neo Genesis PSA 8 ×2',     amount:1160,  vsMarket:-9,  time:'Il y a 1j',  color:'#42A5F5', signal:false },
  { id:7,  handle:'RedDragonKai', action:'Acheté', card:'Espeon VMAX Alt Art Raw ×5',     amount:1590,  vsMarket:-18, time:'Il y a 1j',  color:'#E0A800', signal:false },
  { id:8,  handle:'GoldStarFR',   action:'Acheté', card:'Rayquaza Gold Star PSA 8',       amount:4800,  vsMarket:-6,  time:'Il y a 2j',  color:'#C855D4', signal:true  },
  { id:9,  handle:'VintageJP',    action:'Vendu',  card:'Charizard Base Set 1st Ed. Raw', amount:6400,  vsMarket:11,  time:'Il y a 3j',  color:'#42A5F5', signal:false },
  { id:10, handle:'SakuraTCG',    action:'Acheté', card:'Gengar VMAX Alt Art ×2',         amount:680,   vsMarket:-3,  time:'Il y a 3j',  color:'#FF6B9D', signal:false },
]

const RANK_STYLE: Record<string,{bg:string;color:string;border:string}> = {
  LEGEND: { bg:'#FFF8E0', color:'#8B6E00', border:'#FFE87A' },
  PRO:    { bg:SNOW.surface, color:SNOW.muted, border:SNOW.border },
}

const POS = SNOW.greenAccent
const NEG = SNOW.red
const EDGE = '0 0 0 0.5px rgba(255,255,255,0.7)'

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function useCountUp(target: number, duration = 650, delay = 0) {
  const [val, setVal] = useState(reduceMotion() ? target : 0)
  useEffect(() => {
    if (reduceMotion()) { setVal(target); return }
    let raf = 0, t0 = 0
    const tick = (t: number) => {
      if (!t0) t0 = t
      const p = Math.min(1, (t - t0 - delay) / duration)
      if (p < 0) { raf = requestAnimationFrame(tick); return }
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick); else setVal(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay])
  return val
}

function Spark({ data, color, w=64, h=22 }:{ data:number[]; color:string; w?:number; h?:number }) {
  const mn=Math.min(...data), mx=Math.max(...data), r=mx-mn||1
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/r)*(h-3)-1.5}`).join(' ')
  const uid=`wk${color.replace('#','')}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block',flexShrink:0}}>
      <defs><linearGradient id={uid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${uid})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function StatCard({ label, value, sub, color, delay }:{ label:string; value:number; sub:string; color:string; delay:number }) {
  const v = useCountUp(value, 700, delay)
  const isMoney = sub.includes('€')
  return (
    <div style={{ ...GLASS.cardSoft, padding:'14px 16px', flex:1, minWidth:'150px', animation:`statIn .5s cubic-bezier(.16,1,.3,1) ${delay}ms both` }}>
      <div style={{ fontSize:'10px', color:SNOW.mutedLight, textTransform:'uppercase', letterSpacing:'.07em', fontFamily:FONT.display, fontWeight:600, marginBottom:'7px' }}>{label}</div>
      <div style={{ fontSize:'24px', fontWeight:800, color, fontFamily:FONT.data, letterSpacing:'-.5px', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
        {isMoney ? `€ ${Math.round(v).toLocaleString('fr-FR')}` : Math.round(v)}
      </div>
      <div style={{ fontSize:'10px', color:SNOW.muted, marginTop:'5px', fontFamily:FONT.body }}>{sub}</div>
    </div>
  )
}

function MoveRow({ move, idx, last, avatar }:{ move:Move; idx:number; last:boolean; avatar:string }) {
  const buy = move.action === 'Acheté'
  const col = buy ? POS : NEG
  const stagger = Math.min(idx, 10) * 45
  const amt = useCountUp(move.amount, 550, stagger)
  return (
    <div className="rh" style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', borderBottom:last?'none':`1px solid ${SNOW.borderSoft}`, transition:'background .12s', animation:`rowIn .4s cubic-bezier(.16,1,.3,1) ${stagger}ms both` }}>
      <div style={{ width:'40px', height:'40px', borderRadius:'11px', background:`linear-gradient(135deg,${move.color}25,${move.color}10)`, border:`1.5px solid ${move.color}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:move.color, flexShrink:0, fontFamily:FONT.display }}>{avatar}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'3px', flexWrap:'wrap' }}>
          <span style={{ fontSize:'12px', fontWeight:700, color:SNOW.ink, fontFamily:FONT.display }}>{move.handle}</span>
          <span style={{ fontSize:'10px', fontWeight:700, color:col, background:buy?'rgba(38,166,91,.10)':SNOW.redLight, padding:'1px 7px', borderRadius:'5px', fontFamily:FONT.display }}>{move.action}</span>
          {move.signal && <span style={{ display:'inline-flex', alignItems:'center', gap:'3px', fontSize:'8px', fontWeight:700, background:SNOW.redLight, color:SNOW.red, border:'1px solid #FFD8D0', padding:'2px 6px', borderRadius:'5px', fontFamily:FONT.display, letterSpacing:'.03em' }}>⚡ SIGNAL DEXY</span>}
        </div>
        <div style={{ fontSize:'12px', color:SNOW.inkSoft, fontFamily:FONT.display, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{move.card}</div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'2px' }}>
          <span style={{ fontSize:'10px', color:SNOW.mutedExtraLight, fontFamily:FONT.body }}>{move.time}</span>
          <span style={{ fontSize:'10px', fontWeight:700, color:move.vsMarket<0?POS:SNOW.mutedLight, fontFamily:FONT.data }}>
            {move.vsMarket<0?`${move.vsMarket}% vs cote`:`+${move.vsMarket}% vs cote`}
          </span>
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:'15px', fontWeight:800, color:col, fontFamily:FONT.data, fontVariantNumeric:'tabular-nums', letterSpacing:'-.3px' }}>
          {buy?'+':'−'} € {Math.round(amt).toLocaleString('fr-FR')}
        </div>
      </div>
    </div>
  )
}

export function Whales({ isPro = false }: { isPro?: boolean }) {
  const [selected, setSelected] = useState<string|null>('1')
  const sel = WHALE_PROFILES.find(w=>w.id===selected)
  const filteredFeed = selected ? WHALE_FEED.filter(f=>f.handle === sel?.handle) : WHALE_FEED
  const feedKey = selected ?? 'all'

  const globalStats = useMemo(() => {
    const buys = WHALE_FEED.filter(m=>m.action==='Acheté')
    const sells = WHALE_FEED.filter(m=>m.action==='Vendu')
    const vol = WHALE_FEED.reduce((s,m)=>s+m.amount,0)
    const signals = WHALE_FEED.filter(m=>m.signal).length
    const net = Math.round((buys.length/(buys.length+sells.length))*100)
    return { vol, moves:WHALE_FEED.length, signals, net }
  }, [])

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes headPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes slideIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes rowIn   { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes statIn  { from{opacity:0;transform:translateY(10px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes toolsIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

        .wp{transition:transform .35s cubic-bezier(.16,1,.3,1), box-shadow .35s cubic-bezier(.16,1,.3,1)}
        .wp:hover{transform:translateY(-2px) scale(1.005)}
        .rh:hover{background:rgba(0,0,0,0.025) !important;cursor:pointer}
        .wt-head{animation:toolsIn .35s cubic-bezier(.16,1,.3,1) both}
        @media(max-width:880px){ .wt-grid{grid-template-columns:1fr !important} }
        @media (prefers-reduced-motion: reduce){
          .wp,.rh,.wt-head{animation:none !important}
          .wp:hover{transform:none !important}
        }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        {/* Header */}
        <div className="wt-head" style={{ marginBottom:'18px' }}>
          <p style={{ fontSize:'10px', color:SNOW.mutedLight, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:FONT.display }}>Alpha</p>
          <h1 style={{ fontSize:'26px', fontWeight:600, color:SNOW.ink, fontFamily:FONT.display, letterSpacing:'-0.5px', margin:'0 0 5px' }}>Whale Tracker</h1>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:POS, animation:'headPulse 1.5s ease-in-out infinite' }} />
            <span style={{ fontSize:'12px', color:SNOW.muted, fontFamily:FONT.body }}>{WHALE_PROFILES.length} collectionneurs trackés · {globalStats.moves} moves sur 30 jours</span>
          </div>
        </div>

        {/* Barre de stats */}
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'22px' }}>
          <StatCard label="Volume tracké 30j" value={globalStats.vol} sub="€ sur tous les whales" color={SNOW.ink} delay={0} />
          <StatCard label="Moves détectés" value={globalStats.moves} sub="achats + ventes" color={SNOW.ink} delay={60} />
          <StatCard label="Signaux Dexy" value={globalStats.signals} sub="moves convertis en alpha" color={SNOW.red} delay={120} />
          <StatCard label="Sentiment net" value={globalStats.net} sub={`${globalStats.net}% acheteur · haussier`} color={POS} delay={180} />
        </div>

        <div className="wt-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1.55fr', gap:'20px', alignItems:'start' }}>

          {/* Profils */}
          <div>
            <div style={{ fontSize:'11px', fontWeight:700, color:SNOW.inkSoft, textTransform:'uppercase', letterSpacing:'0.09em', fontFamily:FONT.display, marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'3px', height:'16px', borderRadius:'2px', background:SNOW.red }} />
              Collectionneurs
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {WHALE_PROFILES.map(whale => {
                const rs = RANK_STYLE[whale.rank]
                const isActive = selected === whale.id
                const up = whale.trend >= 0
                return (
                  <div key={whale.id} className="wp" onClick={()=>setSelected(isActive?null:whale.id)} style={{ ...GLASS.card, padding:'14px 16px', cursor:'pointer', boxShadow:isActive?`${GLASS.card.boxShadow as string}, 0 0 0 1.5px ${whale.color}66`:`${GLASS.card.boxShadow as string}, ${EDGE}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                      <div style={{ width:'46px', height:'46px', borderRadius:'13px', background:`linear-gradient(135deg,${whale.color}33,${whale.color}11)`, border:`2px solid ${whale.color}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, color:whale.color, flexShrink:0, fontFamily:FONT.display }}>{whale.avatar}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                          <span style={{ fontSize:'14px', fontWeight:700, color:SNOW.ink, fontFamily:FONT.display, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{whale.handle}</span>
                          {whale.verified && <span style={{ fontSize:'11px', color:whale.color }}>✓</span>}
                          <span style={{ fontSize:'8px', fontWeight:700, background:rs.bg, color:rs.color, border:`1px solid ${rs.border}`, padding:'2px 6px', borderRadius:'4px', fontFamily:FONT.display, flexShrink:0 }}>{whale.rank}</span>
                        </div>
                        <div style={{ fontSize:'11px', color:SNOW.mutedLight, fontFamily:FONT.body }}>{whale.portfolio} portfolio · {whale.lastSeen}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'3px', flexShrink:0 }}>
                        <Spark data={whale.spark} color={up?POS:NEG} />
                        <span style={{ fontSize:'10px', fontWeight:700, color:up?POS:NEG, fontFamily:FONT.data }}>{up?'▲':'▼'} {Math.abs(whale.trend)}%</span>
                      </div>
                    </div>

                    {/* mini stats inline (toujours visibles) */}
                    <div style={{ display:'flex', gap:'14px', marginTop:'11px', paddingTop:'11px', borderTop:`1px solid ${SNOW.borderSoft}` }}>
                      <div><div style={{ fontSize:'9px', color:SNOW.mutedLight, fontFamily:FONT.display, marginBottom:'2px' }}>Moves 30j</div><div style={{ fontSize:'13px', fontWeight:800, color:SNOW.ink, fontFamily:FONT.data }}>{whale.moves30d}</div></div>
                      <div><div style={{ fontSize:'9px', color:SNOW.mutedLight, fontFamily:FONT.display, marginBottom:'2px' }}>Ratio achat</div><div style={{ fontSize:'13px', fontWeight:800, color:whale.buyRatio>=50?POS:NEG, fontFamily:FONT.data }}>{whale.buyRatio}%</div></div>
                      <div><div style={{ fontSize:'9px', color:SNOW.mutedLight, fontFamily:FONT.display, marginBottom:'2px' }}>Vol. moyen/tx</div><div style={{ fontSize:'13px', fontWeight:800, color:SNOW.ink, fontFamily:FONT.data }}>{whale.avgTx}</div></div>
                    </div>

                    {isActive && (
                      <div style={{ marginTop:'12px', paddingTop:'12px', borderTop:`1px solid ${whale.color}20`, animation:'slideIn 0.2s cubic-bezier(.16,1,.3,1)' }}>
                        <p style={{ fontSize:'12px', color:SNOW.muted, lineHeight:1.6, margin:'0 0 10px', fontFamily:FONT.body }}>{whale.bio}</p>
                        <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                          {whale.focus.map(f=>(
                            <span key={f} style={{ fontSize:'10px', background:`${whale.color}15`, color:whale.color, border:`1px solid ${whale.color}30`, padding:'2px 9px', borderRadius:'10px', fontFamily:FONT.display, fontWeight:600 }}>{f}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Feed */}
          <div>
            <div style={{ fontSize:'11px', fontWeight:700, color:SNOW.inkSoft, textTransform:'uppercase', letterSpacing:'0.09em', fontFamily:FONT.display, marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <div style={{ width:'3px', height:'16px', borderRadius:'2px', background:SNOW.red }} />
                {sel ? `Moves — ${sel.handle}` : 'Tous les moves · Live'}
                <span style={{ fontSize:'10px', fontWeight:700, color:SNOW.muted, background:SNOW.surface, padding:'1px 7px', borderRadius:'6px', fontFamily:FONT.data }}>{filteredFeed.length}</span>
              </div>
              {selected && <button onClick={()=>setSelected(null)} style={{ fontSize:'11px', color:SNOW.muted, background:'none', border:'none', cursor:'pointer', fontFamily:FONT.display, fontWeight:600 }}>Voir tous →</button>}
            </div>

            {/* Encart thèse quand un whale est sélectionné */}
            {sel && (
              <div style={{ ...GLASS.cardSoft, padding:'13px 16px', marginBottom:'10px', display:'flex', alignItems:'center', gap:'12px', animation:'slideIn .25s cubic-bezier(.16,1,.3,1)', borderLeft:`3px solid ${sel.color}` }}>
                <span style={{ fontSize:'18px' }}>🐋</span>
                <p style={{ fontSize:'12px', color:SNOW.inkSoft, lineHeight:1.55, margin:0, fontFamily:FONT.body }}>
                  <b style={{ color:SNOW.ink }}>{sel.handle}</b> accumule sur <b style={{ color:sel.color }}>{sel.focus[0]}</b> — ratio achat {sel.buyRatio}%, tendance {sel.trend>=0?'haussière':'baissière'} sur 7j. Ses achats sous la cote signalent une conviction forte.
                </p>
              </div>
            )}

            <div key={feedKey} style={{ ...GLASS.card, overflow:'hidden', boxShadow:`${GLASS.card.boxShadow as string}, ${EDGE}` }}>
              {filteredFeed.length === 0 ? (
                <div style={{ padding:'50px 20px', textAlign:'center' }}>
                  <p style={{ fontSize:'13px', color:SNOW.mutedExtraLight, margin:0, fontFamily:FONT.body }}>Aucun move récent pour ce collectionneur.</p>
                </div>
              ) : filteredFeed.map((move,i)=>{
                const whale = WHALE_PROFILES.find(w=>w.handle===move.handle)
                return <MoveRow key={`${move.id}-${feedKey}`} move={move} idx={i} last={i===filteredFeed.length-1} avatar={whale?.avatar ?? move.handle.slice(0,2).toUpperCase()} />
              })}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
