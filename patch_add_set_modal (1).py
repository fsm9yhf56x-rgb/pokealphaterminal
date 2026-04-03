#!/usr/bin/env python3
"""Modal ajouter une serie complete — safe unicode"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. States
old_state = "const [importOpen,   setImportOpen]   = useState(false)"
if "addSetOpen" not in s:
    new_state = old_state + """
  const [addSetOpen,   setAddSetOpen]   = useState(false)
  const [addSetLang,   setAddSetLang]   = useState<'FR'|'EN'|'JP'>('FR')
  const [addSetId,     setAddSetId]     = useState('')
  const [addSetName,   setAddSetName]   = useState('')
  const [addSetCards,  setAddSetCards]  = useState<TCGCard[]>([])
  const [addSetLoading,setAddSetLoading]= useState(false)
  const [addSetSets,   setAddSetSets]   = useState<TCGSet[]>([])"""
    assert old_state in s
    s = s.replace(old_state, new_state, 1)
    print('  > states')
else:
    print('  > states deja presents')

# 2. Button click
old_click = "onClick={()=>{/* TODO: modal ajouter serie */showToast('Bient\u00f4t disponible')}}"
if old_click in s:
    s = s.replace(old_click, "onClick={()=>{setAddSetOpen(true);setAddSetCards([]);setAddSetId('');setAddSetName('')}}", 1)
    print('  > click')

# 3. Fetch effect
if "Fetch sets pour modal" not in s:
    old_mm = "  const mmDrag = useRef"
    new_mm = """  // -- Fetch sets pour modal ajouter serie --
  useEffect(() => {
    if (!addSetOpen) return
    fetchSets(addSetLang).then(sets => setAddSetSets(sets)).catch(() => {})
  }, [addSetOpen, addSetLang])

  const mmDrag = useRef"""
    assert old_mm in s
    s = s.replace(old_mm, new_mm, 1)
    print('  > fetch effect')

# 4. Modal JSX
old_welcome = "      {/* WELCOME */}"
if "{/* ADD SET MODAL */}" not in s:
    # Build modal string with explicit unicode chars
    e_accent = '\u00e9'
    e_grave = '\u00e8'
    a_grave = '\u00e0'
    c_cedilla = '\u00e7'
    ja = '\u65e5\u672c\u8a9e'
    check = '\u2713'
    
    modal = '      {/* ADD SET MODAL */}\n'
    modal += '      {addSetOpen&&(\n'
    modal += "        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px' }}\n"
    modal += '          onClick={()=>setAddSetOpen(false)}>\n'
    modal += "          <div style={{ background:'#fff',borderRadius:'20px',border:'1px solid #E5E5EA',boxShadow:'0 24px 60px rgba(0,0,0,.15)',padding:'24px',maxWidth:'480px',width:'100%',animation:'fadeUp .25s ease-out' }}\n"
    modal += '            onClick={e=>e.stopPropagation()}>\n'
    modal += "            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px' }}>\n"
    modal += '              <div>\n'
    modal += f"                <div style={{{{ fontSize:'17px',fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)' }}}}>Ajouter une s{e_accent}rie compl{e_grave}te</div>\n"
    modal += f"                <div style={{{{ fontSize:'10px',marginTop:'3px',color:'#AEAEB2',fontWeight:500 }}}}>Toutes les cartes seront ajout{e_accent}es en Raw</div>\n"
    modal += '              </div>\n'
    modal += "              <button onClick={()=>setAddSetOpen(false)} style={{ width:'28px',height:'28px',borderRadius:'50%',background:'#F0F0F5',border:'none',color:'#86868B',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>\n"
    modal += """                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>\n"""
    modal += '              </button>\n'
    modal += '            </div>\n'
    # Langue
    modal += "            <div style={{ marginBottom:'14px' }}>\n"
    modal += f"              <div style={{{{ fontSize:'10px',fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'6px' }}}}>Langue</div>\n"
    modal += "              <div style={{ display:'flex',gap:'6px' }}>\n"
    modal += f"                {{([{{k:'FR' as const,flag:'\\u{{1F1EB}}\\u{{1F1F7}}',label:'Fran{c_cedilla}ais'}},{{k:'EN' as const,flag:'\\u{{1F1FA}}\\u{{1F1F8}}',label:'English'}},{{k:'JP' as const,flag:'\\u{{1F1EF}}\\u{{1F1F5}}',label:'{ja}'}}]).map(l=>(\n"
    modal += "                  <button key={l.k} onClick={()=>{setAddSetLang(l.k);setAddSetCards([]);setAddSetId('');setAddSetName('')}}\n"
    modal += "                    style={{ flex:1,padding:'10px 8px',borderRadius:'10px',border:`1.5px solid ${addSetLang===l.k?'#1D1D1F':'#E5E5EA'}`,background:addSetLang===l.k?'#1D1D1F':'#fff',color:addSetLang===l.k?'#fff':'#86868B',fontSize:'12px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',transition:'all .15s' }}>\n"
    modal += "                    <span style={{ fontSize:'16px' }}>{l.flag}</span>{l.label}\n"
    modal += '                  </button>\n'
    modal += '                ))}\n'
    modal += '              </div>\n'
    modal += '            </div>\n'
    # Serie select
    modal += "            <div style={{ marginBottom:'14px' }}>\n"
    modal += f"              <div style={{{{ fontSize:'10px',fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'6px' }}}}>S{e_accent}rie</div>\n"
    modal += '              <select value={addSetId} onChange={e=>{\n'
    modal += '                const found=addSetSets.find(x=>x.id===e.target.value)\n'
    modal += '                if(!found) return\n'
    modal += '                setAddSetId(found.id)\n'
    modal += '                setAddSetName(found.name)\n'
    modal += '                setAddSetLoading(true)\n'
    modal += '                setAddSetCards([])\n'
    modal += '                fetchCardsForSet(addSetLang,found.id).then(cards=>{setAddSetCards(cards);setAddSetLoading(false)}).catch(()=>setAddSetLoading(false))\n'
    modal += '              }}\n'
    modal += "                style={{ width:'100%',appearance:'none' as const,background:'#F5F5F7',borderRadius:'10px',border:'1px solid #E5E5EA',padding:'10px 36px 10px 12px',color:addSetId?'#1D1D1F':'#AEAEB2',fontSize:'13px',fontFamily:'var(--font-display)',outline:'none',cursor:'pointer' }}>\n"
    modal += f"                <option value=''>S{e_accent}lectionner une s{e_accent}rie...</option>\n"
    modal += "                {addSetSets.map(ls=>(\n"
    modal += "                  <option key={ls.id} value={ls.id} style={{background:'#fff',color:'#1D1D1F'}}>{ls.name}{ls.total?' ('+ls.total+')':''}</option>\n"
    modal += '                ))}\n'
    modal += '              </select>\n'
    modal += '            </div>\n'
    # Loading
    modal += '            {addSetLoading&&(\n'
    modal += "              <div style={{ textAlign:'center',padding:'20px 0',color:'#86868B',fontSize:'12px',fontFamily:'var(--font-display)' }}>\n"
    modal += "                <div style={{ width:'20px',height:'20px',border:'2px solid #E5E5EA',borderTop:'2px solid #1D1D1F',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 8px' }}/>\n"
    modal += '                Chargement des cartes...\n'
    modal += '              </div>\n'
    modal += '            )}\n'
    # Preview + button
    modal += '            {addSetCards.length>0&&!addSetLoading&&(()=>{\n'
    modal += "              const existingNums = new Set(portfolio.filter(c=>c.set===addSetName).map(c=>c.number))\n"
    modal += "              const alreadyOwned = addSetCards.filter(c=>existingNums.has(c.localId||'')).length\n"
    modal += '              const toAdd = addSetCards.length - alreadyOwned\n'
    modal += '              return (\n'
    modal += '                <div>\n'
    modal += "                  <div style={{ background:'#F5F5F7',borderRadius:'12px',padding:'14px',marginBottom:'14px' }}>\n"
    modal += "                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px' }}>\n"
    modal += "                      <span style={{ fontSize:'14px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)' }}>{addSetCards.length} cartes</span>\n"
    modal += f"                      {{alreadyOwned>0&&<span style={{{{ fontSize:'11px',color:'#86868B' }}}}>dont {{alreadyOwned}} d{e_accent}j{a_grave} poss{e_accent}d{e_accent}es</span>}}\n"
    modal += '                    </div>\n'
    modal += "                    <div style={{ height:'6px',borderRadius:'3px',background:'#E8E8ED',overflow:'hidden',marginBottom:'10px' }}>\n"
    modal += "                      <div style={{ width:addSetCards.length>0?Math.round(alreadyOwned/addSetCards.length*100)+'%':'0%',height:'100%',background:'linear-gradient(90deg,#ff6b35,#ff4433)',borderRadius:'3px',transition:'width .3s' }}/>\n"
    modal += '                    </div>\n'
    modal += "                    <div style={{ display:'flex',gap:'16px',fontSize:'11px' }}>\n"
    modal += f"                      {{alreadyOwned>0&&<span style={{{{ color:'#2E9E6A',fontWeight:500 }}}}>{{String.fromCharCode(10003)}} {{alreadyOwned}} conserv{e_accent}es</span>}}\n"
    modal += "                      <span style={{ color:'#0C447C',fontWeight:500 }}>+ {toAdd} nouvelles</span>\n"
    modal += '                    </div>\n'
    modal += '                  </div>\n'
    # Add button
    modal += '                  <button onClick={()=>{\n'
    modal += f"                    if(toAdd===0){{ showToast('Set d{e_accent}j{a_grave} complet'); return }}\n"
    modal += '                    const newCards: CardItem[] = addSetCards\n'
    modal += "                      .filter(c=>!existingNums.has(c.localId||''))\n"
    modal += '                      .map(c=>({\n'
    modal += "                        id:'u'+Date.now()+'-'+Math.random().toString(36).slice(2,8),\n"
    modal += '                        name:c.name, set:addSetName, year:new Date().getFullYear(),\n'
    modal += "                        number:c.localId||'', rarity:c.rarity||'',\n"
    modal += "                        type:'fire', lang:addSetLang,\n"
    modal += "                        condition:'Raw', graded:false,\n"
    modal += '                        buyPrice:0, curPrice:0, qty:1,\n'
    modal += "                        image:c.image||undefined,\n"
    modal += '                        setId:addSetId, setTotal:addSetCards.length,\n'
    modal += '                      }))\n'
    modal += '                    setPortfolio(prev=>[...prev,...newCards])\n'
    modal += '                    setAddSetOpen(false)\n'
    modal += f"                    showToast(toAdd+' cartes ajout{e_accent}es')\n"
    modal += '                  }}\n'
    modal += "                    style={{ width:'100%',padding:'13px',borderRadius:'11px',background:'#1D1D1F',color:'#fff',border:'none',fontSize:'14px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}\n"
    modal += "                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.15)'}}\n"
    modal += "                    onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}>\n"
    modal += f"                    {{toAdd>0?'Ajouter les '+toAdd+' cartes manquantes':'Set d{e_accent}j{a_grave} complet'}}\n"
    modal += '                  </button>\n'
    modal += '                </div>\n'
    modal += '              )\n'
    modal += '            })()}\n'
    modal += '          </div>\n'
    modal += '        </div>\n'
    modal += '      )}\n\n'
    modal += '      {/* WELCOME */}'
    
    assert old_welcome in s, "CIBLE WELCOME"
    s = s.replace(old_welcome, modal, 1)
    print('  > modal JSX')

f.write_text(s, 'utf-8')
print('OK')
