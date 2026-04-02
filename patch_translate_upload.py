#!/usr/bin/env python3
"""Traductions EN fallback + upload image manquante"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# ═══════════════════════════════════════════════════════════
# 1. Fetch EN sets aussi comme fallback traduction
# ═══════════════════════════════════════════════════════════
old_fr_fetch = """  // ── FR sets reference (pour traduction JP) ──
  useEffect(() => {
    fetchSets('FR').then(sets => {
      const map: Record<string,string> = {}
      sets.forEach(set => { if(set.id) map[set.id] = set.name })
      setFrSetsMap(map)
    }).catch(() => {})
  }, [])"""
new_fr_fetch = """  // ── FR + EN sets reference (pour traduction JP) ──
  useEffect(() => {
    Promise.all([fetchSets('FR'), fetchSets('EN')]).then(([frSets, enSets]) => {
      const map: Record<string,string> = {}
      enSets.forEach(set => { if(set.id) map[set.id] = set.name })
      frSets.forEach(set => { if(set.id) map[set.id] = set.name })
      setFrSetsMap(map)
    }).catch(() => {})
  }, [])"""
assert old_fr_fetch in s, "CIBLE FR FETCH NON TROUVEE"
s = s.replace(old_fr_fetch, new_fr_fetch, 1)
print('  > FR + EN sets fallback')

# ═══════════════════════════════════════════════════════════
# 2. Dropdown — afficher traduction pour JP ET EN (pas seulement JP)
# ═══════════════════════════════════════════════════════════
old_dd = "{s.name}{addForm.lang==='JP'&&frSetsMap[s.id]?' — '+frSetsMap[s.id]:''}{s.total?' ('+s.total+')':''}"
new_dd = "{s.name}{addForm.lang!=='FR'&&frSetsMap[s.id]&&frSetsMap[s.id]!==s.name?' — '+frSetsMap[s.id]:''}{s.total?' ('+s.total+')':''}"
assert old_dd in s, "CIBLE DROPDOWN NON TROUVEE"
s = s.replace(old_dd, new_dd, 1)
print('  > dropdown traduction pour JP et EN')

# ═══════════════════════════════════════════════════════════
# 3. Handler pour upload image sur une carte existante
# ═══════════════════════════════════════════════════════════
old_canAdd = "const canAdd = !!(addForm.name&&addForm.set)"
new_canAdd = """const handleImageUpload = (cardId: string, file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setPortfolio(prev => prev.map(c => c.id === cardId ? { ...c, image: dataUrl } : c))
      if (spotCard?.id === cardId) setSpotCard(prev => prev ? { ...prev, image: dataUrl } : null)
      showToast('Illustration ajoutee')
    }
    reader.readAsDataURL(file)
  }
  const canAdd = !!(addForm.name&&addForm.set)"""
assert old_canAdd in s, "CIBLE CANADD NON TROUVEE"
s = s.replace(old_canAdd, new_canAdd, 1)
print('  > handleImageUpload')

# ═══════════════════════════════════════════════════════════
# 4. Spotlight — bouton upload quand pas d'image
# ═══════════════════════════════════════════════════════════
old_spot_noimg = """                        <>
                          <div style={{ position:'absolute', width:'75%', height:'75%', borderRadius:'50%', background:eg, filter:'blur(28px)', opacity:.65 }}/>
                          <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec}DD,${ec}77)`, boxShadow:`0 0 28px ${eg}`, zIndex:1 }}/>
                        </>"""
new_spot_noimg = """                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', zIndex:1 }}>
                          <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:'#F0F0F5', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          </div>
                          <label style={{ padding:'6px 14px', borderRadius:'8px', background:'#1D1D1F', color:'#fff', fontSize:'10px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                            Ajouter une photo
                            <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{ const fi=e.target.files?.[0]; if(fi&&spotCard) handleImageUpload(spotCard.id, fi) }}/>
                          </label>
                        </div>"""
assert old_spot_noimg in s, "CIBLE SPOT NOIMG NON TROUVEE"
s = s.replace(old_spot_noimg, new_spot_noimg, 1)
print('  > spotlight upload button')

# ═══════════════════════════════════════════════════════════
# 5. Binder grid — icone camera sur cartes sans image
# ═══════════════════════════════════════════════════════════
# Le fallback no-image dans le binder grid
old_binder_noimg = """<div style={{ width:'100%', aspectRatio:'63/88', background:`linear-gradient(145deg,${ec}15,${ec}06)`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                                <div style={{ position:'absolute', width:'60%', height:'60%', borderRadius:'50%', background:eg, filter:'blur(18px)', opacity:.5 }}/>
                                <div style={{ width:binderCols<=3?'42px':binderCols===4?'32px':binderCols===5?'24px':'20px', height:binderCols<=3?'42px':binderCols===4?'32px':binderCols===5?'24px':'20px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec}CC,${ec}77)`, boxShadow:`0 0 16px ${eg}`, position:'relative', zIndex:1 }}/>
                              </div>"""
new_binder_noimg = """<div style={{ width:'100%', aspectRatio:'63/88', background:'#F5F5F7', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                                <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor:'pointer', zIndex:1 }} onClick={e=>e.stopPropagation()}>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                  <span style={{ fontSize:'8px', color:'#AEAEB2', fontFamily:'var(--font-display)' }}>Photo</span>
                                  <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{ const fi=e.target.files?.[0]; if(fi) handleImageUpload(card.id, fi) }}/>
                                </label>
                              </div>"""
assert old_binder_noimg in s, "CIBLE BINDER NOIMG NON TROUVEE"
s = s.replace(old_binder_noimg, new_binder_noimg, 1)
print('  > binder camera icon')

f.write_text(s, 'utf-8')
print('OK — traductions EN fallback + upload illustration')
