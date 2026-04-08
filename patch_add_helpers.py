#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

old = "import { getSets, getCards, type StaticSet, type StaticCard } from '@/lib/cardDb'"
new = """import { getSets, getCards, type StaticSet, type StaticCard } from '@/lib/cardDb'

interface PortfolioCard {
  id:string; name:string; set:string; setId?:string; number:string; rarity:string;
  type:string; lang:string; condition:string; graded:boolean; buyPrice:number;
  curPrice:number; qty:number; year:number; image?:string; setTotal?:number;
}
const pkaDbOpen = () => new Promise<IDBDatabase>((res, rej) => {
  const req = indexedDB.open('pka_db', 1)
  req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains('store')) db.createObjectStore('store') }
  req.onsuccess = () => res(req.result)
  req.onerror = () => rej(req.error)
})
const pkaDbGet = async <T,>(key: string): Promise<T|null> => {
  try { const db = await pkaDbOpen(); return new Promise((r,j) => { const tx=db.transaction('store','readonly'); const req=tx.objectStore('store').get(key); req.onsuccess=()=>r(req.result??null); req.onerror=()=>j(req.error) }) } catch { return null }
}
const pkaDbSet = async (key: string, value: unknown) => {
  try { const db = await pkaDbOpen(); return new Promise<void>((r,j) => { const tx=db.transaction('store','readwrite'); tx.objectStore('store').put(value,key); tx.oncomplete=()=>r(); tx.onerror=()=>j(tx.error) }) } catch {}
}"""

assert old in s, "CIBLE"
if 'PortfolioCard' not in s.split('export function')[0]:
    s = s.replace(old, new, 1)
    print('OK')
else:
    print('SKIP — already present')

f.write_text(s, 'utf-8')
