#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# SHELF — glitter seulement pour gold
old = """{gn>=5&&<><div style={{ position:'absolute', inset:0, borderRadius:'5px', background:gn>=10?'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)':gn>=8?'linear-gradient(145deg,transparent 30%,rgba(255,255,255,.3) 45%,transparent 60%)':'linear-gradient(145deg,transparent 30%,rgba(224,191,160,.25) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/><div className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/></>}"""
new = """{gn>=5&&<div style={{ position:'absolute', inset:0, borderRadius:'5px', background:gn>=10?'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)':gn>=8?'linear-gradient(145deg,transparent 30%,rgba(255,255,255,.3) 45%,transparent 60%)':'linear-gradient(145deg,transparent 30%,rgba(224,191,160,.25) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/>}
                                    {gn>=10&&<div className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/>}"""
assert old in s, "CIBLE SHELF"
s = s.replace(old, new, 1)

# GRID — glitter seulement pour gold
old2 = """{gn3>=5&&<><span style={{ position:'absolute', inset:0, borderRadius:'4px', background:gn3>=10?'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)':gn3>=9?'linear-gradient(145deg,transparent 30%,rgba(255,255,255,.3) 45%,transparent 60%)':'linear-gradient(145deg,transparent 30%,rgba(224,191,160,.25) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/><span className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/></>}"""
new2 = """{gn3>=5&&<span style={{ position:'absolute', inset:0, borderRadius:'4px', background:gn3>=10?'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)':gn3>=9?'linear-gradient(145deg,transparent 30%,rgba(255,255,255,.3) 45%,transparent 60%)':'linear-gradient(145deg,transparent 30%,rgba(224,191,160,.25) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/>}
                                {gn3>=10&&<span className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/>}"""
assert old2 in s, "CIBLE GRID"
s = s.replace(old2, new2, 1)

f.write_text(s, 'utf-8')
print('OK — glitter gold only')
