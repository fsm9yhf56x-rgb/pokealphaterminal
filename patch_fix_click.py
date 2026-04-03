#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

old = "/* TODO: modal ajouter serie */showToast('Bient\u00f4t disponible')"
new = "setAddSetOpen(true);setAddSetCards([]);setAddSetId('');setAddSetName('')"
assert old in s, "CIBLE"
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK')
