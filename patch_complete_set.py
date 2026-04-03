#!/usr/bin/env python3
"""C1 - barre de progression cliquable sous le logo"""
from pathlib import Path

EA = '\u00e9'
AG = '\u00e0'
CHEV = '\u203a'

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

target = "background:'linear-gradient(to left, transparent, #AEAEB2)'"
idx = s.find(target)
assert idx > 0, "CIBLE DECO LINE"

close1 = s.find('/>', idx) + 2
close2 = s.find('</div>', close1) + 6

bar = "\n              <div style={{ marginTop:'12px', maxWidth:'320px', width:'100%', cursor:'pointer', position:'relative' }}\n"
bar += "                onClick={()=>{\n"
bar += "                  const sc=portfolio.filter(c=>c.set===binderSet)\n"
bar += "                  const existingNums=new Set(sc.map(c=>c.number))\n"
bar += "                  const toAdd=fullSetCards.filter(c=>!existingNums.has(c.localId||''))\n"
bar += "                  if(toAdd.length===0){showToast('Set d" + EA + "j" + AG + " complet');return}\n"
bar += "                  const newCards:CardItem[]=toAdd.map(c=>({\n"
bar += "                    id:'u'+Date.now()+'-'+Math.random().toString(36).slice(2,8),\n"
bar += "                    name:c.name,set:binderSet||'',year:new Date().getFullYear(),\n"
bar += "                    number:c.localId||'',rarity:c.rarity||'',\n"
bar += "                    type:'fire',lang:sc[0]?.lang||'FR',\n"
bar += "                    condition:'Raw',graded:false,\n"
bar += "                    buyPrice:0,curPrice:0,qty:1,\n"
bar += "                    image:c.image||undefined,\n"
bar += "                    setId:sc[0]?.setId||'',setTotal:fullSetCards.length,\n"
bar += "                  }))\n"
bar += "                  setPortfolio(prev=>[...prev,...newCards])\n"
bar += "                  showToast(toAdd.length+' cartes ajout" + EA + "es')\n"
bar += "                }}>\n"
bar += "                {(()=>{\n"
bar += "                  const sc2=portfolio.filter(c=>c.set===binderSet)\n"
bar += "                  const total2=fullSetCards.length||0\n"
bar += "                  const owned2=sc2.length\n"
bar += "                  const pct2=total2>0?Math.round(owned2/total2*100):0\n"
bar += "                  const missing2=Math.max(0,total2-owned2)\n"
bar += "                  if(missing2===0||total2===0) return null\n"
bar += "                  return (<>\n"
bar += "                    <div style={{ height:'8px',borderRadius:'4px',background:'#E8E8ED',overflow:'hidden' }}>\n"
bar += "                      <div style={{ width:pct2+'%',height:'100%',background:'linear-gradient(90deg,#ff6b35,#ff4433)',borderRadius:'4px',transition:'width .5s' }}/>\n"
bar += "                    </div>\n"
bar += "                    <div style={{ position:'absolute',right:0,top:'-2px',width:'12px',height:'12px',borderRadius:'50%',background:'#E03020',border:'2px solid #fff',boxShadow:'0 1px 4px rgba(0,0,0,.15)' }}/>\n"
bar += "                    <div style={{ fontSize:'10px',color:'#E03020',marginTop:'6px',textAlign:'right' as const,fontFamily:'var(--font-display)',fontWeight:500 }}>{'Ajouter les '+missing2+' " + CHEV + "'}</div>\n"
bar += "                  </>)\n"
bar += "                })()}\n"
bar += "              </div>"

s = s[:close2] + bar + s[close2:]
print('  > barre cliquable')

f.write_text(s, 'utf-8')
print('OK')
