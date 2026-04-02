#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Transition plus longue, easing ultra doux
old = "transition:transform .45s cubic-bezier(.25,.1,.25,1),box-shadow .5s cubic-bezier(.25,.1,.25,1)"
new = "transition:transform .55s cubic-bezier(.4,0,.1,1),box-shadow .6s cubic-bezier(.4,0,.1,1)"
assert old in s
s = s.replace(old, new, 1)

# Hover — lift plus doux -6px, shadow progressive
old_h = ".pocket-shell:hover { transform:translateY(-8px) !important;box-shadow:0 20px 40px rgba(0,0,0,.10),0 8px 16px rgba(0,0,0,.04) !important; }"
new_h = ".pocket-shell:hover { transform:translateY(-6px) !important;box-shadow:0 16px 48px rgba(0,0,0,.08),0 6px 20px rgba(0,0,0,.03) !important; }"
assert old_h in s
s = s.replace(old_h, new_h, 1)

# Active — micro feedback
old_a = ".pocket-shell:active { transform:translateY(-4px) !important;transition-duration:.08s !important; }"
new_a = ".pocket-shell:active { transform:translateY(-3px) scale(.99) !important;transition-duration:.12s !important; }"
assert old_a in s
s = s.replace(old_a, new_a, 1)

f.write_text(s, 'utf-8')
print('OK — hover ultra doux')
