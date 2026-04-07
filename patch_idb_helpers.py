#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

old = "  const router = useRouter()"
new = """  // -- IndexedDB persistence --
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

# Verifier qu'on ne les a pas deja
if 'const dbOpen' not in s:
    assert old in s, "CIBLE"
    s = s.replace(old, new, 1)
    print('OK — helpers added')
else:
    print('SKIP — already present')

f.write_text(s, 'utf-8')
