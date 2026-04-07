#!/usr/bin/env python3
from pathlib import Path
import re

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Reduce badge glitter: 80 -> 40 dans l'observer
old = "const count = el.classList.contains('master-glitter-container') ? 2000 : 80"
new = "const count = el.classList.contains('master-glitter-container') ? 2000 : 40"
assert old in s, "CIBLE COUNT"
s = s.replace(old, new, 1)
print('  > badge 80->40')

# 2. decoding async sur les img lazy
count = 0
def add_dec(match):
    global count
    full = match.group(0)
    if 'decoding=' in full:
        return full
    count += 1
    return full.replace('<img loading="lazy"', '<img loading="lazy" decoding="async"', 1)
s = re.sub(r'<img loading="lazy"', add_dec, s)
print(f'  > decoding async x{count}')

# 3. All collection 15->10 rows
s = s.replace("9999 : binderCols*15", "9999 : binderCols*10")
print('  > rows 15->10')

f.write_text(s, 'utf-8')
print('OK')
