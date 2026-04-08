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

function SealedImg({type,logo,selected,realImg}:{type:ProductType;logo:string|null;setName:string;selected:boolean;realImg?:string}) {
  const tm=TYPE_META[type]
  const bgs: Record<ProductType,string> = {
    booster:'linear-gradient(145deg,#F8F0FF 0%,#F0E8FA 50%,#EBE0F5 100%)',
    display:'linear-gradient(145deg,#EEF5FF 0%,#E5EFFA 50%,#DDEAF8 100%)',
    etb:'linear-gradient(145deg,#FFF5F0 0%,#FAEEE8 50%,#F5E5DD 100%)',
    bundle:'linear-gradient(145deg,#FFFCF0 0%,#FAF5E5 50%,#F5F0DA 100%)',
  }
  return (
    <div style={{width:'100%',aspectRatio:'1',borderRadius:14,background:realImg?bgs[type]:'#F5F5F7',position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',border:selected?'2px solid #1D1D1F':'1px solid #F0F0F2',transition:'all .25s',boxShadow:selected?'inset 0 0 0 1px rgba(0,0,0,.05)':'none'}}>
      {realImg ? (
        <>
          <img src={realImg} alt="" style={{maxWidth:'85%',maxHeight:'85%',objectFit:'contain' as const,filter:'drop-shadow(0 4px 12px rgba(0,0,0,.12))',transition:'transform .3s cubic-bezier(.34,1.2,.64,1)'}}
            onMouseEnter={e=>{(e.target as HTMLImageElement).style.transform='scale(1.05)'}}
            onMouseLeave={e=>{(e.target as HTMLImageElement).style.transform='scale(1)'}}
            onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
          <div style={{position:'absolute',top:8,right:8,padding:'3px 8px',borderRadius:6,background:'rgba(255,255,255,.85)',backdropFilter:'blur(4px)',border:'0.5px solid rgba(0,0,0,.06)',fontSize:9,fontWeight:600,color:'#86868B',fontFamily:'var(--font-display)'}}>{tm.label}</div>
        </>
      ) : (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:16}}>
          {logo?<img src={logo} alt="" style={{height:32,maxWidth:120,objectFit:'contain' as const}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>:null}
          <div style={{fontSize:11,fontWeight:600,color:'#AEAEB2',fontFamily:'var(--font-display)'}}>{tm.label}</div>
          <div style={{fontSize:9,color:'#D2D2D7',fontFamily:'var(--font-display)'}}>{tm.cards} cartes</div>
        </div>
      )}
    </div>
  )
}
export function Scelles() {
  const [sets, setSets] = useState<SetData[]>([])
  const [cardsDb, setCardsDb] = useState<Record<string,{id:string;img:string;r:string}[]>>({})
  const [realProducts, setRealProducts] = useState<{id:string;name:string;set:string;type:string;img:string}[]>([])
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
    fetch('/data/cards-FR.json').then(r=>r.json()).then((d:Record<string,{id:string;img:string;r:string}[]>)=>setCardsDb(d)).catch(()=>{})
    fetch('/data/sealed-products.json').then(r=>r.json()).then(d=>setRealProducts(d)).catch(()=>{})
    try { const p=localStorage.getItem('portfolio'); if(p) setPortfolio(JSON.parse(p)) } catch{}
  },[])

  const products = useMemo(()=>{
    return realProducts.map(rp => {
      const matchSet = sets.find(s => 
        rp.set.toLowerCase().includes(s.name.toLowerCase()) || 
        s.name.toLowerCase().includes(rp.set.toLowerCase()) ||
        rp.name.toLowerCase().includes(s.name.toLowerCase())
      )
      return {
        id: rp.id,
        name: rp.name,
        setId: matchSet?.id || rp.set.toLowerCase().replace(/\s+/g,'-'),
        setName: rp.set,
        serie: matchSet?.serie || 'Autre',
        type: (rp.type || 'booster') as ProductType,
        year: matchSet?.releaseDate ? parseInt(matchSet.releaseDate.slice(0,4)) : 2020,
        logo: matchSet?.logo || null,
        total: matchSet?.total || 0,
      }
    })
  },[realProducts, sets])

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

  const findRealImg = useCallback((name: string, setName: string, type: string): string|null => {
    const q = name.toLowerCase()
    const sq = setName.toLowerCase()
    // Try exact name match
    let m = realProducts.find(p => p.name.toLowerCase() === q)
    if (m) return m.img
    // Try set + type match
    m = realProducts.find(p => p.set.toLowerCase().includes(sq) && p.type === type)
    if (m) return m.img
    // Try set match (any type)
    m = realProducts.find(p => p.set.toLowerCase().includes(sq))
    if (m) return m.img
    // Try partial name
    m = realProducts.find(p => q.includes(p.name.toLowerCase().split(' ').slice(0,2).join(' ')))
    if (m) return m.img
    return null
  }, [realProducts])

  const artworksForSet = useCallback((setId: string): string[] => {
    const cards = cardsDb[setId]
    if (!cards || cards.length === 0) return []
    const rarityOrder = ['Illustration rare','Special Art Rare','Holo Rare V','Holo Rare VMAX','Holo Rare VSTAR','Ultra Rare','Secret Rare','Rare','Holo Rare','Double rare','Uncommon']
    const sorted = [...cards].filter(c => c.img).sort((a, b) => {
      const ai = rarityOrder.indexOf(a.r), bi = rarityOrder.indexOf(b.r)
      return (ai === -1 ? 50 : ai) - (bi === -1 ? 50 : bi)
    })
    return sorted.slice(0, 8).map(c => c.img)
  }, [cardsDb])

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
        .enc-card{transition:transform .22s cubic-bezier(.34,1.4,.64,1),box-shadow .22s ease,border-color .18s ease;border-radius:12px;overflow:hidden;cursor:pointer;position:relative}
        .enc-card:hover{transform:translateY(-5px) scale(1.02) !important;box-shadow:0 12px 32px rgba(0,0,0,.1) !important;border-color:#D2D2D7 !important}
        .enc-card:hover .card-img{transform:scale(1.04)}
        .enc-card:hover .card-name{color:#000 !important}
        .enc-card::after{content:'';position:absolute;inset:0;border-radius:12px;pointer-events:none;background:linear-gradient(115deg,rgba(255,255,255,0) 40%,rgba(255,255,255,.18) 50%,rgba(255,255,255,0) 60%);opacity:0;transition:opacity .25s}
        .enc-card:hover::after{opacity:1}
        .card-img{transition:transform .35s cubic-bezier(.34,1.2,.64,1);will-change:transform}
        .sc:hover .sealed-spec{opacity:1 !important}
        .sc:hover{transform:translateY(-5px) scale(1.015) !important}
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
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
              {pageItems.map((item,idx)=>{
                const tm=TYPE_META[item.type]
                const owned=ownedInSet(item.setId)
                const isSel=selId===item.id
                const realImg=findRealImg(item.name,item.setName,item.type)
                return (
                  <div key={item.id} className="enc-card" onClick={()=>setSelId(isSel?null:item.id)}
                    style={{background:'#fff',border:'1.5px solid '+(isSel?'#111':'#EBEBEB'),boxShadow:isSel?'0 8px 28px rgba(0,0,0,.1)':'0 2px 8px rgba(0,0,0,.04)',animation:'cardIn .28s '+Math.min(idx,18)*.025+'s ease-out both'}}>
                    <div style={{height:180,background:'#F5F5F5',position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {realImg ? (
                        <img src={realImg} alt={item.name} className="card-img"
                          style={{maxWidth:'88%',maxHeight:'88%',objectFit:'contain' as const,filter:'drop-shadow(0 4px 12px rgba(0,0,0,.1))'}}
                          onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                          {item.logo&&<img src={item.logo} alt="" style={{height:32,maxWidth:120,objectFit:'contain' as const}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                          <div style={{fontSize:11,fontWeight:600,color:'#AEAEB2',fontFamily:'var(--font-display)'}}>{tm.label}</div>
                        </div>
                      )}
                      <div style={{position:'absolute',top:6,left:6,zIndex:2,padding:'2px 6px',borderRadius:4,background:item.type==='booster'?'#F5EAFF':item.type==='display'?'#F0F5FF':item.type==='etb'?'#FFF5F0':'#FFFDE0',fontSize:8,fontWeight:600,color:item.type==='booster'?'#7B2D8B':item.type==='display'?'#003DAA':item.type==='etb'?'#C84B00':'#8B6E00',fontFamily:'var(--font-display)',letterSpacing:'.02em'}}>{tm.label}</div>
                      {owned>0&&<div style={{position:'absolute',top:6,right:6,width:20,height:20,borderRadius:'50%',background:'#27500A',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg></div>}
                    </div>
                    <div style={{padding:'10px 12px 12px'}}>
                      <div className="card-name" style={{fontSize:13,fontWeight:600,color:'#111',fontFamily:'var(--font-display)',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,lineHeight:1.3}}>{item.name}</div>
                      <div style={{fontSize:10,color:'#AEAEB2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,display:'flex',alignItems:'center',gap:4}}>
                        {item.logo&&<img src={item.logo} alt="" style={{height:11,maxWidth:40,objectFit:'contain' as const,opacity:.6}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                        <span>{item.setName}</span>
                        <span style={{fontFamily:'monospace',marginLeft:2}}>{item.year}</span>
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
                        <SealedImg type={p.type} logo={p.logo} setName={p.setName} selected={isSel} realImg={findRealImg(p.name,p.setName,p.type)||undefined}/>
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
                <SealedImg type={selProduct.type} logo={selProduct.logo} setName={selProduct.setName} selected={false} realImg={findRealImg(selProduct.name,selProduct.setName,selProduct.type)||undefined}/>
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
                <button onClick={()=>{
                    const card: PortfolioCard = {
                      id:'sealed_'+Date.now(), name:selProduct.name, set:selProduct.setName,
                      setId:selProduct.setId, number:'SEALED', rarity:'Sealed',
                      type:selProduct.type, lang:'FR', condition:'Sealed', graded:false,
                      buyPrice:0, curPrice:0, qty:1, year:selProduct.year,
                      image:selProduct.logo||undefined
                    }
                    const prev = JSON.parse(localStorage.getItem('portfolio')||'[]')
                    prev.push(card)
                    localStorage.setItem('portfolio', JSON.stringify(prev))
                    setPortfolio(prev)
                  }}
                  style={{width:'100%',padding:11,borderRadius:9,background:'#111',color:'#fff',border:'none',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)'}}>
                  + Ajouter au portfolio
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}