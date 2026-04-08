#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# 1. Ajouter filRarity aux deps du useMemo filtered
old = "  }, [allCards, filEra, filSet, search, sort])"
new = "  }, [allCards, filEra, filSet, filRarity, search, sort])"
assert old in s, "CIBLE DEPS"
s = s.replace(old, new, 1)
print('  > filRarity in deps')

# 2. Fix clear filters
old_clear = "setFilEra('all');setFilSet('all');setFilRarity('all');setSearch('')"
if old_clear not in s:
    old_clear2 = "setFilEra('all');setFilSet('all');setSearch('')"
    if old_clear2 in s:
        s = s.replace(old_clear2, "setFilEra('all');setFilSet('all');setFilRarity('all');setSearch('')", 1)
        print('  > clear filters fix')

f.write_text(s, 'utf-8')
print('OK')
