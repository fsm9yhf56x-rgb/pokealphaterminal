#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# 1. Detail panel sticky
old_detail = "position:'fixed', top:0, right:0"
if old_detail in s:
    s = s.replace(old_detail, "position:'fixed', top:'64px', right:0", 1)
    print('  > detail sticky (fixed)')
else:
    # Chercher le style du panel detail
    import re
    # Le panel est probablement position absolute ou relative
    idx = s.find("Ajouter au portfolio")
    if idx > 0:
        # Remonter pour trouver le container
        chunk = s[max(0,idx-2000):idx]
        # Chercher le style du container parent
        pos = chunk.rfind("position:'absolute'")
        if pos > 0:
            real_pos = max(0,idx-2000) + pos
            s = s[:real_pos] + "position:'sticky', top:'80px'" + s[real_pos+len("position:'absolute'"):]
            print('  > detail sticky (was absolute)')

# Approche directe: chercher le wrapper du detail panel
idx2 = s.find("+ Ajouter au portfolio")
if idx2 < 0:
    idx2 = s.find("Ajouter au portfolio")

# Chercher le panel
for pattern in ["style={{ width:'320px'", "style={{ width:'340px'", "style={{ width:'360px'", "style={{ width:'300px'"]:
    if pattern in s:
        # Verifier si c'est le bon (detail panel)
        pidx = s.find(pattern)
        if pidx > 0 and pidx < idx2:
            line_start = s.rfind('\n', 0, pidx)
            line_end = s.find('\n', pidx)
            line = s[line_start:line_end]
            if 'position' not in line:
                s = s[:pidx] + pattern.replace("style={{", "style={{ position:'sticky' as any, top:'80px', alignSelf:'flex-start',") + s[pidx+len(pattern):]
                print(f'  > detail sticky via {pattern}')
            break

# 2. Plus de lignes: PER_PAGE 60 -> 120
old_per = "const PER_PAGE = 60"
new_per = "const PER_PAGE = 120"
assert old_per in s, "CIBLE PER_PAGE"
s = s.replace(old_per, new_per, 1)
print('  > 60 -> 120 cards per page')

f.write_text(s, 'utf-8')
print('OK')
