#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# 1. Rarity badge: top-left -> bottom-left, semi-transparent
old = """{card.rarity && (()=>{ const rc=getRarityColor(card.rarity); return <div style={{ position:'absolute', top:'6px', left:'6px', zIndex:2, padding:'2px 6px', borderRadius:'4px', background:rc.bg, fontSize:'8px', fontWeight:600, color:rc.fg, fontFamily:'var(--font-display)', letterSpacing:'.02em' }}>{card.rarity}</div> })()}"""
new = """{card.rarity && (()=>{ const rc=getRarityColor(card.rarity); return <div style={{ position:'absolute', bottom:'6px', left:'6px', zIndex:2, padding:'2px 6px', borderRadius:'4px', background:rc.bg, fontSize:'7px', fontWeight:600, color:rc.fg, fontFamily:'var(--font-display)', letterSpacing:'.02em', opacity:.9 }}>{card.rarity}</div> })()}"""
assert old in s, "CIBLE BADGE"
s = s.replace(old, new, 1)
print('  > badge bottom-left')

# 2. Zoom button: redesign
old_zoom = """                        <button className="zoom-btn" onClick={e=>{ e.stopPropagation(); setLightbox(card) }}"""
idx = s.find(old_zoom)
if idx > 0:
    line_end = s.find("/>", idx) + 2
    old_full = s[idx:line_end]
    new_full = """                        <button className="zoom-btn" onClick={e=>{ e.stopPropagation(); setLightbox(card) }}
                          style={{ position:'absolute', top:'6px', right:'6px', width:'24px', height:'24px', borderRadius:'6px', background:'rgba(255,255,255,.85)', backdropFilter:'blur(4px)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, zIndex:3 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
                        </button>"""
    s = s.replace(old_full, new_full, 1)
    print('  > zoom redesign')

f.write_text(s, 'utf-8')
print('OK')
