#!/usr/bin/env python3
"""Deplace le badge grade de l'image vers la description"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Supprimer le badge grade de l'image dans le binder grid
# C'est le bloc {card.graded&&(()=>{ ... avec position:'absolute', top:'5px', left:'5px'
old_badge = """                            {card.graded&&(()=>{
                            const gNote=parseInt(card.condition.replace(/[^0-9]/g,''))
                            const gn2=gNote
                            const bg2=gn2>=10?'linear-gradient(90deg,#C9A84C,#FFD700,#FFF1A8,#FFD700,#C9A84C)':gn2>=8?'linear-gradient(135deg,#A8A8A8,#D8D8D8,#A8A8A8)':gn2>=5?'linear-gradient(135deg,#A0724A,#C4956A,#A0724A)':'#48484A'
                            const fg2=gn2>=10?'#1a1200':gn2>=8?'#333':gn2>=5?'#2a1800':'#fff'
                            const sh2=gn2>=10?'0 2px 8px rgba(201,168,76,.4)':gn2>=8?'0 2px 6px rgba(0,0,0,.1)':gn2>=5?'0 2px 6px rgba(160,114,74,.2)':'none'
                            return <div style={{ position:'absolute', top:'5px', left:'5px', fontSize:'8px', fontWeight:800, background:bg2, color:fg2, padding:'2px 7px', borderRadius:'5px', fontFamily:'var(--font-data)', zIndex:2, boxShadow:sh2, letterSpacing:'.03em', backgroundSize:gn2>=10?'300% 100%':'auto', animation:gn2>=10?'goldShine 3s ease-in-out infinite':'none' }}>{card.condition}</div>
                          })()}"""
assert old_badge in s, "CIBLE BADGE IMAGE NON TROUVEE"
s = s.replace(old_badge, "", 1)
print('  > badge retire de l image')

# 2. Ajouter le badge grade dans la section label, apres le numero/rarity
old_info_line = """{card.rarity&&card.rarity!==''&&<span style={{ fontSize:binderCols>=7?'8px':'10px', color:'#6E6E73', fontFamily:'var(--font-display)', marginLeft:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, maxWidth:binderCols>=7?'60px':'none' }}>{card.rarity}</span>}"""
new_info_line = """{card.rarity&&card.rarity!==''&&<span style={{ fontSize:binderCols>=7?'8px':'10px', color:'#6E6E73', fontFamily:'var(--font-display)', marginLeft:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, maxWidth:binderCols>=7?'60px':'none' }}>{card.rarity}</span>}
                              {card.graded&&(()=>{
                                const gn3=parseInt(card.condition.replace(/[^0-9]/g,''))
                                const bg3=gn3>=10?'linear-gradient(90deg,#C9A84C,#FFD700,#FFF1A8,#FFD700,#C9A84C)':gn3>=9?'linear-gradient(135deg,#A8A8A8,#E8E8E8,#A8A8A8)':gn3>=5?'linear-gradient(135deg,#A0724A,#C4956A,#A0724A)':'#6E6E73'
                                const fg3=gn3>=10?'#1a1200':gn3>=9?'#222':gn3>=5?'#2a1800':'#fff'
                                const sh3=gn3>=10?'0 1px 4px rgba(201,168,76,.35)':gn3>=9?'0 1px 3px rgba(0,0,0,.08)':'none'
                                return <span style={{ fontSize:binderCols>=7?'7px':'8px', fontWeight:800, background:bg3, color:fg3, padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-data)', boxShadow:sh3, letterSpacing:'.03em', backgroundSize:gn3>=10?'300% 100%':'auto', animation:gn3>=10?'goldShine 3s ease-in-out infinite':'none', marginLeft:'2px' }}>{card.condition}</span>
                              })()}"""
assert old_info_line in s, "CIBLE INFO LINE NON TROUVEE"
s = s.replace(old_info_line, new_info_line, 1)
print('  > badge ajoute dans la description')

f.write_text(s, 'utf-8')
print('OK — badge grade dans la description')
