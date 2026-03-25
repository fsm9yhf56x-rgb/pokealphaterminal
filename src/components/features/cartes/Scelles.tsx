'use client'

import { useState, useMemo } from 'react'

type SealedItem = {
  id:        string
  name:      string
  set:       string
  type:      'booster'|'display'|'etb'|'collection'|'promo'
  year:      number
  lang:      'EN'|'JP'|'FR'
  price:     number
  retail:    number
  trend:     number
  stock:     'available'|'rare'|'oop'
  evsIndex?: number
  cards:     number
}

const SEALED: SealedItem[] = [
  { id:'1',  name:'Display Evolving Skies EN',        set:'Evolving Skies',   type:'display',    year:2021, lang:'EN', price:1840, retail:120, trend:18.4, stock:'oop',       evsIndex:94,  cards:360 },
  { id:'2',  name:'Display SV151 FR',                 set:'SV151',            type:'display',    year:2023, lang:'FR', price:420,  retail:160, trend:8.2,  stock:'available', evsIndex:62,  cards:360 },
  { id:'3',  name:'Display Fusion Strike EN',         set:'Fusion Strike',    type:'display',    year:2021, lang:'EN', price:680,  retail:120, trend:12.1, stock:'oop',       evsIndex:78,  cards:360 },
  { id:'4',  name:'Booster Evolving Skies EN',        set:'Evolving Skies',   type:'booster',    year:2021, lang:'EN', price:28,   retail:4,   trend:11.2, stock:'oop',                    cards:10  },
  { id:'5',  name:'Booster Base Set EN',              set:'Base Set',         type:'booster',    year:1999, lang:'EN', price:280,  retail:2.5, trend:6.4,  stock:'oop',                    cards:11  },
  { id:'6',  name:'ETB SV151 EN',                     set:'SV151',            type:'etb',        year:2023, lang:'EN', price:88,   retail:55,  trend:4.2,  stock:'available', evsIndex:58,  cards:65  },
  { id:'7',  name:'ETB Evolving Skies EN',            set:'Evolving Skies',   type:'etb',        year:2021, lang:'EN', price:340,  retail:45,  trend:22.1, stock:'oop',       evsIndex:88,  cards:65  },
  { id:'8',  name:'Collection Spéciale Pikachu JP',   set:'Promo JP',         type:'collection', year:2023, lang:'JP', price:180,  retail:60,  trend:14.8, stock:'rare',                   cards:12  },
  { id:'9',  name:'Display Champion Path EN',         set:'Champion Path',    type:'display',    year:2020, lang:'EN', price:2400, retail:120, trend:8.1,  stock:'oop',       evsIndex:110, cards:360 },
  { id:'10', name:'Booster SV151 EN',                 set:'SV151',            type:'booster',    year:2023, lang:'EN', price:7,    retail:4.5, trend:2.1,  stock:'available',              cards:10  },
  { id:'11', name:'Display Scarlet & Violet 151 JP',  set:'SV151',            type:'display',    year:2023, lang:'JP', price:520,  retail:140, trend:11.4, stock:'oop',       evsIndex:68,  cards:360 },
  { id:'12', name:'ETB Champion Path EN',             set:'Champion Path',    type:'etb',        year:2020, lang:'EN', price:680,  retail:45,  trend:16.2, stock:'oop',       evsIndex:112, cards:65  },
]

const ROI_COLORS = (roi: number) => roi > 50 ? '#166534' : roi > 20 ? '#2E9E6A' : roi > 0 ? '#3DAA7A' : roi > -20 ? '#C06000' : '#C03020'
const TYPE_LABELS: Record<string,string> = { booster:'Booster', display:'Display', etb:'ETB', collection:'Collection', promo:'Promo' }
const TYPE_COLORS: Record<string,{bg:string;color:string;border:string}> = {
  display:    { bg:'#F5EAFF', color:'#7B2D8B', border:'#D8B8FF' },
  booster:    { bg:'#FFF5F0', color:'#C84B00', border:'#FFD0B0' },
  etb:        { bg:'#F0F5FF', color:'#003DAA', border:'#C0D0FF' },
  collection: { bg:'#FFFDE0', color:'#8B6E00', border:'#FFE87A' },
  promo:      { bg:'#F0FFF6', color:'#1A7A4A', border:'#AAEEC8' },
}
const LS: Record<string,{flag:string;bg:string;color:string;border:string}> = {
  EN: { flag:'🇺🇸', bg:'#FFF5F0', color:'#C84B00', border:'#FFD0B0' },
  JP: { flag:'🇯🇵', bg:'#F0F5FF', color:'#003DAA', border:'#C0D0FF' },
  FR: { flag:'🇫🇷', bg:'#F0FFF5', color:'#00660A', border:'#A0DDAA' },
}
const STOCK_LABEL: Record<string,{label:string;color:string;bg:string}> = {
  available: { label:'Disponible', color:'#1A7A4A', bg:'#F0FFF6' },
  rare:      { label:'Rare',       color:'#8B6E00', bg:'#FFFDE0' },
  oop:       { label:'OOP',        color:'#888',    bg:'#F5F5F5' },
}

export function Scelles() {
  const [filType, setFilType] = useState('all')
  const [filLang, setFilLang] = useState('all')
  const [sort,    setSort]    = useState<'price'|'roi'|'trend'|'evsIndex'>('roi')
  const [search,  setSearch]  = useState('')

  const filtered = useMemo(() => SEALED
    .filter(s => filType==='all' || s.type===filType)
    .filter(s => filLang==='all' || s.lang===filLang)
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.set.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      if (sort==='roi')      return ((b.price-b.retail)/b.retail) - ((a.price-a.retail)/a.retail)
      if (sort==='price')    return b.price-a.price
      if (sort==='trend')    return b.trend-a.trend
      if (sort==='evsIndex') return (b.evsIndex??0)-(a.evsIndex??0)
      return 0
    })
  , [filType,filLang,sort,search])

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cardIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        .sc:hover { transform:translateY(-4px) !important; box-shadow:0 10px 28px rgba(0,0,0,0.1) !important; }
        .pill { padding:5px 12px; border-radius:7px; border:1px solid #E8E8E8; background:#fff; color:#555; font-size:12px; font-weight:500; cursor:pointer; font-family:var(--font-display); transition:all 0.12s; white-space:nowrap; }
        .pill:hover { border-color:#999; }
        .pill.on { background:#111 !important; color:#fff !important; border-color:#111 !important; }
        .srt { padding:5px 11px; border-radius:6px; border:none; background:transparent; color:#666; font-size:11px; font-weight:500; cursor:pointer; font-family:var(--font-display); transition:all 0.12s; }
        .srt:hover { background:#EBEBEB; }
        .srt.on { background:#111 !important; color:#fff !important; }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Cartes</p>
            <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:0 }}>Scellés</h1>
          </div>
          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
            {[
              { label:'ROI moyen', value:`+${Math.round(SEALED.reduce((s,i)=>s+((i.price-i.retail)/i.retail)*100,0)/SEALED.length)}%`, color:'#2E9E6A' },
              { label:'OOP trackés', value:String(SEALED.filter(s=>s.stock==='oop').length), color:'#E03020' },
              { label:'Valeur totale', value:`€ ${SEALED.reduce((s,i)=>s+i.price,0).toLocaleString('fr-FR')}`, color:'#111' },
            ].map(s=>(
              <div key={s.label} style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'10px', padding:'10px 16px', textAlign:'center' }}>
                <div style={{ fontSize:'16px', fontWeight:700, color:s.color, fontFamily:'var(--font-display)', letterSpacing:'-0.3px' }}>{s.value}</div>
                <div style={{ fontSize:'10px', color:'#AAA', marginTop:'2px', fontFamily:'var(--font-display)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contrôles */}
        <div style={{ display:'flex', gap:'10px', marginBottom:'14px', flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative', flex:1, minWidth:'200px' }}>
            <span style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)', color:'#CCC', fontSize:'15px', pointerEvents:'none' }}>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un produit scellé..."
              style={{ width:'100%', height:'38px', padding:'0 12px 0 32px', border:'1px solid #EBEBEB', borderRadius:'9px', fontSize:'13px', color:'#111', outline:'none', background:'#fff', fontFamily:'var(--font-sans)', boxSizing:'border-box' as const }} />
          </div>
          <div style={{ display:'flex', gap:'3px', background:'#F5F5F5', borderRadius:'9px', padding:'3px' }}>
            {([['roi','ROI'],['price','Prix'],['trend','Trend'],['evsIndex','EV Index']] as ['roi'|'price'|'trend'|'evsIndex',string][]).map(([k,l])=>(
              <button key={k} onClick={()=>setSort(k)} className={`srt${sort===k?' on':''}`}>{l}</button>
            ))}
          </div>
        </div>

        {/* Filtres */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'18px' }}>
          {[{v:'all',l:'Tous'},{v:'display',l:'Display'},{v:'booster',l:'Booster'},{v:'etb',l:'ETB'},{v:'collection',l:'Collection'},{v:'promo',l:'Promo'}].map(o=>(
            <button key={o.v} onClick={()=>setFilType(o.v)} className={`pill${filType===o.v?' on':''}`}>{o.l}</button>
          ))}
          <div style={{ width:'1px', background:'#EBEBEB', alignSelf:'stretch' }} />
          {[{v:'all',l:'Toutes'},{v:'EN',l:'🇺🇸 EN'},{v:'JP',l:'🇯🇵 JP'},{v:'FR',l:'🇫🇷 FR'}].map(o=>(
            <button key={o.v} onClick={()=>setFilLang(o.v)} className={`pill${filLang===o.v?' on':''}`}>{o.l}</button>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' }}>
          {filtered.map((item,idx)=>{
            const roi     = Math.round(((item.price-item.retail)/item.retail)*100)
            const tc      = TYPE_COLORS[item.type]
            const ls      = LS[item.lang]
            const stk     = STOCK_LABEL[item.stock]
            const roiColor = ROI_COLORS(roi)

            return (
              <div key={item.id} className="sc" style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'16px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', transition:'all 0.2s', cursor:'pointer', animation:`cardIn 0.2s ${Math.min(idx,10)*0.03}s ease-out both` }}>
                {/* Gradient header */}
                <div style={{ height:'80px', background:'linear-gradient(135deg,#F8F8F8,#F0F0F0)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                  <div style={{ fontSize:'72px', opacity:0.15, position:'absolute', fontWeight:700, color:'#888', letterSpacing:'-4px', userSelect:'none' as const }}>
                    {TYPE_LABELS[item.type].slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'#555', fontFamily:'var(--font-display)', zIndex:1, textAlign:'center', padding:'0 16px' }}>
                    {item.set}
                  </div>
                  {/* Badges positionnés */}
                  <div style={{ position:'absolute', top:'8px', left:'8px', display:'flex', gap:'4px' }}>
                    {tc && <span style={{ fontSize:'9px', background:tc.bg, color:tc.color, border:`1px solid ${tc.border}`, padding:'2px 6px', borderRadius:'4px', fontWeight:600, fontFamily:'var(--font-display)' }}>{TYPE_LABELS[item.type]}</span>}
                  </div>
                  <div style={{ position:'absolute', top:'8px', right:'8px', display:'flex', gap:'4px' }}>
                    <span style={{ fontSize:'9px', background:ls.bg, color:ls.color, border:`1px solid ${ls.border}`, padding:'2px 6px', borderRadius:'4px', fontWeight:600, fontFamily:'var(--font-display)' }}>{ls.flag} {item.lang}</span>
                    <span style={{ fontSize:'9px', background:stk.bg, color:stk.color, border:`1px solid ${stk.bg}`, padding:'2px 6px', borderRadius:'4px', fontWeight:600, fontFamily:'var(--font-display)' }}>{stk.label}</span>
                  </div>
                </div>

                <div style={{ padding:'14px' }}>
                  <div style={{ fontSize:'14px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', marginBottom:'3px', lineHeight:1.3 }}>{item.name}</div>
                  <div style={{ fontSize:'10px', color:'#BBB', marginBottom:'12px' }}>{item.year} · {item.cards} cartes</div>

                  {/* Prix + ROI */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
                    <div style={{ background:'#FAFAFA', borderRadius:'8px', padding:'8px 10px' }}>
                      <div style={{ fontSize:'9px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:'var(--font-display)', marginBottom:'3px' }}>Prix actuel</div>
                      <div style={{ fontSize:'16px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.3px', lineHeight:1 }}>
                        {item.price>=1000?`€ ${(item.price/1000).toFixed(1)}k`:`€ ${item.price}`}
                      </div>
                      <div style={{ fontSize:'10px', fontWeight:600, color:item.trend>=0?'#2E9E6A':'#E03020', marginTop:'2px' }}>
                        {item.trend>=0?'▲ +':'▼ '}{Math.abs(item.trend)}% 24h
                      </div>
                    </div>
                    <div style={{ background:`${roiColor}12`, border:`1px solid ${roiColor}30`, borderRadius:'8px', padding:'8px 10px' }}>
                      <div style={{ fontSize:'9px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:'var(--font-display)', marginBottom:'3px' }}>ROI vs retail</div>
                      <div style={{ fontSize:'16px', fontWeight:700, color:roiColor, fontFamily:'var(--font-display)', letterSpacing:'-0.3px', lineHeight:1 }}>
                        {roi>=0?'+':''}{roi}%
                      </div>
                      <div style={{ fontSize:'10px', color:'#AAA', marginTop:'2px' }}>Retail · € {item.retail}</div>
                    </div>
                  </div>

                  {/* EV Index si dispo */}
                  {item.evsIndex && (
                    <div style={{ background:'#F8F8F8', borderRadius:'7px', padding:'7px 10px', marginBottom:'12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:'11px', color:'#888', fontFamily:'var(--font-display)' }}>EV Index</span>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <div style={{ width:'80px', height:'4px', background:'#EBEBEB', borderRadius:'99px', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${Math.min(item.evsIndex/150*100,100)}%`, background: item.evsIndex>100?'#2E9E6A':item.evsIndex>70?'#FF8C00':'#E03020', borderRadius:'99px' }} />
                        </div>
                        <span style={{ fontSize:'11px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>{item.evsIndex}</span>
                      </div>
                    </div>
                  )}

                  <button onClick={()=>window.open('https://www.cardmarket.com','_blank')} style={{ width:'100%', padding:'9px', borderRadius:'9px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                    Voir les offres →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
