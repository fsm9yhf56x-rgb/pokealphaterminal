#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

old = """                  if(missing2===0) return (
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px' }}>
                      <div style={{ height:'10px', borderRadius:'5px', background:'#F0EBD8', overflow:'visible', position:'relative', width:'100%' }}>
                        <div style={{ width:'100%', height:'100%', borderRadius:'5px', background:'linear-gradient(90deg,#C9A84C,#D4AF37,#E8D48B,#D4AF37,#C9A84C)', overflow:'hidden' }}>
                          <div style={{ position:'absolute', top:0, width:'80px', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,250,.7),transparent)', animation:'masterSweep 6s ease-in-out infinite', borderRadius:'5px' }}/>
                          <div style={{ position:'absolute', top:0, width:'50px', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,250,.45),transparent)', animation:'masterSweep 6s 3s ease-in-out infinite', borderRadius:'5px' }}/>
                        </div>
                        <div style={{ position:'absolute', inset:0, borderRadius:'5px', background:'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.3) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/>
                        <div className='master-glitter-container' style={{ position:'absolute', inset:'-2px 0', pointerEvents:'none' }}/>
                      </div>
                      <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'6px 16px', borderRadius:'99px', background:'linear-gradient(145deg,#8B7320,#B8942F,#D4AF37,#F5ECA0,#FFFAD0,#F5ECA0,#D4AF37,#B8942F,#8B7320)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', border:'1px solid rgba(212,175,55,.4)', boxShadow:'0 1px 3px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,240,.4)', overflow:'visible', position:'relative' }}>"""

new = """                  if(missing2===0) return (
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                      <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'6px 16px', borderRadius:'99px', background:'linear-gradient(145deg,#8B7320,#B8942F,#D4AF37,#F5ECA0,#FFFAD0,#F5ECA0,#D4AF37,#B8942F,#8B7320)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', border:'1px solid rgba(212,175,55,.4)', boxShadow:'0 1px 3px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,240,.4)', overflow:'visible', position:'relative' }}>"""

assert old in s, "CIBLE"
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK')
