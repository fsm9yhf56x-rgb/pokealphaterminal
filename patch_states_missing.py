#!/usr/bin/env python3
from pathlib import Path

EA = '\u00e9'
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

old = "  const [page,       setPage]        = useState(0)"
new = """  const [page,       setPage]        = useState(0)
  const [portfolio,  setPortfolioLocal] = useState<PortfolioCard[]>([])
  const [toast,      setToast]       = useState('')

  useEffect(() => {
    pkaDbGet<PortfolioCard[]>('portfolio').then(data => {
      if (data) setPortfolioLocal(data)
      else { try { const r=localStorage.getItem('pka_portfolio'); if(r) setPortfolioLocal(JSON.parse(r)) } catch {} }
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
  }"""

assert old in s, "CIBLE"
# Verifier qu'on n'a pas deja ajoute
if 'setPortfolioLocal' not in s:
    s = s.replace(old, new, 1)
    print('  > states added')
else:
    print('  > states already present')

# Ajouter le bouton direct + check vert si pas deja fait
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
                      <div style={{ width:'100%', padding:'11px', borderRadius:'9px', background:'#EAF3DE', color:'#27500A', border:'none', fontSize:'12px', fontWeight:600, fontFamily:'var(--font-display)', textAlign:'center' as const, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#27500A" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                        Dans ma collection
                      </div>
                    ) : (
                      <button onClick={()=>{ if(selCard) addToPortfolio(selCard) }} className="add-btn"
                        style={{ width:'100%', padding:'11px', borderRadius:'9px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', letterSpacing:'.02em' }}>
                        + Ajouter au portfolio
                      </button>
                    )}"""

if old_btn in s:
    s = s.replace(old_btn, new_btn, 1)
    print('  > add direct button')

# Check vert overlay
old_img_close = """                      </div>
                      <div style={{ padding:cfg.pad }}>"""
if 'isOwned(card)' not in s and old_img_close in s:
    idx = s.find(old_img_close)
    check = """                        {isOwned(card)&&<div style={{ position:'absolute', top:'6px', right:'6px', width:'20px', height:'20px', borderRadius:'50%', background:'#27500A', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg></div>}
"""
    s = s[:idx] + check + s[idx:]
    print('  > check vert')

f.write_text(s, 'utf-8')
print('OK')
