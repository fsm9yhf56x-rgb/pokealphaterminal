#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# 1. Retirer le sticky du div interieur (conflit)
old = "background:'#fff', border:'1px solid #EBEBEB', borderRadius:'16px', overflow:'hidden', position:'sticky', top:'20px', maxHeight:'90vh', overflowY:'auto' as const"
new = "background:'#fff', border:'1px solid #EBEBEB', borderRadius:'16px', overflow:'hidden', overflowY:'auto' as const"
assert old in s, "CIBLE INNER"
s = s.replace(old, new, 1)
print('  > removed inner sticky')

# 2. Verifier que le parent flex n'a pas overflow:hidden
# Chercher le container flex qui contient la grille + le detail panel
idx = s.find("{/* ── DETAIL PANEL")
chunk = s[max(0,idx-500):idx]
if "overflow:'hidden'" in chunk or 'overflow:hidden' in chunk:
    print('  > WARNING: parent has overflow hidden')

# 3. Ajouter alignItems flex-start sur le parent flex
# Le parent doit avoir align-items: flex-start pour que sticky marche
idx_panel = s.find("detail-panel")
parent_area = s[max(0,idx_panel-1000):idx_panel]
# Chercher le dernier display:'flex' avant le detail panel
flex_pos = parent_area.rfind("display:'flex'")
if flex_pos > 0:
    real_pos = max(0,idx_panel-1000) + flex_pos
    line_start = s.rfind('\n', 0, real_pos)
    line_end = s.find('\n', real_pos)
    line = s[line_start:line_end]
    if "alignItems" not in line:
        s = s[:real_pos] + "display:'flex', alignItems:'flex-start'" + s[real_pos+len("display:'flex'"):]
        print('  > added alignItems flex-start to parent')

f.write_text(s, 'utf-8')
print('OK')
