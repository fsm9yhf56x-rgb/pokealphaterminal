#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

s = s.replace("color:p>=(li*25)&&li>0?lvlColor+'99':'#C7C7CC'", "color:p>=(li*25)&&li>0?lvlColor:'#86868B'")

f.write_text(s, 'utf-8')
print('OK — marqueurs plus fonces')
