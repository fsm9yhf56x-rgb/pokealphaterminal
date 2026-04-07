#!/usr/bin/env python3
"""Fix image backfill: utiliser les donnees statiques en priorite, pas de HEAD requests"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Remplacer tout le bloc image backfill
old = """  // -- Backfill missing images from static data --
  const imgBackfilled = useRef(false)
  useEffect(() => {
    if (imgBackfilled.current) return
    const needsImg = portfolio.filter(c => !c.image && c.setId && c.number && c.number !== '???')
    if (needsImg.length === 0) return
    imgBackfilled.current = true
    const doImgBackfill = async () => {
      const langs = [...new Set(needsImg.map(c => c.lang === 'JP' ? 'JP' : c.lang === 'EN' ? 'EN' : 'FR'))]
      const staticCards: Record<string, Record<string, any[]>> = {}
      for (const lang of langs) {
        try {
          const res = await fetch('/data/cards-' + lang + '.json')
          if (res.ok) staticCards[lang] = await res.json()
        } catch {}
      }
      const updates: Record<string, string> = {}
      for (const card of needsImg) {
        const lang = card.lang === 'JP' ? 'JP' : card.lang === 'EN' ? 'EN' : 'FR'
        const apiLang = card.lang === 'JP' ? 'ja' : card.lang === 'EN' ? 'en' : 'fr'
        const sid = card.setId as string
        // 1. Chercher dans les donnees statiques
        const setData = sid ? staticCards[lang]?.[sid] : undefined
        if (setData) {
          const match = setData.find((c: any) => c.lid === card.number)
          if (match?.img) { updates[card.id] = match.img; continue }
        }
        // 2. Essayer plusieurs sources
        if (sid) {
          const urls = [
            'https://assets.tcgdex.net/' + apiLang + '/' + sid + '/' + card.number + '/high.webp',
            'https://assets.tcgdex.net/' + apiLang + '/' + sid + '/' + card.number + '/high.png',
            'https://assets.tcgdex.net/en/' + sid + '/' + card.number + '/high.webp',
            'https://images.pokemontcg.io/' + sid + '/' + card.number + '_hires.png',
            'https://images.pokemontcg.io/' + sid + '/' + card.number + '.png',
          ]
          let found = false
          for (const url of urls) {
            try {
              const r = await fetch(url, { method:'HEAD' })
              if (r.ok) { updates[card.id] = url; found = true; break }
            } catch {}
          }
          if (!found) {
            updates[card.id] = 'https://assets.tcgdex.net/' + apiLang + '/' + sid + '/' + card.number + '/high.webp'
          }
        }
      }
      if (Object.keys(updates).length > 0) {
        setPortfolio(prev => prev.map(c => updates[c.id] ? { ...c, image: updates[c.id] } : c))
      }
      imgBackfilled.current = false
    }
    doImgBackfill()
  }, [portfolio.length])"""

new = """  // -- Backfill missing images from static data (FR+EN+JP) --
  const imgBackfilled = useRef(false)
  useEffect(() => {
    if (imgBackfilled.current) return
    const needsImg = portfolio.filter(c => !c.image && c.setId && c.number && c.number !== '???')
    if (needsImg.length === 0) return
    imgBackfilled.current = true
    const doImgBackfill = async () => {
      // Charger les 3 langues pour maximiser la couverture
      const allStatic: Record<string, Record<string, any[]>> = {}
      for (const lang of ['FR', 'EN', 'JP']) {
        try {
          const res = await fetch('/data/cards-' + lang + '.json')
          if (res.ok) allStatic[lang] = await res.json()
        } catch {}
      }
      const updates: Record<string, string> = {}
      for (const card of needsImg) {
        const lang = card.lang === 'JP' ? 'JP' : card.lang === 'EN' ? 'EN' : 'FR'
        const apiLang = card.lang === 'JP' ? 'ja' : card.lang === 'EN' ? 'en' : 'fr'
        const sid = card.setId as string
        if (!sid) continue
        // 1. Chercher dans la langue de la carte
        const match1 = allStatic[lang]?.[sid]?.find((c: any) => c.lid === card.number)
        if (match1?.img) { updates[card.id] = match1.img; continue }
        // 2. Chercher dans EN (meilleure couverture)
        if (lang !== 'EN') {
          const match2 = allStatic['EN']?.[sid]?.find((c: any) => c.lid === card.number)
          if (match2?.img) { updates[card.id] = match2.img; continue }
        }
        // 3. Chercher dans FR comme fallback
        if (lang !== 'FR') {
          const match3 = allStatic['FR']?.[sid]?.find((c: any) => c.lid === card.number)
          if (match3?.img) { updates[card.id] = match3.img; continue }
        }
        // 4. Construire URL directement (pas de HEAD — le onError gere)
        updates[card.id] = 'https://assets.tcgdex.net/' + apiLang + '/' + sid + '/' + card.number + '/high.webp'
      }
      if (Object.keys(updates).length > 0) {
        setPortfolio(prev => prev.map(c => updates[c.id] ? { ...c, image: updates[c.id] } : c))
      }
      imgBackfilled.current = false
    }
    doImgBackfill()
  }, [portfolio.length])"""

assert old in s, "CIBLE IMG BACKFILL"
s = s.replace(old, new, 1)
print('  > multi-lang static backfill')

# Ameliorer le onError fallback sur les images rendues
old_err = """onError={e=>{
                                    const t=e.target as HTMLImageElement
                                    const src=t.src
                                    if(src.includes('high.webp')) t.src=src.replace('high.webp','high.png')
                                    else if(src.includes('high.png')&&src.includes('tcgdex')) t.src=src.replace('assets.tcgdex.net/fr','assets.tcgdex.net/en')
                                    else if(src.includes('tcgdex')&&!src.includes('low')) t.src=src.replace('/high.','/low.')
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
                                      else t.style.display='none'
                                    }
                                    else if(src.includes('_hires.png')) t.src=src.replace('_hires.png','.png')
                                    else t.style.display='none'
                                  }}"""

c = s.count(old_err)
if c > 0:
    s = s.replace(old_err, new_err)
    print(f'  > onError fallback chain x{c}')

f.write_text(s, 'utf-8')
print('OK')
