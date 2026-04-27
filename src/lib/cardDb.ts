const DB_NAME = 'pka_cards'
const DB_VERSION = 2  // ← bumped from 1, forces reset on next open
const STORE = 'data'
const META_KEY = '_meta'

// Cache metadata stored alongside data: tracks data version + timestamp
interface CacheMeta {
  version: number  // data version (bump to invalidate)
  ts: number       // last fetch timestamp
}

const DATA_VERSION = 5  // bump when public/data/*.json content changes substantially
const TTL_MS = 24 * 60 * 60 * 1000  // 24h

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (event) => {
      const db = req.result
      // Wipe old store on version upgrade
      if (db.objectStoreNames.contains(STORE)) {
        db.deleteObjectStore(STORE)
      }
      db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function dbGet<T>(key: string): Promise<T | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

async function dbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Check if cached entry is still fresh (version match + within TTL)
async function isCacheFresh(): Promise<boolean> {
  const meta = await dbGet<CacheMeta>(META_KEY)
  if (!meta) return false
  if (meta.version !== DATA_VERSION) return false
  if (Date.now() - meta.ts > TTL_MS) return false
  return true
}

// Update metadata after a fresh fetch
async function setCacheFresh(): Promise<void> {
  await dbSet(META_KEY, { version: DATA_VERSION, ts: Date.now() })
}

export interface StaticSet {
  id: string; name: string; logo: string | null; serie: string | null
  releaseDate: string | null; total: number
}

export interface StaticCard {
  id: string; lid: string; n: string; img: string | null; r: string | null
}

async function fetchStatic<T>(file: string): Promise<T> {
  const res = await fetch(`/data/${file}`)
  if (!res.ok) throw new Error(`Static ${file}: ${res.status}`)
  return res.json()
}

export async function getSets(lang: 'FR' | 'EN' | 'JP'): Promise<StaticSet[]> {
  const key = `sets-${lang}`
  // 1. IndexedDB (only if fresh)
  if (await isCacheFresh()) {
    const cached = await dbGet<StaticSet[]>(key)
    if (cached) return cached
  }
  // 2. Static JSON
  try {
    const data = await fetchStatic<StaticSet[]>(`sets-${lang}.json`)
    await dbSet(key, data)
    await setCacheFresh()
    return data
  } catch {}
  // 3. Fallback API
  const apiLang = lang === 'JP' ? 'ja' : lang === 'EN' ? 'en' : 'fr'
  const res = await fetch(`https://api.tcgdex.net/v2/${apiLang}/sets`)
  const raw = await res.json()
  const sets: StaticSet[] = raw.map((s: any) => ({ id: s.id, name: s.name, logo: null, serie: null, releaseDate: null, total: 0 }))
  await dbSet(key, sets)
  return sets
}

export async function getCards(lang: 'FR' | 'EN' | 'JP'): Promise<Record<string, StaticCard[]>> {
  const key = `cards-${lang}`
  if (await isCacheFresh()) {
    const cached = await dbGet<Record<string, StaticCard[]>>(key)
    if (cached) return cached
  }
  try {
    const data = await fetchStatic<Record<string, StaticCard[]>>(`cards-${lang}.json`)
    await dbSet(key, data)
    await setCacheFresh()
    return data
  } catch {}
  return {}
}

export async function getCardsForSet(lang: 'FR' | 'EN' | 'JP', setId: string): Promise<StaticCard[]> {
  const all = await getCards(lang)
  if (all[setId]) return all[setId]
  for (const fallbackLang of ['EN', 'FR', 'JP'] as const) {
    if (fallbackLang === lang) continue
    try {
      const fallback = await getCards(fallbackLang)
      if (fallback[setId]) return fallback[setId]
    } catch {}
  }
  const apiLang = lang === 'JP' ? 'ja' : lang === 'EN' ? 'en' : 'fr'
  try {
    const res = await fetch(`https://api.tcgdex.net/v2/${apiLang}/sets/${setId}`)
    const data = await res.json()
    return (data.cards || []).map((c: any) => ({ id: c.id, lid: c.localId, n: c.name, img: c.image ? c.image + '/high.webp' : null, r: c.rarity || null }))
  } catch { return [] }
}

export function staticToTCGCards(cards: StaticCard[], setId: string, lang: string, imageResolver?: (lang: string, setId: string, localId: string) => string): { id: string; localId: string; name: string; image?: string; rarity?: string }[] {
  return cards.map(c => ({
    id: c.id || setId + '-' + c.lid,
    localId: c.lid,
    name: c.n,
    image: c.img || (imageResolver ? imageResolver(lang, setId, c.lid) : ''),
    rarity: c.r || undefined,
  }))
}

export async function getSyncDate(): Promise<string | null> {
  try {
    const meta = await fetchStatic<{ lastSync: string }>('sync-meta.json')
    return meta.lastSync
  } catch { return null }
}
