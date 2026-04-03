#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Titre
s = s.replace("Ajouter une carte ou un item", "Ajouter une carte")

# 2. Label nom  
s = s.replace("Nom de la carte ou de l\\'item *", "Nom de la carte *")
s = s.replace("Nom de la carte ou de l'item *", "Nom de la carte *")

# 3. Placeholders
s = s.replace("Nom de la carte ou item\u2026", "Nom de la carte\u2026")
s = s.replace("Nom de la carte ou item...", "Nom de la carte...")

# 4. Scellé — supprimer de l'array
s = s.replace(",{k:'Scelle',l:'Scelle'}", "")

f.write_text(s, 'utf-8')
print('OK')
