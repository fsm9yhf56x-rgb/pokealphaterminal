#!/usr/bin/env python3
"""Sets collapsibles + rename voir le set + animation perpetuelle"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. State pour les sets collapsed
old_setsearch = "const [setSearch,   setSetSearch]   = useState('')"
new_setsearch = """const [setSearch,   setSetSearch]   = useState('')
  const [collapsedSets, setCollapsedSets] = useState<Set<string>>(new Set())"""
assert old_setsearch in s, "CIBLE SETSEARCH"
s = s.replace(old_setsearch, new_setsearch, 1)
print('  > collapsedSets state')

# 2. Toggle collapse sur le header du set (click sur le header)
# Le header fait actuellement: onClick={()=>{ setBinderSet(setName); setBinderPage(0) }}
# On change: click simple = toggle collapse, "Voir le set complet" = ouvre le set
old_header_click = """className='set-header' style={{ marginBottom:'12px', cursor:'pointer' }} onClick={()=>{ setBinderSet(setName); setBinderPage(0) }}>"""
new_header_click = """className='set-header' style={{ marginBottom:'12px', cursor:'pointer' }} onClick={()=>{ setCollapsedSets(prev=>{ const n=new Set(prev); n.has(setName)?n.delete(setName):n.add(setName); return n }) }}>"""
assert old_header_click in s, "CIBLE HEADER CLICK"
s = s.replace(old_header_click, new_header_click, 1)
print('  > toggle collapse')

# 3. "Voir le set" → "Voir le set complet" + onClick ouvre le set (stopPropagation)
old_pill = """<span className="voir-pill" style={{ fontSize:'11px', color:'#E03020', fontWeight:500, fontFamily:'var(--font-display)', padding:'3px 10px', borderRadius:'99px', background:'#FFF1EE', border:'1px solid rgba(224,48,32,.15)', transition:'all .2s', whiteSpace:'nowrap' }}>Voir le set \u203a</span>"""
new_pill = """<span className="voir-pill" onClick={e=>{e.stopPropagation();setBinderSet(setName);setBinderPage(0)}} style={{ fontSize:'11px', color:'#E03020', fontWeight:500, fontFamily:'var(--font-display)', padding:'3px 10px', borderRadius:'99px', background:'#FFF1EE', border:'1px solid rgba(224,48,32,.15)', transition:'all .2s', whiteSpace:'nowrap', cursor:'pointer' }}>Voir le set complet \u203a</span>"""
assert old_pill in s, "CIBLE PILL"
s = s.replace(old_pill, new_pill, 1)
print('  > voir le set complet + click')

# 4. Chevron collapse indicator dans le header
old_count_chevron = """<span style={{ fontSize:'10px', color:'#48484A', fontFamily:'var(--font-display)' }}>{setCards.length}{resolvedTotal>0?<span style={{ color:'#86868B' }}> / {resolvedTotal}</span>:<span style={{ color:'#AEAEB2' }}> cartes</span>}</span>"""
new_count_chevron = """<span style={{ fontSize:'10px', color:'#48484A', fontFamily:'var(--font-display)' }}>{setCards.length}{resolvedTotal>0?<span style={{ color:'#86868B' }}> / {resolvedTotal}</span>:<span style={{ color:'#AEAEB2' }}> cartes</span>}</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="2.5" strokeLinecap="round" style={{ transition:'transform .25s', transform:collapsedSets.has(setName)?'rotate(-90deg)':'rotate(0deg)' }}><path d="M6 9l6 6 6-6"/></svg>"""
assert old_count_chevron in s, "CIBLE COUNT CHEVRON"
s = s.replace(old_count_chevron, new_count_chevron, 1)
print('  > chevron indicator')

# 5. Wrapper les cartes + minimap dans un div collapsible
old_shelf_row = """                          {/* Rayon de cartes */}
                          <div className="shelf-row" ref={el=>{scrollRefs.current[setName]=el}}"""
new_shelf_row = """                          {/* Rayon de cartes */}
                          <div style={{ maxHeight:collapsedSets.has(setName)?'0px':'2000px', overflow:'hidden', transition:'max-height .35s cubic-bezier(.4,0,.2,1)', opacity:collapsedSets.has(setName)?0:1 }}>
                          <div className="shelf-row" ref={el=>{scrollRefs.current[setName]=el}}"""
assert old_shelf_row in s, "CIBLE SHELF ROW"
s = s.replace(old_shelf_row, new_shelf_row, 1)
print('  > shelf row collapsible open')

# Fermer le wrapper div apres le separateur
old_sep = """                          {/* Separateur */}
                          {si<[...new Set(portfolio.map(c=>c.set))].filter(n=>n.toLowerCase().includes(setSearch.toLowerCase())).length-1&&<div style={{ height:'1px', background:'#F5F5F7', marginTop:'20px' }}/>}
                        </div>"""
new_sep = """                          {/* Separateur */}
                          </div>
                          {si<[...new Set(portfolio.map(c=>c.set))].filter(n=>n.toLowerCase().includes(setSearch.toLowerCase())).length-1&&<div style={{ height:'1px', background:'#F5F5F7', marginTop:collapsedSets.has(setName)?'8px':'20px' }}/>}
                        </div>"""
assert old_sep in s, "CIBLE SEP"
s = s.replace(old_sep, new_sep, 1)
print('  > wrapper close')

# 6. CSS — animation perpetuelle + plus douce
old_css = "@keyframes nudgeRight { 0%,100%{transform:translateX(0)} 50%{transform:translateX(3px)} }\n        .set-header:hover .voir-pill { animation:nudgeRight .6s ease-in-out; }"
new_css = "@keyframes nudgeRight { 0%,100%{transform:translateX(0)} 50%{transform:translateX(3px)} }\n        .voir-pill { animation:nudgeRight 1.5s ease-in-out infinite; }"
assert old_css in s, "CIBLE CSS"
s = s.replace(old_css, new_css, 1)
print('  > animation perpetuelle')

f.write_text(s, 'utf-8')
print('OK')
