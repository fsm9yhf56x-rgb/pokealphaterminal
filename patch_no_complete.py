#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Trouver et supprimer le bloc COLLECTION COMPLETE
idx = s.find('COLLECTION COMPL')
if idx < 0:
    print('non trouve')
    exit(0)

# Reculer pour trouver le debut du bloc {isComplete&&<div
start = s.rfind('{isComplete&&<div', 0, idx)
# Trouver la fin — le prochain />} ou </span></div>}
end = s.find('>}', idx) + 2

old = s[start:end]
print(f'  > supprime: {repr(old[:60])}...')
s = s.replace(old, '', 1)

f.write_text(s, 'utf-8')
print('OK')
