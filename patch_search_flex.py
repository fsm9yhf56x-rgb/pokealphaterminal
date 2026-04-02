#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Search bar — width fixe -> flex 1
old = "position:'relative', width:'220px', flexShrink:0"
new = "position:'relative', flex:1, minWidth:'120px'"
assert old in s, "CIBLE"
s = s.replace(old, new, 1)

# Filtres — ajouter flexShrink:0
old_filters = "display:'flex', gap:'4px', alignItems:'center', flexWrap:'wrap'"
new_filters = "display:'flex', gap:'4px', alignItems:'center', flexShrink:0"
assert old_filters in s, "CIBLE FILTERS"
s = s.replace(old_filters, new_filters, 1)

f.write_text(s, 'utf-8')
print('OK — search flex:1, filtres a droite')
