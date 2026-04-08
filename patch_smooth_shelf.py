#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. CSS smooth
old_css = ".shelf-row { scrollbar-width:none; -ms-overflow-style:none; overflow-x:scroll !important; }"
new_css = ".shelf-row { scrollbar-width:none; -ms-overflow-style:none; overflow-x:scroll !important; -webkit-overflow-scrolling:touch; }"
assert old_css in s, "CIBLE CSS"
s = s.replace(old_css, new_css, 1)
print('  > CSS smooth')

# 2. Add velocity to ref type + init
old_ref = "const shelfDrag = useRef<{active:boolean;dragging:boolean;startX:number;scrollLeft:number;el:HTMLElement|null}>({active:false,dragging:false,startX:0,scrollLeft:0,el:null})"
new_ref = "const shelfDrag = useRef<{active:boolean;dragging:boolean;startX:number;scrollLeft:number;el:HTMLElement|null;lastX:number;lastT:number;vx:number}>({active:false,dragging:false,startX:0,scrollLeft:0,el:null,lastX:0,lastT:0,vx:0})"
assert old_ref in s, "CIBLE REF"
s = s.replace(old_ref, new_ref, 1)
print('  > ref type')

# 3. Init with velocity tracking
old_init = "    shelfDrag.current = { active:true, dragging:false, startX:e.clientX, scrollLeft:el.scrollLeft, el }"
new_init = "    shelfDrag.current = { active:true, dragging:false, startX:e.clientX, scrollLeft:el.scrollLeft, el, lastX:e.clientX, lastT:Date.now(), vx:0 }"
assert old_init in s, "CIBLE INIT"
s = s.replace(old_init, new_init, 1)
print('  > init')

# 4. Track velocity in move
old_move = "      el.scrollLeft = shelfDrag.current.scrollLeft - dx"
new_move = """      const now = Date.now()
      const dt = now - shelfDrag.current.lastT
      if (dt > 0) shelfDrag.current.vx = (ev.clientX - shelfDrag.current.lastX) / dt * 16
      shelfDrag.current.lastX = ev.clientX
      shelfDrag.current.lastT = now
      el.scrollLeft = shelfDrag.current.scrollLeft - dx"""
assert old_move in s, "CIBLE MOVE"
s = s.replace(old_move, new_move, 1)
print('  > velocity tracking')

# 5. Add momentum on mouseup
old_up = """    const onUp = () => {
      const wasDragging = shelfDrag.current.dragging
      shelfDrag.current.active = false
      shelfDrag.current.dragging = false
      el.style.cursor = ''
      el.style.userSelect = ''"""
new_up = """    const onUp = () => {
      const wasDragging = shelfDrag.current.dragging
      const vx = shelfDrag.current.vx
      shelfDrag.current.active = false
      shelfDrag.current.dragging = false
      el.style.cursor = ''
      el.style.userSelect = ''
      if (wasDragging && Math.abs(vx) > 1) {
        let momentum = -vx * 2.5
        const decay = () => {
          if (Math.abs(momentum) < 0.3) return
          el.scrollLeft += momentum
          momentum *= 0.94
          requestAnimationFrame(decay)
        }
        requestAnimationFrame(decay)
      }"""
assert old_up in s, "CIBLE UP"
s = s.replace(old_up, new_up, 1)
print('  > momentum')

f.write_text(s, 'utf-8')
print('OK')
