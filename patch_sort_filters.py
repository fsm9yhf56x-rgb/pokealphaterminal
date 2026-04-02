#!/usr/bin/env python3
"""Tri par numero de serie + filtres a cote de la recherche"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. State pour les filtres
old_search_state = "const [setSearch,   setSetSearch]   = useState('')"
new_search_state = """const [setSearch,   setSetSearch]   = useState('')
  const [binderSort,  setBinderSort]  = useState<'number'|'name'|'price'|'date'>('number')
  const [binderFilter, setBinderFilter] = useState<'all'|'graded'|'raw'|'rare'>('all')"""
assert old_search_state in s, "CIBLE SEARCH STATE"
s = s.replace(old_search_state, new_search_state, 1)
print('  > state sort/filter')

# 2. Tri des cartes dans le shelf — cardImgs sort par numero
old_cardimgs = "const cardImgs=setCards"
new_cardimgs = """const cardImgs=[...setCards].sort((a,b)=>{
                        if(binderSort==='number') return (parseInt(a.number)||999)-(parseInt(b.number)||999)
                        if(binderSort==='name') return a.name.localeCompare(b.name)
                        if(binderSort==='price') return b.curPrice-a.curPrice
                        return 0
                      })"""
assert old_cardimgs in s, "CIBLE CARDIMGS"
s = s.replace(old_cardimgs, new_cardimgs, 1)
print('  > tri shelf')

# 3. Tri des cartes dans le binder grid — pageItems
old_pageitems = "const pageItems   = binderFiltered.slice(binderPage*slotsPer,(binderPage+1)*slotsPer)"
new_pageitems = """const binderSorted = [...binderFiltered].sort((a,b)=>{
    if(binderSort==='number') return (parseInt(a.number)||999)-(parseInt(b.number)||999)
    if(binderSort==='name') return a.name.localeCompare(b.name)
    if(binderSort==='price') return b.curPrice-a.curPrice
    return 0
  })
  const binderFilteredFinal = binderSorted.filter(c=>{
    if(binderFilter==='graded') return c.graded
    if(binderFilter==='raw') return !c.graded
    if(binderFilter==='rare') return ['Alt Art','Secret Rare','Gold Star','Ultra Rare','Illustration Rare','Special Art Rare','Holo Rare'].includes(c.rarity)
    return true
  })
  const pageItems   = binderFilteredFinal.slice(binderPage*slotsPer,(binderPage+1)*slotsPer)"""
assert old_pageitems in s, "CIBLE PAGEITEMS"
s = s.replace(old_pageitems, new_pageitems, 1)
print('  > tri + filtre binder grid')

# 4. binderPages doit aussi utiliser binderFilteredFinal
old_pages = "const binderPages = Math.max(1,Math.ceil(binderFiltered.length/slotsPer))"
new_pages = "const binderPages = Math.max(1,Math.ceil((binderFilter==='all'?binderFiltered.length:binderFiltered.filter(c=>binderFilter==='graded'?c.graded:binderFilter==='raw'?!c.graded:['Alt Art','Secret Rare','Gold Star','Ultra Rare','Illustration Rare','Special Art Rare','Holo Rare'].includes(c.rarity)).length)/slotsPer))"
assert old_pages in s, "CIBLE PAGES"
s = s.replace(old_pages, new_pages, 1)
print('  > pages count')

# 5. Filtres UI — a cote de la barre de recherche
old_searchbar = """<div style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'13px', color:'#48484A', pointerEvents:'none' }}>🔍</div>
                        {setSearch&&<button onClick={()=>setSetSearch('')} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#48484A', cursor:'pointer', fontSize:'14px', padding:0, lineHeight:1 }}>×</button>}
                      </div>
                    )}"""
new_searchbar = """<div style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'13px', color:'#48484A', pointerEvents:'none' }}>🔍</div>
                        {setSearch&&<button onClick={()=>setSetSearch('')} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#48484A', cursor:'pointer', fontSize:'14px', padding:0, lineHeight:1 }}>×</button>}
                      </div>
                      <div style={{ display:'flex', gap:'4px', marginTop:'8px', flexWrap:'wrap' }}>
                        {([{k:'all' as const,l:'Toutes'},{k:'graded' as const,l:'Gradees'},{k:'raw' as const,l:'Raw'},{k:'rare' as const,l:'Rares'}] as const).map(fi=>(
                          <button key={fi.k} onClick={()=>{setBinderFilter(fi.k);setBinderPage(0)}}
                            style={{ padding:'4px 12px',borderRadius:'99px',border:`1px solid ${binderFilter===fi.k?'#1D1D1F':'#E5E5EA'}`,background:binderFilter===fi.k?'#1D1D1F':'transparent',color:binderFilter===fi.k?'#fff':'#86868B',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}>
                            {fi.l}
                          </button>
                        ))}
                        <div style={{ width:'1px',background:'#E5E5EA',margin:'0 4px' }}/>
                        {([{k:'number' as const,l:'N°'},{k:'name' as const,l:'A→Z'},{k:'price' as const,l:'Prix'}] as const).map(so=>(
                          <button key={so.k} onClick={()=>setBinderSort(so.k)}
                            style={{ padding:'4px 10px',borderRadius:'99px',border:`1px solid ${binderSort===so.k?'#E03020':'#E5E5EA'}`,background:binderSort===so.k?'#FFF1EE':'transparent',color:binderSort===so.k?'#E03020':'#86868B',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}>
                            {so.l}
                          </button>
                        ))}
                      </div>
                    )}"""
assert old_searchbar in s, "CIBLE SEARCHBAR"
s = s.replace(old_searchbar, new_searchbar, 1)
print('  > filtres UI')

f.write_text(s, 'utf-8')
print('OK — tri par numero + filtres')
