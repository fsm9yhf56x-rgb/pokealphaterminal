#!/usr/bin/env python3
"""Revert canvas -> back to divs glitter"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Revert useEffect
old = """  // -- Glitter via animated canvas (perf) --
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

new = """  // -- Master set glitter generator --
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

assert old in s, "CIBLE EFFECT"
s = s.replace(old, new, 1)
print('  > reverted effect')

# 2. canvas -> div master
old_cv = """<canvas className='glitter-cv' data-count='200' width={800} height={14} style={{ position:'absolute', inset:'-2px 0', width:'100%', height:'calc(100% + 4px)', pointerEvents:'none' }}/>"""
new_cv = """<div className='master-glitter-container' style={{ position:'absolute', inset:'-2px 0', pointerEvents:'none' }}/>"""
s = s.replace(old_cv, new_cv)
print('  > master divs restored')

# 3. canvas -> div badge
old_bdiv = """<canvas className='glitter-cv' data-count='30' width={120} height={20} style={{ position:'absolute', inset:'-1px 0', width:'100%', height:'calc(100% + 2px)', pointerEvents:'none' }}/>"""
new_bdiv = """<div className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/>"""
s = s.replace(old_bdiv, new_bdiv)
print('  > badge divs restored')

f.write_text(s, 'utf-8')
print('OK')
