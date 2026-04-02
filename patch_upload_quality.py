#!/usr/bin/env python3
"""Upload image — cercle colore + guidelines qualite"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Ajouter state pour la modale de guidelines
old_scanner_state = "const [scannerOpen,  setScannerOpen]  = useState(false)"
new_scanner_state = """const [uploadCardId, setUploadCardId] = useState<string|null>(null)
  const [scannerOpen,  setScannerOpen]  = useState(false)"""
assert old_scanner_state in s, "CIBLE SCANNER STATE NON TROUVEE"
s = s.replace(old_scanner_state, new_scanner_state, 1)
print('  > uploadCardId state')

# 2. Remplacer le binder no-image (camera icon) par cercle + "Ajouter une photo"
old_binder = """<div style={{ width:'100%', aspectRatio:'63/88', background:'#F5F5F7', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                                <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor:'pointer', zIndex:1 }} onClick={e=>e.stopPropagation()}>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                  <span style={{ fontSize:'8px', color:'#AEAEB2', fontFamily:'var(--font-display)' }}>Photo</span>
                                  <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{ const fi=e.target.files?.[0]; if(fi) handleImageUpload(card.id, fi) }}/>
                                </label>
                              </div>"""
new_binder = """<div style={{ width:'100%', aspectRatio:'63/88', background:`linear-gradient(145deg,${ec}15,${ec}06)`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'6px', position:'relative' }}>
                                <div style={{ position:'absolute', width:'60%', height:'60%', borderRadius:'50%', background:eg, filter:'blur(18px)', opacity:.5 }}/>
                                <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec}CC,${ec}77)`, boxShadow:`0 0 16px ${eg}`, position:'relative', zIndex:1 }}/>
                                <button onClick={e=>{e.stopPropagation();setUploadCardId(card.id)}} style={{ position:'relative', zIndex:1, background:'rgba(255,255,255,.85)', border:'1px solid rgba(0,0,0,.08)', borderRadius:'6px', padding:'3px 8px', fontSize:'8px', fontWeight:600, color:'#48484A', cursor:'pointer', fontFamily:'var(--font-display)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', gap:'3px' }}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                  Photo
                                </button>
                              </div>"""
assert old_binder in s, "CIBLE BINDER NOIMG NON TROUVEE"
s = s.replace(old_binder, new_binder, 1)
print('  > binder cercle + bouton photo')

# 3. Modale guidelines qualite — avant le WELCOME section
old_welcome_modal = "      {/* ── WELCOME ── */}"
new_welcome_modal = """      {/* ── UPLOAD GUIDELINES ── */}
      {uploadCardId&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px' }}
          onClick={()=>setUploadCardId(null)}>
          <div style={{ maxWidth:'400px',width:'100%',background:'#fff',borderRadius:'20px',border:'1px solid #E5E5EA',boxShadow:'0 24px 60px rgba(0,0,0,.15)',overflow:'hidden',animation:'fadeUp .25s ease-out' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ padding:'20px 20px 0' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px' }}>
                <div>
                  <div style={{ fontSize:'16px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)' }}>Contribuer une illustration</div>
                  <div style={{ fontSize:'11px',color:'#86868B',marginTop:'2px' }}>Votre photo sera partagee avec la communaute</div>
                </div>
                <button onClick={()=>setUploadCardId(null)} style={{ width:'28px',height:'28px',borderRadius:'50%',background:'#F0F0F5',border:'none',color:'#86868B',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div style={{ background:'#F5F5F7',borderRadius:'12px',padding:'14px',marginBottom:'16px' }}>
                <div style={{ fontSize:'10px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'10px' }}>Criteres de qualite</div>
                {[
                  {icon:'✓',text:'Carte entiere visible, bien cadree'},
                  {icon:'✓',text:'Photo nette, pas floue'},
                  {icon:'✓',text:'Fond neutre (blanc, gris, noir)'},
                  {icon:'✗',text:'Pas de reflet, ombre ou doigt visible'},
                  {icon:'✗',text:'Pas de watermark ou texte ajoute'},
                  {icon:'◐',text:'Format JPG ou PNG, min 400×560px'},
                ].map((r,i)=>(
                  <div key={i} style={{ display:'flex',alignItems:'center',gap:'8px',padding:'5px 0',fontSize:'12px',color:r.icon==='✗'?'#E03020':r.icon==='✓'?'#2E9E6A':'#48484A',fontFamily:'var(--font-display)' }}>
                    <span style={{ width:'16px',textAlign:'center',fontSize:'11px',flexShrink:0 }}>{r.icon}</span>
                    <span style={{ color:'#48484A' }}>{r.text}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:'8px',padding:'10px 12px',borderRadius:'10px',background:'#FFF8F0',border:'1px solid #FFE0C0',marginBottom:'16px' }}>
                <span style={{ fontSize:'14px' }}>⚠️</span>
                <span style={{ fontSize:'11px',color:'#8B5E00',fontFamily:'var(--font-display)',lineHeight:1.4 }}>En envoyant une photo, vous acceptez qu'elle soit utilisee par PokéAlpha pour enrichir la base de donnees commune.</span>
              </div>
            </div>
            <div style={{ padding:'0 20px 20px',display:'flex',gap:'8px' }}>
              <label style={{ flex:1,padding:'13px',borderRadius:'12px',background:'#1D1D1F',color:'#fff',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'var(--font-display)',textAlign:'center',display:'block',transition:'all .15s' }}>
                Choisir une photo
                <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }} onChange={e=>{
                  const fi=e.target.files?.[0]
                  if(!fi||!uploadCardId) return
                  if(fi.size>10*1024*1024){ showToast('Fichier trop lourd (max 10 Mo)'); return }
                  if(!['image/jpeg','image/png','image/webp'].includes(fi.type)){ showToast('Format non supporte (JPG/PNG/WebP)'); return }
                  const img=new Image()
                  img.onload=()=>{
                    if(img.width<300||img.height<400){ showToast('Image trop petite (min 300×400)'); return }
                    handleImageUpload(uploadCardId, fi)
                    setUploadCardId(null)
                  }
                  img.onerror=()=>showToast('Image invalide')
                  img.src=URL.createObjectURL(fi)
                }}/>
              </label>
              <button onClick={()=>setUploadCardId(null)} style={{ padding:'13px 20px',borderRadius:'12px',background:'#F5F5F7',color:'#6E6E73',border:'1px solid #E5E5EA',fontSize:'13px',cursor:'pointer',fontFamily:'var(--font-display)' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WELCOME ── */}"""
assert old_welcome_modal in s, "CIBLE WELCOME NON TROUVEE"
s = s.replace(old_welcome_modal, new_welcome_modal, 1)
print('  > modale guidelines')

# 4. Spotlight no-image — aussi rediriger vers la modale guidelines
# Trouver le bouton upload dans le spotlight et le faire ouvrir la modale
old_spot_upload = "onChange={e=>{ const fi=e.target.files?.[0]; if(fi&&spotCard) handleImageUpload(spotCard.id, fi) }}"
if old_spot_upload in s:
    # Remplacer le label+input par un bouton qui ouvre la modale
    old_spot_label = """<label style={{ padding:'6px 14px', borderRadius:'8px', background:'#1D1D1F', color:'#fff', fontSize:'10px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                            Ajouter une photo
                            <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{ const fi=e.target.files?.[0]; if(fi&&spotCard) handleImageUpload(spotCard.id, fi) }}/>
                          </label>"""
    new_spot_label = """<button onClick={()=>setUploadCardId(spotCard.id)} style={{ padding:'6px 14px', borderRadius:'8px', background:'#1D1D1F', color:'#fff', fontSize:'10px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', border:'none', display:'flex', alignItems:'center', gap:'4px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            Ajouter une photo
                          </button>"""
    if old_spot_label in s:
        s = s.replace(old_spot_label, new_spot_label, 1)
        print('  > spotlight -> modale guidelines')

f.write_text(s, 'utf-8')
print('OK — upload avec guidelines qualite')
