#!/usr/bin/env python3
"""Bouton supprimer serie avec confirmation"""
from pathlib import Path

EA = '\u00e9'
EG = '\u00e8'
AG = '\u00e0'

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Ajouter un bouton poubelle a cote de "Voir la serie complete"
old_pill = """<span className="voir-pill" onClick={e=>{e.stopPropagation();setBinderSet(setName);setBinderPage(0)}} style={{ fontSize:'11px', color:'#E03020', fontWeight:500, fontFamily:'var(--font-display)', padding:'3px 10px', borderRadius:'99px', background:'#FFF1EE', border:'1px solid rgba(224,48,32,.15)', transition:'all .2s', whiteSpace:'nowrap', cursor:'pointer' }}>Voir la s""" + EA + """rie compl""" + EG + """te \u203a</span>"""

new_pill = """<button onClick={e=>{e.stopPropagation();if(window.confirm('Supprimer toutes les '+setCards.length+' cartes de "'+setName+'" ?')){setPortfolio(prev=>prev.filter(c=>c.set!==setName));showToast(setName+' supprim""" + EA + """')}}} style={{ width:'26px', height:'26px', borderRadius:'50%', background:'transparent', border:'1px solid #E5E5EA', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s', flexShrink:0 }}
                                      onMouseEnter={e=>{e.currentTarget.style.background='#FFF1EE';e.currentTarget.style.borderColor='rgba(224,48,32,.3)'}}
                                      onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='#E5E5EA'}}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E03020" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                    </button>
                                    <span className="voir-pill" onClick={e=>{e.stopPropagation();setBinderSet(setName);setBinderPage(0)}} style={{ fontSize:'11px', color:'#E03020', fontWeight:500, fontFamily:'var(--font-display)', padding:'3px 10px', borderRadius:'99px', background:'#FFF1EE', border:'1px solid rgba(224,48,32,.15)', transition:'all .2s', whiteSpace:'nowrap', cursor:'pointer' }}>Voir la s""" + EA + """rie compl""" + EG + """te \u203a</span>"""

assert old_pill in s, "CIBLE PILL"
s = s.replace(old_pill, new_pill, 1)
print('  > delete button')

f.write_text(s, 'utf-8')
print('OK')
