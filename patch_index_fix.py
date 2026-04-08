#!/usr/bin/env python3
from pathlib import Path

EA = '\u00e9'
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# 1. Toast — avant LIGHTBOX
old = "      {/* LIGHTBOX */}"
new = """      {/* TOAST */}
      {toast&&<div style={{ position:'fixed', bottom:'80px', left:'50%', transform:'translateX(-50%)', background:'#1D1D1F', color:'#fff', padding:'10px 20px', borderRadius:'99px', fontSize:'13px', fontWeight:500, fontFamily:'var(--font-display)', zIndex:60, boxShadow:'0 8px 24px rgba(0,0,0,.15)', animation:'fadeUp .2s ease-out' }}>{toast}</div>}

      {/* LIGHTBOX */}"""
assert old in s, "CIBLE"
s = s.replace(old, new, 1)
print('  > toast')

# 2. Browse states
old_era = "  const [filEra,     setFilEra]      = useState('all')"
new_era = """  const [filEra,     setFilEra]      = useState('all')
  const [browseMode, setBrowseMode]  = useState<'all'|'bloc'>('all')
  const [selBloc,    setSelBloc]     = useState<string|null>(null)"""
assert old_era in s, "CIBLE ERA"
s = s.replace(old_era, new_era, 1)
print('  > browse states')

# 3. Blocs computed
old_eras = "  const eras = useMemo(() =>"
new_eras = """  const blocs = useMemo(() => {
    const map = new Map<string, {name:string; sets: {id:string;name:string;count:number}[]; total:number}>()
    allCards.forEach(c => {
      if (!map.has(c.era)) map.set(c.era, { name:c.era, sets:[], total:0 })
      const b = map.get(c.era)!
      b.total++
      if (!b.sets.find(st=>st.id===c.setId)) b.sets.push({ id:c.setId, name:c.setName, count:0 })
      b.sets.find(st=>st.id===c.setId)!.count++
    })
    return [...map.entries()].sort((a,b)=>ERA_ORDER.indexOf(a[0])-ERA_ORDER.indexOf(b[0])).map(([,v])=>v)
  }, [allCards])

  const eras = useMemo(() =>"""
assert old_eras in s, "CIBLE ERAS"
s = s.replace(old_eras, new_eras, 1)
print('  > blocs')

# 4. Browse UI — avant top pagination
old_pag = """          {!loading && !loadErr && pageCount>1 && (
            <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'5px', marginBottom:'12px' }}>"""
bloc_ui = """          {/* Browse toggle */}
          {!loading && !loadErr && (
            <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
              <button onClick={()=>{setBrowseMode('all');setSelBloc(null);setFilSet('all');setFilEra('all');setPage(0)}} style={{ padding:'6px 14px', borderRadius:'99px', border:'1px solid '+(browseMode==='all'?'#1D1D1F':'#E5E5EA'), background:browseMode==='all'?'#1D1D1F':'#fff', color:browseMode==='all'?'#fff':'#86868B', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>Toutes les cartes</button>
              <button onClick={()=>{setBrowseMode('bloc');setSelBloc(null);setFilSet('all');setPage(0)}} style={{ padding:'6px 14px', borderRadius:'99px', border:'1px solid '+(browseMode==='bloc'?'#1D1D1F':'#E5E5EA'), background:browseMode==='bloc'?'#1D1D1F':'#fff', color:browseMode==='bloc'?'#fff':'#86868B', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>Par blocs</button>
            </div>
          )}
          {browseMode==='bloc'&&!selBloc&&!loading&&(
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'12px', marginBottom:'20px' }}>
              {blocs.map(b=>(
                <div key={b.name} onClick={()=>{setSelBloc(b.name);setFilEra(b.name);setPage(0)}} style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'12px', padding:'16px', cursor:'pointer', transition:'all .15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#1D1D1F';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.06)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#EBEBEB';e.currentTarget.style.boxShadow=''}}>
                  <div style={{ fontSize:'15px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)', marginBottom:'4px' }}>{b.name}</div>
                  <div style={{ fontSize:'11px', color:'#86868B' }}>{b.sets.length} s""" + EA + """rie{b.sets.length>1?'s':''} · {b.total.toLocaleString()} cartes</div>
                  <div style={{ display:'flex', gap:'4px', marginTop:'10px', flexWrap:'wrap' as const }}>
                    {b.sets.slice(0,4).map(st=>(<span key={st.id} style={{ fontSize:'9px', color:'#AEAEB2', background:'#F5F5F7', padding:'2px 6px', borderRadius:'4px' }}>{st.name}</span>))}
                    {b.sets.length>4&&<span style={{ fontSize:'9px', color:'#AEAEB2', padding:'2px 4px' }}>+{b.sets.length-4}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {browseMode==='bloc'&&selBloc&&!loading&&(
            <div style={{ marginBottom:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                <button onClick={()=>{setSelBloc(null);setFilEra('all');setFilSet('all');setPage(0)}} style={{ background:'#F5F5F7', border:'none', borderRadius:'8px', padding:'6px 10px', cursor:'pointer', fontSize:'12px', color:'#48484A', fontFamily:'var(--font-display)', display:'flex', alignItems:'center', gap:'4px' }}>{String.fromCharCode(8249)} Blocs</button>
                <span style={{ fontSize:'17px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)' }}>{selBloc}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'8px', marginBottom:'16px' }}>
                <div onClick={()=>{setFilSet('all');setPage(0)}} style={{ padding:'10px 14px', borderRadius:'10px', border:'1px solid '+(filSet==='all'?'#1D1D1F':'#E5E5EA'), background:filSet==='all'?'#1D1D1F':'#fff', color:filSet==='all'?'#fff':'#48484A', fontSize:'12px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)' }}>Toutes ({blocs.find(b=>b.name===selBloc)?.total.toLocaleString()})</div>
                {blocs.find(b=>b.name===selBloc)?.sets.map(st=>(
                  <div key={st.id} onClick={()=>{setFilSet(st.id);setPage(0)}} style={{ padding:'10px 14px', borderRadius:'10px', border:'1px solid '+(filSet===st.id?'#1D1D1F':'#E5E5EA'), background:filSet===st.id?'#1D1D1F':'#fff', color:filSet===st.id?'#fff':'#48484A', fontSize:'12px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .12s' }}>
                    {st.name} <span style={{ opacity:.5 }}>({st.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !loadErr && pageCount>1 && (
            <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'5px', marginBottom:'12px' }}>"""
assert old_pag in s, "CIBLE PAG"
s = s.replace(old_pag, bloc_ui, 1)
print('  > browse UI')

f.write_text(s, 'utf-8')
print('OK')
