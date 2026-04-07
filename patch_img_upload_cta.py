#!/usr/bin/env python3
"""Quand l'image manque: afficher un CTA upload au lieu de masquer"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Remplacer le onError qui masque par un qui affiche le CTA upload
old_err = """onError={e=>{
                                    const t=e.target as HTMLImageElement
                                    const src=t.src
                                    if(src.includes('high.webp')) t.src=src.replace('high.webp','high.png')
                                    else if(src.includes('/fr/')&&src.includes('tcgdex')) t.src=src.replace('/fr/','/en/')
                                    else if(src.includes('/ja/')&&src.includes('tcgdex')) t.src=src.replace('/ja/','/en/')
                                    else if(src.includes('tcgdex')&&src.includes('high')) t.src=src.replace('/high.','/low.')
                                    else if(src.includes('tcgdex')) {
                                      const m=src.match(/\\/([^/]+)\\/([^/]+)\\/(high|low)/)
                                      if(m) t.src='https://images.pokemontcg.io/'+m[1]+'/'+m[2]+'_hires.png'
                                      else t.style.display='none'
                                    }
                                    else if(src.includes('_hires.png')) t.src=src.replace('_hires.png','.png')
                                    else t.style.display='none'
                                  }}"""

new_err = """onError={e=>{
                                    const t=e.target as HTMLImageElement
                                    const src=t.src
                                    if(src.includes('high.webp')) t.src=src.replace('high.webp','high.png')
                                    else if(src.includes('/fr/')&&src.includes('tcgdex')) t.src=src.replace('/fr/','/en/')
                                    else if(src.includes('/ja/')&&src.includes('tcgdex')) t.src=src.replace('/ja/','/en/')
                                    else if(src.includes('tcgdex')&&src.includes('high')) t.src=src.replace('/high.','/low.')
                                    else if(src.includes('tcgdex')) {
                                      const m=src.match(/\\/([^/]+)\\/([^/]+)\\/(high|low)/)
                                      if(m) t.src='https://images.pokemontcg.io/'+m[1]+'/'+m[2]+'_hires.png'
                                      else { t.style.display='none'; const p=t.parentElement; if(p){p.classList.add('img-missing')} }
                                    }
                                    else if(src.includes('_hires.png')) t.src=src.replace('_hires.png','.png')
                                    else { t.style.display='none'; const p=t.parentElement; if(p){p.classList.add('img-missing')} }
                                  }}"""

c = s.count(old_err)
s = s.replace(old_err, new_err)
print(f'  > onError add class x{c}')

# Ajouter CSS pour le CTA upload quand image manquante
old_css = ".pocket-shell { contain:layout style paint; }"
new_css = """.pocket-shell { contain:layout style paint; }
        .img-missing { position:relative; }
        .img-missing::after { content:'\\1F4F7'; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:24px; opacity:.4; pointer-events:none; }"""
assert old_css in s, "CIBLE CSS"
s = s.replace(old_css, new_css, 1)
print('  > CSS missing img')

# Dans le shelf: quand pas d'image, afficher un vrai CTA au lieu de rien
# Chercher le bloc qui affiche quand !card.image dans le shelf
old_no_img = """                                    {!card.image&&<div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                      <div style={{ fontSize:'14px', color:'#C7C7CC' }}>+</div>
                                    </div>}"""

if old_no_img in s:
    new_no_img = """                                    {!card.image&&<div onClick={e=>{e.stopPropagation();triggerUpload(card.id)}} style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'4px', cursor:'pointer' }}>
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                      <span style={{ fontSize:'8px', color:'#AEAEB2', fontFamily:'var(--font-display)' }}>Ajouter</span>
                                    </div>}"""
    s = s.replace(old_no_img, new_no_img, 1)
    print('  > shelf no-img CTA')

f.write_text(s, 'utf-8')
print('OK')
