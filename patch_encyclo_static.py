#!/usr/bin/env python3
"""Encyclopedie: charger depuis static data avec fallback API"""
from pathlib import Path

f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# 1. Ajouter import de cardDb
old_import = "import { fetchSets, fetchAllCards, fetchCardDetail, type TCGCard, type TCGCardFull } from '@/lib/tcgApi'"
new_import = """import { fetchSets, fetchAllCards, fetchCardDetail, type TCGCard, type TCGCardFull } from '@/lib/tcgApi'
import { getSets, getCards, type StaticSet, type StaticCard } from '@/lib/cardDb'"""
assert old_import in s, "CIBLE IMPORT"
s = s.replace(old_import, new_import, 1)
print('  > import cardDb')

# 2. Remplacer le useEffect de chargement
old_effect = """  useEffect(() => {
    setLoading(true); setLoadErr(false); setLoadMsg('Chargement des s\u00e9ries\u2026')
    setAllCards([]); setFilSet('all'); setFilEra('all')
    setPage(0); setSelId(null); setDetail(null); setEnDetail(null)

    const setsP = fetchSets(lang)
    const cardsP = fetchAllCards(lang)
    const enCardsP = lang==='JP' ? fetchAllCards('EN').catch(()=>[]) : Promise.resolve([])

    Promise.all([setsP, cardsP, enCardsP])
      .then(([sets, cards, enCards]) => {
        const setMap   = new Map(sets.map(s=>[s.id,s]))
        // Map EN par localId+setId pour la traduction
        const enMap    = new Map<string, string>()
        enCards.forEach(c => {
          const sid = c.id.substring(0, c.id.lastIndexOf('-')) || c.id
          enMap.set(`${sid}-${c.localId}`, c.name)
        })
        const enImgMap = new Map<string, string>()
        enCards.forEach(c => { const sid = c.id.substring(0, c.id.lastIndexOf('-')) || c.id; if (c.image) enImgMap.set(`${sid}-${c.localId}`, c.image) })
        const enriched: EnrichedCard[] = cards.map(c => {
          const setId  = c.id.substring(0, c.id.lastIndexOf('-')) || c.id
          const set    = setMap.get(setId)
          const year   = set?.releaseDate ? parseInt(set.releaseDate.slice(0,4))||0 : 0
          const era    = setIdToEra(setId) !== 'Autre' ? setIdToEra(setId) : yearToEra(year)
          const enName  = lang==='JP' ? enMap.get(`${setId}-${c.localId}`) : undefined
          const enImage = lang==='JP' ? enImgMap.get(`${setId}-${c.localId}`) : undefined
          return { ...c, setId, setName: set?.name ?? setId, year, era, enName, enImage }
        })
        setAllCards(enriched); setLoadMsg(''); setLoading(false)
      })
      .catch(() => { setLoadErr(true); setLoading(false) })
  }, [lang])"""

EA = '\u00e9'
new_effect = """  useEffect(() => {
    setLoading(true); setLoadErr(false); setLoadMsg('Chargement...')
    setAllCards([]); setFilSet('all'); setFilEra('all')
    setPage(0); setSelId(null); setDetail(null); setEnDetail(null)

    const loadFromStatic = async (): Promise<{sets: {id:string;name:string;releaseDate?:string|null}[]; cards: EnrichedCard[]}|null> => {
      try {
        const [staticSets, staticCards] = await Promise.all([getSets(lang), getCards(lang)])
        if (!staticSets.length) return null
        const enCards = lang==='JP' ? await getCards('EN').catch(()=>({})) : {}
        const setMap = new Map(staticSets.map(s=>[s.id, s]))
        const enMap = new Map<string, string>()
        const enImgMap = new Map<string, string>()
        if (lang==='JP') {
          Object.entries(enCards).forEach(([sid, cards]) => {
            (cards as any[]).forEach(c => {
              enMap.set(sid+'-'+c.lid, c.n)
              if (c.img) enImgMap.set(sid+'-'+c.lid, c.img)
            })
          })
        }
        const enriched: EnrichedCard[] = []
        Object.entries(staticCards).forEach(([sid, cards]) => {
          const set = setMap.get(sid)
          const year = set?.releaseDate ? parseInt(set.releaseDate.slice(0,4))||0 : 0
          const era = setIdToEra(sid) !== 'Autre' ? setIdToEra(sid) : yearToEra(year)
          ;(cards as any[]).forEach(c => {
            enriched.push({
              id: sid+'-'+c.lid, localId: c.lid, name: c.n, image: c.img||'',
              rarity: c.r||'', category: '', hp: '', types: [],
              setId: sid, setName: set?.name ?? sid, year, era,
              enName: lang==='JP' ? enMap.get(sid+'-'+c.lid) : undefined,
              enImage: lang==='JP' ? enImgMap.get(sid+'-'+c.lid) : undefined,
            })
          })
        })
        return { sets: staticSets as any[], cards: enriched }
      } catch { return null }
    }

    const loadFromAPI = async (): Promise<EnrichedCard[]> => {
      const [sets, cards, enCards] = await Promise.all([
        fetchSets(lang), fetchAllCards(lang),
        lang==='JP' ? fetchAllCards('EN').catch(()=>[]) : Promise.resolve([])
      ])
      const setMap = new Map(sets.map(s=>[s.id,s]))
      const enMap = new Map<string, string>()
      enCards.forEach(c => { const sid = c.id.substring(0, c.id.lastIndexOf('-')) || c.id; enMap.set(sid+'-'+c.localId, c.name) })
      const enImgMap = new Map<string, string>()
      enCards.forEach(c => { const sid = c.id.substring(0, c.id.lastIndexOf('-')) || c.id; if (c.image) enImgMap.set(sid+'-'+c.localId, c.image) })
      return cards.map(c => {
        const setId = c.id.substring(0, c.id.lastIndexOf('-')) || c.id
        const set = setMap.get(setId)
        const year = set?.releaseDate ? parseInt(set.releaseDate.slice(0,4))||0 : 0
        const era = setIdToEra(setId) !== 'Autre' ? setIdToEra(setId) : yearToEra(year)
        return { ...c, setId, setName: set?.name ?? setId, year, era,
          enName: lang==='JP' ? enMap.get(setId+'-'+c.localId) : undefined,
          enImage: lang==='JP' ? enImgMap.get(setId+'-'+c.localId) : undefined }
      })
    }

    loadFromStatic().then(result => {
      if (result && result.cards.length > 0) {
        setAllCards(result.cards); setLoadMsg(''); setLoading(false)
      } else {
        return loadFromAPI().then(cards => {
          setAllCards(cards); setLoadMsg(''); setLoading(false)
        })
      }
    }).catch(() => {
      loadFromAPI().then(cards => {
        setAllCards(cards); setLoadMsg(''); setLoading(false)
      }).catch(() => { setLoadErr(true); setLoading(false) })
    })
  }, [lang])"""

assert old_effect in s, "CIBLE EFFECT"
s = s.replace(old_effect, new_effect, 1)
print('  > static + fallback loading')

f.write_text(s, 'utf-8')
print('OK')
