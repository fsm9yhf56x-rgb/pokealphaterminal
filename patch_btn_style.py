#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

old = """style={{ padding:'7px 16px', borderRadius:'10px', background:'#FFF1EE', border:'1px solid rgba(224,48,32,.15)', color:'#E03020', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const, display:'flex', alignItems:'center', gap:'6px', transition:'all .15s' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#FFE4DE';e.currentTarget.style.borderColor='rgba(224,48,32,.3)'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#FFF1EE';e.currentTarget.style.borderColor='rgba(224,48,32,.15)'}}>"""

new = """style={{ padding:'7px 16px', borderRadius:'10px', background:'#1D1D1F', border:'none', color:'#fff', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const, display:'flex', alignItems:'center', gap:'6px', transition:'all .15s' }}
                      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.12)'}}
                      onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}>"""

assert old in s, "CIBLE"
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK')
