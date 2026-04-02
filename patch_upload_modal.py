#!/usr/bin/env python3
"""Upload — modale visuelle avec validation step-by-step"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Remplacer les refs par un state complet pour la modale
old_refs = """const uploadRef = useRef<HTMLInputElement|null>(null)
  const uploadTargetId = useRef<string|null>(null)
  const [scannerOpen,  setScannerOpen]  = useState(false)"""
new_refs = """const uploadRef = useRef<HTMLInputElement|null>(null)
  const uploadTargetId = useRef<string|null>(null)
  const [uploadModal, setUploadModal] = useState<{
    open:boolean; cardId:string|null; preview:string|null; file:File|null;
    checks:{label:string;status:'pending'|'checking'|'pass'|'fail';detail?:string}[];
    done:boolean; success:boolean
  }>({ open:false, cardId:null, preview:null, file:null, checks:[], done:false, success:false })
  const [scannerOpen,  setScannerOpen]  = useState(false)"""
assert old_refs in s, "CIBLE REFS NON TROUVEE"
s = s.replace(old_refs, new_refs, 1)
print('  > uploadModal state')

# 2. Remplacer handleImageUpload par version avec modale
old_handler = """const triggerUpload = (cardId: string) => {
    uploadTargetId.current = cardId
    uploadRef.current?.click()
  }
  const handleImageUpload = (file: File) => {
    const cardId = uploadTargetId.current
    if (!cardId) return
    if (file.size > 10 * 1024 * 1024) { showToast('Fichier trop lourd (max 10 Mo)'); return }
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { showToast('Format non supporte (JPG, PNG ou WebP)'); return }
    const img = new Image()
    img.onload = () => {
      if (img.width < 300 || img.height < 400) { showToast('Image trop petite (min 300x400 px)'); return }
      if (img.width / img.height > 1) { showToast('L\\'image doit etre en portrait'); return }
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setPortfolio(prev => prev.map(c => c.id === cardId ? { ...c, image: dataUrl } : c))
        if (spotCard?.id === cardId) setSpotCard(prev => prev ? { ...prev, image: dataUrl } : null)
        showToast('Illustration ajoutee')
      }
      reader.readAsDataURL(file)
    }
    img.onerror = () => showToast('Impossible de lire l\\'image')
    img.src = URL.createObjectURL(file)
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
      { label:'Dimensions de l\'image', status:'pending' },
      { label:'Orientation portrait', status:'pending' },
    ]
    setUploadModal({ open:true, cardId, preview, file, checks:[...checks], done:false, success:false })
    const delay = (ms:number) => new Promise(r=>setTimeout(r,ms))
    const update = (i:number, status:'checking'|'pass'|'fail', detail?:string) => {
      checks[i] = { ...checks[i], status, detail }
      setUploadModal(p=>({ ...p, checks:[...checks] }))
    }
    let allPass = true
    // Check 1 — Format
    update(0,'checking')
    await delay(400)
    if(['image/jpeg','image/png','image/webp'].includes(file.type)){
      update(0,'pass',file.type.replace('image/','').toUpperCase())
    } else { update(0,'fail','Format: '+file.type); allPass=false }
    // Check 2 — Taille
    update(1,'checking')
    await delay(350)
    const sizeMb = (file.size/1024/1024)
    if(sizeMb<=10){
      update(1,'pass',sizeMb.toFixed(1)+' Mo')
    } else { update(1,'fail',sizeMb.toFixed(1)+' Mo (max 10 Mo)'); allPass=false }
    // Check 3 & 4 — Dimensions + Orientation
    update(2,'checking')
    const img = new Image()
    const imgLoaded = new Promise<HTMLImageElement>((res,rej)=>{ img.onload=()=>res(img); img.onerror=()=>rej() })
    img.src = preview
    try {
      const loaded = await imgLoaded
      await delay(400)
      if(loaded.width>=300&&loaded.height>=400){
        update(2,'pass',loaded.width+'x'+loaded.height+' px')
      } else { update(2,'fail',loaded.width+'x'+loaded.height+' px (min 300x400)'); allPass=false }
      update(3,'checking')
      await delay(300)
      if(loaded.height>=loaded.width){
        update(3,'pass','Portrait')
      } else { update(3,'fail','Paysage detecte'); allPass=false }
    } catch {
      update(2,'fail','Impossible de lire'); allPass=false
      update(3,'fail','—'); allPass=false
    }
    // Resultat
    await delay(300)
    if(allPass){
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setPortfolio(prev=>prev.map(c=>c.id===cardId?{...c,image:dataUrl}:c))
        if(spotCard?.id===cardId) setSpotCard(prev=>prev?{...prev,image:dataUrl}:null)
        setUploadModal(p=>({...p, done:true, success:true}))
      }
      reader.readAsDataURL(file)
    } else {
      setUploadModal(p=>({...p, done:true, success:false}))
    }
  }"""
assert "const triggerUpload" in s, "CIBLE HANDLER NON TROUVEE"
s = s.replace(old_handler, new_handler, 1)
print('  > runUploadChecks avec steps')

# 3. Input global — appeler runUploadChecks au lieu de handleImageUpload
old_input = """      {/* ── UPLOAD INPUT GLOBAL ── */}
      <input ref={el=>{uploadRef.current=el}} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }}
        onChange={e=>{ const fi=e.target.files?.[0]; if(fi) handleImageUpload(fi); if(uploadRef.current) uploadRef.current.value='' }}/>"""
new_input = """      {/* ── UPLOAD INPUT GLOBAL ── */}
      <input ref={el=>{uploadRef.current=el}} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }}
        onChange={e=>{ const fi=e.target.files?.[0]; if(fi&&uploadTargetId.current) runUploadChecks(fi, uploadTargetId.current); if(uploadRef.current) uploadRef.current.value='' }}/>

      {/* ── UPLOAD QUALITY MODAL ── */}
      {uploadModal.open&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',backdropFilter:'blur(4px)' }}
          onClick={()=>{if(uploadModal.done)setUploadModal(p=>({...p,open:false}))}}>
          <div style={{ maxWidth:'380px',width:'100%',background:'#fff',borderRadius:'20px',border:'1px solid #E5E5EA',boxShadow:'0 24px 60px rgba(0,0,0,.18)',overflow:'hidden',animation:'fadeUp .25s ease-out' }}
            onClick={e=>e.stopPropagation()}>
            {/* Preview */}
            <div style={{ display:'flex',justifyContent:'center',padding:'20px 20px 0' }}>
              {uploadModal.preview&&(
                <div style={{ width:'120px',aspectRatio:'63/88',borderRadius:'12px',overflow:'hidden',border:'1px solid #E5E5EA',boxShadow:'0 4px 16px rgba(0,0,0,.08)' }}>
                  <img src={uploadModal.preview} alt="preview" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                </div>
              )}
            </div>
            {/* Checks */}
            <div style={{ padding:'16px 20px' }}>
              <div style={{ fontSize:'14px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)',marginBottom:'14px',textAlign:'center' }}>
                {uploadModal.done?(uploadModal.success?'Illustration validee':'Illustration rejetee'):'Verification en cours...'}
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
                {uploadModal.checks.map((c,i)=>(
                  <div key={i} style={{ display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',borderRadius:'10px',background:c.status==='fail'?'#FEF2F2':c.status==='pass'?'#F0FDF4':'#F5F5F7',border:`1px solid ${c.status==='fail'?'#FECACA':c.status==='pass'?'#BBF7D0':'#E5E5EA'}`,transition:'all .3s' }}>
                    <div style={{ width:'20px',height:'20px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:c.status==='checking'?'#E5E5EA':c.status==='pass'?'#2E9E6A':c.status==='fail'?'#E03020':'#E5E5EA',transition:'all .3s' }}>
                      {c.status==='checking'?(
                        <div style={{ width:'12px',height:'12px',border:'2px solid #fff',borderTop:'2px solid transparent',borderRadius:'50%',animation:'spin .6s linear infinite' }}/>
                      ):c.status==='pass'?(
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                      ):c.status==='fail'?(
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      ):(
                        <div style={{ width:'8px',height:'8px',borderRadius:'50%',background:'#C7C7CC' }}/>
                      )}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'12px',fontWeight:600,color:c.status==='fail'?'#991B1B':'#1D1D1F',fontFamily:'var(--font-display)' }}>{c.label}</div>
                      {c.detail&&<div style={{ fontSize:'10px',color:c.status==='fail'?'#DC2626':'#86868B',marginTop:'1px',fontFamily:'var(--font-data)' }}>{c.detail}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Actions */}
            {uploadModal.done&&(
              <div style={{ padding:'0 20px 20px',display:'flex',gap:'8px' }}>
                {uploadModal.success?(
                  <button onClick={()=>setUploadModal(p=>({...p,open:false}))} style={{ flex:1,padding:'13px',borderRadius:'12px',background:'#2E9E6A',color:'#fff',border:'none',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'var(--font-display)' }}>
                    Fermer
                  </button>
                ):(
                  <>
                    <button onClick={()=>{setUploadModal(p=>({...p,open:false}));setTimeout(()=>uploadRef.current?.click(),100)}} style={{ flex:1,padding:'13px',borderRadius:'12px',background:'#1D1D1F',color:'#fff',border:'none',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'var(--font-display)' }}>
                      Reessayer
                    </button>
                    <button onClick={()=>setUploadModal(p=>({...p,open:false}))} style={{ padding:'13px 20px',borderRadius:'12px',background:'#F5F5F7',color:'#6E6E73',border:'1px solid #E5E5EA',fontSize:'13px',cursor:'pointer',fontFamily:'var(--font-display)' }}>
                      Annuler
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}"""
assert old_input in s, "CIBLE INPUT NON TROUVEE"
s = s.replace(old_input, new_input, 1)
print('  > modale qualite visuelle')

# 4. Ajouter @keyframes spin si pas present
if "@keyframes spin" not in s:
    old_scan = "@keyframes scanPulse"
    s = s.replace(old_scan, "@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }\n        @keyframes scanPulse", 1)
    print('  > @keyframes spin')

f.write_text(s, 'utf-8')
print('OK — modale upload avec validation visuelle step-by-step')
