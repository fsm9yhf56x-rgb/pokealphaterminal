#!/usr/bin/env python3
"""Master set: nettoyage complet — etoile, badge, barre, markers"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Etoile — fond solide or, pas de gradient dans un petit carre
s = s.replace(
    "const lvlBg = isComplete?'linear-gradient(135deg,#D4B85C,#F0E080,#FFFAD0,#F0E080)'",
    "const lvlBg = isComplete?'#D4AF37'"
)

# Couleur texte etoile — or fonce pour contraste
s = s.replace(
    "const lvlColor = isComplete?'#fff'",
    "const lvlColor = isComplete?'#FFF8DC'"
)

# Border etoile
s = s.replace(
    "const lvlBorder = isComplete?'rgba(240,224,128,.5)'",
    "const lvlBorder = isComplete?'#C9A84C'"
)

# 2. Masquer les % markers quand complete
old_markers = """                                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
                                      {[0,25,50,75,100].map((label,li)=>(
                                        <span key={li} style={{ fontSize:'8px', color:p>=(li*25)&&li>0?lvlColor:'#86868B', transition:'color .3s' }}>{p>=(li*25)&&li>0?label+' \u2713':label}</span>"""
new_markers = """                                    {!isComplete&&<div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
                                      {[0,25,50,75,100].map((label,li)=>(
                                        <span key={li} style={{ fontSize:'8px', color:p>=(li*25)&&li>0?lvlColor:'#86868B', transition:'color .3s' }}>{p>=(li*25)&&li>0?label+' \u2713':label}</span>"""
assert old_markers in s, "CIBLE MARKERS"
s = s.replace(old_markers, new_markers, 1)

# Fermer le conditionnel apres la fermeture du div markers
old_markers_close = """                                      ))}
                                    </div>"""
# Trouver la bonne occurrence — celle juste apres les markers
idx = s.find("li>0?label+' \\u2713':label")
close_idx = s.find(old_markers_close, idx)
assert close_idx > 0, "CIBLE MARKERS CLOSE"
s = s[:close_idx] + """                                      ))}
                                    </div>}""" + s[close_idx + len(old_markers_close):]
print('  > hide markers when complete')

# 3. Le nom "151" — plus fonce, pas trop jaune
s = s.replace("color:isComplete?'#6B5A1E':'#1D1D1F'", "color:isComplete?'#8B7320':'#1D1D1F'")
print('  > name color')

f.write_text(s, 'utf-8')
print('OK')
