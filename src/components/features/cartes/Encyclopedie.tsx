'use client'

import { useState, useMemo } from 'react'

type TCGCard = {
  id:       string
  name:     string
  set:      string
  setCode:  string
  number:   string
  rarity:   string
  type:     string
  hp?:      number
  year:     number
  era:      string
  lang:     'EN'|'JP'|'FR'
  price:    number
  trend:    number
  psa?:     number
  legal:    boolean
  reprint:  'none'|'low'|'high'
  signal?:  'S'|'A'|'B'
}

const CARDS: TCGCard[] = [
  { id:'1',  name:'Charizard Alt Art',       set:'SV151',           setCode:'SV151', number:'006', rarity:'Alt Art',     type:'fire',     hp:180, year:2023, era:'Scarlet & Violet', lang:'EN', price:920,  trend:21.3, psa:312,  legal:true,  reprint:'low',  signal:'S' },
  { id:'2',  name:'Umbreon VMAX Alt Art',    set:'Evolving Skies',  setCode:'EVS',   number:'215', rarity:'Alt Art',     type:'dark',     hp:340, year:2021, era:'Sword & Shield',   lang:'EN', price:880,  trend:24.1, psa:2840, legal:false, reprint:'none', signal:'A' },
  { id:'3',  name:'Charizard VMAX',          set:'Champion Path',   setCode:'CPA',   number:'074', rarity:'Secret Rare', type:'fire',     hp:330, year:2020, era:'Sword & Shield',   lang:'EN', price:420,  trend:5.2,  psa:1240, legal:false, reprint:'low'  },
  { id:'4',  name:'Gengar VMAX Alt Art',     set:'Fusion Strike',   setCode:'FST',   number:'271', rarity:'Alt Art',     type:'psychic',  hp:310, year:2021, era:'Sword & Shield',   lang:'EN', price:340,  trend:18.4,           legal:false, reprint:'none' },
  { id:'5',  name:'Pikachu VMAX RR',         set:'Vivid Voltage',   setCode:'VIV',   number:'188', rarity:'Secret Rare', type:'electric', hp:310, year:2020, era:'Sword & Shield',   lang:'JP', price:110,  trend:-3.8, psa:4200, legal:false, reprint:'high' },
  { id:'6',  name:'Rayquaza VMAX Alt Art',   set:'Evolving Skies',  setCode:'EVS',   number:'218', rarity:'Alt Art',     type:'electric', hp:320, year:2021, era:'Sword & Shield',   lang:'EN', price:740,  trend:31.2,           legal:false, reprint:'none', signal:'A' },
  { id:'7',  name:'Mewtwo V Alt Art',        set:'Pokemon GO',      setCode:'PGO',   number:'071', rarity:'Alt Art',     type:'psychic',  hp:220, year:2022, era:'Sword & Shield',   lang:'JP', price:280,  trend:12.1,           legal:false, reprint:'low',  signal:'B' },
  { id:'8',  name:'Blastoise Base Set Holo', set:'Base Set',        setCode:'BS',    number:'002', rarity:'Holo Rare',   type:'water',    hp:100, year:1999, era:'Original',         lang:'EN', price:620,  trend:-4.2, psa:890,  legal:false, reprint:'high' },
  { id:'9',  name:'Lugia Neo Genesis Holo',  set:'Neo Genesis',     setCode:'N1',    number:'009', rarity:'Holo Rare',   type:'water',    hp:90,  year:2000, era:'Neo',              lang:'EN', price:580,  trend:15.2, psa:2100, legal:false, reprint:'none' },
  { id:'10', name:'Mew ex Alt Art',          set:'SV151',           setCode:'SV151', number:'205', rarity:'Alt Art',     type:'psychic',  hp:200, year:2023, era:'Scarlet & Violet', lang:'JP', price:140,  trend:9.1,            legal:true,  reprint:'low'  },
  { id:'11', name:'Gardevoir ex SAR',        set:'Scarlet & Violet',setCode:'SVI',   number:'245', rarity:'Secret Rare', type:'psychic',  hp:310, year:2023, era:'Scarlet & Violet', lang:'FR', price:95,   trend:4.8,            legal:true,  reprint:'low'  },
  { id:'12', name:'Miraidon ex SAR',         set:'Scarlet & Violet',setCode:'SVI',   number:'254', rarity:'Secret Rare', type:'electric', hp:220, year:2023, era:'Scarlet & Violet', lang:'FR', price:72,   trend:2.1,            legal:true,  reprint:'low'  },
  { id:'13', name:'Charizard Base Set Holo', set:'Base Set',        setCode:'BS',    number:'004', rarity:'Holo Rare',   type:'fire',     hp:120, year:1999, era:'Original',         lang:'EN', price:2400, trend:8.4,  psa:1840, legal:false, reprint:'high' },
  { id:'14', name:'Pikachu Illustrator',     set:'CoroCoro',        setCode:'PROMO', number:'001', rarity:'Promo',       type:'electric', hp:60,  year:1998, era:'Original',         lang:'JP', price:450000, trend:12.8, psa:24, legal:false, reprint:'none' },
  { id:'15', name:'Rayquaza Gold Star',      set:'EX Deoxys',       setCode:'DX',    number:'107', rarity:'Gold Star',   type:'electric', hp:90,  year:2005, era:'EX',               lang:'EN', price:740,  trend:31.2, psa:880,  legal:false, reprint:'none', signal:'A' },
  { id:'16', name:'Umbreon Gold Star',       set:'POP Series 5',    setCode:'POP5',  number:'017', rarity:'Gold Star',   type:'dark',     hp:70,  year:2006, era:'EX',               lang:'EN', price:3200, trend:14.2, psa:420,  legal:false, reprint:'none' },
  { id:'17', name:'Espeon VMAX Alt Art',     set:'Evolving Skies',  setCode:'EVS',   number:'214', rarity:'Alt Art',     type:'psychic',  hp:340, year:2021, era:'Sword & Shield',   lang:'EN', price:320,  trend:8.8,  psa:1240, legal:false, reprint:'none' },
  { id:'18', name:'Glaceon VMAX Alt Art',    set:'Evolving Skies',  setCode:'EVS',   number:'209', rarity:'Alt Art',     type:'water',    hp:320, year:2021, era:'Sword & Shield',   lang:'EN', price:198,  trend:5.4,            legal:false, reprint:'none' },
]

const EC: Record<string,string> = {
  fire:'#FF6B35', water:'#42A5F5', psychic:'#C855D4',
  dark:'#7E57C2', electric:'#D4A800', grass:'#3DA85A',
  normal:'#888888',
}

const RS: Record<string,{bg:string;color:string;border:string}> = {
  'Alt Art':     { bg:'#FFFDE0', color:'#8B6E00', border:'#FFE87A' },
  'Secret Rare': { bg:'#F5EAFF', color:'#7B2D8B', border:'#D8B8FF' },
  'Gold Star':   { bg:'#FFFAEB', color:'#8B6E00', border:'#FFD700' },
  'Holo Rare':   { bg:'#F0FFF6', color:'#1A7A4A', border:'#AAEEC8' },
  'Promo':       { bg:'#F0F5FF', color:'#003DAA', border:'#C0D0FF' },
}

const LS: Record<string,{flag:string;bg:string;color:string;border:string}> = {
  EN: { flag:'🇺🇸', bg:'#FFF5F0', color:'#C84B00', border:'#FFD0B0' },
  JP: { flag:'🇯🇵', bg:'#F0F5FF', color:'#003DAA', border:'#C0D0FF' },
  FR: { flag:'🇫🇷', bg:'#F0FFF5', color:'#00660A', border:'#A0DDAA' },
}

const ERAS    = [...new Set(CARDS.map(c=>c.era))]
const SETS    = [...new Set(CARDS.map(c=>c.set))]
const YEARS   = [...new Set(CARDS.map(c=>c.year))].sort((a,b)=>b-a)

type ViewMode = 'grid'|'list'
type SortKey  = 'price'|'trend'|'name'|'year'|'psa'

export function Encyclopedie() {
  const [search,    setSearch]    = useState('')
  const [filType,   setFilType]   = useState('all')
  const [filRarity, setFilRarity] = useState('all')
  const [filEra,    setFilEra]    = useState('all')
  const [filLang,   setFilLang]   = useState('all')
  const [filLegal,  setFilLegal]  = useState('all')
  const [filSignal, setFilSignal] = useState('all')
  const [sort,      setSort]      = useState<SortKey>('price')
  const [view,      setView]      = useState<ViewMode>('grid')
  const [selected,  setSelected]  = useState<string|null>(null)

  const filtered = useMemo(() => CARDS
    .filter(c => filType   ==='all' || c.type===filType)
    .filter(c => filRarity ==='all' || c.rarity===filRarity)
    .filter(c => filEra    ==='all' || c.era===filEra)
    .filter(c => filLang   ==='all' || c.lang===filLang)
    .filter(c => filLegal  ==='all' || (filLegal==='legal'?c.legal:!c.legal))
    .filter(c => filSignal ==='all' || (filSignal==='active'?!!c.signal:false))
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.set.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      if (sort==='price') return b.price-a.price
      if (sort==='trend') return b.trend-a.trend
      if (sort==='year')  return a.year-b.year
      if (sort==='psa')   return (b.psa??0)-(a.psa??0)
      return a.name.localeCompare(b.name)
    })
  , [search,filType,filRarity,filEra,filLang,filLegal,filSignal,sort])

  const sel = selected ? CARDS.find(c=>c.id===selected) : null

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cardIn  { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .card-h:hover    { transform:translateY(-4px) !important; box-shadow:0 10px 28px rgba(0,0,0,0.12) !important; }
        .rh:hover        { background:#F8F8F8 !important; cursor:pointer; }
        .pill            { padding:5px 12px; border-radius:7px; border:1px solid #E8E8E8; background:#fff; color:#555; font-size:12px; font-weight:500; cursor:pointer; font-family:var(--font-display); transition:all 0.12s; white-space:nowrap; }
        .pill:hover      { border-color:#999; }
        .pill.on         { background:#111 !important; color:#fff !important; border-color:#111 !important; }
        .srt             { padding:5px 11px; border-radius:6px; border:none; background:transparent; color:#666; font-size:11px; font-weight:500; cursor:pointer; font-family:var(--font-display); transition:all 0.12s; }
        .srt:hover       { background:#EBEBEB; }
        .srt.on          { background:#111 !important; color:#fff !important; }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%', display:'flex', gap:'20px' }}>

        {/* MAIN */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ marginBottom:'20px' }}>
            <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Cartes</p>
            <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:'0 0 5px' }}>Encyclopédie</h1>
            <div style={{ fontSize:'12px', color:'#888' }}>
              <span style={{ fontWeight:600, color:'#111' }}>{filtered.length}</span> cartes · base de données PokéAlpha
            </div>
          </div>

          {/* Barre recherche + contrôles */}
          <div style={{ display:'flex', gap:'10px', marginBottom:'14px', flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1, minWidth:'220px' }}>
              <span style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)', color:'#CCC', fontSize:'15px', pointerEvents:'none' }}>⌕</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une carte, un set..."
                style={{ width:'100%', height:'38px', padding:'0 12px 0 32px', border:'1px solid #EBEBEB', borderRadius:'9px', fontSize:'13px', color:'#111', outline:'none', background:'#fff', fontFamily:'var(--font-sans)', boxSizing:'border-box' as const }} />
            </div>
            {/* Tri */}
            <div style={{ display:'flex', gap:'3px', background:'#F5F5F5', borderRadius:'9px', padding:'3px', flexShrink:0 }}>
              {([['price','Prix'],['trend','Trend'],['name','A–Z'],['year','Année'],['psa','PSA Pop']] as [SortKey,string][]).map(([k,l])=>(
                <button key={k} onClick={()=>setSort(k)} className={`srt${sort===k?' on':''}`}>{l}</button>
              ))}
            </div>
            {/* Vue */}
            <div style={{ display:'flex', background:'#F5F5F5', borderRadius:'9px', padding:'3px', gap:'2px', flexShrink:0 }}>
              {([['grid','⊞'],['list','☰']] as [ViewMode,string][]).map(([v,icon])=>(
                <button key={v} onClick={()=>setView(v)} style={{ width:'34px', height:'32px', borderRadius:'7px', border:'none', background:view===v?'#111':'transparent', color:view===v?'#fff':'#888', fontSize:'15px', cursor:'pointer', transition:'all 0.12s', display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</button>
              ))}
            </div>
          </div>

          {/* Filtres pills */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:'12px', marginBottom:'18px' }}>
            {/* Type */}
            <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
              {[{v:'all',l:'Tous',c:'#555'},{v:'fire',l:'🔥',c:EC.fire},{v:'water',l:'💧',c:EC.water},{v:'psychic',l:'🔮',c:EC.psychic},{v:'dark',l:'🌑',c:EC.dark},{v:'electric',l:'⚡',c:EC.electric},{v:'grass',l:'🌿',c:EC.grass}].map(o=>(
                <button key={o.v} onClick={()=>setFilType(o.v)} className={`pill${filType===o.v?' on':''}`} style={{ color:filType===o.v?'#fff':o.c }}>{o.l}</button>
              ))}
            </div>
            <div style={{ width:'1px', background:'#EBEBEB', alignSelf:'stretch' }} />
            {/* Langue */}
            {[{v:'all',l:'Toutes'},{v:'EN',l:'🇺🇸 EN'},{v:'JP',l:'🇯🇵 JP'},{v:'FR',l:'🇫🇷 FR'}].map(o=>(
              <button key={o.v} onClick={()=>setFilLang(o.v)} className={`pill${filLang===o.v?' on':''}`}>{o.l}</button>
            ))}
            <div style={{ width:'1px', background:'#EBEBEB', alignSelf:'stretch' }} />
            {/* Rareté */}
            {[{v:'all',l:'Rareté'},{v:'Alt Art',l:'✦ Alt Art'},{v:'Secret Rare',l:'◈ Secret'},{v:'Gold Star',l:'★ Gold Star'},{v:'Holo Rare',l:'◇ Holo'}].map(o=>(
              <button key={o.v} onClick={()=>setFilRarity(o.v)} className={`pill${filRarity===o.v?' on':''}`}>{o.l}</button>
            ))}
            <div style={{ width:'1px', background:'#EBEBEB', alignSelf:'stretch' }} />
            {/* Ère */}
            <select value={filEra} onChange={e=>setFilEra(e.target.value)} style={{ height:'34px', padding:'0 10px', border:'1px solid #EBEBEB', borderRadius:'7px', fontSize:'12px', color:'#555', outline:'none', background:'#fff', cursor:'pointer', fontFamily:'var(--font-display)' }}>
              <option value="all">Toutes les ères</option>
              {ERAS.map(e=><option key={e} value={e}>{e}</option>)}
            </select>
            {/* Signal */}
            {[{v:'all',l:'Tous'},{v:'active',l:'⚡ Signal actif'}].map(o=>(
              <button key={o.v} onClick={()=>setFilSignal(o.v)} className={`pill${filSignal===o.v?' on':''}`}>{o.l}</button>
            ))}
            {/* Standard */}
            {[{v:'all',l:'Format'},{v:'legal',l:'Standard'},{v:'not',l:'Non-standard'}].map(o=>(
              <button key={o.v} onClick={()=>setFilLegal(o.v)} className={`pill${filLegal===o.v?' on':''}`}>{o.l}</button>
            ))}
          </div>

          {/* VUE GRILLE */}
          {view==='grid' && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:'14px' }}>
              {filtered.map((card,idx)=>{
                const ec = EC[card.type]??'#888'
                const rs = RS[card.rarity]
                const ls = LS[card.lang]
                const isSel = selected===card.id
                return (
                  <div key={card.id} className="card-h" onClick={()=>setSelected(isSel?null:card.id)} style={{ background:'#fff', border:`1.5px solid ${isSel?ec:'#EBEBEB'}`, borderRadius:'14px', overflow:'hidden', boxShadow:isSel?`0 8px 24px ${ec}30`:'0 2px 8px rgba(0,0,0,0.05)', transition:'all 0.2s', cursor:'pointer', animation:`cardIn 0.2s ${Math.min(idx,10)*0.03}s ease-out both` }}>
                    <div style={{ height:'3px', background:`linear-gradient(90deg,${ec},${ec}55)` }} />
                    {/* Art placeholder */}
                    <div style={{ height:'100px', background:`linear-gradient(145deg,${ec}18,${ec}08)`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                      <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec}CC,${ec}55)`, boxShadow:`0 0 16px ${ec}66` }} />
                      {card.signal && (
                        <div style={{ position:'absolute', top:'7px', right:'7px', fontSize:'8px', fontWeight:700, background:card.signal==='S'?'linear-gradient(135deg,#FFD700,#FF8C00)':card.signal==='A'?'#C855D4':'#2E9E6A', color:'#fff', padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-display)' }}>{card.signal}</div>
                      )}
                      {card.trend>0 && <div style={{ position:'absolute', top:'7px', left:'7px', width:'6px', height:'6px', borderRadius:'50%', background:'#E03020', animation:'pulse 1.5s ease-in-out infinite' }} />}
                      <div style={{ position:'absolute', bottom:'6px', left:'7px', fontSize:'8px', fontWeight:700, background:ls.bg, color:ls.color, border:`1px solid ${ls.border}`, padding:'1px 5px', borderRadius:'3px', fontFamily:'var(--font-display)' }}>{ls.flag} {card.lang}</div>
                      {card.psa && <div style={{ position:'absolute', bottom:'6px', right:'7px', fontSize:'8px', fontWeight:700, background:'#111', color:'#fff', padding:'1px 5px', borderRadius:'3px', fontFamily:'var(--font-display)' }}>PSA</div>}
                    </div>
                    <div style={{ padding:'12px' }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.name}</div>
                      <div style={{ fontSize:'10px', color:'#BBB', marginBottom:'8px' }}>{card.set} · #{card.number}</div>
                      {rs && <div style={{ marginBottom:'8px' }}><span style={{ fontSize:'9px', background:rs.bg, color:rs.color, border:`1px solid ${rs.border}`, padding:'2px 6px', borderRadius:'4px', fontWeight:600, fontFamily:'var(--font-display)' }}>{card.rarity}</span></div>}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                        <div>
                          <div style={{ fontSize:'16px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.3px', lineHeight:1 }}>
                            {card.price >= 1000 ? `€ ${(card.price/1000).toFixed(0)}k` : `€ ${card.price}`}
                          </div>
                          <div style={{ fontSize:'9px', color:'#CCC', marginTop:'2px' }}>Marché actuel</div>
                        </div>
                        <div style={{ fontSize:'13px', fontWeight:700, color:card.trend>=0?'#2E9E6A':'#E03020' }}>
                          {card.trend>=0?'▲':'▼'} {Math.abs(card.trend)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* VUE LISTE */}
          {view==='list' && (
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'2.2fr 1fr 0.8fr 0.8fr 0.8fr 0.7fr', padding:'10px 16px', borderBottom:'1px solid #F0F0F0', background:'#FAFAFA' }}>
                {['Carte','Prix','Trend','PSA Pop','Rareté',''].map((h,i)=>(
                  <div key={i} style={{ fontSize:'10px', fontWeight:600, color:'#AAA', textTransform:'uppercase' as const, letterSpacing:'0.07em', fontFamily:'var(--font-display)', textAlign:i>=1&&i<=4?'right' as const:'left' as const }}>{h}</div>
                ))}
              </div>
              {filtered.map((card,i)=>{
                const ec = EC[card.type]??'#888'
                const rs = RS[card.rarity]
                const ls = LS[card.lang]
                const isSel = selected===card.id
                return (
                  <div key={card.id} className="rh" onClick={()=>setSelected(isSel?null:card.id)} style={{ display:'grid', gridTemplateColumns:'2.2fr 1fr 0.8fr 0.8fr 0.8fr 0.7fr', padding:'12px 16px', borderBottom:i<filtered.length-1?'1px solid #F8F8F8':'none', alignItems:'center', background:isSel?'#FFFDE0':'transparent', borderLeft:isSel?`3px solid ${ec}`:'3px solid transparent', transition:'all 0.1s' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <div style={{ width:'32px', height:'44px', borderRadius:'6px', background:`linear-gradient(145deg,${ec}20,${ec}08)`, border:`1.5px solid ${ec}28`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <div style={{ width:'11px', height:'11px', borderRadius:'50%', background:ec, opacity:0.6 }} />
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'3px' }}>
                          <span style={{ fontSize:'13px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.name}</span>
                          {card.signal && <span style={{ fontSize:'8px', fontWeight:700, background:card.signal==='S'?'linear-gradient(135deg,#FFD700,#FF8C00)':card.signal==='A'?'#C855D4':'#2E9E6A', color:'#fff', padding:'1px 5px', borderRadius:'3px', fontFamily:'var(--font-display)', flexShrink:0 }}>{card.signal}</span>}
                        </div>
                        <div style={{ display:'flex', gap:'4px', alignItems:'center' }}>
                          <span style={{ fontSize:'10px', color:'#BBB' }}>{card.set} · #{card.number} · {card.year}</span>
                          <span style={{ fontSize:'8px', background:ls.bg, color:ls.color, border:`1px solid ${ls.border}`, padding:'1px 4px', borderRadius:'3px', fontWeight:600, fontFamily:'var(--font-display)' }}>{ls.flag}</span>
                          {card.legal && <span style={{ fontSize:'8px', background:'#F0FFF6', color:'#1A7A4A', border:'1px solid #AAEEC8', padding:'1px 4px', borderRadius:'3px', fontFamily:'var(--font-display)' }}>Standard</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', fontSize:'14px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>
                      {card.price>=1000?`€ ${(card.price/1000).toFixed(1)}k`:`€ ${card.price}`}
                    </div>
                    <div style={{ textAlign:'right', fontSize:'13px', fontWeight:700, color:card.trend>=0?'#2E9E6A':'#E03020', fontFamily:'var(--font-display)' }}>
                      {card.trend>=0?'▲':'▼'} {Math.abs(card.trend)}%
                    </div>
                    <div style={{ textAlign:'right', fontSize:'12px', color:'#888', fontFamily:'var(--font-display)' }}>
                      {card.psa ? card.psa.toLocaleString('fr-FR') : '—'}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      {rs && <span style={{ fontSize:'9px', background:rs.bg, color:rs.color, border:`1px solid ${rs.border}`, padding:'2px 6px', borderRadius:'4px', fontWeight:500, fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const }}>{card.rarity}</span>}
                    </div>
                    <div style={{ display:'flex', gap:'4px', justifyContent:'flex-end' }}>
                      <button onClick={e=>{e.stopPropagation()}} style={{ padding:'4px 8px', borderRadius:'5px', background:'#F5F5F5', border:'1px solid #E8E8E8', color:'#888', fontSize:'10px', cursor:'pointer', fontFamily:'var(--font-display)' }}>+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* PANEL DETAIL */}
        {sel && (
          <div style={{ width:'300px', flexShrink:0, animation:'slideIn 0.2s ease-out' }}>
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'16px', overflow:'hidden', position:'sticky', top:'20px' }}>
              {/* Art */}
              <div style={{ height:'140px', background:`linear-gradient(145deg,${EC[sel.type]??'#888'}25,${EC[sel.type]??'#888'}10)`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                <div style={{ width:'60px', height:'60px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${EC[sel.type]??'#888'}CC,${EC[sel.type]??'#888'}55)`, boxShadow:`0 0 24px ${EC[sel.type]??'#888'}88` }} />
                {sel.signal && (
                  <div style={{ position:'absolute', top:'10px', right:'10px', fontSize:'10px', fontWeight:700, background:sel.signal==='S'?'linear-gradient(135deg,#FFD700,#FF8C00)':sel.signal==='A'?'#C855D4':'#2E9E6A', color:'#fff', padding:'3px 8px', borderRadius:'5px', fontFamily:'var(--font-display)' }}>Signal Tier {sel.signal}</div>
                )}
                <button onClick={()=>setSelected(null)} style={{ position:'absolute', top:'10px', left:'10px', width:'26px', height:'26px', borderRadius:'50%', background:'rgba(255,255,255,0.8)', border:'1px solid rgba(0,0,0,0.1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', color:'#666' }}>×</button>
              </div>
              <div style={{ padding:'16px' }}>
                <div style={{ fontSize:'16px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', marginBottom:'4px', lineHeight:1.2 }}>{sel.name}</div>
                <div style={{ fontSize:'11px', color:'#AAA', marginBottom:'14px' }}>{sel.set} · #{sel.number} · {sel.year}</div>

                {/* Prix */}
                <div style={{ background:'#FAFAFA', borderRadius:'10px', padding:'12px', marginBottom:'14px', textAlign:'center' }}>
                  <div style={{ fontSize:'28px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-1px', lineHeight:1 }}>
                    {sel.price>=1000?`€ ${(sel.price/1000).toFixed(sel.price>=100000?0:1)}k`:`€ ${sel.price}`}
                  </div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:sel.trend>=0?'#2E9E6A':'#E03020', marginTop:'4px' }}>
                    {sel.trend>=0?'▲ +':'▼ '}{Math.abs(sel.trend)}% · 24h
                  </div>
                </div>

                {/* Infos */}
                <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'14px' }}>
                  {[
                    { label:'Rareté',      value: RS[sel.rarity] ? <span style={{ fontSize:'11px', background:RS[sel.rarity].bg, color:RS[sel.rarity].color, border:`1px solid ${RS[sel.rarity].border}`, padding:'2px 7px', borderRadius:'4px', fontWeight:600, fontFamily:'var(--font-display)' }}>{sel.rarity}</span> : sel.rarity },
                    { label:'Ère',         value: sel.era },
                    { label:'Langue',      value: <span style={{ fontSize:'11px', background:LS[sel.lang].bg, color:LS[sel.lang].color, border:`1px solid ${LS[sel.lang].border}`, padding:'2px 7px', borderRadius:'4px', fontWeight:600, fontFamily:'var(--font-display)' }}>{LS[sel.lang].flag} {sel.lang}</span> },
                    { label:'HP',          value: sel.hp ? `${sel.hp} HP` : '—' },
                    { label:'PSA Pop',     value: sel.psa ? sel.psa.toLocaleString('fr-FR') + ' ex.' : '—' },
                    { label:'Format',      value: sel.legal ? <span style={{ fontSize:'11px', color:'#1A7A4A', fontFamily:'var(--font-display)' }}>✓ Standard</span> : <span style={{ fontSize:'11px', color:'#888' }}>Non-standard</span> },
                    { label:'Reprint risk',value: sel.reprint==='none' ? <span style={{ fontSize:'11px', color:'#2E9E6A', fontFamily:'var(--font-display)' }}>Faible</span> : sel.reprint==='low' ? <span style={{ fontSize:'11px', color:'#FF8C00', fontFamily:'var(--font-display)' }}>Moyen</span> : <span style={{ fontSize:'11px', color:'#E03020', fontFamily:'var(--font-display)' }}>Élevé</span> },
                  ].map(row=>(
                    <div key={String(row.label)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:'11px', color:'#888', fontFamily:'var(--font-display)' }}>{row.label}</span>
                      <span style={{ fontSize:'12px', color:'#111', fontFamily:'var(--font-display)', fontWeight:500 }}>{row.value as React.ReactNode}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
                  <button style={{ width:'100%', padding:'10px', borderRadius:'9px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                    + Ajouter au portfolio
                  </button>
                  <button style={{ width:'100%', padding:'10px', borderRadius:'9px', background:'#F5F5F5', color:'#555', border:'1px solid #E8E8E8', fontSize:'12px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                    🔔 Alerte de prix
                  </button>
                  {sel.signal && (
                    <button style={{ width:'100%', padding:'10px', borderRadius:'9px', background:'#FFF0EE', color:'#E03020', border:'1px solid #FFD8D0', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                      Voir le signal Tier {sel.signal}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
