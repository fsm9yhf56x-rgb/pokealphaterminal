#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# GPU compositing sur chaque carte du shelf + transition fluide
old = ".shelf-row { scrollbar-width:none; -ms-overflow-style:none; overflow-x:scroll !important; scroll-behavior:smooth; -webkit-overflow-scrolling:touch; }"
new = """.shelf-row { scrollbar-width:none; -ms-overflow-style:none; overflow-x:scroll !important; -webkit-overflow-scrolling:touch; }
        .shelf-row > div { transform:translateZ(0); backface-visibility:hidden; }"""
assert old in s, "CIBLE"
s = s.replace(old, new, 1)
print('OK')

f.write_text(s, 'utf-8')
