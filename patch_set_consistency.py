#!/usr/bin/env python3
"""Sets — presentation coherente meme sans total TCGDex"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Level badge — afficher meme sans resolvedTotal (avec le numero du set)
old_badge = """{resolvedTotal>0&&<div style={{ width:'22px', height:'22px', borderRadius:'6px', background:lvlBg, border:`1px solid ${lvlBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:isComplete?'12px':'9px', fontWeight:800, color:lvlColor, flexShrink:0 }}>{lvl}</div>}"""
new_badge = """<div style={{ width:'22px', height:'22px', borderRadius:'6px', background:lvlBg, border:`1px solid ${lvlBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:isComplete?'12px':'9px', fontWeight:800, color:lvlColor, flexShrink:0 }}>{lvl}</div>"""
assert old_badge in s, "CIBLE BADGE NON TROUVEE"
s = s.replace(old_badge, new_badge, 1)
print('  > badge toujours visible')

# 2. Quand pas de total — afficher quand meme les 4 segments (juste le premier rempli proportionnellement)
old_nototal = """                                {!resolvedTotal&&(
                                  <div style={{ display:'flex', gap:'3px', marginTop:'4px' }}>
                                    {[0,1,2,3].map(i=>(
                                      <div key={i} style={{ flex:1, height:'6px', borderRadius:'3px', background:'#E8E8ED', overflow:'hidden', position:'relative' }}>
                                        {i===0&&<div style={{ position:'absolute', inset:0, background:'rgba(255,107,53,.45)' }}><div style={{ position:'absolute', top:0, bottom:0, width:'20px', background:'linear-gradient(90deg,transparent,rgba(29,29,31,.28),transparent)', animation:'shim 2s linear infinite' }}/></div>}
                                      </div>
                                    ))}
                                  </div>
                                )}"""
new_nototal = """                                {!resolvedTotal&&(
                                  <>
                                    <div style={{ display:'flex', gap:'3px' }}>
                                      {[0,1,2,3].map(i=>(
                                        <div key={i} style={{ flex:1, height:'6px', borderRadius:'3px', background:'#E8E8ED', overflow:'hidden', position:'relative' }}>
                                          {i===0&&<div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,#ff6b35,#ff4433)' }}><div style={{ position:'absolute', top:0, bottom:0, width:'24px', background:'linear-gradient(90deg,transparent,rgba(29,29,31,.3),transparent)', animation:'shim 2s linear infinite' }}/></div>}
                                        </div>
                                      ))}
                                    </div>
                                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:'3px', padding:'0 1px' }}>
                                      {['0','25%','50%','75%','100%'].map((label,li)=>(
                                        <span key={li} style={{ fontSize:'8px', color:li===0?'#EA580C99':'rgba(29,29,31,.07)' }}>{label}</span>
                                      ))}
                                    </div>
                                  </>
                                )}"""
assert old_nototal in s, "CIBLE NOTOTAL NON TROUVEE"
s = s.replace(old_nototal, new_nototal, 1)
print('  > segments + marqueurs meme sans total')

# 3. Compteur cartes — afficher meme sans total
old_count = """{setCards.length}{resolvedTotal>0?<span style={{ color:'#86868B' }}> / {resolvedTotal}</span>:''}"""
new_count = """{setCards.length}{resolvedTotal>0?<span style={{ color:'#86868B' }}> / {resolvedTotal}</span>:<span style={{ color:'#AEAEB2' }}> cartes</span>}"""
assert old_count in s, "CIBLE COUNT NON TROUVEE"
s = s.replace(old_count, new_count, 1)
print('  > compteur toujours visible')

f.write_text(s, 'utf-8')
print('OK — presentation coherente sur tous les sets')
