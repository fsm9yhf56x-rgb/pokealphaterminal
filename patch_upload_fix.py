#!/usr/bin/env python3
"""Fix upload — trouve le vrai fallback spotlight + binder"""
from pathlib import Path
import re

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 4. Spotlight — trouver le fallback no-image par contexte
# Chercher le bloc entre "spotCard.image ?" et le closing du ternary
# Le fallback est dans le spotlight section, entre ") : (" et the closing
spot_marker = "maxHeight:'280px'"
idx = s.find(spot_marker)
assert idx > 0, "spotlight section non trouvee"

# Trouver ") : (" apres l'img tag dans le spotlight
close_img = s.find(") : (", idx)
assert close_img > 0, "ternaire image non trouve"

# Trouver le closing ")}" du ternaire
# Le fallback starts after ") : (\n" and ends before "\n                      )}"
fallback_start = close_img + 5  # after ") : ("
# Find the matching close — look for the next `)}`  that closes the ternary
depth = 1
i = fallback_start
while i < len(s) and depth > 0:
    if s[i:i+2] == '<>' or s[i:i+4] == '<div':
        pass  # JSX, not counting
    i += 1
# Simpler: just find the pattern we need to replace
# Search for the fragment/wrapper between ") : (" and the next ")}"
chunk = s[fallback_start:fallback_start+600]
# Find the end: look for the line with ")}" that closes this ternary
end_marker = "\n                      )}"
end_idx = chunk.find(end_marker)
assert end_idx > 0, "fin fallback non trouvee"

old_fallback = chunk[:end_idx]
new_fallback = """
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', zIndex:1 }}>
                          <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:'#F0F0F5', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          </div>
                          <label style={{ padding:'6px 14px', borderRadius:'8px', background:'#1D1D1F', color:'#fff', fontSize:'10px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                            Ajouter une photo
                            <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{ const fi=e.target.files?.[0]; if(fi&&spotCard) handleImageUpload(spotCard.id, fi) }}/>
                          </label>
                        </div>"""

s = s[:fallback_start] + new_fallback + s[fallback_start+end_idx:]
print('  > spotlight upload button')

# 5. Binder grid — camera sur cartes sans image
# Chercher le fallback no-image dans le binder (contient "radial-gradient" et "blur")
binder_noimg = "background:`linear-gradient(145deg,${ec}15,${ec}06)`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative'"
idx_b = s.find(binder_noimg)
if idx_b > 0:
    # Trouver le div complet qui contient ce fallback
    # Start: chercher le "<div" avant
    div_start = s.rfind("<div", 0, idx_b)
    # End: trouver le </div> correspondant
    div_end = s.find("</div>", idx_b) + len("</div>")
    
    old_binder = s[div_start:div_end]
    new_binder = """<div style={{ width:'100%', aspectRatio:'63/88', background:'#F5F5F7', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                                <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor:'pointer', zIndex:1 }} onClick={e=>e.stopPropagation()}>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                  <span style={{ fontSize:'8px', color:'#AEAEB2', fontFamily:'var(--font-display)' }}>Photo</span>
                                  <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{ const fi=e.target.files?.[0]; if(fi) handleImageUpload(card.id, fi) }}/>
                                </label>
                              </div>"""
    s = s[:div_start] + new_binder + s[div_end:]
    print('  > binder camera icon')
else:
    print('  ! binder noimg non trouve (peut-etre deja patche)')

f.write_text(s, 'utf-8')
print('OK — upload illustration')
