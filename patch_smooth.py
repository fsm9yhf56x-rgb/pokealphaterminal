#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

old = "transition:transform .3s cubic-bezier(.22,.68,0,1.1),box-shadow .35s ease;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.04),0 1px 4px rgba(0,0,0,.02)"
new = "transition:transform .45s cubic-bezier(.25,.1,.25,1),box-shadow .5s cubic-bezier(.25,.1,.25,1);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.04),0 1px 4px rgba(0,0,0,.02)"
assert old in s
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK — hover smooth .45s ease-out')
