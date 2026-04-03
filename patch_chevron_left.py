#!/usr/bin/env python3
"""Chevron collapse a gauche du badge, plus gros"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Supprimer le chevron a droite (ajoute par patch precedent)
old_chevron_right = """<span style={{ fontSize:'10px', color:'#48484A', fontFamily:'var(--font-display)' }}>{setCards.length}{resolvedTotal>0?<span style={{ color:'#86868B' }}> / {resolvedTotal}</span>:<span style={{ color:'#AEAEB2' }}> cartes</span>}</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="2.5" strokeLinecap="round" style={{ transition:'transform .25s', transform:collapsedSets.has(setName)?'rotate(-90deg)':'rotate(0deg)' }}><path d="M6 9l6 6 6-6"/></svg>"""
new_chevron_right = """<span style={{ fontSize:'10px', color:'#48484A', fontFamily:'var(--font-display)' }}>{setCards.length}{resolvedTotal>0?<span style={{ color:'#86868B' }}> / {resolvedTotal}</span>:<span style={{ color:'#AEAEB2' }}> cartes</span>}</span>"""
assert old_chevron_right in s, "CIBLE CHEVRON RIGHT"
s = s.replace(old_chevron_right, new_chevron_right, 1)
print('  > chevron droite supprime')

# 2. Ajouter le chevron a gauche, avant le badge numero
old_badge = """<div style={{ width:'22px', height:'22px', borderRadius:'6px', background:lvlBg, border:`1px solid ${lvlBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:isComplete?'12px':'9px', fontWeight:800, color:lvlColor, flexShrink:0 }}>{lvl}</div>"""
new_badge = """<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="2.5" strokeLinecap="round" style={{ transition:'transform .3s cubic-bezier(.4,0,.2,1)', transform:collapsedSets.has(setName)?'rotate(-90deg)':'rotate(0deg)', flexShrink:0 }}><path d="M6 9l6 6 6-6"/></svg>
                                    <div style={{ width:'22px', height:'22px', borderRadius:'6px', background:lvlBg, border:`1px solid ${lvlBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:isComplete?'12px':'9px', fontWeight:800, color:lvlColor, flexShrink:0 }}>{lvl}</div>"""
assert old_badge in s, "CIBLE BADGE"
s = s.replace(old_badge, new_badge, 1)
print('  > chevron gauche ajoute')

f.write_text(s, 'utf-8')
print('OK')
