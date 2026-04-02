#!/usr/bin/env python3
"""Le + dans un set pre-remplit la serie dans le modal d'ajout"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Le bouton + dans le shelf est:
# <div onClick={()=>setAddOpen(true)}
#   style={{ flexShrink:0, width:'180px', aspectRatio:'63/88' ...

old_plus = """<div onClick={()=>setAddOpen(true)}
                              style={{ flexShrink:0, width:'180px', aspectRatio:'63/88', borderRadius:'12px', border:'1.5px dashed #C8C5C0', background:'#F0F0F5', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all .15s' }}"""
new_plus = """<div onClick={()=>{
                                const sid=setCards.find(c=>c.setId)?.setId||''
                                setAddForm(p=>({...p, set:setName, setId:sid}))
                                if(sid){ setCardsLoading(true); setLiveCards([]); fetchCardsForSet(addForm.lang,sid).then(cards=>{setLiveCards(cards);setCardsLoading(false)}).catch(()=>setCardsLoading(false)) }
                                setAddOpen(true)
                              }}
                              style={{ flexShrink:0, width:'180px', aspectRatio:'63/88', borderRadius:'12px', border:'1.5px dashed #C8C5C0', background:'#F0F0F5', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all .15s' }}"""
assert old_plus in s, "CIBLE PLUS"
s = s.replace(old_plus, new_plus, 1)

f.write_text(s, 'utf-8')
print('OK — + pre-remplit la serie')
