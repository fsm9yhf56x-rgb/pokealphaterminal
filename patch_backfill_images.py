#!/usr/bin/env python3
"""Backfill missing images from static data + direct TCGDex URL construction"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Ajouter un backfill images apres le backfill rarity
old_logo = "  // -- Fetch set logos via TCGDex API --"
new_logo = """  // -- Backfill missing images from static data --
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
        // 2. Construire l'URL TCGDex directement
        if (sid) {
          updates[card.id] = 'https://assets.tcgdex.net/' + apiLang + '/' + sid + '/' + card.number + '/high.webp'
        }
      }
      if (Object.keys(updates).length > 0) {
        setPortfolio(prev => prev.map(c => updates[c.id] ? { ...c, image: updates[c.id] } : c))
      }
      imgBackfilled.current = false
    }
    doImgBackfill()
  }, [portfolio.length])

  // -- Fetch set logos via TCGDex API --"""

assert old_logo in s, "CIBLE LOGO"
s = s.replace(old_logo, new_logo, 1)
print('  > image backfill')

f.write_text(s, 'utf-8')
print('OK')
