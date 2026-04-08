'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'

type Lang = 'EN'|'FR'|'JP'
type ProductType = 'booster'|'display'|'etb'|'bundle'
type SetData = { id:string; name:string; logo:string|null; serie:string|null; releaseDate:string; total:number }

interface SealedProduct {
  id: string; name: string; setId: string; setName: string; serie: string;
  type: ProductType; year: number; logo: string|null; total: number
}

interface PortfolioCard {
  id:string; name:string; set:string; setId?:string; number:string; rarity:string;
  type:string; lang:string; condition:string; graded:boolean; buyPrice:number;
  curPrice:number; qty:number; year:number; image?:string; setTotal?:number;
}

const TYPE_META: Record<ProductType,{label:string;cards:number;
  fc:string;bc:string;sl:string;sr:string;tp:string;bt:string}> = {
  booster:  { label:'Booster',  cards:10,
    fc:'linear-gradient(170deg,#AB5AC0,#6B1A90,#400860)',bc:'linear-gradient(170deg,#2A0840,#180530)',
    sl:'linear-gradient(180deg,#8A3AAF,#5A1A80)',sr:'linear-gradient(180deg,#9A4ABF,#6A2A90)',
    tp:'linear-gradient(90deg,#9A4ABF,#AB5AC0,#9A4ABF)',bt:'#3A0850'},
  display:  { label:'Display',  cards:360,
    fc:'linear-gradient(160deg,#009AE8,#005AB0,#003070)',bc:'linear-gradient(160deg,#001A50,#001030)',
    sl:'linear-gradient(180deg,#0088E0,#005AA0)',sr:'linear-gradient(180deg,#007AD0,#004A90)',
    tp:'linear-gradient(180deg,#00AAF0,#008AD0)',bt:'#001A40'},
  etb:      { label:'ETB',      cards:65,
    fc:'linear-gradient(160deg,#E87A50,#C04A28,#8A2010)',bc:'linear-gradient(160deg,#601008,#380808)',
    sl:'linear-gradient(180deg,#D86A40,#A83818)',sr:'linear-gradient(180deg,#D06838,#9A3018)',
    tp:'linear-gradient(180deg,#F08A60,#E07A50)',bt:'#501008'},
  bundle:   { label:'Coffret',  cards:40,
    fc:'linear-gradient(160deg,#EFD057,#C4A332,#907018)',bc:'linear-gradient(160deg,#605010,#403808)',
    sl:'linear-gradient(180deg,#DABB40,#B09828)',sr:'linear-gradient(180deg,#D4B238,#A08A20)',
    tp:'linear-gradient(180deg,#FFE067,#EFD057)',bt:'#504010'},
}

const DIMS: Record<ProductType,{w:number;h:number;d:number}> = {
  booster:{w:52,h:110,d:8}, display:{w:100,h:78,d:42},
  etb:{w:78,h:94,d:38}, bundle:{w:96,h:66,d:28}
}

const ERA_ORDER = ['Scarlet & Violet','Sword & Shield','Sun & Moon','XY','Black & White','DP / Platinum','EX','Original (WotC)']
const CHUNK = 40

function Box3D({type,logo,selected}:{type:ProductType;logo:string|null;setName:string;selected:boolean}) {
  const ref = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const autoRef = useRef(true)
  const tRef = useRef(Math.random()*6.28)
  const ryRef = useRef(0)
  const rxRef = useRef(0)

  useEffect(()=>{
    let af=0
    const bry=-12+Math.random()*24, brx=4+Math.random()*4, sp=.005+Math.random()*.004
    function loop(){
      if(autoRef.current){tRef.current+=sp;ryRef.current=bry+Math.sin(tRef.current)*14;rxRef.current=brx+Math.cos(tRef.current*.7)*6}
      if(ref.current) ref.current.style.transform='rotateX('+rxRef.current+'deg) rotateY('+ryRef.current+'deg)'
      af=requestAnimationFrame(loop)
    }
    loop()
    return ()=>cancelAnimationFrame(af)
  },[])

  const onEnter=()=>{autoRef.current=false}
  const onLeave=()=>{autoRef.current=true}
  const onMove=(e:React.MouseEvent)=>{
    if(autoRef.current||!stageRef.current)return
    const r=stageRef.current.getBoundingClientRect()
    ryRef.current=((e.clientX-r.left)/r.width-.5)*40
    rxRef.current=-((e.clientY-r.top)/r.height-.5)*25
  }

  const {w,h,d}=DIMS[type]
  const hd=d/2,hw=w/2,hh=h/2,ox=.5
  const tm=TYPE_META[type]
  const R=6

  return (
    <div ref={stageRef} onMouseEnter={onEnter} onMouseLeave={onLeave} onMouseMove={onMove}
      style={{width:w+40,height:h+40,perspective:800,display:'flex',alignItems:'center',justifyContent:'center',cursor:'grab',flexShrink:0}}>
      <div ref={ref} style={{width:w,height:h,transformStyle:'preserve-3d',position:'relative',filter:selected?'drop-shadow(0 0 12px rgba(224,48,32,.3))':''}}>
        <div style={{position:'absolute',bottom:-16,left:'50%',transform:'translateX(-50%)',width:'65%',height:12,background:'radial-gradient(ellipse,rgba(0,0,0,.2),transparent 70%)',borderRadius:'50%',filter:'blur(4px)',pointerEvents:'none'}}/>
        {/* Front */}
        <div style={{position:'absolute',width:w,height:h,background:tm.fc,borderRadius:R,transform:'translateZ('+hd+'px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,overflow:'hidden',backfaceVisibility:'hidden'}}>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(165deg,rgba(255,255,255,.2) 0%,rgba(255,255,255,.05) 25%,transparent 50%,rgba(0,0,0,.05) 100%)',pointerEvents:'none',zIndex:2,borderRadius:R}}/>
          {logo?<img src={logo} alt="" style={{height:type==='booster'?20:24,maxWidth:w-16,objectFit:'contain' as const,position:'relative',zIndex:1}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
            :<div style={{background:'rgba(255,255,255,.12)',borderRadius:4,width:w*.65,height:type==='booster'?20:24}}/>}
          <div style={{fontSize:6.5,fontWeight:600,color:'rgba(255,255,255,.5)',letterSpacing:'.1em',textTransform:'uppercase' as const,fontFamily:'var(--font-display)'}}>{tm.label}</div>
          <div style={{fontSize:6,color:'rgba(255,255,255,.3)',fontFamily:'var(--font-display)'}}>{tm.cards} cartes</div>
        </div>
        {/* Back */}
        <div style={{position:'absolute',width:w,height:h,background:tm.bc,borderRadius:R,transform:'translateZ('+(-hd)+'px) rotateY(180deg)',backfaceVisibility:'hidden'}}/>
        {/* Right */}
        <div style={{position:'absolute',width:d+ox,height:h,left:(w-d-ox)/2,background:tm.sr,transform:'rotateY(90deg) translateZ('+hw+'px)',backfaceVisibility:'hidden'}}><div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(255,255,255,.05),transparent 40%)',pointerEvents:'none'}}/></div>
        {/* Left */}
        <div style={{position:'absolute',width:d+ox,height:h,left:(w-d-ox)/2,background:tm.sl,transform:'rotateY(-90deg) translateZ('+hw+'px)',backfaceVisibility:'hidden'}}><div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(255,255,255,.08),transparent 50%)',pointerEvents:'none'}}/></div>
        {/* Top */}
        <div style={{position:'absolute',width:w,height:d+ox,top:(h-d-ox)/2,background:tm.tp,transform:'rotateX(90deg) translateZ('+hh+'px)',borderRadius:R+' '+R+'px 0 0',backfaceVisibility:'hidden',overflow:'hidden'}}><div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(255,255,255,.1),transparent 60%)',pointerEvents:'none'}}/></div>
        {/* Bottom */}
        <div style={{position:'absolute',width:w,height:d+ox,top:(h-d-ox)/2,background:tm.bt,transform:'rotateX(-90deg) translateZ('+hh+'px)',borderRadius:'0 0 '+R+'px '+R+'px',backfaceVisibility:'hidden'}}/>
        {/* Booster card peek */}
        {type==='booster'&&<>
          <div style={{position:'absolute',top:-12,left:'50%',marginLeft:-18,width:36,height:20,background:'linear-gradient(180deg,#fff 50%,#f0f0f0)',borderRadius:'4px 4px 0 0',border:'1.5px solid rgba(0,0,0,.06)',borderBottom:'none',transform:'translateZ('+(hd+1)+'px)',zIndex:4}}/>
          <div style={{position:'absolute',top:-8,left:'50%',marginLeft:-14,width:28,height:14,background:'linear-gradient(180deg,#fafafa,#eaeaea)',borderRadius:'3px 3px 0 0',border:'1px solid rgba(0,0,0,.04)',borderBottom:'none',transform:'translateZ('+(hd+2)+'px)',zIndex:5}}/>
        </>}
        {/* Bundle ribbon */}
        {type==='bundle'&&<div style={{position:'absolute',top:12,left:-2,width:w+4,height:14,background:'linear-gradient(90deg,#B82020,#E03030,#B82020)',transform:'translateZ('+(hd+1)+'px)',zIndex:3,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <span style={{fontSize:5.5,fontWeight:700,color:'rgba(255,255,255,.9)',letterSpacing:'.14em',textTransform:'uppercase' as const,fontFamily:'var(--font-display)'}}>★ Special ★</span>
        </div>}
      </div>
    </div>
  )
}

export function Scelles() {
  const [sets, setSets] = useState<SetData[]>([])
  const [lang, setLang] = useState<Lang>('FR')
  const [filType, setFilType] = useState<'all'|ProductType>('all')
  const [filEra, setFilEra] = useState('all')
  const [filSet, setFilSet] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'recent'|'name'|'cards'>('recent')
  const [visible, setVisible] = useState(CHUNK)
  const [selId, setSelId] = useState<string|null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioCard[]>([])
  const [groupBySet, setGroupBySet] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    fetch('/data/sets-EN.json').then(r=>r.json()).then((d:SetData[])=>setSets(d)).catch(()=>{})
    try { const p=localStorage.getItem('portfolio'); if(p) setPortfolio(JSON.parse(p)) } catch{}
  },[])

  const products = useMemo(()=>{
    const prods: SealedProduct[]=[]
    sets.forEach(s=>{
      const year=s.releaseDate?parseInt(s.releaseDate.slice(0,4)):2020
      const serie=s.serie||'Autre'
      const base={setId:s.id,setName:s.name,serie,year,logo:s.logo,total:s.total}
      prods.push({...base,id:s.id+'-booster',name:'Booster '+s.name,type:'booster'})
      if(s.total>=50){
        prods.push({...base,id:s.id+'-display',name:'Display '+s.name,type:'display'})
        prods.push({...base,id:s.id+'-etb',name:'ETB '+s.name,type:'etb'})
      }
      if(s.total>=100) prods.push({...base,id:s.id+'-bundle',name:'Coffret '+s.name,type:'bundle'})
    })
    return prods
  },[sets])

  const eras = useMemo(()=>{
    const e=[...new Set(products.map(p=>p.serie))]
    return e.sort((a,b)=>{const ai=ERA_ORDER.indexOf(a),bi=ERA_ORDER.indexOf(b);return(ai===-1?99:ai)-(bi===-1?99:bi)})
  },[products])

  const setsInEra = useMemo(()=>{
    const base=filEra==='all'?products:products.filter(p=>p.serie===filEra)
    const seen=new Set<string>()
    return base.filter(p=>{if(seen.has(p.setId))return false;seen.add(p.setId);return true}).map(p=>({id:p.setId,name:p.setName}))
  },[products,filEra])

  const filtered = useMemo(()=>{
    let r=products
    if(filType!=='all') r=r.filter(p=>p.type===filType)
    if(filEra!=='all') r=r.filter(p=>p.serie===filEra)
    if(filSet!=='all') r=r.filter(p=>p.setId===filSet)
    if(search){const q=search.toLowerCase();r=r.filter(p=>p.name.toLowerCase().includes(q)||p.setName.toLowerCase().includes(q)||p.serie.toLowerCase().includes(q))}
    if(sort==='name') return [...r].sort((a,b)=>a.name.localeCompare(b.name))
    if(sort==='cards') return [...r].sort((a,b)=>b.total-a.total)
    return [...r].sort((a,b)=>b.year-a.year||a.setName.localeCompare(b.setName)||a.type.localeCompare(b.type))
  },[products,filType,filEra,filSet,search,sort])

  const pageItems=filtered.slice(0,visible)
  const hasMore=visible<filtered.length
  const selProduct=selId?products.find(p=>p.id===selId):null

  useEffect(()=>{setVisible(CHUNK)},[filType,filEra,filSet,search,sort])

  useEffect(()=>{
    if(!sentinelRef.current)return
    const obs=new IntersectionObserver(e=>{if(e[0].isIntersecting&&visible<filtered.length)setVisible(p=>Math.min(p+CHUNK,filtered.length))},{rootMargin:'400px'})
    obs.observe(sentinelRef.current)
    return()=>obs.disconnect()
  },[visible,filtered.length])

  const ownedInSet=useCallback((setId:string)=>portfolio.filter(c=>c.setId===setId||c.set===sets.find(s=>s.id===setId)?.name).length,[portfolio,sets])

  const flag=(l:Lang)=>l==='EN'?'\ud83c\uddfa\ud83c\uddf8':l==='FR'?'\ud83c\uddeb\ud83c\uddf7':'\ud83c\uddef\ud83c\uddf5'
  const stats=useMemo(()=>({total:filtered.length,sets:new Set(filtered.map(p=>p.setId)).size,eras:new Set(filtered.map(p=>p.serie)).size}),[filtered])

  const grouped = useMemo(()=>{
    if(!groupBySet) return null
    const map=new Map<string,SealedProduct[]>()
    filtered.forEach(p=>{if(!map.has(p.setId))map.set(p.setId,[]);map.get(p.setId)!.push(p)})
    return [...map.entries()].sort((a,b)=>(b[1][0]?.year||0)-(a[1][0]?.year||0))
  },[filtered,groupBySet])

  return (
    <>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cardIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
        @keyframes panelIn{from{opacity:0;transform:translateX(14px) scale(.98)}to{opacity:1;transform:translateX(0) scale(1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .sc{transition:all .2s cubic-bezier(.34,1.2,.64,1) !important;cursor:pointer}
        .sc:hover{transform:translateY(-4px) !important;box-shadow:0 12px 32px rgba(0,0,0,.1) !important;border-color:#D2D2D7 !important}
        .pill{padding:5px 12px;border-radius:99px;border:1px solid #E5E5EA;background:#fff;color:#48484A;font-size:11px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .12s;white-space:nowrap}
        .pill:hover{border-color:#1D1D1F;background:#F5F5F7}
        .pill.on{background:#1D1D1F !important;color:#fff !important;border-color:#1D1D1F !important}
        .srt{padding:5px 11px;border-radius:6px;border:none;background:transparent;color:#86868B;font-size:11px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .12s}
        .srt:hover{background:#EBEBEB}
        .srt.on{background:#1D1D1F !important;color:#fff !important}
        .fsel{height:34px;padding:0 10px;border:1px solid #EBEBEB;border-radius:7px;font-size:12px;outline:none;background:#fff;cursor:pointer;font-family:var(--font-display);color:#555;transition:border-color .15s}
        .fsel:focus,.fsel:hover{border-color:#BBB}
        .detail-panel{animation:panelIn .28s cubic-bezier(.34,1.2,.64,1)}
      `}</style>

      <div style={{animation:'fadeIn .25s ease-out',width:'100%',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>
          {/* Header */}
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap' as const,gap:12}}>
            <div>
              <p style={{fontSize:10,color:'#AAA',textTransform:'uppercase' as const,letterSpacing:'.1em',margin:'0 0 4px',fontFamily:'var(--font-display)'}}>Cartes</p>
              <h1 style={{fontSize:26,fontWeight:600,color:'#111',fontFamily:'var(--font-display)',letterSpacing:'-.5px',margin:'0 0 6px'}}>Scellés</h1>
              <div style={{fontSize:12,color:'#86868B'}}><strong style={{color:'#1D1D1F'}}>{stats.total}</strong> produits · <strong style={{color:'#1D1D1F'}}>{stats.sets}</strong> séries · <strong style={{color:'#1D1D1F'}}>{stats.eras}</strong> blocs</div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button onClick={()=>setGroupBySet(!groupBySet)} className={'pill'+(groupBySet?' on':'')}>{groupBySet?'Vue grille':'Par série'}</button>
              <div style={{background:'#F5F5F5',borderRadius:12,padding:4,display:'flex',gap:3}}>
                {(['EN','FR','JP'] as Lang[]).map(l=>(
                  <button key={l} onClick={()=>setLang(l)} style={{padding:'8px 14px',borderRadius:9,border:'none',background:lang===l?'#fff':'transparent',color:lang===l?'#111':'#888',fontFamily:'var(--font-display)',fontWeight:lang===l?700:500,fontSize:13,cursor:'pointer',boxShadow:lang===l?'0 2px 8px rgba(0,0,0,.1)':'none',display:'flex',alignItems:'center',gap:6}}>
                    <span>{flag(l)}</span><span>{l==='EN'?'English':l==='FR'?'Français':'日本語'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search + Sort */}
          <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap' as const,alignItems:'center'}}>
            <div style={{position:'relative' as const,flex:1,minWidth:200}}>
              <span style={{position:'absolute' as const,left:11,top:'50%',transform:'translateY(-50%)',color:'#CCC',fontSize:15,pointerEvents:'none' as const}}>{String.fromCharCode(8981)}</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un produit scellé..."
                style={{width:'100%',height:38,padding:'0 12px 0 32px',border:'1px solid #EBEBEB',borderRadius:9,fontSize:13,color:'#111',outline:'none',background:'#fff',fontFamily:'var(--font-sans)',boxSizing:'border-box' as const}}/>
            </div>
            <div style={{display:'flex',gap:3,background:'#F5F5F5',borderRadius:9,padding:3}}>
              {([['recent','Récent'],['name','Nom'],['cards','Cartes']] as ['recent'|'name'|'cards',string][]).map(([k,l])=>(
                <button key={k} onClick={()=>setSort(k)} className={'srt'+(sort===k?' on':'')}>{l}</button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap' as const,alignItems:'center',position:'sticky' as const,top:0,zIndex:30,background:'rgba(255,255,255,.92)',backdropFilter:'blur(8px)',padding:'10px 0'}}>
            <select className="fsel" value={filEra} onChange={e=>{setFilEra(e.target.value);setFilSet('all')}} style={{color:filEra!=='all'?'#111':'#AAA'}}>
              <option value="all">Tous les blocs</option>
              {eras.map(e=><option key={e} value={e}>{e}</option>)}
            </select>
            <select className="fsel" value={filSet} onChange={e=>setFilSet(e.target.value)} style={{maxWidth:220,color:filSet!=='all'?'#111':'#AAA'}}>
              <option value="all">Toutes les séries ({setsInEra.length})</option>
              {setsInEra.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div style={{width:1,height:24,background:'#EBEBEB'}}/>
            {(['all','booster','display','etb','bundle'] as ('all'|ProductType)[]).map(t=>(
              <button key={t} onClick={()=>setFilType(t)} className={'pill'+(filType===t?' on':'')}>{t==='all'?'Tous':TYPE_META[t].label}</button>
            ))}
            {(filEra!=='all'||filSet!=='all'||filType!=='all'||search)&&(
              <button onClick={()=>{setFilEra('all');setFilSet('all');setFilType('all');setSearch('')}} style={{height:30,padding:'0 12px',borderRadius:7,border:'1px solid #EBEBEB',background:'#fff',color:'#888',fontSize:11,cursor:'pointer',fontFamily:'var(--font-display)'}}>✕ Effacer</button>
            )}
            <span style={{fontSize:11,color:'#AEAEB2',marginLeft:'auto',fontFamily:'var(--font-display)'}}>{filtered.length} produits</span>
          </div>

          {/* Set header when filtered */}
          {filSet!=='all'&&(()=>{
            const s=sets.find(x=>x.id===filSet)
            const owned=ownedInSet(filSet)
            const total=s?.total||0
            const pct=total>0?Math.round(owned/total*100):0
            return s?(
              <div style={{background:'linear-gradient(135deg,#FAFAFA,#F0F0F2)',border:'1px solid #E5E5EA',borderRadius:16,padding:'20px 24px',marginBottom:20,display:'flex',alignItems:'center',gap:24,flexWrap:'wrap' as const}}>
                {s.logo&&<img src={s.logo} alt="" style={{height:48,maxWidth:200,objectFit:'contain' as const}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                <div style={{flex:1,minWidth:180}}>
                  <div style={{fontSize:18,fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)'}}>{s.name}</div>
                  {s.serie&&<div style={{fontSize:11,color:'#86868B',fontFamily:'var(--font-display)',marginBottom:8}}>{s.serie} · {s.releaseDate?.slice(0,4)} · {s.total} cartes</div>}
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{height:6,flex:1,maxWidth:200,background:'#E5E5EA',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:pct+'%',background:pct===100?'#2E9E6A':pct>50?'#F5A623':'#E03020',borderRadius:3,transition:'width .4s'}}/></div>
                    <span style={{fontSize:12,fontWeight:600,color:pct===100?'#2E9E6A':'#1D1D1F',fontFamily:'var(--font-data)'}}>{owned}/{total} ({pct}%)</span>
                  </div>
                </div>
              </div>
            ):null
          })()}

          {/* Grid */}
          {!groupBySet && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:14}}>
              {pageItems.map((item,idx)=>{
                const tm=TYPE_META[item.type]
                const owned=ownedInSet(item.setId)
                const isSel=selId===item.id
                return (
                  <div key={item.id} className="sc" onClick={()=>setSelId(isSel?null:item.id)}
                    style={{background:'#fff',border:'1.5px solid '+(isSel?'#1D1D1F':'#EBEBEB'),borderRadius:16,overflow:'hidden',boxShadow:isSel?'0 8px 28px rgba(0,0,0,.1)':'0 2px 8px rgba(0,0,0,.04)',animation:'cardIn .25s '+Math.min(idx,15)*.025+'s ease-out both'}}>
                    <div style={{background:'linear-gradient(135deg,#F8F8FA,#EDEDF0)',display:'flex',alignItems:'center',justifyContent:'center',padding:'8px 0',position:'relative'}}>
                      <Box3D type={item.type} logo={item.logo} setName={item.setName} selected={isSel}/>
                    </div>
                    <div style={{padding:14}}>
                      <div style={{fontSize:13,fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)',marginBottom:3,lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{item.name}</div>
                      <div style={{fontSize:10,color:'#AEAEB2',marginBottom:8}}>{item.serie} · {item.year} · {item.total} cartes</div>
                      <div style={{display:'flex',gap:6}}>
                        <div style={{flex:1,background:'#F5F5F7',borderRadius:8,padding:'8px 10px'}}>
                          <div style={{fontSize:8,color:'#AEAEB2',textTransform:'uppercase' as const,letterSpacing:'.06em',fontFamily:'var(--font-display)',marginBottom:2}}>Contenu</div>
                          <div style={{fontSize:14,fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-data)'}}>{tm.cards}</div>
                        </div>
                        <div style={{flex:1,background:owned>0?'#F0FDF4':'#F5F5F7',borderRadius:8,padding:'8px 10px',border:owned>0?'1px solid #BBF7D0':'none'}}>
                          <div style={{fontSize:8,color:owned>0?'#166534':'#AEAEB2',textTransform:'uppercase' as const,letterSpacing:'.06em',fontFamily:'var(--font-display)',marginBottom:2}}>Collection</div>
                          <div style={{fontSize:14,fontWeight:700,color:owned>0?'#2E9E6A':'#AEAEB2',fontFamily:'var(--font-data)'}}>{owned}/{item.total}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Grouped by set */}
          {groupBySet && grouped && grouped.map(([setId,prods])=>{
            const s=sets.find(x=>x.id===setId)
            const owned=ownedInSet(setId)
            return (
              <div key={setId} style={{marginBottom:24,background:'#fff',border:'1px solid #EBEBEB',borderRadius:16,overflow:'hidden'}}>
                <div style={{padding:'16px 20px',borderBottom:'1px solid #F0F0F0',display:'flex',alignItems:'center',gap:14}}>
                  {s?.logo&&<img src={s.logo} alt="" style={{height:24,maxWidth:100,objectFit:'contain' as const}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)'}}>{s?.name||setId}</div>
                    <div style={{fontSize:10,color:'#AEAEB2'}}>{s?.serie} · {s?.releaseDate?.slice(0,4)} · {owned}/{s?.total||0} cartes</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:0,overflowX:'auto' as const,scrollbarWidth:'none' as any}}>
                  {prods.map(p=>{
                    const isSel=selId===p.id
                    return (
                      <div key={p.id} onClick={()=>setSelId(isSel?null:p.id)}
                        style={{flex:'0 0 180px',padding:14,borderRight:'1px solid #F5F5F5',cursor:'pointer',background:isSel?'#F5F5F7':'transparent',transition:'all .15s',display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                        <Box3D type={p.type} logo={p.logo} setName={p.setName} selected={isSel}/>
                        <div style={{fontSize:11,fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)',textAlign:'center' as const}}>{TYPE_META[p.type].label}</div>
                        <div style={{fontSize:9,color:'#AEAEB2',textAlign:'center' as const}}>{TYPE_META[p.type].cards} cartes</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {hasMore&&<div ref={sentinelRef} style={{display:'flex',justifyContent:'center',padding:'32px 0'}}><div style={{display:'flex',alignItems:'center',gap:8,color:'#AEAEB2',fontSize:12,fontFamily:'var(--font-display)'}}><div style={{width:16,height:16,border:'2px solid #E5E5EA',borderTop:'2px solid #86868B',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>Chargement...</div></div>}
          {!hasMore&&filtered.length>CHUNK&&<div style={{textAlign:'center' as const,padding:'20px 0',color:'#AEAEB2',fontSize:11,fontFamily:'var(--font-display)'}}>{filtered.length} produits affichés</div>}
          {filtered.length===0&&sets.length>0&&(
            <div style={{textAlign:'center' as const,padding:'60px 20px'}}>
              <div style={{fontSize:48,opacity:.15,marginBottom:16}}>📦</div>
              <div style={{fontSize:16,fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)',marginBottom:6}}>Aucun produit trouvé</div>
              <button onClick={()=>{setFilEra('all');setFilSet('all');setFilType('all');setSearch('')}} style={{padding:'8px 16px',borderRadius:8,background:'#1D1D1F',color:'#fff',border:'none',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)'}}>Effacer les filtres</button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selProduct && (
          <div className="detail-panel" style={{width:285,flexShrink:0,position:'sticky' as any,top:80,maxHeight:'calc(100vh - 100px)',overflowY:'auto' as any}}>
            <div style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:16,overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,.07)'}}>
              <div style={{background:'linear-gradient(135deg,#F8F8FA,#EDEDF0)',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px 0',position:'relative',minHeight:160}}>
                <Box3D type={selProduct.type} logo={selProduct.logo} setName={selProduct.setName} selected={false}/>
                <button onClick={()=>setSelId(null)} style={{position:'absolute',top:8,left:8,width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,.9)',border:'1px solid rgba(0,0,0,.08)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div style={{padding:14}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,marginBottom:2}}>
                  <div style={{fontSize:16,fontWeight:700,color:'#111',fontFamily:'var(--font-display)',lineHeight:1.2}}>{selProduct.name}</div>
                  <span style={{flexShrink:0,padding:'3px 8px',borderRadius:5,background:selProduct.type==='booster'?'#F5EAFF':selProduct.type==='display'?'#F0F5FF':selProduct.type==='etb'?'#FFF5F0':'#FFFDE0',color:selProduct.type==='booster'?'#7B2D8B':selProduct.type==='display'?'#003DAA':selProduct.type==='etb'?'#C84B00':'#8B6E00',fontSize:9,fontWeight:600,fontFamily:'var(--font-display)'}}>{TYPE_META[selProduct.type].label}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginTop:10,marginBottom:14,padding:'8px 10px',background:'#F8F8FA',borderRadius:8,border:'1px solid #F0F0F2'}}>
                  {selProduct.logo&&<img src={selProduct.logo} alt="" style={{height:22,maxWidth:80,objectFit:'contain' as const,flexShrink:0}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{selProduct.setName}</div>
                    <div style={{fontSize:9,color:'#AEAEB2',fontFamily:'var(--font-display)'}}>{selProduct.serie} · {selProduct.year}</div>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:14}}>
                  {[['Contenu',TYPE_META[selProduct.type].cards+' cartes'],['Cartes dans le set',String(selProduct.total)],['Année',String(selProduct.year)],['Bloc',selProduct.serie]].map(([l,v])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                      <span style={{fontSize:10,color:'#AAA',fontFamily:'var(--font-display)',flexShrink:0}}>{l}</span>
                      <span style={{fontSize:11,color:'#111',fontFamily:'var(--font-display)',fontWeight:500,textAlign:'right' as const,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{v}</span>
                    </div>
                  ))}
                </div>
                {(()=>{
                  const owned=ownedInSet(selProduct.setId)
                  const total=selProduct.total
                  const pct=total>0?Math.round(owned/total*100):0
                  return (
                    <div style={{background:'#F5F5F7',borderRadius:10,padding:'10px 12px',marginBottom:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                        <span style={{fontSize:10,color:'#86868B',fontFamily:'var(--font-display)'}}>Ma collection</span>
                        <span style={{fontSize:10,fontWeight:600,color:pct===100?'#2E9E6A':'#1D1D1F',fontFamily:'var(--font-data)'}}>{owned}/{total} ({pct}%)</span>
                      </div>
                      <div style={{height:4,borderRadius:2,background:'#E8E8ED',overflow:'hidden'}}>
                        <div style={{width:pct+'%',height:'100%',borderRadius:2,background:pct===100?'linear-gradient(90deg,#C9A84C,#D4AF37)':'#E03020',transition:'width .3s'}}/>
                      </div>
                    </div>
                  )
                })()}
                <button onClick={()=>window.open('https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString='+encodeURIComponent(selProduct.name),'_blank')}
                  style={{width:'100%',padding:11,borderRadius:9,background:'#111',color:'#fff',border:'none',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)'}}>
                  Voir sur Cardmarket →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}