#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. State
old = "const [setLogos, setSetLogos] = useState<Record<string, string>>({})"
new = """const [setLogos, setSetLogos] = useState<Record<string, string>>({})
  const [setBlocks, setSetBlocks] = useState<Record<string, string>>({})"""
assert old in s, "CIBLE STATE"
s = s.replace(old, new, 1)
print('  > state')

# 2. Fetch bloc dans le logo fetch
old_logo = "setSetLogos(p=>({...p,[setName]:url}))"
new_logo = "setSetLogos(p=>({...p,[setName]:url}))\n                      if(data.serie&&data.serie.name) setSetBlocks(p=>({...p,[setName]:data.serie.name}))"
assert old_logo in s, "CIBLE LOGO"
s = s.replace(old_logo, new_logo, 1)
print('  > fetch bloc')

# 3. Sous-titre
old_sub = """{(()=>{ const sid=setCards.find(c=>c.setId)?.setId||''; const frName=frSetsMap[sid]; const fullName=liveSets.find(ls=>ls.id===sid)?.name; const sub=frName&&frName!==setName?frName:fullName&&fullName!==setName?fullName:null; return sub?<div style={{ fontSize:'10px', color:'#86868B', fontFamily:'var(--font-display)', marginTop:'1px' }}>{sub}</div>:null })()}"""
new_sub = """{setBlocks[setName]?<div style={{ fontSize:'10px', color:'#86868B', fontFamily:'var(--font-display)', marginTop:'1px' }}>{setBlocks[setName]}</div>:null}"""
assert old_sub in s, "CIBLE SUB"
s = s.replace(old_sub, new_sub, 1)
print('  > subtitle')

f.write_text(s, 'utf-8')
print('OK')
