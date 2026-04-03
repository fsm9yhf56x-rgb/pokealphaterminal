#!/usr/bin/env python3
"""Master set: etoile + badge MASTER SET meme style or que la barre"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Badge MASTER SET — shimmer or clair comme la barre
old_badge = "fontSize:'8px', fontWeight:800, background:'linear-gradient(90deg,#C9A84C,#FFD700,#FFF1A8,#FFD700,#C9A84C)', backgroundSize:'300% 100%', animation:'masterShine 3s ease-in-out infinite', color:'#1a1200', padding:'3px 10px', borderRadius:'4px', letterSpacing:'.08em', boxShadow:'0 2px 8px rgba(255,215,0,.3)', display:'inline-flex', alignItems:'center', gap:'4px'"
new_badge = "fontSize:'8px', fontWeight:800, background:'linear-gradient(90deg,#D4B85C,#F0E080,#FFFAD0,#F0E080,#D4B85C)', backgroundSize:'300% 100%', animation:'goldSlow 8s linear infinite', color:'#6B5A1E', padding:'3px 10px', borderRadius:'4px', letterSpacing:'.1em', border:'1px solid rgba(240,224,128,.5)', display:'inline-flex', alignItems:'center', gap:'4px'"
assert old_badge in s, "CIBLE BADGE"
s = s.replace(old_badge, new_badge, 1)
print('  > badge shimmer')

# 2. Etoile du level badge — fond or gradient + breath
old_star_bg = "const lvlBg    = isComplete ? '#FFF7E0' :"
new_star_bg = "const lvlBg    = isComplete ? 'linear-gradient(135deg,#D4B85C,#F0E080,#FFFAD0,#F0E080)' :"
assert old_star_bg in s, "CIBLE LVL BG"
s = s.replace(old_star_bg, new_star_bg, 1)
print('  > star bg')

old_star_color = "const lvlColor = isComplete ? '#B8860B' :"
new_star_color = "const lvlColor = isComplete ? '#fff' :"
assert old_star_color in s, "CIBLE LVL COLOR"
s = s.replace(old_star_color, new_star_color, 1)
print('  > star color')

old_star_border = "const lvlBorder= isComplete ? '#E8D48B' :"
new_star_border = "const lvlBorder= isComplete ? 'rgba(240,224,128,.5)' :"
assert old_star_border in s, "CIBLE LVL BORDER"
s = s.replace(old_star_border, new_star_border, 1)
print('  > star border')

# 3. Nom du set quand complet — or fonce comme le badge
s = s.replace("color:isComplete?'#B8860B':'#1D1D1F'", "color:isComplete?'#6B5A1E':'#1D1D1F'")
print('  > name color')

f.write_text(s, 'utf-8')
print('OK')
