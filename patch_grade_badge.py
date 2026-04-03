#!/usr/bin/env python3
"""Grade badges: gold shimmer + sweep pour les 10, harmonise avec master set"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. SHELF badge (line ~1675) — gold shimmer + sweep pour grade 10
old_shelf = "return <div style={{ position:'absolute', bottom:'28px', right:'4px', zIndex:3, background:bg, color:fg, fontSize:'8px', fontWeight:800, padding:'3px 7px', borderRadius:'5px', fontFamily:'var(--font-data)', boxShadow:sh, letterSpacing:'.03em', backgroundSize:gn>=10?'300% 100%':'auto', animation:gn>=10?'goldShine 3s ease-in-out infinite':'none' }}>{card.condition}</div>"

new_shelf = """return <div style={{ position:'absolute', bottom:'28px', right:'4px', zIndex:3, background:gn>=10?'linear-gradient(90deg,#D4AF37,#F0E080,#D4AF37)':bg, color:gn>=10?'#5C4A12':fg, fontSize:'8px', fontWeight:800, padding:'3px 7px', borderRadius:'5px', fontFamily:'var(--font-data)', boxShadow:gn>=10?'0 2px 8px rgba(212,175,55,.3)':sh, letterSpacing:'.03em', backgroundSize:gn>=10?'200% 100%':'auto', animation:gn>=10?'goldSlow 6s linear infinite':'none', overflow:'hidden', border:gn>=10?'1px solid rgba(212,175,55,.3)':'none' }}>
                                    {gn>=10&&<div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,250,.6),transparent)', animation:'masterSweep 6s ease-in-out infinite' }}/>}
                                    <span style={{ position:'relative', zIndex:1 }}>{card.condition}</span>
                                  </div>"""
assert old_shelf in s, "CIBLE SHELF BADGE"
s = s.replace(old_shelf, new_shelf, 1)
print('  > shelf badge')

# 2. GRID badge (line ~1866)
old_grid = "return <span style={{ fontSize:binderCols>=7?'7px':'8px', fontWeight:800, background:bg3, color:fg3, padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-data)', boxShadow:sh3, letterSpacing:'.03em', backgroundSize:gn3>=10?'300% 100%':'auto', animation:gn3>=10?'goldShine 3s ease-in-out infinite':'none', marginLeft:'2px' }}>{card.condition}</span>"

new_grid = """return <span style={{ fontSize:binderCols>=7?'7px':'8px', fontWeight:800, background:gn3>=10?'linear-gradient(90deg,#D4AF37,#F0E080,#D4AF37)':bg3, color:gn3>=10?'#5C4A12':fg3, padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-data)', boxShadow:gn3>=10?'0 2px 6px rgba(212,175,55,.25)':sh3, letterSpacing:'.03em', backgroundSize:gn3>=10?'200% 100%':'auto', animation:gn3>=10?'goldSlow 6s linear infinite':'none', marginLeft:'2px', overflow:'hidden', position:'relative', border:gn3>=10?'1px solid rgba(212,175,55,.3)':'none', display:'inline-flex', alignItems:'center' }}>
                                {gn3>=10&&<span style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,250,.6),transparent)', animation:'masterSweep 6s ease-in-out infinite' }}/>}
                                <span style={{ position:'relative', zIndex:1 }}>{card.condition}</span>
                              </span>"""
assert old_grid in s, "CIBLE GRID BADGE"
s = s.replace(old_grid, new_grid, 1)
print('  > grid badge')

f.write_text(s, 'utf-8')
print('OK')
