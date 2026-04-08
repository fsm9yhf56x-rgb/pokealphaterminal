#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# 1. PER_PAGE 120 -> 180 (8 lignes de plus avec 6 cols = 48 cartes)
old_per = "const PER_PAGE = 120"
new_per = "const PER_PAGE = 180"
assert old_per in s, "CIBLE PER_PAGE"
s = s.replace(old_per, new_per, 1)
print('  > 180 per page')

# 2. Trouver le bloc pagination existant pour le dupliquer en haut
# La pagination est apres la grille, cherchons-la
idx_page = s.find("Page {page+1}")
assert idx_page > 0, "CIBLE PAGE"

# Trouver "Page X / Y" en haut a droite (deja present ?)
# Ajouter la pagination juste avant la grille
old_grid_start = """          {!loading && !loadErr && view==='grid' && (()=>{"""
if old_grid_start in s:
    # Inserer pagination avant la grille
    pagination_top = """          {!loading && !loadErr && pageCount>1 && (
            <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'5px', marginBottom:'12px' }}>
              <button onClick={()=>{setPage(0);window.scrollTo({top:0,behavior:'smooth'})}} disabled={page===0} style={{ width:'32px', height:'32px', borderRadius:'7px', border:'1px solid #E8E8E8', background:'#fff', color:page===0?'#CCC':'#555', cursor:page===0?'default':'pointer', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center' }}>{String.fromCharCode(171)}</button>
              <button onClick={()=>{setPage(p=>Math.max(0,p-1));window.scrollTo({top:0,behavior:'smooth'})}} disabled={page===0} style={{ width:'32px', height:'32px', borderRadius:'7px', border:'1px solid #E8E8E8', background:'#fff', color:page===0?'#CCC':'#555', cursor:page===0?'default':'pointer', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center' }}>{String.fromCharCode(8249)}</button>
              <span style={{ fontSize:'11px', color:'#888', fontFamily:'var(--font-display)', padding:'0 6px' }}>Page {page+1} / {pageCount}</span>
              <button onClick={()=>{setPage(p=>Math.min(pageCount-1,p+1));window.scrollTo({top:0,behavior:'smooth'})}} disabled={page>=pageCount-1} style={{ width:'32px', height:'32px', borderRadius:'7px', border:'1px solid #E8E8E8', background:'#fff', color:page>=pageCount-1?'#CCC':'#555', cursor:page>=pageCount-1?'default':'pointer', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center' }}>{String.fromCharCode(8250)}</button>
              <button onClick={()=>{setPage(pageCount-1);window.scrollTo({top:0,behavior:'smooth'})}} disabled={page>=pageCount-1} style={{ width:'32px', height:'32px', borderRadius:'7px', border:'1px solid #E8E8E8', background:'#fff', color:page>=pageCount-1?'#CCC':'#555', cursor:page>=pageCount-1?'default':'pointer', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center' }}>{String.fromCharCode(187)}</button>
            </div>
          )}

          {!loading && !loadErr && view==='grid' && (()=>{"""
    s = s.replace(old_grid_start, pagination_top, 1)
    print('  > top pagination')

# 3. Ajouter scroll to top sur les boutons pagination existants (en bas)
s = s.replace(
    "className=\"pgbtn\" disabled={page===0} onClick={()=>setPage(0)}",
    "className=\"pgbtn\" disabled={page===0} onClick={()=>{setPage(0);window.scrollTo({top:0,behavior:'smooth'})}}",
)
s = s.replace(
    "className=\"pgbtn\" disabled={page===0} onClick={()=>setPage(p=>p-1)}",
    "className=\"pgbtn\" disabled={page===0} onClick={()=>{setPage(p=>p-1);window.scrollTo({top:0,behavior:'smooth'})}}",
)
s = s.replace(
    "className=\"pgbtn\" disabled={page>=pageCount-1} onClick={()=>setPage(p=>p+1)}",
    "className=\"pgbtn\" disabled={page>=pageCount-1} onClick={()=>{setPage(p=>p+1);window.scrollTo({top:0,behavior:'smooth'})}}",
)
s = s.replace(
    "className=\"pgbtn\" disabled={page>=pageCount-1} onClick={()=>setPage(pageCount-1)}",
    "className=\"pgbtn\" disabled={page>=pageCount-1} onClick={()=>{setPage(pageCount-1);window.scrollTo({top:0,behavior:'smooth'})}}",
)
print('  > bottom pagination scroll to top')

# 4. Bouton retour en haut — fixed en bas a droite
old_close = "      </div>\n    </div>\n  )\n}"
# Trouver le dernier return du composant
idx_last = s.rfind("    </div>\n  )\n}")
if idx_last > 0:
    btn = """
      {/* Back to top */}
      <button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} style={{ position:'fixed', bottom:'24px', right:'24px', width:'44px', height:'44px', borderRadius:'50%', background:'#1D1D1F', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(0,0,0,.15)', zIndex:30, transition:'all .2s' }}
        onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.2)'}}
        onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.15)'}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
      </button>
"""
    s = s[:idx_last] + btn + s[idx_last:]
    print('  > back to top button')

f.write_text(s, 'utf-8')
print('OK')
