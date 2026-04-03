#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

old = """                        <div className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/>
                        <span style={{ position:'relative', zIndex:1, fontSize:'12px', fontWeight:700, color:'#5C4A12', fontFamily:'var(--font-display)', letterSpacing:'.08em' }}>{String.fromCharCode(9733)} MASTER SET {String.fromCharCode(9733)}</span>"""
new = """                        <span style={{ position:'relative', zIndex:1, fontSize:'12px', fontWeight:700, color:'#5C4A12', fontFamily:'var(--font-display)', letterSpacing:'.08em' }}>{String.fromCharCode(9733)} MASTER SET {String.fromCharCode(9733)}</span>"""
assert old in s, "CIBLE"
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK')
