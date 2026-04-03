#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Star bg
old = "const lvlBg = isComplete?'rgba(255,215,0,.15)'"
new = "const lvlBg = isComplete?'linear-gradient(135deg,#D4B85C,#F0E080,#FFFAD0,#F0E080)'"
assert old in s, "CIBLE BG"
s = s.replace(old, new, 1)

# 2. Star color
old = "const lvlColor = isComplete?'rgba(255,215,0,.9)'"
new = "const lvlColor = isComplete?'#fff'"
assert old in s, "CIBLE COLOR"
s = s.replace(old, new, 1)

# 3. Star border
old = "const lvlBorder = isComplete?'rgba(255,215,0,.4)'"
new = "const lvlBorder = isComplete?'rgba(240,224,128,.5)'"
assert old in s, "CIBLE BORDER"
s = s.replace(old, new, 1)

# 4. Remove yellow boxShadow on star
s = s.replace("boxShadow:isComplete?'0 0 12px rgba(255,215,0,.4)':'none'", "boxShadow:'none'")

# 5. Name color
s = s.replace("color:isComplete?'#B8860B':'#1D1D1F'", "color:isComplete?'#6B5A1E':'#1D1D1F'")

f.write_text(s, 'utf-8')
print('OK')
