'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

// ── PRICE HISTORY GENERATOR ──
function genH(base:number, vol:number, trend:number, days:number): number[] {
  const p=[base*(1-trend*days/365)]
  for(let i=1;i<=days;i++){const n=(Math.random()-.48)*vol*p[i-1];p.push(Math.max(p[i-1]+n+trend*p[i-1]/365,p[0]*.4))}
  return p.map(v=>Math.round(v))
}

type Period = '1J'|'1S'|'1M'|'3M'|'1A'|'3A'|'5A'|'MAX'
const P_DAYS:Record<Period,number> = {'1J':1,'1S':7,'1M':30,'3M':90,'1A':365,'3A':1095,'5A':1825,'MAX':3650}

interface Card {
  name:string; set:string; img:string; price:number; change:number; vol:number
  rarity:string; type:string; gen:number; psa10:number; psa9:number; number:string
}

const CARDS: Card[] = [
  { name:'Charizard ex Alt Art',    set:'Obsidian Flames',price:920, change:21.3,vol:203,rarity:'SAR',type:'fire',   gen:1,psa10:1680,psa9:1100,number:'234/197',img:'https://assets.tcgdex.net/en/sv/sv3/234/high.webp' },
  { name:'Umbreon VMAX Alt Art',    set:'Evolving Skies', price:880, change:24.1,vol:112,rarity:'SAR',type:'dark',   gen:2,psa10:1600,psa9:1050,number:'215/203',img:'https://assets.tcgdex.net/en/swsh/swsh7/215/high.webp' },
  { name:'Rayquaza Gold Star',      set:'EX Deoxys',      price:740, change:31.2,vol:48, rarity:'Gold Star',type:'dragon',gen:3,psa10:4200,psa9:1800,number:'107/107',img:'https://assets.tcgdex.net/en/ex/ex7/107/high.webp' },
  { name:'Gengar VMAX Alt Art',     set:'Fusion Strike',  price:340, change:18.4,vol:67, rarity:'SAR',type:'psychic',gen:1,psa10:620, psa9:420, number:'271/264',img:'https://assets.tcgdex.net/en/swsh/swsh8/271/high.webp' },
  { name:'Lugia Neo Genesis',       set:'Neo Genesis',    price:580, change:15.2,vol:31, rarity:'Holo',type:'psychic',gen:2,psa10:8400,psa9:1200,number:'9/111', img:'https://assets.tcgdex.net/en/neo/neo1/9/high.webp' },
  { name:'Mew ex Alt Art',          set:'Pokémon 151',    price:142, change:12.8,vol:95, rarity:'SAR',type:'psychic',gen:1,psa10:280, psa9:180, number:'205/165',img:'https://assets.tcgdex.net/en/sv/sv3pt5/205/high.webp' },
  { name:'Blastoise Base Set',      set:'Base Set',       price:620, change:-4.2,vol:24, rarity:'Holo',type:'water', gen:1,psa10:12000,psa9:1400,number:'2/102',img:'https://assets.tcgdex.net/en/base/base1/2/high.webp' },
  { name:'Pikachu VMAX RR',         set:'Vivid Voltage',  price:110, change:-3.8,vol:89, rarity:'RR', type:'electric',gen:1,psa10:220,psa9:140, number:'188/185',img:'https://assets.tcgdex.net/en/swsh/swsh4/188/high.webp' },
  { name:'Mewtwo GX Rainbow',       set:'Unified Minds',  price:95,  change:-2.9,vol:44, rarity:'HR', type:'psychic',gen:1,psa10:190,psa9:120, number:'222/236',img:'https://assets.tcgdex.net/en/sm/sm11/222/high.webp' },
  { name:'Espeon VMAX Alt Art',     set:'Evolving Skies', price:420, change:8.5, vol:56, rarity:'SAR',type:'psychic',gen:2,psa10:780,psa9:520, number:'270/203',img:'https://assets.tcgdex.net/en/swsh/swsh7/270/high.webp' },
  { name:'Dragonite V Alt Art',     set:'Pokémon GO',     price:290, change:14.8,vol:33, rarity:'SAR',type:'dragon', gen:1,psa10:540,psa9:360, number:'076/078',img:'https://assets.tcgdex.net/en/swsh/swshp/SWSH154/high.webp' },
  { name:'Charizard Base Set',      set:'Base Set',       price:3400,change:5.8, vol:12, rarity:'Holo',type:'fire',  gen:1,psa10:42000,psa9:5200,number:'4/102',img:'https://assets.tcgdex.net/en/base/base1/4/high.webp' },
  { name:'Glaceon VMAX Alt Art',    set:'Evolving Skies', price:260, change:6.2, vol:41, rarity:'SAR',type:'water',  gen:4,psa10:490,psa9:330, number:'209/203',img:'https://assets.tcgdex.net/en/swsh/swsh7/209/high.webp' },
  { name:'Leafeon VMAX Alt Art',    set:'Evolving Skies', price:310, change:7.1, vol:38, rarity:'SAR',type:'grass',  gen:4,psa10:580,psa9:390, number:'205/203',img:'https://assets.tcgdex.net/en/swsh/swsh7/205/high.webp' },
  { name:'Pikachu Illustrator',     set:'Promo',          price:42000,change:2.1,vol:1,  rarity:'Promo',type:'electric',gen:1,psa10:420000,psa9:120000,number:'---',img:'https://assets.tcgdex.net/en/base/basep/1/high.webp' },
  { name:'Moonbreon (Umbreon V Alt)',set:'Evolving Skies',price:340, change:19.5,vol:78, rarity:'SAR',type:'dark',   gen:2,psa10:650,psa9:430, number:'188/203',img:'https://assets.tcgdex.net/en/swsh/swsh7/188/high.webp' },
]

const TYPES = [...new Set(CARDS.map(c=>c.type))].sort()
const SETS = [...new Set(CARDS.map(c=>c.set))].sort()

// Pre-generate histories
const HISTORIES: Record<string, number[]> = {}
CARDS.forEach(c => { HISTORIES[c.name] = genH(c.price, .018, .15, 3650) })

function getSlice(name:string, period:Period): number[] {
  const h = HISTORIES[name]
  if (!h) return []
  if (period === '1J') return Array.from({length:48},()=>Math.round(h[h.length-1]*(1+(Math.random()-.48)*.005)))
  return h.slice(-Math.min(P_DAYS[period]+1, h.length))
}

// ── CHART ──
function Chart({data,color,period}:{data:number[];color:string;period:Period}) {
  const ref = useRef<SVGSVGElement>(null)
  const [hover,setHover] = useState<{x:number;y:number;val:number;idx:number}|null>(null)
  const W=580,H=200,PY=10
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1
  const pts=data.map((v,i)=>({x:i/(data.length-1)*W,y:PY+(1-(v-mn)/rng)*(H-PY*2),v}))
  const line=pts.map(p=>`${p.x},${p.y}`).join(' ')
  const area=`0,${H} ${line} ${W},${H}`
  const onMove = useCallback((e:React.MouseEvent<SVGSVGElement>)=>{
    if(!ref.current)return
    const r=ref.current.getBoundingClientRect()
    const idx=Math.round((e.clientX-r.left)/r.width*(data.length-1))
    if(idx>=0&&idx<pts.length)setHover({x:pts[idx].x,y:pts[idx].y,val:pts[idx].v,idx})
  },[data,pts])
  const dateLabel=(idx:number)=>{
    const d=new Date();d.setDate(d.getDate()-(data.length-1-idx))
    if(period==='1J')return d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})
    if(['3A','5A','MAX'].includes(period))return d.toLocaleDateString('fr-FR',{month:'short',year:'numeric'})
    if(period==='1A')return d.toLocaleDateString('fr-FR',{month:'short',year:'2-digit'})
    return d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})
  }
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:200,display:'block',cursor:'crosshair'}} onMouseMove={onMove} onMouseLeave={()=>setHover(null)}>
      <defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={.12}/><stop offset="100%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
      {[.25,.5,.75].map(r=><line key={r} x1={0} x2={W} y1={PY+r*(H-PY*2)} y2={PY+r*(H-PY*2)} stroke="rgba(0,0,0,.03)" strokeWidth={1}/>)}
      <polygon points={area} fill="url(#eg)"/>
      <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
      {hover&&<>
        <line x1={hover.x} x2={hover.x} y1={PY} y2={H-PY} stroke="rgba(0,0,0,.08)" strokeWidth={1} strokeDasharray="3,3"/>
        <circle cx={hover.x} cy={hover.y} r={4} fill={color} stroke="#fff" strokeWidth={2}/>
        <rect x={Math.min(Math.max(hover.x-44,0),W-88)} y={Math.max(hover.y-46,0)} width={88} height={36} rx={8} fill="#111"/>
        <text x={Math.min(Math.max(hover.x,44),W-44)} y={Math.max(hover.y-28,12)} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={600} fontFamily="var(--font-data)">{hover.val.toLocaleString('fr-FR')}</text>
        <text x={Math.min(Math.max(hover.x,44),W-44)} y={Math.max(hover.y-15,25)} textAnchor="middle" fill="rgba(255,255,255,.5)" fontSize={10} fontFamily="var(--font-display)">{dateLabel(hover.idx)}</text>
      </>}
    </svg>
  )
}

// ── SALES MOCK ──
function mockSales(card:Card) {
  return [
    {src:'eBay',grade:'PSA 10',p:card.psa10,ago:'2h',lang:'EN'},
    {src:'CM',grade:'Raw NM',p:card.price,ago:'5h',lang:'FR'},
    {src:'eBay',grade:'PSA 9',p:card.psa9,ago:'1j',lang:'EN'},
    {src:'CM',grade:'Raw LP',p:Math.round(card.price*.85),ago:'2j',lang:'JP'},
    {src:'eBay',grade:'PSA 10',p:Math.round(card.psa10*.97),ago:'3j',lang:'EN'},
    {src:'eBay',grade:'Raw NM',p:Math.round(card.price*1.02),ago:'4j',lang:'FR'},
    {src:'CM',grade:'PSA 9',p:Math.round(card.psa9*.95),ago:'5j',lang:'EN'},
  ]
}

// ── TYPE COLORS ──
const TC:Record<string,string> = {fire:'#FF6B35',water:'#42A5F5',psychic:'#C855D4',dark:'#7E57C2',electric:'#D4A800',grass:'#3DA85A',dragon:'#6F5CE6'}

// ── MAIN ──
export function CardExplorer() {
  const [sel, setSel] = useState<string>(CARDS[0].name)
  const [period, setPeriod] = useState<Period>('1M')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterSet, setFilterSet] = useState<string>('all')
  const [sort, setSort] = useState<'name'|'price'|'change'|'vol'>('vol')
  const listRef = useRef<HTMLDivElement>(null)

  const card = CARDS.find(c => c.name === sel)!
  const data = useMemo(() => getSlice(sel, period), [sel, period])
  const cur = data[data.length-1]||card.price
  const start = data[0]||card.price
  const pct = ((cur-start)/start*100)
  const isUp = pct >= 0

  const filtered = useMemo(() => {
    let list = [...CARDS]
    if (search) { const q=search.toLowerCase(); list=list.filter(c=>c.name.toLowerCase().includes(q)||c.set.toLowerCase().includes(q)) }
    if (filterType !== 'all') list = list.filter(c=>c.type===filterType)
    if (filterSet !== 'all') list = list.filter(c=>c.set===filterSet)
    list.sort((a,b) => {
      if (sort==='name') return a.name.localeCompare(b.name)
      if (sort==='price') return b.price-a.price
      if (sort==='change') return b.change-a.change
      return b.vol-a.vol
    })
    return list
  }, [search, filterType, filterSet, sort])

  const curIdx = filtered.findIndex(c=>c.name===sel)

  const nav = (dir:-1|1) => {
    const next = curIdx + dir
    if (next >= 0 && next < filtered.length) { setSel(filtered[next].name); setPeriod('1M') }
  }

  useEffect(() => {
    const onKey = (e:KeyboardEvent) => {
      if (e.key==='ArrowUp') { e.preventDefault(); nav(-1) }
      if (e.key==='ArrowDown') { e.preventDefault(); nav(1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [curIdx, filtered])

  // Scroll selected into view
  useEffect(() => {
    const el = document.getElementById('card-'+sel)
    if (el && listRef.current) el.scrollIntoView({ block:'nearest', behavior:'smooth' })
  }, [sel])

  return (
    <>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .ex-row{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-left:3px solid transparent;transition:all .12s}
        .ex-row:hover{background:#FAFAFA}
        .ex-row.on{background:#FFF5F4;border-left-color:#E03020}
        .ex-row.on .ex-name{color:#111;font-weight:600}
        .ex-name{font-size:12px;font-weight:400;color:#555;font-family:var(--font-display);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .per-btn{padding:4px 12px;border-radius:6px;border:1px solid #EBEBEB;background:#fff;color:#888;font-size:10px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .1s}
        .per-btn:hover{border-color:#C7C7CC;color:#111}
        .per-btn.on{background:#111;color:#fff;border-color:#111}
        .f-sel{padding:4px 8px;border-radius:6px;border:1px solid #EBEBEB;background:#fff;font-size:10px;color:#555;font-family:var(--font-display);cursor:pointer;outline:none}
        .f-sel:focus{border-color:#E03020}
        .nav-a{width:28px;height:28px;border-radius:7px;border:1px solid #EBEBEB;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#888;transition:all .12s}
        .nav-a:hover:not(:disabled){border-color:#111;color:#111}
        .nav-a:disabled{opacity:.2;cursor:default}
        .sale-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #F5F5F5;font-size:12px}
        .sale-row:last-child{border-bottom:none}
        .stat-b{background:#F8F8FA;border-radius:8px;padding:10px 12px}
        .stat-v{font-size:16px;font-weight:700;font-family:var(--font-data);letter-spacing:-.5px}
        .stat-l{font-size:9px;color:#AAA;font-family:var(--font-display);margin-top:2px}
        .sort-btn{padding:3px 8px;border-radius:5px;border:none;background:transparent;font-size:10px;color:#AAA;cursor:pointer;font-family:var(--font-display);transition:all .1s}
        .sort-btn:hover{color:#111}
        .sort-btn.on{background:#111;color:#fff}
      `}</style>

      <div style={{ display:'flex', height:'calc(100vh - 120px)', animation:'fadeIn .25s ease-out' }}>

        {/* ── LEFT: CARD LIST ── */}
        <div style={{ width:320, borderRight:'1px solid #EBEBEB', display:'flex', flexDirection:'column', flexShrink:0, background:'#fff' }}>

          {/* Search */}
          <div style={{ padding:'12px 12px 8px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, background:'#F5F5F7', border:'1px solid #EBEBEB', borderRadius:8, padding:'7px 10px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..."
                style={{ border:'none', background:'transparent', outline:'none', fontSize:12, fontFamily:'var(--font-display)', color:'#111', width:'100%' }} />
              {search && <button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#AAA', fontSize:12 }}>{'\u00d7'}</button>}
            </div>
          </div>

          {/* Filters */}
          <div style={{ padding:'0 12px 8px', display:'flex', gap:4, flexWrap:'wrap' }}>
            <select className="f-sel" value={filterType} onChange={e=>setFilterType(e.target.value)}>
              <option value="all">Tous types</option>
              {TYPES.map(t=><option key={t} value={t}>{t[0].toUpperCase()+t.slice(1)}</option>)}
            </select>
            <select className="f-sel" value={filterSet} onChange={e=>setFilterSet(e.target.value)}>
              <option value="all">Tous sets</option>
              {SETS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ marginLeft:'auto', display:'flex', gap:2 }}>
              {(['vol','price','change','name'] as const).map(s=>(
                <button key={s} className={'sort-btn'+(sort===s?' on':'')} onClick={()=>setSort(s)}>
                  {s==='vol'?'Vol':s==='price'?'Prix':s==='change'?'%':'A-Z'}
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div style={{ padding:'0 12px 6px', fontSize:10, color:'#BBB', fontFamily:'var(--font-display)' }}>
            {filtered.length} carte{filtered.length>1?'s':''}
          </div>

          {/* List */}
          <div ref={listRef} style={{ flex:1, overflowY:'auto' }}>
            {filtered.map((c,i) => (
              <div key={c.name} id={'card-'+c.name} className={'ex-row'+(sel===c.name?' on':'')} onClick={()=>{setSel(c.name);setPeriod('1M')}}>
                <img src={c.img} alt="" style={{ width:32, height:44, objectFit:'cover', borderRadius:4, border:'1px solid #F0F0F0', flexShrink:0 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="ex-name">{c.name}</div>
                  <div style={{ fontSize:10, color:'#BBB', marginTop:1 }}>{c.set}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, fontFamily:'var(--font-data)', letterSpacing:'-.3px' }}>{c.price.toLocaleString('fr-FR')} {'\u20ac'}</div>
                  <div style={{ fontSize:10, fontWeight:600, color:c.change>=0?'#2E9E6A':'#E03020', fontFamily:'var(--font-data)' }}>{c.change>=0?'+':''}{c.change}%</div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding:24, textAlign:'center', color:'#BBB', fontSize:12, fontFamily:'var(--font-display)' }}>Aucune carte trouv{'\u00e9'}e</div>
            )}
          </div>
        </div>

        {/* ── RIGHT: DETAIL ── */}
        <div style={{ flex:1, overflowY:'auto', background:'#FAFBFC' }}>

          {/* Nav bar */}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 20px', borderBottom:'1px solid #EBEBEB', background:'#fff', position:'sticky', top:0, zIndex:10 }}>
            <button className="nav-a" disabled={curIdx<=0} onClick={()=>nav(-1)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button className="nav-a" disabled={curIdx>=filtered.length-1} onClick={()=>nav(1)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            <span style={{ fontSize:10, color:'#BBB', fontFamily:'var(--font-data)' }}>{curIdx+1}/{filtered.length}</span>
            <div style={{ flex:1 }} />
            <span style={{ fontSize:10, color:'#BBB', fontFamily:'var(--font-display)' }}>{'\u2191\u2193'} Fl{'\u00e8'}ches pour naviguer</span>
          </div>

          <div style={{ padding:'20px 24px' }}>

            {/* Hero */}
            <div style={{ display:'flex', gap:20, marginBottom:20 }}>
              <img src={card.img} alt="" style={{ width:140, height:195, objectFit:'cover', borderRadius:10, border:'1px solid #EBEBEB', boxShadow:'0 4px 20px rgba(0,0,0,.08)', flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:TC[card.type]||'#888' }} />
                  <span style={{ fontSize:10, color:'#AAA', fontFamily:'var(--font-display)', textTransform:'capitalize' }}>{card.type}</span>
                  <span style={{ fontSize:10, color:'#DDD' }}>{'\u00b7'}</span>
                  <span style={{ fontSize:10, color:'#AAA', fontFamily:'var(--font-display)' }}>{card.rarity}</span>
                  <span style={{ fontSize:10, color:'#DDD' }}>{'\u00b7'}</span>
                  <span style={{ fontSize:10, color:'#AAA', fontFamily:'var(--font-data)' }}>{card.number}</span>
                </div>
                <h2 style={{ fontSize:22, fontWeight:600, fontFamily:'var(--font-display)', letterSpacing:'-.4px', margin:'0 0 2px' }}>{card.name}</h2>
                <div style={{ fontSize:12, color:'#888', fontFamily:'var(--font-display)', marginBottom:12 }}>{card.set}</div>
                <div style={{ fontSize:34, fontWeight:700, fontFamily:'var(--font-data)', letterSpacing:'-1.5px', lineHeight:1 }}>{cur.toLocaleString('fr-FR')} {'\u20ac'}</div>
                <div style={{ fontSize:15, fontWeight:600, color:isUp?'#2E9E6A':'#E03020', fontFamily:'var(--font-data)', marginTop:4 }}>
                  {isUp?'\u25b2':'\u25bc'} {isUp?'+':''}{pct.toFixed(1)}%
                  <span style={{ color:'#AAA', fontWeight:400, fontSize:12, marginLeft:8 }}>{isUp?'+':''}{(cur-start).toLocaleString('fr-FR')} {'\u20ac'}</span>
                </div>
                <div style={{ display:'flex', gap:3, marginTop:12 }}>
                  {(['1J','1S','1M','3M','1A','3A','5A','MAX'] as Period[]).map(p => (
                    <button key={p} className={`per-btn${period===p?' on':''}`} onClick={()=>setPeriod(p)}>{p}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
              <Chart data={data} color={isUp?'#2E9E6A':'#E03020'} period={period} />
            </div>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
              <div className="stat-b"><div className="stat-v">{card.vol}</div><div className="stat-l">Volume 24h</div></div>
              <div className="stat-b"><div className="stat-v" style={{ color:card.change>=0?'#2E9E6A':'#E03020' }}>{card.change>=0?'+':''}{card.change}%</div><div className="stat-l">Variation 24h</div></div>
              <div className="stat-b"><div className="stat-v">{card.psa10.toLocaleString('fr-FR')} {'\u20ac'}</div><div className="stat-l">PSA 10</div></div>
              <div className="stat-b"><div className="stat-v">{card.psa9.toLocaleString('fr-FR')} {'\u20ac'}</div><div className="stat-l">PSA 9</div></div>
            </div>

            {/* Grade premium */}
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#888', fontFamily:'var(--font-display)', marginBottom:10, textTransform:'uppercase', letterSpacing:'.06em' }}>Prime de gradation</div>
              <div style={{ display:'flex', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:11, color:'#888' }}>Raw {'\u2192'} PSA 10</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'#2E9E6A', fontFamily:'var(--font-data)' }}>+{Math.round((card.psa10/card.price-1)*100)}%</span>
                  </div>
                  <div style={{ height:6, background:'#F0F0F0', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:Math.min((card.psa10/card.price-1)*20,100)+'%', background:'linear-gradient(90deg,#2E9E6A,#1D7A50)', borderRadius:99 }} />
                  </div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:11, color:'#888' }}>Raw {'\u2192'} PSA 9</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'#EF9F27', fontFamily:'var(--font-data)' }}>+{Math.round((card.psa9/card.price-1)*100)}%</span>
                  </div>
                  <div style={{ height:6, background:'#F0F0F0', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:Math.min((card.psa9/card.price-1)*20,100)+'%', background:'linear-gradient(90deg,#EF9F27,#D48820)', borderRadius:99 }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent sales */}
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#888', fontFamily:'var(--font-display)', marginBottom:10, textTransform:'uppercase', letterSpacing:'.06em' }}>Derni{'\u00e8'}res ventes</div>
              {mockSales(card).map((sale,i) => (
                <div key={i} className="sale-row">
                  <span style={{ fontSize:10, fontWeight:600, color:sale.src==='eBay'?'#378ADD':'#EF9F27', background:sale.src==='eBay'?'rgba(55,138,221,.06)':'rgba(239,159,39,.06)', padding:'2px 6px', borderRadius:4, fontFamily:'var(--font-display)' }}>{sale.src}</span>
                  <span style={{ flex:1, color:'#555', fontFamily:'var(--font-display)', fontSize:12 }}>{sale.grade}</span>
                  <span style={{ fontSize:10, color:'#BBB', fontFamily:'var(--font-display)' }}>{sale.lang} {'\u00b7'} {sale.ago}</span>
                  <span style={{ fontWeight:600, fontFamily:'var(--font-data)', fontSize:13, minWidth:70, textAlign:'right' }}>{sale.p.toLocaleString('fr-FR')} {'\u20ac'}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
