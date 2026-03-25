'use client'

import { useState } from 'react'

const GAINERS = [
  { name:'Rayquaza Gold Star',      set:'EX Deoxys',       type:'electric', price:740,  h24:31.2, h7d:48.4,  vol:48,   psa:null },
  { name:'Umbreon VMAX Alt Art',    set:'Evolving Skies',  type:'dark',     price:880,  h24:24.1, h7d:36.8,  vol:112,  psa:2840 },
  { name:'Charizard Alt Art',       set:'SV151',           type:'fire',     price:920,  h24:21.3, h7d:28.2,  vol:203,  psa:312  },
  { name:'Gengar VMAX Alt Art',     set:'Fusion Strike',   type:'psychic',  price:340,  h24:18.4, h7d:22.1,  vol:67,   psa:null },
  { name:'Lugia Neo Genesis Holo',  set:'Neo Genesis',     type:'water',    price:580,  h24:15.2, h7d:19.8,  vol:31,   psa:890  },
  { name:'Dragonite Base Set Holo', set:'Base Set',        type:'electric', price:240,  h24:14.8, h7d:18.4,  vol:29,   psa:null },
  { name:'Mewtwo Alt Art',          set:'Pokemon GO',      type:'psychic',  price:280,  h24:12.1, h7d:16.2,  vol:44,   psa:null },
  { name:'Mew ex Alt Art',          set:'SV151',           type:'psychic',  price:142,  h24:9.8,  h7d:14.1,  vol:89,   psa:null },
]

const LOSERS = [
  { name:'Blastoise Base Set Holo', set:'Base Set',        type:'water',    price:620,  h24:-4.2, h7d:-6.8,  vol:24,   psa:890  },
  { name:'Pikachu VMAX RR',         set:'Vivid Voltage',   type:'electric', price:110,  h24:-3.8, h7d:-5.4,  vol:89,   psa:4200 },
  { name:'Mewtwo GX Rainbow',       set:'Unified Minds',   type:'psychic',  price:95,   h24:-2.9, h7d:-4.1,  vol:44,   psa:null },
  { name:'Raichu Base Set Holo',    set:'Base Set',        type:'electric', price:88,   h24:-2.4, h7d:-3.8,  vol:18,   psa:null },
]

const VOLUME_LEADERS = [
  { name:'Charizard Alt Art',       set:'SV151',           vol:203, price:920,  change:21.3  },
  { name:'Umbreon VMAX Alt Art',    set:'Evolving Skies',  vol:112, price:880,  change:24.1  },
  { name:'Mew ex Alt Art',          set:'SV151',           vol:89,  price:142,  change:9.8   },
  { name:'Pikachu VMAX RR',         set:'Vivid Voltage',   vol:89,  price:110,  change:-3.8  },
  { name:'Gengar VMAX Alt Art',     set:'Fusion Strike',   vol:67,  price:340,  change:18.4  },
]

const EC: Record<string,string> = { fire:'#FF6B35', water:'#42A5F5', psychic:'#C855D4', dark:'#7E57C2', electric:'#D4A800', grass:'#3DA85A' }

type SortH = 'h24'|'h7d'|'price'|'vol'
type Tab   = 'gainers'|'losers'|'volume'

export function Movers() {
  const [tab,  setTab]  = useState<Tab>('gainers')
  const [sort, setSort] = useState<SortH>('h24')

  const sorted = (tab==='gainers' ? [...GAINERS] : [...LOSERS]).sort((a,b) => {
    if (sort==='h24')   return tab==='gainers' ? b.h24-a.h24   : a.h24-b.h24
    if (sort==='h7d')   return tab==='gainers' ? b.h7d-a.h7d   : a.h7d-b.h7d
    if (sort==='price') return b.price-a.price
    if (sort==='vol')   return b.vol-a.vol
    return 0
  })

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        .rh:hover { background:#F8F8F8 !important; cursor:pointer; }
        .tab:hover { background:#F0F0F0 !important; }
        .tab.on { background:#111 !important; color:#fff !important; }
        .srt:hover { background:#EBEBEB !important; }
        .srt.on { background:#111 !important; color:#fff !important; }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'22px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Market</p>
            <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:0 }}>Movers</h1>
          </div>
          <div style={{ display:'flex', gap:'3px', background:'#F5F5F5', borderRadius:'9px', padding:'3px' }}>
            {(['gainers','losers','volume'] as Tab[]).map(t => (
              <button key={t} onClick={()=>setTab(t)} className={`tab${tab===t?' on':''}`} style={{ padding:'6px 14px', borderRadius:'7px', border:'none', background:tab===t?'#111':'transparent', color:tab===t?'#fff':'#666', fontSize:'12px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all 0.12s' }}>
                {t==='gainers'?'🟢 Gainers':t==='losers'?'🔴 Losers':'📊 Volume'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats rapides */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
          {[
            { label:'Gainers 24h',  value:String(GAINERS.length), sub:'Cartes en hausse',   color:'#2E9E6A' },
            { label:'Losers 24h',   value:String(LOSERS.length),  sub:'Cartes en baisse',   color:'#E03020' },
            { label:'Top gainer',   value:`+${GAINERS[0].h24}%`,  sub:GAINERS[0].name,      color:'#2E9E6A' },
            { label:'Volume total', value:String(GAINERS.reduce((s,m)=>s+m.vol,0)+LOSERS.reduce((s,m)=>s+m.vol,0)), sub:'Transactions 24h', color:'#111' },
          ].map((s,i) => (
            <div key={i} style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'12px', padding:'14px 16px' }}>
              <div style={{ fontSize:'9px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:'var(--font-display)', marginBottom:'6px' }}>{s.label}</div>
              <div style={{ fontSize:'22px', fontWeight:700, color:s.color, fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1, marginBottom:'4px' }}>{s.value}</div>
              <div style={{ fontSize:'10px', color:'#AAA', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', overflow:'hidden' }}>
          {/* Header */}
          <div style={{ display:'grid', gridTemplateColumns:'2.4fr 1fr 1fr 1fr 0.7fr', padding:'10px 16px', borderBottom:'1px solid #F0F0F0', background:'#FAFAFA', alignItems:'center' }}>
            <div style={{ fontSize:'10px', fontWeight:600, color:'#AAA', textTransform:'uppercase' as const, letterSpacing:'0.07em', fontFamily:'var(--font-display)' }}>Carte</div>
            {(['h24','h7d','price','vol'] as SortH[]).map((k,i) => (
              <button key={k} onClick={()=>setSort(k)} className={`srt${sort===k?' on':''}`} style={{ padding:'3px 8px', borderRadius:'5px', border:'none', background:sort===k?'#111':'transparent', color:sort===k?'#fff':'#AAA', fontSize:'10px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all 0.12s', textTransform:'uppercase' as const, letterSpacing:'0.07em', textAlign:'right' as const }}>
                {k==='h24'?'24H':k==='h7d'?'7J':k==='price'?'PRIX':'VOL'}
              </button>
            ))}
          </div>
          {(tab==='volume' ? VOLUME_LEADERS : sorted).map((m: any, i: number) => {
            const ec = EC[m.type??'fire']??'#888'
            const isGainer = (m.h24??m.change) >= 0
            return (
              <div key={m.name} className="rh" style={{ display:'grid', gridTemplateColumns:'2.4fr 1fr 1fr 1fr 0.7fr', padding:'13px 16px', borderBottom:i<(tab==='volume'?VOLUME_LEADERS:sorted).length-1?'1px solid #F5F5F5':'none', alignItems:'center', transition:'background 0.1s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'34px', height:'46px', borderRadius:'6px', background:`linear-gradient(145deg,${ec}20,${ec}08)`, border:`1.5px solid ${ec}28`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:ec, opacity:0.6 }} />
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>
                    <div style={{ fontSize:'10px', color:'#BBB', marginTop:'2px' }}>
                      {m.set}
                      {m.psa && <span style={{ marginLeft:'6px' }}>· PSA Pop {m.psa.toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
                {tab !== 'volume' ? (
                  <>
                    <div style={{ textAlign:'right', fontSize:'13px', fontWeight:700, color:m.h24>=0?'#2E9E6A':'#E03020', fontFamily:'var(--font-display)' }}>{m.h24>=0?'+':''}{m.h24}%</div>
                    <div style={{ textAlign:'right', fontSize:'13px', fontWeight:700, color:m.h7d>=0?'#2E9E6A':'#E03020', fontFamily:'var(--font-display)' }}>{m.h7d>=0?'+':''}{m.h7d}%</div>
                  </>
                ) : (
                  <>
                    <div style={{ textAlign:'right', fontSize:'13px', fontWeight:700, color:m.change>=0?'#2E9E6A':'#E03020', fontFamily:'var(--font-display)' }}>{m.change>=0?'+':''}{m.change}%</div>
                    <div style={{ textAlign:'right', fontSize:'12px', color:'#888' }}>—</div>
                  </>
                )}
                <div style={{ textAlign:'right', fontSize:'14px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)' }}>€ {m.price.toLocaleString('fr-FR')}</div>
                <div style={{ textAlign:'right', fontSize:'12px', color:'#888', fontFamily:'var(--font-display)' }}>{m.vol} tx</div>
              </div>
            )
          })}
        </div>

      </div>
    </>
  )
}
