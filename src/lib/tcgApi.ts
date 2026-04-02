const BASE = 'https://api.tcgdex.net/v2'
const TTL  = 24 * 60 * 60 * 1000

export interface TCGSet     { id:string; name:string; lang:string; total?:number; releaseDate?:string }
export interface TCGCard    { id:string; name:string; localId:string; image?:string; rarity?:string }
export interface TCGCardFull {
  id:string; localId:string; name:string; image?:string
  category?:string; hp?:number; types?:string[]; rarity?:string
  illustrator?:string; stage?:string; evolveFrom?:string
  attacks?:Array<{ name:string; cost:string[]; damage?:number; effect?:string }>
  weaknesses?:Array<{ type:string; value:string }>
  set?:{ id:string; name:string; releaseDate?:string }
}

type Lang = 'EN'|'FR'|'JP'
const LC: Record<Lang,string> = { EN:'en', FR:'fr', JP:'ja' }

function getCache<T>(key:string): T|null {
  try {
    const raw = localStorage.getItem(key); if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now()-ts > TTL) { localStorage.removeItem(key); return null }
    return data as T
  } catch { return null }
}
function setCache(key:string, data:unknown) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts:Date.now() })) } catch {}
}

export async function fetchSets(lang:Lang): Promise<TCGSet[]> {
  const l=LC[lang], key=`tcg_sets_${l}`
  const hit=getCache<TCGSet[]>(key); if (hit) return hit
  const res=await fetch(`${BASE}/${l}/sets`)
  if (!res.ok) throw new Error(`fetchSets ${lang} failed`)
  const raw:Array<{id:string;name:string;cardCount?:{total?:number};releaseDate?:string}>=await res.json()
  const sets:TCGSet[]=raw.map(s=>({id:s.id,name:s.name,lang,total:s.cardCount?.total,releaseDate:s.releaseDate}))
  setCache(key,sets); return sets
}

export async function fetchCardsForSet(lang:Lang, setId:string): Promise<TCGCard[]> {
  const l=LC[lang], key=`tcg_cards_${l}_${setId}`
  const hit=getCache<TCGCard[]>(key); if (hit) return hit
  const res=await fetch(`${BASE}/${l}/sets/${setId}`)
  if (!res.ok) throw new Error(`fetchCardsForSet ${setId} failed`)
  const raw:{cards?:Array<{id?:string;name:string;localId:string;image?:string}>}=await res.json()
  const cards:TCGCard[]=(raw.cards??[]).map(c=>({id:c.id??c.localId,name:c.name,localId:c.localId,image:c.image,rarity:(c as any).rarity}))
  setCache(key,cards); return cards
}

export async function searchCards(lang:Lang, query:string): Promise<TCGCard[]> {
  const l=LC[lang], key=`tcg_search_${l}_${query.toLowerCase()}`
  const hit=getCache<TCGCard[]>(key); if (hit) return hit
  const res=await fetch(`${BASE}/${l}/cards?name=${encodeURIComponent(query)}`)
  if (!res.ok) return []
  const raw:Array<{id?:string;name:string;localId:string;image?:string}>=await res.json()
  const cards:TCGCard[]=raw.map(c=>({id:c.id??c.localId,name:c.name,localId:c.localId,image:c.image,rarity:(c as any).rarity}))
  setCache(key,cards); return cards
}

export async function fetchAllCards(lang:Lang): Promise<TCGCard[]> {
  const l=LC[lang], key=`tcg_allcards_${l}`
  const hit=getCache<TCGCard[]>(key); if (hit) return hit
  const res=await fetch(`${BASE}/${l}/cards`)
  if (!res.ok) throw new Error(`fetchAllCards ${lang} failed`)
  const raw:Array<{id?:string;name:string;localId:string;image?:string}>=await res.json()
  const cards:TCGCard[]=raw.map(c=>({id:c.id??c.localId,name:c.name,localId:c.localId,image:c.image,rarity:(c as any).rarity}))
  setCache(key,cards); return cards
}

export async function fetchCardDetail(lang:Lang, cardId:string): Promise<TCGCardFull|null> {
  const l=LC[lang], key=`tcg_detail_${l}_${cardId}`
  const hit=getCache<TCGCardFull>(key); if (hit) return hit
  try {
    const res=await fetch(`${BASE}/${l}/cards/${cardId}`)
    if (!res.ok) return null
    const data:TCGCardFull=await res.json()
    setCache(key,data); return data
  } catch { return null }
}
