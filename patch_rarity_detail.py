#!/usr/bin/env python3
"""Backfill rarity via fetchCardDetail (pas la liste)"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Remplacer le backfill qui utilise shelfSetCards (pas de rarity) par fetchCardDetail
old_backfill = """  // -- Backfill missing rarity from TCGDex --
  useEffect(() => {
    const needsFix = portfolio.filter(c => !c.rarity && c.number && c.number !== '???')
    if (needsFix.length === 0) return
    const setsToCheck = [...new Set(needsFix.map(c => c.set))]
    setsToCheck.forEach(setName => {
      const tcgCards = shelfSetCards[setName]
      if (!tcgCards || tcgCards.length === 0) return
      setPortfolio(prev => prev.map(c => {
        if (c.rarity || c.set !== setName) return c
        const match = tcgCards.find(tc => tc.localId === c.number)
        if (match?.rarity) return { ...c, rarity: match.rarity }
        return c
      }))
    })
  }, [shelfSetCards])"""
new_backfill = """  // -- Backfill missing rarity via card detail API --
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
assert old_backfill in s, "CIBLE BACKFILL"
s = s.replace(old_backfill, new_backfill, 1)
print('  > backfill via fetchCardDetail')

f.write_text(s, 'utf-8')
print('OK')
