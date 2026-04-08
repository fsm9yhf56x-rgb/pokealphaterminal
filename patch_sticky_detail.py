#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

old = """<div className="detail-panel" style={{ width:'285px', flexShrink:0 }}>"""
new = """<div className="detail-panel" style={{ width:'285px', flexShrink:0, position:'sticky' as any, top:'80px', alignSelf:'flex-start', maxHeight:'calc(100vh - 100px)', overflowY:'auto' as any }}>"""
assert old in s, "CIBLE"
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK')
