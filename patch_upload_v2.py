#!/usr/bin/env python3
"""Upload v2 — modale visuelle step-by-step, depuis l'etat actuel"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. State — remplacer uploadCardId par uploadModal
old_state = "const [uploadCardId, setUploadCardId] = useState<string|null>(null)"
new_state = """const uploadRef = useRef<HTMLInputElement|null>(null)
  const uploadTargetId = useRef<string|null>(null)
  const [uploadModal, setUploadModal] = useState<{
    open:boolean; preview:string|null;
    checks:{label:string;status:'pending'|'checking'|'pass'|'fail';detail?:string}[];
    done:boolean; success:boolean
  }>({ open:false, preview:null, checks:[], done:false, success:false })"""
assert old_state in s, "CIBLE STATE"
s = s.replace(old_state, new_state, 1)
print('  > state')

# 2. handleImageUpload — remplacer par triggerUpload + runUploadChecks
old_handler = """const handleImageUpload = (cardId: string, file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setPortfolio(prev => prev.map(c => c.id === cardId ? { ...c, image: dataUrl } : c))
      if (spotCard?.id === cardId) setSpotCard(prev => prev ? { ...prev, image: dataUrl } : null)
      showToast('Illustration ajoutee')
    }
    reader.readAsDataURL(file)
  }"""
new_handler = r"""const triggerUpload = (cardId: string) => {
    uploadTargetId.current = cardId
    uploadRef.current?.click()
  }
  const runUploadChecks = async (file: File, cardId: string) => {
    const preview = URL.createObjectURL(file)
    const checks: {label:string;status:'pending'|'checking'|'pass'|'fail';detail?:string}[] = [
      { label:'Format du fichier', status:'pending' },
      { label:'Taille du fichier', status:'pending' },
      { label:'Dimensions', status:'pending' },
      { label:'Orientation portrait', status:'pending' },
    ]
    setUploadModal({ open:true, preview, checks:[...checks], done:false, success:false })
    const delay = (ms:number) => new Promise(r=>setTimeout(r,ms))
    const update = (i:number, st:'checking'|'pass'|'fail', detail?:string) => {
      checks[i] = { ...checks[i], status:st, detail }
      setUploadModal(p=>({ ...p, checks:[...checks] }))
    }
    let ok = true
    update(0,'checking'); await delay(400)
    if(['image/jpeg','image/png','image/webp'].includes(file.type)){
      update(0,'pass',file.type.replace('image/','').toUpperCase())
    } else { update(0,'fail','Format: '+file.type); ok=false }
    update(1,'checking'); await delay(350)
    const mb = file.size/1024/1024
    if(mb<=10){ update(1,'pass',mb.toFixed(1)+' Mo') }
    else { update(1,'fail',mb.toFixed(1)+' Mo (max 10)'); ok=false }
    update(2,'checking')
    const img = new Image()
    try {
      await new Promise<void>((res,rej)=>{ img.onload=()=>res(); img.onerror=()=>rej(); img.src=preview })
      await delay(400)
      if(img.width>=300&&img.height>=400){ update(2,'pass',img.width+'x'+img.height+' px') }
      else { update(2,'fail',img.width+'x'+img.height+' px (min 300x400)'); ok=false }
      update(3,'checking'); await delay(300)
      if(img.height>=img.width){ update(3,'pass','Portrait') }
      else { update(3,'fail','Paysage detecte'); ok=false }
    } catch { update(2,'fail','Lecture impossible'); update(3,'fail','—'); ok=false }
    await delay(300)
    if(ok){
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setPortfolio(prev=>prev.map(c=>c.id===cardId?{...c,image:dataUrl}:c))
        if(spotCard?.id===cardId) setSpotCard(prev=>prev?{...prev,image:dataUrl}:null)
        setUploadModal(p=>({...p,done:true,success:true}))
      }
      reader.readAsDataURL(file)
    } else { setUploadModal(p=>({...p,done:true,success:false})) }
  }"""
assert old_handler in s, "CIBLE HANDLER"
s = s.replace(old_handler, new_handler, 1)
print('  > runUploadChecks')

# 3. Binder button — setUploadCardId -> triggerUpload
s = s.replace("e.stopPropagation();setUploadCardId(card.id)", "e.stopPropagation();triggerUpload(card.id)")
print('  > binder btn')

# 4. Spotlight button — setUploadCardId -> triggerUpload
s = s.replace("setUploadCardId(spotCard.id)", "triggerUpload(spotCard.id)")
print('  > spotlight btn')

# 5. Supprimer toute la modale guidelines (uploadCardId&&)
modal_start = s.find("{uploadCardId&&(")
if modal_start > 0:
    # Trouver la fin — chercher le closing correspondant
    # La modale se termine par ")}\n\n      {/* ── WELCOME"
    modal_end_marker = "      {/* ── WELCOME ── */}"
    modal_end = s.find(modal_end_marker, modal_start)
    assert modal_end > modal_start, "FIN MODALE"
    s = s[:modal_start] + """      {/* ── UPLOAD INPUT + MODALE ── */}
      <input ref={el=>{uploadRef.current=el}} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }}
        onChange={e=>{ const fi=e.target.files?.[0]; if(fi&&uploadTargetId.current) runUploadChecks(fi,uploadTargetId.current); if(uploadRef.current) uploadRef.current.value='' }}/>
      {uploadModal.open&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',backdropFilter:'blur(4px)' }}
          onClick={()=>{if(uploadModal.done)setUploadModal(p=>({...p,open:false}))}}>
          <div style={{ maxWidth:'380px',width:'100%',background:'#fff',borderRadius:'20px',border:'1px solid #E5E5EA',boxShadow:'0 24px 60px rgba(0,0,0,.18)',overflow:'hidden',animation:'fadeUp .25s ease-out' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex',justifyContent:'center',padding:'20px 20px 0' }}>
              {uploadModal.preview&&(
                <div style={{ width:'100px',aspectRatio:'63/88',borderRadius:'10px',overflow:'hidden',border:`1px solid ${uploadModal.done?(uploadModal.success?'#BBF7D0':'#FECACA'):'#E5E5EA'}`,boxShadow:'0 4px 16px rgba(0,0,0,.08)',transition:'border-color .3s' }}>
                  <img src={uploadModal.preview} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                </div>
              )}
            </div>
            <div style={{ padding:'14px 20px' }}>
              <div style={{ fontSize:'14px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)',marginBottom:'12px',textAlign:'center' }}>
                {uploadModal.done?(uploadModal.success?'Illustration validee':'Illustration rejetee'):'Verification en cours...'}
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:'6px' }}>
                {uploadModal.checks.map((c,i)=>(
                  <div key={i} style={{ display:'flex',alignItems:'center',gap:'10px',padding:'7px 10px',borderRadius:'8px',background:c.status==='fail'?'#FEF2F2':c.status==='pass'?'#F0FDF4':'#F5F5F7',border:`1px solid ${c.status==='fail'?'#FECACA':c.status==='pass'?'#BBF7D0':'#E5E5EA'}`,transition:'all .3s' }}>
                    <div style={{ width:'18px',height:'18px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:c.status==='checking'?'#D2D2D7':c.status==='pass'?'#2E9E6A':c.status==='fail'?'#E03020':'#E5E5EA',transition:'all .3s' }}>
                      {c.status==='checking'?<div style={{ width:'10px',height:'10px',border:'2px solid #fff',borderTop:'2px solid transparent',borderRadius:'50%',animation:'spin .6s linear infinite' }}/>
                      :c.status==='pass'?<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                      :c.status==='fail'?<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      :<div style={{ width:'6px',height:'6px',borderRadius:'50%',background:'#C7C7CC' }}/>}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:'11px',fontWeight:600,color:c.status==='fail'?'#991B1B':'#1D1D1F',fontFamily:'var(--font-display)' }}>{c.label}</div>
                      {c.detail&&<div style={{ fontSize:'9px',color:c.status==='fail'?'#DC2626':'#86868B',fontFamily:'var(--font-data)' }}>{c.detail}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {uploadModal.done&&(
              <div style={{ padding:'0 20px 16px',display:'flex',gap:'8px' }}>
                {uploadModal.success?(
                  <button onClick={()=>setUploadModal(p=>({...p,open:false}))} style={{ flex:1,padding:'12px',borderRadius:'10px',background:'#2E9E6A',color:'#fff',border:'none',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'var(--font-display)' }}>Fermer</button>
                ):(
                  <>
                    <button onClick={()=>{setUploadModal(p=>({...p,open:false}));setTimeout(()=>uploadRef.current?.click(),150)}} style={{ flex:1,padding:'12px',borderRadius:'10px',background:'#1D1D1F',color:'#fff',border:'none',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'var(--font-display)' }}>Reessayer</button>
                    <button onClick={()=>setUploadModal(p=>({...p,open:false}))} style={{ padding:'12px 18px',borderRadius:'10px',background:'#F5F5F7',color:'#6E6E73',border:'1px solid #E5E5EA',fontSize:'13px',cursor:'pointer',fontFamily:'var(--font-display)' }}>Annuler</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

""" + s[modal_end:]
    print('  > modale guidelines -> modale visuelle')

# 6. @keyframes spin
if "@keyframes spin" not in s:
    s = s.replace("@keyframes scanPulse", "@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }\n        @keyframes scanPulse", 1)
    print('  > @keyframes spin')

f.write_text(s, 'utf-8')
print('OK — modale upload visuelle step-by-step')
