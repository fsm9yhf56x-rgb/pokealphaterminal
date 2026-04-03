#!/usr/bin/env python3
"""Master set FINAL: H2 star + badge + barre 2000 glitter + double sweep"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# ═══════════════════════════════════════════
# 1. CSS — ajouter sweep animation si manquante
# ═══════════════════════════════════════════
if '@keyframes masterSweep' not in s:
    old_css = "@keyframes goldSlow"
    new_css = """@keyframes masterSweep { 0%{left:-15%} 100%{left:115%} }
        @keyframes goldSlow"""
    assert old_css in s, "CIBLE CSS"
    s = s.replace(old_css, new_css, 1)
    print('  > CSS sweep')

# ═══════════════════════════════════════════
# 2. Ref pour le container glitter
# ═══════════════════════════════════════════
if 'masterGlitterRef' not in s:
    old_ref = "const uploadRef = useRef<HTMLInputElement|null>(null)"
    new_ref = """const masterGlitterRef = useRef<HTMLDivElement|null>(null)
  const uploadRef = useRef<HTMLInputElement|null>(null)"""
    assert old_ref in s, "CIBLE REF"
    s = s.replace(old_ref, new_ref, 1)
    print('  > ref')

# ═══════════════════════════════════════════
# 3. useEffect pour generer 2000 glitter
# ═══════════════════════════════════════════
if 'masterGlitterRef.current' not in s:
    old_effect = "  // -- Fetch sets pour modal ajouter serie --"
    new_effect = """  // -- Master set glitter generator --
  useEffect(() => {
    const el = masterGlitterRef.current
    if (!el) return
    el.innerHTML = ''
    const anims = ['gl1','gl2','gl3','gl4']
    for (let i = 0; i < 2000; i++) {
      const d = document.createElement('div')
      const sz = Math.random() > .6 ? 2 : 1
      const top = (-2 + Math.random() * 12).toFixed(0)
      const left = (Math.random() * 99).toFixed(1)
      const delay = (Math.random() * 4).toFixed(2)
      d.style.cssText = `position:absolute;top:${top}px;left:${left}%;width:${sz}px;height:${sz}px;border-radius:50%;background:#fff;animation:${anims[i%4]} 4s ${delay}s linear infinite`
      el.appendChild(d)
    }
  }, [])

  // -- Fetch sets pour modal ajouter serie --"""
    assert old_effect in s, "CIBLE EFFECT"
    s = s.replace(old_effect, new_effect, 1)
    print('  > useEffect glitter')

# ═══════════════════════════════════════════
# 4. Star badge — gradient or lumineux H2
# ═══════════════════════════════════════════
s = s.replace("const lvlBg = isComplete?'#D4AF37'", "const lvlBg = isComplete?'linear-gradient(135deg,#D4AF37,#F0E080)'")
s = s.replace("const lvlColor = isComplete?'#FFF8DC'", "const lvlColor = isComplete?'#fff'")
s = s.replace("const lvlBorder = isComplete?'#C9A84C'", "const lvlBorder = isComplete?'#E8D48B'")
# Text shadow on star
old_star_style = "fontWeight:800, color:lvlColor, flexShrink:0, boxShadow:'none', animation:isComplete?'starBreath 4s ease-in-out infinite':'none'"
new_star_style = "fontWeight:800, color:lvlColor, flexShrink:0, textShadow:isComplete?'0 1px 2px rgba(100,80,20,.4)':'none', boxShadow:'none', animation:isComplete?'starBreath 4s ease-in-out infinite':'none'"
if old_star_style in s:
    s = s.replace(old_star_style, new_star_style, 1)
print('  > star H2')

# ═══════════════════════════════════════════
# 5. MASTER SET badge — gold shimmer H2
# ═══════════════════════════════════════════
old_badge = "fontSize:'8px', fontWeight:800, background:'linear-gradient(90deg,#D4B85C,#F0E080,#FFFAD0,#F0E080,#D4B85C)', backgroundSize:'300% 100%', animation:'goldSlow 8s linear infinite', color:'#6B5A1E', padding:'3px 10px', borderRadius:'4px', letterSpacing:'.1em', border:'1px solid rgba(240,224,128,.5)', display:'inline-flex', alignItems:'center', gap:'4px'"
new_badge = "fontSize:'7px', fontWeight:700, background:'linear-gradient(90deg,#D4AF37,#F0E080,#D4AF37)', backgroundSize:'200% 100%', animation:'goldSlow 6s linear infinite', color:'#5C4A12', padding:'2px 8px', borderRadius:'3px', letterSpacing:'.12em', border:'1px solid rgba(212,175,55,.3)', display:'inline-flex', alignItems:'center', gap:'4px'"
if old_badge in s:
    s = s.replace(old_badge, new_badge, 1)
    print('  > badge H2')

# ═══════════════════════════════════════════
# 6. Remplacer la barre complete par sweep + glitter ref
# ═══════════════════════════════════════════
# Trouver le bloc isComplete de la barre
idx_start = s.find("{isComplete?(")
if idx_start > 0:
    # Trouver le ):(  qui ferme le isComplete branch
    # On cherche la div de fermeture avant le ):( 
    idx_else = s.find("):(", idx_start)
    # Reculer pour trouver </div> avant ):(
    # Le bloc complet est entre {isComplete?( et ):(
    old_complete_bar = s[idx_start:idx_else+3]
    
    new_complete_bar = """{isComplete?(
                                      <div style={{ height:'8px', borderRadius:'4px', background:'#F0EBD8', overflow:'visible', position:'relative' }}>
                                        <div style={{ width:'100%', height:'100%', borderRadius:'4px', background:'linear-gradient(90deg,#C9A84C,#D4AF37,#E8D48B,#D4AF37,#C9A84C)', overflow:'hidden' }}>
                                          <div style={{ position:'absolute', top:0, width:'80px', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,250,.7),transparent)', animation:'masterSweep 3s ease-in-out infinite', borderRadius:'4px' }}/>
                                          <div style={{ position:'absolute', top:0, width:'50px', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,250,.45),transparent)', animation:'masterSweep 3s 1.5s ease-in-out infinite', borderRadius:'4px' }}/>
                                        </div>
                                        <div ref={masterGlitterRef} style={{ position:'absolute', inset:'-2px 0', pointerEvents:'none' }}/>
                                      </div>
                                    ):("""
    s = s[:idx_start] + new_complete_bar + s[idx_else+3:]
    print('  > barre sweep + glitter ref')

# ═══════════════════════════════════════════
# 7. Masquer markers quand complete
# ═══════════════════════════════════════════
old_mk = "{(['0','25%','50%','75%','100%'] as string[]).map((label,li)=>("
new_mk = "{!isComplete&&(['0','25%','50%','75%','100%'] as string[]).map((label,li)=>("
if old_mk in s:
    s = s.replace(old_mk, new_mk, 1)
    print('  > hide markers')

# ═══════════════════════════════════════════
# 8. Nom du set — or brun
# ═══════════════════════════════════════════
s = s.replace("color:isComplete?'#8B7320':'#1D1D1F'", "color:isComplete?'#1D1D1F':'#1D1D1F'")
print('  > name color')

f.write_text(s, 'utf-8')
print('OK')
