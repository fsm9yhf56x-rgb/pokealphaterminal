#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. State already added by blocks2, skip if present
if 'setBlocks' not in s:
    old = "const [setLogos, setSetLogos] = useState<Record<string, string>>({})"
    s = s.replace(old, old + "\n  const [setBlocks, setSetBlocks] = useState<Record<string, string>>({})", 1)
    print('  > state')

# 2. Fetch bloc — exact match from line 301
old = "          setSetLogos(prev => ({ ...prev, [setName]: logoWithExt }))\n        }"
new = "          setSetLogos(prev => ({ ...prev, [setName]: logoWithExt }))\n          if (data.serie && data.serie.name) setSetBlocks(prev => ({ ...prev, [setName]: data.serie.name }))\n        }"
assert old in s, "CIBLE LOGO"
s = s.replace(old, new, 1)
print('  > fetch bloc')

# 3. Sous-titre
old_sub = """{(()=>{ const sid=setCards.find(c=>c.setId)?.setId||''; const frName=frSetsMap[sid]; const fullName=liveSets.find(ls=>ls.id===sid)?.name; const sub=frName&&frName!==setName?frName:fullName&&fullName!==setName?fullName:null; return sub?<div style={{ fontSize:'10px', color:'#86868B', fontFamily:'var(--font-display)', marginTop:'1px' }}>{sub}</div>:null })()}"""
new_sub = """{setBlocks[setName]?<div style={{ fontSize:'10px', color:'#86868B', fontFamily:'var(--font-display)', marginTop:'1px' }}>{setBlocks[setName]}</div>:null}"""
assert old_sub in s, "CIBLE SUB"
s = s.replace(old_sub, new_sub, 1)
print('  > subtitle')

f.write_text(s, 'utf-8')
print('OK')
