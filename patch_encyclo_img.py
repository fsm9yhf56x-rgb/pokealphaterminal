#!/usr/bin/env python3
"""Fix: construire l'URL image quand elle manque dans les donnees statiques"""
from pathlib import Path

f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# Dans le mapping des cartes statiques, construire l'URL si img est null
old = """            enriched.push({
              id: sid+'-'+c.lid, localId: c.lid, name: c.n, image: c.img||'',
              rarity: c.r||'',"""

new = """            const apiLang = lang === 'JP' ? 'ja' : lang === 'EN' ? 'en' : 'fr'
            enriched.push({
              id: sid+'-'+c.lid, localId: c.lid, name: c.n,
              image: c.img || ('https://assets.tcgdex.net/' + apiLang + '/' + sid + '/' + c.lid + '/high.webp'),
              rarity: c.r||'',"""

assert old in s, "CIBLE"
s = s.replace(old, new, 1)
print('OK')

f.write_text(s, 'utf-8')
