#!/usr/bin/env python3
"""Modal ajouter une serie complete"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. State pour le modal
old_state = "const [importOpen,   setImportOpen]   = useState(false)"
new_state = """const [importOpen,   setImportOpen]   = useState(false)
  const [addSetOpen,   setAddSetOpen]   = useState(false)
  const [addSetLang,   setAddSetLang]   = useState<'FR'|'EN'|'JP'>('FR')
  const [addSetId,     setAddSetId]     = useState('')
  const [addSetName,   setAddSetName]   = useState('')
  const [addSetCards,  setAddSetCards]  = useState<TCGCard[]>([])
  const [addSetLoading,setAddSetLoading]= useState(false)"""
assert old_state in s, "CIBLE STATE"
s = s.replace(old_state, new_state, 1)
print('  > states')

# 2. Remplacer le toast placeholder par l'ouverture du modal
old_click = "onClick={()=>{/* TODO: modal ajouter serie */showToast('Bient\\u00f4t disponible')}}"
new_click = "onClick={()=>{setAddSetOpen(true);setAddSetCards([]);setAddSetId('');setAddSetName('')}}"
assert old_click in s, "CIBLE CLICK"
s = s.replace(old_click, new_click, 1)
print('  > bouton click')

# 3. Le modal — avant le WELCOME
old_welcome = "      {/* WELCOME */}"
new_welcome = """      {/* ADD SET MODAL */}
      {addSetOpen&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px' }}
          onClick={()=>setAddSetOpen(false)}>
          <div style={{ background:'#fff',borderRadius:'20px',border:'1px solid #E5E5EA',boxShadow:'0 24px 60px rgba(0,0,0,.15)',padding:'24px',maxWidth:'480px',width:'100%',animation:'fadeUp .25s ease-out' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px' }}>
              <div>
                <div style={{ fontSize:'17px',fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)' }}>Ajouter une s\u00e9rie compl\u00e8te</div>
                <div style={{ fontSize:'10px',marginTop:'3px',color:'#AEAEB2',fontWeight:500 }}>Toutes les cartes seront ajout\u00e9es en Raw</div>
              </div>
              <button onClick={()=>setAddSetOpen(false)} style={{ width:'28px',height:'28px',borderRadius:'50%',background:'#F0F0F5',border:'none',color:'#86868B',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ marginBottom:'14px' }}>
              <div style={{ fontSize:'10px',fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'6px' }}>Langue</div>
              <div style={{ display:'flex',gap:'6px' }}>
                {([{k:'FR' as const,flag:'\u{1F1EB}\u{1F1F7}',label:'Fran\u00e7ais'},{k:'EN' as const,flag:'\u{1F1FA}\u{1F1F8}',label:'English'},{k:'JP' as const,flag:'\u{1F1EF}\u{1F1F5}',label:'\u65E5\u672C\u8A9E'}]).map(l=>(
                  <button key={l.k} onClick={()=>{setAddSetLang(l.k);setAddSetCards([]);setAddSetId('');setAddSetName('')}}
                    style={{ flex:1,padding:'10px 8px',borderRadius:'10px',border:`1.5px solid ${addSetLang===l.k?'#1D1D1F':'#E5E5EA'}`,background:addSetLang===l.k?'#1D1D1F':'#fff',color:addSetLang===l.k?'#fff':'#86868B',fontSize:'12px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',transition:'all .15s' }}>
                    <span style={{ fontSize:'16px' }}>{l.flag}</span>{l.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:'14px' }}>
              <div style={{ fontSize:'10px',fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'6px' }}>S\u00e9rie</div>
              <select value={addSetId} onChange={e=>{
                const found=liveSets.find(x=>x.id===e.target.value)
                if(!found) return
                setAddSetId(found.id)
                setAddSetName(found.name)
                setAddSetLoading(true)
                setAddSetCards([])
                fetchCardsForSet(addSetLang,found.id).then(cards=>{setAddSetCards(cards);setAddSetLoading(false)}).catch(()=>setAddSetLoading(false))
              }}
                style={{ width:'100%',appearance:'none',background:'#F5F5F7',borderRadius:'10px',border:'1px solid #E5E5EA',padding:'10px 36px 10px 12px',color:addSetId?'#1D1D1F':'#AEAEB2',fontSize:'13px',fontFamily:'var(--font-display)',outline:'none',cursor:'pointer' }}>
                <option value="">S\u00e9lectionner une s\u00e9rie...</option>
                {liveSets.map(ls=>(
                  <option key={ls.id} value={ls.id} style={{background:'#fff',color:'#1D1D1F'}}>{ls.name}{ls.total?' ('+ls.total+')':''}</option>
                ))}
              </select>
            </div>
            {addSetLoading&&(
              <div style={{ textAlign:'center',padding:'20px 0',color:'#86868B',fontSize:'12px',fontFamily:'var(--font-display)' }}>
                <div style={{ width:'20px',height:'20px',border:'2px solid #E5E5EA',borderTop:'2px solid #1D1D1F',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 8px' }}/>
                Chargement des cartes...
              </div>
            )}
            {addSetCards.length>0&&!addSetLoading&&(()=>{
              const existingNums = new Set(portfolio.filter(c=>c.set===addSetName).map(c=>c.number))
              const alreadyOwned = addSetCards.filter(c=>existingNums.has(c.localId||'')).length
              const toAdd = addSetCards.length - alreadyOwned
              return (
                <div>
                  <div style={{ background:'#F5F5F7',borderRadius:'12px',padding:'14px',marginBottom:'14px' }}>
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px' }}>
                      <span style={{ fontSize:'14px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)' }}>{addSetCards.length} cartes</span>
                      {alreadyOwned>0&&<span style={{ fontSize:'11px',color:'#86868B' }}>dont {alreadyOwned} d\u00e9j\u00e0 poss\u00e9d\u00e9es</span>}
                    </div>
                    <div style={{ height:'6px',borderRadius:'3px',background:'#E8E8ED',overflow:'hidden',marginBottom:'10px' }}>
                      <div style={{ width:addSetCards.length>0?Math.round(alreadyOwned/addSetCards.length*100)+'%':'0%',height:'100%',background:'linear-gradient(90deg,#ff6b35,#ff4433)',borderRadius:'3px',transition:'width .3s' }}/>
                    </div>
                    <div style={{ display:'flex',gap:'16px',fontSize:'11px' }}>
                      {alreadyOwned>0&&<span style={{ color:'#2E9E6A',fontWeight:500 }}>\u2713 {alreadyOwned} conserv\u00e9es</span>}
                      <span style={{ color:'#0C447C',fontWeight:500 }}>+ {toAdd} nouvelles</span>
                    </div>
                  </div>
                  <button onClick={()=>{
                    if(toAdd===0){ showToast('Toutes les cartes sont d\u00e9j\u00e0 dans votre collection'); return }
                    const newCards: CardItem[] = addSetCards
                      .filter(c=>!existingNums.has(c.localId||''))
                      .map(c=>({
                        id:'u'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
                        name:c.name, set:addSetName, year:new Date().getFullYear(),
                        number:c.localId||'', rarity:c.rarity||'',
                        type:'fire', lang:addSetLang,
                        condition:'Raw', graded:false,
                        buyPrice:0, curPrice:0, qty:1,
                        image:c.image||undefined,
                        setId:addSetId, setTotal:addSetCards.length,
                      }))
                    setPortfolio(prev=>[...prev,...newCards])
                    setAddSetOpen(false)
                    showToast(toAdd+' cartes ajout\u00e9es \u00e0 '+addSetName)
                  }}
                    style={{ width:'100%',padding:'13px',borderRadius:'11px',background:'#1D1D1F',color:'#fff',border:'none',fontSize:'14px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.15)'}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}>
                    {toAdd>0?'Ajouter les '+toAdd+' cartes manquantes':'Set d\u00e9j\u00e0 complet'}
                  </button>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* WELCOME */}"""
assert old_welcome in s, "CIBLE WELCOME"
s = s.replace(old_welcome, new_welcome, 1)
print('  > modal')

f.write_text(s, 'utf-8')
print('OK')
