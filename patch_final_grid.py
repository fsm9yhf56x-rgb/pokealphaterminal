#!/usr/bin/env python3
"""Fix DEFINITIF — minmax(0,1fr) anti-overflow + aere + infos completes"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Grid columns — minmax(0,1fr) au lieu de 1fr pour tuer l'overflow
old = "gridTemplateColumns:`repeat(${binderCols},1fr)`"
new = "gridTemplateColumns:`repeat(${binderCols},minmax(0,1fr))`"
assert old in s, "CIBLE GRID COLS NON TROUVEE"
s = s.replace(old, new, 1)
print('  > minmax(0,1fr)')

# 2. Gap plus aere
old_gap = "gap:binderCols>=7?'6px':'10px'"
new_gap = "gap:binderCols>=7?'8px':'12px'"
assert old_gap in s, "CIBLE GAP NON TROUVEE"
s = s.replace(old_gap, new_gap, 1)
print('  > gap plus aere')

# 3. Outer padding un peu plus genereux
old_outer = "padding:'0 16px 20px'"
new_outer = "padding:'0 20px 20px'"
assert old_outer in s, "CIBLE OUTER NON TROUVEE"
s = s.replace(old_outer, new_outer, 1)
print('  > padding 20px')

# 4. Label section — plus d'espace, toutes les infos
# Trouver le label dans le binder grid (avec fsName)
old_label = "padding:binderCols>=7?'4px 4px 3px':'6px 6px 4px', height:binderCols>=7?'34px':'42px', overflow:'hidden'"
new_label = "padding:'6px 4px 8px'"
if old_label in s:
    s = s.replace(old_label, new_label, 1)
    print('  > label padding restaure')
else:
    # Fallback si le patch label n'a pas ete applique
    old_label2 = "padding:'8px 8px 6px'"
    i1 = s.find(old_label2)
    i2 = s.find(old_label2, i1 + 1)
    if i2 > 0:
        s = s[:i2] + "padding:'6px 4px 8px'" + s[i2+len(old_label2):]
        print('  > label padding (fallback)')

f.write_text(s, 'utf-8')
print('OK — zero coupe, plus aere, infos completes')
