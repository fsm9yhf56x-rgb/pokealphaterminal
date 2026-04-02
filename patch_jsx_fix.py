#!/usr/bin/env python3
"""Fix JSX — wrapper fragment autour search + filtres"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Wraper les deux divs dans un fragment <>
old = """{true&&(
                      <div style={{ position:'relative', marginBottom:'18px' }}>"""
new = """{true&&(<>
                      <div style={{ position:'relative', marginBottom:'18px' }}>"""
assert old in s, "CIBLE OPEN"
s = s.replace(old, new, 1)

# Fermer le fragment avant le )}
old_close = """                      </div>
                    )}"""
# Trouver la bonne occurrence — celle après les filtres
# Le bloc se termine après les boutons de tri
idx = s.find("{([{k:'number' as const")
assert idx > 0, "CIBLE FILTERS"
close_idx = s.find("                    )}", idx)
assert close_idx > 0, "CIBLE CLOSE"
# Vérifier que c'est le bon
chunk = s[close_idx-60:close_idx+20]
s = s[:close_idx] + "                    </>)}" + s[close_idx+len("                    )}"):]
print('  > fragment <> wrapper')

f.write_text(s, 'utf-8')
print('OK — JSX fix')
