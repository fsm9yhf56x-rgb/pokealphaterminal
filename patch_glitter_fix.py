#!/usr/bin/env python3
"""Fix: glitter se genere via className au lieu de ref unique"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Remplacer le useEffect ref par un qui cible la classe
old_effect = """  // -- Master set glitter generator --
  useEffect(() => {
    const el = masterGlitterRef.current
    if (!el) return
    el.innerHTML = ''
    const anims = ['gl1','gl2','gl3','gl4']
    for (let i = 0; i < 2000; i++) {
      const d = document.createElement('div')
      const sz = Math.random() > .6 ? 2 : 1
      const top = (-2 + Math.random() * 12).toFixed(0)
      const left = (Math.random() * 99).toFixed(1)
      const delay = (Math.random() * 4).toFixed(2)
      d.style.cssText = `position:absolute;top:${top}px;left:${left}%;width:${sz}px;height:${sz}px;border-radius:50%;background:#fff;animation:${anims[i%4]} 4s ${delay}s linear infinite`
      el.appendChild(d)
    }
  }, [])"""

new_effect = """  // -- Master set glitter generator --
  useEffect(() => {
    const els = document.querySelectorAll('.master-glitter-container')
    els.forEach(el => {
      if (el.childNodes.length > 0) return
      const anims = ['gl1','gl2','gl3','gl4']
      for (let i = 0; i < 2000; i++) {
        const d = document.createElement('div')
        const sz = Math.random() > .6 ? 2 : 1
        const top = (-2 + Math.random() * 12).toFixed(0)
        const left = (Math.random() * 99).toFixed(1)
        const delay = (Math.random() * 4).toFixed(2)
        d.style.cssText = `position:absolute;top:${top}px;left:${left}%;width:${sz}px;height:${sz}px;border-radius:50%;background:#fff;animation:${anims[i%4]} 4s ${delay}s linear infinite`
        el.appendChild(d)
      }
    })
  })"""

assert old_effect in s, "CIBLE EFFECT"
s = s.replace(old_effect, new_effect, 1)
print('  > useEffect querySelectorAll')

# 2. Remplacer ref={masterGlitterRef} par className
s = s.replace(
    "ref={masterGlitterRef} style={{ position:'absolute', inset:'-2px 0', pointerEvents:'none' }}",
    "className='master-glitter-container' style={{ position:'absolute', inset:'-2px 0', pointerEvents:'none' }}"
)
print('  > className')

f.write_text(s, 'utf-8')
print('OK')
