#!/usr/bin/env python3
"""Perf: canvas anime au lieu de 2000 divs"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Remplacer le useEffect glitter divs par canvas animated
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
    // Badge glitter (grade 10)
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

new_effect = """  // -- Glitter via animated canvas (perf) --
  useEffect(() => {
    const initCanvas = (cv: HTMLCanvasElement) => {
      if (cv.dataset.init) return
      cv.dataset.init = '1'
      const ctx = cv.getContext('2d')!
      const count = parseInt(cv.dataset.count || '200')
      const pts: {x:number;y:number;sz:number;phase:number;speed:number}[] = []
      for (let i = 0; i < count; i++) {
        pts.push({ x:Math.random()*cv.width, y:Math.random()*cv.height, sz:Math.random()>.6?1.5:1, phase:Math.random()*Math.PI*2, speed:0.3+Math.random()*0.7 })
      }
      let raf = 0
      const draw = (t:number) => {
        if (!document.contains(cv)) { cancelAnimationFrame(raf); return }
        ctx.clearRect(0,0,cv.width,cv.height)
        for (const p of pts) {
          const a = Math.max(0, Math.sin(t*0.001*p.speed + p.phase)) * 0.5
          if (a < 0.05) continue
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.sz, 0, Math.PI*2)
          ctx.fillStyle = 'rgba(255,255,255,'+a.toFixed(2)+')'
          ctx.fill()
        }
        raf = requestAnimationFrame(draw)
      }
      raf = requestAnimationFrame(draw)
    }
    document.querySelectorAll<HTMLCanvasElement>('canvas.glitter-cv').forEach(initCanvas)
  })"""

assert old_effect in s, "CIBLE EFFECT"
s = s.replace(old_effect, new_effect, 1)
print('  > canvas effect')

# 2. master-glitter-container div -> canvas
old_master = """<div className='master-glitter-container' style={{ position:'absolute', inset:'-2px 0', pointerEvents:'none' }}/>"""
new_master = """<canvas className='glitter-cv' data-count='200' width={800} height={14} style={{ position:'absolute', inset:'-2px 0', width:'100%', height:'calc(100% + 4px)', pointerEvents:'none' }}/>"""
c1 = s.count(old_master)
s = s.replace(old_master, new_master)
print(f'  > master canvas x{c1}')

# 3. badge-glitter-container div -> canvas
old_bdiv = """<div className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/>"""
new_bdiv = """<canvas className='glitter-cv' data-count='30' width={120} height={20} style={{ position:'absolute', inset:'-1px 0', width:'100%', height:'calc(100% + 2px)', pointerEvents:'none' }}/>"""
c2 = s.count(old_bdiv)
s = s.replace(old_bdiv, new_bdiv)
print(f'  > badge div canvas x{c2}')

# 4. badge-glitter-container span -> canvas
old_bspan = """<span className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/>"""
new_bspan = """<canvas className='glitter-cv' data-count='30' width={120} height={20} style={{ position:'absolute', inset:'-1px 0', width:'100%', height:'calc(100% + 2px)', pointerEvents:'none' }}/>"""
c3 = s.count(old_bspan)
s = s.replace(old_bspan, new_bspan)
print(f'  > badge span canvas x{c3}')

# 5. CSS contain sur pocket-shell
old_pocket = ".pocket-shell .card-plastic"
new_pocket = ".pocket-shell { contain:layout style paint; }\n        .pocket-shell .card-plastic"
if 'contain:layout' not in s:
    assert old_pocket in s, "CIBLE POCKET"
    s = s.replace(old_pocket, new_pocket, 1)
    print('  > contain CSS')

f.write_text(s, 'utf-8')
print('OK')
