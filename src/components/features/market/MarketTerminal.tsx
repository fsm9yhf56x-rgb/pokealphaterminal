'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const INDICES = [
  { id:'cards',   label:'Cards Index',  value:2841, prev:2748, change:3.8,  color:'#FF6B35', desc:'Toutes cartes raw & gradées' },
  { id:'sealed',  label:'Sealed Index', value:4120, prev:4166, change:-1.1, color:'#42A5F5', desc:'Boosters & displays scellés'  },
  { id:'vintage', label:'Vintage',      value:8740, prev:8184, change:6.8,  color:'#FFD700', desc:'Cartes avant 2003'            },
  { id:'graded',  label:'Graded PSA',   value:6380, prev:6189, change:3.1,  color:'#C855D4', desc:'PSA 9 & PSA 10 uniquement'   },
]

const MOVERS_UP = [
  { name:'Rayquaza Gold Star',     set:'EX Deoxys',      price:740,  change:31.2, vol:48,  type:'electric' },
  { name:'Umbreon VMAX Alt Art',   set:'Evolving Skies', price:880,  change:24.1, vol:112, type:'dark'     },
  { name:'Charizard Alt Art',      set:'SV151',          price:920,  change:21.3, vol:203, type:'fire'     },
  { name:'Gengar VMAX Alt Art',    set:'Fusion Strike',  price:340,  change:18.4, vol:67,  type:'psychic'  },
  { name:'Lugia Neo Genesis',      set:'Neo Genesis',    price:580,  change:15.2, vol:31,  type:'water'    },
]

const MOVERS_DOWN = [
  { name:'Blastoise Base Set',  set:'Base Set',      price:620, change:-4.2, vol:24,  type:'water'    },
  { name:'Pikachu VMAX RR',     set:'Vivid Voltage', price:110, change:-3.8, vol:89,  type:'electric' },
  { name:'Mewtwo GX Rainbow',   set:'Unified Minds', price:95,  change:-2.9, vol:44,  type:'psychic'  },
]

const TRANSACTIONS = [
  { id:1, card:'Charizard Alt Art PSA 10', price:1240, type:'buy',  source:'eBay',  time:'Il y a 1 min',  seller:'RedDragonKai', hot:true  },
  { id:2, card:'Umbreon VMAX Alt Art Raw', price:880,  type:'buy',  source:'CM',    time:'Il y a 3 min',  seller:'SakuraTCG',   hot:false },
  { id:3, card:'Rayquaza Gold Star PSA 9', price:720,  type:'sell', source:'eBay',  time:'Il y a 5 min',  seller:'GoldStarFR',  hot:false },
  { id:4, card:'Lugia Neo Genesis PSA 8',  price:580,  type:'buy',  source:'eBay',  time:'Il y a 7 min',  seller:'VintageJP',   hot:false },
  { id:5, card:'Gengar VMAX Alt Art Raw',  price:340,  type:'buy',  source:'CM',    time:'Il y a 9 min',  seller:'PsychicDeck', hot:false },
  { id:6, card:'Mew ex Alt Art Raw',       price:142,  type:'sell', source:'eBay',  time:'Il y a 11 min', seller:'NewCollect',  hot:false },
  { id:7, card:'Charizard VMAX PSA 10',    price:890,  type:'buy',  source:'TCGp',  time:'Il y a 14 min', seller:'FireKing',    hot:false },
  { id:8, card:'Pikachu Illus. Rare',      price:210,  type:'buy',  source:'CM',    time:'Il y a 18 min', seller:'ElectroPika', hot:false },
]

// Heatmap — triée par volume décroissant pour treemap feeling
const HEATMAP = [
  { name:'Charizard',  pct:21.3, vol:203 },
  { name:'Umbreon',    pct:24.1, vol:112 },
  { name:'Pikachu',    pct:-3.8, vol:89  },
  { name:'Gengar',     pct:18.4, vol:67  },
  { name:'Eevee',      pct:5.4,  vol:52  },
  { name:'Mewtwo',     pct:-2.9, vol:44  },
  { name:'Mew',        pct:9.1,  vol:38  },
  { name:'Rayquaza',   pct:31.2, vol:48  },
  { name:'Dragonite',  pct:14.8, vol:33  },
  { name:'Snorlax',    pct:3.2,  vol:27  },
  { name:'Raichu',     pct:11.2, vol:29  },
  { name:'Alakazam',   pct:7.6,  vol:21  },
  { name:'Gyarados',   pct:-6.1, vol:19  },
  { name:'Machamp',    pct:2.1,  vol:18  },
  { name:'Venusaur',   pct:-1.4, vol:15  },
  { name:'Blastoise',  pct:-4.2, vol:24  },
  { name:'Lugia',      pct:15.2, vol:31  },
  { name:'Arcanine',   pct:8.9,  vol:24  },
  { name:'Jigglypuff', pct:4.3,  vol:16  },
  { name:'Clefairy',   pct:-0.8, vol:11  },
].sort((a,b) => b.vol - a.vol)

const UNDERVALUED = [
  { name:'Blissey V Alt Art',    set:'Chilling Reign', fair:180, listed:128, gap:28, conf:81, source:'eBay', lang:'EN', signal:'A' },
  { name:'Espeon VMAX Alt Art',  set:'Evolving Skies', fair:420, listed:318, gap:24, conf:74, source:'CM',   lang:'JP', signal:'A' },
  { name:'Glaceon VMAX Alt Art', set:'Evolving Skies', fair:260, listed:198, gap:24, conf:69, source:'eBay', lang:'EN', signal:'B' },
  { name:'Leafeon VMAX Alt Art', set:'Evolving Skies', fair:310, listed:241, gap:22, conf:72, source:'CM',   lang:'EN', signal:'B' },
  { name:'Ditto V Alt Art',      set:'Fusion Strike',  fair:95,  listed:74,  gap:22, conf:61, source:'eBay', lang:'JP', signal:'B' },
]

const EC: Record<string,string> = {
  fire:'#FF6B35', water:'#42A5F5', psychic:'#C855D4',
  dark:'#7E57C2', electric:'#D4A800', grass:'#3DA85A',
}

function heatStyle(pct: number, vol: number) {
  const abs       = Math.abs(pct)
  const isUp      = pct >= 0
  const intensity = Math.min(abs / 30, 1) // 0→1 selon amplitude

  // Couleurs : vert pour hausse, rouge pour baisse — saturation proportionnelle
  // Fond léger → coloré selon intensité
  const bg = isUp
    ? `hsl(152, ${Math.round(40 + intensity * 55)}%, ${Math.round(97 - intensity * 28)}%)`
    : `hsl(4,   ${Math.round(40 + intensity * 55)}%, ${Math.round(97 - intensity * 28)}%)`

  const textMain = isUp
    ? `hsl(152, ${Math.round(50 + intensity * 30)}%, ${Math.round(28 - intensity * 8)}%)`
    : `hsl(4,   ${Math.round(50 + intensity * 30)}%, ${Math.round(32 - intensity * 10)}%)`

  const border = isUp
    ? `hsl(152, ${Math.round(35 + intensity * 40)}%, ${Math.round(80 - intensity * 30)}%)`
    : `hsl(4,   ${Math.round(35 + intensity * 40)}%, ${Math.round(80 - intensity * 30)}%)`

  // Taille : basée sur le volume
  const maxVol = 203
  const t      = Math.min(vol / maxVol, 1)
  // 3 tailles : sm (vol < 30), md (30–80), lg (80+)
  const size   = vol >= 80 ? 'lg' : vol >= 30 ? 'md' : 'sm'

  return { bg, textMain, border, size, intensity }
}

function Sec({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
      <div style={{ width:'3px', height:'16px', borderRadius:'2px', background:'#E03020', flexShrink:0 }} />
      <span style={{ fontSize:'11px', fontWeight:700, color:'#444', textTransform:'uppercase' as const, letterSpacing:'0.09em', fontFamily:'var(--font-display)' }}>{children}</span>
      <div style={{ flex:1, height:'1px', background:'#EBEBEB' }} />
      {action}
    </div>
  )
}

function LiveDot() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
      <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#2E9E6A', animation:'pulse 1.5s ease-in-out infinite' }} />
      <span style={{ fontSize:'10px', color:'#2E9E6A', fontWeight:600, fontFamily:'var(--font-display)' }}>LIVE</span>
    </div>
  )
}

export function MarketTerminal({ isPro = false, defaultTab = 'movers' }: { isPro?: boolean; defaultTab?: string }) {
  const [tab,        setTab]        = useState<'movers'|'undervalued'>(defaultTab as 'movers'|'undervalued')
  const [feedPaused, setFeedPaused] = useState(false)
  const [feed,       setFeed]       = useState(TRANSACTIONS)
  const [newTx,      setNewTx]      = useState<number|null>(null)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (feedPaused) return
    const t = setInterval(() => {
      const mock = TRANSACTIONS[Math.floor(Math.random()*TRANSACTIONS.length)]
      const tx = { ...mock, id: Date.now(), time:"À l'instant" }
      setFeed(prev => [tx, ...prev.slice(0,14)])
      setNewTx(tx.id)
      setTimeout(() => setNewTx(null), 1500)
    }, 6000)
    return () => clearInterval(t)
  }, [feedPaused])

  const totalVol = MOVERS_UP.reduce((s,m)=>s+m.vol,0) + MOVERS_DOWN.reduce((s,m)=>s+m.vol,0)

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        @keyframes txSlide { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cellIn  { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }

        .rh:hover          { background:#F8F8F8 !important; cursor:pointer; }
        .mover-row:hover   { background:#F8F8F8 !important; cursor:pointer; }
        .hc:hover          { filter:brightness(0.94) !important; transform:scale(1.03) !important; z-index:2; }
        .tab-btn           { padding:7px 16px; border-radius:8px; border:none; background:transparent; color:#666; font-size:12px; font-weight:500; cursor:pointer; font-family:var(--font-display); transition:all 0.12s; }
        .tab-btn:hover     { background:#F0F0F0; }
        .tab-btn.on        { background:#111 !important; color:#fff !important; }
        .tx-new            { animation: txSlide 0.35s ease-out; }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        {/* ── HEADER ─────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'22px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Market</p>
            <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:'0 0 6px' }}>Terminal</h1>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <LiveDot />
              <span style={{ fontSize:'12px', color:'#888' }}>Mise à jour toutes les 15 min · {totalVol} transactions aujourd'hui</span>
            </div>
          </div>
          <div style={{ fontSize:'12px', color:'#888', background:'#F5F5F5', padding:'6px 12px', borderRadius:'8px', fontFamily:'var(--font-display)' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
          </div>
        </div>

        {/* ── INDICES ────────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'22px' }}>
          {INDICES.map(idx => {
            const gain = idx.value - idx.prev
            return (
              <div key={idx.id} style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', padding:'16px 18px', position:'relative', overflow:'hidden', cursor:'pointer' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:idx.color, borderRadius:'14px 14px 0 0' }} />
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'10px' }}>
                  <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:idx.color }} />
                  <span style={{ fontSize:'10px', color:'#888', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:'var(--font-display)', fontWeight:600 }}>{idx.label}</span>
                </div>
                <div style={{ fontSize:'28px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-1px', lineHeight:1, marginBottom:'6px' }}>
                  {idx.value.toLocaleString('fr-FR')}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'12px', fontWeight:600, color:idx.change>=0?'#2E9E6A':'#E03020' }}>
                    {idx.change>=0?'▲':'▼'} {Math.abs(idx.change)}%
                  </span>
                  <span style={{ fontSize:'11px', color:gain>=0?'#2E9E6A':'#E03020', fontFamily:'var(--font-display)' }}>
                    {gain>=0?'+':''}{gain.toLocaleString('fr-FR')} pts
                  </span>
                </div>
                <div style={{ fontSize:'10px', color:'#CCC', marginTop:'4px' }}>{idx.desc}</div>
              </div>
            )
          })}
        </div>

        {/* ── MOVERS + FEED ──────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' }}>

          {/* Movers / Undervalued */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
              <Sec>{tab==='movers' ? 'Top Movers · 24h' : 'Sous-évalués · Live'}</Sec>
              <div style={{ display:'flex', gap:'3px', background:'#F5F5F5', borderRadius:'8px', padding:'3px', marginLeft:'8px', flexShrink:0 }}>
                <button onClick={()=>setTab('movers')}      className={`tab-btn${tab==='movers'?      ' on':''}`}>Movers</button>
                <button onClick={()=>setTab('undervalued')} className={`tab-btn${tab==='undervalued'? ' on':''}`}>
                  Sous-évalués {!isPro && <span style={{ fontSize:'9px', background:'#E03020', color:'#fff', padding:'1px 4px', borderRadius:'3px', marginLeft:'3px' }}>PRO</span>}
                </button>
              </div>
            </div>

            {tab==='movers' && (
              <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', overflow:'hidden' }}>
                <div style={{ padding:'8px 14px', background:'#F5FFF9', borderBottom:'1px solid #E0F5EA', display:'flex', alignItems:'center', gap:'6px' }}>
                  <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#2E9E6A' }} />
                  <span style={{ fontSize:'10px', fontWeight:700, color:'#2E9E6A', fontFamily:'var(--font-display)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Hausse · {MOVERS_UP.length}</span>
                </div>
                {MOVERS_UP.map((m,i)=>(
                  <div key={m.name} className="mover-row" style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', borderBottom:'1px solid #F5F5F5', transition:'background 0.1s' }}>
                    <div style={{ width:'32px', height:'44px', borderRadius:'6px', background:`linear-gradient(145deg,${EC[m.type]??'#888'}20,${EC[m.type]??'#888'}08)`, border:`1.5px solid ${EC[m.type]??'#888'}28`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:EC[m.type]??'#888', opacity:0.6 }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>
                      <div style={{ fontSize:'10px', color:'#BBB', marginTop:'2px' }}>{m.set} · {m.vol} tx</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'14px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>€ {m.price}</div>
                      <div style={{ fontSize:'12px', fontWeight:700, color:'#2E9E6A' }}>▲ +{m.change}%</div>
                    </div>
                  </div>
                ))}
                <div style={{ padding:'8px 14px', background:'#FFF5F5', borderTop:'1px solid #F5E0E0', borderBottom:'1px solid #F5E0E0', display:'flex', alignItems:'center', gap:'6px' }}>
                  <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#E03020' }} />
                  <span style={{ fontSize:'10px', fontWeight:700, color:'#E03020', fontFamily:'var(--font-display)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Baisse · {MOVERS_DOWN.length}</span>
                </div>
                {MOVERS_DOWN.map((m,i)=>(
                  <div key={m.name} className="mover-row" style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', borderBottom:i<MOVERS_DOWN.length-1?'1px solid #F5F5F5':'none', transition:'background 0.1s' }}>
                    <div style={{ width:'32px', height:'44px', borderRadius:'6px', background:`linear-gradient(145deg,${EC[m.type]??'#888'}20,${EC[m.type]??'#888'}08)`, border:`1.5px solid ${EC[m.type]??'#888'}28`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:EC[m.type]??'#888', opacity:0.6 }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>
                      <div style={{ fontSize:'10px', color:'#BBB', marginTop:'2px' }}>{m.set} · {m.vol} tx</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'14px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>€ {m.price}</div>
                      <div style={{ fontSize:'12px', fontWeight:700, color:'#E03020' }}>▼ {m.change}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab==='undervalued' && (
              isPro ? (
                <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', overflow:'hidden' }}>
                  {UNDERVALUED.map((u,i)=>(
                    <div key={u.name} className="mover-row" style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 14px', borderBottom:i<UNDERVALUED.length-1?'1px solid #F5F5F5':'none', transition:'background 0.1s' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                          <span style={{ fontSize:'13px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)' }}>{u.name}</span>
                          <span style={{ fontSize:'8px', fontWeight:700, background:u.signal==='A'?'#C855D4':'#2E9E6A', color:'#fff', padding:'2px 5px', borderRadius:'3px', fontFamily:'var(--font-display)', flexShrink:0 }}>Tier {u.signal}</span>
                        </div>
                        <div style={{ fontSize:'10px', color:'#BBB' }}>{u.set} · {u.source} · {u.lang}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'14px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>€ {u.listed}</div>
                        <div style={{ fontSize:'11px', color:'#AAA', textDecoration:'line-through' }}>€ {u.fair}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'14px', fontWeight:700, color:'#2E9E6A', fontFamily:'var(--font-display)' }}>-{u.gap}%</div>
                        <div style={{ fontSize:'10px', color:'#AAA' }}>{u.conf}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ position:'relative', borderRadius:'14px', overflow:'hidden' }}>
                  <div style={{ filter:'blur(2px)', pointerEvents:'none', opacity:0.65, background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px' }}>
                    {UNDERVALUED.map((u,i)=>(
                      <div key={u.name} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 14px', borderBottom:i<UNDERVALUED.length-1?'1px solid #F5F5F5':'none' }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'13px', color:'#AAA', fontFamily:'var(--font-display)' }}>{u.name}</div>
                          <div style={{ fontSize:'10px', color:'#CCC' }}>{u.set}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:'14px', fontWeight:700, color:'#AAA' }}>€ {u.listed}</div>
                          <div style={{ fontSize:'14px', fontWeight:700, color:'#AAA' }}>-{u.gap}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.7)', borderRadius:'14px', gap:'8px', padding:'20px', textAlign:'center' }}>
                    <div style={{ fontSize:'16px' }}>🔒</div>
                    <div style={{ fontSize:'14px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)' }}>Réservé Pro</div>
                    <div style={{ fontSize:'12px', color:'#888', maxWidth:'200px', lineHeight:1.5 }}>{UNDERVALUED.length} deals sous valeur marché détectés maintenant</div>
                    <button onClick={()=>window.location.href='/signup'} style={{ padding:'8px 20px', borderRadius:'20px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', marginTop:'4px' }}>Passer Pro →</button>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Flux transactions */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
              <Sec><LiveDot />&nbsp;Flux de transactions</Sec>
              <button onClick={()=>setFeedPaused(p=>!p)} style={{ fontSize:'11px', color:feedPaused?'#E03020':'#888', background:feedPaused?'#FFF0EE':'#F5F5F5', border:`1px solid ${feedPaused?'#FFD8D0':'#EBEBEB'}`, padding:'4px 12px', borderRadius:'7px', cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:500, flexShrink:0 }}>
                {feedPaused ? '▶ Reprendre' : '⏸ Pause'}
              </button>
            </div>
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', overflow:'hidden', maxHeight:'480px', overflowY:'auto' }} ref={feedRef}>
              {feed.map((tx,i)=>(
                <div key={tx.id} className={`rh${tx.id===newTx?' tx-new':''}`} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'11px 14px', borderBottom:i<feed.length-1?'1px solid #F5F5F5':'none', transition:'background 0.1s', background:tx.id===newTx?'#F5FFF9':'transparent' }}>
                  <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:tx.type==='buy'?'#F0FFF6':'#FFF0EE', border:`1px solid ${tx.type==='buy'?'#AAEEC8':'#FFD8D0'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', flexShrink:0 }}>
                    {tx.type==='buy'?'↗':'↙'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'2px' }}>
                      <span style={{ fontSize:'12px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.card}</span>
                      {tx.hot && <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#E03020', flexShrink:0, animation:'pulse 1.5s ease-in-out infinite' }} />}
                    </div>
                    <div style={{ fontSize:'10px', color:'#BBB' }}>{tx.source} · {tx.seller} · {tx.time}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>€ {tx.price.toLocaleString('fr-FR')}</div>
                    <div style={{ fontSize:'10px', fontWeight:600, color:tx.type==='buy'?'#2E9E6A':'#E03020' }}>{tx.type==='buy'?'Achat':'Vente'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── HEATMAP ── fond blanc, design propre ─────── */}
        <div>
          <Sec action={
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              {/* Légende inline */}
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                {[
                  { label:'>+15%', bg:'hsl(152,78%,82%)', border:'hsl(152,60%,70%)' },
                  { label:'+5%',   bg:'hsl(152,50%,91%)', border:'hsl(152,40%,82%)' },
                  { label:'0',     bg:'#F5F5F5',           border:'#E8E8E8'          },
                  { label:'-5%',   bg:'hsl(4,50%,91%)',    border:'hsl(4,40%,82%)'   },
                  { label:'<-15%', bg:'hsl(4,78%,82%)',    border:'hsl(4,60%,70%)'   },
                ].map(l=>(
                  <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                    <div style={{ width:'12px', height:'12px', borderRadius:'3px', background:l.bg, border:`1px solid ${l.border}` }} />
                    <span style={{ fontSize:'10px', color:'#AAA', fontFamily:'var(--font-display)' }}>{l.label}</span>
                  </div>
                ))}
              </div>
              <span style={{ fontSize:'11px', color:'#AAA', fontFamily:'var(--font-display)' }}>
                {HEATMAP.length} Pokémon · 24h
              </span>
            </div>
          }>Market Heatmap</Sec>

          <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'16px', padding:'16px' }}>
            {/* Grille flexible — les grosses cartes (vol élevé) sont plus larges */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
              {HEATMAP.map((cell, idx) => {
                const { bg, textMain, border, size, intensity } = heatStyle(cell.pct, cell.vol)
                const abs = Math.abs(cell.pct)

                // Largeur variable : lg = 180px, md = 130px, sm = 90px
                const w = size === 'lg' ? '180px' : size === 'md' ? '130px' : '90px'
                const h = size === 'lg' ? '88px'  : size === 'md' ? '76px'  : '64px'
                const fsPct = size === 'lg' ? '20px' : size === 'md' ? '17px' : '14px'
                const fsName = size === 'lg' ? '12px' : '11px'

                return (
                  <div key={cell.name} className="hc" style={{
                    width: w,
                    height: h,
                    flexShrink: 0,
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    cursor: 'pointer',
                    transition: 'all 0.18s cubic-bezier(0.34,1.2,0.64,1)',
                    animation: `cellIn 0.25s ${Math.min(idx,12)*0.025}s ease-out both`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Subtle top border accent */}
                    <div style={{ position:'absolute', top:0, left:'15%', right:'15%', height:'2px', background: cell.pct>=0 ? `hsl(152,${Math.round(55+intensity*30)}%,${Math.round(55-intensity*20)}%)` : `hsl(4,${Math.round(55+intensity*30)}%,${Math.round(55-intensity*20)}%)`, borderRadius:'0 0 2px 2px', opacity: 0.5 + intensity * 0.5 }} />

                    <div style={{ fontSize:fsName, fontWeight:600, color:'rgba(0,0,0,0.55)', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'88%', letterSpacing:'0.01em' }}>
                      {cell.name}
                    </div>
                    <div style={{ fontSize:fsPct, fontWeight:800, color:textMain, fontFamily:'var(--font-display)', letterSpacing:'-0.4px', lineHeight:1 }}>
                      {cell.pct>=0?'+':''}{cell.pct}%
                    </div>
                    {size !== 'sm' && (
                      <div style={{ fontSize:'9px', color:'rgba(0,0,0,0.3)', fontFamily:'var(--font-display)' }}>
                        {cell.vol} tx
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer info */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'12px', paddingTop:'10px', borderTop:'1px solid #F0F0F0' }}>
              <span style={{ fontSize:'11px', color:'#BBB', fontFamily:'var(--font-display)' }}>
                Taille des cellules proportionnelle au volume de transactions
              </span>
              <span style={{ fontSize:'11px', color:'#BBB', fontFamily:'var(--font-display)' }}>
                Dernière mise à jour · {new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})}
              </span>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
