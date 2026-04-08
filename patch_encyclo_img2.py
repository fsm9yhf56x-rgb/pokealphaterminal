#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# Fix grid: ne pas ajouter /low.webp si l'URL est deja complete
old = "const img   = card.image ? `${card.image}/low.webp` : null"
new = "const img   = card.image ? (card.image.includes('/high.') || card.image.includes('/low.') ? card.image.replace('/high.','/low.') : `${card.image}/low.webp`) : null"
assert old in s, "CIBLE"
s = s.replace(old, new, 1)
print('OK')

f.write_text(s, 'utf-8')
