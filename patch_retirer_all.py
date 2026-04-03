#!/usr/bin/env python3
"""Retirer: zone 25% top, fixe, pas de shift — cible les button actuels"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. CSS — bloquer scale active sur remove-btn
old_css = "button:active:not(:disabled) { transform:scale(.97) !important;transition-duration:.06s !important; }"
new_css = "button:active:not(:disabled):not(.remove-btn) { transform:scale(.97) !important;transition-duration:.06s !important; }\n        .pocket-shell:active:not(:has(.remove-btn:hover)) { transform:translateY(-3px) scale(.99) !important;transition-duration:.12s !important; }"
assert old_css in s, "CIBLE CSS"
s = s.replace(old_css, new_css, 1)
print('  > CSS fix')

# Supprimer l'ancien pocket-shell:active (doublon)
old_active = "\n        .pocket-shell:active { transform:translateY(-3px) scale(.99) !important;transition-duration:.12s !important; }"
if old_active in s:
    s = s.replace(old_active, "", 1)
    print('  > old active removed')

# 2. SHELF — ligne 1565 : button -> div zone 25%
old_shelf = """<button className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}} onClick={e=>removeCard(card,e)}
                                  style={{ position:'absolute', top:'5px', left:'50%', transform:'translateX(-50%)', zIndex:20, background:'rgba(255,255,255,.94)', border:'1px solid #E5E5EA', color:'#E03020', borderRadius:'99px', padding:'5px 14px', fontSize:'10px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', opacity:0, transition:'opacity .15s', whiteSpace:'nowrap', boxShadow:'0 2px 8px rgba(0,0,0,.1)' }}>
                                  Retirer
                                </button>"""
new_shelf = """<div className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}}
                                  onMouseEnter={e=>{const p=e.currentTarget.parentElement;if(p){p.style.transform='translateY(-6px)';p.style.transition='none'}}}
                                  onClick={e=>{e.stopPropagation();removeCard(card,e)}}
                                  style={{ position:'absolute', top:0, left:0, right:0, height:'25%', zIndex:20, cursor:'pointer', opacity:0, transition:'opacity .15s', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'8px', borderRadius:'12px 12px 0 0', background:'linear-gradient(to bottom, rgba(255,255,255,.85) 0%, rgba(255,255,255,.4) 60%, transparent 100%)' }}>
                                  <span style={{ background:'#fff', border:'1px solid #E5E5EA', color:'#E03020', borderRadius:'99px', padding:'5px 14px', fontSize:'10px', fontWeight:600, fontFamily:'var(--font-display)', whiteSpace:'nowrap', boxShadow:'0 2px 8px rgba(0,0,0,.1)', pointerEvents:'none' }}>Retirer</span>
                                </div>"""
assert old_shelf in s, "CIBLE SHELF BTN"
s = s.replace(old_shelf, new_shelf, 1)
print('  > shelf zone')

# 3. GRID — ligne 1745 : button -> div zone 25%
old_grid = """<button className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}} onClick={e=>removeCard(card,e)}
                            style={{ position:'absolute', top:'4px', left:'50%', transform:'translateX(-50%)', zIndex:20, background:'rgba(250,251,252,.94)', border:'1px solid #D2D2D7', color:'#3A3A3C', borderRadius:'16px', padding:'3px 10px', fontSize:'9px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', opacity:0, transition:'opacity .18s', whiteSpace:'nowrap', backdropFilter:'blur(4px)' }}>
                            Retirer
                          </button>"""
new_grid = """<div className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}}
                            onMouseEnter={e=>{const p=e.currentTarget.parentElement;if(p){p.style.transform='translateY(-8px)';p.style.transition='none'}}}
                            onClick={e=>{e.stopPropagation();removeCard(card,e)}}
                            style={{ position:'absolute', top:0, left:0, right:0, height:'25%', zIndex:20, cursor:'pointer', opacity:0, transition:'opacity .15s', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'6px', borderRadius:'10px 10px 0 0', background:'linear-gradient(to bottom, rgba(255,255,255,.85) 0%, rgba(255,255,255,.4) 60%, transparent 100%)' }}>
                            <span style={{ background:'#fff', border:'1px solid #E5E5EA', color:'#E03020', borderRadius:'99px', padding:'4px 12px', fontSize:'9px', fontWeight:600, fontFamily:'var(--font-display)', whiteSpace:'nowrap', boxShadow:'0 2px 8px rgba(0,0,0,.1)', pointerEvents:'none' }}>Retirer</span>
                          </div>"""
assert old_grid in s, "CIBLE GRID BTN"
s = s.replace(old_grid, new_grid, 1)
print('  > grid zone')

f.write_text(s, 'utf-8')
print('OK')
