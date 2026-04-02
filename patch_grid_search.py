#!/usr/bin/env python3
"""Ajoute search + filtres dans 'Toute ma collection'"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Appliquer setSearch au binderFilteredFinal
old_filtered = """const binderFilteredFinal = binderSorted.filter(c=>{
    if(binderFilter==='graded') return c.graded
    if(binderFilter==='raw') return !c.graded
    if(binderFilter==='rare') return ['Alt Art','Secret Rare','Gold Star','Ultra Rare','Illustration Rare','Special Art Rare','Holo Rare'].includes(c.rarity)
    return true
  })"""
new_filtered = """const binderFilteredFinal = binderSorted.filter(c=>{
    if(binderFilter==='graded' && !c.graded) return false
    if(binderFilter==='raw' && c.graded) return false
    if(setSearch && !c.name.toLowerCase().includes(setSearch.toLowerCase()) && !c.set.toLowerCase().includes(setSearch.toLowerCase())) return false
    return true
  })"""
assert old_filtered in s, "CIBLE FILTERED"
s = s.replace(old_filtered, new_filtered, 1)
print('  > search applique au grid')

# 2. Ajouter search + filtres avant la grille
old_grid_start = """):(
                  <div style={{ display:'grid', gridTemplateColumns:`repeat(${binderCols},minmax(0,1fr))`"""
new_grid_start = """):(<>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
                    <div style={{ position:'relative', flex:1, minWidth:'120px' }}>
                      <input type="text" placeholder="Rechercher une carte..."
                        onFocus={e=>{e.currentTarget.style.borderColor='#E03020';e.currentTarget.style.boxShadow='0 0 0 3px rgba(224,48,32,.08)'}}
                        onBlur={e=>{e.currentTarget.style.borderColor='#E5E5EA';e.currentTarget.style.boxShadow=''}}
                        value={setSearch} onChange={e=>{setSetSearch(e.target.value);setBinderPage(0)}}
                        style={{ width:'100%', padding:'7px 12px 7px 32px', borderRadius:'10px', background:'#fff', border:'1.5px solid #D1CEC9', color:'#48484A', fontSize:'11px', fontFamily:'var(--font-display)', outline:'none', boxSizing:'border-box' as const }}/>
                      <div style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'12px', color:'#AEAEB2', pointerEvents:'none' }}>🔍</div>
                      {setSearch&&<button onClick={()=>setSetSearch('')} style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#48484A', cursor:'pointer', fontSize:'13px', padding:0, lineHeight:1 }}>×</button>}
                    </div>
                    <div style={{ display:'flex', gap:'4px', alignItems:'center', flexShrink:0 }}>
                      {([{k:'all' as const,l:'Toutes'},{k:'graded' as const,l:'Gradees'},{k:'raw' as const,l:'Raw'}] as const).map(fi=>(
                        <button key={fi.k} onClick={()=>{setBinderFilter(fi.k);setBinderPage(0)}}
                          style={{ padding:'5px 12px',borderRadius:'99px',border:`1px solid ${binderFilter===fi.k?'#1D1D1F':'#E5E5EA'}`,background:binderFilter===fi.k?'#1D1D1F':'transparent',color:binderFilter===fi.k?'#fff':'#86868B',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}>
                          {fi.l}
                        </button>
                      ))}
                      <div style={{ width:'1px',height:'16px',background:'#E5E5EA',margin:'0 2px' }}/>
                      {([{k:'number' as const,l:'N°'},{k:'name' as const,l:'A→Z'},{k:'price' as const,l:'Prix'}] as const).map(so=>(
                        <button key={so.k} onClick={()=>setBinderSort(so.k)}
                          style={{ padding:'5px 10px',borderRadius:'99px',border:`1px solid ${binderSort===so.k?'#E03020':'#E5E5EA'}`,background:binderSort===so.k?'#FFF1EE':'transparent',color:binderSort===so.k?'#E03020':'#86868B',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}>
                          {so.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:`repeat(${binderCols},minmax(0,1fr))`"""
assert old_grid_start in s, "CIBLE GRID START"
s = s.replace(old_grid_start, new_grid_start, 1)
print('  > search + filtres UI dans grid')

# 3. Fermer le fragment </> apres la grille
# La grille se ferme avant la pagination dots
old_grid_end = """                  </div>
                )}
                {binderPages>1&&("""
new_grid_end = """                  </div>
                </>)}
                {binderPages>1&&("""
assert old_grid_end in s, "CIBLE GRID END"
s = s.replace(old_grid_end, new_grid_end, 1)
print('  > fragment ferme')

f.write_text(s, 'utf-8')
print('OK — search + filtres dans toute ma collection')
