#!/usr/bin/env python3
"""Portfolio persistence: IndexedDB (no size limit) + localStorage fallback"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. Ajouter les helpers IndexedDB en haut du composant, avant le premier useState
old_first = "  const router = useRouter()"
new_first = """  // -- IndexedDB persistence --
  const dbOpen = () => new Promise<IDBDatabase>((res, rej) => {
    const req = indexedDB.open('pka_db', 1)
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains('store')) db.createObjectStore('store') }
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
  const dbGet = async <T,>(key: string): Promise<T | null> => {
    try {
      const db = await dbOpen()
      return new Promise((res, rej) => {
        const tx = db.transaction('store', 'readonly')
        const req = tx.objectStore('store').get(key)
        req.onsuccess = () => res(req.result ?? null)
        req.onerror = () => rej(req.error)
      })
    } catch { return null }
  }
  const dbSet = async (key: string, value: unknown) => {
    try {
      const db = await dbOpen()
      return new Promise<void>((res, rej) => {
        const tx = db.transaction('store', 'readwrite')
        tx.objectStore('store').put(value, key)
        tx.oncomplete = () => res()
        tx.onerror = () => rej(tx.error)
      })
    } catch {}
  }

  const router = useRouter()"""

assert old_first in s, "CIBLE FIRST"
s = s.replace(old_first, new_first, 1)
print('  > IndexedDB helpers')

# 2. Remplacer l'init du portfolio — charger depuis IndexedDB
old_init = """  const [portfolio,   setPortfolio]   = useState<CardItem[]>(()=>{
    try { const r=localStorage.getItem('pka_portfolio'); return r?JSON.parse(r):[] } catch { return [] }
  })"""
new_init = """  const [portfolio,   setPortfolio]   = useState<CardItem[]>(()=>{
    try { const r=localStorage.getItem('pka_portfolio'); return r?JSON.parse(r):[] } catch { return [] }
  })
  const [portfolioLoaded, setPortfolioLoaded] = useState(false)
  // Charger depuis IndexedDB (prioritaire sur localStorage)
  useEffect(() => {
    dbGet<CardItem[]>('portfolio').then(data => {
      if (data && data.length > 0) setPortfolio(data)
      setPortfolioLoaded(true)
    }).catch(() => setPortfolioLoaded(true))
  }, [])"""

assert old_init in s, "CIBLE INIT"
s = s.replace(old_init, new_init, 1)
print('  > init from IndexedDB')

# 3. Remplacer la persistence — sauvegarder dans IndexedDB + localStorage slim
old_persist = """  useEffect(()=>{ try {
    // Ne pas stocker les images base64 dans localStorage (trop gros)
    const slim = portfolio.map(c => c.image && c.image.startsWith('data:') ? { ...c, image: '' } : c)
    localStorage.setItem('pka_portfolio', JSON.stringify(slim))
  } catch(e) { console.warn('Portfolio save failed:', e) } }, [portfolio])"""

new_persist = """  const saveTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
  useEffect(()=>{
    if (!portfolioLoaded) return
    // Debounce: attendre 500ms avant de sauvegarder
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      // IndexedDB: tout y compris les images base64
      dbSet('portfolio', portfolio)
      // localStorage: version slim sans base64 (fallback)
      try {
        const slim = portfolio.map(c => c.image && c.image.startsWith('data:') ? { ...c, image: '' } : c)
        localStorage.setItem('pka_portfolio', JSON.stringify(slim))
      } catch {}
    }, 500)
  }, [portfolio, portfolioLoaded])"""

assert old_persist in s, "CIBLE PERSIST"
s = s.replace(old_persist, new_persist, 1)
print('  > dual persistence')

# 4. Meme chose pour showcase
old_show_init = """  const [showcase,    setShowcase]    = useState<CardItem[]>(()=>{
    try { const r=localStorage.getItem('pka_showcase'); return r?JSON.parse(r):[] } catch { return [] }
  })"""
new_show_init = """  const [showcase,    setShowcase]    = useState<CardItem[]>(()=>{
    try { const r=localStorage.getItem('pka_showcase'); return r?JSON.parse(r):[] } catch { return [] }
  })
  useEffect(() => {
    dbGet<CardItem[]>('showcase').then(data => {
      if (data && data.length > 0) setShowcase(data)
    })
  }, [])"""

assert old_show_init in s, "CIBLE SHOW INIT"
s = s.replace(old_show_init, new_show_init, 1)
print('  > showcase init from IDB')

old_show_persist = "  useEffect(()=>{ try { localStorage.setItem('pka_showcase', JSON.stringify(showcase)) } catch {} }, [showcase])"
new_show_persist = """  useEffect(()=>{
    dbSet('showcase', showcase)
    try { const slim = showcase.map(c => c.image && c.image.startsWith('data:') ? { ...c, image: '' } : c); localStorage.setItem('pka_showcase', JSON.stringify(slim)) } catch {}
  }, [showcase])"""

assert old_show_persist in s, "CIBLE SHOW PERSIST"
s = s.replace(old_show_persist, new_show_persist, 1)
print('  > showcase dual persist')

f.write_text(s, 'utf-8')
print('OK')
