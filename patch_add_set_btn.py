#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Le bouton Ajouter
old = """<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      Ajouter
                    </button>"""
new = """<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      Ajouter une carte
                    </button>
                    <button onClick={()=>{/* TODO: modal ajouter serie */showToast('Bient\\u00f4t disponible')}} style={{ padding:'7px 16px', borderRadius:'10px', background:'#FFF1EE', border:'1px solid rgba(224,48,32,.15)', color:'#E03020', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const, display:'flex', alignItems:'center', gap:'6px', transition:'all .15s' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#FFE4DE';e.currentTarget.style.borderColor='rgba(224,48,32,.3)'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#FFF1EE';e.currentTarget.style.borderColor='rgba(224,48,32,.15)'}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
                      Ajouter une s\u00e9rie
                    </button>"""
assert old in s, "CIBLE"
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK')
