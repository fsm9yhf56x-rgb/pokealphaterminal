#!/usr/bin/env python3
from pathlib import Path
f = Path('src/lib/constants/navigation.ts')
s = f.read_text('utf-8')

s = s.replace("{ label:'Encyclop\u00e9die', href:'/cartes'        }", "{ label:'Cartes', href:'/cartes'        }")

f.write_text(s, 'utf-8')
print('OK')
