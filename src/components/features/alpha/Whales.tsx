'use client'

import { useState } from 'react'

const WHALE_PROFILES = [
  {
    id:'1', handle:'RedDragonKai', rank:'LEGEND', verified:true,
    avatar:'RK', color:'#FFD700',
    bio:"Collectionneur vintage #1 France. Spécialisé Alt Art & PSA 10 japonais.",
    stats:{ portfolio:'€ 2.4M', moves30d:48, avgTx:'€ 8,400', totalVol:'€ 403,200' },
    focus:['Alt Art','Vintage','PSA 10','JP Market'],
    lastSeen:'Il y a 2h',
  },
  {
    id:'2', handle:'SakuraTCG', rank:'LEGEND', verified:true,
    avatar:'ST', color:'#FF6B9D',
    bio:"Investisseur TCG — focus Evolving Skies & sets OOP. JP/EN arb.",
    stats:{ portfolio:'€ 1.1M', moves30d:31, avgTx:'€ 4,200', totalVol:'€ 130,200' },
    focus:['Evolving Skies','OOP Sets','Arbitrage JP/EN'],
    lastSeen:'Il y a 5h',
  },
  {
    id:'3', handle:'GoldStarFR', rank:'PRO', verified:false,
    avatar:'GS', color:'#C855D4',
    bio:"Gold Star hunter. Cherche les PSA pop faibles en grade 9.",
    stats:{ portfolio:'€ 340K', moves30d:18, avgTx:'€ 2,800', totalVol:'€ 50,400' },
    focus:['Gold Star','PSA 9','EX Era'],
    lastSeen:'Il y a 1j',
  },
  {
    id:'4', handle:'VintageJP', rank:'PRO', verified:true,
    avatar:'VJ', color:'#42A5F5',
    bio:"Vintage JP specialist. Base Set, Neo, e-Series.",
    stats:{ portfolio:'€ 280K', moves30d:12, avgTx:'€ 3,100', totalVol:'€ 37,200' },
    focus:['Vintage JP','e-Series','Neo Era'],
    lastSeen:'Il y a 3j',
  },
]

const WHALE_FEED = [
  { id:1,  handle:'RedDragonKai', action:'Acheté', card:'Charizard Alt Art PSA 10',     amount:4200,  time:'Il y a 2h',   color:'#FFD700', signal:true  },
  { id:2,  handle:'RedDragonKai', action:'Acheté', card:'Umbreon VMAX Alt Art ×3',       amount:2640,  time:'Il y a 2h',   color:'#FFD700', signal:false },
  { id:3,  handle:'SakuraTCG',    action:'Acheté', card:'Rayquaza VMAX Alt Art',          amount:1480,  time:'Il y a 5h',   color:'#FF6B9D', signal:true  },
  { id:4,  handle:'GoldStarFR',   action:'Vendu',  card:'Pikachu Gold Star PSA 9',        amount:3200,  time:'Il y a 8h',   color:'#C855D4', signal:false },
  { id:5,  handle:'SakuraTCG',    action:'Acheté', card:'Evolving Skies Display EN',      amount:2200,  time:'Il y a 12h',  color:'#FF6B9D', signal:false },
  { id:6,  handle:'VintageJP',    action:'Acheté', card:'Lugia Neo Genesis PSA 8 ×2',     amount:1160,  time:'Il y a 1j',   color:'#42A5F5', signal:false },
  { id:7,  handle:'RedDragonKai', action:'Acheté', card:'Espeon VMAX Alt Art Raw ×5',     amount:1590,  time:'Il y a 1j',   color:'#FFD700', signal:false },
  { id:8,  handle:'GoldStarFR',   action:'Acheté', card:'Rayquaza Gold Star PSA 8',       amount:4800,  time:'Il y a 2j',   color:'#C855D4', signal:true  },
  { id:9,  handle:'VintageJP',    action:'Vendu',  card:'Charizard Base Set 1st Ed. Raw', amount:6400,  time:'Il y a 3j',   color:'#42A5F5', signal:false },
  { id:10, handle:'SakuraTCG',    action:'Acheté', card:'Gengar VMAX Alt Art ×2',         amount:680,   time:'Il y a 3j',   color:'#FF6B9D', signal:false },
]

const RANK_STYLE: Record<string,{bg:string;color:string;border:string}> = {
  LEGEND: { bg:'#FFF8E0', color:'#8B6E00', border:'#FFE87A' },
  PRO:    { bg:'#F5F5F5', color:'#555',    border:'#E0E0E0' },
}

export function Whales({ isPro = false }: { isPro?: boolean }) {
  const [selected, setSelected] = useState<string|null>('1')
  const sel = WHALE_PROFILES.find(w=>w.id===selected)

  const filteredFeed = selected
    ? WHALE_FEED.filter(f=>f.handle === WHALE_PROFILES.find(w=>w.id===selected)?.handle)
    : WHALE_FEED

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        .wp:hover          { border-color:#D4D4D4 !important; background:#FAFAFA !important; }
        .rh:hover          { background:#F8F8F8 !important; cursor:pointer; }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        <div style={{ marginBottom:'22px' }}>
          <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Alpha</p>
          <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:'0 0 5px' }}>Whale Tracker</h1>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#2E9E6A', animation:'pulse 1.5s ease-in-out infinite' }} />
            <span style={{ fontSize:'12px', color:'#888' }}>{WHALE_PROFILES.length} collectionneurs trackés · moves en temps réel</span>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr', gap:'20px' }}>

          {/* Profils */}
          <div>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#444', textTransform:'uppercase', letterSpacing:'0.09em', fontFamily:'var(--font-display)', marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'3px', height:'16px', borderRadius:'2px', background:'#E03020' }} />
              Collectionneurs
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {WHALE_PROFILES.map(whale => {
                const rs = RANK_STYLE[whale.rank]
                const isActive = selected === whale.id
                return (
                  <div key={whale.id} className="wp" onClick={()=>setSelected(isActive?null:whale.id)} style={{ background:isActive?'#FFFDE0':'#fff', border:`1.5px solid ${isActive?whale.color+'60':'#EBEBEB'}`, borderRadius:'14px', padding:'14px 16px', cursor:'pointer', transition:'all 0.15s', boxShadow:isActive?`0 4px 16px ${whale.color}20`:'none' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                      <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:`linear-gradient(135deg,${whale.color}33,${whale.color}11)`, border:`2px solid ${whale.color}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, color:whale.color, flexShrink:0, fontFamily:'var(--font-display)' }}>
                        {whale.avatar}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                          <span style={{ fontSize:'14px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{whale.handle}</span>
                          {whale.verified && <span style={{ fontSize:'11px', color:whale.color }}>✓</span>}
                          <span style={{ fontSize:'8px', fontWeight:700, background:rs.bg, color:rs.color, border:`1px solid ${rs.border}`, padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-display)', flexShrink:0 }}>{whale.rank}</span>
                        </div>
                        <div style={{ fontSize:'11px', color:'#AAA' }}>{whale.stats.portfolio} · {whale.lastSeen}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:'13px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>{whale.stats.moves30d}</div>
                        <div style={{ fontSize:'9px', color:'#AAA' }}>moves 30j</div>
                      </div>
                    </div>
                    {isActive && sel && (
                      <div style={{ marginTop:'12px', paddingTop:'12px', borderTop:`1px solid ${whale.color}20`, animation:'slideIn 0.15s ease-out' }}>
                        <p style={{ fontSize:'12px', color:'#666', lineHeight:1.6, margin:'0 0 10px', fontFamily:'var(--font-sans)' }}>{whale.bio}</p>
                        <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', marginBottom:'10px' }}>
                          {whale.focus.map(f=>(
                            <span key={f} style={{ fontSize:'10px', background:`${whale.color}15`, color:whale.color, border:`1px solid ${whale.color}30`, padding:'2px 8px', borderRadius:'10px', fontFamily:'var(--font-display)' }}>{f}</span>
                          ))}
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                          {[
                            { label:'Vol. moyen/tx', value:sel.stats.avgTx },
                            { label:'Vol. 30 jours',  value:sel.stats.totalVol },
                          ].map(s=>(
                            <div key={s.label} style={{ background:'#FAFAFA', borderRadius:'7px', padding:'8px 10px' }}>
                              <div style={{ fontSize:'9px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:'var(--font-display)', marginBottom:'3px' }}>{s.label}</div>
                              <div style={{ fontSize:'13px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>{s.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Feed moves */}
          <div>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#444', textTransform:'uppercase', letterSpacing:'0.09em', fontFamily:'var(--font-display)', marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <div style={{ width:'3px', height:'16px', borderRadius:'2px', background:'#E03020' }} />
                {selected ? `Moves — ${WHALE_PROFILES.find(w=>w.id===selected)?.handle}` : 'Tous les moves · Live'}
              </div>
              {selected && <button onClick={()=>setSelected(null)} style={{ fontSize:'11px', color:'#888', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-display)' }}>Voir tous →</button>}
            </div>
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', overflow:'hidden' }}>
              {filteredFeed.map((move,i)=>{
                const whale = WHALE_PROFILES.find(w=>w.handle===move.handle)
                return (
                  <div key={move.id} className="rh" style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', borderBottom:i<filteredFeed.length-1?'1px solid #F5F5F5':'none', transition:'background 0.1s' }}>
                    <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:`linear-gradient(135deg,${move.color}25,${move.color}10)`, border:`1.5px solid ${move.color}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:move.color, flexShrink:0, fontFamily:'var(--font-display)' }}>
                      {whale?.avatar ?? move.handle.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px', flexWrap:'wrap' }}>
                        <span style={{ fontSize:'12px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)' }}>{move.handle}</span>
                        <span style={{ fontSize:'11px', color:move.action==='Acheté'?'#2E9E6A':'#E03020', fontWeight:500 }}>{move.action}</span>
                        {move.signal && <span style={{ fontSize:'8px', fontWeight:700, background:'#FFF0EE', color:'#E03020', border:'1px solid #FFD8D0', padding:'1px 5px', borderRadius:'3px', fontFamily:'var(--font-display)' }}>Signal Dexy</span>}
                      </div>
                      <div style={{ fontSize:'12px', color:'#555', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{move.card}</div>
                      <div style={{ fontSize:'10px', color:'#BBB', marginTop:'1px' }}>{move.time}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:'14px', fontWeight:700, color:move.action==='Acheté'?'#2E9E6A':'#E03020', fontFamily:'var(--font-display)' }}>
                        {move.action==='Acheté'?'+':'−'} € {move.amount.toLocaleString('fr-FR')}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
