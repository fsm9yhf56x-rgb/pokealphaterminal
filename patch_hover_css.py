#!/usr/bin/env python3
"""Nettoie le CSS hover — supprime scale img, tilt, effets gem"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Supprimer le scale image au hover
s = s.replace(
    ".pocket-shell:hover img { transform:scale(1.06) !important; }",
    ""
)
print('  > scale img supprime')

# 2. Supprimer le holo hover
s = s.replace(
    ".pocket-shell:hover .holo { opacity:.35 !important; }",
    ""
)
print('  > holo hover supprime')

# 3. Supprimer le card-plastic hover
s = s.replace(
    ".pocket-shell:hover .card-plastic { opacity:.12 !important; }",
    ""
)
print('  > card-plastic hover supprime')

# 4. Simplifier le active state
s = s.replace(
    ".pocket-shell:active { transform:translateY(-2px) scale(1.01) !important;transition-duration:.1s !important; }",
    ".pocket-shell:active { transform:translateY(-4px) !important;transition-duration:.08s !important; }"
)
print('  > active simplifie')

# 5. Supprimer les gem hover effects
s = s.replace(
    ".gem:hover .holo { opacity:.28; }",
    ""
)
print('  > gem holo supprime')

# 6. Simplifier le cardReveal animation — fade in simple
s = s.replace(
    "@keyframes cardReveal { 0%{opacity:0;transform:translateY(20px) scale(.94) rotateX(8deg)} 50%{opacity:1;transform:translateY(-4px) scale(1.01) rotateX(-1deg)} 100%{opacity:1;transform:translateY(0) scale(1) rotateX(0deg)} }",
    "@keyframes cardReveal { 0%{opacity:0;transform:translateY(12px)} 100%{opacity:1;transform:translateY(0)} }"
)
print('  > cardReveal simplifie')

# 7. Supprimer le card-plastic transition
s = s.replace(
    ".pocket-shell .card-plastic { transition:opacity .35s cubic-bezier(.25,.46,.45,.94); }",
    ""
)
print('  > card-plastic transition supprime')

# 8. Nettoyer le pocket-shell base — box-shadow plus subtil
s = s.replace(
    ".pocket-shell { position:relative;border-radius:12px;overflow:hidden;cursor:pointer;transition:transform .35s cubic-bezier(.22,.68,0,1.4),box-shadow .4s cubic-bezier(.25,.46,.45,.94);background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.06),0 2px 8px rgba(0,0,0,.03); }",
    ".pocket-shell { position:relative;border-radius:12px;overflow:hidden;cursor:pointer;transition:transform .3s cubic-bezier(.22,.68,0,1.1),box-shadow .35s ease;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.04),0 1px 4px rgba(0,0,0,.02); }"
)
print('  > pocket-shell base nettoye')

f.write_text(s, 'utf-8')
print('OK — CSS hover nettoye')
