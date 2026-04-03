#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# SHELF — retirer le sweep, garder glitter
old_shelf = """{gn>=10&&<><div style={{ position:'absolute', inset:0, overflow:'hidden', borderRadius:'5px' }}><div style={{ position:'absolute', top:0, width:'30px', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,250,.7),transparent)', animation:'masterSweep 6s ease-in-out infinite' }}/><div style={{ position:'absolute', top:0, width:'20px', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,250,.45),transparent)', animation:'masterSweep 6s 3s ease-in-out infinite' }}/></div><div className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/></>}"""
new_shelf = """{gn>=10&&<div className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/>}"""
assert old_shelf in s, "CIBLE SHELF"
s = s.replace(old_shelf, new_shelf, 1)

# GRID — retirer le sweep, garder glitter
old_grid = """{gn3>=10&&<><span style={{ position:'absolute', inset:0, overflow:'hidden', borderRadius:'4px' }}><span style={{ position:'absolute', top:0, width:'30px', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,250,.7),transparent)', animation:'masterSweep 6s ease-in-out infinite' }}/><span style={{ position:'absolute', top:0, width:'20px', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,250,.45),transparent)', animation:'masterSweep 6s 3s ease-in-out infinite' }}/></span><span className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/></>}"""
new_grid = """{gn3>=10&&<span className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/>}"""
assert old_grid in s, "CIBLE GRID"
s = s.replace(old_grid, new_grid, 1)

f.write_text(s, 'utf-8')
print('OK — sweep removed, glitter only')
