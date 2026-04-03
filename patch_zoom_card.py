#!/usr/bin/env python3
"""Zoom plein ecran sur clic image dans le spotlight"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. State pour le zoom
old_state = "const [editQty,     setEditQty]     = useState<number|null>(null)"
new_state = """const [editQty,     setEditQty]     = useState<number|null>(null)
  const [cardZoom,    setCardZoom]    = useState(false)"""
assert old_state in s, "CIBLE STATE"
s = s.replace(old_state, new_state, 1)
print('  > state')

# 2. Reset zoom quand on ferme le spotlight
old_close = "setSpotCard(null); setEditQty(null)"
new_close = "setSpotCard(null); setEditQty(null); setCardZoom(false)"
s = s.replace(old_close, new_close)
print('  > reset zoom on close')

# 3. Ajouter onClick zoom sur l'image dans le spotlight
old_img = """                        <img src={`${spotCard.image.replace(/\\/low\\.(webp|jpg|png)$/, '')}/high.webp`} alt={spotCard.name}
                          style={{ width:'100%', height:'100%', objectFit:'cover', position:'relative', zIndex:1 }}"""
new_img = """                        <img src={`${spotCard.image.replace(/\\/low\\.(webp|jpg|png)$/, '')}/high.webp`} alt={spotCard.name}
                          onClick={e=>{e.stopPropagation();setCardZoom(true)}}
                          style={{ width:'100%', height:'100%', objectFit:'cover', position:'relative', zIndex:1, cursor:'zoom-in' }}"""
assert old_img in s, "CIBLE IMG"
s = s.replace(old_img, new_img, 1)
print('  > click zoom on img')

# 4. Ajouter le modal zoom juste apres le spotlight
old_after_spot = "        {/* UPLOAD MODAL */}"
if old_after_spot not in s:
    old_after_spot = "        {/* ADD SET MODAL */}"

zoom_modal = """        {/* CARD ZOOM */}
        {cardZoom&&spotCard&&spotCard.image&&(
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out', animation:'fadeUp .2s ease-out' }}
            onClick={()=>setCardZoom(false)}>
            <img src={`${spotCard.image.replace(/\\/low\\.(webp|jpg|png)$/, '')}/high.webp`} alt={spotCard.name}
              style={{ maxHeight:'90vh', maxWidth:'90vw', objectFit:'contain', borderRadius:'16px', boxShadow:'0 32px 80px rgba(0,0,0,.4)', animation:'illuminate .3s ease-out' }}
              onError={e=>{ const t=e.target as HTMLImageElement; if(t.src.includes('.webp')) t.src=t.src.replace('.webp','.jpg') }}/>
          </div>
        )}

        """ + old_after_spot

assert old_after_spot in s, "CIBLE AFTER SPOT"
s = s.replace(old_after_spot, zoom_modal, 1)
print('  > zoom modal')

f.write_text(s, 'utf-8')
print('OK')
