#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Badge MASTER SET — ajouter metalShift sur le fond
old_badge = "background:'linear-gradient(90deg,#D4AF37,#F0E080,#D4AF37)', backgroundSize:'200% 100%', animation:'goldSlow 6s linear infinite'"
new_badge = "background:'linear-gradient(145deg,#8B7320,#B8942F,#D4AF37,#F5ECA0,#FFFAD0,#F5ECA0,#D4AF37,#B8942F,#8B7320)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite'"
assert old_badge in s, "CIBLE BADGE"
s = s.replace(old_badge, new_badge, 1)

# Ajouter inset shadow sur le badge
old_badge_border = "border:'1px solid rgba(212,175,55,.3)', display:'inline-flex'"
new_badge_border = "border:'1px solid rgba(212,175,55,.4)', boxShadow:'0 1px 3px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,240,.4)', display:'inline-flex'"
assert old_badge_border in s, "CIBLE BADGE BORDER"
s = s.replace(old_badge_border, new_badge_border, 1)
print('  > badge metalShift')

# 2. Barre master — ajouter le reflet diagonal en overlay
old_bar_glitter = "<div className='master-glitter-container' style={{ position:'absolute', inset:'-2px 0', pointerEvents:'none' }}/>"
new_bar_glitter = "<div style={{ position:'absolute', inset:0, borderRadius:'4px', background:'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.3) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/>\n                                        <div className='master-glitter-container' style={{ position:'absolute', inset:'-2px 0', pointerEvents:'none' }}/>"
assert old_bar_glitter in s, "CIBLE BAR GLITTER"
s = s.replace(old_bar_glitter, new_bar_glitter, 1)
print('  > bar metalShift overlay')

f.write_text(s, 'utf-8')
print('OK')
