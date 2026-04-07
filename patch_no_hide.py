#!/usr/bin/env python3
"""Remplacer display:none par un placeholder camera"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Remplacer tous les t.style.display='none' par un placeholder
s = s.replace(
    "else t.style.display='none'",
    "else { t.style.opacity='0'; t.style.height='100%'; const p=t.parentElement; if(p&&!p.querySelector('.no-img-ph')){const d=document.createElement('div');d.className='no-img-ph';d.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;cursor:pointer';d.innerHTML='<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#AEAEB2\" stroke-width=\"1.5\" stroke-linecap=\"round\"><path d=\"M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/></svg><span style=\"font-size:8px;color:#AEAEB2\">Ajouter</span>';p.appendChild(d)} }"
)

print('OK')
f.write_text(s, 'utf-8')
