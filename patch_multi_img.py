#!/usr/bin/env python3
"""Multi-source image fallback: TCGDex + PokemonTCG.io"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Remplacer le fallback simple par multi-source
old = """        // 2. Construire l'URL TCGDex directement
        if (sid) {
          updates[card.id] = 'https://assets.tcgdex.net/' + apiLang + '/' + sid + '/' + card.number + '/high.webp'
        }"""

new = """        // 2. Essayer plusieurs sources
        if (sid) {
          const urls = [
            'https://assets.tcgdex.net/' + apiLang + '/' + sid + '/' + card.number + '/high.webp',
            'https://assets.tcgdex.net/' + apiLang + '/' + sid + '/' + card.number + '/high.png',
            'https://assets.tcgdex.net/en/' + sid + '/' + card.number + '/high.webp',
            'https://images.pokemontcg.io/' + sid + '/' + card.number + '_hires.png',
            'https://images.pokemontcg.io/' + sid + '/' + card.number + '.png',
          ]
          let found = false
          for (const url of urls) {
            try {
              const r = await fetch(url, { method:'HEAD' })
              if (r.ok) { updates[card.id] = url; found = true; break }
            } catch {}
          }
          if (!found) {
            updates[card.id] = 'https://assets.tcgdex.net/' + apiLang + '/' + sid + '/' + card.number + '/high.webp'
          }
        }"""

assert old in s, "CIBLE FALLBACK"
s = s.replace(old, new, 1)
print('  > multi-source fallback')

# Ajouter aussi un onError fallback sur les images affichees
# Shelf image — ajouter fallback chain
old_shelf_err = """onError={e=>{ const t=e.target as HTMLImageElement; t.style.display='none' }}"""
new_shelf_err = """onError={e=>{
                                    const t=e.target as HTMLImageElement
                                    const src=t.src
                                    if(src.includes('high.webp')) t.src=src.replace('high.webp','high.png')
                                    else if(src.includes('high.png')&&src.includes('tcgdex')) t.src=src.replace('assets.tcgdex.net/fr','assets.tcgdex.net/en')
                                    else if(src.includes('tcgdex')&&!src.includes('low')) t.src=src.replace('/high.','/low.')
                                    else t.style.display='none'
                                  }}"""
c = s.count(old_shelf_err)
if c > 0:
    s = s.replace(old_shelf_err, new_shelf_err)
    print(f'  > shelf img fallback x{c}')

f.write_text(s, 'utf-8')
print('OK')
