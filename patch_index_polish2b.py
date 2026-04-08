#!/usr/bin/env python3
"""5: separateurs, 7: etat vide, 8: page transition, 9: double-clic"""
from pathlib import Path

EA = '\u00e9'
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# ═══ 8: GRID FADE + TRANSITION ═══
if '@keyframes gridFade' not in s:
    s = s.replace("@keyframes cardIn", "@keyframes gridFade { from{opacity:0} to{opacity:1} }\n        @keyframes cardIn", 1)
    print('  > gridFade keyframe')

# ═══ 7: ETAT VIDE ═══
old_grid = "          {!loading && !loadErr && view==='grid' && (()=>{"
if 'Aucune carte trouv' not in s:
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
    assert old_grid in s, "CIBLE GRID"
    s = s.replace(old_grid, empty, 1)
    print('  > empty state')

# ═══ 9: DOUBLE-CLIC ═══
old_click = "onClick={()=>handleCardClick(card.id)}"
idx = s.find(old_click)
if idx > 0:
    # Verifier qu'on est dans enc-card (grille)
    area = s[max(0,idx-300):idx]
    if 'enc-card' in area and 'onDoubleClick' not in s[idx:idx+200]:
        s = s[:idx] + "onClick={()=>handleCardClick(card.id)} onDoubleClick={e=>{e.stopPropagation();if(!isOwned(card)){addToPortfolio(card)}}}" + s[idx+len(old_click):]
        print('  > double-click')

# ═══ 5: SEPARATEURS SETS ═══
old_map = "                {pageCards.map((card,idx) => {"
if old_map in s and 'showSetHeader' not in s:
    new_map = """                {pageCards.map((card,idx) => {
                  const showSetHeader = sort==='set' && (idx===0 || card.setId !== pageCards[idx-1]?.setId)"""
    s = s.replace(old_map, new_map, 1)
    print('  > set header flag')

    # Ajouter le header avant le div enc-card
    old_div = """                    <div key={card.id}
                      className={`enc-card${isSel?' sel':''}`}"""
    new_div = """                    <>{showSetHeader && (
                      <div key={'sh-'+card.setId} style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:'10px', padding:'8px 0 4px', marginTop:idx>0?'12px':'0' }}>
                        <span style={{ fontSize:'12px', fontWeight:600, color:ERA_COLORS[card.era]||'#48484A', fontFamily:'var(--font-display)' }}>{card.setName}</span>
                        <div style={{ flex:1, height:'1px', background:'#EBEBEB' }}/>
                        <span style={{ fontSize:'10px', color:'#AEAEB2', fontFamily:'var(--font-data)' }}>{allCards.filter(c=>c.setId===card.setId).length} cartes</span>
                      </div>
                    )}
                    <div key={card.id}
                      className={`enc-card${isSel?' sel':''}`}"""
    if old_div in s:
        s = s.replace(old_div, new_div, 1)
        print('  > set separator div')

        # Fermer le Fragment <> a la fin de la carte
        # Trouver le </div> fermant de enc-card dans le return
        # Chercher la fin du map item (le dernier </div> avant le )})
        old_end_card = """                  </div>
                )
              })}"""
        new_end_card = """                  </div></>
                )
              })}"""
        if old_end_card in s:
            s = s.replace(old_end_card, new_end_card, 1)
            print('  > fragment close')

f.write_text(s, 'utf-8')
print('OK')
