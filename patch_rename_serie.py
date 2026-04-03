#!/usr/bin/env python3
from pathlib import Path

EA = '\u00e9'
EG = '\u00e8'

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. "Par sets" -> "Par s\u00e9ries"
s = s.replace("Par sets", "Par s" + EA + "ries")

# 2. "Tous les sets" -> "Toutes les s\u00e9ries"
s = s.replace("Tous les sets", "Toutes les s" + EA + "ries")

# 3. "Rechercher un set..." -> "Rechercher une s\u00e9rie..."
s = s.replace("Rechercher un set...", "Rechercher une s" + EA + "rie...")

# 4. "Voir le set complet" -> "Voir la s\u00e9rie compl\u00e8te"
s = s.replace("Voir le set complet", "Voir la s" + EA + "rie compl" + EG + "te")

# 5. "Set d\u00e9j\u00e0 complet" -> "S\u00e9rie d\u00e9j\u00e0 compl\u00e8te"
s = s.replace("Set d" + EA + "j" + "\u00e0" + " complet", "S" + EA + "rie d" + EA + "j" + "\u00e0" + " compl" + EG + "te")

# 6. " sets" dans les compteurs -> " s\u00e9ries"
s = s.replace("' sets'", "' s" + EA + "ries'")
s = s.replace("' set'}", "' s" + EA + "rie'}")

# 7. "cartes sur" reste ok

f.write_text(s, 'utf-8')
print('OK')
