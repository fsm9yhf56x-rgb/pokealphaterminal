#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. CSS — bloquer scale(.99) quand on hover la zone retirer
old = ".pocket-shell:active { transform:translateY(-3px) scale(.99) !important;transition-duration:.12s !important; }"
new = ".pocket-shell:active:not(:has(.remove-btn:hover)) { transform:translateY(-3px) scale(.99) !important;transition-duration:.12s !important; }"
if old in s:
    s = s.replace(old, new, 1)
    print('  > CSS has fix')

# 2. Shelf remove — figer le parent au hover
old_shelf = """<div className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}} onClick={e=>removeCard(card,e)}
                                  style={{ position:'absolute', top:0, left:0, right:0, height:'25%', zIndex:20"""
new_shelf = """<div className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}}
                                  onMouseEnter={e=>{const p=e.currentTarget.parentElement;if(p){p.style.transform='translateY(-6px)';p.style.transition='none'}}}
                                  onClick={e=>{e.stopPropagation();removeCard(card,e)}}
                                  style={{ position:'absolute', top:0, left:0, right:0, height:'25%', zIndex:20"""
assert old_shelf in s, "CIBLE SHELF"
s = s.replace(old_shelf, new_shelf, 1)
print('  > shelf lock')

# 3. Grid remove — figer le parent au hover
old_grid = """<div className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}} onClick={e=>removeCard(card,e)}
                            style={{ position:'absolute', top:0, left:0, right:0, height:'25%', zIndex:20"""
new_grid = """<div className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}}
                            onMouseEnter={e=>{const p=e.currentTarget.parentElement;if(p){p.style.transform='translateY(-8px)';p.style.transition='none'}}}
                            onClick={e=>{e.stopPropagation();removeCard(card,e)}}
                            style={{ position:'absolute', top:0, left:0, right:0, height:'25%', zIndex:20"""
assert old_grid in s, "CIBLE GRID"
s = s.replace(old_grid, new_grid, 1)
print('  > grid lock')

f.write_text(s, 'utf-8')
print('OK')
