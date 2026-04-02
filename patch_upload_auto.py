#!/usr/bin/env python3
"""Upload — controle qualite automatique, pas de modale guidelines"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Supprimer le state uploadCardId
old_state = """const [uploadCardId, setUploadCardId] = useState<string|null>(null)
  const [scannerOpen,  setScannerOpen]  = useState(false)"""
new_state = """const uploadRef = useRef<HTMLInputElement|null>(null)
  const uploadTargetId = useRef<string|null>(null)
  const [scannerOpen,  setScannerOpen]  = useState(false)"""
assert old_state in s, "CIBLE STATE NON TROUVEE"
s = s.replace(old_state, new_state, 1)
print('  > state -> refs')

# 2. handleImageUpload — ajouter validation auto
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
new_handler = """const triggerUpload = (cardId: string) => {
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
assert old_handler in s, "CIBLE HANDLER NON TROUVEE"
s = s.replace(old_handler, new_handler, 1)
print('  > validation auto dans handler')

# 3. Binder — bouton Photo ouvre file picker via ref
old_binder_btn = """<button onClick={e=>{e.stopPropagation();setUploadCardId(card.id)}}"""
new_binder_btn = """<button onClick={e=>{e.stopPropagation();triggerUpload(card.id)}}"""
assert old_binder_btn in s, "CIBLE BINDER BTN NON TROUVEE"
s = s.replace(old_binder_btn, new_binder_btn, 1)
print('  > binder -> triggerUpload')

# 4. Spotlight — bouton ouvre file picker via ref
old_spot_btn = """<button onClick={()=>setUploadCardId(spotCard.id)}"""
new_spot_btn = """<button onClick={()=>triggerUpload(spotCard.id)}"""
if old_spot_btn in s:
    s = s.replace(old_spot_btn, new_spot_btn, 1)
    print('  > spotlight -> triggerUpload')

# 5. Supprimer la modale guidelines entiere
modal_start = "      {/* ── UPLOAD GUIDELINES ── */}"
modal_end = "      {/* ── WELCOME ── */}"
idx_start = s.find(modal_start)
idx_end = s.find(modal_end)
assert idx_start > 0 and idx_end > idx_start, "CIBLE MODALE NON TROUVEE"
s = s[:idx_start] + """      {/* ── UPLOAD INPUT GLOBAL ── */}
      <input ref={el=>{uploadRef.current=el}} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }}
        onChange={e=>{ const fi=e.target.files?.[0]; if(fi) handleImageUpload(fi); if(uploadRef.current) uploadRef.current.value='' }}/>

      {/* ── WELCOME ── */}""" + s[idx_end+len(modal_end):]
print('  > modale supprimee, input global ajoute')

f.write_text(s, 'utf-8')
print('OK — upload auto avec validation silencieuse')
