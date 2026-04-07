#!/usr/bin/env python3
"""Perf: lazy loading images + content-visibility sur les sets"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. CSS — content-visibility sur les sets pour skip le rendu off-screen
old_pocket = ".pocket-shell { contain:layout style paint; }"
new_pocket = """.pocket-shell { contain:layout style paint; }
        .set-block { content-visibility:auto; contain-intrinsic-size:auto 400px; }
        .shelf-row img, .binder-grid img { content-visibility:auto; }"""
assert old_pocket in s, "CIBLE POCKET"
s = s.replace(old_pocket, new_pocket, 1)
print('  > CSS content-visibility')

# 2. Shelf card images — ajouter loading="lazy"
# Image dans le shelf (carte owned)
old_shelf_img = """<img src={card.image?.replace(/\\/low\\.(webp|jpg|png)$/, '/high.webp')||card.image||''} alt={card.name}
                                  style={{ width:'100%', height:'100%', objectFit:'cover' }}"""
if old_shelf_img in s:
    new_shelf_img = old_shelf_img.replace("<img ", '<img loading="lazy" ')
    s = s.replace(old_shelf_img, new_shelf_img, 1)
    print('  > shelf img lazy')

# 3. Ghost card images — ajouter loading="lazy"  
old_ghost_img = "style={{ width:'100%', height:'100%', objectFit:'cover', filter:'grayscale(1)', opacity:.4 }}"
c = s.count(old_ghost_img)
if c > 0:
    new_ghost_img = old_ghost_img.replace("style={{", 'loading="lazy" style={{')
    # Ne fonctionne pas car loading est avant style, on doit chercher le <img
    # Approche differente: ajouter loading sur les img ghost
    pass

# 4. Grid/binder images — loading lazy
# Chercher les images dans la grille binder
old_binder_img = """objectFit:'cover', borderRadius:'12px'"""
# Trop generique, cherchons plus specifique

# Approche globale: remplacer toutes les <img src= qui n'ont pas loading="lazy"
# dans les zones shelf-row et binder
import re
# Ajouter loading="lazy" a toutes les img qui n'ont pas deja loading
count = 0
def add_lazy(match):
    global count
    full = match.group(0)
    if 'loading=' in full:
        return full
    count += 1
    return full.replace('<img ', '<img loading="lazy" ', 1)

s = re.sub(r'<img\s+src=\{(?:card\.image|gi\.image)', add_lazy, s)
print(f'  > lazy loading on {count} card images')

# 5. Ajouter className="set-block" sur le wrapper de chaque set
old_set_wrap = """                        <div key={setName} style={{ marginBottom:'0' }}>"""
if old_set_wrap in s:
    new_set_wrap = """                        <div key={setName} className="set-block" style={{ marginBottom:'0' }}>"""
    s = s.replace(old_set_wrap, new_set_wrap, 1)
    print('  > set-block class')
else:
    # Chercher le wrapper de set
    idx = s.find("key={setName}")
    if idx > 0:
        line_start = s.rfind('\n', 0, idx) + 1
        line = s[line_start:s.find('\n', idx)]
        if 'set-block' not in line and 'className' not in line:
            new_line = line.replace('style={{', 'className="set-block" style={{', 1)
            s = s[:line_start] + new_line + s[line_start+len(line):]
            print('  > set-block class (alt)')

# 6. Shelf row — ajouter will-change:scroll-position
old_shelf = "cursor:'grab' }}"
if old_shelf in s:
    s = s.replace(old_shelf, "cursor:'grab', willChange:'scroll-position' }}", 1)
    print('  > shelf will-change')

f.write_text(s, 'utf-8')
print('OK')
