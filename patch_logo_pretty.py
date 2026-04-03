#!/usr/bin/env python3
"""Logo header plus elegant dans la page set"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

old = """          {binderSet&&binderSet!=='__all__'&&view==='binder'&&(
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:'6px', padding:'6px 0', gap:'4px' }}>
              {setLogos[binderSet||'']&&(
                <img src={setLogos[binderSet||'']} alt={binderSet||''} style={{ height:'56px', maxWidth:'280px', objectFit:'contain' }}
                  onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
              )}
              <span style={{ fontSize:'13px', color:'#86868B', fontFamily:'var(--font-display)' }}>"""

new = """          {binderSet&&binderSet!=='__all__'&&view==='binder'&&(
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:'4px', padding:'16px 0 12px', position:'relative' }}>
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'200px', height:'200px', borderRadius:'50%', background:'radial-gradient(circle, rgba(224,48,32,.04) 0%, transparent 70%)', pointerEvents:'none' }}/>
              {setLogos[binderSet||'']&&(
                <img src={setLogos[binderSet||'']} alt={binderSet||''} style={{ height:'64px', maxWidth:'300px', objectFit:'contain', position:'relative', filter:'drop-shadow(0 2px 8px rgba(0,0,0,.08))' }}
                  onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
              )}
              {!setLogos[binderSet||'']&&(
                <div style={{ fontSize:'24px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', position:'relative' }}>{binderSet}</div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'8px', position:'relative' }}>
                <div style={{ height:'1px', width:'32px', background:'linear-gradient(to right, transparent, #D2D2D7)' }}/>
                <span style={{ fontSize:'12px', color:'#86868B', fontFamily:'var(--font-display)', letterSpacing:'.03em' }}>"""

assert old in s, "CIBLE LOGO BLOCK"
s = s.replace(old, new, 1)

# Fermer le nouveau layout
old_close = """              </span>
            </div>
          )}"""
# Trouver la bonne occurrence — apres le logo block
idx = s.find("linear-gradient(to right, transparent, #D2D2D7)")
close_idx = s.find(old_close, idx)
assert close_idx > 0, "CIBLE CLOSE"

new_close = """              </span>
                <div style={{ height:'1px', width:'32px', background:'linear-gradient(to left, transparent, #D2D2D7)' }}/>
              </div>
            </div>
          )}"""

s = s[:close_idx] + new_close + s[close_idx+len(old_close):]
print('  > logo header elegant')

f.write_text(s, 'utf-8')
print('OK')
