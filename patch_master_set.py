#!/usr/bin/env python3
"""Master set — design premium et gratifiant"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. CSS — animations pour master set
old_css = "@keyframes goldShine {"
new_css = """@keyframes masterPulse { 0%,100%{box-shadow:0 0 12px rgba(255,215,0,.2),0 0 4px rgba(255,215,0,.1)} 50%{box-shadow:0 0 24px rgba(255,215,0,.4),0 0 8px rgba(255,215,0,.2)} }
        @keyframes masterShine { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes starSpin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes goldShine {"""
assert old_css in s, "CIBLE CSS"
s = s.replace(old_css, new_css, 1)
print('  > CSS animations')

# 2. Le badge MASTER SET dans le header du set — remplacer
old_master = """{isComplete&&<span style={{ fontSize:'8px', fontWeight:800, background:'linear-gradient(135deg,#FFD700,#FF8C00)', color:'#1D1D1F', padding:'2px 8px', borderRadius:'3px', letterSpacing:'.05em' }}>MASTER SET</span>}"""
new_master = """{isComplete&&<span style={{ fontSize:'8px', fontWeight:800, background:'linear-gradient(90deg,#C9A84C,#FFD700,#FFF1A8,#FFD700,#C9A84C)', backgroundSize:'300% 100%', animation:'masterShine 3s ease-in-out infinite', color:'#1a1200', padding:'3px 10px', borderRadius:'4px', letterSpacing:'.08em', boxShadow:'0 2px 8px rgba(255,215,0,.3)', display:'inline-flex', alignItems:'center', gap:'4px' }}><span style={{ fontSize:'10px' }}>{String.fromCharCode(9733)}</span>MASTER SET</span>}"""
assert old_master in s, "CIBLE MASTER BADGE"
s = s.replace(old_master, new_master, 1)
print('  > master badge')

# 3. Le texte "COLLECTION COMPLETE" — remplacer par version premium
old_complete_text = """{isComplete&&<div style={{ textAlign:'center', marginTop:'5px' }}><span style={{ fontSize:'8px', color:'rgba(255,215,0,.45)', letterSpacing:'.1em' }}>"""
new_complete_text = """{isComplete&&<div style={{ textAlign:'center', marginTop:'8px', animation:'masterPulse 3s ease-in-out infinite', borderRadius:'8px', padding:'4px 0' }}><span style={{ fontSize:'9px', color:'#B8860B', letterSpacing:'.15em', fontWeight:700, fontFamily:'var(--font-display)', textShadow:'0 0 12px rgba(255,215,0,.3)' }}>"""
assert old_complete_text in s, "CIBLE COMPLETE TEXT"
s = s.replace(old_complete_text, new_complete_text, 1)
print('  > complete text')

# 4. Le level badge (etoile) quand complet — doré avec glow
old_lvl = """display:'flex', alignItems:'center', justifyContent:'center', fontSize:isComplete?'12px':'9px', fontWeight:800, color:lvlColor, flexShrink:0 }}>{lvl}</div>"""
new_lvl = """display:'flex', alignItems:'center', justifyContent:'center', fontSize:isComplete?'12px':'9px', fontWeight:800, color:lvlColor, flexShrink:0, boxShadow:isComplete?'0 0 12px rgba(255,215,0,.4)':'none', animation:isComplete?'masterPulse 3s ease-in-out infinite':'none' }}>{lvl}</div>"""
assert old_lvl in s, "CIBLE LVL"
s = s.replace(old_lvl, new_lvl, 1)
print('  > lvl badge glow')

# 5. Le nom du set quand complet — gold shimmer
old_name_complete = "color:isComplete?'#B8860B':'#1D1D1F', fontFamily:'var(--font-display)', lineHeight:1.2 }}>{setName}</div>"
new_name_complete = "color:isComplete?'#B8860B':'#1D1D1F', fontFamily:'var(--font-display)', lineHeight:1.2, textShadow:isComplete?'0 0 8px rgba(255,215,0,.2)':'none' }}>{setName}</div>"
assert old_name_complete in s, "CIBLE NAME"
s = s.replace(old_name_complete, new_name_complete, 1)
print('  > name glow')

# 6. La barre de progression quand complete — gold avec shine
old_s1col = "const s1col=isComplete?'linear-gradient(90deg,#FFD700,#FF8C00)':'linear-gradient(90deg,#ff6b35,#ff4433)'"
new_s1col = "const s1col=isComplete?'linear-gradient(90deg,#C9A84C,#FFD700,#FFF1A8,#FFD700,#C9A84C)':'linear-gradient(90deg,#ff6b35,#ff4433)'"
assert old_s1col in s, "CIBLE S1COL"
s = s.replace(old_s1col, new_s1col, 1)
print('  > bar gold')

old_s2col = "const s2col=isComplete?'linear-gradient(90deg,#FF8C00,#FFD700)':'linear-gradient(90deg,#60a5fa,#3b82f6)'"
new_s2col = "const s2col=isComplete?'linear-gradient(90deg,#FFD700,#FFF1A8,#FFD700,#C9A84C,#FFD700)':'linear-gradient(90deg,#60a5fa,#3b82f6)'"
assert old_s2col in s, "CIBLE S2COL"
s = s.replace(old_s2col, new_s2col, 1)

old_s3col = "const s3col=isComplete?'linear-gradient(90deg,#FFD700,#FF8C00)':'linear-gradient(90deg,#34d399,#10b981)'"
new_s3col = "const s3col=isComplete?'linear-gradient(90deg,#C9A84C,#FFD700,#FFF1A8,#FFD700,#C9A84C)':'linear-gradient(90deg,#34d399,#10b981)'"
assert old_s3col in s, "CIBLE S3COL"
s = s.replace(old_s3col, new_s3col, 1)

old_s4col = "const s4col=isComplete?'linear-gradient(90deg,#FF8C00,#FFD700)':'linear-gradient(90deg,#34d399,#10b981)'"
new_s4col = "const s4col=isComplete?'linear-gradient(90deg,#FFD700,#FFF1A8,#FFD700,#C9A84C,#FFD700)':'linear-gradient(90deg,#34d399,#10b981)'"
assert old_s4col in s, "CIBLE S4COL"
s = s.replace(old_s4col, new_s4col, 1)
print('  > all bars gold shimmer')

f.write_text(s, 'utf-8')
print('OK')
