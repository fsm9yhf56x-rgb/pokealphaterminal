#!/usr/bin/env python3
from pathlib import Path

EA = '\u00e9'
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# D: Pills populaires — avant le div filters
old_filters = """          <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap' }}>"""
idx = s.find(old_filters)
assert idx > 0, "CIBLE FILTERS"

pills = """          {/* Series populaires */}
          {!loading && filSet==='all' && browseMode==='all' && (
            <div style={{ display:'flex', gap:'6px', marginBottom:'12px', overflowX:'auto' as const, paddingBottom:'4px', scrollbarWidth:'none' as any }}>
              {['sv03.5','base1','swsh12.5','sv04','sv01','cel25','sv08','sm12','swsh8','sv06'].filter(sid=>allCards.some(c=>c.setId===sid)).map(sid=>{
                const nm = allCards.find(c=>c.setId===sid)?.setName||sid
                const ct = allCards.filter(c=>c.setId===sid).length
                return (
                  <button key={sid} onClick={()=>{setFilSet(sid);setFilEra('all');setPage(0)}}
                    style={{ flexShrink:0, padding:'5px 12px', borderRadius:'99px', border:'1px solid #E5E5EA', background:'#fff', color:'#48484A', fontSize:'11px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .12s', whiteSpace:'nowrap' as const, display:'flex', alignItems:'center', gap:'4px' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='#1D1D1F';e.currentTarget.style.background='#1D1D1F';e.currentTarget.style.color='#fff'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='#E5E5EA';e.currentTarget.style.background='#fff';e.currentTarget.style.color='#48484A'}}>
                    {nm} <span style={{ opacity:.5 }}>{ct}</span>
                  </button>
                )
              })}
            </div>
          )}

          <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap' }}>"""

s = s[:idx] + pills + s[idx+len(old_filters):]
print('  > popular pills')

f.write_text(s, 'utf-8')
print('OK')
