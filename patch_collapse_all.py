#!/usr/bin/env python3
"""Fix: enlever </div> orphelin + tout le collapse en un patch"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 0. Nettoyer le </div> orphelin ajoute par patch_collapse_fix
old_orphan = """                          {/* S\u00e9parateur */}
                          </div>
                          {si<[...new Set(portfolio.map(c=>c.set))].filter(n=>n.toLowerCase().includes(setSearch.toLowerCase())).length-1&&<div style={{ height:'1px', background:'#F5F5F7', marginTop:collapsedSets.has(setName)?'8px':'20px' }}/>}"""
new_clean = """                          {/* S\u00e9parateur */}
                          {si<[...new Set(portfolio.map(c=>c.set))].filter(n=>n.toLowerCase().includes(setSearch.toLowerCase())).length-1&&<div style={{ height:'1px', background:'#F5F5F7', marginTop:'20px' }}/>}"""
if old_orphan in s:
    s = s.replace(old_orphan, new_clean, 1)
    print('  > orphelin nettoye')

# Aussi restaurer le CSS si deja modifie
old_css_broken = ".voir-pill { animation:nudgeRight 1.5s ease-in-out infinite; }"
if old_css_broken in s:
    s = s.replace(old_css_broken, ".set-header:hover .voir-pill { animation:nudgeRight .6s ease-in-out; }")
    print('  > CSS restaure temporairement')

# ═══════════════════════════════════════════════════════════
# 1. State collapsedSets
# ═══════════════════════════════════════════════════════════
old_state = "const [setSearch,   setSetSearch]   = useState('')"
if "collapsedSets" not in s:
    new_state = """const [setSearch,   setSetSearch]   = useState('')
  const [collapsedSets, setCollapsedSets] = useState<Set<string>>(new Set())"""
    assert old_state in s, "CIBLE STATE"
    s = s.replace(old_state, new_state, 1)
    print('  > state')
else:
    print('  > state deja present')

# ═══════════════════════════════════════════════════════════
# 2. Header click = toggle collapse
# ═══════════════════════════════════════════════════════════
old_click = "className='set-header' style={{ marginBottom:'12px', cursor:'pointer' }} onClick={()=>{ setBinderSet(setName); setBinderPage(0) }}>"
new_click = "className='set-header' style={{ marginBottom:'12px', cursor:'pointer' }} onClick={()=>{ setCollapsedSets(prev=>{ const n=new Set(prev); n.has(setName)?n.delete(setName):n.add(setName); return n }) }}>"
if old_click in s:
    s = s.replace(old_click, new_click, 1)
    print('  > toggle click')
else:
    print('  > toggle click deja present')

# ═══════════════════════════════════════════════════════════
# 3. Voir le set complet + stopPropagation
# ═══════════════════════════════════════════════════════════
old_pill = """<span className="voir-pill" style={{ fontSize:'11px', color:'#E03020', fontWeight:500, fontFamily:'var(--font-display)', padding:'3px 10px', borderRadius:'99px', background:'#FFF1EE', border:'1px solid rgba(224,48,32,.15)', transition:'all .2s', whiteSpace:'nowrap' }}>Voir le set \u203a</span>"""
new_pill = """<span className="voir-pill" onClick={e=>{e.stopPropagation();setBinderSet(setName);setBinderPage(0)}} style={{ fontSize:'11px', color:'#E03020', fontWeight:500, fontFamily:'var(--font-display)', padding:'3px 10px', borderRadius:'99px', background:'#FFF1EE', border:'1px solid rgba(224,48,32,.15)', transition:'all .2s', whiteSpace:'nowrap', cursor:'pointer' }}>Voir le set complet \u203a</span>"""
if old_pill in s:
    s = s.replace(old_pill, new_pill, 1)
    print('  > pill rename')
else:
    print('  > pill deja renomme')

# ═══════════════════════════════════════════════════════════
# 4. Chevron collapse indicator
# ═══════════════════════════════════════════════════════════
old_chevron_area = """<span style={{ fontSize:'10px', color:'#48484A', fontFamily:'var(--font-display)' }}>{setCards.length}{resolvedTotal>0?<span style={{ color:'#86868B' }}> / {resolvedTotal}</span>:<span style={{ color:'#AEAEB2' }}> cartes</span>}</span>"""
if 'rotate(-90deg)' not in s:
    new_chevron_area = """<span style={{ fontSize:'10px', color:'#48484A', fontFamily:'var(--font-display)' }}>{setCards.length}{resolvedTotal>0?<span style={{ color:'#86868B' }}> / {resolvedTotal}</span>:<span style={{ color:'#AEAEB2' }}> cartes</span>}</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="2.5" strokeLinecap="round" style={{ transition:'transform .25s', transform:collapsedSets.has(setName)?'rotate(-90deg)':'rotate(0deg)' }}><path d="M6 9l6 6 6-6"/></svg>"""
    assert old_chevron_area in s, "CIBLE CHEVRON"
    s = s.replace(old_chevron_area, new_chevron_area, 1)
    print('  > chevron')
else:
    print('  > chevron deja present')

# ═══════════════════════════════════════════════════════════
# 5. Wrapper collapsible autour des cartes + minimap
# ═══════════════════════════════════════════════════════════
old_rayon = """                          {/* Rayon de cartes */}
                          <div className="shelf-row" ref={el=>{scrollRefs.current[setName]=el}}"""
new_rayon = """                          {/* Rayon de cartes */}
                          <div style={{ maxHeight:collapsedSets.has(setName)?'0px':'3000px', overflow:'hidden', transition:'max-height .35s cubic-bezier(.4,0,.2,1), opacity .25s', opacity:collapsedSets.has(setName)?0:1 }}>
                          <div className="shelf-row" ref={el=>{scrollRefs.current[setName]=el}}"""
if 'maxHeight:collapsedSets' not in s:
    assert old_rayon in s, "CIBLE RAYON"
    s = s.replace(old_rayon, new_rayon, 1)
    print('  > wrapper open')
else:
    print('  > wrapper deja present')

# Fermer le wrapper: </div> avant le separateur
old_sep = """                          {/* S\u00e9parateur */}
                          {si<[...new Set(portfolio.map(c=>c.set))].filter(n=>n.toLowerCase().includes(setSearch.toLowerCase())).length-1&&<div style={{ height:'1px', background:'#F5F5F7', marginTop:'20px' }}/>}"""
new_sep = """                          </div>
                          {/* S\u00e9parateur */}
                          {si<[...new Set(portfolio.map(c=>c.set))].filter(n=>n.toLowerCase().includes(setSearch.toLowerCase())).length-1&&<div style={{ height:'1px', background:'#F5F5F7', marginTop:collapsedSets.has(setName)?'8px':'20px' }}/>}"""
assert old_sep in s, "CIBLE SEP"
s = s.replace(old_sep, new_sep, 1)
print('  > wrapper close')

# ═══════════════════════════════════════════════════════════
# 6. CSS animation perpetuelle
# ═══════════════════════════════════════════════════════════
old_css = ".set-header:hover .voir-pill { animation:nudgeRight .6s ease-in-out; }"
new_css = ".voir-pill { animation:nudgeRight 1.5s ease-in-out infinite; }"
assert old_css in s, "CIBLE CSS"
s = s.replace(old_css, new_css, 1)
print('  > animation perpetuelle')

f.write_text(s, 'utf-8')
print('OK -- collapse complet')
