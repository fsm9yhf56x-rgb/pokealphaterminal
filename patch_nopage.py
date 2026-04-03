#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Dans un set specifique: toutes les cartes sur une page
old = "const slotsPer  = (binderSet&&binderSet!=='__all__') ? binderCols*9 : binderCols*3"
new = "const slotsPer  = (binderSet&&binderSet!=='__all__') ? 9999 : binderCols*3"
assert old in s, "CIBLE"
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK — toutes les cartes en une page')
