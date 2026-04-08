#!/usr/bin/env python3
"""Index: #9 add direct + #10 check vert + #1 browse blocs"""
from pathlib import Path

EA = '\u00e9'
EG = '\u00e8'
AG = '\u00e0'

f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# ═══ #9 + #10: ADD DIRECT + CHECK VERT ═══

# 1. Ajouter state portfolio + IndexedDB helpers
old_import = "import { getSets, getCards, type StaticSet, type StaticCard } from '@/lib/cardDb'"
new_import = """import { getSets, getCards, type StaticSet, type StaticCard } from '@/lib/cardDb'

interface PortfolioCard {
  id:string; name:string; set:string; setId?:string; number:string; rarity:string;
  type:string; lang:string; condition:string; graded:boolean; buyPrice:number;
  curPrice:number; qty:number; year:number; image?:string; setTotal?:number;
}
const pkaDbOpen = () => new Promise<IDBDatabase>((res, rej) => {
  const req = indexedDB.open('pka_db', 1)
  req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains('store')) db.createObjectStore('store') }
  req.onsuccess = () => res(req.result)
  req.onerror = () => rej(req.error)
})
const pkaDbGet = async <T,>(key: string): Promise<T|null> => {
  try { const db = await pkaDbOpen(); return new Promise((r,j) => { const tx=db.transaction('store','readonly'); const req=tx.objectStore('store').get(key); req.onsuccess=()=>r(req.result??null); req.onerror=()=>j(req.error) }) } catch { return null }
}
const pkaDbSet = async (key: string, value: unknown) => {
  try { const db = await pkaDbOpen(); return new Promise<void>((r,j) => { const tx=db.transaction('store','readwrite'); tx.objectStore('store').put(value,key); tx.oncomplete=()=>r(); tx.onerror=()=>j(tx.error) }) } catch {}
}"""
assert old_import in s, "CIBLE IMPORT"
s = s.replace(old_import, new_import, 1)
print('  > imports + IDB helpers')

# 2. State pour portfolio + toast
old_state = "  const [page,       setPage]        = useState(0)"
new_state = """  const [page,       setPage]        = useState(0)
  const [portfolio,  setPortfolioLocal] = useState<PortfolioCard[]>([])
  const [toast,      setToast]       = useState('')

  // Load portfolio from IndexedDB
  useEffect(() => {
    pkaDbGet<PortfolioCard[]>('portfolio').then(data => {
      if (data) setPortfolioLocal(data)
      else {
        try { const r=localStorage.getItem('pka_portfolio'); if(r) setPortfolioLocal(JSON.parse(r)) } catch {}
      }
    })
  }, [])

  const ownedKeys = useMemo(() => {
    const s = new Set<string>()
    portfolio.forEach(c => { if(c.setId && c.number) s.add(c.setId+'-'+c.number); s.add(c.name+'|'+c.set) })
    return s
  }, [portfolio])

  const isOwned = (card: EnrichedCard) => ownedKeys.has(card.setId+'-'+card.localId) || ownedKeys.has(card.name+'|'+card.setName)

  const addToPortfolio = async (card: EnrichedCard) => {
    const newCard: PortfolioCard = {
      id: 'enc_'+Date.now()+'-'+Math.random().toString(36).slice(2,6),
      name: card.name, set: card.setName, setId: card.setId,
      number: card.localId, rarity: card.rarity||'',
      type: 'fire', lang: lang, condition: 'Raw', graded: false,
      buyPrice: 0, curPrice: 0, qty: 1, year: card.year,
      image: card.image || card.enImage || '',
      setTotal: allCards.filter(c=>c.setId===card.setId).length,
    }
    const updated = [...portfolio, newCard]
    setPortfolioLocal(updated)
    await pkaDbSet('portfolio', updated)
    try { const slim = updated.map(c => c.image&&c.image.startsWith('data:')?{...c,image:''}:c); localStorage.setItem('pka_portfolio', JSON.stringify(slim)) } catch {}
    setToast(card.name + ' ajout""" + EA + """')
    setTimeout(() => setToast(''), 2000)
  }

  const showToast = (msg:string) => { setToast(msg); setTimeout(()=>setToast(''), 2000) }"""
assert old_state in s, "CIBLE STATE"
s = s.replace(old_state, new_state, 1)
print('  > state portfolio + toast + addToPortfolio')

# 3. Remplacer le bouton qui redirige par un ajout direct
old_btn = """                    <button onClick={()=>{
                      if (detail && selCard) {
                        const toAdd = {
                          id: 'enc_'+Date.now(),
                          name: detail.name,
                          set: selCard.setName,
                          setId: selCard.setId,
                          number: detail.localId ?? selCard.localId,
                          rarity: detail.rarity ?? '',
                          type: detail.types?.[0] ?? 'normal',
                          hp: detail.hp,
                          year: selCard.year,
                          lang,
                          image: detail.image ?? selCard.image ?? selCard.enImage ?? '',
                          enName: selCard.enName,
                        }
                        const setTotal = allCards.filter(c=>c.setId===selCard?.setId).length
                        localStorage.setItem('pka_add_card', JSON.stringify({...toAdd, setTotal}))
                      }
                      router.push('/portfolio')
                    }} className="add-btn"
                      style={{ width:'100%', padding:'11px', borderRadius:'9px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', letterSpacing:'.02em' }}>
                      + Ajouter au portfolio
                    </button>"""

new_btn = """                    {selCard && isOwned(selCard) ? (
                      <div style={{ width:'100%', padding:'11px', borderRadius:'9px', background:'#EAF3DE', color:'#27500A', border:'none', fontSize:'12px', fontWeight:600, fontFamily:'var(--font-display)', letterSpacing:'.02em', textAlign:'center' as const, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#27500A" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                        Dans ma collection
                      </div>
                    ) : (
                      <button onClick={()=>{ if(selCard) addToPortfolio(selCard) }} className="add-btn"
                        style={{ width:'100%', padding:'11px', borderRadius:'9px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', letterSpacing:'.02em' }}>
                        + Ajouter au portfolio
                      </button>
                    )}"""

assert old_btn in s, "CIBLE BTN"
s = s.replace(old_btn, new_btn, 1)
print('  > add direct button')

# 4. Check vert sur les cartes dans la grille
old_grid_card = """                      onClick={()=>handleCardClick(card.id)}"""
# Il y a 2 occurrences (grid + list), on veut la premiere (grid)
idx_grid = s.find(old_grid_card)
if idx_grid > 0:
    # Ajouter le check vert apres le onClick dans la grid card
    old_grid_flag = """                          <span style={{ fontSize:'14px' }}>{card.era==='Original (WotC)'"""
    # Chercher le bon endroit — le flag de langue dans la grid
    # Ajouter le check juste avant la fermeture du div image
    old_img_close = """                      </div>
                      <div style={{ padding:cfg.pad }}>"""
    idx_first = s.find(old_img_close)
    if idx_first > 0:
        check_overlay = """                        {isOwned(card)&&<div style={{ position:'absolute', top:'6px', right:'6px', width:'20px', height:'20px', borderRadius:'50%', background:'#27500A', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg></div>}
"""
        s = s[:idx_first] + check_overlay + s[idx_first:]
        print('  > check vert grid')

# 5. Toast notification
old_lightbox = "      {/* ── LIGHTBOX ── */}"
toast_html = """      {/* TOAST */}
      {toast&&<div style={{ position:'fixed', bottom:'80px', left:'50%', transform:'translateX(-50%)', background:'#1D1D1F', color:'#fff', padding:'10px 20px', borderRadius:'99px', fontSize:'13px', fontWeight:500, fontFamily:'var(--font-display)', zIndex:60, boxShadow:'0 8px 24px rgba(0,0,0,.15)', animation:'fadeUp .2s ease-out' }}>{toast}</div>}

      {/* ── LIGHTBOX ── */}"""
assert old_lightbox in s, "CIBLE LIGHTBOX"
s = s.replace(old_lightbox, toast_html, 1)
print('  > toast')

# ═══ #1: BROWSE PAR BLOCS ═══

# 6. Ajouter un state pour le mode browse
old_era_state = "  const [filEra,     setFilEra]      = useState('all')"
new_era_state = """  const [filEra,     setFilEra]      = useState('all')
  const [browseMode, setBrowseMode]  = useState<'all'|'bloc'>('all')
  const [selBloc,    setSelBloc]     = useState<string|null>(null)"""
assert old_era_state in s, "CIBLE ERA STATE"
s = s.replace(old_era_state, new_era_state, 1)
print('  > browse state')

# 7. Calculer les blocs depuis les donnees statiques
old_eras = "  const eras = useMemo(() =>"
new_eras = """  const blocs = useMemo(() => {
    const map = new Map<string, {name:string; sets: {id:string;name:string;count:number;logo?:string}[]; total:number}>()
    allCards.forEach(c => {
      const era = c.era
      if (!map.has(era)) map.set(era, { name:era, sets:[], total:0 })
      const b = map.get(era)!
      b.total++
      if (!b.sets.find(s=>s.id===c.setId)) b.sets.push({ id:c.setId, name:c.setName, count:0 })
      const st = b.sets.find(s=>s.id===c.setId)!
      st.count++
    })
    return [...map.entries()]
      .sort((a,b)=>ERA_ORDER.indexOf(a[0])-ERA_ORDER.indexOf(b[0]))
      .map(([,v])=>v)
  }, [allCards])

  const eras = useMemo(() =>"""
assert old_eras in s, "CIBLE ERAS"
s = s.replace(old_eras, new_eras, 1)
print('  > blocs computed')

# 8. Ajouter le browse blocs UI avant la grille
old_top_pagination = """          {!loading && !loadErr && pageCount>1 && (
            <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'5px', marginBottom:'12px' }}>"""

bloc_ui = """          {/* Browse mode toggle */}
          {!loading && !loadErr && (
            <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
              <button onClick={()=>{setBrowseMode('all');setSelBloc(null);setFilSet('all');setFilEra('all');setPage(0)}}
                style={{ padding:'6px 14px', borderRadius:'99px', border:'1px solid '+(browseMode==='all'?'#1D1D1F':'#E5E5EA'), background:browseMode==='all'?'#1D1D1F':'#fff', color:browseMode==='all'?'#fff':'#86868B', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                Toutes les cartes
              </button>
              <button onClick={()=>{setBrowseMode('bloc');setSelBloc(null);setFilSet('all');setPage(0)}}
                style={{ padding:'6px 14px', borderRadius:'99px', border:'1px solid '+(browseMode==='bloc'?'#1D1D1F':'#E5E5EA'), background:browseMode==='bloc'?'#1D1D1F':'#fff', color:browseMode==='bloc'?'#fff':'#86868B', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                Par blocs
              </button>
            </div>
          )}

          {/* Bloc browser */}
          {browseMode==='bloc'&&!selBloc&&!loading&&(
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'12px', marginBottom:'20px' }}>
              {blocs.map(b=>(
                <div key={b.name} onClick={()=>{setSelBloc(b.name);setFilEra(b.name);setPage(0)}}
                  style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'12px', padding:'16px', cursor:'pointer', transition:'all .15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#1D1D1F';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.06)'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='#EBEBEB';e.currentTarget.style.boxShadow=''}}>
                  <div style={{ fontSize:'15px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)', marginBottom:'4px' }}>{b.name}</div>
                  <div style={{ fontSize:'11px', color:'#86868B', fontFamily:'var(--font-display)' }}>{b.sets.length} s""" + EA + """rie{b.sets.length>1?'s':''} {String.fromCharCode(183)} {b.total.toLocaleString()} cartes</div>
                  <div style={{ display:'flex', gap:'4px', marginTop:'10px', flexWrap:'wrap' }}>
                    {b.sets.slice(0,4).map(st=>(
                      <span key={st.id} style={{ fontSize:'9px', color:'#AEAEB2', background:'#F5F5F7', padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-display)' }}>{st.name}</span>
                    ))}
                    {b.sets.length>4&&<span style={{ fontSize:'9px', color:'#AEAEB2', padding:'2px 4px' }}>+{b.sets.length-4}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bloc selected — show series */}
          {browseMode==='bloc'&&selBloc&&!loading&&(
            <div style={{ marginBottom:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                <button onClick={()=>{setSelBloc(null);setFilEra('all');setFilSet('all');setPage(0)}}
                  style={{ background:'#F5F5F7', border:'none', borderRadius:'8px', padding:'6px 10px', cursor:'pointer', fontSize:'12px', color:'#48484A', fontFamily:'var(--font-display)', display:'flex', alignItems:'center', gap:'4px' }}>
                  {String.fromCharCode(8249)} Blocs
                </button>
                <span style={{ fontSize:'17px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)' }}>{selBloc}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'8px', marginBottom:'16px' }}>
                <div onClick={()=>{setFilSet('all');setPage(0)}}
                  style={{ padding:'10px 14px', borderRadius:'10px', border:'1px solid '+(filSet==='all'?'#1D1D1F':'#E5E5EA'), background:filSet==='all'?'#1D1D1F':'#fff', color:filSet==='all'?'#fff':'#48484A', fontSize:'12px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                  Toutes les s""" + EA + """ries ({blocs.find(b=>b.name===selBloc)?.total.toLocaleString()})
                </div>
                {blocs.find(b=>b.name===selBloc)?.sets.map(st=>(
                  <div key={st.id} onClick={()=>{setFilSet(st.id);setPage(0)}}
                    style={{ padding:'10px 14px', borderRadius:'10px', border:'1px solid '+(filSet===st.id?'#1D1D1F':'#E5E5EA'), background:filSet===st.id?'#1D1D1F':'#fff', color:filSet===st.id?'#fff':'#48484A', fontSize:'12px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .12s' }}>
                    {st.name} <span style={{ opacity:.5 }}>({st.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !loadErr && pageCount>1 && (
            <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'5px', marginBottom:'12px' }}>"""

assert old_top_pagination in s, "CIBLE PAGINATION"
s = s.replace(old_top_pagination, bloc_ui, 1)
print('  > browse blocs UI')

f.write_text(s, 'utf-8')
print('OK')
