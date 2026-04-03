#!/usr/bin/env python3
from pathlib import Path
f = Path('src/lib/constants/navigation.ts')
s = f.read_text('utf-8')

s = s.replace("    label: 'Cartes',", "    label: 'Pok\u00e9desk',")

f.write_text(s, 'utf-8')
print('OK — Cartes -> Pokedesk')
