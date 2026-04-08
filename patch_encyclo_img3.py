#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# 1. Grille: utiliser high directement au lieu de low
old = "const img   = card.image ? (card.image.includes('/high.') || card.image.includes('/low.') ? card.image.replace('/high.','/low.') : `${card.image}/low.webp`) : null"
new = "const img   = card.image ? (card.image.includes('.webp') || card.image.includes('.png') || card.image.includes('.jpg') ? card.image : `${card.image}/high.webp`) : null"
assert old in s, "CIBLE1"
s = s.replace(old, new, 1)
print('  > grid img fix')

# 2. onError: fallback chain au lieu de display:none
old2 = """{img && <img src={img} alt={card.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} onError={e=>{ (e.target as HTMLImageElement).style.display='none' }}/>}"""
new2 = """{img && <img src={img} alt={card.name} loading="lazy" decoding="async" style={{ width:'100%', height:'100%', objectFit:'contain' }} onError={e=>{
                          const t=e.target as HTMLImageElement
                          const src=t.src
                          if(src.includes('high.webp')) t.src=src.replace('high.webp','high.png')
                          else if(src.includes('high.png')) t.src=src.replace('/high.','/low.')
                          else if(src.includes('/fr/')) t.src=src.replace('/fr/','/en/')
                          else t.style.opacity='0'
                        }}/>}"""
assert old2 in s, "CIBLE2"
s = s.replace(old2, new2, 1)
print('  > onError fallback chain')

f.write_text(s, 'utf-8')
print('OK')
