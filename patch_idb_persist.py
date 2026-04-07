#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Persistence portfolio
old = "  useEffect(()=>{ try { localStorage.setItem('pka_portfolio', JSON.stringify(portfolio)) } catch {} }, [portfolio])"
new = """  const saveTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
  useEffect(()=>{
    if (!portfolioLoaded) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      dbSet('portfolio', portfolio)
      try {
        const slim = portfolio.map(c => c.image && c.image.startsWith('data:') ? { ...c, image: '' } : c)
        localStorage.setItem('pka_portfolio', JSON.stringify(slim))
      } catch {}
    }, 500)
  }, [portfolio, portfolioLoaded])"""
assert old in s, "CIBLE PERSIST"
s = s.replace(old, new, 1)
print('  > portfolio persist')

# 2. Showcase init
old_si = """  const [showcase,    setShowcase]    = useState<CardItem[]>(()=>{
    try { const r=localStorage.getItem('pka_showcase'); return r?JSON.parse(r):[] } catch { return [] }
  })"""
new_si = """  const [showcase,    setShowcase]    = useState<CardItem[]>(()=>{
    try { const r=localStorage.getItem('pka_showcase'); return r?JSON.parse(r):[] } catch { return [] }
  })
  useEffect(() => {
    dbGet<CardItem[]>('showcase').then(data => {
      if (data && data.length > 0) setShowcase(data)
    })
  }, [])"""
assert old_si in s, "CIBLE SHOW INIT"
s = s.replace(old_si, new_si, 1)
print('  > showcase init')

# 3. Showcase persist
old_sp = "  useEffect(()=>{ try { localStorage.setItem('pka_showcase', JSON.stringify(showcase)) } catch {} }, [showcase])"
new_sp = """  useEffect(()=>{
    dbSet('showcase', showcase)
    try { const slim = showcase.map(c => c.image && c.image.startsWith('data:') ? { ...c, image: '' } : c); localStorage.setItem('pka_showcase', JSON.stringify(slim)) } catch {}
  }, [showcase])"""
assert old_sp in s, "CIBLE SHOW PERSIST"
s = s.replace(old_sp, new_sp, 1)
print('  > showcase persist')

f.write_text(s, 'utf-8')
print('OK')
