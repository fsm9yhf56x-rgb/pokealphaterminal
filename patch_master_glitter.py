#!/usr/bin/env python3
"""Master set: barre continue or + 35 glitter + double bande lumineuse"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. CSS animations glitter
if 'goldSlow' not in s:
    old_css = "@keyframes masterPulse"
    new_css = """@keyframes goldSlow { 0%{background-position:0% center} 100%{background-position:200% center} }
        @keyframes gl1 { 0%{opacity:0} 6%{opacity:1} 12%{opacity:0} 100%{opacity:0} }
        @keyframes gl2 { 0%{opacity:0} 8%{opacity:.8} 14%{opacity:1} 20%{opacity:0} 100%{opacity:0} }
        @keyframes gl3 { 0%{opacity:0} 4%{opacity:1} 8%{opacity:.6} 14%{opacity:0} 100%{opacity:0} }
        @keyframes gl4 { 0%{opacity:0} 10%{opacity:1} 16%{opacity:.4} 22%{opacity:0} 100%{opacity:0} }
        @keyframes starBreath { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes masterPulse"""
    assert old_css in s, "CIBLE CSS"
    s = s.replace(old_css, new_css, 1)
    print('  > CSS')

# 2. Remplacer les barres segmentees par barre continue quand isComplete
old_segs = """                                {resolvedTotal>0&&(
                                  <>
                                    <div style={{ display:'flex', gap:'3px' }}>
                                      {segs.map((seg,si2)=>(
                                        <div key={si2} style={{ flex:1, height:'6px', borderRadius:'3px', overflow:'hidden', position:'relative', background:'#E8E8ED' }}>
                                          {(seg[0] as number)>0&&<div style={{ width:(seg[0] as number)+'%', height:'100%', background:seg[1] as string, borderRadius:'3px', position:'relative', overflow:'hidden', transition:'width .5s ease' }}>
                                            <div style={{ position:'absolute', top:0, bottom:0, width:'24px', background:'linear-gradient(90deg,transparent,rgba(29,29,31,.3),transparent)', animation:`shim ${1.8+si*.3}s ${si2*.35}s linear infinite` }}/>
                                          </div>}
                                        </div>
                                      ))}
                                    </div>"""

# Build the glitter bar JSX
g = []
g.append("                                {resolvedTotal>0&&(")
g.append("                                  <>")
g.append("                                    {isComplete?(")
g.append("                                      <div style={{ height:'9px', borderRadius:'5px', background:'#F5F0DC', overflow:'visible', position:'relative' }}>")
g.append("                                        <div style={{ width:'100%', height:'100%', borderRadius:'5px', background:'linear-gradient(90deg,#D4B85C,#E8D48B,#F5ECA0,#FFFAD0,#F5ECA0,#E8D48B,#D4B85C,#E8D48B,#F5ECA0,#FFFAD0,#F5ECA0,#E8D48B,#D4B85C)', backgroundSize:'200% 100%', animation:'goldSlow 6s linear infinite' }}/>")
g.append("                                        <div style={{ position:'absolute', inset:0, borderRadius:'5px', background:'linear-gradient(90deg,transparent 35%,rgba(255,255,255,.6) 50%,transparent 65%,transparent 85%,rgba(255,255,255,.6) 100%,transparent)', backgroundSize:'200% 100%', animation:'goldSlow 4s linear infinite' }}/>")
g.append("                                        <div style={{ position:'absolute', inset:0, borderRadius:'5px', background:'linear-gradient(90deg,transparent 60%,rgba(255,255,255,.35) 70%,transparent 80%)', backgroundSize:'200% 100%', animation:'goldSlow 7s linear infinite' }}/>")

# 35 glitter points
pts = [
    (1,1,'gl1',0),(5,4,'gl2',.15),(2,7,'gl3',.3),(6,10,'gl4',.45),
    (1,13,'gl1',.6),(4,16,'gl2',.75),(2,19,'gl3',.9),(5,22,'gl4',1.05),
    (1,25,'gl1',1.2),(6,28,'gl2',1.35),(3,31,'gl3',1.5),(1,34,'gl4',1.65),
    (5,37,'gl1',1.8),(2,40,'gl2',1.95),(1,43,'gl3',2.1),(4,46,'gl4',2.25),
    (6,49,'gl1',2.4),(2,52,'gl2',2.55),
    (1,55,'gl3',.1),(5,58,'gl4',.25),(3,61,'gl1',.4),(1,64,'gl2',.55),
    (6,67,'gl3',.7),(2,70,'gl4',.85),(4,73,'gl1',1),(1,76,'gl2',1.15),
    (5,79,'gl3',1.3),(3,82,'gl4',1.45),(1,85,'gl1',1.6),(6,88,'gl2',1.75),
    (2,91,'gl3',1.9),(4,94,'gl4',2.05),(1,97,'gl1',2.2),
    (3,5.5,'gl3',2.35),(4,48,'gl4',2.5),
]
for top, left, anim, delay in pts:
    sz = 2 if top % 2 == 1 else 1
    g.append(f"                                        <div style={{{{ position:'absolute', top:'{top}px', left:'{left}%', width:'{sz}px', height:'{sz}px', borderRadius:'50%', background:'#fff', animation:'{anim} 4s {delay}s linear infinite' }}}}/>")

g.append("                                      </div>")
g.append("                                    ):(")
g.append("                                    <div style={{ display:'flex', gap:'3px' }}>")
g.append("                                      {segs.map((seg,si2)=>(")
g.append("                                        <div key={si2} style={{ flex:1, height:'6px', borderRadius:'3px', overflow:'hidden', position:'relative', background:'#E8E8ED' }}>")
g.append("                                          {(seg[0] as number)>0&&<div style={{ width:(seg[0] as number)+'%', height:'100%', background:seg[1] as string, borderRadius:'3px', position:'relative', overflow:'hidden', transition:'width .5s ease' }}>")
g.append("                                            <div style={{ position:'absolute', top:0, bottom:0, width:'24px', background:'linear-gradient(90deg,transparent,rgba(29,29,31,.3),transparent)', animation:`shim ${1.8+si*.3}s ${si2*.35}s linear infinite` }}/>")
g.append("                                          </div>}")
g.append("                                        </div>")
g.append("                                      ))}")
g.append("                                    </div>")
g.append("                                    )}")

new_segs = '\n'.join(g)

assert old_segs in s, "CIBLE SEGS"
s = s.replace(old_segs, new_segs, 1)
print('  > barre glitter 35pts')

# 3. Supprimer glow jaune
s = s.replace("animation:isComplete?'masterPulse 3s ease-in-out infinite':'none'", "animation:isComplete?'starBreath 4s ease-in-out infinite':'none'")
s = s.replace("textShadow:isComplete?'0 0 8px rgba(255,215,0,.2)':'none'", "textShadow:'none'")
print('  > remove glow')

f.write_text(s, 'utf-8')
print('OK')
