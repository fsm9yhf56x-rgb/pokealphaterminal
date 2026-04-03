#!/usr/bin/env python3
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. States
if 'addSetOpen' not in s.split('useState')[0] + s.split('useState')[1]:
    old = "const [importOpen,   setImportOpen]   = useState(false)"
    new = old + "\n  const [addSetOpen,   setAddSetOpen]   = useState(false)\n  const [addSetLang,   setAddSetLang]   = useState<'FR'|'EN'|'JP'>('FR')\n  const [addSetId,     setAddSetId]     = useState('')\n  const [addSetName,   setAddSetName]   = useState('')\n  const [addSetCards,  setAddSetCards]  = useState<TCGCard[]>([])\n  const [addSetLoading,setAddSetLoading]= useState(false)\n  const [addSetSets,   setAddSetSets]   = useState<TCGSet[]>([])"
    assert old in s
    s = s.replace(old, new, 1)
    print('  > states')

# 2. Button click
old_click = "showToast('Bient\u00f4t disponible')"
if old_click in s:
    s = s.replace(old_click, "setAddSetOpen(true);setAddSetCards([]);setAddSetId('');setAddSetName('')", 1)
    print('  > click')

# 3. Fetch effect
if "Fetch sets pour modal" not in s:
    old_mm = "  const mmDrag = useRef"
    new_mm = "  // -- Fetch sets pour modal ajouter serie --\n  useEffect(() => {\n    if (!addSetOpen) return\n    fetchSets(addSetLang).then(sets => setAddSetSets(sets)).catch(() => {})\n  }, [addSetOpen, addSetLang])\n\n  const mmDrag = useRef"
    assert old_mm in s
    s = s.replace(old_mm, new_mm, 1)
    print('  > fetch effect')

f.write_text(s, 'utf-8')
print('OK')
