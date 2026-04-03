#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

s = s.replace("[6,7,8].map(n=>(", "[6,7,8,9].map(n=>(")

f.write_text(s, 'utf-8')
print('OK — 9 colonnes dispo')
