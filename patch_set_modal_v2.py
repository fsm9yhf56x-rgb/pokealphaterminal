#!/usr/bin/env python3
"""Modal ajouter une serie complete — safe unicode v2"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

EA = '\u00e9'  # e accent
EG = '\u00e8'  # e grave
AG = '\u00e0'  # a grave
CC = '\u00e7'  # c cedilla
JA = '\u65e5\u672c\u8a9e'

# 1. States
if 'addSetOpen' not in s:
    old = "const [importOpen,   setImportOpen]   = useState(false)"
    s = s.replace(old, old + "\n  const [addSetOpen,   setAddSetOpen]   = useState(false)\n  const [addSetLang,   setAddSetLang]   = useState<'FR'|'EN'|'JP'>('FR')\n  const [addSetId,     setAddSetId]     = useState('')\n  const [addSetName,   setAddSetName]   = useState('')\n  const [addSetCards,  setAddSetCards]  = useState<TCGCard[]>([])\n  const [addSetLoading,setAddSetLoading]= useState(false)\n  const [addSetSets,   setAddSetSets]   = useState<TCGSet[]>([])", 1)
    print('  > states')

# 2. Button click
old_click = "onClick={()=>{/* TODO: modal ajouter serie */showToast('Bient" + '\u00f4' + "t disponible')}}"
if old_click in s:
    s = s.replace(old_click, "onClick={()=>{setAddSetOpen(true);setAddSetCards([]);setAddSetId('');setAddSetName('')}}", 1)
    print('  > click')

# 3. Fetch effect
if "Fetch sets pour modal" not in s:
    old_mm = "  const mmDrag = useRef"
    s = s.replace(old_mm, "  // -- Fetch sets pour modal ajouter serie --\n  useEffect(() => {\n    if (!addSetOpen) return\n    fetchSets(addSetLang).then(sets => setAddSetSets(sets)).catch(() => {})\n  }, [addSetOpen, addSetLang])\n\n  const mmDrag = useRef", 1)
    print('  > fetch effect')

# 4. Modal
old_welcome = "      {/* WELCOME */}"
if "{/* ADD SET MODAL */}" not in s:
    lines = []
    lines.append('      {/* ADD SET MODAL */}')
    lines.append('      {addSetOpen&&(')
    lines.append("        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px' }}")
    lines.append('          onClick={()=>setAddSetOpen(false)}>')
    lines.append("          <div style={{ background:'#fff',borderRadius:'20px',border:'1px solid #E5E5EA',boxShadow:'0 24px 60px rgba(0,0,0,.15)',padding:'24px',maxWidth:'480px',width:'100%',animation:'fadeUp .25s ease-out' }}")
    lines.append('            onClick={e=>e.stopPropagation()}>')
    lines.append("            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px' }}>")
    lines.append('              <div>')
    lines.append("                <div style={{ fontSize:'17px',fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)' }}>Ajouter une s" + EA + "rie compl" + EG + "te</div>")
    lines.append("                <div style={{ fontSize:'10px',marginTop:'3px',color:'#AEAEB2',fontWeight:500 }}>Toutes les cartes seront ajout" + EA + "es en Raw</div>")
    lines.append('              </div>')
    lines.append("              <button onClick={()=>setAddSetOpen(false)} style={{ width:'28px',height:'28px',borderRadius:'50%',background:'#F0F0F5',border:'none',color:'#86868B',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>")
    lines.append('                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>')
    lines.append('              </button>')
    lines.append('            </div>')
    lines.append("            <div style={{ marginBottom:'14px' }}>")
    lines.append("              <div style={{ fontSize:'10px',fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'6px' }}>Langue</div>")
    lines.append("              <div style={{ display:'flex',gap:'6px' }}>")
    lines.append("                {([{k:'FR' as const,flag:'\\u{1F1EB}\\u{1F1F7}',label:'Fran" + CC + "ais'},{k:'EN' as const,flag:'\\u{1F1FA}\\u{1F1F8}',label:'English'},{k:'JP' as const,flag:'\\u{1F1EF}\\u{1F1F5}',label:'" + JA + "'}]).map(l=>(")
    lines.append("                  <button key={l.k} onClick={()=>{setAddSetLang(l.k);setAddSetCards([]);setAddSetId('');setAddSetName('')}}")
    lines.append("                    style={{ flex:1,padding:'10px 8px',borderRadius:'10px',border:`1.5px solid ${addSetLang===l.k?'#1D1D1F':'#E5E5EA'}`,background:addSetLang===l.k?'#1D1D1F':'#fff',color:addSetLang===l.k?'#fff':'#86868B',fontSize:'12px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',transition:'all .15s' }}>")
    lines.append("                    <span style={{ fontSize:'16px' }}>{l.flag}</span>{l.label}")
    lines.append('                  </button>')
    lines.append('                ))}')
    lines.append('              </div>')
    lines.append('            </div>')
    lines.append("            <div style={{ marginBottom:'14px' }}>")
    lines.append("              <div style={{ fontSize:'10px',fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'6px' }}>S" + EA + "rie</div>")
    lines.append("              <select value={addSetId} onChange={e=>{")
    lines.append("                const found=addSetSets.find(x=>x.id===e.target.value)")
    lines.append("                if(!found) return")
    lines.append("                setAddSetId(found.id)")
    lines.append("                setAddSetName(found.name)")
    lines.append("                setAddSetLoading(true)")
    lines.append("                setAddSetCards([])")
    lines.append("                fetchCardsForSet(addSetLang,found.id).then(cards=>{setAddSetCards(cards);setAddSetLoading(false)}).catch(()=>setAddSetLoading(false))")
    lines.append('              }}')
    lines.append("                style={{ width:'100%',appearance:'none' as const,background:'#F5F5F7',borderRadius:'10px',border:'1px solid #E5E5EA',padding:'10px 36px 10px 12px',color:addSetId?'#1D1D1F':'#AEAEB2',fontSize:'13px',fontFamily:'var(--font-display)',outline:'none',cursor:'pointer' }}>")
    lines.append("                <option value=''>S" + EA + "lectionner une s" + EA + "rie...</option>")
    lines.append("                {addSetSets.map(ls=>(")
    lines.append("                  <option key={ls.id} value={ls.id} style={{background:'#fff',color:'#1D1D1F'}}>{ls.name}{ls.total?' ('+ls.total+')':''}</option>")
    lines.append('                ))}')
    lines.append('              </select>')
    lines.append('            </div>')
    lines.append('            {addSetLoading&&(')
    lines.append("              <div style={{ textAlign:'center',padding:'20px 0',color:'#86868B',fontSize:'12px',fontFamily:'var(--font-display)' }}>")
    lines.append("                <div style={{ width:'20px',height:'20px',border:'2px solid #E5E5EA',borderTop:'2px solid #1D1D1F',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 8px' }}/>")
    lines.append('                Chargement des cartes...')
    lines.append('              </div>')
    lines.append('            )}')
    lines.append('            {addSetCards.length>0&&!addSetLoading&&(()=>{')
    lines.append("              const existingNums = new Set(portfolio.filter(c=>c.set===addSetName).map(c=>c.number))")
    lines.append("              const alreadyOwned = addSetCards.filter(c=>existingNums.has(c.localId||'')).length")
    lines.append('              const toAdd = addSetCards.length - alreadyOwned')
    lines.append('              return (')
    lines.append('                <div>')
    lines.append("                  <div style={{ background:'#F5F5F7',borderRadius:'12px',padding:'14px',marginBottom:'14px' }}>")
    lines.append("                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px' }}>")
    lines.append("                      <span style={{ fontSize:'14px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)' }}>{addSetCards.length} cartes</span>")
    lines.append("                      {alreadyOwned>0&&<span style={{ fontSize:'11px',color:'#86868B' }}>dont {alreadyOwned} d" + EA + "j" + AG + " poss" + EA + "d" + EA + "es</span>}")
    lines.append('                    </div>')
    lines.append("                    <div style={{ height:'6px',borderRadius:'3px',background:'#E8E8ED',overflow:'hidden',marginBottom:'10px' }}>")
    lines.append("                      <div style={{ width:addSetCards.length>0?Math.round(alreadyOwned/addSetCards.length*100)+'%':'0%',height:'100%',background:'linear-gradient(90deg,#ff6b35,#ff4433)',borderRadius:'3px',transition:'width .3s' }}/>")
    lines.append('                    </div>')
    lines.append("                    <div style={{ display:'flex',gap:'16px',fontSize:'11px' }}>")
    lines.append("                      {alreadyOwned>0&&<span style={{ color:'#2E9E6A',fontWeight:500 }}>{String.fromCharCode(10003)} {alreadyOwned} conserv" + EA + "es</span>}")
    lines.append("                      <span style={{ color:'#0C447C',fontWeight:500 }}>+ {toAdd} nouvelles</span>")
    lines.append('                    </div>')
    lines.append('                  </div>')
    lines.append('                  <button onClick={()=>{')
    lines.append("                    if(toAdd===0){ showToast('Set d" + EA + "j" + AG + " complet'); return }")
    lines.append('                    const newCards: CardItem[] = addSetCards')
    lines.append("                      .filter(c=>!existingNums.has(c.localId||''))")
    lines.append('                      .map(c=>({')
    lines.append("                        id:'u'+Date.now()+'-'+Math.random().toString(36).slice(2,8),")
    lines.append("                        name:c.name, set:addSetName, year:new Date().getFullYear(),")
    lines.append("                        number:c.localId||'', rarity:c.rarity||'',")
    lines.append("                        type:'fire', lang:addSetLang,")
    lines.append("                        condition:'Raw', graded:false,")
    lines.append("                        buyPrice:0, curPrice:0, qty:1,")
    lines.append("                        image:c.image||undefined,")
    lines.append("                        setId:addSetId, setTotal:addSetCards.length,")
    lines.append('                      }))')
    lines.append('                    setPortfolio(prev=>[...prev,...newCards])')
    lines.append('                    setAddSetOpen(false)')
    lines.append("                    showToast(toAdd+' cartes ajout" + EA + "es')")
    lines.append('                  }}')
    lines.append("                    style={{ width:'100%',padding:'13px',borderRadius:'11px',background:'#1D1D1F',color:'#fff',border:'none',fontSize:'14px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}")
    lines.append("                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.15)'}}")
    lines.append("                    onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}>")
    lines.append("                    {toAdd>0?'Ajouter les '+toAdd+' cartes manquantes':'Set d" + EA + "j" + AG + " complet'}")
    lines.append('                  </button>')
    lines.append('                </div>')
    lines.append('              )')
    lines.append('            })()}')
    lines.append('          </div>')
    lines.append('        </div>')
    lines.append('      )}')
    lines.append('')
    lines.append('      {/* WELCOME */}')
    
    modal = '\n'.join(lines)
    assert old_welcome in s, "CIBLE WELCOME"
    s = s.replace(old_welcome, modal, 1)
    print('  > modal')

f.write_text(s, 'utf-8')
print('OK')
