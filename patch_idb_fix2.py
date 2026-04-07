#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Retirer le useEffect showcase mal place (lignes 105-109)
old = """  })
  useEffect(() => {
    dbGet<CardItem[]>('showcase').then(data => {
      if (data && data.length > 0) setShowcase(data)
    })
  }, [])
  const [showPickerForShowcase"""
new = """  })
  const [showPickerForShowcase"""
assert old in s, "CIBLE"
s = s.replace(old, new, 1)
print('  > removed early')

# Ajouter apres le portfolioLoaded useEffect
old2 = "  }, [portfolio, portfolioLoaded])"
new2 = """  }, [portfolio, portfolioLoaded])
  useEffect(() => {
    dbGet<CardItem[]>('showcase').then(data => {
      if (data && data.length > 0) setShowcase(data)
    })
  }, [])"""
assert old2 in s, "CIBLE2"
s = s.replace(old2, new2, 1)
print('  > added after helpers')

f.write_text(s, 'utf-8')
print('OK')
