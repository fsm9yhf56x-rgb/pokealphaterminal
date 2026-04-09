'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

function genH(base:number,vol:number,trend:number,days:number):number[]{
  const start=Math.max(base*.35,base*(1-trend*(days/365)*.6))
  const p=[start]
  for(let i=1;i<=days;i++){const n=(Math.random()-.48)*vol*p[i-1];p.push(Math.max(p[i-1]+n+trend*p[i-1]/365,start*.6))}
  const ratio=base/p[p.length-1]
  return p.map(v=>Math.round(v*ratio))
}
type Period='1J'|'1S'|'1M'|'3M'|'1A'|'3A'|'5A'|'MAX'
const P_DAYS:Record<Period,number>={'1J':1,'1S':7,'1M':30,'3M':90,'1A':365,'3A':1095,'5A':1825,'MAX':3650}

interface Card{name:string;set:string;img:string;price:number;change:number;vol:number;rarity:string;type:string;gen:number;psa10:number;psa9:number;number:string}
const CARDS:Card[]=[
  {name:'Charizard ex Alt Art',set:'Obsidian Flames',price:920,change:21.3,vol:203,rarity:'SAR',type:'fire',gen:1,psa10:1680,psa9:1100,number:'234/197',img:'https://assets.tcgdex.net/en/sv/sv3/234/high.webp'},
  {name:'Umbreon VMAX Alt Art',set:'Evolving Skies',price:880,change:24.1,vol:112,rarity:'SAR',type:'dark',gen:2,psa10:1600,psa9:1050,number:'215/203',img:'https://assets.tcgdex.net/en/swsh/swsh7/215/high.webp'},
  {name:'Rayquaza Gold Star',set:'EX Deoxys',price:740,change:31.2,vol:48,rarity:'Gold Star',type:'dragon',gen:3,psa10:4200,psa9:1800,number:'107/107',img:'https://assets.tcgdex.net/en/ex/ex7/107/high.webp'},
  {name:'Gengar VMAX Alt Art',set:'Fusion Strike',price:340,change:18.4,vol:67,rarity:'SAR',type:'psychic',gen:1,psa10:620,psa9:420,number:'271/264',img:'https://assets.tcgdex.net/en/swsh/swsh8/271/high.webp'},
  {name:'Lugia Neo Genesis',set:'Neo Genesis',price:580,change:15.2,vol:31,rarity:'Holo',type:'psychic',gen:2,psa10:8400,psa9:1200,number:'9/111',img:'https://assets.tcgdex.net/en/neo/neo1/9/high.webp'},
  {name:'Mew ex Alt Art',set:'Pokemon 151',price:142,change:12.8,vol:95,rarity:'SAR',type:'psychic',gen:1,psa10:280,psa9:180,number:'205/165',img:'https://assets.tcgdex.net/en/sv/sv3pt5/205/high.webp'},
  {name:'Blastoise Base Set',set:'Base Set',price:620,change:-4.2,vol:24,rarity:'Holo',type:'water',gen:1,psa10:12000,psa9:1400,number:'2/102',img:'https://assets.tcgdex.net/en/base/base1/2/high.webp'},
  {name:'Pikachu VMAX RR',set:'Vivid Voltage',price:110,change:-3.8,vol:89,rarity:'RR',type:'electric',gen:1,psa10:220,psa9:140,number:'188/185',img:'https://assets.tcgdex.net/en/swsh/swsh4/188/high.webp'},
  {name:'Mewtwo GX Rainbow',set:'Unified Minds',price:95,change:-2.9,vol:44,rarity:'HR',type:'psychic',gen:1,psa10:190,psa9:120,number:'222/236',img:'https://assets.tcgdex.net/en/sm/sm11/222/high.webp'},
  {name:'Espeon VMAX Alt Art',set:'Evolving Skies',price:420,change:8.5,vol:56,rarity:'SAR',type:'psychic',gen:2,psa10:780,psa9:520,number:'270/203',img:'https://assets.tcgdex.net/en/swsh/swsh7/270/high.webp'},
  {name:'Dragonite V Alt Art',set:'Pokemon GO',price:290,change:14.8,vol:33,rarity:'SAR',type:'dragon',gen:1,psa10:540,psa9:360,number:'076/078',img:'https://assets.tcgdex.net/en/swsh/swshp/SWSH154/high.webp'},
  {name:'Charizard Base Set',set:'Base Set',price:3400,change:5.8,vol:12,rarity:'Holo',type:'fire',gen:1,psa10:42000,psa9:5200,number:'4/102',img:'https://assets.tcgdex.net/en/base/base1/4/high.webp'},
  {name:'Glaceon VMAX Alt Art',set:'Evolving Skies',price:260,change:6.2,vol:41,rarity:'SAR',type:'water',gen:4,psa10:490,psa9:330,number:'209/203',img:'https://assets.tcgdex.net/en/swsh/swsh7/209/high.webp'},
  {name:'Leafeon VMAX Alt Art',set:'Evolving Skies',price:310,change:7.1,vol:38,rarity:'SAR',type:'grass',gen:4,psa10:580,psa9:390,number:'205/203',img:'https://assets.tcgdex.net/en/swsh/swsh7/205/high.webp'},
  {name:'Pikachu Illustrator',set:'Promo',price:42000,change:2.1,vol:1,rarity:'Promo',type:'electric',gen:1,psa10:420000,psa9:120000,number:'---',img:'https://assets.tcgdex.net/en/base/basep/1/high.webp'},
  {name:'Moonbreon (Umbreon V Alt)',set:'Evolving Skies',price:340,change:19.5,vol:78,rarity:'SAR',type:'dark',gen:2,psa10:650,psa9:430,number:'188/203',img:'https://assets.tcgdex.net/en/swsh/swsh7/188/high.webp'},
]
const SETS=[...new Set(CARDS.map(c=>c.set))].sort()
const RARITIES=[...new Set(CARDS.map(c=>c.rarity))].sort()
const HISTORIES:Record<string,number[]>={}
CARDS.forEach(c=>{HISTORIES[c.name]=genH(c.price,.018,.15,3650)})
const VINTAGE_SETS=['Base Set','EX Deoxys','Neo Genesis','Promo']
const TC:Record<string,string>={fire:'#FF6B35',water:'#42A5F5',psychic:'#C855D4',dark:'#7E57C2',electric:'#D4A800',grass:'#3DA85A',dragon:'#6F5CE6'}

function getSlice(name:string,period:Period):number[]{
  const h=HISTORIES[name];if(!h)return[]
  if(period==='1J')return Array.from({length:48},()=>Math.round(h[h.length-1]*(1+(Math.random()-.48)*.005)))
  return h.slice(-Math.min(P_DAYS[period]+1,h.length))
}

function Spark({data,w=56,h=20}:{data:number[];w?:number;h?:number}){
  if(data.length<2)return null
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1
  const up=data[data.length-1]>=data[0]
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rng)*(h-2)-1}`).join(' ')
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}><polyline points={pts} fill="none" stroke={up?'#2E9E6A':'#E03020'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function Chart({data,color,period}:{data:number[];color:string;period:Period}){
  const ref=useRef<SVGSVGElement>(null)
  const [hover,setHover]=useState<{x:number;y:number;val:number;idx:number}|null>(null)
  const W=600,H=200,PY=10
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1
  const pts=data.map((v,i)=>({x:i/(data.length-1)*W,y:PY+(1-(v-mn)/rng)*(H-PY*2),v}))
  const line=pts.map(p=>`${p.x},${p.y}`).join(' ')
  const area=`0,${H} ${line} ${W},${H}`
  const onMove=useCallback((e:React.MouseEvent<SVGSVGElement>)=>{
    if(!ref.current)return;const r=ref.current.getBoundingClientRect()
    const idx=Math.round((e.clientX-r.left)/r.width*(data.length-1))
    if(idx>=0&&idx<pts.length)setHover({x:pts[idx].x,y:pts[idx].y,val:pts[idx].v,idx})
  },[data,pts])
  const dl=(idx:number)=>{const d=new Date();d.setDate(d.getDate()-(data.length-1-idx))
    if(period==='1J')return d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})
    if(['3A','5A','MAX'].includes(period))return d.toLocaleDateString('fr-FR',{month:'short',year:'numeric'})
    if(period==='1A')return d.toLocaleDateString('fr-FR',{month:'short',year:'2-digit'})
    return d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}
  return(
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:200,display:'block',cursor:'crosshair'}} onMouseMove={onMove} onMouseLeave={()=>setHover(null)}>
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={.1}/><stop offset="100%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
      {[.25,.5,.75].map(r=><line key={r} x1={0} x2={W} y1={PY+r*(H-PY*2)} y2={PY+r*(H-PY*2)} stroke="rgba(0,0,0,.03)" strokeWidth={1}/>)}
      <polygon points={area} fill="url(#cg)"/><polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
      {hover&&<><line x1={hover.x} x2={hover.x} y1={PY} y2={H-PY} stroke="rgba(0,0,0,.08)" strokeWidth={1} strokeDasharray="3,3"/>
        <circle cx={hover.x} cy={hover.y} r={4} fill={color} stroke="#fff" strokeWidth={2}/>
        <rect x={Math.min(Math.max(hover.x-44,0),W-88)} y={Math.max(hover.y-46,0)} width={88} height={36} rx={8} fill="#111"/>
        <text x={Math.min(Math.max(hover.x,44),W-44)} y={Math.max(hover.y-28,12)} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={600} fontFamily="var(--font-data)">{hover.val.toLocaleString('fr-FR')}</text>
        <text x={Math.min(Math.max(hover.x,44),W-44)} y={Math.max(hover.y-15,25)} textAnchor="middle" fill="rgba(255,255,255,.5)" fontSize={10} fontFamily="var(--font-display)">{dl(hover.idx)}</text></>}
    </svg>)
}

function mockSales(c:Card){return[
  {src:'eBay',grade:'PSA 10',p:c.psa10,ago:'2h',lang:'EN'},{src:'CM',grade:'Raw NM',p:c.price,ago:'5h',lang:'FR'},
  {src:'eBay',grade:'PSA 9',p:c.psa9,ago:'1j',lang:'EN'},{src:'CM',grade:'Raw LP',p:Math.round(c.price*.85),ago:'2j',lang:'JP'},
  {src:'eBay',grade:'PSA 10',p:Math.round(c.psa10*.97),ago:'3j',lang:'EN'},
]}

export function CardExplorer(){
  const [sel,setSel]=useState(CARDS[0].name)
  const [period,setPeriod]=useState<Period>('1M')
  const [search,setSearch]=useState('')
  const [sort,setSort]=useState<'vol'|'price'|'change'|'psa'|'name'>('vol')
  const [filterSet,setFilterSet]=useState('all')
  const [filterRarity,setFilterRarity]=useState('all')
  const [filterEra,setFilterEra]=useState('all')
  const [filterPriceMin,setFilterPriceMin]=useState('')
  const [filterPriceMax,setFilterPriceMax]=useState('')
  const [filterTrend,setFilterTrend]=useState('all')
  const [filterGrade,setFilterGrade]=useState('all')
  const [showFilters,setShowFilters]=useState(false)
  const listRef=useRef<HTMLDivElement>(null)

  const card=CARDS.find(c=>c.name===sel)!
  const data=useMemo(()=>getSlice(sel,period),[sel,period])
  const cur=data[data.length-1]||card.price,start=data[0]||card.price
  const pct=((cur-start)/start*100),isUp=pct>=0
  const spark30=useMemo(()=>(HISTORIES[sel]||[]).slice(-30),[sel])

  const af=[filterSet,filterRarity,filterEra,filterPriceMin,filterPriceMax,filterTrend,filterGrade].filter(f=>f&&f!=='all').length
  const resetF=()=>{setFilterSet('all');setFilterRarity('all');setFilterEra('all');setFilterPriceMin('');setFilterPriceMax('');setFilterTrend('all');setFilterGrade('all')}

  const filtered=useMemo(()=>{
    let l=[...CARDS]
    if(search){const q=search.toLowerCase();l=l.filter(c=>c.name.toLowerCase().includes(q)||c.set.toLowerCase().includes(q)||c.rarity.toLowerCase().includes(q)||c.number.includes(q))}
    if(filterSet!=='all')l=l.filter(c=>c.set===filterSet)
    if(filterRarity!=='all')l=l.filter(c=>c.rarity===filterRarity)
    if(filterEra==='vintage')l=l.filter(c=>VINTAGE_SETS.includes(c.set))
    if(filterEra==='modern')l=l.filter(c=>!VINTAGE_SETS.includes(c.set))
    if(filterPriceMin)l=l.filter(c=>c.price>=+filterPriceMin)
    if(filterPriceMax)l=l.filter(c=>c.price<=+filterPriceMax)
    if(filterTrend==='up')l=l.filter(c=>c.change>0)
    if(filterTrend==='down')l=l.filter(c=>c.change<0)
    if(filterTrend==='hot')l=l.filter(c=>c.change>15)
    if(filterTrend==='stable')l=l.filter(c=>Math.abs(c.change)<5)
    if(filterGrade==='psa10+')l=l.filter(c=>c.psa10>=1000)
    if(filterGrade==='premium')l=l.filter(c=>(c.psa10/c.price)>=2)
    l.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='price'?b.price-a.price:sort==='change'?b.change-a.change:sort==='psa'?b.psa10-a.psa10:b.vol-a.vol)
    return l
  },[search,filterSet,filterRarity,filterEra,filterPriceMin,filterPriceMax,filterTrend,filterGrade,sort])

  const ci=filtered.findIndex(c=>c.name===sel)
  const nav=(d:-1|1)=>{const n=ci+d;if(n>=0&&n<filtered.length){setSel(filtered[n].name);setPeriod('1M')}}
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key==='ArrowUp'){e.preventDefault();nav(-1)}if(e.key==='ArrowDown'){e.preventDefault();nav(1)}};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[ci,filtered])
  useEffect(()=>{const el=document.getElementById('c-'+sel);if(el&&listRef.current)el.scrollIntoView({block:'nearest',behavior:'smooth'})},[sel])

  return(
    <><style>{`
      @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      .ex-list{flex:1;overflow-y:auto}
      .ex-r{display:flex;align-items:center;gap:10px;padding:8px 14px;cursor:pointer;border-left:3px solid transparent;transition:all .12s}
      .ex-r:hover{background:#FAFAFA}
      .ex-r.on{background:#FFF5F4;border-left-color:#E03020}
      .per{padding:4px 12px;border-radius:6px;border:1px solid #EBEBEB;background:#fff;color:#888;font-size:10px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .1s}
      .per:hover{border-color:#C7C7CC;color:#111}.per.on{background:#111;color:#fff;border-color:#111}
      .nb{width:28px;height:28px;border-radius:7px;border:1px solid #EBEBEB;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#888;transition:all .12s}
      .nb:hover:not(:disabled){border-color:#111;color:#111}.nb:disabled{opacity:.15;cursor:default}
      .sb{background:#F8F8FA;border-radius:8px;padding:10px 12px}
      .sv{font-size:16px;font-weight:700;font-family:var(--font-data);letter-spacing:-.5px}
      .sl{font-size:9px;color:#AAA;font-family:var(--font-display);margin-top:2px}
      .sr{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #F5F5F5;font-size:12px}.sr:last-child{border-bottom:none}
      .fc{padding:3px 8px;border-radius:5px;border:1px solid #EBEBEB;background:#fff;font-size:10px;color:#888;cursor:pointer;font-family:var(--font-display);transition:all .1s;white-space:nowrap}
      .fc:hover{border-color:#C7C7CC;color:#111}.fc.on{background:#111;color:#fff;border-color:#111}
      .fp{width:56px;padding:4px 6px;border-radius:5px;border:1px solid #EBEBEB;font-size:10px;font-family:var(--font-data);outline:none;text-align:center}.fp:focus{border-color:#E03020}.fp::placeholder{color:#CCC}
      .srt{padding:3px 8px;border-radius:5px;border:none;background:transparent;font-size:10px;color:#AAA;cursor:pointer;font-family:var(--font-display)}.srt:hover{color:#111}.srt.on{background:#111;color:#fff}
      .ft{display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:7px;border:1px solid #EBEBEB;cursor:pointer;font-size:11px;font-family:var(--font-display);color:#888;background:#fff;transition:all .12s}
      .ft:hover{border-color:#C7C7CC;color:#111}.ft.on{background:#FFF5F4;border-color:#FFD8D0;color:#E03020}
      .badge{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;border-radius:50%;background:#E03020;color:#fff;font-size:8px;font-weight:700}
      .fdrop{position:absolute;top:100%;left:0;right:0;margin-top:4px;background:#fff;border:1px solid #EBEBEB;border-radius:10px;padding:12px;box-shadow:0 8px 28px rgba(0,0,0,.08);z-index:50;animation:fadeIn .15s ease-out}
      .fg{margin-bottom:8px}.fg:last-child{margin-bottom:0}
      .fl{font-size:9px;color:#AAA;font-family:var(--font-display);font-weight:500;letter-spacing:.05em;text-transform:uppercase;margin-bottom:3px}
      .fr{display:flex;gap:3px;flex-wrap:wrap}
    `}</style>

    <div style={{display:'flex',height:'calc(100vh - 120px)',animation:'fadeIn .25s ease-out'}}>

      {/* ── LEFT ── */}
      <div style={{width:340,borderRight:'1px solid #EBEBEB',display:'flex',flexDirection:'column',flexShrink:0,background:'#fff'}}>

        {/* Search + Filters */}
        <div style={{padding:'12px 14px 0',position:'relative'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,background:'#F5F5F7',border:'1px solid #EBEBEB',borderRadius:8,padding:'7px 10px',marginBottom:8}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une carte..."
              style={{border:'none',background:'transparent',outline:'none',fontSize:12,fontFamily:'var(--font-display)',color:'#111',width:'100%'}}/>
            {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'#AAA',fontSize:14,lineHeight:1}}>{'\u00d7'}</button>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
            <button className={'ft'+(showFilters||af>0?' on':'')} onClick={()=>setShowFilters(f=>!f)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
              Filtres{af>0&&<span className="badge">{af}</span>}
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d={showFilters?"M18 15l-6-6-6 6":"M6 9l6 6 6-6"}/></svg>
            </button>
            <div style={{flex:1}}/>
            <div style={{display:'flex',gap:2}}>
              {(['vol','price','change','psa','name'] as const).map(s=>(
                <button key={s} className={'srt'+(sort===s?' on':'')} onClick={()=>setSort(s)}>
                  {s==='vol'?'Vol':s==='price'?'Prix':s==='change'?'Var.':s==='psa'?'PSA':'A-Z'}
                </button>
              ))}
            </div>
          </div>

          {/* Dropdown filters */}
          {showFilters&&(
            <div className="fdrop">
              <div className="fg">
                <div className="fl">{'\u00c9'}re</div>
                <div className="fr">{[{v:'all',l:'Toutes'},{v:'vintage',l:'Vintage (< 2003)'},{v:'modern',l:'Moderne'}].map(o=><button key={o.v} className={'fc'+(filterEra===o.v?' on':'')} onClick={()=>setFilterEra(o.v)}>{o.l}</button>)}</div>
              </div>
              <div className="fg">
                <div className="fl">S{'\u00e9'}rie</div>
                <div className="fr"><button className={'fc'+(filterSet==='all'?' on':'')} onClick={()=>setFilterSet('all')}>Toutes</button>
                  {SETS.map(st=><button key={st} className={'fc'+(filterSet===st?' on':'')} onClick={()=>setFilterSet(filterSet===st?'all':st)}>{st}</button>)}</div>
              </div>
              <div className="fg">
                <div className="fl">Raret{'\u00e9'}</div>
                <div className="fr"><button className={'fc'+(filterRarity==='all'?' on':'')} onClick={()=>setFilterRarity('all')}>Toutes</button>
                  {RARITIES.map(r=><button key={r} className={'fc'+(filterRarity===r?' on':'')} onClick={()=>setFilterRarity(filterRarity===r?'all':r)}>{r}</button>)}</div>
              </div>
              <div className="fg">
                <div className="fl">Fourchette de prix</div>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <input className="fp" placeholder="Min" value={filterPriceMin} onChange={e=>setFilterPriceMin(e.target.value.replace(/[^0-9]/g,''))}/>
                  <span style={{fontSize:10,color:'#CCC'}}>{'\u2192'}</span>
                  <input className="fp" placeholder="Max" value={filterPriceMax} onChange={e=>setFilterPriceMax(e.target.value.replace(/[^0-9]/g,''))}/>
                  <span style={{fontSize:9,color:'#BBB'}}>{'\u20ac'}</span>
                </div>
              </div>
              <div className="fg">
                <div className="fl">Tendance</div>
                <div className="fr">{[{v:'all',l:'Toutes'},{v:'hot',l:'Hot (+15%)'},{v:'up',l:'Hausse'},{v:'down',l:'Baisse'},{v:'stable',l:'Stable'}].map(o=><button key={o.v} className={'fc'+(filterTrend===o.v?' on':'')} onClick={()=>setFilterTrend(o.v)}>{o.l}</button>)}</div>
              </div>
              <div className="fg">
                <div className="fl">Gradation</div>
                <div className="fr">{[{v:'all',l:'Tous'},{v:'psa10+',l:'PSA 10 > 1k\u20ac'},{v:'premium',l:'Prime x2+'}].map(o=><button key={o.v} className={'fc'+(filterGrade===o.v?' on':'')} onClick={()=>setFilterGrade(o.v)}>{o.l}</button>)}</div>
              </div>
              {af>0&&<div style={{display:'flex',justifyContent:'flex-end',marginTop:6}}>
                <button onClick={resetF} style={{padding:'4px 10px',borderRadius:5,border:'1px solid #FFD8D0',background:'#FFF5F4',fontSize:10,color:'#E03020',cursor:'pointer',fontFamily:'var(--font-display)',fontWeight:500}}>{'\u00d7'} R{'\u00e9'}initialiser ({af})</button>
              </div>}
            </div>
          )}
        </div>

        {/* Count */}
        <div style={{padding:'4px 14px 4px',fontSize:10,color:'#BBB',fontFamily:'var(--font-display)',borderBottom:'1px solid #F5F5F5'}}>
          {filtered.length} carte{filtered.length>1?'s':''}
        </div>

        {/* List */}
        <div ref={listRef} className="ex-list">
          {filtered.map(c=>{
            const on=sel===c.name
            const sp=(HISTORIES[c.name]||[]).slice(-20)
            return(
              <div key={c.name} id={'c-'+c.name} className={'ex-r'+(on?' on':'')} onClick={()=>{setSel(c.name);setPeriod('1M')}}>
                <img src={c.img} alt="" style={{width:34,height:47,objectFit:'cover',borderRadius:5,border:on?'1.5px solid #E03020':'1px solid #F0F0F0',flexShrink:0,transition:'border .12s'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:on?600:400,color:on?'#111':'#555',fontFamily:'var(--font-display)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                  <div style={{fontSize:10,color:'#BBB',marginTop:1,display:'flex',alignItems:'center',gap:4}}>
                    {c.set}
                    <span style={{fontSize:9,color:'#CCC'}}>{'\u00b7'}</span>
                    <span style={{fontSize:9,color:'#CCC'}}>{c.rarity}</span>
                  </div>
                </div>
                <Spark data={sp} w={40} h={16}/>
                <div style={{textAlign:'right',flexShrink:0,minWidth:65}}>
                  <div style={{fontSize:13,fontWeight:600,fontFamily:'var(--font-data)',letterSpacing:'-.3px'}}>{c.price.toLocaleString('fr-FR')} {'\u20ac'}</div>
                  <div style={{fontSize:10,fontWeight:600,color:c.change>=0?'#2E9E6A':'#E03020',fontFamily:'var(--font-data)'}}>{c.change>=0?'+':''}{c.change}%</div>
                </div>
              </div>
            )
          })}
          {filtered.length===0&&<div style={{padding:30,textAlign:'center',color:'#BBB',fontSize:12}}>Aucune carte trouv{'\u00e9'}e</div>}
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div style={{flex:1,overflowY:'auto',background:'#FAFBFC'}}>
        {/* Sticky nav */}
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 20px',borderBottom:'1px solid #EBEBEB',background:'#fff',position:'sticky',top:0,zIndex:10}}>
          <button className="nb" disabled={ci<=0} onClick={()=>nav(-1)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg></button>
          <button className="nb" disabled={ci>=filtered.length-1} onClick={()=>nav(1)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg></button>
          <span style={{fontSize:10,color:'#BBB',fontFamily:'var(--font-data)'}}>{ci+1} / {filtered.length}</span>
          <div style={{flex:1}}/>
          <div style={{display:'flex',gap:3}}>
            {(['1J','1S','1M','3M','1A','3A','5A','MAX'] as Period[]).map(p=>(
              <button key={p} className={`per${period===p?' on':''}`} onClick={()=>setPeriod(p)}>{p}</button>
            ))}
          </div>
        </div>

        <div style={{padding:'20px 24px'}}>
          {/* Hero — card + info + chart inline */}
          <div style={{display:'flex',gap:20,marginBottom:16}}>
            <div style={{flexShrink:0,position:'relative'}}>
              <img src={card.img} alt="" style={{width:160,height:223,objectFit:'cover',borderRadius:12,border:'1px solid #EBEBEB',boxShadow:'0 6px 24px rgba(0,0,0,.1)'}}/>
              <div style={{position:'absolute',bottom:8,left:8,right:8,background:'rgba(0,0,0,.65)',backdropFilter:'blur(8px)',borderRadius:8,padding:'6px 10px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:10,color:'rgba(255,255,255,.7)',fontFamily:'var(--font-display)'}}>{card.rarity}</span>
                <span style={{fontSize:10,color:'rgba(255,255,255,.5)',fontFamily:'var(--font-data)'}}>{card.number}</span>
              </div>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:TC[card.type]||'#888'}}/>
                <span style={{fontSize:11,color:'#AAA',fontFamily:'var(--font-display)',textTransform:'capitalize'}}>{card.type}</span>
                <span style={{fontSize:11,color:'#DDD'}}>{'\u00b7'}</span>
                <span style={{fontSize:11,color:'#AAA',fontFamily:'var(--font-display)'}}>{card.set}</span>
              </div>
              <h2 style={{fontSize:24,fontWeight:600,fontFamily:'var(--font-display)',letterSpacing:'-.5px',margin:'0 0 12px',lineHeight:1.2}}>{card.name}</h2>
              <div style={{fontSize:38,fontWeight:700,fontFamily:'var(--font-data)',letterSpacing:'-2px',lineHeight:1}}>{cur.toLocaleString('fr-FR')} {'\u20ac'}</div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
                <span style={{fontSize:14,fontWeight:600,color:isUp?'#2E9E6A':'#E03020',fontFamily:'var(--font-data)',background:isUp?'rgba(46,158,106,.06)':'rgba(224,48,32,.06)',padding:'2px 10px',borderRadius:6}}>
                  {isUp?'\u25b2':'\u25bc'} {isUp?'+':''}{pct.toFixed(1)}%
                </span>
                <span style={{fontSize:12,color:'#AAA',fontFamily:'var(--font-data)'}}>{isUp?'+':''}{(cur-start).toLocaleString('fr-FR')} {'\u20ac'}</span>
              </div>
              {/* Mini stats under price */}
              <div style={{display:'flex',gap:16,marginTop:16}}>
                <div><div style={{fontSize:10,color:'#BBB'}}>Volume 24h</div><div style={{fontSize:14,fontWeight:600,fontFamily:'var(--font-data)'}}>{card.vol}</div></div>
                <div><div style={{fontSize:10,color:'#BBB'}}>PSA 10</div><div style={{fontSize:14,fontWeight:600,fontFamily:'var(--font-data)'}}>{card.psa10.toLocaleString('fr-FR')} {'\u20ac'}</div></div>
                <div><div style={{fontSize:10,color:'#BBB'}}>PSA 9</div><div style={{fontSize:14,fontWeight:600,fontFamily:'var(--font-data)'}}>{card.psa9.toLocaleString('fr-FR')} {'\u20ac'}</div></div>
                <div><div style={{fontSize:10,color:'#BBB'}}>Prime x10</div><div style={{fontSize:14,fontWeight:600,fontFamily:'var(--font-data)',color:'#2E9E6A'}}>+{Math.round((card.psa10/card.price-1)*100)}%</div></div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:12,padding:'16px 18px',marginBottom:16}}>
            <Chart data={data} color={isUp?'#2E9E6A':'#E03020'} period={period}/>
          </div>

          {/* Grade premium bars */}
          <div style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:12,padding:'14px 16px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:600,color:'#888',fontFamily:'var(--font-display)',marginBottom:10}}>Prime de gradation</div>
            <div style={{display:'flex',gap:16}}>
              {[{label:'Raw \u2192 PSA 10',val:card.psa10,color:'#2E9E6A'},{label:'Raw \u2192 PSA 9',val:card.psa9,color:'#EF9F27'}].map(g=>{
                const premium=Math.round((g.val/card.price-1)*100)
                return(
                  <div key={g.label} style={{flex:1}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:11,color:'#888'}}>{g.label}</span>
                      <span style={{fontSize:12,fontWeight:700,color:g.color,fontFamily:'var(--font-data)'}}>+{premium}%</span>
                    </div>
                    <div style={{height:6,background:'#F0F0F0',borderRadius:99,overflow:'hidden'}}>
                      <div style={{height:'100%',width:Math.min(premium/5,100)+'%',background:g.color,borderRadius:99,transition:'width .3s ease'}}/>
                    </div>
                    <div style={{fontSize:10,color:'#BBB',marginTop:3,fontFamily:'var(--font-data)'}}>{g.val.toLocaleString('fr-FR')} {'\u20ac'}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sales */}
          <div style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#888',fontFamily:'var(--font-display)',marginBottom:10}}>Derni{'\u00e8'}res ventes</div>
            {mockSales(card).map((s,i)=>(
              <div key={i} className="sr">
                <span style={{fontSize:10,fontWeight:600,color:s.src==='eBay'?'#378ADD':'#EF9F27',background:s.src==='eBay'?'rgba(55,138,221,.06)':'rgba(239,159,39,.06)',padding:'2px 6px',borderRadius:4,fontFamily:'var(--font-display)'}}>{s.src}</span>
                <span style={{flex:1,color:'#555',fontFamily:'var(--font-display)'}}>{s.grade}</span>
                <span style={{fontSize:10,color:'#BBB'}}>{s.lang} {'\u00b7'} {s.ago}</span>
                <span style={{fontWeight:600,fontFamily:'var(--font-data)',fontSize:13,minWidth:70,textAlign:'right'}}>{s.p.toLocaleString('fr-FR')} {'\u20ac'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
