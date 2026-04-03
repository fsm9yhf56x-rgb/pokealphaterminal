#!/usr/bin/env python3
"""Drag-to-scroll sur les shelf rows"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Ajouter le handler drag-to-scroll apres mmDown
old_mmdown_end = """    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }"""
new_mmdown_end = """    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Drag-to-scroll shelf ──
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
assert old_mmdown_end in s, "CIBLE MMDOWN"
s = s.replace(old_mmdown_end, new_mmdown_end, 1)
print('  > drag handler')

# Ajouter onMouseDown sur la shelf-row
old_shelf_row = """<div className="shelf-row" ref={el=>{scrollRefs.current[setName]=el}} onScroll={e=>handleShelfScroll(setName,e)} style={{ display:'flex', gap:'8px', overflowX:'auto' as const, padding:'8px 0 8px', WebkitOverflowScrolling:'touch' as any }}>"""
new_shelf_row = """<div className="shelf-row" ref={el=>{scrollRefs.current[setName]=el}} onScroll={e=>handleShelfScroll(setName,e)} onMouseDown={onShelfMouseDown} style={{ display:'flex', gap:'8px', overflowX:'auto' as const, padding:'8px 0 8px', WebkitOverflowScrolling:'touch' as any, cursor:'grab' }}>"""
assert old_shelf_row in s, "CIBLE SHELF ROW"
s = s.replace(old_shelf_row, new_shelf_row, 1)
print('  > shelf row onMouseDown + cursor:grab')

f.write_text(s, 'utf-8')
print('OK')
