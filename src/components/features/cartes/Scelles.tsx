'use client'

import { useState, useMemo, useEffect, useRef } from 'react'

type Lang = 'EN'|'FR'|'JP'
type ProductType = 'booster'|'display'|'etb'|'bundle'
type SetData = { id:string; name:string; logo:string|null; serie:string|null; releaseDate:string; total:number }

interface SealedProduct {
  id: string
  name: string
  setId: string
  setName: string
  serie: string
  type: ProductType
  year: number
  logo: string|null
  total: number
}

const TYPE_META: Record<ProductType,{label:string;icon:string;cards:number;bg:string;fg:string;border:string}> = {
  booster:  { label:'Booster',  icon:'\u{1F0CF}', cards:10,  bg:'#FFF5F0', fg:'#C84B00', border:'#FFD0B0' },
  display:  { label:'Display',  icon:'\u{1F4E6}', cards:360, bg:'#F5EAFF', fg:'#7B2D8B', border:'#D8B8FF' },
  etb:      { label:'ETB',      icon:'\u{1F381}', cards:65,  bg:'#F0F5FF', fg:'#003DAA', border:'#C0D0FF' },
  bundle:   { label:'Bundle',   icon:'\u{2728}',  cards:40,  bg:'#FFFDE0', fg:'#8B6E00', border:'#FFE87A' },
}

const ERA_ORDER = ['Scarlet & Violet','Sword & Shield','Sun & Moon','XY','Black & White','DP / Platinum','EX','Original (WotC)']
const ERA_COLORS: Record<string,string> = {
  'Scarlet & Violet':'#8B3A9F','Sword & Shield':'#0077C8','Sun & Moon':'#F5A623','XY':'#3B7DD8',
  'Black & White':'#555','DP / Platinum':'#2A7A4B','EX':'#C03030','Original (WotC)':'#D4AF37'
}

const CHUNK = 40

export function Scelles() {
  const [sets, setSets] = useState<SetData[]>([])
  const [lang, setLang] = useState<Lang>('FR')
  const [filType, setFilType] = useState<'all'|ProductType>('all')
  const [filEra, setFilEra] = useState('all')
  const [filSet, setFilSet] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'recent'|'name'|'cards'>('recent')
  const [visible, setVisible] = useState(CHUNK)
  const [selProduct, setSelProduct] = useState<SealedProduct|null>(null)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/data/sets-EN.json').then(r=>r.json()).then((d: SetData[]) => setSets(d)).catch(()=>{})
  }, [])

  // Generate sealed products from sets
  const products = useMemo(() => {
    const prods: SealedProduct[] = []
    sets.forEach(s => {
      const year = s.releaseDate ? parseInt(s.releaseDate.slice(0,4)) : 2020
      const serie = s.serie || 'Autre'
      const base = { setId:s.id, setName:s.name, serie, year, logo:s.logo, total:s.total }
      // Every set gets a booster
      prods.push({ ...base, id:s.id+'-booster', name:'Booster '+s.name, type:'booster' })
      // Sets with 50+ cards get display + ETB
      if (s.total >= 50) {
        prods.push({ ...base, id:s.id+'-display', name:'Display '+s.name, type:'display' })
        prods.push({ ...base, id:s.id+'-etb', name:'ETB '+s.name, type:'etb' })
      }
      // Sets with 100+ cards get bundle
      if (s.total >= 100) {
        prods.push({ ...base, id:s.id+'-bundle', name:'Coffret '+s.name, type:'bundle' })
      }
    })
    return prods
  }, [sets])

  const eras = useMemo(() => {
    const e = [...new Set(products.map(p=>p.serie))]
    return e.sort((a,b) => {
      const ai = ERA_ORDER.indexOf(a), bi = ERA_ORDER.indexOf(b)
      return (ai===-1?99:ai) - (bi===-1?99:bi)
    })
  }, [products])

  const setsInEra = useMemo(() => {
    if (filEra==='all') return [...new Set(products.map(p=>p.setId))].map(sid => {
      const p = products.find(x=>x.setId===sid)!
      return { id:sid, name:p.setName }
    })
    return [...new Set(products.filter(p=>p.serie===filEra).map(p=>p.setId))].map(sid => {
      const p = products.find(x=>x.setId===sid)!
      return { id:sid, name:p.setName }
    })
  }, [products, filEra])

  const filtered = useMemo(() => {
    let r = products
    if (filType!=='all') r = r.filter(p=>p.type===filType)
    if (filEra!=='all') r = r.filter(p=>p.serie===filEra)
    if (filSet!=='all') r = r.filter(p=>p.setId===filSet)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(p=>p.name.toLowerCase().includes(q)||p.setName.toLowerCase().includes(q)||p.serie.toLowerCase().includes(q))
    }
    if (sort==='name') return [...r].sort((a,b)=>a.name.localeCompare(b.name))
    if (sort==='cards') return [...r].sort((a,b)=>b.total-a.total)
    return [...r].sort((a,b)=>b.year-a.year||a.setName.localeCompare(b.setName))
  }, [products, filType, filEra, filSet, search, sort])

  const pageItems = filtered.slice(0, visible)
  const hasMore = visible < filtered.length

  useEffect(() => { setVisible(CHUNK) }, [filType, filEra, filSet, search, sort])

  useEffect(() => {
    if (!sentinel.current) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visible < filtered.length) setVisible(prev => Math.min(prev + CHUNK, filtered.length))
    }, { rootMargin:'400px' })
    obs.observe(sentinel.current)
    return () => obs.disconnect()
  }, [visible, filtered.length])

  const flag = (l:Lang) => l==='EN'?'\u{1F1FA}\u{1F1F8}':l==='FR'?'\u{1F1EB}\u{1F1F7}':'\u{1F1EF}\u{1F1F5}'
  const stats = useMemo(() => ({
    total: filtered.length,
    sets: new Set(filtered.map(p=>p.setId)).size,
    eras: new Set(filtered.map(p=>p.serie)).size,
  }), [filtered])

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cardIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        .sc { transition:all .2s cubic-bezier(.34,1.2,.64,1) !important; }
        .sc:hover { transform:translateY(-4px) !important; box-shadow:0 12px 32px rgba(0,0,0,.1) !important; border-color:#D2D2D7 !important; }
        .pill { padding:5px 12px; border-radius:99px; border:1px solid #E5E5EA; background:#fff; color:#48484A; font-size:11px; font-weight:500; cursor:pointer; font-family:var(--font-display); transition:all .12s; white-space:nowrap; }
        .pill:hover { border-color:#1D1D1F; background:#F5F5F7; }
        .pill.on { background:#1D1D1F !important; color:#fff !important; border-color:#1D1D1F !important; }
        .srt { padding:5px 11px; border-radius:6px; border:none; background:transparent; color:#86868B; font-size:11px; font-weight:500; cursor:pointer; font-family:var(--font-display); transition:all .12s; }
        .srt:hover { background:#EBEBEB; }
        .srt.on { background:#1D1D1F !important; color:#fff !important; }
        .fsel { height:34px; padding:0 10px; border:1px solid #EBEBEB; border-radius:7px; font-size:12px; outline:none; background:#fff; cursor:pointer; font-family:var(--font-display); color:#555; transition:border-color .15s; }
        .fsel:focus, .fsel:hover { border-color:#BBBBBB; }
      `}</style>

      <div style={{ animation:'fadeIn .25s ease-out', width:'100%' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Cartes</p>
            <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-.5px', margin:'0 0 6px' }}>Scell&#233;s</h1>
            <div style={{ fontSize:'12px', color:'#86868B' }}>
              <strong style={{ color:'#1D1D1F' }}>{stats.total}</strong> produits &#183; <strong style={{ color:'#1D1D1F' }}>{stats.sets}</strong> s&#233;ries &#183; <strong style={{ color:'#1D1D1F' }}>{stats.eras}</strong> blocs
            </div>
          </div>
          <div style={{ background:'#F5F5F5', borderRadius:'12px', padding:'4px', display:'flex', gap:'3px' }}>
            {(['EN','FR','JP'] as Lang[]).map(l => (
              <button key={l} onClick={()=>setLang(l)}
                style={{ padding:'8px 14px', borderRadius:'9px', border:'none', background:lang===l?'#fff':'transparent', color:lang===l?'#111':'#888', fontFamily:'var(--font-display)', fontWeight:lang===l?700:500, fontSize:'13px', cursor:'pointer', boxShadow:lang===l?'0 2px 8px rgba(0,0,0,.1)':'none', display:'flex', alignItems:'center', gap:'6px' }}>
                <span>{flag(l)}</span><span>{l==='EN'?'English':l==='FR'?'Fran\u00e7ais':'\u65E5\u672C\u8A9E'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search + Sort */}
        <div style={{ display:'flex', gap:'10px', marginBottom:'14px', flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative', flex:1, minWidth:'200px' }}>
            <span style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)', color:'#CCC', fontSize:'15px', pointerEvents:'none' }}>{String.fromCharCode(8981)}</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un produit scell&#233;..."
              style={{ width:'100%', height:'38px', padding:'0 12px 0 32px', border:'1px solid #EBEBEB', borderRadius:'9px', fontSize:'13px', color:'#111', outline:'none', background:'#fff', fontFamily:'var(--font-sans)', boxSizing:'border-box' }} />
          </div>
          <div style={{ display:'flex', gap:'3px', background:'#F5F5F5', borderRadius:'9px', padding:'3px' }}>
            {([['recent','R\u00e9cent'],['name','Nom'],['cards','Cartes']] as ['recent'|'name'|'cards',string][]).map(([k,l])=>(
              <button key={k} onClick={()=>setSort(k)} className={`srt${sort===k?' on':''}`}>{l}</button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'18px', flexWrap:'wrap', alignItems:'center', position:'sticky', top:0, zIndex:30, background:'rgba(255,255,255,.92)', backdropFilter:'blur(8px)', padding:'10px 0' }}>
          <select className="fsel" value={filEra} onChange={e=>{setFilEra(e.target.value);setFilSet('all')}} style={{ color:filEra!=='all'?'#111':'#AAA' }}>
            <option value="all">Tous les blocs</option>
            {eras.map(e=><option key={e} value={e}>{e}</option>)}
          </select>
          <select className="fsel" value={filSet} onChange={e=>setFilSet(e.target.value)} style={{ maxWidth:'220px', color:filSet!=='all'?'#111':'#AAA' }}>
            <option value="all">Toutes les s&#233;ries ({setsInEra.length})</option>
            {setsInEra.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div style={{ width:'1px', height:'24px', background:'#EBEBEB' }}/>
          {(['all','booster','display','etb','bundle'] as ('all'|ProductType)[]).map(t=>{
            const meta = t==='all'?null:TYPE_META[t]
            return <button key={t} onClick={()=>setFilType(t)} className={`pill${filType===t?' on':''}`}>{meta?meta.icon+' '+meta.label:'Tous'}</button>
          })}
          {(filEra!=='all'||filSet!=='all'||filType!=='all'||search)&&(
            <button onClick={()=>{setFilEra('all');setFilSet('all');setFilType('all');setSearch('')}}
              style={{ height:'30px', padding:'0 12px', borderRadius:'7px', border:'1px solid #EBEBEB', background:'#fff', color:'#888', fontSize:'11px', cursor:'pointer', fontFamily:'var(--font-display)' }}>
              &#x2715; Effacer
            </button>
          )}
          <span style={{ fontSize:'11px', color:'#AEAEB2', marginLeft:'auto', fontFamily:'var(--font-display)' }}>{filtered.length} produits</span>
        </div>

        {/* Set header when filtered */}
        {filSet!=='all'&&(()=>{
          const s = sets.find(x=>x.id===filSet)
          return s ? (
            <div style={{ background:'linear-gradient(135deg,#FAFAFA,#F0F0F2)', border:'1px solid #E5E5EA', borderRadius:'16px', padding:'20px 24px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'24px' }}>
              {s.logo&&<img src={s.logo} alt="" style={{ height:'48px', maxWidth:'200px', objectFit:'contain' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
              <div>
                <div style={{ fontSize:'18px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)' }}>{s.name}</div>
                {s.serie&&<div style={{ fontSize:'11px', color:'#86868B', fontFamily:'var(--font-display)' }}>{s.serie} &#183; {s.releaseDate?.slice(0,4)} &#183; {s.total} cartes</div>}
              </div>
            </div>
          ) : null
        })()}

        {/* Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'14px' }}>
          {pageItems.map((item,idx)=>{
            const tm = TYPE_META[item.type]
            const eraColor = ERA_COLORS[item.serie]||'#888'
            return (
              <div key={item.id} className="sc"
                onClick={()=>setSelProduct(selProduct?.id===item.id?null:item)}
                style={{ background:'#fff', border:`1.5px solid ${selProduct?.id===item.id?'#1D1D1F':'#EBEBEB'}`, borderRadius:'16px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,.04)', cursor:'pointer', animation:`cardIn .25s ${Math.min(idx,15)*.025}s ease-out both` }}>
                {/* Header with logo */}
                <div style={{ height:'90px', background:'linear-gradient(135deg,#F8F8FA,#F0F0F2)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                  {item.logo ? (
                    <img src={item.logo} alt="" style={{ height:'40px', maxWidth:'160px', objectFit:'contain', position:'relative', zIndex:1 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                  ) : (
                    <div style={{ fontSize:'14px', fontWeight:700, color:'#AEAEB2', fontFamily:'var(--font-display)', zIndex:1, textAlign:'center', padding:'0 16px' }}>{item.setName}</div>
                  )}
                  {/* Large watermark */}
                  <div style={{ position:'absolute', fontSize:'64px', fontWeight:800, color:'rgba(0,0,0,.03)', letterSpacing:'-3px', userSelect:'none' }}>{tm.label.toUpperCase()}</div>
                  {/* Type badge */}
                  <div style={{ position:'absolute', top:'8px', left:'8px' }}>
                    <span style={{ fontSize:'9px', background:tm.bg, color:tm.fg, border:`1px solid ${tm.border}`, padding:'2px 7px', borderRadius:'5px', fontWeight:600, fontFamily:'var(--font-display)' }}>{tm.icon} {tm.label}</span>
                  </div>
                  {/* Year badge */}
                  <div style={{ position:'absolute', top:'8px', right:'8px' }}>
                    <span style={{ fontSize:'9px', background:'rgba(255,255,255,.8)', color:'#86868B', padding:'2px 7px', borderRadius:'5px', fontWeight:600, fontFamily:'var(--font-display)', backdropFilter:'blur(4px)' }}>{item.year}</span>
                  </div>
                  {/* Era color bar */}
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'3px', background:`linear-gradient(90deg,${eraColor},${eraColor}80,transparent)` }}/>
                </div>

                <div style={{ padding:'14px' }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)', marginBottom:'3px', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                  <div style={{ fontSize:'10px', color:'#AEAEB2', marginBottom:'10px', display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ display:'inline-block', width:'8px', height:'8px', borderRadius:'50%', background:eraColor, flexShrink:0 }}/>{item.serie} &#183; {item.total} cartes dans le set
                  </div>
                  <div style={{ display:'flex', gap:'6px' }}>
                    <div style={{ flex:1, background:'#F5F5F7', borderRadius:'8px', padding:'8px 10px' }}>
                      <div style={{ fontSize:'8px', color:'#AEAEB2', textTransform:'uppercase', letterSpacing:'.06em', fontFamily:'var(--font-display)', marginBottom:'2px' }}>Contenu</div>
                      <div style={{ fontSize:'14px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-data)' }}>{tm.cards} cartes</div>
                    </div>
                    <div style={{ flex:1, background:'#F5F5F7', borderRadius:'8px', padding:'8px 10px' }}>
                      <div style={{ fontSize:'8px', color:'#AEAEB2', textTransform:'uppercase', letterSpacing:'.06em', fontFamily:'var(--font-display)', marginBottom:'2px' }}>Set total</div>
                      <div style={{ fontSize:'14px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-data)' }}>{item.total}</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={sentinel} style={{ display:'flex', justifyContent:'center', padding:'32px 0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', color:'#AEAEB2', fontSize:'12px', fontFamily:'var(--font-display)' }}>
              <div style={{ width:'16px', height:'16px', border:'2px solid #E5E5EA', borderTop:'2px solid #86868B', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
              Chargement...
            </div>
          </div>
        )}
        {!hasMore && filtered.length > CHUNK && (
          <div style={{ textAlign:'center', padding:'20px 0', color:'#AEAEB2', fontSize:'11px', fontFamily:'var(--font-display)' }}>
            {filtered.length} produits affich&#233;s
          </div>
        )}
        {filtered.length===0 && sets.length>0 && (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:'48px', opacity:.15, marginBottom:'16px' }}>{String.fromCharCode(128230)}</div>
            <div style={{ fontSize:'16px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)', marginBottom:'6px' }}>Aucun produit trouv&#233;</div>
            <div style={{ fontSize:'13px', color:'#86868B', marginBottom:'16px' }}>Essayez avec d'autres filtres.</div>
            <button onClick={()=>{setFilEra('all');setFilSet('all');setFilType('all');setSearch('')}}
              style={{ padding:'8px 16px', borderRadius:'8px', background:'#1D1D1F', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
              Effacer les filtres
            </button>
          </div>
        )}
      </div>
    </>
  )
}