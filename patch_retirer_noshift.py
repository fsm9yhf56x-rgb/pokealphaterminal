#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Les deux remove-btn div doivent aussi bloquer le parent hover/active transforms
# Shelf: ajouter onMouseEnter/Leave pour figer le parent
old_shelf_remove = """<div className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}} onClick={e=>removeCard(card,e)}
                                  style={{ position:'absolute', top:0, left:0, right:0, height:'25%', zIndex:20, cursor:'pointer', opacity:0, transition:'opacity .15s', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'8px', background:'linear-gradient(to bottom, rgba(255,255,255,.85) 0%, rgba(255,255,255,.4) 60%, transparent 100%)' }}>"""
new_shelf_remove = """<div className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}}
                                  onMouseEnter={e=>{const p=e.currentTarget.closest('.pocket-shell') as HTMLElement|null;if(p)p.style.transform='translateY(-6px)'}}
                                  onClick={e=>{e.stopPropagation();removeCard(card,e)}}
                                  style={{ position:'absolute', top:0, left:0, right:0, height:'25%', zIndex:20, cursor:'pointer', opacity:0, transition:'opacity .15s', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'8px', background:'linear-gradient(to bottom, rgba(255,255,255,.85) 0%, rgba(255,255,255,.4) 60%, transparent 100%)' }}>"""
assert old_shelf_remove in s, "CIBLE SHELF REMOVE"
s = s.replace(old_shelf_remove, new_shelf_remove, 1)

# Grid: meme chose
old_grid_remove = """<div className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}} onClick={e=>removeCard(card,e)}
                            style={{ position:'absolute', top:0, left:0, right:0, height:'25%', zIndex:20, cursor:'pointer', opacity:0, transition:'opacity .15s', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'6px', borderRadius:'10px 10px 0 0', background:'linear-gradient(to bottom, rgba(255,255,255,.85) 0%, rgba(255,255,255,.4) 60%, transparent 100%)' }}>"""
new_grid_remove = """<div className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}}
                            onMouseEnter={e=>{const p=e.currentTarget.closest('.pocket-shell') as HTMLElement|null;if(p)p.style.transform='translateY(-8px)'}}
                            onClick={e=>{e.stopPropagation();removeCard(card,e)}}
                            style={{ position:'absolute', top:0, left:0, right:0, height:'25%', zIndex:20, cursor:'pointer', opacity:0, transition:'opacity .15s', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'6px', borderRadius:'10px 10px 0 0', background:'linear-gradient(to bottom, rgba(255,255,255,.85) 0%, rgba(255,255,255,.4) 60%, transparent 100%)' }}>"""
assert old_grid_remove in s, "CIBLE GRID REMOVE"
s = s.replace(old_grid_remove, new_grid_remove, 1)

f.write_text(s, 'utf-8')
print('OK — retirer fixe')
