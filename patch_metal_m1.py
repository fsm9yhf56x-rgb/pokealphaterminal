#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. CSS — ajouter metalShift
if '@keyframes metalShift' not in s:
    old_css = "@keyframes masterSweep"
    new_css = "@keyframes metalShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }\n        @keyframes masterSweep"
    assert old_css in s, "CIBLE CSS"
    s = s.replace(old_css, new_css, 1)
    print('  > CSS metalShift')

# 2. SHELF badge — gradient diagonal + metalShift + highlight overlay
old_shelf = "background:gn>=10?'linear-gradient(90deg,#C9A84C,#D4AF37,#E8D48B,#D4AF37,#C9A84C)':bg, color:gn>=10?'#5C4A12':fg, fontSize:'8px', fontWeight:800, padding:'3px 7px', borderRadius:'5px', fontFamily:'var(--font-data)', boxShadow:gn>=10?'0 2px 8px rgba(212,175,55,.3)':sh, letterSpacing:'.03em', overflow:'visible', border:gn>=10?'1px solid rgba(212,175,55,.3)':'none' }}>"
new_shelf = "background:gn>=10?'linear-gradient(145deg,#8B7320,#B8942F,#D4AF37,#F5ECA0,#FFFAD0,#F5ECA0,#D4AF37,#B8942F,#8B7320)':bg, color:gn>=10?'#5C4A12':fg, fontSize:'8px', fontWeight:800, padding:'3px 7px', borderRadius:'5px', fontFamily:'var(--font-data)', boxShadow:gn>=10?'0 1px 3px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,240,.4)':sh, letterSpacing:'.03em', overflow:'visible', border:gn>=10?'1px solid rgba(212,175,55,.4)':'none', backgroundSize:gn>=10?'300% 300%':'auto', animation:gn>=10?'metalShift 8s ease-in-out infinite':'none' }}>"
assert old_shelf in s, "CIBLE SHELF"
s = s.replace(old_shelf, new_shelf, 1)
print('  > shelf metal')

# Ajouter le highlight overlay avant le glitter container (shelf)
old_shelf_glitter = """{gn>=10&&<div className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/>}"""
new_shelf_glitter = """{gn>=10&&<><div style={{ position:'absolute', inset:0, borderRadius:'5px', background:'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/><div className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/></>}"""
assert old_shelf_glitter in s, "CIBLE SHELF GLITTER"
s = s.replace(old_shelf_glitter, new_shelf_glitter, 1)
print('  > shelf highlight')

# 3. GRID badge — meme traitement
old_grid = "background:gn3>=10?'linear-gradient(90deg,#C9A84C,#D4AF37,#E8D48B,#D4AF37,#C9A84C)':bg3, color:gn3>=10?'#5C4A12':fg3, padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-data)', boxShadow:gn3>=10?'0 2px 6px rgba(212,175,55,.25)':sh3, letterSpacing:'.03em', marginLeft:'2px', overflow:'visible', position:'relative', border:gn3>=10?'1px solid rgba(212,175,55,.3)':'none', display:'inline-flex', alignItems:'center' }}>"
new_grid = "background:gn3>=10?'linear-gradient(145deg,#8B7320,#B8942F,#D4AF37,#F5ECA0,#FFFAD0,#F5ECA0,#D4AF37,#B8942F,#8B7320)':bg3, color:gn3>=10?'#5C4A12':fg3, padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-data)', boxShadow:gn3>=10?'0 1px 3px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,240,.4)':sh3, letterSpacing:'.03em', marginLeft:'2px', overflow:'visible', position:'relative', border:gn3>=10?'1px solid rgba(212,175,55,.4)':'none', display:'inline-flex', alignItems:'center', backgroundSize:gn3>=10?'300% 300%':'auto', animation:gn3>=10?'metalShift 8s ease-in-out infinite':'none' }}>"
assert old_grid in s, "CIBLE GRID"
s = s.replace(old_grid, new_grid, 1)
print('  > grid metal')

# Ajouter highlight overlay (grid)
old_grid_glitter = """{gn3>=10&&<span className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/>}"""
new_grid_glitter = """{gn3>=10&&<><span style={{ position:'absolute', inset:0, borderRadius:'4px', background:'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/><span className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/></>}"""
assert old_grid_glitter in s, "CIBLE GRID GLITTER"
s = s.replace(old_grid_glitter, new_grid_glitter, 1)
print('  > grid highlight')

f.write_text(s, 'utf-8')
print('OK')
