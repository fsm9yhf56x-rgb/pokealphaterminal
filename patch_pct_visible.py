#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Les marqueurs % sont en rgba(29,29,31,.07) quand non atteints — quasi invisible
# Rendre plus visible
old = "color:p>=(li*25)&&li>0?lvlColor+'99':'rgba(29,29,31,.07)'"
new = "color:p>=(li*25)&&li>0?lvlColor+'99':'#C7C7CC'"
count = s.count(old)
assert count >= 1, "CIBLE"
s = s.replace(old, new)
print(f'  > {count} marqueurs % plus visibles')

f.write_text(s, 'utf-8')
print('OK')
