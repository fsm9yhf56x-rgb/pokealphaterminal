#!/usr/bin/env python3
"""Hover Lift & Shadow — supprime tilt/holo/particles, remplace par lift clean"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. pocket-shell className — retirer breathe-S/A et gem
old_cls = "className={'pocket-shell gem'+(card.signal==='S'?' breathe-S':card.signal==='A'?' breathe-A':'')}"
new_cls = "className='pocket-shell'"
assert old_cls in s, "CIBLE CLASSNAME NON TROUVEE"
s = s.replace(old_cls, new_cls, 1)
print('  > className simplifie')

# 2. Mouse handlers — remplacer tilt par lift simple
old_handlers = """onMouseMove={tiltCard}
                          onMouseLeave={e=>{ resetCard(e); e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; const rb=e.currentTarget.querySelector('.remove-btn') as HTMLElement|null; if(rb) rb.style.opacity='0' }}
                          onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-6px)'; e.currentTarget.style.boxShadow='0 12px 24px rgba(0,0,0,.1)'; const rb=e.currentTarget.querySelector('.remove-btn') as HTMLElement|null; if(rb) rb.style.opacity='1' }}"""
new_handlers = """onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; const rb=e.currentTarget.querySelector('.remove-btn') as HTMLElement|null; if(rb) rb.style.opacity='0' }}
                          onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-8px)'; e.currentTarget.style.boxShadow='0 20px 40px rgba(0,0,0,.10), 0 8px 16px rgba(0,0,0,.04)'; const rb=e.currentTarget.querySelector('.remove-btn') as HTMLElement|null; if(rb) rb.style.opacity='1' }}"""
assert old_handlers in s, "CIBLE HANDLERS NON TROUVEE"
s = s.replace(old_handlers, new_handlers, 1)
print('  > handlers lift & shadow')

# 3. Supprimer card-plastic, holo, hm, ptcl dans le binder grid
old_effects = """                          {/* Reflet plastique protecteur */}
                          <div className="card-plastic" style={{ opacity:.08 }}/>
                          {isHolo&&<div className="holo"/>}
                          {isHolo&&<div className="hm"/>}
                          <div className="ptcl" style={{ background:ec, bottom:'22%', left:'20%' }}/>
                          <div className="ptcl" style={{ background:ec, bottom:'35%', left:'62%' }}/>"""
assert old_effects in s, "CIBLE EFFECTS NON TROUVEE"
s = s.replace(old_effects, "", 1)
print('  > effets holo/ptcl/plastic supprimes')

# 4. Transition sur le shell — plus douce pour le lift
old_transition = "transition:'transform .25s cubic-bezier(.34,1.2,.64,1), box-shadow .25s'"
new_transition = "transition:'transform .3s cubic-bezier(.22,.68,0,1.1), box-shadow .35s ease'"
# Remplacer seulement dans le binder grid (la premiere occurrence dans le context pocket-shell)
idx = s.find("className='pocket-shell'")
if idx > 0:
    chunk_start = idx
    chunk_end = idx + 500
    chunk = s[chunk_start:chunk_end]
    if old_transition in chunk:
        s = s[:chunk_start] + chunk.replace(old_transition, new_transition, 1) + s[chunk_end:]
        print('  > transition adoucie')

f.write_text(s, 'utf-8')
print('OK — hover Lift & Shadow')
