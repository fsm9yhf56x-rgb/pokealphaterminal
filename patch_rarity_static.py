#!/usr/bin/env python3
"""Backfill rarity depuis les donnees statiques public/data/"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Remplacer le backfill existant par un qui utilise les fichiers statiques
old = """  // -- Backfill missing rarity via card detail API --
  const rarityBackfilled = useRef<Set<string>>(new Set())
  useEffect(() => {
    const needsFix = portfolio.filter(c => !c.rarity && c.setId && c.number && c.number !== '???' && !rarityBackfilled.current.has(c.id))
    if (needsFix.length === 0) return
    const batch = needsFix.slice(0, 5)
    batch.forEach(async card => {
      rarityBackfilled.current.add(card.id)
      const lang = card.lang === 'JP' ? 'JP' : card.lang === 'EN' ? 'EN' : 'FR'
      const cardId = card.setId + '-' + card.number
      try {
        const detail = await fetchCardDetail(lang, cardId)
        if (detail?.rarity) {
          setPortfolio(prev => prev.map(c => c.id === card.id ? { ...c, rarity: detail.rarity! } : c))
        }
      } catch {}
    })
  }, [portfolio.length, shelfSetCards])"""

new = """  // -- Backfill missing rarity from static data + API fallback --
  const rarityBackfilled = useRef(false)
  useEffect(() => {
    if (rarityBackfilled.current) return
    const needsFix = portfolio.filter(c => !c.rarity && c.setId && c.number && c.number !== '???')
    if (needsFix.length === 0) return
    rarityBackfilled.current = true
    const doBackfill = async () => {
      const langs = [...new Set(needsFix.map(c => c.lang === 'JP' ? 'JP' : c.lang === 'EN' ? 'EN' : 'FR'))]
      const staticCards: Record<string, Record<string, {r:string|null}[]>> = {}
      for (const lang of langs) {
        try {
          const res = await fetch('/data/cards-' + lang + '.json')
          if (res.ok) staticCards[lang] = await res.json()
        } catch {}
      }
      const updates: Record<string, string> = {}
      for (const card of needsFix) {
        const lang = card.lang === 'JP' ? 'JP' : card.lang === 'EN' ? 'EN' : 'FR'
        const setCards = staticCards[lang]?.[card.setId]
        if (setCards) {
          const match = setCards.find((c: any) => c.lid === card.number || c.id === card.setId + '-' + card.number)
          if (match?.r) { updates[card.id] = match.r; continue }
        }
        // Fallback API pour les cartes pas dans le dump
        try {
          const detail = await fetchCardDetail(lang, card.setId + '-' + card.number)
          if (detail?.rarity) updates[card.id] = detail.rarity
        } catch {}
      }
      if (Object.keys(updates).length > 0) {
        setPortfolio(prev => prev.map(c => updates[c.id] ? { ...c, rarity: updates[c.id] } : c))
      }
      rarityBackfilled.current = false
    }
    doBackfill()
  }, [portfolio.length])"""

assert old in s, "CIBLE BACKFILL"
s = s.replace(old, new, 1)
print('  > static rarity backfill')

f.write_text(s, 'utf-8')
print('OK')
