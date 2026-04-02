#!/usr/bin/env python3
"""Spotlight — fond neutre, plus de couleur type derriere la carte"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Card wrapper — fond neutre au lieu de la couleur type
old_gem = "background:`linear-gradient(160deg,${ec}12,${ec}05)`, border:`1.5px solid ${ec}25`, borderRadius:'14px', boxShadow:`0 0 30px ${ec}10,0 12px 32px rgba(0,0,0,.08)`"
new_gem = "background:'#F5F5F7', border:'1px solid #E5E5EA', borderRadius:'14px', boxShadow:'0 4px 20px rgba(0,0,0,.06)'"
assert old_gem in s, "CIBLE GEM NON TROUVEE"
s = s.replace(old_gem, new_gem, 1)
print('  > fond neutre')

# 2. Barre coloree en haut — supprimer
old_bar = """<div style={{ height:'3px', background:`linear-gradient(90deg,${ec},${ec}55)`, position:'absolute', top:0, left:0, right:0 }}/>"""
new_bar = ""
assert old_bar in s, "CIBLE BAR NON TROUVEE"
s = s.replace(old_bar, new_bar, 1)
print('  > barre supprimee')

# 3. Image container — fond neutre
old_img_bg = "background:`${ec}14`"
assert old_img_bg in s, "CIBLE IMG BG NON TROUVEE"
s = s.replace(old_img_bg, "background:'#EBEBEB'", 1)
print('  > image bg neutre')

# 4. Particles — supprimer du spotlight
old_ptcl1 = """<div className="ptcl" style={{ background:ec, bottom:'22%', left:'20%' }}/>"""
old_ptcl2 = """<div className="ptcl" style={{ background:ec, bottom:'35%', left:'65%' }}/>"""
# Only remove the ones in the spotlight (first occurrence)
idx1 = s.find(old_ptcl1)
if idx1 > 0 and idx1 < s.find("SHOWCASE PICKER"):
    s = s[:idx1] + s[idx1+len(old_ptcl1):]
    print('  > ptcl1 supprime')
idx2 = s.find(old_ptcl2)
if idx2 > 0 and idx2 < s.find("SHOWCASE PICKER"):
    s = s[:idx2] + s[idx2+len(old_ptcl2):]
    print('  > ptcl2 supprime')

# 5. Modal shadow — plus douce
old_modal = "boxShadow:`0 0 24px ${ec}10,0 24px 60px rgba(0,0,0,.12)`"
new_modal = "boxShadow:'0 24px 60px rgba(0,0,0,.12),0 8px 20px rgba(0,0,0,.05)'"
assert old_modal in s, "CIBLE MODAL SHADOW NON TROUVEE"
s = s.replace(old_modal, new_modal, 1)
print('  > modal shadow neutre')

# 6. Fallback no-image — cercle neutre au lieu de couleur type
old_fallback_glow = "background:eg, filter:'blur(28px)'"
new_fallback_glow = "background:'rgba(0,0,0,.06)', filter:'blur(28px)'"
if old_fallback_glow in s:
    s = s.replace(old_fallback_glow, new_fallback_glow, 1)
    print('  > fallback glow neutre')

old_fallback_orb = "background:`radial-gradient(circle at 35% 35%,${ec}DD,${ec}77)`, boxShadow:`0 0 28px ${eg}`"
new_fallback_orb = "background:'radial-gradient(circle at 35% 35%,#C7C7CC,#A1A1A6)', boxShadow:'0 0 20px rgba(0,0,0,.08)'"
if old_fallback_orb in s:
    s = s.replace(old_fallback_orb, new_fallback_orb, 1)
    print('  > fallback orb neutre')

f.write_text(s, 'utf-8')
print('OK — spotlight clean')
