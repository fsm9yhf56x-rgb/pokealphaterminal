#!/usr/bin/env python3
"""Fix prefill — cherche le setId dans liveSets si pas sur les cartes"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Remplacer le onClick du + dans le shelf
old = """<div onClick={()=>{
                                const sid=setCards.find(c=>c.setId)?.setId||''
                                setAddForm(p=>({...p, set:setName, setId:sid}))
                                if(sid){ setCardsLoading(true); setLiveCards([]); fetchCardsForSet(addForm.lang,sid).then(cards=>{setLiveCards(cards);setCardsLoading(false)}).catch(()=>setCardsLoading(false)) }
                                setAddOpen(true)
                              }}"""
new = """<div onClick={()=>{
                                const sid=setCards.find(c=>c.setId)?.setId || liveSets.find(ls=>ls.name===setName)?.id || liveSets.find(ls=>ls.name.toLowerCase()===setName.toLowerCase())?.id || ''
                                setAddForm(p=>({...p, set:setName, setId:sid}))
                                if(sid){ setCardsLoading(true); setLiveCards([]); fetchCardsForSet(addForm.lang,sid).then(cards=>{setLiveCards(cards);setCardsLoading(false)}).catch(()=>setCardsLoading(false)) }
                                setAddOpen(true)
                              }}"""
assert old in s, "CIBLE PREFILL"
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK — prefill cherche aussi dans liveSets')
