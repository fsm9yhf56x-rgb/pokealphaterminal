#!/usr/bin/env python3
"""Panel detail enrichi: badge rarete, owned indicator, meilleur layout"""
from pathlib import Path

EA = '\u00e9'
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# 1. Image: fix URL complete + meilleur fallback
old_img = """                        src={`${detail.image}/high.webp`}"""
new_img = """                        src={detail.image?.includes('.webp')||detail.image?.includes('.png')?detail.image:`${detail.image}/high.webp`}"""
assert old_img in s, "CIBLE IMG"
s = s.replace(old_img, new_img, 1)
print('  > detail img fix')

# 2. Nom + badge rarete sur la meme ligne
old_name = """                    <div style={{ fontSize:'16px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', lineHeight:1.2, marginBottom:'2px' }}>{detail.name}</div>"""
new_name = """                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px', marginBottom:'2px' }}>
                      <div style={{ fontSize:'16px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', lineHeight:1.2 }}>{detail.name}</div>
                      {detail.rarity && (()=>{ const rc=getRarityColor(detail.rarity); return <span style={{ flexShrink:0, padding:'3px 8px', borderRadius:'5px', background:rc.bg, color:rc.fg, fontSize:'9px', fontWeight:600, fontFamily:'var(--font-display)', letterSpacing:'.02em' }}>{detail.rarity}</span> })()}
                    </div>"""
assert old_name in s, "CIBLE NAME"
s = s.replace(old_name, new_name, 1)
print('  > name + rarity badge')

# 3. Retirer rarete de la liste d'infos (deja en badge)
old_rarity_row = "                        ['Raret" + EA + "',      detail.rarity],"
new_rarity_row = ""
assert old_rarity_row in s, "CIBLE RARITY ROW"
s = s.replace(old_rarity_row, new_rarity_row, 1)
print('  > removed rarity from list')

# 4. Ajouter owned indicator + compteur dans le set
old_add_btn = """                    {selCard && isOwned(selCard) ? ("""
new_add_btn = """                    {/* Owned + set completion */}
                    {selCard && (()=>{
                      const setTotal = allCards.filter(c=>c.setId===selCard.setId).length
                      const setOwned = allCards.filter(c=>c.setId===selCard.setId && isOwned(c)).length
                      const pct = setTotal>0 ? Math.round(setOwned/setTotal*100) : 0
                      return setTotal>0 ? (
                        <div style={{ background:'#F5F5F7', borderRadius:'10px', padding:'10px 12px', marginBottom:'12px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                            <span style={{ fontSize:'10px', color:'#86868B', fontFamily:'var(--font-display)' }}>Compl""" + EA + """tion du set</span>
                            <span style={{ fontSize:'10px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-data)' }}>{setOwned}/{setTotal}</span>
                          </div>
                          <div style={{ height:'4px', borderRadius:'2px', background:'#E8E8ED', overflow:'hidden' }}>
                            <div style={{ width:pct+'%', height:'100%', borderRadius:'2px', background:pct===100?'linear-gradient(90deg,#C9A84C,#D4AF37)':'#E03020', transition:'width .3s' }}/>
                          </div>
                        </div>
                      ) : null
                    })()}

                    {selCard && isOwned(selCard) ? ("""
assert old_add_btn in s, "CIBLE ADD BTN"
s = s.replace(old_add_btn, new_add_btn, 1)
print('  > set completion bar')

# 5. Zoom button: remplacer emoji par SVG
old_zoom = """                        🔍
                      </button>"""
new_zoom = """                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
                      </button>"""
if old_zoom in s:
    s = s.replace(old_zoom, new_zoom, 1)
    print('  > zoom SVG')

# 6. Close button: remplacer x par SVG
old_close_detail = """>×</button>"""
idx_close = s.find(old_close_detail)
if idx_close > 0 and idx_close < s.find("LIGHTBOX"):
    s = s[:idx_close] + """><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>""" + s[idx_close+len(old_close_detail):]
    print('  > close SVG')

f.write_text(s, 'utf-8')
print('OK')
