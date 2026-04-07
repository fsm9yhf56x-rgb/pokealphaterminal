#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Retirer le useEffect showcase qui est mal placé (avant les helpers)
old_early = """  })
  useEffect(() => {
    dbGet<CardItem[]>('showcase').then(data => {
      if (data && data.length > 0) setShowcase(data)
    })
  }, [])"""

# Il apparait juste apres le useState showcase
assert old_early in s, "CIBLE EARLY"
s = s.replace(old_early, "  })", 1)
print('  > removed early showcase useEffect')

# Ajouter apres le useEffect portfolio loaded (qui est apres les helpers)
old_loaded = """    dbGet<CardItem[]>('portfolio').then(data => {
      if (data && data.length > 0) setPortfolio(data)
      setPortfolioLoaded(true)
    }).catch(() => setPortfolioLoaded(true))
  }, [])"""

new_loaded = """    dbGet<CardItem[]>('portfolio').then(data => {
      if (data && data.length > 0) setPortfolio(data)
      setPortfolioLoaded(true)
    }).catch(() => setPortfolioLoaded(true))
  }, [])
  useEffect(() => {
    dbGet<CardItem[]>('showcase').then(data => {
      if (data && data.length > 0) setShowcase(data)
    })
  }, [])"""

assert old_loaded in s, "CIBLE LOADED"
s = s.replace(old_loaded, new_loaded, 1)
print('  > showcase useEffect after helpers')

f.write_text(s, 'utf-8')
print('OK')
