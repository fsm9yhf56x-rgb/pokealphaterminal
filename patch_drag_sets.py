#!/usr/bin/env python3
"""Drag & drop pour reordonner les sets"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. State pour l'ordre des sets + drag
old_collapsed = "const [collapsedSets, setCollapsedSets] = useState<Set<string>>(()=>{"
new_collapsed = """const [setOrder, setSetOrder] = useState<string[]>(()=>{
    try { const r=localStorage.getItem('pka_set_order'); return r?JSON.parse(r):[] } catch { return [] }
  })
  const [dragSet, setDragSet] = useState<string|null>(null)
  const [dragOverSet, setDragOverSet] = useState<string|null>(null)
  const [collapsedSets, setCollapsedSets] = useState<Set<string>>(()=>{"""
assert old_collapsed in s, "CIBLE STATE"
s = s.replace(old_collapsed, new_collapsed, 1)
print('  > states')

# 2. Persist set order
old_persist = "useEffect(()=>{ try { localStorage.setItem('pka_collapsed', JSON.stringify([...collapsedSets])) } catch {} }, [collapsedSets])"
new_persist = """useEffect(()=>{ try { localStorage.setItem('pka_collapsed', JSON.stringify([...collapsedSets])) } catch {} }, [collapsedSets])
  useEffect(()=>{ try { localStorage.setItem('pka_set_order', JSON.stringify(setOrder)) } catch {} }, [setOrder])"""
assert old_persist in s, "CIBLE PERSIST"
s = s.replace(old_persist, new_persist, 1)
print('  > persist')

# 3. Ordered sets list — remplacer [...new Set(portfolio.map(c=>c.set))] dans le map principal
old_setlist = "[...new Set(portfolio.map(c=>c.set))].filter(n=>n.toLowerCase().includes(setSearch.toLowerCase())).map((setName,si)=>{"
new_setlist = """(()=>{
                      const raw=[...new Set(portfolio.map(c=>c.set))]
                      const ordered=setOrder.length>0?[...setOrder.filter(n=>raw.includes(n)),...raw.filter(n=>!setOrder.includes(n))]:raw
                      return ordered
                    })().filter(n=>n.toLowerCase().includes(setSearch.toLowerCase())).map((setName,si)=>{"""
assert old_setlist in s, "CIBLE SETLIST"
s = s.replace(old_setlist, new_setlist, 1)
print('  > ordered list')

# 4. Drag handlers sur le header du set
old_header = """className='set-header' style={{ marginBottom:'12px', cursor:'pointer' }} onClick={()=>{ setCollapsedSets(prev=>{ const n=new Set(prev); n.has(setName)?n.delete(setName):n.add(setName); return n }) }}>"""
new_header = """className='set-header' style={{ marginBottom:'12px', cursor:'pointer', opacity:dragSet===setName?.5:1, borderTop:dragOverSet===setName?'2px solid #E03020':'2px solid transparent', transition:'opacity .2s, border-color .2s' }}
                                draggable
                                onDragStart={e=>{setDragSet(setName);e.dataTransfer.effectAllowed='move'}}
                                onDragEnd={()=>{setDragSet(null);setDragOverSet(null)}}
                                onDragOver={e=>{e.preventDefault();if(dragSet&&dragSet!==setName)setDragOverSet(setName)}}
                                onDragLeave={()=>setDragOverSet(null)}
                                onDrop={e=>{
                                  e.preventDefault()
                                  if(!dragSet||dragSet===setName) return
                                  const raw=[...new Set(portfolio.map(c=>c.set))]
                                  const current=setOrder.length>0?[...setOrder.filter(n=>raw.includes(n)),...raw.filter(n=>!setOrder.includes(n))]:raw
                                  const fromIdx=current.indexOf(dragSet)
                                  const toIdx=current.indexOf(setName)
                                  if(fromIdx<0||toIdx<0) return
                                  const next=[...current]
                                  next.splice(fromIdx,1)
                                  next.splice(toIdx,0,dragSet)
                                  setSetOrder(next)
                                  setDragSet(null)
                                  setDragOverSet(null)
                                }}
                                onClick={()=>{ setCollapsedSets(prev=>{ const n=new Set(prev); n.has(setName)?n.delete(setName):n.add(setName); return n }) }}>"""
assert old_header in s, "CIBLE HEADER"
s = s.replace(old_header, new_header, 1)
print('  > drag handlers')

# 5. Fix le separateur qui utilise aussi l'ancien setlist
old_sep_list = "si<[...new Set(portfolio.map(c=>c.set))].filter(n=>n.toLowerCase().includes(setSearch.toLowerCase())).length-1"
new_sep_list = "si<(()=>{const raw=[...new Set(portfolio.map(c=>c.set))];const ordered=setOrder.length>0?[...setOrder.filter(n=>raw.includes(n)),...raw.filter(n=>!setOrder.includes(n))]:raw;return ordered})().filter(n=>n.toLowerCase().includes(setSearch.toLowerCase())).length-1"
assert old_sep_list in s, "CIBLE SEP LIST"
s = s.replace(old_sep_list, new_sep_list, 1)
print('  > separator fix')

f.write_text(s, 'utf-8')
print('OK')
