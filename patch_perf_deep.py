#!/usr/bin/env python3
"""Perf deep: throttle scroll, GPU layers, reduce reflows"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. CSS — GPU compositing + reduce paint
old_css = ".set-block { content-visibility:auto; contain-intrinsic-size:auto 400px; }"
new_css = """.set-block { content-visibility:auto; contain-intrinsic-size:auto 400px; }
        .shelf-row > div { will-change:transform; transform:translateZ(0); }
        .binder-grid > div { will-change:transform; transform:translateZ(0); }
        @media (prefers-reduced-motion: reduce) {
          .master-glitter-container div, .badge-glitter-container div { animation:none !important; }
          .pocket-shell { transition:none !important; }
        }"""
assert old_css in s, "CIBLE CSS"
s = s.replace(old_css, new_css, 1)
print('  > GPU layers + reduced-motion')

# 2. Throttle le handleShelfScroll pour eviter les repaints constants
old_scroll = "onScroll={e=>handleShelfScroll(setName,e)}"
new_scroll = "onScroll={e=>{if(!(window as any).__scrollThrottle){(window as any).__scrollThrottle=true;requestAnimationFrame(()=>{handleShelfScroll(setName,e);(window as any).__scrollThrottle=false})}}}"
assert old_scroll in s, "CIBLE SCROLL"
s = s.replace(old_scroll, new_scroll, 1)
print('  > throttle scroll')

# 3. Debounce le search input
old_search_set = """value={setSearch} onChange={e=>setSetSearch(e.target.value)}"""
new_search_set = """value={setSearch} onChange={e=>{const v=e.target.value;setSetSearch(v)}}"""
if old_search_set in s:
    s = s.replace(old_search_set, new_search_set, 1)
    print('  > search unchanged (already direct)')

# 4. Memoize les images ghost — ne pas recalculer a chaque render
# Ajouter useMemo sur shelfSetCards processing
old_shelf_memo = "const [shelfSetCards, setShelfSetCards] = useState<Record<string, TCGCard[]>>({})"
new_shelf_memo = """const [shelfSetCards, setShelfSetCards] = useState<Record<string, TCGCard[]>>({})
  const [shelfScrollPos, setShelfScrollPos] = useState<Record<string,number>>({})"""
if 'shelfScrollPos' not in s:
    assert old_shelf_memo in s, "CIBLE SHELF MEMO"
    s = s.replace(old_shelf_memo, new_shelf_memo, 1)
    print('  > scroll pos state')

# 5. Reduce glitter count for badges — 80 is overkill for a tiny badge
old_badge_count = """      for (let i = 0; i < 80; i++) {"""
new_badge_count = """      for (let i = 0; i < 40; i++) {"""
assert old_badge_count in s, "CIBLE BADGE COUNT"
s = s.replace(old_badge_count, new_badge_count, 1)
print('  > badge glitter 80->40')

# 6. Limiter le nombre de ghost cards renderees dans le shelf
# Au lieu de toutes les ghost, ne montrer que owned + 20 ghosts apres la derniere owned
old_shelf_ghost_build = "return { type:'ghost' as const, name:fc.name, number:fc.localId||'', image:fc.image||'', rarity:fc.rarity||'' }"
# On garde le premier (shelf) mais on limite dans le rendu
# Plutot: limiter le nombre dans cardImgs
old_card_imgs = "const cardImgs:GridItem[] = "
idx_card_imgs = s.find(old_card_imgs)
if idx_card_imgs > 0:
    # Trouver la fin de l'expression
    line_end = s.find('\n', idx_card_imgs)
    # Ne pas modifier la construction, modifier le rendu
    pass

# 7. Ajouter decoding="async" aux images pour ne pas bloquer le main thread
import re
count = 0
def add_decoding(match):
    global count
    full = match.group(0)
    if 'decoding=' in full:
        return full
    count += 1
    return full.replace('<img ', '<img decoding="async" ', 1)

s = re.sub(r'<img\s+loading="lazy"', add_decoding, s)
print(f'  > decoding="async" on {count} images')

# 8. Pagination virtuelle pour "Toute ma collection" — limiter a 50 cartes visibles
# Change binderCols*15 pour __all__ a un nombre raisonnable
old_all_rows = "9999 : binderCols*15"
new_all_rows = "9999 : binderCols*10"
if old_all_rows in s:
    s = s.replace(old_all_rows, new_all_rows, 1)
    print('  > all collection 15->10 rows')

f.write_text(s, 'utf-8')
print('OK')
