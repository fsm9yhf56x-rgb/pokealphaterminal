'use client'

import { useState, useMemo } from 'react'

type CardItem = {
  id:        string
  name:      string
  set:       string
  year:      number
  number:    string
  rarity:    string
  type:      string
  lang:      'EN'|'JP'|'FR'
  condition: string
  graded:    boolean
  buyPrice:  number
  curPrice:  number
  qty:       number
  psa?:      number
  signal?:   'S'|'A'|'B'
  hot?:      boolean
  favorite?: boolean
}

const CARDS: CardItem[] = [
  { id:'1',  name:'Charizard Alt Art',    set:'SV151',           year:2023, number:'006', rarity:'Alt Art',     type:'fire',     lang:'EN', condition:'PSA 9',  graded:true,  buyPrice:620, curPrice:920,  qty:1, psa:312,  signal:'S', hot:true,  favorite:true  },
  { id:'2',  name:'Umbreon VMAX Alt',     set:'Evolving Skies',  year:2021, number:'215', rarity:'Alt Art',     type:'dark',     lang:'EN', condition:'Raw',    graded:false, buyPrice:540, curPrice:880,  qty:2,            signal:'A',        favorite:true  },
  { id:'3',  name:'Charizard VMAX',       set:'Champion Path',   year:2020, number:'074', rarity:'Secret Rare', type:'fire',     lang:'EN', condition:'PSA 10', graded:true,  buyPrice:280, curPrice:420,  qty:1, psa:1240,                     favorite:false },
  { id:'4',  name:'Gengar VMAX Alt',      set:'Fusion Strike',   year:2021, number:'271', rarity:'Alt Art',     type:'psychic',  lang:'EN', condition:'Raw',    graded:false, buyPrice:220, curPrice:340,  qty:1,                                favorite:false },
  { id:'5',  name:'Pikachu VMAX RR',      set:'Vivid Voltage',   year:2020, number:'188', rarity:'Secret Rare', type:'electric', lang:'JP', condition:'PSA 9',  graded:true,  buyPrice:80,  curPrice:110,  qty:3, psa:4200,                     favorite:false },
  { id:'6',  name:'Rayquaza VMAX Alt',    set:'Evolving Skies',  year:2021, number:'218', rarity:'Alt Art',     type:'electric', lang:'EN', condition:'Raw',    graded:false, buyPrice:480, curPrice:740,  qty:1,                                favorite:true  },
  { id:'7',  name:'Mewtwo V Alt',         set:'Pokemon GO',      year:2022, number:'071', rarity:'Alt Art',     type:'psychic',  lang:'JP', condition:'Raw',    graded:false, buyPrice:160, curPrice:280,  qty:2,            signal:'B',        favorite:false },
  { id:'8',  name:'Blastoise Base Set',   set:'Base Set',        year:1999, number:'002', rarity:'Holo Rare',   type:'water',    lang:'EN', condition:'PSA 9',  graded:true,  buyPrice:480, curPrice:620,  qty:1, psa:890,                      favorite:true  },
  { id:'9',  name:'Lugia Neo Genesis',    set:'Neo Genesis',     year:2000, number:'009', rarity:'Holo Rare',   type:'water',    lang:'EN', condition:'PSA 8',  graded:true,  buyPrice:320, curPrice:580,  qty:1, psa:2100,                     favorite:true  },
  { id:'10', name:'Mew ex Alt Art',       set:'SV151',           year:2023, number:'205', rarity:'Alt Art',     type:'psychic',  lang:'JP', condition:'Raw',    graded:false, buyPrice:95,  curPrice:140,  qty:4,                                favorite:false },
  { id:'11', name:'Gardevoir ex SAR',     set:'Scarlet & Violet',year:2023, number:'245', rarity:'Secret Rare', type:'psychic',  lang:'FR', condition:'Raw',    graded:false, buyPrice:60,  curPrice:95,   qty:2,                                favorite:false },
  { id:'12', name:'Miraidon ex SAR',      set:'Scarlet & Violet',year:2023, number:'254', rarity:'Secret Rare', type:'electric', lang:'FR', condition:'Raw',    graded:false, buyPrice:45,  curPrice:72,   qty:3,                                favorite:false },
]

const ENERGY: Record<string,string> = {
  fire:'#FF6B35', water:'#42A5F5', psychic:'#C855D4',
  dark:'#7E57C2', electric:'#D4A800', grass:'#3DA85A',
}
const ENERGY_GLOW: Record<string,string> = {
  fire:'rgba(255,107,53,0.3)', water:'rgba(66,165,245,0.3)', psychic:'rgba(200,85,212,0.3)',
  dark:'rgba(126,87,194,0.3)', electric:'rgba(212,168,0,0.3)', grass:'rgba(61,168,90,0.3)',
}
const RARITY_STYLE: Record<string,{bg:string;color:string;border:string;label:string}> = {
  'Alt Art':     { bg:'#FFFDE0', color:'#8B6E00', border:'#FFE87A', label:'✦ Alt Art'     },
  'Secret Rare': { bg:'#F5EAFF', color:'#7B2D8B', border:'#D8B8FF', label:'◈ Secret Rare' },
  'Ultra Rare':  { bg:'#EFF6FF', color:'#1D4ED8', border:'#BFDBFE', label:'◆ Ultra Rare'  },
  'Holo Rare':   { bg:'#F0FFF6', color:'#1A7A4A', border:'#AAEEC8', label:'◇ Holo Rare'   },
}
const LANG_STYLE: Record<string,{bg:string;color:string;border:string;flag:string}> = {
  EN:{ bg:'#FFF5F0', color:'#C84B00', border:'#FFD0B0', flag:'🇺🇸' },
  JP:{ bg:'#F0F5FF', color:'#003DAA', border:'#C0D0FF', flag:'🇯🇵' },
  FR:{ bg:'#F0FFF5', color:'#00660A', border:'#A0DDAA', flag:'🇫🇷' },
}

type SortKey  = 'roi'|'curPrice'|'gain'|'name'|'year'|'favorite'
type ViewMode = 'showcase'|'grid'|'binder'|'table'
type GroupBy  = 'none'|'set'|'lang'|'rarity'|'type'

const ALL_SETS     = [...new Set(CARDS.map(c=>c.set))]
const ALL_YEARS    = [...new Set(CARDS.map(c=>c.year))].sort((a,b)=>b-a)
const ALL_RARITIES = [...new Set(CARDS.map(c=>c.rarity))]

function GroupHeader({ groupKey, cards, groupBy, collapsed, onToggle }: {
  groupKey:string; cards:CardItem[]; groupBy:string; collapsed:boolean; onToggle:()=>void
}) {
  const totalV = cards.reduce((s,c)=>s+c.curPrice*c.qty,0)
  const totalB = cards.reduce((s,c)=>s+c.buyPrice*c.qty,0)
  const roi    = totalB>0 ? Math.round((totalV-totalB)/totalB*100) : 0
  const accent = groupBy==='lang'
    ? (groupKey==='JP'?'#003DAA':groupKey==='FR'?'#00660A':'#C84B00')
    : groupBy==='type'
    ? ({fire:'#FF6B35',water:'#42A5F5',psychic:'#C855D4',dark:'#7E57C2',electric:'#D4A800',grass:'#3DA85A'} as Record<string,string>)[groupKey.toLowerCase()]??'#888'
    : '#E03020'
  const flag = groupBy==='lang'
    ? (groupKey==='JP'?'🇯🇵':groupKey==='FR'?'🇫🇷':'🇺🇸')
    : groupBy==='type'
    ? ({fire:'🔥',water:'💧',psychic:'🔮',dark:'🌑',electric:'⚡',grass:'🌿'} as Record<string,string>)[groupKey.toLowerCase()]??'◆'
    : '◆'
  return (
    <div onClick={onToggle} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', background:'#FAFAFA', border:'1px solid #EBEBEB', borderRadius:'10px', cursor:'pointer', marginBottom:'12px', userSelect:'none' as const }}>
      <div style={{ width:'4px', height:'22px', borderRadius:'2px', background:accent, flexShrink:0 }} />
      <span style={{ fontSize:'12px' }}>{flag}</span>
      <span style={{ fontSize:'13px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', flex:1 }}>{groupKey}</span>
      <div style={{ display:'flex', gap:'14px', alignItems:'center' }}>
        <span style={{ fontSize:'11px', color:'#888', fontFamily:'var(--font-display)' }}>{cards.length} cartes</span>
        <span style={{ fontSize:'12px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)' }}>€ {totalV.toLocaleString('fr-FR')}</span>
        <span style={{ fontSize:'12px', fontWeight:700, color:roi>=0?'#2E9E6A':'#E03020', fontFamily:'var(--font-display)', minWidth:'40px', textAlign:'right' as const }}>{roi>=0?'+':''}{roi}%</span>
        <span style={{ fontSize:'11px', color:'#BBB' }}>{collapsed?'▶':'▼'}</span>
      </div>
    </div>
  )
}

export function Holdings() {
  const [view,          setView]          = useState<ViewMode>('showcase')
  const [sort,          setSort]          = useState<SortKey>('roi')
  const [search,        setSearch]        = useState('')
  const [filSet,        setFilSet]        = useState('all')
  const [filYear,       setFilYear]       = useState('all')
  const [filLang,       setFilLang]       = useState('all')
  const [filRarity,     setFilRarity]     = useState('all')
  const [filType,       setFilType]       = useState('all')
  const [filGraded,     setFilGraded]     = useState('all')
  const [filPerf,       setFilPerf]       = useState('all')
  const [filValue,      setFilValue]      = useState('all')
  const [filSignal,     setFilSignal]     = useState('all')
  const [filtersOpen,   setFiltersOpen]   = useState(false)
  const [groupBy,       setGroupBy]       = useState<GroupBy>('none')
  const [collapsed,     setCollapsed]     = useState<Set<string>>(new Set())
  const [binderCols,    setBinderCols]    = useState(3)
  const [binderPage,    setBinderPage]    = useState(0)
  const [binderAnimating,setBinderAnimating] = useState<string|null>(null)
  const [favorites,     setFavorites]     = useState<Set<string>>(new Set(CARDS.filter(c=>c.favorite).map(c=>c.id)))
  const [selected,      setSelected]      = useState<string|null>(null)

  const toggleGroup = (key:string) => setCollapsed(prev=>{const n=new Set(prev);n.has(key)?n.delete(key):n.add(key);return n})

  const filtered = useMemo(()=> CARDS
    .filter(c=>filSet==='all'||c.set===filSet)
    .filter(c=>filYear==='all'||(filYear==='vintage'?c.year<2000:String(c.year)===filYear))
    .filter(c=>filLang==='all'||c.lang===filLang)
    .filter(c=>filRarity==='all'||c.rarity===filRarity)
    .filter(c=>filType==='all'||c.type===filType)
    .filter(c=>filGraded==='all'||(filGraded==='graded'?c.graded:!c.graded))
    .filter(c=>filSignal==='all'||(filSignal==='active'?!!c.signal:false))
    .filter(c=>{
      if(filPerf==='all') return true
      const r=(c.curPrice-c.buyPrice)/c.buyPrice
      if(filPerf==='hot') return r>0.3
      if(filPerf==='up')  return r>0
      if(filPerf==='down')return r<0
      return true
    })
    .filter(c=>{
      if(filValue==='all') return true
      const v=c.curPrice*c.qty
      if(filValue==='lt100')   return v<100
      if(filValue==='100-500') return v>=100&&v<500
      if(filValue==='500-1k')  return v>=500&&v<1000
      if(filValue==='gt1k')    return v>=1000
      return true
    })
    .filter(c=>!search||c.name.toLowerCase().includes(search.toLowerCase())||c.set.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>{
      if(sort==='favorite') return (favorites.has(b.id)?1:0)-(favorites.has(a.id)?1:0)
      if(sort==='roi')      return ((b.curPrice-b.buyPrice)/b.buyPrice)-((a.curPrice-a.buyPrice)/a.buyPrice)
      if(sort==='curPrice') return b.curPrice*b.qty-a.curPrice*a.qty
      if(sort==='gain')     return (b.curPrice-b.buyPrice)*b.qty-(a.curPrice-a.buyPrice)*a.qty
      if(sort==='year')     return a.year-b.year
      return a.name.localeCompare(b.name)
    })
  ,[sort,search,filSet,filYear,filLang,filRarity,filType,filGraded,filPerf,filValue,filSignal,favorites])

  const totalBuy  = CARDS.reduce((s,c)=>s+c.buyPrice*c.qty,0)
  const totalCur  = CARDS.reduce((s,c)=>s+c.curPrice*c.qty,0)
  const totalGain = totalCur-totalBuy
  const totalROI  = Math.round((totalGain/totalBuy)*100)
  const bestCard  = [...CARDS].sort((a,b)=>((b.curPrice-b.buyPrice)/b.buyPrice)-((a.curPrice-a.buyPrice)/a.buyPrice))[0]
  const favCount  = favorites.size
  const activeFilters=[filSet,filYear,filLang,filRarity,filType,filGraded,filPerf,filValue,filSignal].filter(f=>f!=='all').length

  const grouped = useMemo(()=>{
    if(groupBy==='none') return null
    const groups=new Map<string,CardItem[]>()
    filtered.forEach(card=>{
      let key=''
      if(groupBy==='set')    key=card.set
      if(groupBy==='lang')   key=card.lang
      if(groupBy==='rarity') key=card.rarity
      if(groupBy==='type')   key=card.type.charAt(0).toUpperCase()+card.type.slice(1)
      if(!groups.has(key)) groups.set(key,[])
      groups.get(key)!.push(card)
    })
    return groups
  },[filtered,groupBy])

  const resetFilters=()=>{setFilSet('all');setFilYear('all');setFilLang('all');setFilRarity('all');setFilType('all');setFilGraded('all');setFilPerf('all');setFilValue('all');setFilSignal('all')}
  const toggleFav=(id:string,e:React.MouseEvent)=>{e.stopPropagation();setFavorites(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})}

  const CardArt=({card,size='md'}:{card:CardItem;size?:'sm'|'md'|'lg'})=>{
    const ec=ENERGY[card.type]??'#888'
    const h=size==='lg'?120:size==='md'?86:60
    return(
      <div style={{width:'100%',height:`${h}px`,borderRadius:'10px',background:`linear-gradient(145deg,${ec}20,${ec}08)`,border:`1.5px solid ${ec}28`,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',flexShrink:0}}>
        <div style={{position:'absolute',width:'60%',height:'60%',borderRadius:'50%',background:ENERGY_GLOW[card.type]??'rgba(0,0,0,0)',filter:'blur(16px)'}}/>
        <div style={{width:size==='lg'?'44px':size==='md'?'34px':'24px',height:size==='lg'?'44px':size==='md'?'34px':'24px',borderRadius:'50%',background:ec,opacity:0.35,zIndex:1}}/>
        {card.signal&&<div style={{position:'absolute',top:'6px',right:'6px',fontSize:'8px',fontWeight:700,background:card.signal==='S'?'linear-gradient(135deg,#FFD700,#FF8C00)':card.signal==='A'?'#C855D4':'#2E9E6A',color:'#fff',padding:'2px 6px',borderRadius:'4px',fontFamily:'var(--font-display)',zIndex:2}}>{card.signal}</div>}
        <button onClick={e=>toggleFav(card.id,e)} style={{position:'absolute',top:'6px',left:'6px',background:'none',border:'none',cursor:'pointer',fontSize:'13px',padding:0,zIndex:2,lineHeight:1}}>{favorites.has(card.id)?'❤️':'🤍'}</button>
        <div style={{position:'absolute',bottom:'5px',left:'6px',fontSize:'8px',fontWeight:700,background:LANG_STYLE[card.lang].bg,color:LANG_STYLE[card.lang].color,border:`1px solid ${LANG_STYLE[card.lang].border}`,padding:'1px 5px',borderRadius:'3px',fontFamily:'var(--font-display)',zIndex:2}}>{LANG_STYLE[card.lang].flag} {card.lang}</div>
        {card.graded&&<div style={{position:'absolute',bottom:'5px',right:'6px',fontSize:'8px',fontWeight:700,background:'#111',color:'#fff',padding:'1px 5px',borderRadius:'3px',fontFamily:'var(--font-display)',zIndex:2}}>{card.condition}</div>}
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cardIn  { from{opacity:0;transform:scale(0.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes holoShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes slideIntoSlot { 0%{transform:translateY(-160px) rotate(-10deg) scale(1.2);opacity:.85} 55%{transform:translateY(14px) rotate(1.5deg) scale(1.03);opacity:1} 75%{transform:translateY(-5px) rotate(-0.5deg) scale(1)} 100%{transform:translateY(0) rotate(0deg) scale(1)} }
        .ch:hover          { transform:translateY(-5px) !important; box-shadow:0 14px 32px rgba(0,0,0,0.13) !important; }
        .rh:hover          { background:#F8F8F8 !important; cursor:pointer; }
        .pill.act          { background:#111 !important; color:#fff !important; border-color:#111 !important; }
        .srt.act           { background:#111 !important; color:#fff !important; }
        .binder-slot:hover { transform:translateY(-5px) scale(1.04) !important; }
        .binder-slide      { animation:slideIntoSlot .55s cubic-bezier(.23,1,.32,1) both !important; }
      `}</style>

      <div style={{animation:'fadeIn 0.25s ease-out',width:'100%'}}>

        {/* ── HERO ─────────────────────────────────── */}
        <div style={{background:'linear-gradient(135deg,#111 0%,#1C1208 100%)',borderRadius:'20px',padding:'28px 32px',marginBottom:'20px',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 80% 50%, rgba(255,107,53,0.12) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(66,165,245,0.08) 0%, transparent 50%)',pointerEvents:'none'}}/>
          <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'20px'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
                <div style={{width:'44px',height:'44px',borderRadius:'12px',background:'linear-gradient(135deg,#FFD700,#FF8C00)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',boxShadow:'0 4px 14px rgba(255,160,0,0.4)'}}>🏆</div>
                <div>
                  <div style={{fontSize:'18px',fontWeight:700,color:'#fff',fontFamily:'var(--font-display)',letterSpacing:'-0.3px',lineHeight:1}}>Ma Collection</div>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',fontFamily:'var(--font-display)',marginTop:'2px',letterSpacing:'0.05em'}}>POKÉ ALPHA TERMINAL</div>
                </div>
              </div>
              <div style={{display:'flex',gap:'14px',alignItems:'center',flexWrap:'wrap'}}>
                <div>
                  <div style={{fontSize:'36px',fontWeight:700,color:'#fff',fontFamily:'var(--font-display)',letterSpacing:'-1.5px',lineHeight:1}}>€ {totalCur.toLocaleString('fr-FR')}</div>
                  <div style={{fontSize:'12px',color:'#4ECCA3',fontWeight:600,fontFamily:'var(--font-display)',marginTop:'3px'}}>▲ +{totalROI}% ROI · +€ {totalGain.toLocaleString('fr-FR')} gain total</div>
                </div>
                <div style={{height:'40px',width:'1px',background:'rgba(255,255,255,0.1)'}}/>
                <div style={{display:'flex',gap:'16px'}}>
                  {[{label:'Cartes',value:String(CARDS.length)},{label:'Exemplaires',value:String(CARDS.reduce((s,c)=>s+c.qty,0))},{label:'Favoris',value:String(favCount)}].map(s=>(
                    <div key={s.label}>
                      <div style={{fontSize:'20px',fontWeight:700,color:'rgba(255,255,255,0.9)',fontFamily:'var(--font-display)',lineHeight:1}}>{s.value}</div>
                      <div style={{fontSize:'10px',color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.07em',marginTop:'3px',fontFamily:'var(--font-display)'}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'12px'}}>
              <div style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'10px 14px',display:'flex',alignItems:'center',gap:'10px'}}>
                <div>
                  <div style={{fontSize:'9px',color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.08em',fontFamily:'var(--font-display)',marginBottom:'3px'}}>Meilleure perf.</div>
                  <div style={{fontSize:'13px',fontWeight:600,color:'#fff',fontFamily:'var(--font-display)'}}>{bestCard.name}</div>
                  <div style={{fontSize:'11px',color:'#FFD700',fontWeight:600,fontFamily:'var(--font-display)',marginTop:'1px'}}>+{Math.round(((bestCard.curPrice-bestCard.buyPrice)/bestCard.buyPrice)*100)}% ROI</div>
                </div>
                <div style={{width:'40px',height:'54px',borderRadius:'7px',background:`linear-gradient(145deg,${ENERGY[bestCard.type]??'#888'}30,${ENERGY[bestCard.type]??'#888'}10)`,border:`1.5px solid ${ENERGY[bestCard.type]??'#888'}40`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <div style={{width:'16px',height:'16px',borderRadius:'50%',background:ENERGY[bestCard.type]??'#888',opacity:0.5}}/>
                </div>
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <button style={{padding:'8px 16px',borderRadius:'9px',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.7)',border:'1px solid rgba(255,255,255,0.12)',fontSize:'12px',cursor:'pointer',fontFamily:'var(--font-display)',fontWeight:500}}>📸 Screenshot</button>
                <button style={{padding:'8px 18px',borderRadius:'9px',background:'linear-gradient(135deg,#E03020,#FF4433)',color:'#fff',border:'none',fontSize:'12px',cursor:'pointer',fontFamily:'var(--font-display)',fontWeight:700,boxShadow:'0 4px 14px rgba(224,48,32,0.4)'}}>🔗 Partager</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── CONTRÔLES ─────────────────────────────── */}
        <div style={{display:'flex',gap:'10px',marginBottom:'14px',alignItems:'center',flexWrap:'wrap'}}>
          <div style={{position:'relative',flex:1,minWidth:'200px'}}>
            <span style={{position:'absolute',left:'11px',top:'50%',transform:'translateY(-50%)',color:'#CCC',fontSize:'15px',pointerEvents:'none'}}>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." style={{width:'100%',height:'38px',padding:'0 12px 0 32px',border:'1px solid #EBEBEB',borderRadius:'9px',fontSize:'13px',color:'#111',outline:'none',background:'#fff',fontFamily:'var(--font-sans)',boxSizing:'border-box' as const}}/>
          </div>
          <button onClick={()=>setFiltersOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:'7px',height:'38px',padding:'0 16px',borderRadius:'9px',border:'1px solid #EBEBEB',background:filtersOpen?'#111':'#fff',color:filtersOpen?'#fff':'#444',fontSize:'13px',fontFamily:'var(--font-display)',fontWeight:500,cursor:'pointer',transition:'all 0.15s',flexShrink:0}}>
            <span>Filtres</span>
            {activeFilters>0&&<span style={{background:filtersOpen?'rgba(255,255,255,0.25)':'#E03020',color:'#fff',fontSize:'10px',fontWeight:700,padding:'1px 6px',borderRadius:'99px'}}>{activeFilters}</span>}
          </button>
          {activeFilters>0&&<button onClick={resetFilters} style={{height:'38px',padding:'0 14px',borderRadius:'9px',border:'1px solid #EBEBEB',background:'#fff',color:'#888',fontSize:'12px',cursor:'pointer',fontFamily:'var(--font-display)',flexShrink:0}}>Effacer</button>}
          <div style={{display:'flex',gap:'3px',background:'#F5F5F5',borderRadius:'9px',padding:'3px',flexShrink:0}}>
            {([['roi','ROI'],['curPrice','Valeur'],['gain','Gain'],['favorite','❤️'],['year','Année'],['name','A–Z']] as [SortKey,string][]).map(([k,l])=>(
              <button key={k} onClick={()=>setSort(k)} className={`srt${sort===k?' act':''}`} style={{padding:'5px 11px',borderRadius:'6px',border:'none',background:sort===k?'#111':'transparent',color:sort===k?'#fff':'#666',fontSize:'11px',fontWeight:500,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all 0.12s'}}>{l}</button>
            ))}
          </div>
          <div style={{display:'flex',background:'#F5F5F5',borderRadius:'9px',padding:'3px',gap:'2px',flexShrink:0}}>
            {([['showcase','◈','Showcase'],['grid','⊞','Grille'],['binder','⊡','Binder'],['table','☰','Tableau']] as [ViewMode,string,string][]).map(([v,icon,tip])=>(
              <button key={v} title={tip} onClick={()=>setView(v)} style={{width:'36px',height:'32px',borderRadius:'7px',border:'none',background:view===v?'#111':'transparent',color:view===v?'#fff':'#888',fontSize:'15px',cursor:'pointer',transition:'all 0.12s',display:'flex',alignItems:'center',justifyContent:'center'}}>{icon}</button>
            ))}
          </div>
          <button style={{height:'38px',padding:'0 18px',background:'#111',color:'#fff',border:'none',borderRadius:'9px',fontSize:'13px',fontWeight:500,cursor:'pointer',fontFamily:'var(--font-display)',flexShrink:0}}>+ Ajouter</button>
        </div>

        {/* ── FILTRES ───────────────────────────────── */}
        {filtersOpen&&(
          <div style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:'14px',padding:'18px 20px',marginBottom:'16px',display:'flex',flexDirection:'column',gap:'16px',animation:'fadeIn 0.15s ease-out'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'12px'}}>
              {[
                {label:'Set',val:filSet,fn:setFilSet,opts:[{v:'all',l:'Tous les sets'},...ALL_SETS.map(s=>({v:s,l:s}))]},
                {label:'Année',val:filYear,fn:setFilYear,opts:[{v:'all',l:'Toutes'},{v:'vintage',l:'Vintage (< 2000)'},...ALL_YEARS.map(y=>({v:String(y),l:String(y)}))]},
                {label:'Performance',val:filPerf,fn:setFilPerf,opts:[{v:'all',l:'Toutes'},{v:'hot',l:'🔥 Forte hausse'},{v:'up',l:'▲ En hausse'},{v:'down',l:'▼ En baisse'}]},
                {label:'Valeur',val:filValue,fn:setFilValue,opts:[{v:'all',l:'Toutes'},{v:'lt100',l:'< € 100'},{v:'100-500',l:'€ 100–500'},{v:'500-1k',l:'€ 500–1k'},{v:'gt1k',l:'> € 1 000'}]},
              ].map(({label,val,fn,opts})=>(
                <div key={label}>
                  <div style={{fontSize:'10px',fontWeight:700,color:'#888',textTransform:'uppercase' as const,letterSpacing:'0.08em',fontFamily:'var(--font-display)',marginBottom:'6px'}}>{label}</div>
                  <select value={val} onChange={e=>fn(e.target.value)} style={{width:'100%',height:'34px',padding:'0 10px',border:'1px solid #EBEBEB',borderRadius:'7px',fontSize:'12px',color:'#111',outline:'none',background:'#fff',cursor:'pointer'}}>
                    {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{height:'1px',background:'#F0F0F0'}}/>
            <div style={{display:'flex',flexWrap:'wrap',gap:'16px'}}>
              {[
                {label:'Langue',val:filLang,fn:setFilLang,opts:[{v:'all',l:'Toutes'},{v:'EN',l:'🇺🇸 EN'},{v:'JP',l:'🇯🇵 JP'},{v:'FR',l:'🇫🇷 FR'}]},
                {label:'Rareté',val:filRarity,fn:setFilRarity,opts:[{v:'all',l:'Toutes'},...ALL_RARITIES.map(r=>({v:r,l:r}))]},
                {label:'Condition',val:filGraded,fn:setFilGraded,opts:[{v:'all',l:'Toutes'},{v:'graded',l:'Gradée'},{v:'raw',l:'Raw'}]},
                {label:'Signal',val:filSignal,fn:setFilSignal,opts:[{v:'all',l:'Tous'},{v:'active',l:'⚡ Signal actif'}]},
              ].map(({label,val,fn,opts})=>(
                <div key={label}>
                  <div style={{fontSize:'10px',fontWeight:700,color:'#888',textTransform:'uppercase' as const,letterSpacing:'0.08em',fontFamily:'var(--font-display)',marginBottom:'7px'}}>{label}</div>
                  <div style={{display:'flex',gap:'5px',flexWrap:'wrap' as const}}>
                    {opts.map(o=>(
                      <button key={o.v} onClick={()=>fn(o.v)} className={`pill${val===o.v?' act':''}`} style={{padding:'5px 12px',borderRadius:'7px',border:'1px solid #E8E8E8',background:val===o.v?'#111':'#fff',color:val===o.v?'#fff':'#555',fontSize:'12px',fontWeight:500,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all 0.12s',whiteSpace:'nowrap' as const}}>{o.l}</button>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <div style={{fontSize:'10px',fontWeight:700,color:'#888',textTransform:'uppercase' as const,letterSpacing:'0.08em',fontFamily:'var(--font-display)',marginBottom:'7px'}}>Type</div>
                <div style={{display:'flex',gap:'5px',flexWrap:'wrap' as const}}>
                  {[{v:'all',l:'Tous',c:'#555'},{v:'fire',l:'🔥',c:ENERGY.fire},{v:'water',l:'💧',c:ENERGY.water},{v:'psychic',l:'🔮',c:ENERGY.psychic},{v:'dark',l:'🌑',c:ENERGY.dark},{v:'electric',l:'⚡',c:ENERGY.electric},{v:'grass',l:'🌿',c:ENERGY.grass}].map(o=>(
                    <button key={o.v} onClick={()=>setFilType(o.v)} className={`pill${filType===o.v?' act':''}`} style={{padding:'5px 10px',borderRadius:'7px',border:`1px solid ${filType===o.v?'#111':'#E8E8E8'}`,background:filType===o.v?'#111':'#fff',color:filType===o.v?'#fff':o.c,fontSize:o.v==='all'?'12px':'14px',fontWeight:500,cursor:'pointer',transition:'all 0.12s'}}>{o.l}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── COMPTE + GROUPBY ─────────────────────── */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
          <div style={{fontSize:'12px',color:'#888',fontFamily:'var(--font-display)'}}>
            <span style={{fontWeight:600,color:'#111'}}>{filtered.length}</span> cartes &nbsp;·&nbsp;
            <span style={{fontWeight:600,color:'#111'}}>{filtered.reduce((s,c)=>s+c.qty,0)}</span> exemplaires &nbsp;·&nbsp;
            <span style={{fontWeight:600,color:'#2E9E6A'}}>€ {filtered.reduce((s,c)=>s+c.curPrice*c.qty,0).toLocaleString('fr-FR')}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <span style={{fontSize:'11px',color:'#AAA',fontFamily:'var(--font-display)',fontWeight:500}}>Classer par</span>
            <div style={{display:'flex',gap:'4px',background:'#F5F5F5',borderRadius:'9px',padding:'3px'}}>
              {([['none','Aucun'],['set','Set'],['lang','Langue'],['rarity','Rareté'],['type','Type']] as [GroupBy,string][]).map(([k,l])=>(
                <button key={k} onClick={()=>setGroupBy(k)} style={{padding:'4px 11px',borderRadius:'6px',border:'none',background:groupBy===k?'#111':'transparent',color:groupBy===k?'#fff':'#666',fontSize:'11px',fontWeight:500,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all 0.12s'}}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── VUE SHOWCASE ─────────────────────────── */}
        {view==='showcase'&&(
          <div>
            {(grouped?Array.from(grouped.entries()):[['',filtered] as [string,CardItem[]]]).map(([gk,gc])=>(
              <div key={gk}>
                {gk&&<GroupHeader groupKey={gk} cards={gc} groupBy={groupBy} collapsed={collapsed.has(gk)} onToggle={()=>toggleGroup(gk)}/>}
                {!collapsed.has(gk)&&(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'16px',marginBottom:gk?'24px':0}}>
                    {gc.map((card,idx)=>{
                      const roi=Math.round(((card.curPrice-card.buyPrice)/card.buyPrice)*100)
                      const rs=RARITY_STYLE[card.rarity]
                      const ec=ENERGY[card.type]??'#888'
                      return(
                        <div key={card.id} className="ch" onClick={()=>setSelected(selected===card.id?null:card.id)} style={{background:'#fff',border:`1px solid ${selected===card.id?ec:'#EBEBEB'}`,borderRadius:'16px',overflow:'hidden',boxShadow:selected===card.id?`0 8px 28px ${ENERGY_GLOW[card.type]??'rgba(0,0,0,0.1)'}`:'0 2px 10px rgba(0,0,0,0.05)',transition:'all 0.22s cubic-bezier(0.34,1.2,0.64,1)',cursor:'pointer',animation:`cardIn 0.25s ${Math.min(idx,10)*0.03}s ease-out both`}}>
                          <div style={{height:'3px',background:`linear-gradient(90deg,${ec},${ec}66)`}}/>
                          <div style={{padding:'14px'}}>
                            <CardArt card={card} size="md"/>
                            <div style={{marginTop:'12px'}}>
                              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'6px',marginBottom:'5px'}}>
                                <div style={{fontSize:'14px',fontWeight:600,color:'#111',fontFamily:'var(--font-display)',lineHeight:1.25,flex:1}}>{card.name}</div>
                                {favorites.has(card.id)&&<span style={{fontSize:'12px',flexShrink:0}}>❤️</span>}
                              </div>
                              <div style={{fontSize:'11px',color:'#AAA',marginBottom:'9px'}}>{card.set} · {card.year}</div>
                              {rs&&<div style={{marginBottom:'10px'}}><span style={{fontSize:'9px',background:rs.bg,color:rs.color,border:`1px solid ${rs.border}`,padding:'2px 7px',borderRadius:'4px',fontWeight:600,fontFamily:'var(--font-display)'}}>{rs.label}</span></div>}
                              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                                <div>
                                  <div style={{fontSize:'18px',fontWeight:700,color:'#111',fontFamily:'var(--font-display)',letterSpacing:'-0.5px',lineHeight:1}}>€ {card.curPrice.toLocaleString('fr-FR')}</div>
                                  <div style={{fontSize:'10px',color:'#CCC',marginTop:'2px'}}>Achat € {card.buyPrice.toLocaleString('fr-FR')}</div>
                                </div>
                                <div style={{textAlign:'right'}}>
                                  <div style={{fontSize:'15px',fontWeight:700,color:roi>=0?'#2E9E6A':'#E03020',fontFamily:'var(--font-display)'}}>{roi>=0?'+':''}{roi}%</div>
                                  <div style={{fontSize:'10px',color:roi>=0?'#2E9E6A':'#E03020',opacity:0.7}}>{roi>=0?'+':''}€ {Math.abs(card.curPrice-card.buyPrice)}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          {selected===card.id&&(
                            <div style={{borderTop:`1px solid ${ec}22`,background:`${ec}06`,padding:'12px 14px',display:'flex',flexDirection:'column',gap:'6px'}}>
                              {card.psa&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'11px'}}><span style={{color:'#888'}}>PSA Pop</span><span style={{fontWeight:600,color:'#111',fontFamily:'var(--font-display)'}}>{card.psa.toLocaleString()}</span></div>}
                              <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px'}}><span style={{color:'#888'}}>Gain €</span><span style={{fontWeight:600,color:roi>=0?'#2E9E6A':'#E03020',fontFamily:'var(--font-display)'}}>{roi>=0?'+':''}€ {Math.abs((card.curPrice-card.buyPrice)*card.qty).toLocaleString('fr-FR')}</span></div>
                              <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px'}}><span style={{color:'#888'}}>Quantité</span><span style={{fontWeight:600,color:'#111',fontFamily:'var(--font-display)'}}>×{card.qty}</span></div>
                              <div style={{display:'flex',gap:'6px',marginTop:'4px'}}>
                                <button onClick={()=>window.location.href='/alpha'} style={{flex:1,padding:'7px',borderRadius:'7px',background:'#111',color:'#fff',border:'none',fontSize:'11px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)'}}>Voir signal</button>
                                <button onClick={e=>{e.stopPropagation();setSelected(null)}} style={{padding:'7px 12px',borderRadius:'7px',background:'transparent',color:'#888',border:'1px solid #E8E8E8',fontSize:'11px',cursor:'pointer'}}>×</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── VUE GRID ──────────────────────────────── */}
        {view==='grid'&&(
          <div>
            {(grouped?Array.from(grouped.entries()):[['',filtered] as [string,CardItem[]]]).map(([gk,gc])=>(
              <div key={gk}>
                {gk&&<GroupHeader groupKey={gk} cards={gc} groupBy={groupBy} collapsed={collapsed.has(gk)} onToggle={()=>toggleGroup(gk)}/>}
                {!collapsed.has(gk)&&(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'12px',marginBottom:gk?'24px':0}}>
                    {gc.map((card,idx)=>{
                      const roi=Math.round(((card.curPrice-card.buyPrice)/card.buyPrice)*100)
                      const rs=RARITY_STYLE[card.rarity]
                      const ec=ENERGY[card.type]??'#888'
                      return(
                        <div key={card.id} className="ch" style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:'12px',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',transition:'all 0.18s',cursor:'pointer',animation:`cardIn 0.2s ${Math.min(idx,10)*0.02}s ease-out both`}}>
                          <div style={{height:'2px',background:ec}}/>
                          <div style={{padding:'10px'}}>
                            <CardArt card={card} size="sm"/>
                            <div style={{marginTop:'9px'}}>
                              <div style={{fontSize:'12px',fontWeight:600,color:'#111',fontFamily:'var(--font-display)',marginBottom:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{card.name}</div>
                              <div style={{fontSize:'9px',color:'#CCC',marginBottom:'7px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{card.set}</div>
                              {rs&&<span style={{fontSize:'8px',background:rs.bg,color:rs.color,border:`1px solid ${rs.border}`,padding:'1px 5px',borderRadius:'3px',fontWeight:500,fontFamily:'var(--font-display)'}}>{card.rarity}</span>}
                              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'8px'}}>
                                <span style={{fontSize:'14px',fontWeight:700,color:'#111',fontFamily:'var(--font-display)',letterSpacing:'-0.3px'}}>€ {card.curPrice}</span>
                                <span style={{fontSize:'11px',fontWeight:700,color:roi>=0?'#2E9E6A':'#E03020'}}>{roi>=0?'+':''}{roi}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── VUE BINDER PREMIUM ───────────────────── */}
        {view==='binder'&&(()=>{
          const HOLO=['Alt Art','Secret Rare','Gold Star','Promo']
          const TIER_BG: Record<string,string>={S:'linear-gradient(135deg,#FFD700,#FF8C00)',A:'linear-gradient(135deg,#C855D4,#9C27B0)',B:'linear-gradient(135deg,#2E9E6A,#1A7A4A)'}
          const slotsPer   =binderCols*3
          const binderTotal=filtered.length
          const binderPages=Math.max(1,Math.ceil(binderTotal/slotsPer))
          const bStart     =binderPage*slotsPer
          const pageCards  =filtered.slice(bStart,bStart+slotsPer)
          const emptyCount =slotsPer-pageCards.length
          return(
            <div style={{background:'linear-gradient(160deg,#1C1008 0%,#130C05 50%,#1C1008 100%)',borderRadius:'20px',boxShadow:'0 24px 60px rgba(0,0,0,.55),0 4px 12px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.05)',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.018) 39px,rgba(255,255,255,.018) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.018) 39px,rgba(255,255,255,.018) 40px)',pointerEvents:'none'}}/>
              <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(ellipse at 20% 30%,rgba(255,107,53,.06) 0%,transparent 45%),radial-gradient(ellipse at 80% 70%,rgba(126,87,194,.06) 0%,transparent 45%)',pointerEvents:'none'}}/>
              <div style={{position:'relative',padding:'22px 22px 18px'}}>
                {/* Header */}
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'18px'}}>
                  <div>
                    <div style={{fontSize:'10px',color:'rgba(255,255,255,.22)',textTransform:'uppercase' as const,letterSpacing:'.12em',fontFamily:'var(--font-display)'}}>Collection privée</div>
                    <div style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,.7)',fontFamily:'var(--font-display)',marginTop:'3px'}}>Ma Collection · PokéAlpha</div>
                    <div style={{fontSize:'11px',color:'rgba(255,255,255,.3)',marginTop:'4px'}}>{binderTotal} cartes · page {binderPage+1}/{binderPages}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'8px'}}>
                    <div style={{display:'flex',gap:'4px'}}>
                      {[3,4,5].map(n=>(
                        <button key={n} onClick={()=>{setBinderCols(n);setBinderPage(0)}} style={{width:'28px',height:'28px',borderRadius:'7px',border:`1px solid ${binderCols===n?'rgba(255,255,255,.3)':'rgba(255,255,255,.08)'}`,background:binderCols===n?'rgba(255,255,255,.12)':'transparent',color:binderCols===n?'#fff':'rgba(255,255,255,.35)',cursor:'pointer',fontSize:'11px',fontWeight:500,fontFamily:'var(--font-display)',transition:'all .15s'}}>{n}</button>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                      <button onClick={()=>setBinderPage(p=>Math.max(0,p-1))} disabled={binderPage===0} style={{width:'28px',height:'28px',borderRadius:'7px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:binderPage===0?'rgba(255,255,255,.2)':'rgba(255,255,255,.55)',cursor:binderPage===0?'default':'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
                      <span style={{fontSize:'10px',color:'rgba(255,255,255,.3)',minWidth:'36px',textAlign:'center',fontFamily:'var(--font-display)'}}>{binderPage+1} / {binderPages}</span>
                      <button onClick={()=>setBinderPage(p=>Math.min(binderPages-1,p+1))} disabled={binderPage>=binderPages-1} style={{width:'28px',height:'28px',borderRadius:'7px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:binderPage>=binderPages-1?'rgba(255,255,255,.2)':'rgba(255,255,255,.55)',cursor:binderPage>=binderPages-1?'default':'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
                    </div>
                  </div>
                </div>

                {/* Grille pochettes */}
                <div style={{display:'grid',gridTemplateColumns:`repeat(${binderCols},1fr)`,gap:'10px'}}>
                  {pageCards.map((card,idx)=>{
                    const ec    =ENERGY[card.type]??'#888'
                    const eg    =ENERGY_GLOW[card.type]??'rgba(128,128,128,.4)'
                    const roi   =Math.round(((card.curPrice-card.buyPrice)/card.buyPrice)*100)
                    const isHolo=HOLO.includes(card.rarity)
                    const orbSz =binderCols<=3?'36px':binderCols===4?'28px':'24px'
                    const fsSm  =binderCols<=3?'10px':binderCols===4?'9px':'8px'
                    const fsPr  =binderCols<=3?'12px':'11px'
                    return(
                      <div
                        key={card.id}
                        className={`binder-slot${binderAnimating===card.id?' binder-slide':''}`}
                        onClick={()=>setSelected(selected===card.id?null:card.id)}
                        style={{aspectRatio:'2/3',borderRadius:'9px',position:'relative',overflow:'hidden',cursor:'pointer',transition:'transform .2s cubic-bezier(.34,1.2,.64,1)',background:`linear-gradient(145deg,${ec}20,${ec}08)`,border:`1.5px solid ${ec}45`,boxShadow:'0 4px 16px rgba(0,0,0,.5)',animation:`cardIn .3s ${Math.min(idx,8)*.04}s ease-out both`}}
                        onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-5px) scale(1.04)')}
                        onMouseLeave={e=>(e.currentTarget.style.transform='')}
                      >
                        {isHolo&&<div style={{position:'absolute',inset:0,borderRadius:'9px',background:'linear-gradient(115deg,#ff0080,#ff8c00,#ffd700,#00ff88,#00cfff,#8b00ff,#ff0080)',backgroundSize:'500% 500%',mixBlendMode:'overlay' as const,opacity:.18,pointerEvents:'none',animation:'holoShift 8s ease infinite',zIndex:2}}/>}
                        <div style={{position:'absolute',top:0,left:0,right:0,height:'5px',background:'linear-gradient(180deg,rgba(255,255,255,.1),transparent)',borderRadius:'9px 9px 0 0',zIndex:3,pointerEvents:'none'}}/>
                        <div style={{position:'absolute',bottom:0,left:0,right:0,height:'8px',background:'linear-gradient(0deg,rgba(0,0,0,.5),transparent)',zIndex:3,pointerEvents:'none'}}/>
                        <div style={{position:'absolute',top:0,left:0,right:0,height:'2.5px',background:`linear-gradient(90deg,${ec},${ec}44)`,zIndex:4}}/>
                        <div style={{position:'absolute',top:'8px',left:'8px',right:'8px',bottom:'52px',borderRadius:'7px',background:`${ec}14`,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                          <div style={{position:'absolute',width:'65%',height:'65%',borderRadius:'50%',background:eg,filter:'blur(14px)',opacity:.6}}/>
                          <div style={{width:orbSz,height:orbSz,borderRadius:'50%',background:`radial-gradient(circle at 35% 35%,${ec}CC,${ec}77)`,boxShadow:`0 0 16px ${eg}`,position:'relative',zIndex:1}}/>
                          {card.signal&&<div style={{position:'absolute',top:'4px',right:'4px',fontSize:'7px',fontWeight:700,background:TIER_BG[card.signal]??'#888',color:'#fff',padding:'1px 5px',borderRadius:'3px',fontFamily:'var(--font-display)',zIndex:2}}>{card.signal}</div>}
                          {favorites.has(card.id)&&<div style={{position:'absolute',top:'4px',left:'4px',fontSize:'10px',zIndex:2}}>❤️</div>}
                          {card.graded&&<div style={{position:'absolute',bottom:'4px',right:'4px',fontSize:'7px',fontWeight:700,background:'rgba(0,0,0,.7)',color:'rgba(255,255,255,.9)',padding:'1px 5px',borderRadius:'3px',fontFamily:'var(--font-display)',zIndex:2}}>{card.condition}</div>}
                        </div>
                        <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'6px 8px 8px'}}>
                          <div style={{fontSize:fsSm,fontWeight:600,color:'rgba(255,255,255,.85)',fontFamily:'var(--font-display)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:'2px'}}>{card.name}</div>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <div style={{fontSize:fsPr,fontWeight:700,color:'rgba(255,255,255,.9)',fontFamily:'var(--font-display)'}}>€ {card.curPrice}</div>
                            <div style={{fontSize:'10px',fontWeight:600,color:roi>=0?'#4ECCA3':'#FF6B8A'}}>{roi>=0?'+':''}{roi}%</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {Array.from({length:emptyCount}).map((_,i)=>(
                    <div key={`empty-${i}`} style={{aspectRatio:'2/3',borderRadius:'9px',border:'1.5px dashed rgba(255,255,255,.1)',background:'rgba(255,255,255,.02)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'5px',cursor:'pointer',transition:'border-color .15s'}} onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(255,255,255,.22)')} onMouseLeave={e=>(e.currentTarget.style.borderColor='rgba(255,255,255,.1)')}>
                      <div style={{width:'24px',height:'24px',borderRadius:'50%',border:'1.5px dashed rgba(255,255,255,.12)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <span style={{fontSize:'14px',color:'rgba(255,255,255,.1)',lineHeight:1}}>+</span>
                      </div>
                      <div style={{fontSize:'8px',color:'rgba(255,100,100,.45)',textAlign:'center',lineHeight:1.5}}>Emplacement<br/>libre</div>
                    </div>
                  ))}
                </div>

                {/* Page dots */}
                {binderPages>1&&(
                  <div style={{display:'flex',justifyContent:'center',gap:'6px',marginTop:'16px'}}>
                    {Array.from({length:binderPages}).map((_,i)=>(
                      <div key={i} onClick={()=>setBinderPage(i)} style={{height:'4px',borderRadius:'2px',background:i===binderPage?'rgba(255,255,255,.55)':'rgba(255,255,255,.15)',cursor:'pointer',transition:'all .2s',width:i===binderPage?'18px':'6px'}}/>
                    ))}
                  </div>
                )}

                {/* Progress */}
                <div style={{marginTop:'16px',paddingTop:'14px',borderTop:'1px solid rgba(255,255,255,.05)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                    <span style={{fontSize:'9px',color:'rgba(255,255,255,.2)',letterSpacing:'.08em',textTransform:'uppercase' as const,fontFamily:'var(--font-display)'}}>Complétion du portfolio</span>
                    <span style={{fontSize:'9px',color:'rgba(255,255,255,.3)',fontFamily:'var(--font-display)'}}>{filtered.length} cartes</span>
                  </div>
                  <div style={{height:'3px',borderRadius:'99px',background:'rgba(255,255,255,.07)',overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${Math.min(filtered.length/20*100,100)}%`,borderRadius:'99px',background:'linear-gradient(90deg,#7E57C2,#C855D4)',transition:'width .8s cubic-bezier(.23,1,.32,1)'}}/>
                  </div>
                </div>

                <div style={{position:'absolute',bottom:'16px',right:'20px',fontSize:'9px',color:'rgba(255,255,255,.06)',letterSpacing:'.2em',textTransform:'uppercase' as const,fontFamily:'var(--font-display)'}}>PokéAlpha Terminal</div>
              </div>
            </div>
          )
        })()}

        {/* ── VUE TABLE ─────────────────────────────── */}
        {view==='table'&&(
          <div style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:'14px',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'2.4fr 0.8fr 0.9fr 1fr 1fr 90px',padding:'10px 16px',borderBottom:'1px solid #F0F0F0',background:'#FAFAFA'}}>
              {['Carte','Condition','Achat','Valeur','ROI',''].map((h,i)=>(
                <div key={i} style={{fontSize:'10px',fontWeight:600,color:'#AAA',textTransform:'uppercase' as const,letterSpacing:'0.07em',fontFamily:'var(--font-display)',textAlign:i>=2?'right' as const:'left' as const}}>{h}</div>
              ))}
            </div>
            {(grouped?Array.from(grouped.entries()):[['',filtered] as [string,CardItem[]]]).map(([gk,gc])=>(
              <div key={gk}>
                {gk&&(
                  <div onClick={()=>toggleGroup(gk)} style={{display:'grid',gridTemplateColumns:'2.4fr 0.8fr 0.9fr 1fr 1fr 90px',padding:'9px 16px',background:'#F8F5F0',borderBottom:'1px solid #EBEBEB',cursor:'pointer',alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <span style={{fontSize:'10px',fontWeight:700,color:'#555',textTransform:'uppercase' as const,letterSpacing:'0.09em',fontFamily:'var(--font-display)'}}>{gk}</span>
                      <span style={{fontSize:'10px',color:'#AAA'}}>{gc.length} cartes</span>
                    </div>
                    <div/><div/>
                    <div style={{textAlign:'right',fontSize:'11px',fontWeight:600,color:'#111',fontFamily:'var(--font-display)'}}>€ {gc.reduce((s,c)=>s+c.curPrice*c.qty,0).toLocaleString('fr-FR')}</div>
                    <div style={{textAlign:'right',fontSize:'11px',fontWeight:700,color:'#2E9E6A',fontFamily:'var(--font-display)'}}>+{Math.round((gc.reduce((s,c)=>s+c.curPrice*c.qty,0)-gc.reduce((s,c)=>s+c.buyPrice*c.qty,0))/gc.reduce((s,c)=>s+c.buyPrice*c.qty,0)*100)}%</div>
                    <div style={{textAlign:'right',fontSize:'12px',color:'#AAA'}}>{collapsed.has(gk)?'▶':'▼'}</div>
                  </div>
                )}
                {!collapsed.has(gk)&&gc.map((card,i)=>{
                  const gain=(card.curPrice-card.buyPrice)*card.qty
                  const roi=Math.round(((card.curPrice-card.buyPrice)/card.buyPrice)*100)
                  const sel=selected===card.id
                  const rs=RARITY_STYLE[card.rarity]
                  const ls=LANG_STYLE[card.lang]
                  const ec=ENERGY[card.type]??'#888'
                  return(
                    <div key={card.id} className="rh" onClick={()=>setSelected(sel?null:card.id)} style={{display:'grid',gridTemplateColumns:'2.4fr 0.8fr 0.9fr 1fr 1fr 90px',padding:'13px 16px',borderBottom:i<gc.length-1?'1px solid #F8F8F8':'none',background:sel?'#FFFDE0':'transparent',alignItems:'center',borderLeft:sel?`3px solid ${ec}`:'3px solid transparent',transition:'all 0.1s'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                        <div style={{width:'34px',height:'48px',borderRadius:'6px',background:`linear-gradient(145deg,${ec}20,${ec}08)`,border:`1.5px solid ${ec}28`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <div style={{width:'12px',height:'12px',borderRadius:'50%',background:ec,opacity:0.6}}/>
                        </div>
                        <div style={{minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}}>
                            <span style={{fontSize:'13px',fontWeight:500,color:'#111',fontFamily:'var(--font-display)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{card.name}</span>
                            {favorites.has(card.id)&&<span style={{fontSize:'10px',flexShrink:0}}>❤️</span>}
                            {card.hot&&<div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#E03020',flexShrink:0,animation:'pulse 1.5s ease-in-out infinite'}}/>}
                            {card.signal&&<span style={{fontSize:'8px',fontWeight:700,background:card.signal==='S'?'#FFD700':card.signal==='A'?'#C855D4':'#2E9E6A',color:'#fff',padding:'2px 5px',borderRadius:'3px',fontFamily:'var(--font-display)',flexShrink:0}}>{card.signal}</span>}
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:'4px',flexWrap:'wrap'}}>
                            <span style={{fontSize:'10px',color:'#BBB'}}>{card.set} · {card.year}</span>
                            {rs&&<span style={{fontSize:'9px',background:rs.bg,color:rs.color,border:`1px solid ${rs.border}`,padding:'1px 5px',borderRadius:'3px',fontWeight:500,fontFamily:'var(--font-display)'}}>{rs.label}</span>}
                            <span style={{fontSize:'9px',background:ls.bg,color:ls.color,border:`1px solid ${ls.border}`,padding:'1px 5px',borderRadius:'3px',fontWeight:600,fontFamily:'var(--font-display)'}}>{ls.flag} {card.lang}</span>
                            {card.qty>1&&<span style={{fontSize:'10px',color:'#BBB'}}>×{card.qty}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{fontSize:'12px',color:'#555',fontFamily:'var(--font-display)'}}>
                        {card.condition}
                        {card.psa&&<div style={{fontSize:'10px',color:'#BBB',marginTop:'1px'}}>Pop {card.psa.toLocaleString()}</div>}
                      </div>
                      <div style={{textAlign:'right',fontSize:'13px',color:'#888'}}>€ {(card.buyPrice*card.qty).toLocaleString('fr-FR')}</div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'14px',fontWeight:600,color:'#111',fontFamily:'var(--font-display)'}}>€ {(card.curPrice*card.qty).toLocaleString('fr-FR')}</div>
                        {card.qty>1&&<div style={{fontSize:'10px',color:'#AAA'}}>€ {card.curPrice}/u</div>}
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'14px',fontWeight:700,color:roi>=0?'#2E9E6A':'#E03020',fontFamily:'var(--font-display)'}}>{roi>=0?'+':''}{roi}%</div>
                        <div style={{fontSize:'11px',color:roi>=0?'#2E9E6A':'#E03020',opacity:0.7}}>{gain>=0?'+':''}€ {Math.abs(gain).toLocaleString('fr-FR')}</div>
                      </div>
                      <div style={{display:'flex',gap:'5px',justifyContent:'flex-end'}}>
                        <button onClick={e=>toggleFav(card.id,e)} style={{padding:'4px 8px',borderRadius:'5px',background:'#F5F5F5',border:'1px solid #E8E8E8',fontSize:'11px',cursor:'pointer'}}>{favorites.has(card.id)?'❤️':'🤍'}</button>
                        <button style={{padding:'4px 8px',borderRadius:'5px',background:'#F5F5F5',border:'1px solid #E8E8E8',color:'#888',fontSize:'11px',cursor:'pointer'}}>×</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            <div style={{display:'grid',gridTemplateColumns:'2.4fr 0.8fr 0.9fr 1fr 1fr 90px',padding:'12px 16px',background:'#FAFAFA',borderTop:'2px solid #EBEBEB'}}>
              <div style={{fontSize:'12px',fontWeight:600,color:'#111',fontFamily:'var(--font-display)'}}>{filtered.length} cartes · {filtered.reduce((s,c)=>s+c.qty,0)} ex.</div>
              <div/><div/>
              <div style={{textAlign:'right',fontSize:'13px',fontWeight:600,color:'#111',fontFamily:'var(--font-display)'}}>€ {filtered.reduce((s,c)=>s+c.curPrice*c.qty,0).toLocaleString('fr-FR')}</div>
              <div style={{textAlign:'right',fontSize:'14px',fontWeight:700,color:'#2E9E6A',fontFamily:'var(--font-display)'}}>+{totalROI}%</div>
              <div/>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
