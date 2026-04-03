#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. CSS — desactiver le drag natif sur les images dans le shelf
old_css = ".shelf-row { scrollbar-width:none; -ms-overflow-style:none; overflow-x:scroll !important; }"
new_css = ".shelf-row { scrollbar-width:none; -ms-overflow-style:none; overflow-x:scroll !important; }\n        .shelf-row img { -webkit-user-drag:none; user-drag:none; pointer-events:none; }\n        .shelf-row * { -webkit-user-select:none; user-select:none; }"
assert old_css in s, "CIBLE CSS"
s = s.replace(old_css, new_css, 1)
print('  > CSS no-drag')

# 2. preventDefault sur mousedown pour bloquer le drag natif
old_mousedown = "onMouseDown={onShelfMouseDown} style={{ display:'flex', gap:'8px', overflowX:'auto' as const, padding:'8px 0 8px', WebkitOverflowScrolling:'touch' as any, cursor:'grab' }}"
new_mousedown = "onMouseDown={e=>{e.preventDefault();onShelfMouseDown(e)}} style={{ display:'flex', gap:'8px', overflowX:'auto' as const, padding:'8px 0 8px', WebkitOverflowScrolling:'touch' as any, cursor:'grab' }}"
assert old_mousedown in s, "CIBLE MOUSEDOWN"
s = s.replace(old_mousedown, new_mousedown, 1)
print('  > preventDefault')

f.write_text(s, 'utf-8')
print('OK')
