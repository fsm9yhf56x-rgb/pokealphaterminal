#!/usr/bin/env python3
"""Spotlight modal redesign — layout horizontal, carte pleine hauteur, badge grade metallique"""
from pathlib import Path

EA = '\u00e9'
EG = '\u00e8'

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Remplacer le layout grid par flex horizontal
old_grid = """                <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:'24px', alignItems:'start' }}>
                  <div className="gem" style={{ background:'#F5F5F7', border:'1px solid #E5E5EA', borderRadius:'14px', boxShadow:'0 4px 20px rgba(0,0,0,.06)' }} onMouseMove={tiltCard} onMouseLeave={resetCard}>"""

new_grid = """                <div style={{ display:'flex', overflow:'hidden', margin:'-28px', borderRadius:'20px' }}>
                  <div style={{ flexShrink:0, width:'250px', background:'#F5F5F7', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
                  <div className="gem" style={{ background:'transparent', borderRadius:'14px', width:'100%' }} onMouseMove={tiltCard} onMouseLeave={resetCard}>"""

assert old_grid in s, "CIBLE GRID"
s = s.replace(old_grid, new_grid, 1)
print('  > layout flex')

# Remplacer le bloc info sous l'image dans la carte
old_card_info = """                    <div style={{ padding:'14px' }}>
                      <div style={{ fontSize:'16px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)', marginBottom:'3px' }}>{spotCard.name}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
                        <span style={{ fontSize:'11px', color:'#86868B' }}>{spotCard.set} {String.fromCharCode(183)} {spotCard.year}</span>
                        {spotCard.graded&&(()=>{
                          const gn=parseFloat(spotCard.condition.replace(/[^0-9.]/g,''))
                          const bg=gn>=10?'linear-gradient(90deg,#C9A84C,#FFD700,#FFF1A8,#FFD700,#C9A84C)':gn>=9?'linear-gradient(135deg,#A8A8A8,#E8E8E8,#A8A8A8)':gn>=5?'linear-gradient(135deg,#A0724A,#C4956A,#A0724A)':'#6E6E73'
                          const fg=gn>=10?'#1a1200':gn>=9?'#222':gn>=5?'#2a1800':'#fff'
                          const sh=gn>=10?'0 2px 8px rgba(201,168,76,.4)':gn>=9?'0 2px 6px rgba(0,0,0,.08)':'none'
                          return <span style={{ fontSize:'10px', fontWeight:800, background:bg, color:fg, padding:'3px 8px', borderRadius:'5px', fontFamily:'var(--font-data)', boxShadow:sh, letterSpacing:'.03em', backgroundSize:gn>=10?'300% 100%':'auto', animation:gn>=10?'goldShine 3s ease-in-out infinite':'none' }}>{spotCard.condition}</span>
                        })()}
                      </div>
                    </div>
                  </div>"""

new_card_info = """                  </div>
                  </div>"""

# Check exact match - the dot might be different
idx_padding14 = s.find("padding:'14px' }}>")
if idx_padding14 > 0 and idx_padding14 < s.find("EUR {spotCard.curPrice"):
    # Find from padding:'14px' to the closing </div>\n                  </div>
    end_marker = "                  </div>\n                  <div>"
    block_start = s.rfind("\n", 0, idx_padding14)
    # Find the two closing divs
    close1 = s.find("</div>\n                  </div>", idx_padding14)
    old_card_info = s[block_start+1:close1+len("</div>\n                  </div>")]
    s = s.replace(old_card_info, "                  </div>\n                  </div>", 1)
    print('  > removed card info under image')
else:
    print('  > card info: manual search')

# Remplacer le panel droit
old_right = """                  <div>
                    <div style={{ fontSize:'36px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-1.5px', lineHeight:1, marginBottom:'8px' }}>EUR {spotCard.curPrice.toLocaleString('fr-FR')}</div>"""

new_right = """                  <div style={{ flex:1, minWidth:0, padding:'28px 28px 24px' }}>
                    <div style={{ paddingRight:'28px', marginBottom:'14px' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'10px' }}>
                        <div style={{ fontSize:'20px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', lineHeight:1.2 }}>{spotCard.name}</div>
                        {spotCard.graded&&(()=>{
                          const gn=parseFloat(spotCard.condition.replace(/[^0-9.]/g,''))
                          const bg=gn>=10?'linear-gradient(145deg,#8B7320,#B8942F,#D4AF37,#F5ECA0,#FFFAD0,#F5ECA0,#D4AF37,#B8942F,#8B7320)':gn>=9?'linear-gradient(145deg,#707070,#A8A8A8,#D8D8D8,#F0F0F0,#D8D8D8,#A8A8A8,#707070)':gn>=5?'linear-gradient(145deg,#6B4226,#A0724A,#C4956A,#E0BFA0,#C4956A,#A0724A,#6B4226)':'#6E6E73'
                          const fg=gn>=10?'#5C4A12':gn>=9?'#222':gn>=5?'#2a1800':'#fff'
                          const sh=gn>=10?'0 1px 3px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,240,.4)':gn>=9?'0 1px 3px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.4)':gn>=5?'0 1px 3px rgba(0,0,0,.12),inset 0 1px 0 rgba(224,191,160,.3)':'none'
                          return <div style={{ flexShrink:0, background:bg, color:fg, fontSize:'10px', fontWeight:800, padding:'4px 10px', borderRadius:'6px', fontFamily:'var(--font-data)', boxShadow:sh, letterSpacing:'.03em', overflow:'visible', position:'relative', border:gn>=10?'1px solid rgba(212,175,55,.4)':gn>=9?'1px solid rgba(168,168,168,.4)':gn>=5?'1px solid rgba(160,114,74,.3)':'none', backgroundSize:gn>=5?'300% 300%':'auto', animation:gn>=5?'metalShift 8s ease-in-out infinite':'none' }}>
                            {gn>=5&&<div style={{ position:'absolute', inset:0, borderRadius:'6px', background:gn>=10?'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)':gn>=9?'linear-gradient(145deg,transparent 30%,rgba(255,255,255,.3) 45%,transparent 60%)':'linear-gradient(145deg,transparent 30%,rgba(224,191,160,.25) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/>}
                            {gn>=10&&<div className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/>}
                            <span style={{ position:'relative', zIndex:1 }}>{spotCard.condition}</span>
                          </div>
                        })()}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'4px' }}>
                        <span style={{ fontSize:'12px', color:'#86868B' }}>{spotCard.set}</span>
                        <span style={{ fontSize:'12px', color:'#C7C7CC' }}>{String.fromCharCode(183)}</span>
                        <span style={{ fontSize:'12px', color:'#86868B' }}>#{spotCard.number||'???'}</span>
                        {spotCard.rarity&&<><span style={{ fontSize:'12px', color:'#C7C7CC' }}>{String.fromCharCode(183)}</span><span style={{ fontSize:'12px', color:'#86868B' }}>{spotCard.rarity}</span></>}
                        <span style={{ fontSize:'12px', color:'#C7C7CC' }}>{String.fromCharCode(183)}</span>
                        <span style={{ fontSize:'14px' }}>{spotCard.lang==='EN'?'\\u{1F1FA}\\u{1F1F8}':spotCard.lang==='FR'?'\\u{1F1EB}\\u{1F1F7}':'\\u{1F1EF}\\u{1F1F5}'}</span>
                      </div>
                    </div>
                    <div style={{ fontSize:'32px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-1.5px', lineHeight:1, marginBottom:'16px' }}>EUR {spotCard.curPrice.toLocaleString('fr-FR')}</div>"""

assert old_right in s, "CIBLE RIGHT"
s = s.replace(old_right, new_right, 1)
print('  > right panel redesign')

# Remplacer la grille 3x2 par 2x2
old_stats = """                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'14px' }}>
                      {[
                        {l:'Achat',v:'EUR '+spotCard.buyPrice.toLocaleString('fr-FR'),c:'#48484A'},
                        {l:'Marche',v:'EUR '+spotCard.curPrice.toLocaleString('fr-FR'),c:'#1D1D1F'},
                        {l:'ROI',v:spotCard.buyPrice>0?'+'+roi+'%':'---',c:'#2E9E6A'},
                        {l:'Langue',v:spotCard.lang,c:'#48484A'},
                        {l:'PSA Pop',v:spotCard.psa?spotCard.psa.toLocaleString():'---',c:'#48484A'},
                        {l:'Gain',v:spotCard.buyPrice>0?'+EUR '+Math.abs(gain).toLocaleString('fr-FR'):'---',c:'#2E9E6A'},
                      ].map(s=>(
                        <div key={s.l} style={{ background:'#F5F5F7', border:'1px solid #E5E5EA', borderRadius:'9px', padding:'10px 12px' }}>
                          <div style={{ fontSize:'10px', color:'#48484A', textTransform:'uppercase' as const, letterSpacing:'.08em', fontFamily:'var(--font-display)', marginBottom:'4px' }}>{s.l}</div>
                          <div style={{ fontSize:'15px', fontWeight:600, color:s.c, fontFamily:'var(--font-display)' }}>{s.v}</div>
                        </div>
                      ))}
                    </div>"""

new_stats = """                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'14px' }}>
                      {[
                        {l:'Achat',v:'EUR '+spotCard.buyPrice.toLocaleString('fr-FR'),c:'#1D1D1F'},
                        {l:'March""" + EA + """',v:'EUR '+spotCard.curPrice.toLocaleString('fr-FR'),c:'#1D1D1F'},
                        {l:'ROI',v:spotCard.buyPrice>0?'+'+roi+'%':'---',c:roi>0?'#2E9E6A':roi<0?'#E03020':'#86868B'},
                        {l:'PSA Pop',v:spotCard.psa?spotCard.psa.toLocaleString():'---',c:'#48484A'},
                      ].map(st=>(
                        <div key={st.l} style={{ background:'#F5F5F7', borderRadius:'10px', padding:'10px 12px' }}>
                          <div style={{ fontSize:'9px', color:'#AEAEB2', textTransform:'uppercase' as const, letterSpacing:'.08em', fontFamily:'var(--font-display)', fontWeight:500 }}>{st.l}</div>
                          <div style={{ fontSize:'14px', fontWeight:600, color:st.c, fontFamily:'var(--font-display)', marginTop:'2px' }}>{st.v}</div>
                        </div>
                      ))}
                    </div>"""

assert old_stats in s, "CIBLE STATS"
s = s.replace(old_stats, new_stats, 1)
print('  > stats 2x2')

# Simplifier le bloc quantite
old_qty = """                    <div style={{ background:'#F5F5F7', border:'1px solid #E5E5EA', borderRadius:'10px', padding:'12px 14px', marginBottom:'12px' }}>
                      <div style={{ fontSize:'10px', color:'#48484A', textTransform:'uppercase' as const, letterSpacing:'.08em', fontFamily:'var(--font-display)', marginBottom:'8px' }}>Quantite dans la collection</div>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <button onClick={()=>setEditQty(Math.max(1,curQty-1))} style={{ width:'32px', height:'32px', borderRadius:'8px', background:'#F0F0F5', border:'1px solid #D2D2D7', color:'#1D1D1F', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>-</button>
                        <div style={{ flex:1, background:'#E8E8ED', border:'1.5px solid #D1CEC9', borderRadius:'8px', padding:'7px', textAlign:'center' as const, fontSize:'18px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)' }}>{curQty}</div>
                        <button onClick={()=>setEditQty(Math.min(99,curQty+1))} style={{ width:'32px', height:'32px', borderRadius:'8px', background:'#1D1D1F', border:'none', color:'#fff', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                        {editQty!==null&&editQty!==spotCard.qty&&(
                          <button onClick={()=>{ setPortfolio(prev=>prev.map(c=>c.id===spotCard.id?{...c,qty:editQty!}:c)); setSpotCard({...spotCard,qty:editQty!}); setEditQty(null); showToast('Quantite mise a jour') }} style={{ padding:'7px 12px', borderRadius:'8px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const }}>
                            Sauvegarder
                          </button>
                        )}
                      </div>
                    </div>"""

new_qty = """                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', padding:'10px 0', borderTop:'1px solid #F0F0F5', borderBottom:'1px solid #F0F0F5' }}>
                      <span style={{ fontSize:'12px', color:'#6E6E73', fontWeight:500, fontFamily:'var(--font-display)' }}>Quantit""" + EA + """</span>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <button onClick={()=>setEditQty(Math.max(1,curQty-1))} style={{ width:'28px', height:'28px', borderRadius:'8px', background:'#F5F5F7', border:'none', color:'#48484A', fontSize:'14px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>-</button>
                        <span style={{ fontSize:'14px', fontWeight:600, color:'#1D1D1F', minWidth:'20px', textAlign:'center' as const, fontFamily:'var(--font-display)' }}>{curQty}</span>
                        <button onClick={()=>setEditQty(Math.min(99,curQty+1))} style={{ width:'28px', height:'28px', borderRadius:'8px', background:'#F5F5F7', border:'none', color:'#48484A', fontSize:'14px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                        {editQty!==null&&editQty!==spotCard.qty&&(
                          <button onClick={()=>{ setPortfolio(prev=>prev.map(c=>c.id===spotCard.id?{...c,qty:editQty!}:c)); setSpotCard({...spotCard,qty:editQty!}); setEditQty(null); showToast('Quantit""" + EA + """ mise """ + "\u00e0" + """ jour') }} style={{ padding:'6px 12px', borderRadius:'8px', background:'#1D1D1F', color:'#fff', border:'none', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const }}>
                            OK
                          </button>
                        )}
                      </div>
                    </div>"""

assert old_qty in s, "CIBLE QTY"
s = s.replace(old_qty, new_qty, 1)
print('  > quantity compact')

# Bouton signal: rouge -> noir
old_signal_btn = "background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff'"
# C'est le bouton dans le spotlight, pas d'autres
idx_signal = s.find("Voir signal</button>")
if idx_signal > 0:
    area_start = s.rfind("background:'linear-gradient(135deg,#E03020,#FF4433)'", 0, idx_signal)
    if area_start > 0:
        s = s[:area_start] + "background:'#1D1D1F', color:'#fff'" + s[area_start+len("background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff'"):]
        print('  > signal btn noir')

f.write_text(s, 'utf-8')
print('OK')
