#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Fermer le wrapper collapsible + ajuster separateur
old = """                          {/* S\u00e9parateur */}
                          {si<[...new Set(portfolio.map(c=>c.set))].filter(n=>n.toLowerCase().includes(setSearch.toLowerCase())).length-1&&<div style={{ height:'1px', background:'#F5F5F7', marginTop:'20px' }}/>}
                        </div>"""
new = """                          {/* S\u00e9parateur */}
                          </div>
                          {si<[...new Set(portfolio.map(c=>c.set))].filter(n=>n.toLowerCase().includes(setSearch.toLowerCase())).length-1&&<div style={{ height:'1px', background:'#F5F5F7', marginTop:collapsedSets.has(setName)?'8px':'20px' }}/>}
                        </div>"""
assert old in s, "CIBLE SEP"
s = s.replace(old, new, 1)

# CSS animation perpetuelle
old_css = "@keyframes nudgeRight { 0%,100%{transform:translateX(0)} 50%{transform:translateX(3px)} }\n        .set-header:hover .voir-pill { animation:nudgeRight .6s ease-in-out; }"
new_css = "@keyframes nudgeRight { 0%,100%{transform:translateX(0)} 50%{transform:translateX(3px)} }\n        .voir-pill { animation:nudgeRight 1.5s ease-in-out infinite; }"
assert old_css in s, "CIBLE CSS"
s = s.replace(old_css, new_css, 1)

f.write_text(s, 'utf-8')
print('OK')
