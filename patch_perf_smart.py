#!/usr/bin/env python3
"""Perf: canvas anime avec requestAnimationFrame + collapse smooth"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Remplacer le canvas statique par un canvas anime
old_effect = """  // -- Master set glitter via canvas (perf) --
  const glitterCanvasRef = useRef<Record<string,string>>({})
  const generateGlitterBg = (w:number, h:number, count:number, key:string) => {
    if (glitterCanvasRef.current[key]) return glitterCanvasRef.current[key]
    const cv = document.createElement('canvas')
    cv.width = w; cv.height = h
    const ctx = cv.getContext('2d')!
    for (let i = 0; i < count; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const sz = Math.random() > .6 ? 1.5 : 1
      ctx.beginPath()
      ctx.arc(x, y, sz, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + Math.random() * 0.25) + ')'
      ctx.fill()
    }
    const url = cv.toDataURL()
    glitterCanvasRef.current[key] = url
    return url
  }"""

new_effect = """  // -- Master set glitter via animated canvas (perf) --
  const glitterInitRef = useRef(false)
  useEffect(() => {
    if (glitterInitRef.current) return
    glitterInitRef.current = true
    // Generer les points une seule fois par canvas
    document.querySelectorAll<HTMLCanvasElement>('canvas.glitter-cv').forEach(cv => {
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
        ctx.clearRect(0,0,cv.width,cv.height)
        for (const p of pts) {
          const a = Math.max(0, Math.sin(t*0.001*p.speed + p.phase)) * 0.45
          if (a < 0.05) continue
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.sz, 0, Math.PI*2)
          ctx.fillStyle = 'rgba(255,255,255,'+a.toFixed(2)+')'
          ctx.fill()
        }
        raf = requestAnimationFrame(draw)
      }
      raf = requestAnimationFrame(draw)
      // Cleanup quand le canvas sort du DOM
      const obs = new MutationObserver(() => {
        if (!document.contains(cv)) { cancelAnimationFrame(raf); obs.disconnect() }
      })
      obs.observe(document.body, { childList:true, subtree:true })
    })
  })"""

assert old_effect in s, "CIBLE EFFECT"
s = s.replace(old_effect, new_effect, 1)
print('  > animated canvas effect')

# 2. Remplacer les div glitter master par des canvas
old_master1 = """<div style={{ position:'absolute', inset:'-2px 0', pointerEvents:'none', backgroundImage:'url('+generateGlitterBg(800,14,2000,'master')+')', backgroundSize:'100% 100%', animation:'gl1 4s linear infinite', mixBlendMode:'screen' as any }}/>
                                        <div style={{ position:'absolute', inset:'-2px 0', pointerEvents:'none', backgroundImage:'url('+generateGlitterBg(800,14,2000,'master2')+')', backgroundSize:'100% 100%', animation:'gl2 4s 2s linear infinite', mixBlendMode:'screen' as any }}/>"""
new_master1 = """<canvas className='glitter-cv' data-count='200' width={800} height={14} style={{ position:'absolute', inset:'-2px 0', width:'100%', height:'calc(100% + 4px)', pointerEvents:'none' }}/>"""
c1 = s.count(old_master1)
s = s.replace(old_master1, new_master1)
print(f'  > master canvas x{c1}')

# 3. Remplacer les badge glitter div
old_badge_div = """<div style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none', backgroundImage:'url('+generateGlitterBg(120,20,80,'badge')+')', backgroundSize:'100% 100%', animation:'gl1 4s linear infinite', mixBlendMode:'screen' as any }}/>"""
new_badge_div = """<canvas className='glitter-cv' data-count='30' width={120} height={20} style={{ position:'absolute', inset:'-1px 0', width:'100%', height:'calc(100% + 2px)', pointerEvents:'none' }}/>"""
c2 = s.count(old_badge_div)
s = s.replace(old_badge_div, new_badge_div)
print(f'  > badge canvas div x{c2}')

# 4. Remplacer les badge glitter span
old_badge_span = """<span style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none', backgroundImage:'url('+generateGlitterBg(120,20,80,'badge')+')', backgroundSize:'100% 100%', animation:'gl1 4s linear infinite', mixBlendMode:'screen' as any }}/>"""
new_badge_span = """<canvas className='glitter-cv' data-count='30' width={120} height={20} style={{ position:'absolute', inset:'-1px 0', width:'100%', height:'calc(100% + 2px)', pointerEvents:'none' }}/>"""
c3 = s.count(old_badge_span)
s = s.replace(old_badge_span, new_badge_span)
print(f'  > badge canvas span x{c3}')

# 5. Restaurer la transition de collapse
old_collapse = """{!collapsedSets.has(setName)&&<div style={{ overflow:'hidden' }}>"""
new_collapse = """<div style={{ maxHeight:collapsedSets.has(setName)?'0px':'5000px', overflow:'hidden', transition:'max-height .4s cubic-bezier(.4,0,.2,1)', opacity:collapsedSets.has(setName)?0:1, transition:'max-height .4s, opacity .25s' }}>"""
assert old_collapse in s, "CIBLE COLLAPSE"
s = s.replace(old_collapse, new_collapse, 1)
print('  > restore collapse transition')

# 6. Fixer la fermeture du collapse
old_close = """                          </div>}
                          {/* S"""
new_close = """                          </div>
                          {/* S"""
if old_close in s:
    s = s.replace(old_close, new_close, 1)
    print('  > fix collapse close')

f.write_text(s, 'utf-8')
print('OK')
