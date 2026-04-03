#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

old = "const slotsPer  = binderCols*3"
new = "const slotsPer  = (binderSet&&binderSet!=='__all__') ? binderCols*6 : binderCols*3"
assert old in s, "CIBLE"
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK — 6 lignes dans un set, 3 sinon')
