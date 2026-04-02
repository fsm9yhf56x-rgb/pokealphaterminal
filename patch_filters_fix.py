#!/usr/bin/env python3
"""Enleve Rares, fix filtres Gradees/Raw dans le shelf"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Supprimer le bouton Rares
old_btns = "{([{k:'all' as const,l:'Toutes'},{k:'graded' as const,l:'Gradees'},{k:'raw' as const,l:'Raw'},{k:'rare' as const,l:'Rares'}] as const)"
new_btns = "{([{k:'all' as const,l:'Toutes'},{k:'graded' as const,l:'Gradees'},{k:'raw' as const,l:'Raw'}] as const)"
assert old_btns in s, "CIBLE BTNS"
s = s.replace(old_btns, new_btns, 1)
print('  > Rares supprime')

# 2. Appliquer le filtre dans le shelf — cardImgs doit filtrer aussi
old_cardimgs = """const cardImgs=[...setCards].sort((a,b)=>{
                        if(binderSort==='number') return (parseInt(a.number)||999)-(parseInt(b.number)||999)
                        if(binderSort==='name') return a.name.localeCompare(b.name)
                        if(binderSort==='price') return b.curPrice-a.curPrice
                        return 0
                      })"""
new_cardimgs = """const cardImgs=[...setCards].filter(c=>{
                        if(binderFilter==='graded') return c.graded
                        if(binderFilter==='raw') return !c.graded
                        return true
                      }).sort((a,b)=>{
                        if(binderSort==='number') return (parseInt(a.number)||999)-(parseInt(b.number)||999)
                        if(binderSort==='name') return a.name.localeCompare(b.name)
                        if(binderSort==='price') return b.curPrice-a.curPrice
                        return 0
                      })"""
assert old_cardimgs in s, "CIBLE CARDIMGS"
s = s.replace(old_cardimgs, new_cardimgs, 1)
print('  > filtre applique au shelf')

f.write_text(s, 'utf-8')
print('OK')
