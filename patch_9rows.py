#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

s = s.replace("binderCols*6 : binderCols*3", "binderCols*9 : binderCols*3")

f.write_text(s, 'utf-8')
print('OK — 9 lignes dans un set')
