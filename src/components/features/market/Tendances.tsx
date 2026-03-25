'use client'

import { useState } from 'react'

const PERIODS = ['7J','1M','3M','6M','1A'] as const
type Period = typeof PERIODS[number]

const TRENDING_SETS: Record<Period, {set:string; change:number; vol:number; top:string}[]> = {
  '7J': [
    { set:'SV151',          change:8.4,  vol:1240, top:'Charizard Alt Art'   },
    { set:'Evolving Skies', change:6.1,  vol:980,  top:'Umbreon VMAX Alt'    },
    { set:'Neo Genesis',    change:12.3, vol:310,  top:'Lugia Holo'          },
    { set:'Base Set',       change:-2.1, vol:180,  top:'Charizard 1st Ed.'   },
    { set:'Fusion Strike',  change:3.8,  vol:620,  top:'Gengar VMAX Alt'     },
    { set:'Champion Path',  change:1.2,  vol:440,  top:'Charizard V'         },
  ],
  '1M': [
    { set:'Evolving Skies', change:18.4, vol:4200, top:'Umbreon VMAX Alt'    },
    { set:'SV151',          change:14.2, vol:5100, top:'Charizard Alt Art'   },
    { set:'Neo Genesis',    change:22.1, vol:890,  top:'Lugia Holo'          },
    { set:'Base Set',       change:-4.8, vol:620,  top:'Charizard 1st Ed.'   },
    { set:'Pokemon GO',     change:8.9,  vol:1100, top:'Mewtwo V Alt'        },
    { set:'Fusion Strike',  change:11.2, vol:2200, top:'Gengar VMAX Alt'     },
  ],
  '3M': [
    { set:'Evolving Skies', change:34.2, vol:14000, top:'Umbreon VMAX Alt'   },
    { set:'Neo Genesis',    change:28.4, vol:2800,  top:'Lugia Holo'         },
    { set:'SV151',          change:21.1, vol:18000, top:'Charizard Alt Art'  },
    { set:'EX Dragon',      change:19.8, vol:1100,  top:'Rayquaza Gold Star' },
    { set:'Base Set',       change:-8.2, vol:1800,  top:'Charizard 1st Ed.'  },
    { set:'Vivid Voltage',  change:12.4, vol:3200,  top:'Pikachu VMAX RR'    },
  ],
  '6M': [
    { set:'Evolving Skies', change:52.1, vol:28000, top:'Umbreon VMAX Alt'   },
    { set:'EX Dragon',      change:44.8, vol:3200,  top:'Rayquaza Gold Star' },
    { set:'Neo Genesis',    change:38.2, vol:5100,  top:'Lugia Holo'         },
    { set:'SV151',          change:31.4, vol:32000, top:'Charizard Alt Art'  },
    { set:'Base Set',       change:-12.1,vol:3200,  top:'Charizard 1st Ed.'  },
    { set:'Fusion Strike',  change:22.8, vol:8800,  top:'Gengar VMAX Alt'    },
  ],
  '1A': [
    { set:'Evolving Skies', change:94.2, vol:55000, top:'Umbreon VMAX Alt'   },
    { set:'EX Dragon',      change:82.4, vol:6200,  top:'Rayquaza Gold Star' },
    { set:'Neo Genesis',    change:71.1, vol:9800,  top:'Lugia Holo'         },
    { set:'Fusion Strike',  change:48.2, vol:18000, top:'Gengar VMAX Alt'    },
    { set:'SV151',          change:44.8, vol:62000, top:'Charizard Alt Art'  },
    { set:'Base Set',       change:-18.4,vol:5400,  top:'Charizard 1st Ed.'  },
  ],
}

const TRENDING_TYPES: Record<Period, {type:string; emoji:string; change:number; leader:string; color:string}[]> = {
  '7J': [
    { type:'Fire',     emoji:'🔥', change:14.2, leader:'Charizard Alt Art',  color:'#FF6B35' },
    { type:'Dark',     emoji:'🌑', change:11.8, leader:'Umbreon VMAX Alt',   color:'#7E57C2' },
    { type:'Water',    emoji:'💧', change:-2.4, leader:'Blastoise Base Set', color:'#42A5F5' },
    { type:'Psychic',  emoji:'🔮', change:8.1,  leader:'Gengar VMAX Alt',    color:'#C855D4' },
    { type:'Electric', emoji:'⚡', change:-1.2, leader:'Pikachu VMAX RR',    color:'#D4A800' },
    { type:'Grass',    emoji:'🌿', change:3.4,  leader:'Venusaur Base Set',  color:'#3DA85A' },
  ],
  '1M':  [
    { type:'Fire',     emoji:'🔥', change:22.1, leader:'Charizard Alt Art',  color:'#FF6B35' },
    { type:'Dark',     emoji:'🌑', change:18.4, leader:'Umbreon VMAX Alt',   color:'#7E57C2' },
    { type:'Water',    emoji:'💧', change:-4.8, leader:'Blastoise Base Set', color:'#42A5F5' },
    { type:'Psychic',  emoji:'🔮', change:12.4, leader:'Gengar VMAX Alt',    color:'#C855D4' },
    { type:'Electric', emoji:'⚡', change:6.8,  leader:'Pikachu VMAX RR',    color:'#D4A800' },
    { type:'Grass',    emoji:'🌿', change:5.1,  leader:'Venusaur Base Set',  color:'#3DA85A' },
  ],
  '3M':  [
    { type:'Dark',     emoji:'🌑', change:42.1, leader:'Umbreon VMAX Alt',   color:'#7E57C2' },
    { type:'Fire',     emoji:'🔥', change:38.4, leader:'Charizard Alt Art',  color:'#FF6B35' },
    { type:'Electric', emoji:'⚡', change:28.2, leader:'Rayquaza Gold Star', color:'#D4A800' },
    { type:'Psychic',  emoji:'🔮', change:22.8, leader:'Gengar VMAX Alt',    color:'#C855D4' },
    { type:'Water',    emoji:'💧', change:-8.4, leader:'Blastoise Base Set', color:'#42A5F5' },
    { type:'Grass',    emoji:'🌿', change:11.2, leader:'Venusaur Base Set',  color:'#3DA85A' },
  ],
  '6M':  [
    { type:'Dark',     emoji:'🌑', change:68.4, leader:'Umbreon VMAX Alt',   color:'#7E57C2' },
    { type:'Electric', emoji:'⚡', change:54.2, leader:'Rayquaza Gold Star', color:'#D4A800' },
    { type:'Fire',     emoji:'🔥', change:48.8, leader:'Charizard Alt Art',  color:'#FF6B35' },
    { type:'Psychic',  emoji:'🔮', change:34.1, leader:'Gengar VMAX Alt',    color:'#C855D4' },
    { type:'Grass',    emoji:'🌿', change:18.4, leader:'Venusaur Base Set',  color:'#3DA85A' },
    { type:'Water',    emoji:'💧', change:-14.2,leader:'Blastoise Base Set', color:'#42A5F5' },
  ],
  '1A':  [
    { type:'Dark',     emoji:'🌑', change:112.4, leader:'Umbreon VMAX Alt',  color:'#7E57C2' },
    { type:'Electric', emoji:'⚡', change:94.8,  leader:'Rayquaza Gold Star',color:'#D4A800' },
    { type:'Fire',     emoji:'🔥', change:82.1,  leader:'Charizard Alt Art', color:'#FF6B35' },
    { type:'Psychic',  emoji:'🔮', change:58.4,  leader:'Gengar VMAX Alt',   color:'#C855D4' },
    { type:'Grass',    emoji:'🌿', change:28.8,  leader:'Venusaur Base Set', color:'#3DA85A' },
    { type:'Water',    emoji:'💧', change:-22.1, leader:'Blastoise Base Set',color:'#42A5F5' },
  ],
}

const RISING_STARS = [
  { name:'Miraidon ex Special Art',  set:'Scarlet & Violet', type:'electric', price:180, prev:88,  pct:104, why:'Tournoi mondial + reprint risk faible' },
  { name:'Koraidon ex Special Art',  set:'Scarlet & Violet', type:'fire',     price:165, prev:82,  pct:101, why:'Momentum compétitif + hype Japon'      },
  { name:'Iono Full Art',            set:'Paldea Evolved',   type:'electric', price:120, prev:64,  pct:87,  why:'Carte de dresseur très jouée'          },
  { name:'Arven Full Art',           set:'Scarlet & Violet', type:'grass',    price:95,  prev:52,  pct:82,  why:'Staple de deck compétitif'             },
]

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height:'4px', background:'#F0F0F0', borderRadius:'99px', overflow:'hidden', flex:1 }}>
      <div style={{ height:'100%', width:`${Math.min(Math.abs(value)/120*100,100)}%`, background:color, borderRadius:'99px', transition:'width 0.6s ease' }} />
    </div>
  )
}

const EC: Record<string,string> = { fire:'#FF6B35', water:'#42A5F5', psychic:'#C855D4', dark:'#7E57C2', electric:'#D4A800', grass:'#3DA85A' }

export function Tendances() {
  const [period, setPeriod] = useState<Period>('1M')
  const sets  = TRENDING_SETS[period]
  const types = TRENDING_TYPES[period]

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        .rh:hover { background:#F8F8F8 !important; cursor:pointer; }
        .per-btn  { padding:5px 12px; border-radius:7px; border:none; background:transparent; color:#666; font-size:11px; font-weight:500; cursor:pointer; font-family:var(--font-display); transition:all 0.12s; }
        .per-btn:hover { background:#EBEBEB; }
        .per-btn.on { background:#111 !important; color:#fff !important; }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'22px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Market</p>
            <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:0 }}>Tendances</h1>
          </div>
          <div style={{ display:'flex', gap:'3px', background:'#F5F5F5', borderRadius:'9px', padding:'3px' }}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`per-btn${period===p?' on':''}`}>{p}</button>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' }}>

          {/* Tendances par set */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
              <div style={{ width:'3px', height:'16px', borderRadius:'2px', background:'#E03020' }} />
              <span style={{ fontSize:'11px', fontWeight:700, color:'#444', textTransform:'uppercase' as const, letterSpacing:'0.09em', fontFamily:'var(--font-display)' }}>Performance par set</span>
              <div style={{ flex:1, height:'1px', background:'#EBEBEB' }} />
            </div>
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', overflow:'hidden' }}>
              {sets.map((s,i) => (
                <div key={s.set} className="rh" style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', borderBottom:i<sets.length-1?'1px solid #F5F5F5':'none', transition:'background 0.1s' }}>
                  <div style={{ width:'28px', textAlign:'center', fontSize:'13px', fontWeight:700, color:s.change>=0?'#2E9E6A':'#E03020', fontFamily:'var(--font-display)' }}>{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)', marginBottom:'2px' }}>{s.set}</div>
                    <div style={{ fontSize:'10px', color:'#BBB' }}>Leader : {s.top} · {s.vol.toLocaleString()} tx</div>
                  </div>
                  <div style={{ width:'140px' }}>
                    <Bar value={s.change} color={s.change>=0?'#2E9E6A':'#E03020'} />
                  </div>
                  <div style={{ fontSize:'14px', fontWeight:700, color:s.change>=0?'#2E9E6A':'#E03020', fontFamily:'var(--font-display)', minWidth:'52px', textAlign:'right' }}>
                    {s.change>=0?'+':''}{s.change}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tendances par type */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
              <div style={{ width:'3px', height:'16px', borderRadius:'2px', background:'#E03020' }} />
              <span style={{ fontSize:'11px', fontWeight:700, color:'#444', textTransform:'uppercase' as const, letterSpacing:'0.09em', fontFamily:'var(--font-display)' }}>Performance par type</span>
              <div style={{ flex:1, height:'1px', background:'#EBEBEB' }} />
            </div>
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', overflow:'hidden' }}>
              {types.map((t,i) => (
                <div key={t.type} className="rh" style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', borderBottom:i<types.length-1?'1px solid #F5F5F5':'none', transition:'background 0.1s' }}>
                  <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:`${t.color}18`, border:`1px solid ${t.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>{t.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)', marginBottom:'2px' }}>{t.type}</div>
                    <div style={{ fontSize:'10px', color:'#BBB' }}>{t.leader}</div>
                  </div>
                  <div style={{ width:'120px' }}>
                    <Bar value={t.change} color={t.change>=0?t.color:'#E03020'} />
                  </div>
                  <div style={{ fontSize:'14px', fontWeight:700, color:t.change>=0?t.color:'#E03020', fontFamily:'var(--font-display)', minWidth:'52px', textAlign:'right' }}>
                    {t.change>=0?'+':''}{t.change}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rising Stars */}
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
            <div style={{ width:'3px', height:'16px', borderRadius:'2px', background:'#E03020' }} />
            <span style={{ fontSize:'11px', fontWeight:700, color:'#444', textTransform:'uppercase' as const, letterSpacing:'0.09em', fontFamily:'var(--font-display)' }}>Rising Stars · Fortes progressions récentes</span>
            <div style={{ flex:1, height:'1px', background:'#EBEBEB' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'12px' }}>
            {RISING_STARS.map(s => {
              const ec = EC[s.type]??'#888'
              return (
                <div key={s.name} style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', padding:'16px', cursor:'pointer', transition:'all 0.15s' }}>
                  <div style={{ height:'2.5px', background:`linear-gradient(90deg,${ec},${ec}44)`, borderRadius:'14px 14px 0 0', margin:'-16px -16px 14px' }} />
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', marginBottom:'3px' }}>{s.name}</div>
                      <div style={{ fontSize:'10px', color:'#BBB' }}>{s.set}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'16px', fontWeight:700, color:'#2E9E6A', fontFamily:'var(--font-display)' }}>+{s.pct}%</div>
                      <div style={{ fontSize:'10px', color:'#888' }}>€ {s.prev} → € {s.price}</div>
                    </div>
                  </div>
                  <div style={{ background:'#F8F8F8', borderRadius:'7px', padding:'7px 10px', fontSize:'11px', color:'#666', lineHeight:1.5 }}>💡 {s.why}</div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </>
  )
}
