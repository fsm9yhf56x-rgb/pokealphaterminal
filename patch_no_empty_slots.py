#!/usr/bin/env python3
"""Fix: pas de slots vides dans la page serie + bouton retour en haut"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Dans la grille, ne pas generer de slots vides pour remplir la derniere ligne
# Chercher la generation des emplacements vides dans le binder
# Les slots vides sont les "+" cards apres les vraies cartes
# Quand on est dans un set specifique, ne pas ajouter de padding
old_slots = "const slotsPer  = (binderSet&&binderSet!=='__all__') ? 9999 : binderCols*10"
assert old_slots in s, "CIBLE SLOTS"
# slotsPer reste 9999, le probleme est dans la generation de la grille

# Chercher ou les slots vides sont generes
# C'est dans binderPages — les items sont paddes pour remplir la grille
idx = s.find("binderPages")
print(f'  > binderPages at char {idx}')

# Chercher le padding de la grille
# Les emplacements "+" vides sont generes quand gridItems < slotsPer
old_empty = "Array.from({ length: slotsPer - pageItems.length })"
if old_empty in s:
    # Wrapper dans une condition: pas dans un set specifique
    new_empty = "Array.from({ length: (binderSet&&binderSet!=='__all__') ? 0 : slotsPer - pageItems.length })"
    s = s.replace(old_empty, new_empty, 1)
    print('  > no empty slots in set view')
else:
    # Chercher autrement
    print('  > empty slots pattern not found, searching...')
    # Chercher le "+" dans les emplacements vides
    idx_plus = s.find("fontSize:'20px', color:'#C7C7CC'")
    if idx_plus > 0:
        print(f'    found + icon at {idx_plus}')

# 2. Bouton retour en haut — sticky en bas a droite
old_end = """                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SHOWCASE"""
if old_end not in s:
    # Chercher une alternative
    idx_showcase = s.find("{/* SHOWCASE")
    if idx_showcase > 0:
        # Inserer le bouton avant SHOWCASE
        btn = """
        {/* Retour en haut */}
        {view==='binder'&&binderSet&&binderSet!=='__all__'&&(
          <button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} style={{ position:'fixed', bottom:'24px', right:'24px', width:'44px', height:'44px', borderRadius:'50%', background:'#1D1D1F', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(0,0,0,.15)', zIndex:30, transition:'all .2s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.2)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.15)'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
          </button>
        )}

        {/* SHOWCASE"""
        s = s[:idx_showcase] + btn + s[idx_showcase+len("{/* SHOWCASE"):]
        print('  > back to top button')
else:
    btn = """
        {/* Retour en haut */}
        {view==='binder'&&binderSet&&binderSet!=='__all__'&&(
          <button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} style={{ position:'fixed', bottom:'24px', right:'24px', width:'44px', height:'44px', borderRadius:'50%', background:'#1D1D1F', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(0,0,0,.15)', zIndex:30, transition:'all .2s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.2)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.15)'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
          </button>
        )}

        {/* SHOWCASE"""
    s = s.replace(old_end + "\n\n        {/* SHOWCASE", old_end + btn, 1)
    print('  > back to top button')

f.write_text(s, 'utf-8')
print('OK')
