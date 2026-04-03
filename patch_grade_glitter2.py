#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Ajouter badge glitter dans le useEffect
old = """        el.appendChild(d)
      }
    })
  })
  // -- Fetch sets pour modal ajouter serie --"""
new = """        el.appendChild(d)
      }
    })
    // Badge glitter (grade 10)
    const badges = document.querySelectorAll('.badge-glitter-container')
    badges.forEach(bg => {
      if (bg.childNodes.length > 0) return
      const anims = ['gl1','gl2','gl3','gl4']
      for (let i = 0; i < 80; i++) {
        const d = document.createElement('div')
        const sz = Math.random() > .5 ? 2 : 1
        const top = (-1 + Math.random() * 18).toFixed(0)
        const left = (Math.random() * 98).toFixed(1)
        const delay = (Math.random() * 4).toFixed(2)
        d.style.cssText = `position:absolute;top:${top}px;left:${left}%;width:${sz}px;height:${sz}px;border-radius:50%;background:#fff;animation:${anims[i%4]} 4s ${delay}s linear infinite`
        bg.appendChild(d)
      }
    })
  })
  // -- Fetch sets pour modal ajouter serie --"""
assert old in s, "CIBLE EFFECT"
s = s.replace(old, new, 1)
print('  > badge glitter generator')

# 2. SHELF badge
old_shelf = """return <div style={{ position:'absolute', bottom:'28px', right:'4px', zIndex:3, background:gn>=10?'linear-gradient(90deg,#D4AF37,#F0E080,#D4AF37)':bg, color:gn>=10?'#5C4A12':fg, fontSize:'8px', fontWeight:800, padding:'3px 7px', borderRadius:'5px', fontFamily:'var(--font-data)', boxShadow:gn>=10?'0 2px 8px rgba(212,175,55,.3)':sh, letterSpacing:'.03em', backgroundSize:gn>=10?'200% 100%':'auto', animation:gn>=10?'goldSlow 6s linear infinite':'none', overflow:'hidden', border:gn>=10?'1px solid rgba(212,175,55,.3)':'none' }}>
                                    {gn>=10&&<div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,250,.6),transparent)', animation:'masterSweep 6s ease-in-out infinite' }}/>}
                                    <span style={{ position:'relative', zIndex:1 }}>{card.condition}</span>
                                  </div>"""
new_shelf = """return <div style={{ position:'absolute', bottom:'28px', right:'4px', zIndex:3, background:gn>=10?'linear-gradient(90deg,#C9A84C,#D4AF37,#E8D48B,#D4AF37,#C9A84C)':bg, color:gn>=10?'#5C4A12':fg, fontSize:'8px', fontWeight:800, padding:'3px 7px', borderRadius:'5px', fontFamily:'var(--font-data)', boxShadow:gn>=10?'0 2px 8px rgba(212,175,55,.3)':sh, letterSpacing:'.03em', overflow:'visible', border:gn>=10?'1px solid rgba(212,175,55,.3)':'none' }}>
                                    {gn>=10&&<><div style={{ position:'absolute', inset:0, overflow:'hidden', borderRadius:'5px' }}><div style={{ position:'absolute', top:0, width:'30px', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,250,.7),transparent)', animation:'masterSweep 6s ease-in-out infinite' }}/><div style={{ position:'absolute', top:0, width:'20px', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,250,.45),transparent)', animation:'masterSweep 6s 3s ease-in-out infinite' }}/></div><div className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/></>}
                                    <span style={{ position:'relative', zIndex:1 }}>{card.condition}</span>
                                  </div>"""
assert old_shelf in s, "CIBLE SHELF"
s = s.replace(old_shelf, new_shelf, 1)
print('  > shelf badge')

# 3. GRID badge
old_grid = """return <span style={{ fontSize:binderCols>=7?'7px':'8px', fontWeight:800, background:gn3>=10?'linear-gradient(90deg,#D4AF37,#F0E080,#D4AF37)':bg3, color:gn3>=10?'#5C4A12':fg3, padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-data)', boxShadow:gn3>=10?'0 2px 6px rgba(212,175,55,.25)':sh3, letterSpacing:'.03em', backgroundSize:gn3>=10?'200% 100%':'auto', animation:gn3>=10?'goldSlow 6s linear infinite':'none', marginLeft:'2px', overflow:'hidden', position:'relative', border:gn3>=10?'1px solid rgba(212,175,55,.3)':'none', display:'inline-flex', alignItems:'center' }}>
                                {gn3>=10&&<span style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,250,.6),transparent)', animation:'masterSweep 6s ease-in-out infinite' }}/>}
                                <span style={{ position:'relative', zIndex:1 }}>{card.condition}</span>
                              </span>"""
new_grid = """return <span style={{ fontSize:binderCols>=7?'7px':'8px', fontWeight:800, background:gn3>=10?'linear-gradient(90deg,#C9A84C,#D4AF37,#E8D48B,#D4AF37,#C9A84C)':bg3, color:gn3>=10?'#5C4A12':fg3, padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-data)', boxShadow:gn3>=10?'0 2px 6px rgba(212,175,55,.25)':sh3, letterSpacing:'.03em', marginLeft:'2px', overflow:'visible', position:'relative', border:gn3>=10?'1px solid rgba(212,175,55,.3)':'none', display:'inline-flex', alignItems:'center' }}>
                                {gn3>=10&&<><span style={{ position:'absolute', inset:0, overflow:'hidden', borderRadius:'4px' }}><span style={{ position:'absolute', top:0, width:'30px', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,250,.7),transparent)', animation:'masterSweep 6s ease-in-out infinite' }}/><span style={{ position:'absolute', top:0, width:'20px', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,250,.45),transparent)', animation:'masterSweep 6s 3s ease-in-out infinite' }}/></span><span className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/></>}
                                <span style={{ position:'relative', zIndex:1 }}>{card.condition}</span>
                              </span>"""
assert old_grid in s, "CIBLE GRID"
s = s.replace(old_grid, new_grid, 1)
print('  > grid badge')

f.write_text(s, 'utf-8')
print('OK')
