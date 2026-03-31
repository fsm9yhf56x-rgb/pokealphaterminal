'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { fetchSets, fetchAllCards, fetchCardDetail, type TCGCard, type TCGCardFull } from '@/lib/tcgApi'

const TC: Record<string,string> = {
  Fire:'#FF6B35', Water:'#42A5F5', Psychic:'#C855D4', Darkness:'#7E57C2',
  Lightning:'#D4A800', Grass:'#3DA85A', Colorless:'#AAAAAA', Fighting:'#C97840',
  Metal:'#8090A8', Dragon:'#9060A0', Fairy:'#FF88AA',
}

const ERA_ORDER = ['Original (WotC)','EX','DP / Platinum','Black & White','XY','Sun & Moon','Sword & Shield','Scarlet & Violet','Autre']

const ERA_PREFIX: [string, string][] = [
  ['base','Original (WotC)'],['jungle','Original (WotC)'],['fossil','Original (WotC)'],
  ['teamrocket','Original (WotC)'],['gym','Original (WotC)'],['neo','Original (WotC)'],
  ['si','Original (WotC)'],['lc','Original (WotC)'],['ecard','Original (WotC)'],
  ['expedition','Original (WotC)'],['aquapolis','Original (WotC)'],['skyridge','Original (WotC)'],
  ['ex','EX'],['pop','EX'],
  ['dp','DP / Platinum'],['pl','DP / Platinum'],['pt','DP / Platinum'],['hgss','DP / Platinum'],
  ['bw','Black & White'],['dv','Black & White'],
  ['xy','XY'],['g1','XY'],['dc','XY'],
  ['sm','Sun & Moon'],['det','Sun & Moon'],['tg','Sun & Moon'],
  ['swsh','Sword & Shield'],['cel','Sword & Shield'],['pgo','Sword & Shield'],
  ['sv','Scarlet & Violet'],
]

function setIdToEra(setId:string): string {
  const low = setId.toLowerCase()
  for (const [prefix, era] of ERA_PREFIX) {
    if (low.startsWith(prefix)) return era
  }
  return 'Autre'
}

function yearToEra(y:number): string {
  if (!y)      return 'Autre'
  if (y<=2003) return 'Original (WotC)'
  if (y<=2006) return 'EX'
  if (y<=2010) return 'DP / Platinum'
  if (y<=2013) return 'Black & White'
  if (y<=2016) return 'XY'
  if (y<=2019) return 'Sun & Moon'
  if (y<=2022) return 'Sword & Shield'
  return 'Scarlet & Violet'
}

type Lang     = 'EN'|'FR'|'JP'
type SortKey  = 'set'|'name'
type ViewMode = 'grid'|'list'

interface EnrichedCard extends TCGCard {
  setId:string; setName:string; year:number; era:string; enName?:string; enImage?:string
}

const PER_PAGE = 60
const LC_MAP: Record<Lang,string> = { EN:'en', FR:'fr', JP:'ja' }

function cardImageUrl(card: EnrichedCard, lang: Lang): string|null {
  if (card.image) return card.image
  if (lang === 'JP' && card.enImage) return card.enImage
  return null
}

export function Encyclopedie() {
  const router = useRouter()

  const [lang,       setLang]        = useState<Lang>('FR')
  const [allCards,   setAllCards]    = useState<EnrichedCard[]>([])
  const [loading,    setLoading]     = useState(false)
  const [loadErr,    setLoadErr]     = useState(false)
  const [loadMsg,    setLoadMsg]     = useState('')

  const [search,     setSearch]      = useState('')
  const [filEra,     setFilEra]      = useState('all')
  const [filSet,     setFilSet]      = useState('all')
  const [sort,       setSort]        = useState<SortKey>('set')
  const [view,       setView]        = useState<ViewMode>('grid')
  const [page,       setPage]        = useState(0)

  const [cardSize,   setCardSize]    = useState<'S'|'M'|'L'>('M')
  const [lightbox,   setLightbox]    = useState<EnrichedCard|null>(null)
  const [selId,      setSelId]       = useState<string|null>(null)
  const [detail,     setDetail]      = useState<TCGCardFull|null>(null)
  const [detLoading, setDetLoading]  = useState(false)
  const [enDetail,   setEnDetail]    = useState<TCGCardFull|null>(null)

  useEffect(() => {
    setLoading(true); setLoadErr(false); setLoadMsg('Chargement des séries…')
    setAllCards([]); setFilSet('all'); setFilEra('all')
    setPage(0); setSelId(null); setDetail(null); setEnDetail(null)

    const setsP = fetchSets(lang)
    const cardsP = fetchAllCards(lang)
    const enCardsP = lang==='JP' ? fetchAllCards('EN').catch(()=>[]) : Promise.resolve([])

    Promise.all([setsP, cardsP, enCardsP])
      .then(([sets, cards, enCards]) => {
        const setMap   = new Map(sets.map(s=>[s.id,s]))
        // Map EN par localId+setId pour la traduction
        const enMap    = new Map<string, string>()
        enCards.forEach(c => {
          const sid = c.id.substring(0, c.id.lastIndexOf('-')) || c.id
          enMap.set(`${sid}-${c.localId}`, c.name)
        })
        const enImgMap = new Map<string, string>()
        enCards.forEach(c => { const sid = c.id.substring(0, c.id.lastIndexOf('-')) || c.id; if (c.image) enImgMap.set(`${sid}-${c.localId}`, c.image) })
        const enriched: EnrichedCard[] = cards.map(c => {
          const setId  = c.id.substring(0, c.id.lastIndexOf('-')) || c.id
          const set    = setMap.get(setId)
          const year   = set?.releaseDate ? parseInt(set.releaseDate.slice(0,4))||0 : 0
          const era    = setIdToEra(setId) !== 'Autre' ? setIdToEra(setId) : yearToEra(year)
          const enName  = lang==='JP' ? enMap.get(`${setId}-${c.localId}`) : undefined
          const enImage = lang==='JP' ? enImgMap.get(`${setId}-${c.localId}`) : undefined
          return { ...c, setId, setName: set?.name ?? setId, year, era, enName, enImage }
        })
        setAllCards(enriched); setLoadMsg(''); setLoading(false)
      })
      .catch(() => { setLoadErr(true); setLoading(false) })
  }, [lang])

  const eras = useMemo(() =>
    [...new Set(allCards.map(c=>c.era))].sort((a,b)=>ERA_ORDER.indexOf(a)-ERA_ORDER.indexOf(b))
  , [allCards])

  const sets = useMemo(() => {
    const base = filEra==='all' ? allCards : allCards.filter(c=>c.era===filEra)
    const map  = new Map<string,{id:string;name:string;count:number}>()
    base.forEach(c => {
      if (!map.has(c.setId)) map.set(c.setId,{id:c.setId,name:c.setName,count:0})
      map.get(c.setId)!.count++
    })
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name))
  }, [allCards, filEra])

  useEffect(() => { setFilSet('all'); setPage(0) }, [filEra])
  useEffect(() => { setPage(0) }, [search, filSet, sort])

  const filtered = useMemo(() => {
    let r = allCards
    if (filEra!=='all') r = r.filter(c=>c.era===filEra)
    if (filSet!=='all') r = r.filter(c=>c.setId===filSet)
    if (search) {
      const q=search.toLowerCase()
      r = r.filter(c=>c.name.toLowerCase().includes(q)||c.setName.toLowerCase().includes(q)||c.localId===q)
    }
    return sort==='name'
      ? [...r].sort((a,b)=>a.name.localeCompare(b.name))
      : [...r].sort((a,b)=>(b.year-a.year)||a.setName.localeCompare(b.setName)||parseInt(a.localId)-parseInt(b.localId))
  }, [allCards, filEra, filSet, search, sort])

  const pageCount = Math.ceil(filtered.length/PER_PAGE)||1
  const pageCards = filtered.slice(page*PER_PAGE, (page+1)*PER_PAGE)

  const handleCardClick = useCallback(async (id:string) => {
    if (selId===id) { setSelId(null); setDetail(null); setEnDetail(null); return }
    setSelId(id); setDetail(null); setEnDetail(null); setDetLoading(true)
    const d = await fetchCardDetail(lang, id)
    setDetail(d); setDetLoading(false)
    if (lang==='JP') fetchCardDetail('EN', id).then(d=>{ if(d) setEnDetail(d) }).catch(()=>{})
  }, [selId, lang])

  const selCard = allCards.find(c=>c.id===selId)
  const flag = (l:Lang) => l==='EN'?'🇺🇸':l==='FR'?'🇫🇷':'🇯🇵'

  return (
    <>
      <style>{`
        @keyframes fadeIn    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cardIn    { from{opacity:0;transform:scale(.93) translateY(6px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slideIn   { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes shimmer   { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes imgReveal { from{opacity:0;transform:scale(1.04)} to{opacity:1;transform:scale(1)} }
        @keyframes panelIn   { from{opacity:0;transform:translateX(14px) scale(.98)} to{opacity:1;transform:translateX(0) scale(1)} }
        @keyframes holoMove  { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes selPulse  { 0%,100%{box-shadow:0 0 0 2px rgba(0,0,0,.12)} 50%{box-shadow:0 0 0 3px rgba(0,0,0,.22),0 8px 28px rgba(0,0,0,.12)} }
        @keyframes langBounce{ 0%{transform:scale(1)} 40%{transform:scale(1.18)} 70%{transform:scale(.95)} 100%{transform:scale(1)} }
        @keyframes lbIn  { from{opacity:0;transform:scale(.88) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes lbBg  { from{opacity:0} to{opacity:1} }
        .lb-card { animation: lbIn .32s cubic-bezier(.34,1.2,.64,1); }
        .lb-bg   { animation: lbBg .22s ease-out; }
        .lb-close { transition: all .15s; border-radius:50%; }
        .lb-close:hover { background:rgba(255,255,255,.15) !important; transform:scale(1.1); }
        .zoom-btn { transition: all .18s cubic-bezier(.34,1.4,.64,1); }
        .zoom-btn:hover { transform: scale(1.08); opacity:1 !important; }
        .zoom-btn:active { transform: scale(.95); }

        .enc-card {
          transition: transform .22s cubic-bezier(.34,1.4,.64,1), box-shadow .22s ease, border-color .18s ease;
          border-radius: 12px; overflow: hidden; cursor: pointer; position: relative;
        }
        .enc-card::after {
          content:''; position:absolute; inset:0; border-radius:12px; pointer-events:none;
          background: linear-gradient(115deg, rgba(255,255,255,0) 40%, rgba(255,255,255,.18) 50%, rgba(255,255,255,0) 60%);
          opacity: 0; transition: opacity .25s;
        }
        .enc-card:hover { transform: translateY(-5px) scale(1.02); box-shadow: 0 12px 32px rgba(0,0,0,.13) !important; }
        .enc-card:hover .zoom-btn { opacity: 1 !important; }
        .enc-card:hover::after { opacity: 1; }
        .enc-card:hover .card-img { transform: scale(1.06); }
        .enc-card.sel { animation: selPulse 2s ease-in-out infinite; border-color: #111 !important; }
        .enc-card.sel::before {
          content:''; position:absolute; inset:0; border-radius:12px; pointer-events:none; z-index:1;
          background: linear-gradient(135deg,rgba(255,220,100,.13),rgba(160,100,255,.1),rgba(100,200,255,.12));
          background-size:300% 300%; animation: holoMove 4s ease infinite;
        }
        .card-img { transition: transform .35s cubic-bezier(.34,1.2,.64,1); will-change:transform; }
        .card-img-loaded { animation: imgReveal .3s ease-out; }

        .enc-card .card-name {
          transition: color .15s;
        }
        .enc-card:hover .card-name { color: #000 !important; }

        .srt { padding:5px 10px; border-radius:6px; border:none; background:transparent; color:#666; font-size:11px; font-weight:500; cursor:pointer; transition:all .12s; font-family:var(--font-display); }
        .srt:hover { background:#EBEBEB; }
        .srt.on { background:#111 !important; color:#fff !important; }
        .rh { transition: background .12s; cursor:pointer; }
        .rh:hover { background:#F7F7F7 !important; }
        .rh:hover .rh-name { font-weight:600 !important; }

        .shimmer { background:linear-gradient(90deg,#F2F2F2 25%,#E8E8E8 50%,#F2F2F2 75%); background-size:800px 100%; animation:shimmer 1.4s infinite; }

        .pgbtn { padding:6px 12px; border-radius:7px; border:1px solid #E8E8E8; background:#fff; color:#555; font-size:12px; cursor:pointer; font-family:var(--font-display); transition:all .12s; }
        .pgbtn:disabled { color:#DDD; cursor:default; border-color:#F0F0F0; }
        .pgbtn:not(:disabled):hover { background:#F5F5F5; transform:scale(1.04); }

        .fsel { height:34px; padding:0 10px; border:1px solid #EBEBEB; border-radius:7px; font-size:12px; outline:none; background:#fff; cursor:pointer; font-family:var(--font-display); color:#555; transition:border-color .15s; }
        .fsel:focus, .fsel:hover { border-color:#BBBBBB; }

        .lang-btn { transition: all .2s cubic-bezier(.34,1.4,.64,1) !important; }
        .lang-btn:active { animation: langBounce .35s ease-out; }

        .detail-panel { animation: panelIn .28s cubic-bezier(.34,1.2,.64,1); }
        .attack-row { transition: background .12s; border-radius:8px; }
        .attack-row:hover { background:#F0F0F0 !important; }

        .add-btn { transition: all .18s cubic-bezier(.34,1.4,.64,1) !important; }
        .add-btn:hover { transform: translateY(-1px) scale(1.02) !important; box-shadow:0 4px 14px rgba(0,0,0,.18) !important; }
        .add-btn:active { transform: scale(.97) !important; }
      `}</style>

      <div style={{ animation:'fadeIn .25s ease-out', width:'100%', display:'flex', gap:'20px' }}>

        {/* ── MAIN ── */}
        <div style={{ flex:1, minWidth:0 }}>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
            <div>
              <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Cartes</p>
              <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-.5px', margin:'0 0 5px' }}>Encyclopédie</h1>
              <div style={{ fontSize:'12px', color:'#888', minHeight:'18px', display:'flex', alignItems:'center', gap:'6px' }}>
                {loading ? (
                  <>
                    <div style={{ position:'relative', width:'14px', height:'14px', flexShrink:0 }}>
                      <div style={{ position:'absolute', inset:0, border:'1.5px solid #EEE', borderTop:'1.5px solid #555', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                      <div style={{ position:'absolute', inset:'3px', borderRadius:'50%', background:'#999' }}/>
                    </div>
                    <span style={{ color:'#AAA' }}>{loadMsg}</span>
                  </>
                ) : loadErr ? (
                  <span style={{ color:'#E03020' }}>
                    Erreur de chargement —{' '}
                    <button onClick={()=>setLang(l=>l)} style={{ color:'#E03020', textDecoration:'underline', background:'none', border:'none', cursor:'pointer', fontSize:'12px', padding:0 }}>Réessayer</button>
                  </span>
                ) : (
                  <span><strong style={{ color:'#111' }}>{filtered.length.toLocaleString('fr-FR')}</strong> cartes · <strong style={{ color:'#111' }}>{allCards.length.toLocaleString('fr-FR')}</strong> au total</span>
                )}
              </div>
            </div>

            {/* Language selector */}
            <div style={{ background:'#F5F5F5', borderRadius:'12px', padding:'4px', display:'flex', gap:'3px', flexShrink:0 }}>
              {(['EN','FR','JP'] as Lang[]).map(l => (
                <button key={l} onClick={()=>setLang(l)} className="lang-btn"
                  style={{ padding:'8px 14px', borderRadius:'9px', border:'none', background:lang===l?'#fff':'transparent', color:lang===l?'#111':'#888', fontFamily:'var(--font-display)', fontWeight:lang===l?700:500, fontSize:'13px', cursor:'pointer', boxShadow:lang===l?'0 2px 8px rgba(0,0,0,.1)':'none', display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
                  <span>{flag(l)}</span>
                  <span>{l==='EN'?'English':l==='FR'?'Français':'日本語'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search + sort + view */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:1, minWidth:'200px' }}>
              <span style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)', color:'#CCC', fontSize:'15px', pointerEvents:'none' }}>⌕</span>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder={lang==='JP' ? 'Nom de la carte (japonais)…' : 'Rechercher une carte, un set…'}
                style={{ width:'100%', height:'38px', padding:'0 32px', border:'1px solid #EBEBEB', borderRadius:'9px', fontSize:'13px', color:'#111', outline:'none', background:'#fff', boxSizing:'border-box' as const, fontFamily:'var(--font-sans)' }}/>
              {search && (
                <button onClick={()=>setSearch('')} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#CCC', cursor:'pointer', fontSize:'16px', padding:0, lineHeight:1 }}>×</button>
              )}
            </div>
            <div style={{ display:'flex', gap:'3px', background:'#F5F5F5', borderRadius:'9px', padding:'3px', flexShrink:0 }}>
              {([['set','Par série'],['name','A–Z']] as [SortKey,string][]).map(([k,l])=>(
                <button key={k} onClick={()=>setSort(k)} className={`srt${sort===k?' on':''}`}>{l}</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:'2px', background:'#F5F5F5', borderRadius:'9px', padding:'3px', flexShrink:0 }}>
              {(['grid','list'] as ViewMode[]).map(v=>(
                <button key={v} onClick={()=>setView(v)} style={{ width:'34px', height:'32px', borderRadius:'7px', border:'none', background:view===v?'#111':'transparent', color:view===v?'#fff':'#888', fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .12s' }}>
                  {v==='grid'?'⊞':'☰'}
                </button>
              ))}
            </div>
            {view==='grid' && (
              <div style={{ display:'flex', gap:'2px', background:'#F5F5F5', borderRadius:'9px', padding:'3px', flexShrink:0 }}>
                {(['S','M','L'] as const).map(sz=>(
                  <button key={sz} onClick={()=>setCardSize(sz)}
                    style={{ width:'30px', height:'32px', borderRadius:'7px', border:'none', background:cardSize===sz?'#111':'transparent', color:cardSize===sz?'#fff':'#888', fontSize:'10px', fontWeight:700, cursor:'pointer', transition:'all .12s', fontFamily:'var(--font-display)', letterSpacing:'.05em' }}>
                    {sz}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'18px', flexWrap:'wrap', alignItems:'center' }}>
            <select className="fsel" value={filEra} onChange={e=>setFilEra(e.target.value)}>
              <option value="all">Toutes les ères</option>
              {eras.map(e=><option key={e} value={e}>{e}</option>)}
            </select>

            <select className="fsel" value={filSet} onChange={e=>setFilSet(e.target.value)} disabled={loading}
              style={{ maxWidth:'220px', color:filSet==='all'?'#AAA':'#111' }}>
              <option value="all">Toutes les séries{sets.length>0?` (${sets.length})`:''}</option>
              {sets.map(s=><option key={s.id} value={s.id}>{s.name} ({s.count})</option>)}
            </select>

            {(filEra!=='all'||filSet!=='all'||search) && (
              <button onClick={()=>{ setFilEra('all'); setFilSet('all'); setSearch(''); setPage(0) }}
                style={{ height:'34px', padding:'0 12px', borderRadius:'7px', border:'1px solid #EBEBEB', background:'#fff', color:'#888', fontSize:'12px', cursor:'pointer', fontFamily:'var(--font-display)', display:'flex', alignItems:'center', gap:'4px' }}>
                ✕ Effacer
              </button>
            )}

            {!loading && filtered.length>0 && (
              <span style={{ fontSize:'11px', color:'#CCC', marginLeft:'auto' }}>
                Page {page+1} / {pageCount}
              </span>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign:'center', padding:'80px 20px' }}>
              <div style={{ position:'relative', width:'44px', height:'44px', margin:'0 auto 16px' }}>
                <div style={{ position:'absolute', inset:0, border:'3px solid #F0F0F0', borderTop:'3px solid #111', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
                <div style={{ position:'absolute', inset:'5px', border:'2px solid #F5F5F5', borderBottom:'2px solid #CCCCCC', borderRadius:'50%', animation:'spin 1.4s linear infinite reverse' }}/>
                <div style={{ position:'absolute', inset:'10px', borderRadius:'50%', background:'#111' }}/>
              </div>
              <div style={{ fontSize:'13px', color:'#666', fontFamily:'var(--font-display)', fontWeight:500, marginBottom:'5px' }}>{loadMsg}</div>
              <div style={{ fontSize:'11px', color:'#CCC' }}>Mise en cache pour les prochaines visites</div>
            </div>
          )}

          {/* GRID */}
          {!loading && !loadErr && view==='grid' && (()=>{
            const cfg = {
              S:{ col:'repeat(auto-fill,minmax(130px,1fr))', imgH:'108px', nameSize:'11px', subSize:'9px',  pad:'8px 9px 9px'  },
              M:{ col:'repeat(auto-fill,minmax(185px,1fr))', imgH:'160px', nameSize:'13px', subSize:'10px', pad:'10px 12px 12px'},
              L:{ col:'repeat(auto-fill,minmax(240px,1fr))', imgH:'220px', nameSize:'14px', subSize:'11px', pad:'12px 14px 14px'},
            }[cardSize]
            return (
              <div style={{ display:'grid', gridTemplateColumns:cfg.col, gap: cardSize==='L'?'16px':'12px' }}>
                {pageCards.map((card,idx) => {
                  const isSel = selId===card.id
                  const base  = cardImageUrl(card, lang)
                  const img   = base ? `${base}/low.webp` : null
                  return (
                    <div key={card.id}
                      className={`enc-card${isSel?' sel':''}`}
                      onClick={()=>handleCardClick(card.id)}
                      style={{ background:'#fff', border:`1.5px solid ${isSel?'#111':'#EBEBEB'}`, boxShadow:isSel?'0 8px 28px rgba(0,0,0,.1)':'0 2px 8px rgba(0,0,0,.04)', animation:`cardIn .22s ${Math.min(idx,24)*.018}s ease-out both` }}>
                      <div style={{ height:cfg.imgH, background:'linear-gradient(145deg,#F6F6F6,#EEEEEE)', position:'relative', overflow:'hidden' }}>
                        {img ? (
                          <img src={img} alt={card.name}
                            className="card-img"
                            style={{ width:'100%', height:'100%', objectFit:'contain', display:'block', padding: cardSize==='L'?'6px':'3px', boxSizing:'border-box' as const }}
                            onLoad={e=>{ (e.target as HTMLImageElement).classList.add('card-img-loaded') }}
                            onError={e=>{ const t=e.target as HTMLImageElement; if(t.src.includes('.webp')){ t.src=`${base}/low.jpg` } else if(t.src.includes('.jpg')){ t.src=`${base}/low.png` } else { t.closest('.enc-card-img-wrap')?.classList.add('img-failed'); t.style.display='none' } }}/>
                        ) : (
                          <div style={{ position:'absolute', inset:0, background:'linear-gradient(145deg,#F5F5F5,#EEEEEE)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'4px' }}>
                            <div style={{ fontSize:cardSize==='S'?'18px':'24px', opacity:.2 }}>🎴</div>
                            {lang==='JP' && cardSize!=='S' && <div style={{ fontSize:'8px', color:'#CCC', fontFamily:'var(--font-display)', textAlign:'center' as const, lineHeight:1.4 }}>Image JP{String.fromCharCode(10)}non disponible</div>}
                          </div>
                        )}
                        <div style={{ position:'absolute', bottom:'5px', right:'6px', fontSize: cardSize==='S'?'10px':'11px', background:'rgba(255,255,255,.92)', borderRadius:'4px', padding:'1px 5px', boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
                          {flag(lang)}
                        </div>
                        <button className="zoom-btn" onClick={e=>{ e.stopPropagation(); setLightbox(card) }}
                          style={{ position:'absolute', top:'6px', left:'6px', width:'26px', height:'26px', borderRadius:'7px', background:'rgba(0,0,0,.45)', border:'none', color:'#fff', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity .15s', backdropFilter:'blur(4px)' }}
                          onMouseEnter={e=>(e.currentTarget.style.opacity='1')}
                          onMouseLeave={e=>(e.currentTarget.style.opacity='0')}>
                          🔍
                        </button>
                        {cardSize==='L' && isSel && (
                          <div style={{ position:'absolute', top:'7px', left:'7px', width:'8px', height:'8px', borderRadius:'50%', background:'#111', boxShadow:'0 0 0 2px #fff' }}/>
                        )}
                      </div>
                      <div style={{ padding:cfg.pad }}>
                        <div className="card-name" style={{ fontSize:cfg.nameSize, fontWeight:600, color:'#111', fontFamily:'var(--font-display)', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, lineHeight:1.3 }}>
                          {card.name}
                        </div>
                        <div style={{ fontSize:cfg.subSize, color:'#BBBBBB', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
                          {card.setName}
                          {cardSize!=='S' && <span style={{ fontFamily:'monospace', marginLeft:'4px' }}>#{card.localId}</span>}
                        </div>
                        {lang==='JP' && card.enName && cardSize!=='S' && (
                          <div style={{ fontSize:'9px', color:'#BBBBBB', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, fontStyle:'italic', display:'flex', alignItems:'center', gap:'3px' }}>
                            <span style={{ fontSize:'8px' }}>🇺🇸</span>
                            <span>{card.enName}</span>
                          </div>
                        )}
                        {cardSize==='L' && (
                          <button
                            onClick={e=>{ e.stopPropagation(); handleCardClick(card.id) }}
                            className="add-btn"
                            style={{ marginTop:'10px', width:'100%', padding:'7px', borderRadius:'7px', background:isSel?'#111':'#F5F5F5', color:isSel?'#fff':'#555', border:'none', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                            {isSel ? '✓ Sélectionnée' : 'Voir la carte'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {pageCards.length===0 && (
                  <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px', color:'#AAA', fontSize:'13px', fontFamily:'var(--font-display)' }}>
                    Aucune carte ne correspond à votre recherche
                  </div>
                )}
              </div>
            )
          })()}

          {/* LIST */}
          {!loading && !loadErr && view==='list' && (
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'minmax(0,2.5fr) minmax(0,1.5fr) 60px', padding:'9px 16px', background:'#FAFAFA', borderBottom:'1px solid #F0F0F0' }}>
                {['Carte','Série','N°'].map((h,i)=>(
                  <div key={i} style={{ fontSize:'10px', fontWeight:600, color:'#AAA', textTransform:'uppercase' as const, letterSpacing:'.07em', fontFamily:'var(--font-display)', textAlign:i===2?'right' as const:'left' as const }}>{h}</div>
                ))}
              </div>
              {pageCards.map((card,i) => {
                const isSel = selId===card.id
                const img   = card.image ? `${card.image}/low.webp` : null
                return (
                  <div key={card.id} className="rh"
                    onClick={()=>handleCardClick(card.id)}
                    style={{ display:'grid', gridTemplateColumns:'minmax(0,2.5fr) minmax(0,1.5fr) 60px', padding:'10px 16px', borderBottom:i<pageCards.length-1?'1px solid #F8F8F8':'none', alignItems:'center', background:isSel?'#F8F8F8':'transparent', borderLeft:isSel?'3px solid #111':'3px solid transparent', transition:'all .1s' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
                      <div style={{ width:'30px', height:'42px', flexShrink:0, borderRadius:'4px', overflow:'hidden', background:'#F5F5F5' }}>
                        {img && <img src={img} alt={card.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} onError={e=>{ (e.target as HTMLImageElement).style.display='none' }}/>}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:'13px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{card.name}</div>
                        <div style={{ fontSize:'10px', color:'#CCC' }}>{flag(lang)} {lang}</div>
                      </div>
                    </div>
                    <div style={{ fontSize:'11px', color:'#888', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{card.setName}</div>
                    <div style={{ fontSize:'11px', color:'#AAA', fontFamily:'monospace', textAlign:'right' as const }}>#{card.localId}</div>
                  </div>
                )
              })}
              {pageCards.length===0 && (
                <div style={{ padding:'40px', textAlign:'center', color:'#AAA', fontSize:'13px', fontFamily:'var(--font-display)' }}>Aucune carte trouvée</div>
              )}
            </div>
          )}

          {/* Pagination */}
          {!loading && !loadErr && pageCount>1 && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'5px', marginTop:'24px' }}>
              <button className="pgbtn" disabled={page===0} onClick={()=>setPage(0)}>«</button>
              <button className="pgbtn" disabled={page===0} onClick={()=>setPage(p=>p-1)}>‹</button>
              {Array.from({length:Math.min(7,pageCount)}, (_,i) => {
                const mid = Math.min(Math.max(page,3), pageCount-4)
                const p   = pageCount<=7 ? i : Math.max(0, mid-3+i)
                return p<pageCount ? (
                  <button key={p} onClick={()=>setPage(p)}
                    style={{ width:'32px', height:'32px', borderRadius:'7px', border:`1px solid ${p===page?'#111':'#E8E8E8'}`, background:p===page?'#111':'#fff', color:p===page?'#fff':'#555', cursor:'pointer', fontSize:'12px', fontFamily:'var(--font-display)', transition:'all .1s' }}>
                    {p+1}
                  </button>
                ) : null
              })}
              <button className="pgbtn" disabled={page>=pageCount-1} onClick={()=>setPage(p=>p+1)}>›</button>
              <button className="pgbtn" disabled={page>=pageCount-1} onClick={()=>setPage(pageCount-1)}>»</button>
            </div>
          )}

        </div>

        {/* ── DETAIL PANEL ── */}
        {selId && (
          <div className="detail-panel" style={{ width:'285px', flexShrink:0 }}>
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'16px', overflow:'hidden', position:'sticky', top:'20px', maxHeight:'90vh', overflowY:'auto' as const, boxShadow:'0 8px 32px rgba(0,0,0,.07)' }}>

              {detLoading ? (
                <div style={{ padding:'50px 20px', textAlign:'center' }}>
                  <div style={{ width:'20px', height:'20px', border:'2px solid #EBEBEB', borderTop:'2px solid #111', borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto 10px' }}/>
                  <div style={{ fontSize:'12px', color:'#AAA', fontFamily:'var(--font-display)' }}>Chargement de la carte…</div>
                </div>

              ) : detail ? (
                <>
                  {/* Image haute résolution */}
                  <div style={{ background:'#F8F8F8', padding:'14px', display:'flex', justifyContent:'center', alignItems:'center', minHeight:'180px', position:'relative' }}>
                    {detail.image ? (
                      <img
                        src={`${detail.image}/high.webp`}
                        alt={detail.name}
                        style={{ maxHeight:'220px', maxWidth:'100%', objectFit:'contain', borderRadius:'6px', boxShadow:'0 4px 20px rgba(0,0,0,.1)' }}
                        onError={e=>{ const t=e.target as HTMLImageElement; if(!t.src.includes('.jpg')) t.src=`${detail.image}/high.jpg`; else t.style.display='none' }}
                      />
                    ) : (
                      <div style={{ width:'140px', height:'196px', borderRadius:'8px', background:'#F5F5F5', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                        <div style={{ fontSize:'32px', opacity:.18 }}>🎴</div>
                        {lang==='JP' && <div style={{ fontSize:'10px', color:'#CCC', textAlign:'center' as const, fontFamily:'var(--font-display)', lineHeight:1.5 }}>Image JP<br/>non disponible</div>}
                      </div>
                    )}
                    <button onClick={()=>{ setSelId(null); setDetail(null); setEnDetail(null) }}
                      style={{ position:'absolute', top:'8px', left:'8px', width:'26px', height:'26px', borderRadius:'50%', background:'rgba(255,255,255,.9)', border:'1px solid rgba(0,0,0,.08)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', color:'#666' }}>×</button>
                    {selCard && (
                      <button className="zoom-btn" onClick={()=>setLightbox(selCard)}
                        style={{ position:'absolute', top:'8px', right:'8px', width:'30px', height:'30px', borderRadius:'50%', background:'rgba(0,0,0,.55)', border:'none', color:'#fff', fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
                        🔍
                      </button>
                    )}
                  </div>

                  <div style={{ padding:'14px' }}>
                    <div style={{ fontSize:'16px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', lineHeight:1.2, marginBottom:'2px' }}>{detail.name}</div>

                    {/* Traduction JP → EN */}
                    {lang==='JP' && enDetail && (
                      <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'6px', padding:'5px 8px', background:'#FFF5F0', borderRadius:'6px', border:'1px solid #FFE0D0' }}>
                        <span>🇺🇸</span>
                        <span style={{ fontSize:'12px', fontWeight:500, color:'#C84B00', fontFamily:'var(--font-display)' }}>{enDetail.name}</span>
                      </div>
                    )}

                    <div style={{ fontSize:'11px', color:'#AAA', marginBottom:'14px' }}>
                      {detail.set?.name}{detail.localId ? ` · #${detail.localId}` : ''}
                      {detail.set?.releaseDate && ` · ${detail.set.releaseDate.slice(0,4)}`}
                    </div>

                    {/* Types + HP */}
                    {(detail.types?.length || detail.hp) && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginBottom:'14px' }}>
                        {detail.types?.map(t=>(
                          <span key={t} style={{ fontSize:'10px', fontWeight:600, background:`${TC[t]??'#888'}18`, color:TC[t]??'#888', border:`1px solid ${TC[t]??'#888'}30`, padding:'3px 8px', borderRadius:'5px', fontFamily:'var(--font-display)' }}>{t}</span>
                        ))}
                        {detail.hp && (
                          <span style={{ fontSize:'10px', fontWeight:600, background:'#F5F5F5', color:'#555', border:'1px solid #E8E8E8', padding:'3px 8px', borderRadius:'5px', fontFamily:'var(--font-display)' }}>{detail.hp} HP</span>
                        )}
                      </div>
                    )}

                    {/* Infos */}
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'14px' }}>
                      {([
                        ['Rareté',      detail.rarity],
                        ['Catégorie',   detail.category],
                        ['Stade',       detail.stage],
                        ['Évolue de',   detail.evolveFrom],
                        ['Illustrateur',detail.illustrator],
                      ] as [string,string|undefined][]).filter(([,v])=>v).map(([l,v])=>(
                        <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px' }}>
                          <span style={{ fontSize:'10px', color:'#AAA', fontFamily:'var(--font-display)', flexShrink:0 }}>{l}</span>
                          <span style={{ fontSize:'11px', color:'#111', fontFamily:'var(--font-display)', fontWeight:500, textAlign:'right' as const, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Attaques */}
                    {detail.attacks && detail.attacks.length>0 && (
                      <div style={{ marginBottom:'14px' }}>
                        <div style={{ fontSize:'9px', fontWeight:700, color:'#AAA', textTransform:'uppercase' as const, letterSpacing:'.1em', fontFamily:'var(--font-display)', marginBottom:'7px' }}>Attaques</div>
                        {detail.attacks.slice(0,3).map((a,i)=>(
                          <div key={i} className="attack-row" style={{ background:'#F8F8F8', borderRadius:'8px', padding:'8px 10px', marginBottom:'5px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                              <span style={{ fontSize:'11px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>{a.name}</span>
                              {a.damage!=null && <span style={{ fontSize:'12px', fontWeight:700, color:'#E03020', fontFamily:'var(--font-display)' }}>{a.damage}</span>}
                            </div>
                            {a.cost.length>0 && (
                              <div style={{ display:'flex', gap:'3px', marginBottom: a.effect?'4px':'0' }}>
                                {a.cost.slice(0,6).map((c,ci)=>(
                                  <span key={ci} style={{ width:'14px', height:'14px', borderRadius:'50%', background:`${TC[c]??'#AAA'}35`, border:`1px solid ${TC[c]??'#AAA'}70`, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'7px' }}>●</span>
                                ))}
                              </div>
                            )}
                            {a.effect && <div style={{ fontSize:'9px', color:'#888', lineHeight:1.5 }}>{a.effect.slice(0,100)}{a.effect.length>100?'…':''}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Faiblesses */}
                    {detail.weaknesses && detail.weaknesses.length>0 && (
                      <div style={{ marginBottom:'14px' }}>
                        <div style={{ fontSize:'9px', fontWeight:700, color:'#AAA', textTransform:'uppercase' as const, letterSpacing:'.1em', fontFamily:'var(--font-display)', marginBottom:'5px' }}>Faiblesses</div>
                        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                          {detail.weaknesses.map((w,i)=>(
                            <span key={i} style={{ fontSize:'11px', fontWeight:600, background:`${TC[w.type]??'#888'}18`, color:TC[w.type]??'#888', border:`1px solid ${TC[w.type]??'#888'}30`, padding:'3px 8px', borderRadius:'5px', fontFamily:'var(--font-display)' }}>
                              {w.type} {w.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <button onClick={()=>{
                      if (detail && selCard) {
                        const toAdd = {
                          id: 'enc_'+Date.now(),
                          name: detail.name,
                          set: selCard.setName,
                          setId: selCard.setId,
                          number: detail.localId ?? selCard.localId,
                          rarity: detail.rarity ?? '',
                          type: detail.types?.[0] ?? 'normal',
                          hp: detail.hp,
                          year: selCard.year,
                          lang,
                          image: detail.image ?? selCard.enImage,
                          enName: selCard.enName,
                        }
                        const setTotal = allCards.filter(c=>c.setId===selCard?.setId).length
                        localStorage.setItem('pka_add_card', JSON.stringify({...toAdd, setTotal}))
                      }
                      router.push('/portfolio')
                    }} className="add-btn"
                      style={{ width:'100%', padding:'11px', borderRadius:'9px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', letterSpacing:'.02em' }}>
                      + Ajouter au portfolio
                    </button>
                  </div>
                </>

              ) : selCard && (
                <div style={{ padding:'30px 20px', textAlign:'center' }}>
                  {selCard.image && (
                    <img src={`${selCard.image}/low.webp`} alt={selCard.name} style={{ maxHeight:'120px', marginBottom:'10px', objectFit:'contain' }}/>
                  )}
                  <div style={{ fontSize:'13px', color:'#888', fontFamily:'var(--font-display)', marginBottom:'4px' }}>{selCard.name}</div>
                  <div style={{ fontSize:'11px', color:'#CCC' }}>{selCard.setName}</div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* LIGHTBOX */}
      {lightbox && (()=>{
        const base = cardImageUrl(lightbox, lang)
        const imgHd = base ? `${base}/high.webp` : null
        return (
          <div className="lb-bg" onClick={()=>setLightbox(null)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.88)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)', padding:'24px' }}>
            <div className="lb-card" onClick={e=>e.stopPropagation()}
              style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:'16px', maxWidth:'360px', width:'100%' }}>

              {/* Image */}
              <div style={{ position:'relative', width:'100%' }}>
                {imgHd ? (
                  <img src={imgHd} alt={lightbox.name}
                    style={{ width:'100%', borderRadius:'16px', boxShadow:'0 32px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.06)', display:'block' }}
                    onError={e=>{ const t=e.target as HTMLImageElement; if(t.src.includes('.webp')) t.src=`${base}/high.jpg`; else if(t.src.includes('.jpg')) t.src=`${base}/high.png`; }}
                  />
                ) : (
                  <div style={{ width:'100%', aspectRatio:'2.5/3.5', borderRadius:'16px', background:'#1a1a1a' }}/>
                )}
                {/* Reflet subtil */}
                <div style={{ position:'absolute', inset:0, borderRadius:'16px', background:'linear-gradient(135deg,rgba(255,255,255,.08) 0%,transparent 50%)', pointerEvents:'none' }}/>
              </div>

              {/* Infos sous la carte */}
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'18px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)', marginBottom:'4px', letterSpacing:'-.3px' }}>
                  {lightbox.name}
                </div>
                {lang==='JP' && lightbox.enName && (
                  <div style={{ fontSize:'12px', color:'rgba(255,255,255,.45)', fontStyle:'italic', marginBottom:'6px' }}>
                    🇺🇸 {lightbox.enName}
                  </div>
                )}
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,.4)', fontFamily:'var(--font-display)' }}>
                  {lightbox.setName} · <span style={{ fontFamily:'monospace' }}>#{lightbox.localId}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:'8px' }}>
                <button className="add-btn" onClick={()=>{ setLightbox(null); handleCardClick(lightbox.id) }}
                  style={{ padding:'9px 20px', borderRadius:'9px', background:'#fff', color:'#111', border:'none', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                  Voir les détails
                </button>
                <button className="add-btn" onClick={()=>setLightbox(null)}
                  style={{ padding:'9px 20px', borderRadius:'9px', background:'rgba(255,255,255,.1)', color:'rgba(255,255,255,.7)', border:'1px solid rgba(255,255,255,.15)', fontSize:'12px', cursor:'pointer', fontFamily:'var(--font-display)' }}>
                  Fermer
                </button>
              </div>
            </div>

            {/* Bouton fermer coin */}
            <button className="lb-close" onClick={()=>setLightbox(null)}
              style={{ position:'fixed', top:'18px', right:'18px', width:'38px', height:'38px', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.6)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>
              ×
            </button>
          </div>
        )
      })()}
    </>
  )
}
