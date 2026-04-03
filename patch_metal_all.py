#!/usr/bin/env python3
"""Argent + bronze metallique sur les badges grade"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# ══════ SHELF ══════

# 1. bg definition — metallic pour silver/bronze
old_bg = "const bg=gn>=10?'linear-gradient(90deg,#C9A84C,#FFD700,#FFF1A8,#FFD700,#C9A84C)':gn>=8?'linear-gradient(135deg,#A8A8A8,#D8D8D8,#A8A8A8)':gn>=5?'linear-gradient(135deg,#A0724A,#C4956A,#A0724A)':'#48484A'"
new_bg = "const bg=gn>=10?'linear-gradient(145deg,#8B7320,#B8942F,#D4AF37,#F5ECA0,#FFFAD0,#F5ECA0,#D4AF37,#B8942F,#8B7320)':gn>=8?'linear-gradient(145deg,#707070,#A8A8A8,#D8D8D8,#F0F0F0,#D8D8D8,#A8A8A8,#707070)':gn>=5?'linear-gradient(145deg,#6B4226,#A0724A,#C4956A,#E0BFA0,#C4956A,#A0724A,#6B4226)':'#48484A'"
assert old_bg in s, "CIBLE BG"
s = s.replace(old_bg, new_bg, 1)

# 2. sh definition — inset highlight pour tous
old_sh = "const sh=gn>=10?'0 2px 8px rgba(201,168,76,.4)':gn>=8?'0 2px 6px rgba(0,0,0,.1)':gn>=5?'0 2px 6px rgba(160,114,74,.2)':'0 1px 4px rgba(0,0,0,.15)'"
new_sh = "const sh=gn>=10?'0 1px 3px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,240,.4)':gn>=8?'0 1px 3px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.4)':gn>=5?'0 1px 3px rgba(0,0,0,.12),inset 0 1px 0 rgba(224,191,160,.3)':'0 1px 4px rgba(0,0,0,.15)'"
assert old_sh in s, "CIBLE SH"
s = s.replace(old_sh, new_sh, 1)

# 3. Style — appliquer metalShift + backgroundSize + border pour tous >=5
old_style = "background:gn>=10?'linear-gradient(145deg,#8B7320,#B8942F,#D4AF37,#F5ECA0,#FFFAD0,#F5ECA0,#D4AF37,#B8942F,#8B7320)':bg, color:gn>=10?'#5C4A12':fg, fontSize:'8px', fontWeight:800, padding:'3px 7px', borderRadius:'5px', fontFamily:'var(--font-data)', boxShadow:gn>=10?'0 1px 3px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,240,.4)':sh, letterSpacing:'.03em', overflow:'visible', border:gn>=10?'1px solid rgba(212,175,55,.4)':'none', backgroundSize:gn>=10?'300% 300%':'auto', animation:gn>=10?'metalShift 8s ease-in-out infinite':'none'"
new_style = "background:bg, color:fg, fontSize:'8px', fontWeight:800, padding:'3px 7px', borderRadius:'5px', fontFamily:'var(--font-data)', boxShadow:sh, letterSpacing:'.03em', overflow:'visible', border:gn>=10?'1px solid rgba(212,175,55,.4)':gn>=8?'1px solid rgba(168,168,168,.4)':gn>=5?'1px solid rgba(160,114,74,.3)':'none', backgroundSize:gn>=5?'300% 300%':'auto', animation:gn>=5?'metalShift 8s ease-in-out infinite':'none'"
assert old_style in s, "CIBLE STYLE"
s = s.replace(old_style, new_style, 1)

# 4. Overlay + glitter — etendre a tous >=5
old_overlay = """{gn>=10&&<><div style={{ position:'absolute', inset:0, borderRadius:'5px', background:'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/><div className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/></>}"""
new_overlay = """{gn>=5&&<><div style={{ position:'absolute', inset:0, borderRadius:'5px', background:gn>=10?'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)':gn>=8?'linear-gradient(145deg,transparent 30%,rgba(255,255,255,.3) 45%,transparent 60%)':'linear-gradient(145deg,transparent 30%,rgba(224,191,160,.25) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/><div className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/></>}"""
assert old_overlay in s, "CIBLE OVERLAY"
s = s.replace(old_overlay, new_overlay, 1)
print('  > shelf done')

# ══════ GRID ══════

# 5. bg3 definition
old_bg3 = "const bg3=gn3>=10?'linear-gradient(90deg,#C9A84C,#FFD700,#FFF1A8,#FFD700,#C9A84C)':gn3>=9?'linear-gradient(135deg,#A8A8A8,#E8E8E8,#A8A8A8)':gn3>=5?'linear-gradient(135deg,#A0724A,#C4956A,#A0724A)':'#6E6E73'"
new_bg3 = "const bg3=gn3>=10?'linear-gradient(145deg,#8B7320,#B8942F,#D4AF37,#F5ECA0,#FFFAD0,#F5ECA0,#D4AF37,#B8942F,#8B7320)':gn3>=9?'linear-gradient(145deg,#707070,#A8A8A8,#D8D8D8,#F0F0F0,#D8D8D8,#A8A8A8,#707070)':gn3>=5?'linear-gradient(145deg,#6B4226,#A0724A,#C4956A,#E0BFA0,#C4956A,#A0724A,#6B4226)':'#6E6E73'"
assert old_bg3 in s, "CIBLE BG3"
s = s.replace(old_bg3, new_bg3, 1)

# 6. Grid style
old_grid_style = "background:gn3>=10?'linear-gradient(145deg,#8B7320,#B8942F,#D4AF37,#F5ECA0,#FFFAD0,#F5ECA0,#D4AF37,#B8942F,#8B7320)':bg3, color:gn3>=10?'#5C4A12':fg3, padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-data)', boxShadow:gn3>=10?'0 1px 3px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,240,.4)':sh3, letterSpacing:'.03em', marginLeft:'2px', overflow:'visible', position:'relative', border:gn3>=10?'1px solid rgba(212,175,55,.4)':'none', display:'inline-flex', alignItems:'center', backgroundSize:gn3>=10?'300% 300%':'auto', animation:gn3>=10?'metalShift 8s ease-in-out infinite':'none'"
new_grid_style = "background:bg3, color:fg3, padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-data)', boxShadow:sh3, letterSpacing:'.03em', marginLeft:'2px', overflow:'visible', position:'relative', border:gn3>=10?'1px solid rgba(212,175,55,.4)':gn3>=9?'1px solid rgba(168,168,168,.4)':gn3>=5?'1px solid rgba(160,114,74,.3)':'none', display:'inline-flex', alignItems:'center', backgroundSize:gn3>=5?'300% 300%':'auto', animation:gn3>=5?'metalShift 8s ease-in-out infinite':'none'"
assert old_grid_style in s, "CIBLE GRID STYLE"
s = s.replace(old_grid_style, new_grid_style, 1)

# 7. Grid overlay + glitter
old_grid_overlay = """{gn3>=10&&<><span style={{ position:'absolute', inset:0, borderRadius:'4px', background:'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/><span className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/></>}"""
new_grid_overlay = """{gn3>=5&&<><span style={{ position:'absolute', inset:0, borderRadius:'4px', background:gn3>=10?'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)':gn3>=9?'linear-gradient(145deg,transparent 30%,rgba(255,255,255,.3) 45%,transparent 60%)':'linear-gradient(145deg,transparent 30%,rgba(224,191,160,.25) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/><span className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/></>}"""
assert old_grid_overlay in s, "CIBLE GRID OVERLAY"
s = s.replace(old_grid_overlay, new_grid_overlay, 1)
print('  > grid done')

# 8. sh3 — update aussi
old_sh3 = "const sh3=gn3>=10?'0 2px 6px rgba(212,175,55,.25)':sh3"
# sh3 n'est peut-etre pas defini de la meme maniere, cherchons
idx_sh3 = s.find("const sh3=")
if idx_sh3 > 0:
    end_sh3 = s.find("\n", idx_sh3)
    old_sh3_line = s[idx_sh3:end_sh3]
    new_sh3_line = "const sh3=gn3>=10?'0 1px 3px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,240,.4)':gn3>=9?'0 1px 3px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.4)':gn3>=5?'0 1px 3px rgba(0,0,0,.12),inset 0 1px 0 rgba(224,191,160,.3)':'0 1px 4px rgba(0,0,0,.15)'"
    s = s[:idx_sh3] + new_sh3_line + s[end_sh3:]
    print('  > sh3 updated')

f.write_text(s, 'utf-8')
print('OK')
