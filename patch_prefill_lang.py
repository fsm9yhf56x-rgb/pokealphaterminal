#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

old = """const sid=setCards.find(c=>c.setId)?.setId || liveSets.find(ls=>ls.name===setName)?.id || liveSets.find(ls=>ls.name.toLowerCase()===setName.toLowerCase())?.id || ''
                                setAddForm(p=>({...p, set:setName, setId:sid}))"""
new = """const lang=setCards[0]?.lang||'FR'
                                const sid=setCards.find(c=>c.setId)?.setId || liveSets.find(ls=>ls.name===setName)?.id || liveSets.find(ls=>ls.name.toLowerCase()===setName.toLowerCase())?.id || ''
                                setAddForm(p=>({...p, set:setName, setId:sid, lang}))"""
assert old in s, "CIBLE"
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK — langue pre-remplie depuis le set')
