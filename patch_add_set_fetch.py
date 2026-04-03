#!/usr/bin/env python3
"""Fix: le modal doit fetch ses propres sets selon addSetLang"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Ajouter state pour les sets du modal
old_addset = "const [addSetLoading,setAddSetLoading]= useState(false)"
new_addset = """const [addSetLoading,setAddSetLoading]= useState(false)
  const [addSetSets,   setAddSetSets]   = useState<TCGSet[]>([])"""
assert old_addset in s, "CIBLE ADDSET STATE"
s = s.replace(old_addset, new_addset, 1)
print('  > addSetSets state')

# Effect pour fetch les sets quand le modal s'ouvre ou la langue change
old_mmdrag = "  // -- Fetch sets pour modal ajouter serie --"
if old_mmdrag in s:
    print('  > effect deja present, skip')
else:
    old_mmdrag = "  const mmDrag = useRef"
    new_mmdrag = """  // -- Fetch sets pour modal ajouter serie --
  useEffect(() => {
    if (!addSetOpen) return
    fetchSets(addSetLang).then(sets => setAddSetSets(sets)).catch(() => {})
  }, [addSetOpen, addSetLang])

  const mmDrag = useRef"""
    assert old_mmdrag in s, "CIBLE MMDRAG"
    s = s.replace(old_mmdrag, new_mmdrag, 1)
    print('  > fetch effect')

# Remplacer liveSets.map par addSetSets.map dans le select du modal
# Le modal select est le deuxieme <select> apres "S\u00e9lectionner une s\u00e9rie"
# On cherche specifiquement dans le modal context
old_select = """liveSets.find(x=>x.id===e.target.value)
                if(!found) return
                setAddSetId(found.id)
                setAddSetName(found.name)"""
new_select = """addSetSets.find(x=>x.id===e.target.value)
                if(!found) return
                setAddSetId(found.id)
                setAddSetName(found.name)"""
if old_select in s:
    s = s.replace(old_select, new_select, 1)
    print('  > select find fix')

old_map = """                {liveSets.map(ls=>(
                  <option key={ls.id} value={ls.id} style={{background:'#fff',color:'#1D1D1F'}}>{ls.name}{ls.total?' ('+ls.total+')':''}</option>
                ))}
              </select>
            </div>
            {addSetLoading"""
new_map = """                {addSetSets.map(ls=>(
                  <option key={ls.id} value={ls.id} style={{background:'#fff',color:'#1D1D1F'}}>{ls.name}{ls.total?' ('+ls.total+')':''}</option>
                ))}
              </select>
            </div>
            {addSetLoading"""
if old_map in s:
    s = s.replace(old_map, new_map, 1)
    print('  > select map fix')

f.write_text(s, 'utf-8')
print('OK')
