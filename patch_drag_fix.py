#!/usr/bin/env python3
"""Fix drag: seuil 5px avant activation, prevent click apres drag"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

old = """  // ── Drag-to-scroll shelf ──
  const shelfDrag = useRef<{active:boolean;startX:number;scrollLeft:number;el:HTMLElement|null}>({active:false,startX:0,scrollLeft:0,el:null})
  const onShelfMouseDown = (e:React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    shelfDrag.current = { active:true, startX:e.clientX, scrollLeft:el.scrollLeft, el }
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'
    const onMove = (ev:MouseEvent) => {
      if (!shelfDrag.current.active) return
      const dx = ev.clientX - shelfDrag.current.startX
      el.scrollLeft = shelfDrag.current.scrollLeft - dx
    }
    const onUp = () => {
      shelfDrag.current.active = false
      el.style.cursor = ''
      el.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }"""

new = """  // ── Drag-to-scroll shelf ──
  const shelfDrag = useRef<{active:boolean;dragging:boolean;startX:number;scrollLeft:number;el:HTMLElement|null}>({active:false,dragging:false,startX:0,scrollLeft:0,el:null})
  const onShelfMouseDown = (e:React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    shelfDrag.current = { active:true, dragging:false, startX:e.clientX, scrollLeft:el.scrollLeft, el }
    const onMove = (ev:MouseEvent) => {
      if (!shelfDrag.current.active) return
      const dx = ev.clientX - shelfDrag.current.startX
      if (!shelfDrag.current.dragging && Math.abs(dx) < 5) return
      if (!shelfDrag.current.dragging) {
        shelfDrag.current.dragging = true
        el.style.cursor = 'grabbing'
        el.style.userSelect = 'none'
      }
      el.scrollLeft = shelfDrag.current.scrollLeft - dx
    }
    const onUp = () => {
      const wasDragging = shelfDrag.current.dragging
      shelfDrag.current.active = false
      shelfDrag.current.dragging = false
      el.style.cursor = ''
      el.style.userSelect = ''
      if (wasDragging) {
        const block = (ev:MouseEvent) => { ev.stopPropagation(); ev.preventDefault() }
        el.addEventListener('click', block, { capture:true, once:true })
      }
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }"""

assert old in s, "CIBLE DRAG"
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK — drag avec seuil 5px + block click apres drag')
