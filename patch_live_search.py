#!/usr/bin/env python3
"""Live search with dropdown suggestions"""
from pathlib import Path

f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# 1. Add state for suggestions + focused
old_search_state = "  const [search,     setSearch]      = useState('')"
new_search_state = """  const [search,     setSearch]      = useState('')
  const [searchFocus, setSearchFocus] = useState(false)
  const searchSuggs = useMemo(() => {
    if (search.length < 2) return []
    const q = search.toLowerCase()
    return allCards.filter(c => c.name.toLowerCase().includes(q) || c.setName.toLowerCase().includes(q) || (c.enName && c.enName.toLowerCase().includes(q))).slice(0, 8)
  }, [search, allCards])"""
assert old_search_state in s, "CIBLE STATE"
s = s.replace(old_search_state, new_search_state, 1)
print('  > search state')

# 2. Replace search input with suggestions dropdown
old_search = """            <div style={{ position:'relative', flex:1, minWidth:'200px' }}>
              <span style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)', color:'#CCC', fontSize:'15px', pointerEvents:'none' }}>\u2315</span>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder={lang==='JP' ? 'Nom de la carte (japonais)\u2026' : 'Rechercher une carte, un set\u2026'}
                style={{ width:'100%', height:'38px', padding:'0 32px', border:'1px solid #EBEBEB', borderRadius:'9px', fontSize:'13px', color:'#111', outline:'none', background:'#fff', boxSizing:'border-box' as const, fontFamily:'var(--font-sans)' }}/>
              {search && (
                <button onClick={()=>setSearch('')} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#CCC', cursor:'pointer', fontSize:'16px', padding:0, lineHeight:1 }}>\u00d7</button>
              )}
            </div>"""

new_search = """            <div style={{ position:'relative', flex:1, minWidth:'200px', zIndex:20 }}>
              <span style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)', color:'#CCC', fontSize:'15px', pointerEvents:'none' }}>\u2315</span>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                onFocus={()=>setSearchFocus(true)} onBlur={()=>setTimeout(()=>setSearchFocus(false),200)}
                placeholder={lang==='JP' ? 'Nom de la carte (japonais)\u2026' : 'Rechercher une carte, un set\u2026'}
                style={{ width:'100%', height:'38px', padding:'0 32px', border:'1px solid '+(searchFocus&&search.length>=2?'#1D1D1F':'#EBEBEB'), borderRadius:searchFocus&&searchSuggs.length>0?'9px 9px 0 0':'9px', fontSize:'13px', color:'#111', outline:'none', background:'#fff', boxSizing:'border-box' as const, fontFamily:'var(--font-sans)', transition:'border-color .15s' }}/>
              {search && (
                <button onClick={()=>setSearch('')} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#CCC', cursor:'pointer', fontSize:'16px', padding:0, lineHeight:1, zIndex:2 }}>\u00d7</button>
              )}
              {searchFocus && searchSuggs.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #1D1D1F', borderTop:'1px solid #EBEBEB', borderRadius:'0 0 9px 9px', boxShadow:'0 8px 24px rgba(0,0,0,.08)', maxHeight:'340px', overflowY:'auto' as const }}>
                  {searchSuggs.map(card => {
                    const owned = isOwned(card)
                    const img = card.image ? (card.image.includes('.webp')||card.image.includes('.png') ? card.image : card.image+'/high.webp') : null
                    return (
                      <div key={card.id}
                        onMouseDown={e=>{e.preventDefault();handleCardClick(card.id);setSearchFocus(false)}}
                        style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid #F5F5F5', transition:'background .1s' }}
                        onMouseEnter={e=>{e.currentTarget.style.background='#F5F5F7'}}
                        onMouseLeave={e=>{e.currentTarget.style.background=''}}>
                        <div style={{ width:'32px', height:'44px', borderRadius:'4px', overflow:'hidden', background:'#F5F5F5', flexShrink:0 }}>
                          {img && <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'13px', fontWeight:500, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{card.name}</div>
                          <div style={{ fontSize:'10px', color:'#86868B', display:'flex', alignItems:'center', gap:'4px' }}>
                            <span>{card.setName}</span>
                            <span style={{ color:'#C7C7CC' }}>\u00b7</span>
                            <span>#{card.localId}</span>
                            {card.rarity && <><span style={{ color:'#C7C7CC' }}>\u00b7</span><span>{card.rarity}</span></>}
                          </div>
                        </div>
                        <span style={{ fontSize:'14px', flexShrink:0 }}>{lang==='EN'?'\ud83c\uddfa\ud83c\uddf8':lang==='FR'?'\ud83c\uddeb\ud83c\uddf7':'\ud83c\uddef\ud83c\uddf5'}</span>
                        {owned && <div style={{ width:'16px', height:'16px', borderRadius:'50%', background:'#27500A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg></div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>"""

assert old_search in s, "CIBLE SEARCH"
s = s.replace(old_search, new_search, 1)
print('  > live search dropdown')

f.write_text(s, 'utf-8')
print('OK')
