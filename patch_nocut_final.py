#!/usr/bin/env python3
"""Fix coupure droite — supprimer overflow grid + unifier padding"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Grid — retirer overflow hidden (c'est lui qui coupe)
old_grid = "gridAutoRows:'1fr', gap:binderCols>=7?'6px':'10px', padding:'4px 0', overflow:'hidden'"
new_grid = "gridAutoRows:'1fr', gap:binderCols>=7?'6px':'10px', padding:'4px 0'"
assert old_grid in s, "CIBLE GRID NON TROUVEE"
s = s.replace(old_grid, new_grid, 1)
print('  > grid overflow removed')

# 2. Inner padding — 0 horizontal, laisser le outer gerer
old_inner = "padding:binderCols>=7?'12px 6px 10px':'12px 12px 10px'"
new_inner = "padding:'12px 0 10px'"
assert old_inner in s, "CIBLE INNER NON TROUVEE"
s = s.replace(old_inner, new_inner, 1)
print('  > inner padding 0 horizontal')

# 3. Outer binder padding — uniforme et reduit
old_outer = "padding:'0 12px 20px'"
new_outer = "padding:'0 16px 20px'"
assert old_outer in s, "CIBLE OUTER NON TROUVEE"
s = s.replace(old_outer, new_outer, 1)
print('  > outer padding 16px')

f.write_text(s, 'utf-8')
print('OK — plus de coupe a droite')
