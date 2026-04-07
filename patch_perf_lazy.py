#!/usr/bin/env python3
"""Perf: lazy render collapsed + IntersectionObserver glitter + CSS contain"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Collapsed = ne pas rendre le contenu du tout
old_collapse = """<div style={{ maxHeight:collapsedSets.has(setName)?'0px':'3000px', overflow:'hidden', transition:'max-height .35s cubic-bezier(.4,0,.2,1), opacity .25s', opacity:collapsedSets.has(setName)?0:1 }}>"""
new_collapse = """{!collapsedSets.has(setName)&&<div>"""
assert old_collapse in s, "CIBLE COLLAPSE"
s = s.replace(old_collapse, new_collapse, 1)
print('  > lazy collapse')

# Fermer le conditionnel avant le separateur
idx_sep = s.find('parateur')
assert idx_sep > 0, "CIBLE SEP"
close_before = s.rfind('</div>', 0, idx_sep)
line_start = s.rfind('\n', 0, close_before) + 1
line_end = s.find('\n', close_before)
old_line = s[line_start:line_end]
if '</div>' in old_line and not old_line.rstrip().endswith('}'):
    s = s[:line_start] + old_line.rstrip() + '}' + s[line_end:]
    print('  > collapse close brace')

# 2. Glitter useEffect — IntersectionObserver pour generer seulement quand visible
old_effect = """  // -- Master set glitter generator --
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
    const badges = document.querySelectorAll('.badge-glitter-container')
    badges.forEach(bg => {
      if (bg.childNodes.length > 0) return
      const anims = ['gl1','gl2','gl3','gl4']
      for (let i = 0; i < 80; i++) {
        const d = document.createElement('div')
        const sz = Math.random() > .5 ? 2 : 1
        const top = (-1 + Math.random() * 18).toFixed(0)
        const left = (Math.random() * 98).toFixed(1)
        const delay = (Math.random() * 4).toFixed(2)
        d.style.cssText = `position:absolute;top:${top}px;left:${left}%;width:${sz}px;height:${sz}px;border-radius:50%;background:#fff;animation:${anims[i%4]} 4s ${delay}s linear infinite`
        bg.appendChild(d)
      }
    })
  })"""

new_effect = """  // -- Glitter: IntersectionObserver (perf) --
  const glitterObsRef = useRef<IntersectionObserver|null>(null)
  useEffect(() => {
    const fillGlitter = (el: Element, count: number) => {
      if (el.childNodes.length > 0) return
      const anims = ['gl1','gl2','gl3','gl4']
      for (let i = 0; i < count; i++) {
        const d = document.createElement('div')
        const sz = Math.random() > .6 ? 2 : 1
        const top = (count > 100 ? -2 + Math.random() * 12 : -1 + Math.random() * 18).toFixed(0)
        const left = (Math.random() * 99).toFixed(1)
        const delay = (Math.random() * 4).toFixed(2)
        d.style.cssText = `position:absolute;top:${top}px;left:${left}%;width:${sz}px;height:${sz}px;border-radius:50%;background:#fff;animation:${anims[i%4]} 4s ${delay}s linear infinite`
        el.appendChild(d)
      }
    }
    const pauseGlitter = (el: Element) => {
      (el as HTMLElement).style.display = 'none'
    }
    const resumeGlitter = (el: Element, count: number) => {
      fillGlitter(el, count)
      ;(el as HTMLElement).style.display = ''
    }
    if (glitterObsRef.current) glitterObsRef.current.disconnect()
    glitterObsRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el = entry.target
        const count = el.classList.contains('master-glitter-container') ? 2000 : 80
        if (entry.isIntersecting) {
          resumeGlitter(el, count)
        } else {
          pauseGlitter(el)
        }
      })
    }, { rootMargin: '200px' })
    const obs = glitterObsRef.current
    document.querySelectorAll('.master-glitter-container, .badge-glitter-container').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  })"""

assert old_effect in s, "CIBLE EFFECT"
s = s.replace(old_effect, new_effect, 1)
print('  > IntersectionObserver glitter')

# 3. CSS contain + will-change
old_pocket = ".pocket-shell .card-plastic"
if 'contain:layout' not in s:
    new_pocket = ".pocket-shell { contain:layout style paint; }\n        .master-glitter-container, .badge-glitter-container { will-change:opacity; }\n        .pocket-shell .card-plastic"
    assert old_pocket in s, "CIBLE POCKET"
    s = s.replace(old_pocket, new_pocket, 1)
    print('  > CSS contain + will-change')

f.write_text(s, 'utf-8')
print('OK')
