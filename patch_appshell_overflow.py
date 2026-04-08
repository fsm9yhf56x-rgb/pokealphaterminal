#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/layout/AppShell.tsx')
s = f.read_text('utf-8')

old = "overflowX:'hidden'"
new = "overflowX:'clip' as any"
assert old in s, "CIBLE"
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK — overflow clip (ne casse pas sticky)')
