#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# 1. Grid view: fix URL construction
old = "                  const img   = base ? `${base}/low.webp` : null"
new = "                  const img   = base ? (base.includes('.webp')||base.includes('.png')||base.includes('.jpg') ? base : `${base}/low.webp`) : null"
assert old in s, "CIBLE1"
s = s.replace(old, new, 1)
print('  > grid img')

# 2. onError: fix fallback (base is now full URL)
old2 = """onError={e=>{ const t=e.target as HTMLImageElement; if(t.src.includes('.webp')){ t.src=`${base}/low.jpg` } else if(t.src.includes('.jpg')){ t.src=`${base}/low.png` } else { t.closest('.enc-card-img-wrap')?.classList.add('img-failed'); t.style.display='none' } }}/>"""
new2 = """onError={e=>{
                            const t=e.target as HTMLImageElement
                            const src=t.src
                            if(src.includes('high.webp')) t.src=src.replace('high.webp','high.png')
                            else if(src.includes('high.png')) t.src=src.replace('/high.','/low.')
                            else if(src.includes('/fr/')) t.src=src.replace('/fr/','/en/')
                            else t.style.opacity='0'
                          }}/>"""
assert old2 in s, "CIBLE2"
s = s.replace(old2, new2, 1)
print('  > grid onError')

# 3. Detail panel: same fix
old3 = """<img src={`${selCard.image}/low.webp`}"""
new3 = """<img src={selCard.image?.includes('.webp')||selCard.image?.includes('.png')?selCard.image:`${selCard.image}/low.webp`}"""
if old3 in s:
    s = s.replace(old3, new3, 1)
    print('  > detail img')

f.write_text(s, 'utf-8')
print('OK')
