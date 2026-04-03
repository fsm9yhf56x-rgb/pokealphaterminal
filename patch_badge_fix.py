#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

old = "fontSize:'8px', fontWeight:800, background:'linear-gradient(90deg,#C9A84C,#FFD700,#FFF1A8,#FFD700,#C9A84C)', backgroundSize:'300% 100%', animation:'masterShine 3s ease-in-out infinite', color:'#1a1200', padding:'3px 10px', borderRadius:'4px', letterSpacing:'.08em', boxShadow:'0 2px 8px rgba(255,215,0,.3)', display:'inline-flex', alignItems:'center', gap:'4px'"
new = "fontSize:'7px', fontWeight:700, background:'linear-gradient(90deg,#D4AF37,#F0E080,#D4AF37)', backgroundSize:'200% 100%', animation:'goldSlow 6s linear infinite', color:'#5C4A12', padding:'2px 8px', borderRadius:'3px', letterSpacing:'.12em', border:'1px solid rgba(212,175,55,.3)', display:'inline-flex', alignItems:'center', gap:'4px'"
assert old in s, "CIBLE"
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK')
