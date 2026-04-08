#!/usr/bin/env python3
"""7: etat vide, 8: page transition, 9: double-clic (skip 5)"""
from pathlib import Path

EA = '\u00e9'
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# 8: gridFade keyframe
if '@keyframes gridFade' not in s:
    s = s.replace("@keyframes cardIn", "@keyframes gridFade { from{opacity:0} to{opacity:1} }\n        @keyframes cardIn", 1)
    print('  > gridFade')

# 7: etat vide
old_grid = "          {!loading && !loadErr && view==='grid' && (()=>{"
assert old_grid in s, "CIBLE GRID"
empty = """          {!loading && !loadErr && filtered.length===0 && allCards.length>0 && (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{ fontSize:'48px', opacity:.15, marginBottom:'16px' }}>{String.fromCharCode(9997)}</div>
              <div style={{ fontSize:'16px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)', marginBottom:'6px' }}>Aucune carte trouv""" + EA + """e</div>
              <div style={{ fontSize:'13px', color:'#86868B', marginBottom:'16px' }}>Essayez avec d'autres filtres ou un autre terme de recherche.</div>
              <button onClick={()=>{setFilEra('all');setFilSet('all');setFilRarity('all');setSearch('');setPage(0)}}
                style={{ padding:'8px 16px', borderRadius:'8px', background:'#1D1D1F', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                Effacer les filtres
              </button>
            </div>
          )}

          {!loading && !loadErr && view==='grid' && (()=>{"""
s = s.replace(old_grid, empty, 1)
print('  > empty state')

# 9: double-clic
old_click = "onClick={()=>handleCardClick(card.id)}"
idx = s.find(old_click)
area = s[max(0,idx-300):idx]
if 'enc-card' in area:
    s = s[:idx] + "onClick={()=>handleCardClick(card.id)} onDoubleClick={e=>{e.stopPropagation();if(!isOwned(card)){addToPortfolio(card)}}}" + s[idx+len(old_click):]
    print('  > double-click')

f.write_text(s, 'utf-8')
print('OK')
