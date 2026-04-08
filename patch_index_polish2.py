#!/usr/bin/env python3
"""5: separateurs sets, 7: etat vide, 8: page transition, 9: double-clic"""
from pathlib import Path

EA = '\u00e9'
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# ═══ 7: ETAT VIDE ELEGANT ═══
old_no_results = """{!loading && !loadErr && filtered.length===0 && allCards.length>0 && ("""
if old_no_results in s:
    # Deja gere
    print('  > empty state already present')
else:
    # Ajouter avant la grille
    old_grid_start = """          {!loading && !loadErr && view==='grid' && (()=>{"""
    empty_state = """          {!loading && !loadErr && filtered.length===0 && allCards.length>0 && (
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
    if old_grid_start in s:
        s = s.replace(old_grid_start, empty_state, 1)
        print('  > empty state')

# ═══ 8: PAGE TRANSITION FADE ═══
# Ajouter une key sur le grid container pour trigger re-render animation
old_grid_container = """style={{ display:'grid', gridTemplateColumns:cfg.cols"""
if old_grid_container in s:
    # Le container n'a pas de key, en ajouter une basee sur la page
    idx_gc = s.find(old_grid_container)
    # Remonter pour trouver le <div
    div_start = s.rfind("<div", 0, idx_gc)
    old_div = s[div_start:idx_gc]
    if "key=" not in old_div:
        new_div = old_div.replace("<div ", "<div key={'page-'+page+'-'+filSet+'-'+filRarity} ")
        s = s.replace(old_div + old_grid_container, new_div + old_grid_container, 1)
        print('  > page transition key')

# Ajouter fadeIn sur le grid
if "@keyframes cardIn" in s and "@keyframes gridFade" not in s:
    s = s.replace("@keyframes cardIn", "@keyframes gridFade { from{opacity:0} to{opacity:1} }\n        @keyframes cardIn", 1)
    # Ajouter l'animation sur le grid container
    old_gc_style = "style={{ display:'grid', gridTemplateColumns:cfg.cols"
    new_gc_style = "style={{ display:'grid', gridTemplateColumns:cfg.cols, animation:'gridFade .2s ease-out'"
    if old_gc_style in s:
        s = s.replace(old_gc_style, new_gc_style, 1)
        print('  > grid fade animation')

# ═══ 9: DOUBLE-CLIC AJOUTER AU PORTFOLIO ═══
old_click = """onClick={()=>handleCardClick(card.id)}"""
idx_click = s.find(old_click)
if idx_click > 0:
    # Verifier qu'on est dans la grille (pas la liste)
    area_before = s[max(0,idx_click-200):idx_click]
    if "enc-card" in area_before:
        new_click = """onClick={()=>handleCardClick(card.id)} onDoubleClick={e=>{e.stopPropagation();if(!isOwned(card)){addToPortfolio(card)}}}"""
        s = s.replace(old_click, new_click, 1)
        print('  > double-click add')

# ═══ 5: SEPARATEURS SETS DANS LA GRILLE ═══
# Quand sort==='set', ajouter des headers entre les groupes
# C'est plus complexe car il faut modifier le mapping de la grille
# Approche: ajouter un label au-dessus du premier card de chaque set
old_page_cards_map = """                {pageCards.map((card,idx) => {"""
if old_page_cards_map in s:
    new_page_cards_map = """                {pageCards.map((card,idx) => {
                  const showSetHeader = sort==='set' && (idx===0 || card.setId !== pageCards[idx-1]?.setId)"""
    s = s.replace(old_page_cards_map, new_page_cards_map, 1)
    print('  > set header flag')
    
    # Ajouter le header avant chaque carte
    old_card_div = """                    <div key={card.id}
                      className={`enc-card${isSel?' sel':''}`}"""
    new_card_div = """                    {showSetHeader && (
                      <div key={'sh-'+card.setId} style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:'10px', padding:'8px 0 4px', marginTop:idx>0?'12px':'0' }}>
                        <span style={{ fontSize:'12px', fontWeight:600, color:ERA_COLORS[card.era]||'#48484A', fontFamily:'var(--font-display)' }}>{card.setName}</span>
                        <div style={{ flex:1, height:'1px', background:'#EBEBEB' }}/>
                        <span style={{ fontSize:'10px', color:'#AEAEB2', fontFamily:'var(--font-data)' }}>{allCards.filter(c=>c.setId===card.setId).length} cartes</span>
                      </div>
                    )}
                    <div key={card.id}
                      className={`enc-card${isSel?' sel':''}`}"""
    if old_card_div in s:
        s = s.replace(old_card_div, new_card_div, 1)
        print('  > set separator')

f.write_text(s, 'utf-8')
print('OK')
