#!/usr/bin/env python3
from pathlib import Path

f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# 1. State
old = "  const [search,     setSearch]      = useState('')"
assert old in s, "CIBLE STATE: " + repr(old)
new = """  const [search,     setSearch]      = useState('')
  const [searchFocus, setSearchFocus] = useState(false)
  const searchSuggs = useMemo(() => {
    if (search.length < 2) return []
    const q = search.toLowerCase()
    return allCards.filter(c => c.name.toLowerCase().includes(q) || c.setName.toLowerCase().includes(q) || (c.enName && c.enName.toLowerCase().includes(q))).slice(0, 8)
  }, [search, allCards])"""
s = s.replace(old, new, 1)
print('  > state')

# 2. Chercher le input search exact
idx_input = s.find("value={search} onChange={e=>setSearch(e.target.value)}")
assert idx_input > 0, "CIBLE INPUT"
# Trouver le div parent (position:relative)
div_start = s.rfind("<div style={{ position:'relative', flex:1", 0, idx_input)
assert div_start > 0, "CIBLE DIV START"
# Trouver la fermeture </div> du search container
close1 = s.find("</div>", idx_input)
# Il y a le bouton X dans un conditionnel, trouver la bonne fermeture
close2 = s.find("</div>", close1+6)
old_block = s[div_start:close2+6]

# Build new block with String.fromCodePoint for flags
new_block = """<div style={{ position:'relative', flex:1, minWidth:'200px', zIndex:20 }}>
              <span style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)', color:'#CCC', fontSize:'15px', pointerEvents:'none' }}>{String.fromCharCode(8981)}</span>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                onFocus={()=>setSearchFocus(true)} onBlur={()=>setTimeout(()=>setSearchFocus(false),200)}
                placeholder={lang==='JP' ? 'Nom de la carte (japonais)...' : 'Rechercher une carte, un set...'}
                style={{ width:'100%', height:'38px', padding:'0 32px', border:'1px solid '+(searchFocus&&search.length>=2?'#1D1D1F':'#EBEBEB'), borderRadius:searchFocus&&searchSuggs.length>0?'9px 9px 0 0':'9px', fontSize:'13px', color:'#111', outline:'none', background:'#fff', boxSizing:'border-box' as const, fontFamily:'var(--font-sans)', transition:'border-color .15s' }}/>
              {search && (
                <button onClick={()=>setSearch('')} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#CCC', cursor:'pointer', fontSize:'16px', padding:0, lineHeight:1, zIndex:2 }}>{String.fromCharCode(215)}</button>
              )}
              {searchFocus && searchSuggs.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #1D1D1F', borderTop:'1px solid #EBEBEB', borderRadius:'0 0 9px 9px', boxShadow:'0 8px 24px rgba(0,0,0,.08)', maxHeight:'340px', overflowY:'auto' as const }}>
                  {searchSuggs.map(card => {
                    const owned = isOwned(card)
                    const cimg = card.image ? (card.image.includes('.webp')||card.image.includes('.png') ? card.image : card.image+'/high.webp') : null
                    return (
                      <div key={card.id}
                        onMouseDown={e=>{e.preventDefault();handleCardClick(card.id);setSearchFocus(false)}}
                        style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid #F5F5F5', transition:'background .1s' }}
                        onMouseEnter={e=>{e.currentTarget.style.background='#F5F5F7'}}
                        onMouseLeave={e=>{e.currentTarget.style.background=''}}>
                        <div style={{ width:'32px', height:'44px', borderRadius:'4px', overflow:'hidden', background:'#F5F5F5', flexShrink:0 }}>
                          {cimg && <img src={cimg} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'13px', fontWeight:500, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{card.name}</div>
                          <div style={{ fontSize:'10px', color:'#86868B', display:'flex', alignItems:'center', gap:'4px' }}>
                            <span>{card.setName}</span>
                            <span style={{ color:'#C7C7CC' }}>{String.fromCharCode(183)}</span>
                            <span>#{card.localId}</span>
                            {card.rarity && <><span style={{ color:'#C7C7CC' }}>{String.fromCharCode(183)}</span><span>{card.rarity}</span></>}
                          </div>
                        </div>
                        <span style={{ fontSize:'14px', flexShrink:0 }}>{lang==='EN'?String.fromCodePoint(127482,127480):lang==='FR'?String.fromCodePoint(127467,127479):String.fromCodePoint(127471,127477)}</span>
                        {owned && <div style={{ width:'16px', height:'16px', borderRadius:'50%', background:'#27500A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg></div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>"""

s = s.replace(old_block, new_block, 1)
print('  > dropdown')

f.write_text(s, 'utf-8')
print('OK')
