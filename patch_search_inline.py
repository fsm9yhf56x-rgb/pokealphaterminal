#!/usr/bin/env python3
"""Search bar reduite + filtres inline a droite"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Remplacer le fragment <> avec search + filtres en 2 divs
# par un seul div flex row
old = """{true&&(<>
                      <div style={{ position:'relative', marginBottom:'18px' }}>
                        <input
                          type="text"
                          placeholder="Rechercher un set..." onFocus={e=>{e.currentTarget.style.borderColor='#E03020';e.currentTarget.style.boxShadow='0 0 0 3px rgba(224,48,32,.08)'}} onBlur={e=>{e.currentTarget.style.borderColor='#E5E5EA';e.currentTarget.style.boxShadow=''}}
                          value={setSearch}
                          onChange={e=>setSetSearch(e.target.value)}
                          style={{ width:'100%', padding:'9px 14px 9px 36px', borderRadius:'10px', background:'#fff', border:'1.5px solid #D1CEC9', color:'#48484A', fontSize:'12px', fontFamily:'var(--font-display)', outline:'none', boxSizing:'border-box' as const }}
                        />
                        <div style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'13px', color:'#48484A', pointerEvents:'none' }}>🔍</div>
                        {setSearch&&<button onClick={()=>setSetSearch('')} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#48484A', cursor:'pointer', fontSize:'14px', padding:0, lineHeight:1 }}>×</button>}
                      </div>
                      <div style={{ display:'flex', gap:'4px', marginTop:'8px', flexWrap:'wrap' }}>
                        {([{k:'all' as const,l:'Toutes'},{k:'graded' as const,l:'Gradees'},{k:'raw' as const,l:'Raw'},{k:'rare' as const,l:'Rares'}] as const).map(fi=>(
                          <button key={fi.k} onClick={()=>{setBinderFilter(fi.k);setBinderPage(0)}}
                            style={{ padding:'4px 12px',borderRadius:'99px',border:`1px solid ${binderFilter===fi.k?'#1D1D1F':'#E5E5EA'}`,background:binderFilter===fi.k?'#1D1D1F':'transparent',color:binderFilter===fi.k?'#fff':'#86868B',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}>
                            {fi.l}
                          </button>
                        ))}
                        <div style={{ width:'1px',background:'#E5E5EA',margin:'0 4px' }}/>
                        {([{k:'number' as const,l:'N°'},{k:'name' as const,l:'A→Z'},{k:'price' as const,l:'Prix'}] as const).map(so=>(
                          <button key={so.k} onClick={()=>setBinderSort(so.k)}
                            style={{ padding:'4px 10px',borderRadius:'99px',border:`1px solid ${binderSort===so.k?'#E03020':'#E5E5EA'}`,background:binderSort===so.k?'#FFF1EE':'transparent',color:binderSort===so.k?'#E03020':'#86868B',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}>
                            {so.l}
                          </button>
                        ))}
                      </div>
                    </>)}"""

new = """{true&&(
                      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                        <div style={{ position:'relative', width:'220px', flexShrink:0 }}>
                          <input
                            type="text"
                            placeholder="Rechercher un set..." onFocus={e=>{e.currentTarget.style.borderColor='#E03020';e.currentTarget.style.boxShadow='0 0 0 3px rgba(224,48,32,.08)'}} onBlur={e=>{e.currentTarget.style.borderColor='#E5E5EA';e.currentTarget.style.boxShadow=''}}
                            value={setSearch}
                            onChange={e=>setSetSearch(e.target.value)}
                            style={{ width:'100%', padding:'7px 12px 7px 32px', borderRadius:'10px', background:'#fff', border:'1.5px solid #D1CEC9', color:'#48484A', fontSize:'11px', fontFamily:'var(--font-display)', outline:'none', boxSizing:'border-box' as const }}
                          />
                          <div style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'12px', color:'#AEAEB2', pointerEvents:'none' }}>🔍</div>
                          {setSearch&&<button onClick={()=>setSetSearch('')} style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#48484A', cursor:'pointer', fontSize:'13px', padding:0, lineHeight:1 }}>×</button>}
                        </div>
                        <div style={{ display:'flex', gap:'4px', alignItems:'center', flexWrap:'wrap' }}>
                          {([{k:'all' as const,l:'Toutes'},{k:'graded' as const,l:'Gradees'},{k:'raw' as const,l:'Raw'},{k:'rare' as const,l:'Rares'}] as const).map(fi=>(
                            <button key={fi.k} onClick={()=>{setBinderFilter(fi.k);setBinderPage(0)}}
                              style={{ padding:'5px 12px',borderRadius:'99px',border:`1px solid ${binderFilter===fi.k?'#1D1D1F':'#E5E5EA'}`,background:binderFilter===fi.k?'#1D1D1F':'transparent',color:binderFilter===fi.k?'#fff':'#86868B',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}>
                              {fi.l}
                            </button>
                          ))}
                          <div style={{ width:'1px',height:'16px',background:'#E5E5EA',margin:'0 2px' }}/>
                          {([{k:'number' as const,l:'N°'},{k:'name' as const,l:'A→Z'},{k:'price' as const,l:'Prix'}] as const).map(so=>(
                            <button key={so.k} onClick={()=>setBinderSort(so.k)}
                              style={{ padding:'5px 10px',borderRadius:'99px',border:`1px solid ${binderSort===so.k?'#E03020':'#E5E5EA'}`,background:binderSort===so.k?'#FFF1EE':'transparent',color:binderSort===so.k?'#E03020':'#86868B',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}>
                              {so.l}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}"""

assert old in s, "CIBLE SEARCH+FILTERS"
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK — search 220px + filtres inline a droite')
