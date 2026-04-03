#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Cache hit — restaurer bloc, mais si pas de bloc cache, ne pas return (laisser fetch)
old = "        if (cached) { setSetLogos(prev => ({ ...prev, [setName]: cached })); return }"
new = "        if (cached) { setSetLogos(prev => ({ ...prev, [setName]: cached })); const cb=localStorage.getItem('pka_block_'+sid); if(cb){ setSetBlocks(prev=>({...prev,[setName]:cb})); return } }"
assert old in s, "CIBLE CACHE"
s = s.replace(old, new, 1)
print('  > cache hit')

# 2. Sauvegarder le bloc en localStorage
old2 = "          if (data.serie && data.serie.name) setSetBlocks(prev => ({ ...prev, [setName]: data.serie.name }))"
new2 = "          if (data.serie && data.serie.name) { setSetBlocks(prev => ({ ...prev, [setName]: data.serie.name })); localStorage.setItem('pka_block_'+sid, data.serie.name) }"
assert old2 in s, "CIBLE SAVE"
s = s.replace(old2, new2, 1)
print('  > cache save')

f.write_text(s, 'utf-8')
print('OK')
