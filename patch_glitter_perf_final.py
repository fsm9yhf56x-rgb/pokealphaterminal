#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. 2000 -> 500
s = s.replace(
    "const count = el.classList.contains('master-glitter-container') ? 2000 : 40",
    "const count = el.classList.contains('master-glitter-container') ? 500 : 40", 1)
print('  > 500 points')

# 2. CSS containment sur glitter
old = ".pocket-shell { contain:layout style paint; }"
new = """.pocket-shell { contain:layout style paint; }
        .master-glitter-container, .badge-glitter-container { contain:strict; will-change:opacity; pointer-events:none; }
        .master-glitter-container div, .badge-glitter-container div { will-change:opacity; }"""
assert old in s
s = s.replace(old, new, 1)
print('  > CSS contain')

f.write_text(s, 'utf-8')
print('OK')
