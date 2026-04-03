#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

s = s.replace("top:0, left:0, right:0, height:'50%', zIndex:20", "top:0, left:0, right:0, height:'25%', zIndex:20")
s = s.replace("top:0, left:0, right:0, height:'45%', zIndex:20", "top:0, left:0, right:0, height:'25%', zIndex:20")

f.write_text(s, 'utf-8')
print('OK — 25%')
