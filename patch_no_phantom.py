#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

old = "const phantomCount = gridItems.some(g=>g.type==='ghost') ? 0 : binderSet ? Math.max(0,slotsPer-pageItems.length) : 0"
new = "const phantomCount = 0"
assert old in s, "CIBLE"
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK')
