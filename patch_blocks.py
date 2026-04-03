#!/usr/bin/env python3
"""Afficher le nom du bloc sous le nom de la serie"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. State pour les noms de blocs
old_state = "const [setLogos,    setSetLogos]    = useState<Record<string,string>>({})"
new_state = """const [setLogos,    setSetLogos]    = useState<Record<string,string>>({})
  const [setBlocks,   setSetBlocks]   = useState<Record<string,string>>({})"""
assert old_state in s, "CIBLE STATE"
s = s.replace(old_state, new_state, 1)
print('  > state')

# 2. Dans le fetch logo, extraire aussi le bloc
# Trouver le code qui fetch les logos et ajouter l'extraction du bloc
old_logo_set = "setSetLogos(p=>({...p,[setName]:url}))"
new_logo_set = """setSetLogos(p=>({...p,[setName]:url}))
                      if(data.serie&&data.serie.name) setSetBlocks(p=>({...p,[setName]:data.serie.name}))"""
assert old_logo_set in s, "CIBLE LOGO SET"
s = s.replace(old_logo_set, new_logo_set, 1)
print('  > fetch bloc')

# 3. Remplacer le sous-titre dans le shelf header
old_sub = """{(()=>{ const sid=setCards.find(c=>c.setId)?.setId||''; const frName=frSetsMap[sid]; const fullName=liveSets.find(ls=>ls.id===sid)?.name; const sub=frName&&frName!==setName?frName:fullName&&fullName!==setName?fullName:null; return sub?<div style={{ fontSize:'10px', color:'#86868B', fontFamily:'var(--font-display)', marginTop:'1px' }}>{sub}</div>:null })()}"""
new_sub = """{setBlocks[setName]?<div style={{ fontSize:'10px', color:'#86868B', fontFamily:'var(--font-display)', marginTop:'1px' }}>{setBlocks[setName]}</div>:null}"""
assert old_sub in s, "CIBLE SUB"
s = s.replace(old_sub, new_sub, 1)
print('  > subtitle bloc')

f.write_text(s, 'utf-8')
print('OK')
