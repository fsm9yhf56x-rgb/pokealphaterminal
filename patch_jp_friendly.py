#!/usr/bin/env python3
"""JP user-friendly — affiche nom FR a cote des noms japonais"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Ajouter state pour les noms FR des sets (reference croisee)
old_state = "const [liveSets,    setLiveSets]    = useState<TCGSet[]>([])"
new_state = """const [frSetsMap,   setFrSetsMap]   = useState<Record<string,string>>({})
  const [liveSets,    setLiveSets]    = useState<TCGSet[]>([])"""
assert old_state in s, "CIBLE STATE NON TROUVEE"
s = s.replace(old_state, new_state, 1)
print('  > frSetsMap state')

# 2. Fetch FR sets au mount pour avoir la reference
old_welcome = """  // ── Welcome first visit ──"""
new_welcome = """  // ── FR sets reference (pour traduction JP) ──
  useEffect(() => {
    fetchSets('FR').then(sets => {
      const map: Record<string,string> = {}
      sets.forEach(set => { if(set.id) map[set.id] = set.name })
      setFrSetsMap(map)
    }).catch(() => {})
  }, [])

  // ── Welcome first visit ──"""
assert old_welcome in s, "CIBLE WELCOME NON TROUVEE"
s = s.replace(old_welcome, new_welcome, 1)
print('  > fetch FR sets au mount')

# 3. Set dropdown — afficher nom FR entre parentheses pour JP
old_dropdown = """{s.name}{s.total?' ('+s.total+')':''}"""
new_dropdown = """{s.name}{addForm.lang==='JP'&&frSetsMap[s.id]?' — '+frSetsMap[s.id]:''}{s.total?' ('+s.total+')':''}"""
assert old_dropdown in s, "CIBLE DROPDOWN NON TROUVEE"
s = s.replace(old_dropdown, new_dropdown, 1)
print('  > dropdown JP — FR')

# 4. Card suggestions — ajouter nom FR si dispo pour JP
# Les suggestions viennent de liveCards. On va aussi fetcher les noms FR des cartes.
# Plus simple: ajouter un state frCardsMap et le peupler quand on charge un set JP
old_cards_fetch = """if (id) {
      setCardsLoading(true)
      fetchCardsForSet(addForm.lang, id)
        .then(cards => { setLiveCards(cards); setCardsLoading(false) })
        .catch(() => setCardsLoading(false))
    }"""

new_cards_fetch = """if (id) {
      setCardsLoading(true)
      fetchCardsForSet(addForm.lang, id)
        .then(cards => { setLiveCards(cards); setCardsLoading(false) })
        .catch(() => setCardsLoading(false))
      // Fetch FR cards en parallele pour reference JP
      if (addForm.lang === 'JP') {
        fetchCardsForSet('FR', id)
          .then(frCards => {
            const map: Record<string,string> = {}
            frCards.forEach((c,i) => { if(c.name) map[c.name] = c.name })
            // Match par localId
            frCards.forEach(c => { if(c.localId && c.name) map['__id__'+c.localId] = c.name })
            setFrCardsMap(map)
          })
          .catch(() => {})
      }
    }"""

# This pattern appears twice (in handleSetChange and in useEffect for lang change)
# Replace first occurrence (handleSetChange)
idx = s.find(old_cards_fetch)
assert idx > 0, "CIBLE CARDS FETCH NON TROUVEE"
s = s[:idx] + new_cards_fetch + s[idx+len(old_cards_fetch):]
print('  > fetch FR cards parallele')

# 5. Ajouter frCardsMap state
old_cards_state = "const [cardsLoading,setCardsLoading]= useState(false)"
new_cards_state = """const [cardsLoading,setCardsLoading]= useState(false)
  const [frCardsMap,  setFrCardsMap]  = useState<Record<string,string>>({})"""
assert old_cards_state in s, "CIBLE CARDS STATE NON TROUVEE"
s = s.replace(old_cards_state, new_cards_state, 1)
print('  > frCardsMap state')

# 6. Suggestions display — montrer nom FR a cote du JP
old_sugg = """<div key={i} onMouseDown={()=>handleSuggSelect(s)}
                          style={{ padding:'9px 14px', fontSize:'13px', color:'#3A3A3C', fontFamily:'var(--font-display)', cursor:'pointer', borderBottom:i<addSuggs.length-1?'1px solid rgba(29,29,31,.05)':'none' }}
                          onMouseEnter={e=>(e.currentTarget.style.background='#F0F0F5')}
                          onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                          {s}
                        </div>"""

new_sugg = """<div key={i} onMouseDown={()=>handleSuggSelect(s)}
                          style={{ padding:'9px 14px', fontSize:'13px', color:'#3A3A3C', fontFamily:'var(--font-display)', cursor:'pointer', borderBottom:i<addSuggs.length-1?'1px solid rgba(29,29,31,.05)':'none', display:'flex', alignItems:'center', gap:'8px' }}
                          onMouseEnter={e=>(e.currentTarget.style.background='#F0F0F5')}
                          onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                          <span>{s}</span>
                          {addForm.lang==='JP'&&(()=>{
                            const lc=liveCards.find(c=>c.name===s)
                            const frName=lc?.localId?frCardsMap['__id__'+lc.localId]:null
                            return frName?<span style={{ fontSize:'11px', color:'#AEAEB2', fontStyle:'italic' }}>{frName}</span>:null
                          })()}
                        </div>"""
assert old_sugg in s, "CIBLE SUGG NON TROUVEE"
s = s.replace(old_sugg, new_sugg, 1)
print('  > suggestions JP + FR')

# 7. Shelf view — nom du set JP avec traduction FR
# Dans le shelf header, apres le setName
old_setname_display = """<span style={{ fontSize:'14px', fontWeight:700, color:isComplete?'#B8860B':'#1D1D1F', fontFamily:'var(--font-display)' }}>{setName}</span>"""
new_setname_display = """<span style={{ fontSize:'14px', fontWeight:700, color:isComplete?'#B8860B':'#1D1D1F', fontFamily:'var(--font-display)' }}>{setName}</span>
                                    {(()=>{ const sid=setCards.find(c=>c.setId)?.setId; return sid&&frSetsMap[sid]&&frSetsMap[sid]!==setName?<span style={{ fontSize:'10px', color:'#AEAEB2', fontWeight:400, marginLeft:'4px' }}>({frSetsMap[sid]})</span>:null })()}"""
assert old_setname_display in s, "CIBLE SETNAME NON TROUVEE"
s = s.replace(old_setname_display, new_setname_display, 1)
print('  > shelf set name + FR')

# 8. Card labels dans le shelf — nom FR en tooltip ou sous-titre pour JP
old_card_name_shelf = """<div style={{ fontSize:'11px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.name}</div>"""
# Il y a 1 occurrence dans le shelf view
idx_shelf = s.find(old_card_name_shelf)
if idx_shelf > 0:
    new_card_name_shelf = """<div style={{ fontSize:'11px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={card.lang==='JP'&&card.setId&&frCardsMap['__id__'+(card.number||'')]?frCardsMap['__id__'+card.number]:undefined}>{card.name}</div>"""
    s = s[:idx_shelf] + new_card_name_shelf + s[idx_shelf+len(old_card_name_shelf):]
    print('  > card name tooltip FR')

f.write_text(s, 'utf-8')
print('OK — JP user friendly avec traductions FR')
