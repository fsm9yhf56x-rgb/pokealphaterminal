#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Init depuis localStorage
old = "const [collapsedSets, setCollapsedSets] = useState<Set<string>>(new Set())"
new = """const [collapsedSets, setCollapsedSets] = useState<Set<string>>(()=>{
    try { const r=localStorage.getItem('pka_collapsed'); return r?new Set(JSON.parse(r)):new Set() } catch { return new Set() }
  })"""
assert old in s, "CIBLE INIT"
s = s.replace(old, new, 1)
print('  > init localStorage')

# 2. Sauvegarder a chaque changement — ajouter un useEffect apres les autres persist
old_persist = "useEffect(()=>{ try { localStorage.setItem('pka_showcase', JSON.stringify(showcase)) } catch {} }, [showcase])"
new_persist = """useEffect(()=>{ try { localStorage.setItem('pka_showcase', JSON.stringify(showcase)) } catch {} }, [showcase])
  useEffect(()=>{ try { localStorage.setItem('pka_collapsed', JSON.stringify([...collapsedSets])) } catch {} }, [collapsedSets])"""
assert old_persist in s, "CIBLE PERSIST"
s = s.replace(old_persist, new_persist, 1)
print('  > persist localStorage')

f.write_text(s, 'utf-8')
print('OK')
