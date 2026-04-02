#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

old = "const [binderCols,  setBinderCols]  = useState(6)"
new = "const [binderCols,  setBinderCols]  = useState(7)"
assert old in s
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK — 7 colonnes par defaut')
