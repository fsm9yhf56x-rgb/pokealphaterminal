#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# 1. Parent flex: ajouter alignItems flex-start
old = "style={{ animation:'fadeIn .25s ease-out', width:'100%', display:'flex', gap:'20px' }}"
new = "style={{ animation:'fadeIn .25s ease-out', width:'100%', display:'flex', gap:'20px', alignItems:'flex-start' }}"
assert old in s, "CIBLE PARENT"
s = s.replace(old, new, 1)
print('  > parent alignItems')

# 2. Le detail panel: s'assurer qu'il est bien sticky
old2 = "width:'285px', flexShrink:0, position:'sticky' as any, top:'80px', alignSelf:'flex-start', maxHeight:'calc(100vh - 100px)', overflowY:'auto' as any"
if old2 not in s:
    old2b = "width:'285px', flexShrink:0"
    s = s.replace(old2b, "width:'285px', flexShrink:0, position:'sticky' as any, top:'80px', maxHeight:'calc(100vh - 100px)', overflowY:'auto' as any", 1)
    print('  > detail sticky added')
else:
    # Simplifier - retirer alignSelf redondant
    s = s.replace(old2, "width:'285px', flexShrink:0, position:'sticky' as any, top:'80px', maxHeight:'calc(100vh - 100px)', overflowY:'auto' as any")
    print('  > detail sticky cleaned')

# 3. Verifier que le div gauche (contenu) n'a pas overflow:hidden
# Le div gauche est flex:1 minWidth:0 — il ne doit PAS avoir overflow:hidden
old3 = "flex:1, minWidth:0, overflow:'hidden'"
if old3 in s:
    s = s.replace(old3, "flex:1, minWidth:0", 1)
    print('  > removed left overflow hidden')

f.write_text(s, 'utf-8')
print('OK')
