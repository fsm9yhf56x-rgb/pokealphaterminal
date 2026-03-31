'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { fetchSets, fetchAllCards, fetchCardDetail, type TCGCard, type TCGCardFull } from '@/lib/tcgApi'

const TC: Record<string,string> = {
  Fire:'#FF6B35', Water:'#42A5F5', Psychic:'#C855D4', Darkness:'#7E57C2',
  Lightning:'#D4A800', Grass:'#3DA85A', Colorless:'#AAAAAA', Fighting:'#C97840',
  Metal:'#8090A8', Dragon:'#9060A0', Fairy:'#FF88AA',
}

const ERA_ORDER = ['Original (WotC)','EX','DP / Platinum','Black & White','XY','Sun & Moon','Sword & Shield','Scarlet & Violet','—']

function yearToEra(y:number): string {
  if (!y)   return '—'
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
  setId:string; setName:string; year:number; era:string
}

const PER_PAGE = 60

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

  const [selId,      setSelId]       = useState<string|null>(null)
  const [detail,     setDetail]      = useState<TCGCardFull|null>(null)
  const [detLoading, setDetLoading]  = useState(false)
  const [enDetail,   setEnDetail]    = useState<TCGCardFull|null>(null)

  useEffect(() => {
    setLoading(true); setLoadErr(false); setLoadMsg('Chargement des séries…')
    setAllCards([]); setFilSet('all'); setFilEra('all')
    setPage(0); setSelId(null); setDetail(null); setEnDetail(null)

    Promise.all([fetchSets(lang), fetchAllCards(lang)])
      .then(([sets, cards]) => {
        const setMap = new Map(sets.map(s=>[s.id,s]))
        const enriched: EnrichedCard[] = cards.map(c => {
          const setId  = c.id.substring(0, c.id.lastIndexOf('-')) || c.id
          const set    = setMap.get(setId)
          const year   = set?.releaseDate ? parseInt(set.releaseDate.slice(0,4))||0 : 0
          return { ...c, setId, setName: set?.name ?? setId, year, era: yearToEra(year) }
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
        @keyframes fadeIn  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cardIn  { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .enc-card { transition:all .18s; border-radius:12px; overflow:hidden; cursor:pointer; }
        .enc-card:hover { transform:translateY(-3px); box-shadow:0 10px 28px rgba(0,0,0,.1) !important; }
        .enc-card.sel { border-color:#111 !important; box-shadow:0 8px 24px rgba(0,0,0,.1) !important; }
        .srt { padding:5px 10px; border-radius:6px; border:none; background:transparent; color:#666; font-size:11px; font-weight:500; cursor:pointer; transition:all .12s; font-family:var(--font-display); }
        .srt:hover { background:#EBEBEB; }
        .srt.on { background:#111 !important; color:#fff !important; }
        .rh:hover { background:#F8F8F8 !important; cursor:pointer; }
        .shimmer { background:linear-gradient(90deg,#F0F0F0 25%,#E8E8E8 50%,#F0F0F0 75%); background-size:800px 100%; animation:shimmer 1.5s infinite; }
        .pgbtn { padding:6px 12px; border-radius:7px; border:1px solid #E8E8E8; background:#fff; color:#555; font-size:12px; cursor:pointer; font-family:var(--font-display); }
        .pgbtn:disabled { color:#CCC; cursor:default; }
        .pgbtn:not(:disabled):hover { background:#F5F5F5; }
        .fsel { height:34px; padding:0 10px; border:1px solid #EBEBEB; border-radius:7px; font-size:12px; outline:none; background:#fff; cursor:pointer; font-family:var(--font-display); color:#555; }
        .fsel:focus { border-color:#999; }
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
                    <div style={{ width:'12px', height:'12px', border:'1.5px solid #DDD', borderTop:'1.5px solid #888', borderRadius:'50%', animation:'spin .7s linear infinite', flexShrink:0 }}/>
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
                <button key={l} onClick={()=>setLang(l)}
                  style={{ padding:'8px 14px', borderRadius:'9px', border:'none', background:lang===l?'#fff':'transparent', color:lang===l?'#111':'#888', fontFamily:'var(--font-display)', fontWeight:lang===l?700:500, fontSize:'13px', cursor:'pointer', boxShadow:lang===l?'0 1px 4px rgba(0,0,0,.08)':'none', transition:'all .15s', display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
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
              <div style={{ width:'28px', height:'28px', border:'2.5px solid #EBEBEB', borderTop:'2.5px solid #111', borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto 14px' }}/>
              <div style={{ fontSize:'13px', color:'#888', fontFamily:'var(--font-display)', marginBottom:'6px' }}>{loadMsg}</div>
              <div style={{ fontSize:'11px', color:'#CCC' }}>Mise en cache automatique pour les prochaines visites</div>
            </div>
          )}

          {/* GRID */}
          {!loading && !loadErr && view==='grid' && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:'12px' }}>
              {pageCards.map((card,idx) => {
                const isSel = selId===card.id
                const img   = card.image ? `${card.image}/low.webp` : null
                return (
                  <div key={card.id}
                    className={`enc-card${isSel?' sel':''}`}
                    onClick={()=>handleCardClick(card.id)}
                    style={{ background:'#fff', border:`1.5px solid ${isSel?'#111':'#EBEBEB'}`, boxShadow:'0 2px 6px rgba(0,0,0,.04)', animation:`cardIn .2s ${Math.min(idx,20)*.02}s ease-out both` }}>
                    <div style={{ height:'128px', background:'#F7F7F7', position:'relative', overflow:'hidden' }}>
                      {img ? (
                        <img src={img} alt={card.name}
                          style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }}
                          onError={e=>{ const t=e.target as HTMLImageElement; if(!t.src.includes('.png')) t.src=`${card.image}/low.png`; else t.style.display='none' }}/>
                      ) : (
                        <div className="shimmer" style={{ position:'absolute', inset:0 }}/>
                      )}
                      <div style={{ position:'absolute', bottom:'4px', right:'5px', fontSize:'12px', background:'rgba(255,255,255,.85)', borderRadius:'4px', padding:'1px 4px' }}>
                        {flag(lang)}
                      </div>
                    </div>
                    <div style={{ padding:'9px 10px 10px' }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', marginBottom:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
                        {card.name}
                      </div>
                      <div style={{ fontSize:'10px', color:'#BBB', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
                        {card.setName} · <span style={{ fontFamily:'monospace' }}>#{card.localId}</span>
                      </div>
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
          )}

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
          <div style={{ width:'285px', flexShrink:0, animation:'slideIn .2s ease-out' }}>
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'16px', overflow:'hidden', position:'sticky', top:'20px', maxHeight:'90vh', overflowY:'auto' as const }}>

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
                      <div className="shimmer" style={{ width:'120px', height:'168px', borderRadius:'8px' }}/>
                    )}
                    <button onClick={()=>{ setSelId(null); setDetail(null); setEnDetail(null) }}
                      style={{ position:'absolute', top:'8px', left:'8px', width:'26px', height:'26px', borderRadius:'50%', background:'rgba(255,255,255,.9)', border:'1px solid rgba(0,0,0,.08)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', color:'#666' }}>×</button>
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
                          <div key={i} style={{ background:'#F8F8F8', borderRadius:'8px', padding:'8px 10px', marginBottom:'5px' }}>
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

                    <button onClick={()=>router.push('/portfolio')}
                      style={{ width:'100%', padding:'10px', borderRadius:'9px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
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
    </>
  )
}
