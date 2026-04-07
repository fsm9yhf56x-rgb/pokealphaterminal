#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Ajouter portfolioLoaded state + useEffect init apres le useState portfolio
old = """    try { const r=localStorage.getItem('pka_portfolio'); return r?JSON.parse(r):[] } catch { return [] }
  })
  const [showcase"""

new = """    try { const r=localStorage.getItem('pka_portfolio'); return r?JSON.parse(r):[] } catch { return [] }
  })
  const [portfolioLoaded, setPortfolioLoaded] = useState(false)
  useEffect(() => {
    dbGet<CardItem[]>('portfolio').then(data => {
      if (data && data.length > 0) setPortfolio(data)
      setPortfolioLoaded(true)
    }).catch(() => setPortfolioLoaded(true))
  }, [])
  const [showcase"""

assert old in s, "CIBLE"
s = s.replace(old, new, 1)
print('OK')

f.write_text(s, 'utf-8')
