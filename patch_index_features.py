#!/usr/bin/env python3
"""Filtre rarete + lightbox HD swipeable + panel detail enrichi"""
from pathlib import Path

EA = '\u00e9'
EG = '\u00e8'

f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# ═══ 1. FILTRE RARETE ═══

# State
old_filset = "  const [filSet,     setFilSet]      = useState('all')"
new_filset = """  const [filSet,     setFilSet]      = useState('all')
  const [filRarity,  setFilRarity]   = useState('all')"""
assert old_filset in s, "CIBLE FILSET"
s = s.replace(old_filset, new_filset, 1)
print('  > filRarity state')

# Raretés disponibles
old_eras_memo = "  const eras = useMemo(() =>"
new_eras_memo = """  const rarities = useMemo(() =>
    [...new Set(allCards.map(c=>c.rarity).filter(Boolean))].sort()
  , [allCards])

  const eras = useMemo(() =>"""
assert old_eras_memo in s, "CIBLE ERAS MEMO"
s = s.replace(old_eras_memo, new_eras_memo, 1)
print('  > rarities memo')

# Ajouter le filtre dans le filtered
old_filter = "    if (filSet!=='all') r = r.filter(c=>c.setId===filSet)"
new_filter = """    if (filSet!=='all') r = r.filter(c=>c.setId===filSet)
    if (filRarity!=='all') r = r.filter(c=>c.rarity===filRarity)"""
assert old_filter in s, "CIBLE FILTER"
s = s.replace(old_filter, new_filter, 1)
print('  > filter logic')

# Reset page on filRarity change
old_reset = "  useEffect(() => { setPage(0) }, [search, filSet, sort])"
new_reset = "  useEffect(() => { setPage(0) }, [search, filSet, filRarity, sort])"
assert old_reset in s, "CIBLE RESET"
s = s.replace(old_reset, new_reset, 1)
print('  > reset page')

# UI — ajouter le select rarete apres le select serie
old_select_end = """            {(filEra!=='all'||filSet!=='all'||search) && ("""
new_select_end = """            <select className="fsel" value={filRarity} onChange={e=>{setFilRarity(e.target.value);setPage(0)}}
              style={{ maxWidth:'180px', color:filRarity==='all'?'#AAA':'#111' }}>
              <option value="all">Toutes les raret""" + EA + """s</option>
              {rarities.map(r=>(<option key={r} value={r}>{r}</option>))}
            </select>
            {(filEra!=='all'||filSet!=='all'||filRarity!=='all'||search) && ("""
assert old_select_end in s, "CIBLE SELECT END"
s = s.replace(old_select_end, new_select_end, 1)
print('  > rarity select UI')

# Reset rarete dans le clear filters
old_clear = "setFilEra('all');setFilSet('all');setSearch('')"
if old_clear in s:
    s = s.replace(old_clear, "setFilEra('all');setFilSet('all');setFilRarity('all');setSearch('')", 1)
    print('  > clear filters')

# ═══ 2. LIGHTBOX HD SWIPEABLE ═══

# Chercher le lightbox existant
old_lightbox_start = "      {/* LIGHTBOX */}"
idx_lb = s.find(old_lightbox_start)
assert idx_lb > 0, "CIBLE LIGHTBOX"

# Trouver la fin du lightbox
idx_lb_end = s.find("})()}", idx_lb) + 5
old_lightbox = s[idx_lb:idx_lb_end]

new_lightbox = """      {/* LIGHTBOX */}
      {lightbox && (()=>{
        const base = cardImageUrl(lightbox, lang)
        const imgHd = base ? (base.includes('.webp')||base.includes('.png') ? base : base+'/high.webp') : null
        // Navigation dans le set
        const setCards = filtered.filter(c=>c.setId===lightbox.setId).sort((a,b)=>parseInt(a.localId)-parseInt(b.localId))
        const curIdx = setCards.findIndex(c=>c.id===lightbox.id)
        const prevCard = curIdx > 0 ? setCards[curIdx-1] : null
        const nextCard = curIdx < setCards.length-1 ? setCards[curIdx+1] : null
        const rc = getRarityColor(lightbox.rarity)
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.92)', zIndex:60, display:'flex', alignItems:'center', justifyContent:'center' }}
            onClick={()=>setLightbox(null)}>
            {/* Prev */}
            {prevCard && (
              <button onClick={e=>{e.stopPropagation();setLightbox(prevCard)}}
                style={{ position:'absolute', left:'20px', top:'50%', transform:'translateY(-50%)', width:'44px', height:'44px', borderRadius:'50%', background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.15)', color:'rgba(255,255,255,.7)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', transition:'all .15s', zIndex:2 }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.2)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.1)'}}>
                {String.fromCharCode(8249)}
              </button>
            )}
            {/* Next */}
            {nextCard && (
              <button onClick={e=>{e.stopPropagation();setLightbox(nextCard)}}
                style={{ position:'absolute', right:'20px', top:'50%', transform:'translateY(-50%)', width:'44px', height:'44px', borderRadius:'50%', background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.15)', color:'rgba(255,255,255,.7)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', transition:'all .15s', zIndex:2 }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.2)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.1)'}}>
                {String.fromCharCode(8250)}
              </button>
            )}
            {/* Card */}
            <div onClick={e=>e.stopPropagation()} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'16px', maxWidth:'420px', width:'100%' }}>
              {imgHd && <img src={imgHd} alt={lightbox.name}
                style={{ maxHeight:'75vh', maxWidth:'100%', objectFit:'contain', borderRadius:'16px', boxShadow:'0 24px 60px rgba(0,0,0,.4)' }}
                onError={e=>{const t=e.target as HTMLImageElement; if(t.src.includes('high.webp')) t.src=t.src.replace('high.webp','high.png')}}/>}
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'16px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', marginBottom:'4px' }}>{lightbox.name}</div>
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,.5)', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                  <span>{lightbox.setName}</span>
                  <span>{String.fromCharCode(183)}</span>
                  <span>#{lightbox.localId}</span>
                  {lightbox.rarity && <><span>{String.fromCharCode(183)}</span><span style={{ background:rc.bg, color:rc.fg, padding:'1px 6px', borderRadius:'4px', fontSize:'10px', fontWeight:600 }}>{lightbox.rarity}</span></>}
                </div>
                {curIdx>=0 && <div style={{ fontSize:'11px', color:'rgba(255,255,255,.3)', marginTop:'6px' }}>{curIdx+1} / {setCards.length}</div>}
              </div>
              <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
                {!isOwned(lightbox) && (
                  <button onClick={()=>{addToPortfolio(lightbox);setToast(lightbox.name+' ajout""" + EA + """')}}
                    style={{ padding:'8px 16px', borderRadius:'8px', background:'#fff', color:'#1D1D1F', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                    + Ajouter au portfolio
                  </button>
                )}
                {isOwned(lightbox) && (
                  <div style={{ padding:'8px 16px', borderRadius:'8px', background:'rgba(39,80,10,.3)', color:'#C0DD97', fontSize:'12px', fontWeight:600, fontFamily:'var(--font-display)', display:'flex', alignItems:'center', gap:'6px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C0DD97" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                    Dans ma collection
                  </div>
                )}
              </div>
            </div>
            {/* Close */}
            <button onClick={()=>setLightbox(null)}
              style={{ position:'absolute', top:'20px', right:'20px', width:'38px', height:'38px', borderRadius:'50%', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.6)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', transition:'all .15s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.15)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.08)'}}>
              {String.fromCharCode(215)}
            </button>
          </div>
        )
      })()}"""

s = s[:idx_lb] + new_lightbox + s[idx_lb_end:]
print('  > lightbox HD')

f.write_text(s, 'utf-8')
print('OK')
