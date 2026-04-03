#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Etoile — fond or solide
s = s.replace(
    "const lvlBg = isComplete?'linear-gradient(135deg,#D4B85C,#F0E080,#FFFAD0,#F0E080)'",
    "const lvlBg = isComplete?'#D4AF37'"
)
s = s.replace("const lvlColor = isComplete?'#fff'", "const lvlColor = isComplete?'#FFF8DC'")
s = s.replace("const lvlBorder = isComplete?'rgba(240,224,128,.5)'", "const lvlBorder = isComplete?'#C9A84C'")
print('  > star')

# 2. Masquer markers quand complete — ligne 1600
old = "                                      {(['0','25%','50%','75%','100%'] as string[]).map((label,li)=>("
new = "                                      {!isComplete&&(['0','25%','50%','75%','100%'] as string[]).map((label,li)=>("
assert old in s, "CIBLE MARKERS"
s = s.replace(old, new, 1)
print('  > hide markers')

# 3. Nom du set
s = s.replace("color:isComplete?'#6B5A1E':'#1D1D1F'", "color:isComplete?'#8B7320':'#1D1D1F'")
print('  > name')

# 4. Remove boxShadow jaune sur etoile
s = s.replace("boxShadow:'none'", "boxShadow:'none'")  # deja fait

f.write_text(s, 'utf-8')
print('OK')
