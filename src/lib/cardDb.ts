const DB_NAME = 'pka_cards'
const DB_VERSION = 1
const STORE = 'data'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE) }
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
  // 1. IndexedDB
  const cached = await dbGet<StaticSet[]>(key)
  if (cached) return cached
  // 2. Static JSON
  try {
    const data = await fetchStatic<StaticSet[]>(`sets-${lang}.json`)
    await dbSet(key, data)
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
  const cached = await dbGet<Record<string, StaticCard[]>>(key)
  if (cached) return cached
  try {
    const data = await fetchStatic<Record<string, StaticCard[]>>(`cards-${lang}.json`)
    await dbSet(key, data)
    return data
  } catch {}
  return {}
}

export async function getCardsForSet(lang: 'FR' | 'EN' | 'JP', setId: string): Promise<StaticCard[]> {
  const all = await getCards(lang)
  if (all[setId]) return all[setId]
  // Fallback: try other languages
  for (const fallbackLang of ['EN', 'FR', 'JP'] as const) {
    if (fallbackLang === lang) continue
    try {
      const fallback = await getCards(fallbackLang)
      if (fallback[setId]) return fallback[setId]
    } catch {}
  }
  // Last resort: TCGDex API
  const apiLang = lang === 'JP' ? 'ja' : lang === 'EN' ? 'en' : 'fr'
  try {
    const res = await fetch(`https://api.tcgdex.net/v2/${apiLang}/sets/${setId}`)
    const data = await res.json()
    return (data.cards || []).map((c: any) => ({ id: c.id, lid: c.localId, n: c.name, img: c.image ? c.image + '/high.webp' : null, r: c.rarity || null }))
  } catch { return [] }
}

// Convertit StaticCard[] en format compatible TCGCard (pour Holdings)
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
