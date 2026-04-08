#!/usr/bin/env python3
"""Max FPS: force GPU compositing on all animated elements"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Glitter divs: forcer le GPU via transform3d dans le cssText
# Les gl1-gl4 animations utilisent opacity — c'est bon
# Mais il faut que chaque div soit sur sa propre couche GPU
old_glitter_css = "d.style.cssText = `position:absolute;top:${top}px;left:${left}%;width:${sz}px;height:${sz}px;border-radius:50%;background:#fff;animation:${anims[i%4]} 4s ${delay}s linear infinite`"
new_glitter_css = "d.style.cssText = `position:absolute;top:${top}px;left:${left}%;width:${sz}px;height:${sz}px;border-radius:50%;background:#fff;animation:${anims[i%4]} 4s ${delay}s linear infinite;transform:translateZ(0);backface-visibility:hidden`"
c = s.count(old_glitter_css)
s = s.replace(old_glitter_css, new_glitter_css)
print(f'  > GPU glitter divs x{c}')

# 2. CSS: forcer composite layers sur tout ce qui bouge
old_css = ".master-glitter-container div, .badge-glitter-container div { will-change:opacity; }"
new_css = """.master-glitter-container div, .badge-glitter-container div { will-change:opacity; transform:translateZ(0); backface-visibility:hidden; }
        .shelf-row > div { backface-visibility:hidden; }
        * { -webkit-font-smoothing:antialiased; }"""
assert old_css in s, "CIBLE CSS"
s = s.replace(old_css, new_css, 1)
print('  > GPU layers CSS')

# 3. Scroll: passive listeners pour ne pas bloquer le compositor thread
old_shelf_scroll = """onScroll={e=>{if(!(window as any).__scrollThrottle){(window as any).__scrollThrottle=true;requestAnimationFrame(()=>{handleShelfScroll(setName,e);(window as any).__scrollThrottle=false})}}}"""
if old_shelf_scroll in s:
    # Le onScroll React est deja passif par defaut, mais on garde le throttle
    print('  > scroll already throttled')

f.write_text(s, 'utf-8')
print('OK')
