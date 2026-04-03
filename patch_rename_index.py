#!/usr/bin/env python3
from pathlib import Path

# 1. Composant Encyclopedie — titre affiché
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')
s = s.replace(">Encyclop\u00e9die<", ">Index<")
f.write_text(s, 'utf-8')
print('  > composant')

# 2. Page metadata
f2 = Path('src/app/(dashboard)/cartes/page.tsx')
s2 = f2.read_text('utf-8')
s2 = s2.replace("title: 'Encyclop\u00e9die", "title: 'Index")
f2.write_text(s2, 'utf-8')
print('  > metadata')

print('OK')
