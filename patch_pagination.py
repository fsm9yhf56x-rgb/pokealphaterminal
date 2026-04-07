#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

old = """                {binderPages>1&&(
                  <div style={{ display:'flex', justifyContent:'center', gap:'6px', marginTop:'16px' }}>
                    {Array.from({length:binderPages}).map((_,i)=>(
                      <div key={i} onClick={()=>setBinderPage(i)} style={{ height:'4px', borderRadius:'2px', background:i===binderPage?'rgba(29,29,31,.45)':'rgba(29,29,31,.11)', cursor:'pointer', transition:'all .2s', width:i===binderPage?'18px':'6px' }}/>"""

new = """                {binderPages>1&&(
                  <div style={{ display:'flex', justifyContent:'center', gap:'6px', marginTop:'16px' }}>
                    {Array.from({length:binderPages}).map((_,i)=>(
                      <div key={i} onClick={()=>setBinderPage(i)} style={{ width:'28px', height:'28px', borderRadius:'8px', background:i===binderPage?'#1D1D1F':'transparent', color:i===binderPage?'#fff':'#86868B', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:i===binderPage?600:500, cursor:'pointer', transition:'all .15s', fontFamily:'var(--font-data)' }}>{i+1}</div>"""

assert old in s, "CIBLE"
s = s.replace(old, new, 1)
print('OK')

f.write_text(s, 'utf-8')
