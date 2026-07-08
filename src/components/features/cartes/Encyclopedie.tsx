'use client'

import { getCardImageUrl, cleanLegacyUrl } from '@/lib/images'
import { CardImg } from '@/components/ui/CardImg'
import AuthModal from '@/components/layout/AuthModal'
import { CollectionGate } from './CollectionGate'
import { SetPicker } from './SetPicker'
import { useCardPrices } from '@/components/features/prices/hooks/useCardPrices'
import { SNOW } from '@/lib/design/colors'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { fetchSets, fetchAllCards, fetchCardDetail, type TCGCard, type TCGCardFull } from '@/lib/tcgApi'
import { formatJPSetName } from '@/lib/setGroups'
import { formatEUR } from '@/lib/formatPrice'
import { CardSidePanel } from '@/components/features/card/CardSidePanel'
import type { TCGSet } from '@/lib/tcgApi'
import { getSets, getCards, type StaticSet, type StaticCard } from '@/lib/cardDb'
import { AddToCollectionModal, type AddCardSeed } from '@/components/features/card/AddToCollectionModal'

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
}

const ERA_COLORS: Record<string,string> = {
  'Original (WotC)':'#854F0B', 'EX':'#993C1D', 'Diamant & Perle / Platine':'#0F6E56',
  'Noir & Blanc':'#444441', 'XY':'#185FA5', 'Soleil & Lune':'#BA7517',
  'Épée & Bouclier':'#534AB7', 'Écarlate & Violet':'#A32D2D',
  'Méga-Évolution':'#C2410C', 'Pokémon Pocket':'#7C3AED', 'Promos & Coffrets':'#5F5E5A',
}
const RARITY_COLORS: Record<string,{bg:string;fg:string}> = {
  'Commune':       {bg:'#F1EFE8',fg:'#5F5E5A'},
  'Common':        {bg:'#F1EFE8',fg:'#5F5E5A'},
  'Peu Commune':   {bg:'#E1F5EE',fg:'#085041'},
  'Uncommon':      {bg:'#E1F5EE',fg:'#085041'},
  'Rare':          {bg:'#E6F1FB',fg:'#0C447C'},
  'Holo Rare':     {bg:'#EEEDFE',fg:'#3C3489'},
  'Ultra Rare':    {bg:'#FBEAF0',fg:'#72243E'},
  'Double Rare':   {bg:'#FBEAF0',fg:'#72243E'},
  'Illustration Rare': {bg:'#FAEEDA',fg:'#633806'},
  'Special Art Rare':  {bg:'#FAEEDA',fg:'#633806'},
  'Hyper Rare':    {bg:'#FAEEDA',fg:'#633806'},
  'Secret Rare':   {bg:'#FAEEDA',fg:'#633806'},
  'Alt Art':       {bg:'#FAEEDA',fg:'#633806'},
  'ACE SPEC Rare': {bg:'#FCEBEB',fg:'#791F1F'},
  'Shiny Rare':    {bg:'#EEEDFE',fg:'#3C3489'},
}
const getRarityColor = (r:string) => RARITY_COLORS[r] || {bg:'#F1EFE8',fg:'#5F5E5A'}

const TC: Record<string,string> = {
  Fire:'#FF6B35', Water:'#42A5F5', Psychic:'#C855D4', Darkness:'#7E57C2',
  Lightning:'#D4A800', Grass:'#3DA85A', Colorless:'#AAAAAA', Fighting:'#C97840',
  Metal:'#8090A8', Dragon:'#9060A0', Fairy:'#FF88AA',
}

const ERA_ORDER = ['Original (WotC)','EX','Diamant & Perle / Platine','Noir & Blanc','XY','Soleil & Lune','Épée & Bouclier','Écarlate & Violet','Méga-Évolution','Pokémon Pocket','Promos & Coffrets']
// Code serie japonais affiche a cote du nom international (vue JP uniquement)
const ERA_JP_CODE: Record<string,string> = {
  'Original (WotC)': 'BASE',
  'EX': 'ADV',
  'Diamant & Perle / Platine': 'DPt',
  'Noir & Blanc': 'BW',
  'XY': 'XY',
  'Soleil & Lune': 'SM',
  'Épée & Bouclier': 'S',
  'Écarlate & Violet': 'SV',
  'Méga-Évolution': 'M',
  'Pokémon Pocket': 'A',
}

const ERA_PREFIX: [string, string][] = [
  ['base','Original (WotC)'],['jungle','Original (WotC)'],['fossil','Original (WotC)'],
  ['teamrocket','Original (WotC)'],['gym','Original (WotC)'],['neo','Original (WotC)'],
  ['si1','Original (WotC)'],['lc','Original (WotC)'],['ecard','Original (WotC)'],
  ['expedition','Original (WotC)'],['aquapolis','Original (WotC)'],['skyridge','Original (WotC)'],
  ['ex','EX'],['pop','EX'],
  ['dp','Diamant & Perle / Platine'],['pl','Diamant & Perle / Platine'],['pt','Diamant & Perle / Platine'],['hgss','Diamant & Perle / Platine'],
  ['bw','Noir & Blanc'],['dv','Noir & Blanc'],
  ['xy','XY'],['g1','XY'],['dc','XY'],
  ['sm','Soleil & Lune'],['det','Soleil & Lune'],['tg','Soleil & Lune'],
  ['swsh','Épée & Bouclier'],['cel','Épée & Bouclier'],['pgo','Épée & Bouclier'],
  ['sv','Écarlate & Violet'],
  ['me','Méga-Évolution'],['mee','Méga-Évolution'],
  ['a','Pokémon Pocket'],['b','Pokémon Pocket'],['p-a','Pokémon Pocket'],
  ['tk-','Promos & Coffrets'],
  ['sw','Épée & Bouclier'],['s','Épée & Bouclier'],
]

// Maps the `serie` field from sets-{LANG}.json (DB column tcg_sets.series)
// to the human-readable era used by ERA_ORDER.
const SERIES_TO_ERA: Record<string, string> = {
  'base':  'Original (WotC)',
  'neo':   'Original (WotC)',
  'ecard': 'Original (WotC)',
  'ex':    'EX',
  'pop':   'EX',
  'dp':    'Diamant & Perle / Platine',
  'pl':    'Diamant & Perle / Platine',
  'pt':    'Diamant & Perle / Platine',
  'hgss':  'Diamant & Perle / Platine',
  'col':   'Diamant & Perle / Platine',
  'bw':    'Noir & Blanc',
  'dv':    'Noir & Blanc',
  'xy':    'XY',
  'g1':    'XY',
  'dc':    'XY',
  'swsh':  'Épée & Bouclier',
  'sm':    'Soleil & Lune',
  'det':   'Soleil & Lune',
  'tg':    'Soleil & Lune',
  'cel':   'Épée & Bouclier',
  'pgo':   'Épée & Bouclier',
  'sv':    'Écarlate & Violet',
  'me':    'Méga-Évolution',
  'pocket':'Pokémon Pocket',
  'promo': 'Promos & Coffrets',
}

function setIdToEra(setId:string, serie?:string|null): string {
  // Priority 1: if serie is provided (from JSON), use it directly
  if (serie && SERIES_TO_ERA[serie]) return SERIES_TO_ERA[serie]
  // Strip language prefix (jp-/fr-/en-) so JP sets like "jp-SV9" match "sv"
  const stripped = setId.replace(/^(jp-|fr-|en-)/i, '')
  const low = stripped.toLowerCase()

  // Special-case JP-only sets that don't follow EN naming conventions
  if (setId.toLowerCase().startsWith('jp-')) {
    // Pokemon Japanese specific sets
    if (low === 'si') return 'Épée & Bouclier'         // Special Illustration 2022
    if (low === 'mc') return 'Écarlate & Violet'       // Mega Collection 2025
    if (low.startsWith('m1') || low.startsWith('m2') || low.startsWith('m3') || low.startsWith('m4')) return 'Écarlate & Violet'  // Mega series
    if (low === 'm-p' || low === 'mp1') return 'Écarlate & Violet'
    if (low.startsWith('mb') || low === 'ma') return 'Écarlate & Violet'
    if (low === 'wcs23') return 'Épée & Bouclier'
    if (low === '20th') return 'Soleil & Lune'           // 20th Anniversary 2016
    if (low === 'pcg') return 'EX'                    // Pokemon Card Game era 2003
    if (low === 'l1' || low === 'l1a' || low === 'l1b' || low === 'l2' || low === 'l3') return 'Diamant & Perle / Platine'  // Legend era HGSS JP
    if (low === 'adv1' || low === 'adv2' || low === 'adv3' || low === 'adv4' || low === 'adv5') return 'EX'  // Advance era
    if (low === 'e1' || low === 'e2' || low === 'e3' || low === 'e4' || low === 'e5' || low === 'e6' || low === 'e7' || low === 'e8' || low === 'e9') return 'Original (WotC)'  // E-Card 2002-2003
    // Vintage exclusives (toyota, corocoro, ana, meiji, etc.)
    if (/^(toyota|corocoro|ana|meiji|coin-promo|insert|amada|pmcg|bulbasaur-deck|squirtle-deck|charmander-deck|pikachu-deck|red-green-gift|video-starter|cd-promo|vending|secret-super-battle|tropical-mega-battle|southern-islands|pro-trainer|gym-deck|hanada-city|kuchiba-city|nivi-city|tamamushi-city|guren-town|yamabuki-city|toko)/i.test(low)) {
      return 'Original (WotC)'
    }
    // BW Promo sets
    if (low === 'bwp' || low === 'bw' || low.startsWith('bk')) return 'Noir & Blanc'
    if (low === 'br' || low === 'bb' || low === 'bd' || low === 'bk' || low === 'bgst' || low === 'bgsv') return 'Noir & Blanc'
    if (low === 'btv') return 'Noir & Blanc'
  }

  // Standard EN/FR matching with stripped prefix
  for (const [prefix, era] of ERA_PREFIX) {
    if (low.startsWith(prefix)) return era
  }
  return 'Autre'
}

function yearToEra(y:number): string {
  if (!y)      return 'Autre'
  if (y<=2003) return 'Original (WotC)'
  if (y<=2006) return 'EX'
  if (y<=2010) return 'Diamant & Perle / Platine'
  if (y<=2013) return 'Noir & Blanc'
  if (y<=2016) return 'XY'
  if (y<=2019) return 'Soleil & Lune'
  if (y<=2022) return 'Épée & Bouclier'
  return 'Écarlate & Violet'
}
// JP: classement 100% par date de sortie (fiable, pas de faux-positifs de prefixe).
// Bornes calees sur les transitions d'eres japonaises.
function jpYearToEra(y:number): string {
  if (!y)      return 'Autre'
  if (y<=2002) return 'Original (WotC)'   // Base 1996 -> e-Card/VS 2002
  if (y<=2006) return 'EX'                // ADV 2003 -> PCG 2006
  if (y<=2010) return 'Diamant & Perle / Platine'  // DP 2006/07 -> L/HGSS 2010
  if (y<=2013) return 'Noir & Blanc'
  if (y<=2016) return 'XY'
  if (y<=2019) return 'Soleil & Lune'
  if (y<=2022) return 'Épée & Bouclier'
  return 'Écarlate & Violet'              // SV 2023+ / MEGA 2025+
}

type Lang     = 'EN'|'FR'|'JP'
type SortKey  = 'set'|'name'
type ViewMode = 'grid'|'list'

interface EnrichedCard extends TCGCard {
  setId:string; setName:string; year:number; era:string; enName?:string; enImage?:string; enSetName?:string
}

const CHUNK_SIZE = 60
const LC_MAP: Record<Lang,string> = { EN:'en', FR:'fr', JP:'ja' }

// Lookup JP card name → {en, fr} from Pokédex dictionary
function jpToNames(jpName: string, dict: Record<string,{en:string;fr:string}|string>): {en:string;fr:string} | null {
  if (!jpName || !dict) return null
  const resolve = (v: any, suffix?: string): {en:string;fr:string}|null => {
    if (!v) return null
    if (typeof v === 'string') return { en: v + (suffix||''), fr: v + (suffix||'') }
    return { en: (v.en||'') + (suffix||''), fr: (v.fr||v.en||'') + (suffix||'') }
  }
  // Direct match
  if (dict[jpName]) return resolve(dict[jpName])
  // Try base name (strip ex/EX/GX/V/VMAX/VSTAR/BREAK suffix)
  const suffixMatch = jpName.match(/^(.+?)(ex|EX|GX|V|VMAX|VSTAR|BREAK|ｅｘ)$/)
  if (suffixMatch) {
    const base = suffixMatch[1]
    const suffix = ' ' + suffixMatch[2].replace('ｅｘ','ex')
    if (dict[base]) return resolve(dict[base], suffix)
  }
  return null
}

function cardImageUrl(card: EnrichedCard, lang: Lang): string|null {
  if (card.image) return card.image
  if (card.setId && card.localId) return getCardImageUrl({ lang, setId: card.setId, localId: card.localId })
  if (lang === 'JP' && card.enImage) return card.enImage
  return null
}

export function Encyclopedie() {
  const router = useRouter()

  const [lang,       setLang]        = useState<Lang>('FR')
  const [drawerMounted, setDrawerMounted] = useState(false)
  const [addSeed, setAddSeed] = useState<AddCardSeed | null>(null)
  useEffect(() => { setDrawerMounted(true) }, [])
  const [allCards,   setAllCards]    = useState<EnrichedCard[]>([])
  const [loading,    setLoading]     = useState(false)
  const [loadErr,    setLoadErr]     = useState(false)
  const [loadMsg,    setLoadMsg]     = useState('')

  const [search,     setSearch]      = useState('')
  const [searchFocus, setSearchFocus] = useState(false)
  const searchSuggs = useMemo(() => {
    if (search.length < 2) return []
    const q = search.toLowerCase()
    return allCards.filter(c => c.name.toLowerCase().includes(q) || c.setName.toLowerCase().includes(q) || (c.enName && c.enName.toLowerCase().includes(q))).slice(0, 8)
  }, [search, allCards])
  const [filEra,     setFilEra]      = useState('all')
  const [browseMode, setBrowseMode]  = useState<'all'|'bloc'>('all')
  const [selBloc,    setSelBloc]     = useState<string|null>(null)
  const [filSet,     setFilSet]      = useState('all')
  const [filRarity,  setFilRarity]   = useState('all')
  const [sort,       setSort]        = useState<SortKey>('set')
  const { user, isPro } = useAuth()
  const [visibleCount, setVisibleCount] = useState(CHUNK_SIZE)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [view,       setView]        = useState<ViewMode>('grid')
  const [page,       setPage]        = useState(0)
  const [portfolio,  setPortfolioLocal] = useState<PortfolioCard[]>([])
  const [toast,      setToast]       = useState('')

  useEffect(() => {
    pkaDbGet<PortfolioCard[]>('portfolio').then(data => {
      if (data) setPortfolioLocal(data)
      else { try { const r=localStorage.getItem('pka_portfolio'); if(r) setPortfolioLocal(JSON.parse(r)) } catch {} }
    })
  }, [])

  const ownedKeys = useMemo(() => {
    const s = new Set<string>()
    portfolio.forEach(c => { if(c.setId && c.number) s.add(c.setId+'-'+c.number); s.add(c.name+'|'+c.set) })
    return s
  }, [portfolio])

  const isOwned = (card: EnrichedCard) => ownedKeys.has(card.setId+'-'+card.localId) || ownedKeys.has(card.name+'|'+card.setName)

  // Ouvre le modal d'ajout (etat / grade / quantite / prix) pre-rempli depuis la
  // carte cliquee. Gate logged-out conserve : pas de modal si non connecte.
  const openAddModal = (card: EnrichedCard) => {
    if (!user) {
      setGateCard({ name: card.name, lang: lang as string, setId: card.setId, localId: card.localId, image: card.image || card.enImage || '' })
      return
    }
    setAddSeed({
      name: card.name || 'Carte',
      set_name: card.setName || null,
      set_id: card.setId || null,
      card_number: card.localId || null,
      lang: lang,
      rarity: card.rarity || null,
      card_type: null,
      image_url: card.image || card.enImage || getCardImageUrl({ lang: lang as string, setId: card.setId, localId: card.localId }) || null,
      k_card_id: kodoIdOf(card) ?? null,
    })
  }
  // onAdd du modal : ecrit la carte avec ses vrais etat/grade/quantite/prix.
  // Meme insert Supabase que l'ancienne voie, etendu aux colonnes gradation
  // (graded / grade_company / grade_value). Renvoie la ligne (non-null) pour que
  // le modal compte l'ajout et reste ouvert en mode multi-exemplaires.
  const handleModalAdd = async (payload: Record<string, unknown>) => {
    if (!user) return null
    const id = crypto.randomUUID()
    const name = String(payload.name ?? 'Carte')
    const set_name = String(payload.set_name ?? '')
    const set_id = payload.set_id ? String(payload.set_id) : null
    const card_number = String(payload.card_number ?? '')
    const cardLang = String(payload.lang ?? lang)
    const rarity = String(payload.rarity ?? '')
    const condition = String(payload.condition ?? 'Raw')
    const graded = Boolean(payload.graded)
    const grade_company = graded ? ((payload.grade_company as string | null) ?? null) : null
    const grade_value = graded ? ((payload.grade_value as string | null) ?? null) : null
    const qty = Number(payload.qty ?? 1) || 1
    const buy_price = payload.buy_price != null ? (Number(payload.buy_price) || 0) : 0
    const image_url = String(payload.image_url ?? '') || getCardImageUrl({ lang: cardLang, setId: set_id ?? undefined, localId: card_number }) || ''
    console.log('[KC ADD] user.id =', user.id, '| card =', name)
    const { data: insData, error } = await supabase.from('portfolio_cards').insert({
      id,
      user_id: user.id,
      name,
      set_name,
      set_id,
      card_number,
      rarity,
      lang: cardLang,
      condition,
      graded,
      grade_company,
      grade_value,
      qty,
      buy_price,
      image_url,
    }).select()
    if (error) {
      const code = (error as any).code
      if (code === 'free_limit') {
        setToast('Limite de ' + ((error as any).limit ?? 800) + ' cartes atteinte (plan gratuit)')
      } else {
        console.error('[KC ADD] INSERT ECHOUE:', JSON.stringify(error))
        setToast('Erreur de sauvegarde')
      }
      setTimeout(() => setToast(''), 2500)
      return null
    }
    const row: any = insData && insData[0] ? insData[0] : null
    const mirror: PortfolioCard = {
      id,
      name,
      set: set_name,
      setId: set_id ?? '',
      number: card_number,
      rarity,
      type: 'fire',
      lang: cardLang,
      condition,
      graded,
      buyPrice: buy_price,
      curPrice: Number(row?.current_price ?? 0) || 0,
      qty,
      year: new Date().getFullYear(),
      image: image_url,
      setTotal: allCards.filter(c => c.setId === set_id).length,
    }
    setPortfolioLocal(prev => [...prev, mirror])
    setToast(name + ' ajouté')
    setTimeout(() => setToast(''), 2000)
    return row ?? { id }
  }

  const [cardSize,   setCardSize]    = useState<'S'|'M'|'L'>('M')
  // Mobile : forcer la vue grille (tableau illisible <768px)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const enforce = () => { if (mq.matches) setView('grid') }
    enforce()
    mq.addEventListener('change', enforce)
    return () => mq.removeEventListener('change', enforce)
  }, [])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [setPickerOpen, setSetPickerOpen] = useState(false)
  const activeFilterCount = [filEra!=='all', filSet!=='all', filRarity!=='all'].filter(Boolean).length
  const [gateCard, setGateCard] = useState<{name:string;lang:string;setId:string;localId:string;image?:string}|null>(null)
  const [authModal, setAuthModal] = useState<null|'login'|'signup'>(null)
  const [lightbox,   setLightbox]    = useState<EnrichedCard|null>(null)
  // ── Prix via hook centralisé useCardPrices ──
  // Encyclopedie affiche toutes les cartes → setIds=null charge tous les prix
  const { priceDetails, priceMap, setMapping } = useCardPrices(null, { byName: false })
  // ── Kodo Engine: prix par lot pour les cartes visibles (fallback legacy si absent) ──
  const [kodoPrices, setKodoPrices] = useState<Record<string, { displayEur: number|null; coteFrEur: number|null; liquidity: number|null }>>({})
  const kodoRequested = useRef<Set<string>>(new Set())
  const kodoIdOf = useCallback((c: any): string => {
    // L'id reel de la carte est deja l'id Kodo (fr-ecard1-1, jp-603707, en-base1-4).
    // On l'utilise en priorite: la reconstruction ci-dessous echoue pour le JP
    // (format jp-{tcgPlayerId}, pas jp-{setId}-{num}) et quand c.lang est absent.
    if (c.id && /^(en|fr|jp)-/i.test(String(c.id))) return String(c.id).toLowerCase()
    // Fallback (cartes sans id exploitable): reconstruction depuis setId + langue + numero.
    const sid: string = c.setId || ''
    const num = String(c.localId ?? c.number ?? '').replace(/^0+(?=\d)/, '')
    if (!sid || !num) return ''
    const prefixed = /^(en|fr|jp)-/.test(sid)
    const lg = String(c.lang || lang || 'EN').toLowerCase()
    const langPrefix = lg === 'ja' || lg === 'jp' ? 'jp' : (lg === 'fr' ? 'fr' : 'en')
    return (prefixed ? sid : langPrefix + '-' + sid) + '-' + num
  }, [lang])
  const requestKodoPrices = useCallback((ids: string[]) => {
    const fresh = ids.filter(id => id && !kodoRequested.current.has(id))
    if (!fresh.length) return
    fresh.forEach(id => kodoRequested.current.add(id))
    for (let i = 0; i < fresh.length; i += 150) {
      const chunk = fresh.slice(i, i + 150)
      fetch('/api/kodo/prices/batch?ids=' + encodeURIComponent(chunk.join(',')))
        .then(r => r.ok ? r.json() : null)
        .then(j => { if (j?.prices) setKodoPrices(prev => ({ ...prev, ...j.prices })) })
        .catch(() => {})
    }
  }, [])
  const getPrice = (card: { name: string; setName?: string; localId?: string; setId?: string }): number|null => {
    // Priority 0: Kodo Engine
    const kid = kodoIdOf(card)
    const kp = kid ? kodoPrices[kid] : undefined
    if (kp?.displayEur != null) return kp.displayEur
    const USD_TO_EUR = 0.92
    const sid = (card as any).setId || ''
    const slug = setMapping[sid] || setMapping[sid.replace(/-shadowless(-ns)?|-1st/g,'')] || ''
    const varHint = sid.includes('-1st') || sid.includes('-shadowless-ns') ? '1st_Edition_Holofoil' : (sid.includes('-shadowless') && !sid.includes('-shadowless-ns')) ? 'Unlimited_Holofoil' : ''
    // Priority 1: weighted average from priceDetails (most accurate)
    const dk = slug + '|' + varHint + '|' + (card.localId||'')
    const det = priceDetails[dk]
    if (det?.estimated) return det.estimated
    // Priority 2: variant match
    if (varHint && slug) {
      const vk = slug + '|' + varHint + '|' + (card.localId||'')
      if (priceMap[vk]?.top) return Math.round(priceMap[vk].top! * USD_TO_EUR * 100) / 100
    }
    // Priority 3: slug+number
    if (slug) {
      const sk = slug + '|' + (card.localId||'')
      if (priceMap[sk]?.top) return Math.round(priceMap[sk].top! * USD_TO_EUR * 100) / 100
    }
    // Fallback by name
    const nameKey = card.name.toLowerCase()
    if(priceMap[nameKey]?.top) return Math.round(priceMap[nameKey].top! * USD_TO_EUR * 100) / 100
    return null
  }
  const getPriceDetail = (card: { name: string; setName?: string; localId?: string; setId?: string }): { ebay: number|null; tcg: number|null; cardmarket: number|null; poketrace: number|null; estimated: number|null } | null => {
    const sid = (card as any).setId || ''
    const slug = setMapping[sid] || setMapping[sid.replace(/-shadowless(-ns)?|-1st/g,'')] || ''
    const varHint = sid.includes('-1st') || sid.includes('-shadowless-ns') ? '1st_Edition_Holofoil' : (sid.includes('-shadowless') && !sid.includes('-shadowless-ns')) ? 'Unlimited_Holofoil' : ''
    const dk = slug + '|' + varHint + '|' + (card.localId||'')
    const dkHolo = slug + '|Holofoil|' + (card.localId||'')
    const dkNormal = slug + '|Normal|' + (card.localId||'')
    // Merge all matches — priority: exact > Holofoil > Normal
    const candidates = [priceDetails[dk], priceDetails[dkHolo], priceDetails[dkNormal]].filter(Boolean)
    if (!candidates.length) return null
    return candidates.reduce((acc, c) => ({
      ebay: acc.ebay || c.ebay,
      tcg: acc.tcg || c.tcg,
      cardmarket: acc.cardmarket || c.cardmarket,
      poketrace: acc.poketrace || c.poketrace,
      estimated: acc.estimated || c.estimated,
    }), { ebay: null, tcg: null, cardmarket: null, poketrace: null, estimated: null })
  }

  const [setLogos, setSetLogos] = useState<Record<string,string>>({})
  const [jpEnDict, setJpEnDict] = useState<Record<string,string>>({})
  const [setBlocks, setSetBlocks] = useState<Record<string,string>>({})

  // Feature images custom supprimee : nettoyage du quota localStorage des anciens utilisateurs
  useEffect(() => {
    try { localStorage.removeItem('pka_custom_imgs') } catch {}
  }, [])

  // Load set logos from current language JSON
  useEffect(() => {
    const loadLogos = async () => {
      try {
        const res = await fetch(`/data/sets-${lang}.json`)
        const sets: {id:string;logo:string|null;serie:string|null}[] = await res.json()
        const logos: Record<string,string> = {}
        const blocks: Record<string,string> = {}
        sets.forEach(s => {
          if (s.logo) logos[s.id] = s.logo
          if (s.serie) blocks[s.id] = s.serie
        })
        setSetLogos(logos)
        setSetBlocks(blocks)
      } catch {}
    }
    loadLogos()
    // Load JP→EN Pokédex dictionary
    if (lang === 'JP') {
      fetch('/data/pokedex-jp-en.json').then(r => r.json()).then(d => setJpEnDict(d)).catch(() => {})
    }
  }, [lang])

  const [selId,      setSelId]       = useState<string|null>(null)
  const [detail,     setDetail]      = useState<TCGCardFull|null>(null)
  const [activeTab,  setActiveTab]   = useState<'apercu'|'prix'|'historique'>('apercu')
  const [histoSubTab, setHistoSubTab] = useState<'raw'|'graded'>('raw')
  const [detLoading, setDetLoading]  = useState(false)
  const [enDetail,   setEnDetail]    = useState<TCGCardFull|null>(null)

  useEffect(() => {
    setLoading(true); setLoadErr(false); setLoadMsg('Chargement...')
    setAllCards([]); setFilSet('all'); setFilEra('all')
    setPage(0); setSelId(null); setDetail(null); setEnDetail(null)

    // JP: charger depuis Kodo Engine (k_*_export, 27k cartes)
    const loadFromSupabase = async (): Promise<{sets: {id:string;name:string;releaseDate?:string|null}[]; cards: EnrichedCard[]}|null> => {
      try {
        // Charger les sets JP
        const { data: setsData } = await supabase.from('k_sets_export').select('*').eq('lang', 'JP').order('id')
        if (!setsData || setsData.length === 0) return null

        // Charger les cartes JP par batch
        let allDbCards: any[] = []
        let from = 0
        const batchSize = 1000
        while (true) {
          const { data } = await supabase.from('k_cards_export').select('*').eq('lang', 'JP').range(from, from + batchSize - 1)
          if (!data || data.length === 0) break
          allDbCards.push(...data)
          from += batchSize
          if (data.length < batchSize) break
        }

        if (allDbCards.length === 0) return null

        const setMap = new Map(setsData.map((s: any) => [s.id, s]))
        const enriched: EnrichedCard[] = allDbCards.map((c: any) => {
          const setId = c.set_id || ''
          const set = setMap.get(setId)
          const cleanSetId = setId.replace('jp-', '')
          const year = set?.release_date ? parseInt(set.release_date.slice(0,4)) || 0 : 0
          const _serie = (set as any)?.series ?? (set as any)?.serie ?? null
          const era = (year>0)
            ? jpYearToEra(year)
            : (setIdToEra(cleanSetId, _serie) !== 'Autre' ? setIdToEra(cleanSetId, _serie) : yearToEra(year))
          // Priority 1: use image_url from DB (artofpkm) if present
          // Priority 2: fallback to R2 hardcoded pattern (for legacy sets)
          const imageUrl = c.image_url || getCardImageUrl({ lang: 'JP', setId: cleanSetId, localId: c.local_id })
          return {
            id: c.id,
            localId: c.local_id || '',
            name: c.name || '',
            image: imageUrl,
            rarity: c.rarity || '',
            setId: cleanSetId,
            setName: set?.name || cleanSetId,
            year,
            era,
          }
        })

        const sets = setsData.map((s: any) => ({
          id: s.id.replace('jp-', ''),
          name: s.name,
          releaseDate: s.release_date,
        }))

        return { sets, cards: enriched }
      } catch(e) { console.error('Supabase JP load error:', e); return null }
    }
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
          const era = (lang==='JP' && year>0)
            ? jpYearToEra(year)
            : (setIdToEra(sid, (set as any)?.serie) !== 'Autre' ? setIdToEra(sid, (set as any)?.serie) : yearToEra(year))
          ;(cards as any[]).forEach(c => {
            const apiLang = lang === 'JP' ? 'ja' : lang === 'EN' ? 'en' : 'fr'
            enriched.push({
              id: c.id || (sid+'-'+c.lid), localId: c.lid, name: c.n,
              image: cleanLegacyUrl(c.img) || getCardImageUrl({ lang: lang as string, setId: sid, localId: c.lid }),
              rarity: c.r||'',
              setId: sid, setName: set?.name ?? sid, year, era,
              enName: lang==='JP' ? (c.en || enMap.get(sid+'-'+c.lid)) : undefined,
              enImage: lang==='JP' ? enImgMap.get(sid+'-'+c.lid) : undefined,
              enSetName: lang==='JP' ? (set as any)?.enName : undefined,
            })
          })
        })
        // Dédup : certains JSON statiques contiennent des doublons (cartes avec préfixe lang
        // et sans préfixe lang, ex: pl4-25 et en-pl4-25 pointent sur la même carte physique)
        const seen = new Set<string>()
        const dedupedCards = enriched.filter(c => {
          const key = c.setId + ':' + c.localId
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        return { sets: staticSets as any[], cards: dedupedCards }
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
        const era = setIdToEra(setId, (set as any)?.serie) !== 'Autre' ? setIdToEra(setId, (set as any)?.serie) : yearToEra(year)
        return { ...c, setId, setName: set?.name ?? setId, year, era,
          enName: lang==='JP' ? enMap.get(setId+'-'+c.localId) : undefined,
          enImage: lang==='JP' ? enImgMap.get(setId+'-'+c.localId) : undefined }
      })
    }

    // Même flow pour toutes les langues : static JSON → API fallback
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
  }, [lang])

  const blocs = useMemo(() => {
    const map = new Map<string, {name:string; sets: {id:string;name:string;count:number;year:number}[]; total:number}>()
    allCards.forEach(c => {
      if (!map.has(c.era)) map.set(c.era, { name:c.era, sets:[], total:0 })
      const b = map.get(c.era)!
      b.total++
      let st = b.sets.find(st=>st.id===c.setId)
      if (!st) { st = { id:c.setId, name:c.setName, count:0, year:(c as any).year||0 }; b.sets.push(st) }
      st.count++
      if ((c as any).year && (!st.year || (c as any).year < st.year)) st.year = (c as any).year
    })
    return [...map.entries()].sort((a,b)=>ERA_ORDER.indexOf(a[0])-ERA_ORDER.indexOf(b[0])).map(([,v])=>{
      // SET FONDATEUR du bloc en tete (-> logo coherent). Dates souvent absentes,
      // donc on identifie le PREFIXE PRINCIPAL du bloc = le prefixe le plus frequent
      // (la serie mere : 'sm' dans Soleil&Lune, 'dp' dans DPP), et on le prioritise.
      // Les sets annexes (det, col, g1, tg...) passent apres. Numero pour l'ordre interne.
      const parseId = (id:string) => {
        const clean = id.replace(/^(en|fr|jp)-/i,'').replace(/-1st$|-shadowless$|-shadowless-ns$/,'')
        const m = clean.match(/^([a-z]+)(\d+(?:\.\d+)?)?/i)
        const prefix = (m?.[1] || clean).toLowerCase()
        const num = m?.[2] ? parseFloat(m[2]) : 9999
        return { prefix, num }
      }
      // prefixe le plus frequent du bloc = serie mere
      const freq: Record<string, number> = {}
      for (const st of v.sets) { const pre = parseId(st.id).prefix; freq[pre] = (freq[pre]||0) + 1 }
      let mainPrefix = ''; let best = -1
      for (const [pre, n] of Object.entries(freq)) if (n > best) { best = n; mainPrefix = pre }
      v.sets.sort((a,b) => {
        const aBase = a.id.replace(/-1st$|-shadowless$|-shadowless-ns$/,'')
        const bBase = b.id.replace(/-1st$|-shadowless$|-shadowless-ns$/,'')
        if (aBase !== bBase) {
          const pa = parseId(a.id), pb = parseId(b.id)
          // 1) le set de la serie mere passe avant les annexes
          const aMain = pa.prefix === mainPrefix ? 0 : 1
          const bMain = pb.prefix === mainPrefix ? 0 : 1
          if (aMain !== bMain) return aMain - bMain
          // 2) meme groupe : par numero (sm1 avant sm2)
          if (pa.prefix === pb.prefix) return pa.num - pb.num
          // 3) date si dispo, sinon alpha
          if ((a.year||0) && (b.year||0) && a.year !== b.year) return a.year - b.year
          return aBase.localeCompare(bBase)
        }
        const aEd = a.id.includes('-') ? 1 : 0
        const bEd = b.id.includes('-') ? 1 : 0
        if (aEd !== bEd) return aEd - bEd
        if (a.id.includes('-shadowless-ns')) return -1
        if (b.id.includes('-shadowless-ns')) return 1
        if (a.id.includes('-shadowless')) return -1
        if (b.id.includes('-shadowless')) return 1
        return a.name.localeCompare(b.name)
      })
      return v
    })
  }, [allCards])

  const rarities = useMemo(() =>
    [...new Set(allCards.map(c=>c.rarity).filter(Boolean))].sort()
  , [allCards])

  const eras = useMemo(() =>
    [...new Set(allCards.map(c=>c.era))].sort((a,b)=>ERA_ORDER.indexOf(a)-ERA_ORDER.indexOf(b))
  , [allCards])

  const sets = useMemo(() => {
    const base = filEra==='all' ? allCards : allCards.filter(c=>c.era===filEra)
    const map  = new Map<string,{id:string;name:string;count:number}>()
    base.forEach(c => {
      if (!map.has(c.setId)) map.set(c.setId,{id:c.setId,name:c.setName,count:0})
      map.get(c.setId)!.count++
    })
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name))
  }, [allCards, filEra])

  useEffect(() => { setFilSet('all'); setPage(0) }, [filEra])
  useEffect(() => { setPage(0); setVisibleCount(CHUNK_SIZE) }, [search, filSet, filRarity, sort])

  // Pre-build JP search index (cached, only recalculated when allCards or dict changes)
  const jpSearchIndex = useMemo(() => {
    if (lang !== 'JP' || !Object.keys(jpEnDict).length) return null
    const index = new Map<string, string>()
    allCards.forEach(c => {
      const names = jpToNames(c.name, jpEnDict)
      const parts = [c.name.toLowerCase(), c.setName.toLowerCase(), c.localId]
      if (names) { parts.push(names.en.toLowerCase()); parts.push(names.fr.toLowerCase()) }
      if ((c as any).enSetName) parts.push((c as any).enSetName.toLowerCase())
      index.set(c.id, parts.join('|'))
    })
    return index
  }, [allCards, jpEnDict, lang])

  const filtered = useMemo(() => {
    let r = allCards
    if (filEra!=='all') r = r.filter(c=>c.era===filEra)
    if (filSet!=='all') r = r.filter(c=>c.setId===filSet)
    if (filRarity!=='all') r = r.filter(c=>c.rarity===filRarity)
    if (search) {
      const q=search.toLowerCase()
      if (jpSearchIndex) {
        r = r.filter(c => {
          const indexed = jpSearchIndex.get(c.id)
          return indexed ? indexed.includes(q) : false
        })
      } else {
        r = r.filter(c=>c.name.toLowerCase().includes(q)||c.setName.toLowerCase().includes(q)||c.localId===q)
      }
    }
    // Auto sort by number when a specific set is filtered
    if (filSet !== 'all') {
      return [...r].sort((a,b) => parseInt(a.localId)-parseInt(b.localId))
    }
    return sort==='name'
      ? [...r].sort((a,b)=>a.name.localeCompare(b.name))
      : [...r].sort((a,b)=>(b.year-a.year)||a.setName.localeCompare(b.setName)||parseInt(a.localId)-parseInt(b.localId))
  }, [allCards, filEra, filSet, filRarity, search, sort])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !lightbox && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        const input = document.querySelector<HTMLInputElement>('input[placeholder*="Rechercher"]')
        input?.focus()
        return
      }
      if (e.key === 'Escape') {
        if (lightbox) { setLightbox(null); return }
        if (search) { setSearch(''); return }
      }
      if (lightbox) {
        const sc = filtered.filter(c=>c.setId===lightbox.setId).sort((a,b)=>parseInt(a.localId)-parseInt(b.localId))
        const ci = sc.findIndex(c=>c.id===lightbox.id)
        if (e.key === 'ArrowLeft' && ci > 0) { e.preventDefault(); setLightbox(sc[ci-1]) }
        if (e.key === 'ArrowRight' && ci < sc.length-1) { e.preventDefault(); setLightbox(sc[ci+1]) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, search, filtered])

  const pageCount = Math.ceil(filtered.length/CHUNK_SIZE)||1
  const pageCards = filtered.slice(0, visibleCount)
  // Kodo Engine: charger les prix des cartes affichees
  useEffect(() => {
    const ids = pageCards.map((c: any) => kodoIdOf(c)).filter(Boolean)
    requestKodoPrices(ids)
  }, [pageCards, requestKodoPrices, kodoIdOf])
  const hasMore = visibleCount < filtered.length

  const handleCardClick = useCallback(async (id:string) => {
    if (selId===id) { setSelId(null); setDetail(null); setEnDetail(null); return }
    setSelId(id); setDetail(null); setEnDetail(null); setDetLoading(true)
    if (lang === 'JP') {
      // JP: build detail from our local data (TCGDex doesn't have pokemon-card.com IDs)
      const card = allCards.find(c => c.id === id)
      if (card) {
        setDetail({
          id: card.id,
          localId: card.localId,
          name: card.name,
          image: card.image,
          rarity: card.rarity || undefined,
          set: { id: card.setId, name: card.setName },
        } as any)
      }
      setDetLoading(false)
    } else {
      let d = await fetchCardDetail(lang, id)
      if(!d) {
        const cleanId = id.replace(/-shadowless-ns-|-shadowless-|-1st-/, '-')
        if(cleanId !== id) d = await fetchCardDetail(lang, cleanId)
      }
      setDetail(d); setDetLoading(false)
    }
  }, [selId, lang, allCards])

  const selCard = allCards.find(c=>c.id===selId)

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visibleCount < filtered.length) {
        setVisibleCount(prev => Math.min(prev + CHUNK_SIZE, filtered.length))
      }
    }, { rootMargin: '400px' })
    obs.observe(loadMoreRef.current)
    return () => obs.disconnect()
  }, [visibleCount, filtered.length])
  const flag = (l:Lang) => l==='EN'?'🇺🇸':l==='FR'?'🇫🇷':'🇯🇵'

  return (
    <>
      <style>{`
        @keyframes fadeIn    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes gridFade { from{opacity:0} to{opacity:1} }
        @keyframes cardIn    { from{opacity:0;transform:scale(.93) translateY(6px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slideIn   { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes shimmer   { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes imgReveal { from{opacity:0;transform:scale(1.04)} to{opacity:1;transform:scale(1)} }
        @keyframes panelIn   { from{opacity:0;transform:translateX(14px) scale(.98)} to{opacity:1;transform:translateX(0) scale(1)} }
        @keyframes holoMove  { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes selPulse  { 0%,100%{box-shadow:0 0 0 2px rgba(0,0,0,.12)} 50%{box-shadow:0 0 0 3px rgba(0,0,0,.22),0 8px 28px rgba(0,0,0,.12)} }
        @keyframes langBounce{ 0%{transform:scale(1)} 40%{transform:scale(1.18)} 70%{transform:scale(.95)} 100%{transform:scale(1)} }
        @keyframes lbIn  { from{opacity:0;transform:scale(.88) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes lbBg  { from{opacity:0} to{opacity:1} }
        .lb-card { animation: lbIn .32s cubic-bezier(.34,1.2,.64,1); }
        .lb-bg   { animation: lbBg .22s ease-out; }
        .lb-close { transition: all .15s; border-radius:50%; }
        .lb-close:hover { background:rgba(255,255,255,.15) !important; transform:scale(1.1); }
        .zoom-btn { transition: all .18s cubic-bezier(.34,1.4,.64,1); }
        .zoom-btn:hover { transform: scale(1.08); opacity:1 !important; }
        .zoom-btn:active { transform: scale(.95); }

        /* ============================================
           ENC-CARD GLASS V7 - Card tile premium
        ============================================ */
        .enc-card {
          transition: transform .3s cubic-bezier(.2,.85,.3,1), box-shadow .3s cubic-bezier(.2,.85,.3,1), border-color .2s ease;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          position: relative;
          backdrop-filter: blur(14px) saturate(180%);
          -webkit-backdrop-filter: blur(14px) saturate(180%);
        }
        /* Hover effect unifie premium */
        .enc-card:hover {
          transform: translateY(-4px) scale(1.015);
          box-shadow:
            0 16px 40px rgba(0,0,0,0.10),
            0 4px 12px rgba(0,0,0,0.05),
            inset 0 1px 0 rgba(255,255,255,0.95) !important;
          border-color: rgba(0,0,0,0.12) !important;
        }
        .enc-card:hover .card-img { transform: scale(1.04); }
        .enc-card:hover .zoom-btn { opacity: 1 !important; }
        .enc-card:hover::after { opacity: 1; }
        /* Shimmer overlay au hover */
        .enc-card::after {
          content: '';
          position: absolute; inset: 0;
          border-radius: 16px;
          pointer-events: none;
          background: linear-gradient(115deg, rgba(255,255,255,0) 38%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0) 62%);
          opacity: 0;
          transition: opacity .3s;
          z-index: 2;
        }
        .card-img { transition: transform .4s cubic-bezier(.2,.85,.3,1); will-change: transform; }
        /* SELECTED state - bordure ink + glow subtle (pas de pulse rouge agressif) */
        .enc-card.sel {
          border-color: #1D1D1F !important;
          box-shadow:
            0 0 0 1px #1D1D1F,
            0 16px 40px rgba(0,0,0,0.15),
            0 4px 12px rgba(0,0,0,0.08),
            inset 0 1px 0 rgba(255,255,255,0.95) !important;
        }
        .enc-card.sel::before {
          content: '';
          position: absolute; inset: 0;
          border-radius: 16px;
          pointer-events: none;
          z-index: 1;
          background: linear-gradient(135deg, rgba(255,220,100,0.10), rgba(160,100,255,0.08), rgba(100,200,255,0.10));
          background-size: 300% 300%;
          animation: holoMove 5s ease infinite;
        }
        .card-img { transition: transform .35s cubic-bezier(.34,1.2,.64,1); will-change:transform; }
        .card-img-loaded { animation: imgReveal .3s ease-out; }

        .enc-card .card-name {
          transition: color .15s;
        }
        .enc-card:hover .card-name { color: #000 !important; }

        .srt { padding:6px 11px; border-radius:7px; border:none; background:transparent; color:#86868B; font-size:11px; font-weight:600; cursor:pointer; transition:all .15s cubic-bezier(.2,.85,.3,1); font-family:var(--font-sora, Sora, sans-serif); }
        .srt:hover { background:rgba(255,255,255,0.55); backdrop-filter:blur(10px); color:#1D1D1F; }
        .srt.on { background:linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%) !important; color:#1D1D1F !important; box-shadow:0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95); }
        .rh { transition: background .15s; cursor:pointer; }
        .rh:hover { background:rgba(255,255,255,0.5) !important; }
        .rh:hover .rh-name { font-weight:600 !important; }

        .shimmer { background:linear-gradient(90deg,#F2F2F2 25%,#E8E8E8 50%,#F2F2F2 75%); background-size:800px 100%; animation:shimmer 1.4s infinite; }

        .pgbtn { padding:7px 13px; border-radius:8px; border:1px solid rgba(0,0,0,0.08); background:rgba(255,255,255,0.6); backdrop-filter:blur(10px) saturate(180%); -webkit-backdrop-filter:blur(10px) saturate(180%); color:#1D1D1F; font-size:12px; font-weight:500; cursor:pointer; font-family:var(--font-sora, Sora, sans-serif); transition:all .15s cubic-bezier(.2,.85,.3,1); box-shadow:inset 0 1px 0 rgba(255,255,255,0.85); }
        .pgbtn:disabled { color:#C7C7CC; cursor:default; border-color:rgba(0,0,0,0.04); background:rgba(255,255,255,0.3); }
        .pgbtn:not(:disabled):hover { background:rgba(255,255,255,0.85); transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9); }

        .fsel { height:36px; padding:0 12px; border:1px solid rgba(0,0,0,0.08); border-radius:9px; font-size:12px; outline:none; background:rgba(255,255,255,0.6); backdrop-filter:blur(10px) saturate(180%); -webkit-backdrop-filter:blur(10px) saturate(180%); cursor:pointer; font-family:var(--font-sora, Sora, sans-serif); color:#1D1D1F; font-weight:500; transition:all .15s cubic-bezier(.2,.85,.3,1); box-shadow:inset 0 1px 2px rgba(0,0,0,0.03); }
        .fsel:focus, .fsel:hover { border-color:#1D1D1F; background:rgba(255,255,255,0.85); }

        .enc-bloc-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9) !important; }
        .lang-btn { transition: all .2s cubic-bezier(.34,1.4,.64,1) !important; }
        .lang-btn:active { animation: langBounce .35s ease-out; }

        .detail-panel { animation: panelIn .28s cubic-bezier(.34,1.2,.64,1); }
        /* Panel en portal : fixe a droite (desktop), echappe au layout grille */
        .detail-panel {
          position: fixed;
          top: 80px;
          right: 20px;
          width: 600px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 100px);
        }
        .detail-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(20,20,28,0.28);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          z-index: 999;
          animation: drawerBackdropIn .25s ease;
        }
        @keyframes drawerBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        .attack-row { transition: background .15s; border-radius:8px; }
        .attack-row:hover { background:rgba(0,0,0,0.04) !important; }

        .add-btn { transition: all .18s cubic-bezier(.34,1.4,.64,1) !important; }
        .add-btn:hover { transform: translateY(-1px) scale(1.02) !important; box-shadow:0 4px 14px rgba(0,0,0,.18) !important; }
        .add-btn:active { transform: scale(.97) !important; }
        /* ===== DRAWER RESPONSIVE ===== */
        @media (max-width: 1280px) {
          .detail-panel { width: 480px !important; }
        }
        @media (max-width: 1024px) {
          .detail-panel { width: 420px !important; }
        }
        @media (max-width: 900px) {
          /* VUE PLEIN ECRAN mobile : inset:0, pas de sheet, pas de dvh capricieux.
             L'ecran entier est dedie a la carte. Header retour en haut, contenu
             qui scrolle, CTA en bas. La cle = min-height:0 sur les enfants flex. */
          .detail-backdrop { display: none !important; }
          .detail-panel {
            position: fixed !important;
            inset: 0 !important;
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            border-radius: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            z-index: 1000 !important;
          }
          /* Wrapper glass interne : flex column pleine hauteur */
          .detail-panel > div {
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
            min-height: 0 !important;
            flex: 1 1 auto !important;
          }
          /* Image hero : hauteur maitrisee, entiere, jamais coupee */
          .drawer-hero {
            flex: none !important;
            min-height: 0 !important;
            padding: 14px 16px 16px !important;
          }
          .drawer-hero img { max-height: 200px !important; }
          /* Tabs : figes en haut du sheet */
          .drawer-tab-bar-sticky { flex: none !important; position: static !important; }
          /* Contenu : la SEULE zone qui scrolle */
          .drawer-scroll-content {
            flex: 1 1 auto !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 16px !important;
          }
          /* CTA : fige en bas + safe-area iPhone (home indicator) */
          .drawer-cta-sticky {
            flex: none !important;
            position: static !important;
            padding-bottom: calc(14px + env(safe-area-inset-bottom)) !important;
          }
          /* Wrapper glass interne : plein ecran, pas de radius ni d'ombre flottante */
          .detail-panel > div {
            border-radius: 0 !important;
            border: none !important;
            box-shadow: none !important;
            max-height: 100% !important;
            background: rgba(255,255,255,0.96) !important;
            padding-top: env(safe-area-inset-top) !important;
          }
          /* Header retour visible en mobile, close X masque (le retour le remplace) */
          .drawer-mobile-header { display: flex !important; }
          .detail-panel .drawer-mobile-header + button[title="Fermer"] { display: none !important; }
        }
        /* Header retour : masque par defaut (desktop garde le panneau lateral + close X) */
        .drawer-mobile-header { display: none; }
        .drawer-mobile-header {
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 12px 10px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          flex: none;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          position: sticky;
          top: 0;
          z-index: 6;
        }
        .drawer-back-btn {
          width: 38px; height: 38px; border-radius: 10px;
          border: none; background: rgba(0,0,0,0.04);
          color: #1D1D1F; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s;
        }
        .drawer-back-btn:active { background: rgba(0,0,0,0.1); }
        .drawer-back-title {
          flex: 1; text-align: center;
          font-size: 15px; font-weight: 700; color: #1D1D1F;
          font-family: var(--font-sora, Sora, sans-serif);
          letter-spacing: -0.01em;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        /* ===== DRAWER TAB SECTIONS - show/hide par tab ===== */
        .tab-section { display: none; }
        .tab-section.tab-active { display: block; animation: tabFadeIn .25s cubic-bezier(.2,.85,.3,1); }
        @keyframes tabFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        /* Sticky tab bar dans le drawer */
        .drawer-tab-bar-sticky {
          position: sticky;
          top: 0;
          z-index: 5;
          padding: 12px 14px 10px;
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid rgba(0,0,0,0.04);
        }
        .drawer-scroll-content {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 80px;
        }
        .drawer-cta-sticky {
          position: sticky;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 14px;
          background: linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.92) 40%, rgba(255,255,255,0.96) 100%);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-top: 1px solid rgba(0,0,0,0.04);
          z-index: 10;
        }
        /* ===== RESPONSIVE POKEDESK MOBILE ===== */
        @media (max-width: 767px) {
          /* Vraie grille mobile : 3 col (M) par defaut, S=4, L=2 */
          .kcard-grid[data-size="M"] { grid-template-columns: repeat(3, minmax(0,1fr)) !important; gap: 8px !important; }
          .kcard-grid[data-size="S"] { grid-template-columns: repeat(4, minmax(0,1fr)) !important; gap: 6px !important; }
          .kcard-grid[data-size="L"] { grid-template-columns: repeat(2, minmax(0,1fr)) !important; gap: 12px !important; }
          /* Vue tableau désactivée en mobile : le toggle grille/liste n'a plus de raison d'être */
          .kview-toggle { display: none !important; }
          /* Filtres repliables : bouton visible, selects caches par defaut */
          .kfilters-toggle { display: flex !important; }
          .kfilters-row {
            max-height: 0; overflow: hidden; padding-top: 0 !important; padding-bottom: 0 !important;
            margin-bottom: 0 !important; border: none !important; box-shadow: none !important;
            opacity: 0; transition: max-height .3s ease, opacity .25s ease, padding .3s ease;
            position: static !important;
          }
          .kfilters-row.open {
            max-height: 320px; opacity: 1;
            padding: 14px 12px !important; margin-bottom: 18px !important;
            border: 1px solid rgba(0,0,0,0.04) !important;
          }
          /* Selects pleine largeur dans le panneau ouvert */
          .kfilters-row .fsel { width: 100% !important; max-width: none !important; flex: none !important; }
          /* Langue compacte : drapeaux seuls (3 langues = pas besoin de texte) */
          .klang-label { display: none !important; }
          .lang-btn { padding: 8px 12px !important; }
          /* Set : remplacer le carousel scrollable par le bouton SetPicker */
          .kset-pick-btn { display: flex !important; }
          .kset-carousel-wrap { display: none !important; }
          /* Vue Par blocs : grille pleine largeur + retirer les puces de séries tronquées */
          .kbloc-grid { grid-template-columns: 1fr !important; }
          .kbloc-chips { display: none !important; }
        }

        /* ===== DETAIL DRAWER TABS - iOS Segment Control glass v7 ===== */
        .tab-segment-bar {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          padding: 4px;
          background: rgba(255,255,255,0.45);
          backdrop-filter: blur(12px) saturate(180%);
          -webkit-backdrop-filter: blur(12px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 12px;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.03);
        }
        .tab-segment {
          padding: 8px 4px;
          background: transparent;
          border: none;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 600;
          color: #86868B;
          cursor: pointer;
          font-family: var(--font-sora, Sora, sans-serif);
          transition: all .2s cubic-bezier(.2,.85,.3,1);
          white-space: nowrap;
          letter-spacing: -0.01em;
        }
        .tab-segment:hover:not(.active) {
          color: #1D1D1F;
          background: rgba(255,255,255,0.4);
        }
        .tab-segment.active {
          background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%);
          color: #1D1D1F;
          box-shadow:
            0 2px 8px rgba(0,0,0,0.07),
            inset 0 1px 0 rgba(255,255,255,0.95);
          font-weight: 700;
        }
        /* ===== DRAWER BOTTOM CTA STICKY ===== */
        .drawer-cta-btn {
          width: 100%;
          padding: 13px 18px;
          background: #1D1D1F;
          color: #FFFFFF;
          border: none;
          border-radius: 11px;
          font-size: 13.5px;
          font-weight: 600;
          font-family: var(--font-sora, Sora, sans-serif);
          letter-spacing: -0.01em;
          cursor: pointer;
          transition: all .25s cubic-bezier(.2,.85,.3,1);
          box-shadow: 0 4px 14px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.14);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .drawer-cta-btn:hover {
          transform: translateY(-1.5px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.18);
        }
        .drawer-cta-btn.owned {
          background: rgba(29,158,117,0.12);
          color: #1D9E75;
          border: 1px solid rgba(29,158,117,0.25);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.85);
        }
        .drawer-cta-btn.owned:hover {
          background: rgba(29,158,117,0.18);
          transform: none;
        }
        .set-carousel::-webkit-scrollbar { height: 4px; }
        .set-carousel::-webkit-scrollbar-track { background: transparent; }
        .set-carousel::-webkit-scrollbar-thumb { background: #D1D1D6; border-radius: 4px; }
        .set-carousel::-webkit-scrollbar-thumb:hover { background: #A1A1A6; }
      `}</style>

      <div style={{ animation:'fadeIn .25s ease-out', width:'100%', display:'flex', gap:'20px', alignItems:'flex-start' }}>

        {/* ── MAIN ── */}
        <div style={{ flex:1, minWidth:0, paddingRight: (drawerMounted && selId) ? 484 : 0, transition:'padding-right .28s cubic-bezier(.2,.8,.2,1)' }}>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
            <div>
              <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Cartes</p>
              <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-.5px', margin:'0 0 5px' }}>Index</h1>
              <div style={{ fontSize:'12px', color:'#888', minHeight:'18px', display:'flex', alignItems:'center', gap:'6px' }}>
                {loading ? (
                  <>
                    <div style={{ position:'relative', width:'14px', height:'14px', flexShrink:0 }}>
                      <div style={{ position:'absolute', inset:0, border:'1.5px solid #EEE', borderTop:'1.5px solid #555', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                      <div style={{ position:'absolute', inset:'3px', borderRadius:'50%', background:'#999' }}/>
                    </div>
                    <span style={{ color:'#AAA' }}>{loadMsg}</span>
                  </>
                ) : loadErr ? (
                  <span style={{ color:'#E03020' }}>
                    Erreur de chargement —{' '}
                    <button onClick={()=>setLang(l=>l)} style={{ color:'#E03020', textDecoration:'underline', background:'none', border:'none', cursor:'pointer', fontSize:'12px', padding:0 }}>Réessayer</button>
                  </span>
                ) : (
                  <span><strong style={{ color:'#111' }}>{filtered.length.toLocaleString('fr-FR')}</strong> cartes · <strong style={{ color:'#111' }}>{allCards.length.toLocaleString('fr-FR')}</strong> au total</span>
                )}
              </div>
            </div>

            {/* Language selector */}
            <div style={{ background:'#F5F5F5', borderRadius:'12px', padding:'4px', display:'flex', gap:'3px', flexShrink:0 }}>
              {(['EN','FR','JP'] as Lang[]).map(l => (
                <button key={l} onClick={()=>setLang(l)} className="lang-btn"
                  style={{ padding:'8px 14px', borderRadius:'9px', border:'none', background:lang===l?'#fff':'transparent', color:lang===l?'#111':'#888', fontFamily:'var(--font-display)', fontWeight:lang===l?700:500, fontSize:'13px', cursor:'pointer', boxShadow:lang===l?'0 2px 8px rgba(0,0,0,.1)':'none', display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
                  <span>{flag(l)}</span>
                  <span className="klang-label">{l==='EN'?'English':l==='FR'?'Français':'日本語'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search + sort + view */}
          {/* Series populaires */}
          {!loading && browseMode==='all' && (() => {
            const curSetName = filSet==='all' ? 'Toutes les séries' : (allCards.find(c=>c.setId===filSet)?.setName || filSet)
            return (<>
            {/* Bouton mobile : ouvre le SetPicker plein écran */}
            <button className="kset-pick-btn" onClick={()=>setSetPickerOpen(true)}
              style={{ display:'none', width:'100%', alignItems:'center', justifyContent:'space-between', height:'44px', padding:'0 14px', marginBottom:'12px', borderRadius:'10px', border:'1px solid rgba(0,0,0,0.06)', background:'rgba(255,255,255,0.7)', backdropFilter:'blur(20px) saturate(180%)', WebkitBackdropFilter:'blur(20px) saturate(180%)', color:'#1D1D1F', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, color:filSet==='all'?'#888':'#1D1D1F' }}>{curSetName}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink:0, opacity:0.5 }}><path d="M3 4.5L6 7.5L9 4.5" stroke="#1D1D1F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div className="kset-carousel-wrap" style={{ marginBottom:'12px', position:'relative' }}>
              <button onClick={()=>{const el=document.querySelector('.set-carousel') as HTMLElement;if(el)el.scrollBy({left:-200,behavior:'smooth'})}}
                style={{ position:'absolute', left:'-4px', top:'50%', transform:'translateY(-50%)', width:'28px', height:'28px', borderRadius:'50%', background:'rgba(255,255,255,0.75)', backdropFilter:'blur(12px) saturate(180%)', WebkitBackdropFilter:'blur(12px) saturate(180%)', border:'0.5px solid rgba(255,255,255,0.6)', boxShadow:'0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3, fontSize:'12px', color:'#48484A' }}>‹</button>
              <button onClick={()=>{const el=document.querySelector('.set-carousel') as HTMLElement;if(el)el.scrollBy({left:200,behavior:'smooth'})}}
                style={{ position:'absolute', right:'-4px', top:'50%', transform:'translateY(-50%)', width:'28px', height:'28px', borderRadius:'50%', background:'rgba(255,255,255,0.75)', backdropFilter:'blur(12px) saturate(180%)', WebkitBackdropFilter:'blur(12px) saturate(180%)', border:'0.5px solid rgba(255,255,255,0.6)', boxShadow:'0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3, fontSize:'12px', color:'#48484A' }}>›</button>
              <div className="set-carousel" style={{ display:'flex', gap:'6px', overflowX:'auto' as const, paddingBottom:'4px', padding:'0 20px', scrollbarWidth:'none' as any }}>
                {(lang==='JP'
                  ? ['sv2a-pokemon-card-151','m2a-high-class-pack-mega-dream-ex','sv11w-white-flare','sv11b-black-bolt','sv10-the-glory-of-team-rocket','sv9-battle-partners','sv8a-terastal-fest-ex','sv8-super-electric-breaker','sv7-stellar-miracle','sv6-transformation-mask','sv5a-crimson-haze','sv4a-shiny-treasure-ex','m2-inferno-x','m1l-mega-brave','sv-p-promotional-cards']
                  : lang==='FR'
                  ? ['sv03.5','base1','base1-1st','base2','base2-1st','base3','base3-1st','base5','base5-1st','gym1','gym1-1st','gym2','gym2-1st','neo1','neo1-1st','neo2','neo2-1st','neo3','neo3-1st','neo4','neo4-1st','swsh12.5','sv04','sv01','cel25','sv08','sm12','swsh8','sv06']
                  : ['sv03.5','base1','base1-shadowless','base1-shadowless-ns','base2','base2-1st','base3','base3-1st','base5','base5-1st','gym1','gym1-1st','gym2','gym2-1st','neo1','neo1-1st','neo2','neo2-1st','neo3','neo3-1st','neo4','neo4-1st','swsh12.5','sv04','sv01','cel25','sv08','sm12','swsh8','sv06']
                ).filter(sid=>allCards.some(c=>c.setId===sid)).map(sid=>{
                  const nm = allCards.find(c=>c.setId===sid)?.setName||sid
                  const ct = allCards.filter(c=>c.setId===sid).length
                  return (
                    <button key={sid} onClick={()=>{setFilSet(sid);setFilEra('all');setPage(0)}}
                      style={{ flexShrink:0, padding:'6px 13px', borderRadius:'99px', border:'1px solid rgba(0,0,0,0.05)', background:'rgba(255,255,255,0.5)', backdropFilter:'blur(12px) saturate(180%)', WebkitBackdropFilter:'blur(12px) saturate(180%)', color:'#48484A', fontSize:'11px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .2s cubic-bezier(.2,.85,.3,1)', whiteSpace:'nowrap' as const, display:'flex', alignItems:'center', gap:'4px', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.7)' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.85)';e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.5)';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='inset 0 1px 0 rgba(255,255,255,0.7)'}}>
                      {setLogos[sid]&&<img src={setLogos[sid]} alt="" style={{ height:'14px', maxWidth:'50px', objectFit:'contain' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                      {nm} <span style={{ opacity:.5 }}>{(()=>{ const ow=allCards.filter(c=>c.setId===sid&&isOwned(c)).length; return ow>0?<><span style={{ color:'#2E9E6A', fontWeight:700 }}>{ow}</span>/{ct}</>:ct })()}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <SetPicker
              open={setPickerOpen}
              sets={sets.map(x=>({ id:x.id, name:x.name, count:(x as any).count }))}
              current={filSet}
              lang={lang}
              totalCount={allCards.length}
              onSelect={(id)=>{ setFilSet(id); setFilEra('all'); setPage(0) }}
              onClose={()=>setSetPickerOpen(false)}
            />
            </>)
          })()}

          <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:1, minWidth:'200px', zIndex:20 }}>
              <span style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)', color:'#CCC', fontSize:'15px', pointerEvents:'none' }}>{String.fromCharCode(8981)}</span>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                onFocus={()=>setSearchFocus(true)} onBlur={()=>setTimeout(()=>setSearchFocus(false),200)}
                placeholder={lang==='JP' ? 'Rechercher (japonais, anglais ou français)...' : 'Rechercher une carte, un set...'}
                style={{ width:'100%', height:'40px', padding:'0 32px', border:'1px solid '+(searchFocus&&search.length>=2?'rgba(0,0,0,0.12)':'rgba(0,0,0,0.06)'), borderRadius:searchFocus&&searchSuggs.length>0?'9px 9px 0 0':'9px', fontSize:'13px', color:'#1D1D1F', outline:'none', background:searchFocus?'rgba(255,255,255,0.85)':'rgba(255,255,255,0.55)', backdropFilter:'blur(12px) saturate(180%)', WebkitBackdropFilter:'blur(12px) saturate(180%)', boxSizing:'border-box' as const, fontFamily:'var(--font-sans)', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.75)', transition:'all .2s cubic-bezier(.2,.85,.3,1)' }}/>
              {search && (
                <button onClick={()=>setSearch('')} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#CCC', cursor:'pointer', fontSize:'16px', padding:0, lineHeight:1, zIndex:2 }}>{String.fromCharCode(215)}</button>
              )}
              {searchFocus && searchSuggs.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #1D1D1F', borderTop:'1px solid #EBEBEB', borderRadius:'0 0 9px 9px', boxShadow:'0 8px 24px rgba(0,0,0,.08)', maxHeight:'340px', overflowY:'auto' as const }}>
                  {searchSuggs.map(card => {
                    const owned = isOwned(card)
                    return (
                      <div key={card.id}
                        onMouseDown={e=>{e.preventDefault();handleCardClick(card.id);setSearchFocus(false)}}
                        style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid #F5F5F5', transition:'background .1s' }}
                        onMouseEnter={e=>{e.currentTarget.style.background='#F5F5F7'}}
                        onMouseLeave={e=>{e.currentTarget.style.background=''}}>
                        <div style={{ width:'32px', height:'44px', borderRadius:'4px', overflow:'hidden', background:'#F5F5F5', flexShrink:0 }}>
                          <CardImg setId={card.setId} localId={card.localId} lang={lang} image={card.image} enImage={card.enImage} name={card.name} number={card.localId} variant="thumb" />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'13px', fontWeight:500, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{card.name}</div>
                          <div style={{ fontSize:'10px', color:'#86868B', display:'flex', alignItems:'center', gap:'4px' }}>
                            <span>{card.setName}</span>
                            <span style={{ color:'#C7C7CC' }}>{String.fromCharCode(183)}</span>
                            <span>#{card.localId}</span>
                            {card.rarity && <><span style={{ color:'#C7C7CC' }}>{String.fromCharCode(183)}</span><span>{card.rarity}</span></>}
                          </div>
                        </div>
                        <span style={{ fontSize:'14px', flexShrink:0 }}>{lang==='EN'?String.fromCodePoint(127482,127480):lang==='FR'?String.fromCodePoint(127467,127479):String.fromCodePoint(127471,127477)}</span>
                        {owned && <div style={{ width:'16px', height:'16px', borderRadius:'50%', background:'#27500A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg></div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="kview-toggle" style={{ display:'flex', gap:'2px', background:'#F5F5F5', borderRadius:'9px', padding:'3px', flexShrink:0 }}>
              {(['grid','list'] as ViewMode[]).map(v=>(
                <button key={v} className={`kview-btn-${v}`} onClick={()=>setView(v)} style={{ width:'34px', height:'32px', borderRadius:'7px', border:'none', background:view===v?'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)':'transparent', color:view===v?'#1D1D1F':'#888', fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .18s cubic-bezier(.2,.8,.2,1)', boxShadow:view===v?'0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)':'none' }}>
                  {v==='grid'?'⊞':'☰'}
                </button>
              ))}
            </div>
            {view==='grid' && (
              <div style={{ display:'flex', gap:'2px', background:'#F5F5F5', borderRadius:'9px', padding:'3px', flexShrink:0 }}>
                {(['S','M','L'] as const).map(sz=>(
                  <button key={sz} onClick={()=>setCardSize(sz)}
                    style={{ width:'30px', height:'32px', borderRadius:'7px', border:'none', background:cardSize===sz?'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)':'transparent', color:cardSize===sz?'#1D1D1F':'#888', fontSize:'10px', fontWeight:700, cursor:'pointer', transition:'all .18s cubic-bezier(.2,.8,.2,1)', fontFamily:'var(--font-display)', letterSpacing:'.05em', boxShadow:cardSize===sz?'0 2px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)':'none' }}>
                    {sz}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bouton Filtres — mobile uniquement */}
          <button className="kfilters-toggle" onClick={()=>setFiltersOpen(o=>!o)}
            style={{ display:'none', width:'100%', alignItems:'center', justifyContent:'space-between', height:'42px', padding:'0 14px', marginBottom:'12px', borderRadius:'10px', border:'1px solid rgba(0,0,0,0.06)', background:'rgba(255,255,255,0.7)', backdropFilter:'blur(20px) saturate(180%)', WebkitBackdropFilter:'blur(20px) saturate(180%)', color:'#1D1D1F', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
            <span style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span>Filtres</span>
              {activeFilterCount>0 && <span style={{ fontSize:'11px', fontWeight:700, color:'#fff', background:'#E03020', borderRadius:'999px', minWidth:'18px', height:'18px', display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 5px' }}>{activeFilterCount}</span>}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform:filtersOpen?'rotate(180deg)':'none', transition:'transform .2s', opacity:0.5 }}><path d="M3 4.5L6 7.5L9 4.5" stroke="#1D1D1F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          {/* Filters */}
          <div className={`kfilters-row${filtersOpen?' open':''}`} style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center', position:'sticky' as const, top:0, zIndex:30, background:'rgba(255,255,255,0.7)', backdropFilter:'blur(20px) saturate(180%)', WebkitBackdropFilter:'blur(20px) saturate(180%)', padding:'14px 12px', margin:'0 -12px 18px', borderRadius:'12px', border:'1px solid rgba(0,0,0,0.04)', boxShadow:'0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
            <select className="fsel" value={filEra} style={{ background:filEra!=='all'?'#FFF5F0':'', borderColor:filEra!=='all'?'#FFD0C0':'', color:filEra!=='all'?'#C84B00':'#AAA' }} onChange={e=>{ const v=e.target.value; setFilEra(v); setFilSet('all'); setPage(0); if(browseMode==='bloc') setSelBloc(v==='all'?null:v) }}>
              <option value="all">Tous les blocs</option>
              {eras.map(e=><option key={e} value={e}>{e}</option>)}
            </select>

            <select className="fsel" value={filSet} onChange={e=>setFilSet(e.target.value)} disabled={loading}
              style={{ maxWidth:'220px', color:filSet==='all'?'#AAA':'#111' }}>
              <option value="all">Tous les sets{sets.length>0?` (${sets.length})`:''}</option>
              {(() => {
                // Groupement par BLOC FR (meme source de verite que la vue "Par blocs").
                // On utilise l'era deja calculee sur chaque carte (via series) -> 0 systeme parallele.
                // setEra: map setId -> libelle de bloc, derive de allCards (qui porte c.era).
                const setEra = new Map<string,string>()
                allCards.forEach(c => { if (!setEra.has(c.setId)) setEra.set(c.setId, c.era) })
                const byBloc = new Map<string, typeof sets>()
                for (const st of sets) {
                  const bloc = setEra.get(st.id) || 'Autre'
                  if (!byBloc.has(bloc)) byBloc.set(bloc, [])
                  byBloc.get(bloc)!.push(st)
                }
                const orderedBlocs = [...byBloc.keys()].sort((a,b)=>{
                  const ia = ERA_ORDER.indexOf(a), ib = ERA_ORDER.indexOf(b)
                  return (ia<0?999:ia) - (ib<0?999:ib)
                })
                return orderedBlocs.map(bloc => (
                  <optgroup key={bloc} label={bloc}>
                    {byBloc.get(bloc)!.map(orig => {
                      const displayName = lang === 'JP'
                        ? formatJPSetName({ id: orig.id, name: orig.name, lang: 'JP' as any } as any, sets.map(s=>({id:s.id,name:s.name,lang:'JP' as any,total:(s as any).count} as TCGSet)))
                        : orig.name
                      return (<option key={orig.id} value={orig.id}>{displayName} ({orig.count})</option>)
                    })}
                  </optgroup>
                ))
              })()}
            </select>

            <select className="fsel" value={filRarity} onChange={e=>{setFilRarity(e.target.value);setPage(0)}}
              style={{ maxWidth:'180px', color:filRarity==='all'?'#AAA':'#534AB7', background:filRarity!=='all'?'#EEEDFE':'', borderColor:filRarity!=='all'?'#CECBF6':'' }}>
              <option value="all">Toutes les raretés</option>
              {rarities.map(r=>(<option key={r} value={r}>{r}</option>))}
            </select>
            {(filEra!=='all'||filSet!=='all'||filRarity!=='all'||search) && (
              <button onClick={()=>{ setFilEra('all'); setFilSet('all'); setFilRarity('all'); setSearch(''); setPage(0) }}
                style={{ height:'34px', padding:'0 12px', borderRadius:'7px', border:'1px solid #EBEBEB', background:'#fff', color:'#888', fontSize:'12px', cursor:'pointer', fontFamily:'var(--font-display)', display:'flex', alignItems:'center', gap:'4px' }}>
                ✕ Effacer
              </button>
            )}

            {!loading && filtered.length>0 && (
              <span style={{ fontSize:'11px', color:'#CCC', marginLeft:'auto' }}>
                {filtered.length.toLocaleString('fr-FR')} cartes
              </span>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign:'center', padding:'80px 20px' }}>
              <div style={{ position:'relative', width:'44px', height:'44px', margin:'0 auto 16px' }}>
                <div style={{ position:'absolute', inset:0, border:'3px solid #F0F0F0', borderTop:'3px solid #111', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
                <div style={{ position:'absolute', inset:'5px', border:'2px solid #F5F5F5', borderBottom:'2px solid #CCCCCC', borderRadius:'50%', animation:'spin 1.4s linear infinite reverse' }}/>
                <div style={{ position:'absolute', inset:'10px', borderRadius:'50%', background:'#111' }}/>
              </div>
              <div style={{ fontSize:'13px', color:'#666', fontFamily:'var(--font-display)', fontWeight:500, marginBottom:'5px' }}>{loadMsg}</div>
              <div style={{ fontSize:'11px', color:'#CCC' }}>Mise en cache pour les prochaines visites</div>
            </div>
          )}

          {/* GRID */}
          {/* Browse toggle */}
          {!loading && !loadErr && (
            <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
              <button onClick={()=>{setBrowseMode('all');setSelBloc(null);setFilSet('all');setFilEra('all');setPage(0)}} style={{ padding:'6px 14px', borderRadius:'99px', border:'0.5px solid rgba(255,255,255,0.6)', background:browseMode==='all'?'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)':'rgba(255,255,255,0.45)', color:browseMode==='all'?'#1D1D1F':'#86868B', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:browseMode==='all'?'0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)':'inset 0 1px 0 rgba(255,255,255,0.7)' }}>Toutes les cartes</button>
              <button onClick={()=>{setBrowseMode('bloc');setSelBloc(null);setFilSet('all');setPage(0)}} style={{ padding:'6px 14px', borderRadius:'99px', border:'0.5px solid rgba(255,255,255,0.6)', background:browseMode==='bloc'?'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)':'rgba(255,255,255,0.45)', color:browseMode==='bloc'?'#1D1D1F':'#86868B', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:browseMode==='bloc'?'0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)':'inset 0 1px 0 rgba(255,255,255,0.7)' }}>Par blocs</button>
            </div>
          )}
          {browseMode==='bloc'&&!selBloc&&!loading&&(
            <div className="kbloc-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:'10px', marginBottom:'20px' }}>
              {blocs.map(b=>{
                const preview = allCards.filter(c=>c.era===b.name&&c.image).slice(0,3)
                return (
                <div key={b.name} className="enc-bloc-tile-v2" onClick={()=>{setSelBloc(b.name);setFilEra(b.name);setPage(0)}} style={{ display:'flex', alignItems:'center', gap:'14px', background:'rgba(255,255,255,0.6)', backdropFilter:'blur(14px) saturate(180%)', WebkitBackdropFilter:'blur(14px) saturate(180%)', border:'0.5px solid rgba(0,0,0,0.05)', borderRadius:14, padding:'12px 16px', cursor:'pointer', transition:'all .25s cubic-bezier(.2,.85,.3,1)', boxShadow:'0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,0,0,0.12)';e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.07), inset 0 1px 0 rgba(255,255,255,0.95)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,0,0,0.05)';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)'}}>
                  <div style={{ display:'flex', alignItems:'center', width:'58px', height:'52px', flexShrink:0, position:'relative' }}>
                    {preview.map((c,i)=>{
                      const rot = [-7,0,7][i] ?? 0
                      const left = [0,14,28][i] ?? 0
                      return (
                        <div key={c.id} style={{ position:'absolute', left:`${left}px`, height:'48px', width:'34px', borderRadius:'4px', overflow:'hidden', border:'1.5px solid #fff', boxShadow:'0 1px 4px rgba(0,0,0,0.12)', transform:`rotate(${rot}deg)`, zIndex:i }}>
                          <CardImg setId={c.setId} localId={c.localId} lang={lang} image={c.image} enImage={c.enImage} variant="thumb" fallback="hide" imgStyle={{ objectFit:'cover' }} />
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'15px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)', marginBottom:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, display:'flex', alignItems:'baseline', gap:'7px' }}>
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{b.name}</span>
                      {lang==='JP' && ERA_JP_CODE[b.name] ? <span style={{ fontSize:'10.5px', fontWeight:600, color:'#86868B', fontFamily:'var(--font-mono, monospace)', letterSpacing:'0.04em', flexShrink:0 }}>{ERA_JP_CODE[b.name]}</span> : null}
                    </div>
                    <div style={{ fontSize:'11px', color:'#86868B', fontFamily:'var(--font-mono, monospace)' }}>{b.total.toLocaleString()} cartes <span style={{ color:'#C7C7CC' }}>·</span> {b.sets.length} série{b.sets.length>1?'s':''}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" style={{ flexShrink:0, opacity:0.3 }}><path d="M4.5 3L7.5 6L4.5 9" stroke="#1D1D1F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                )
              })}
            </div>
          )}
          {browseMode==='bloc'&&selBloc&&!loading&&(
            <div style={{ marginBottom:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                <button onClick={()=>{setSelBloc(null);setFilEra('all');setFilSet('all');setPage(0)}} style={{ background:'rgba(255,255,255,0.55)', backdropFilter:'blur(10px) saturate(180%)', WebkitBackdropFilter:'blur(10px) saturate(180%)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:9, padding:'7px 12px', cursor:'pointer', fontSize:12, fontWeight:500, color:'#1D1D1F', fontFamily:'var(--font-sora, Sora, sans-serif)', display:'flex', alignItems:'center', gap:5, transition:'all .15s cubic-bezier(.2,.85,.3,1)', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.85)' }}>{String.fromCharCode(8249)} Blocs</button>
                {(()=>{ const logoSid = blocs.find(b=>b.name===selBloc)?.sets.find(st=>setLogos[st.id])?.id; return logoSid ? <img src={setLogos[logoSid]} alt="" style={{ height:'24px', maxWidth:'120px', objectFit:'contain' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/> : null })()}
                <span style={{ fontSize:'17px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)', display:'inline-flex', alignItems:'baseline', gap:'8px' }}>
                  {selBloc}
                  {lang==='JP' && selBloc && ERA_JP_CODE[selBloc] ? <span style={{ fontSize:'11px', fontWeight:600, color:'#86868B', fontFamily:'var(--font-mono, monospace)', letterSpacing:'0.04em' }}>{ERA_JP_CODE[selBloc]}</span> : null}
                </span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(178px,1fr))', gap:'6px', marginBottom:'16px' }}>
                <div onClick={()=>{setFilSet('all');setPage(0)}} style={{ padding:'8px 12px', borderRadius:'9px', border:'0.5px solid '+(filSet==='all'?'#1D1D1F':'rgba(0,0,0,0.08)'), background:filSet==='all'?'#1D1D1F':'rgba(255,255,255,0.6)', color:filSet==='all'?'#fff':'#1D1D1F', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'6px' }}>
                  <span>Toutes</span><span style={{ fontFamily:'var(--font-mono, monospace)', fontSize:'10px', opacity:.6 }}>{blocs.find(b=>b.name===selBloc)?.total.toLocaleString()}</span>
                </div>
                {blocs.find(b=>b.name===selBloc)?.sets.map(st=>{
                  const sel = filSet===st.id
                  const ow = allCards.filter(c=>c.setId===st.id&&isOwned(c)).length
                  const enSet = lang==='JP' ? allCards.find(c=>c.setId===st.id)?.enSetName : null
                  const thumb = allCards.find(c=>c.setId===st.id)
                  return (
                  <div key={st.id} onClick={()=>{setFilSet(st.id);setPage(0)}}
                    className='enc-serie-tile-v3 rh'
                    style={{ padding:'7px 10px', borderRadius:'11px', border:'0.5px solid '+(sel?'#1D1D1F':'rgba(0,0,0,0.06)'), background:sel?'#1D1D1F':'rgba(255,255,255,0.55)', backdropFilter:'blur(12px) saturate(180%)', WebkitBackdropFilter:'blur(12px) saturate(180%)', color:sel?'#fff':'#1D1D1F', cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .2s cubic-bezier(.2,.85,.3,1)', display:'flex', alignItems:'center', gap:'10px', minWidth:0, boxShadow:sel?'0 2px 10px rgba(0,0,0,0.12)':'inset 0 1px 0 rgba(255,255,255,0.7)' }}
                    onMouseEnter={e=>{if(!sel){e.currentTarget.style.background='rgba(255,255,255,0.92)';e.currentTarget.style.boxShadow='0 3px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)';const im=e.currentTarget.querySelector('img');if(im)im.style.transform='scale(1.08)'}}}
                    onMouseLeave={e=>{if(!sel){e.currentTarget.style.background='rgba(255,255,255,0.55)';e.currentTarget.style.boxShadow='inset 0 1px 0 rgba(255,255,255,0.7)';const im=e.currentTarget.querySelector('img');if(im)im.style.transform='scale(1)'}}}>
                    <div style={{ width:'30px', height:'42px', borderRadius:'5px', overflow:'hidden', flexShrink:0, background:sel?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.04)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <CardImg setId={st.id} localId={thumb?.localId} lang={lang} image={thumb?.image} enImage={thumb?.enImage} variant="thumb" fallback="hide" imgStyle={{ objectFit:'cover', transition:'transform .25s cubic-bezier(.2,.85,.3,1)' }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'12px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, lineHeight:1.25 }}>
                        {st.name}
                      </div>
                      <div style={{ fontSize:'10px', color:sel?'rgba(255,255,255,0.6)':'#86868B', marginTop:'1px' }}>
                        {ow>0?<><span style={{ color:sel?'#86EFAC':'#2E9E6A', fontWeight:700 }}>{ow}</span><span>/{st.count} cartes</span></>:<>{st.count} cartes</>}
                        {enSet&&<span style={{ color:sel?'rgba(255,255,255,0.35)':'#C7C7CC', marginLeft:'5px' }}>{enSet}</span>}
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          )}

          {!loading && !loadErr && filtered.length>0 && (
            <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', marginBottom:'8px' }}>
              <span style={{ fontSize:'11px', color:'#AEAEB2', fontFamily:'var(--font-display)' }}>{Math.min(visibleCount, filtered.length)} / {filtered.length} cartes affichées</span>
            </div>
          )}

          {!loading && !loadErr && filtered.length===0 && allCards.length>0 && (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{ fontSize:'48px', opacity:.15, marginBottom:'16px' }}>{String.fromCharCode(9997)}</div>
              <div style={{ fontSize:'16px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)', marginBottom:'6px' }}>Aucune carte trouvée</div>
              <div style={{ fontSize:'13px', color:'#86868B', marginBottom:'16px' }}>Essayez avec d'autres filtres ou un autre terme de recherche.</div>
              <button onClick={()=>{setFilEra('all');setFilSet('all');setFilRarity('all');setSearch('');setPage(0)}}
                style={{ padding:'8px 16px', borderRadius:'8px', background:'#1D1D1F', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                Effacer les filtres
              </button>
            </div>
          )}

          {/* Set header when filtered */}
          {!loading && filSet!=='all' && (()=>{
            const setInfo = sets.find(st=>st.id===filSet)
            const totalInSet = allCards.filter(c=>c.setId===filSet).length
            const ownedInSet = allCards.filter(c=>c.setId===filSet&&isOwned(c)).length
            const pct = totalInSet>0?Math.round(ownedInSet/totalInSet*100):0
            const rarityDist: Record<string,number> = {}
            allCards.filter(c=>c.setId===filSet).forEach(c=>{ const r=c.rarity||'Inconnue'; rarityDist[r]=(rarityDist[r]||0)+1 })
            const topRarities = Object.entries(rarityDist).sort((a,b)=>b[1]-a[1]).slice(0,6)
            return (
              <div style={{ background:'linear-gradient(135deg,#FAFAFA,#F0F0F2)', border:'1px solid #E5E5EA', borderRadius:'16px', padding:'20px 24px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'24px', flexWrap:'wrap' as const }}>
                {setLogos[filSet]&&<img src={setLogos[filSet]} alt="" style={{ height:'48px', maxWidth:'200px', objectFit:'contain' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                <div style={{ flex:1, minWidth:'200px' }}>
                  <div style={{ fontSize:'18px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', marginBottom:'2px' }}>{setInfo?.name||filSet}</div>
                  {setBlocks[filSet]&&<div style={{ fontSize:'11px', color:'#86868B', fontFamily:'var(--font-display)', marginBottom:'4px' }}>{setBlocks[filSet]}</div>}
                  {(filSet.includes('-shadowless')||filSet.includes('-1st'))&&(
                    <div style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:'6px', flexWrap:'wrap' as const }}>
                      {filSet.includes('-shadowless-ns')||filSet.includes('-1st')?<span style={{ fontSize:'8px', fontWeight:700, padding:'2px 6px', borderRadius:'4px', background:'linear-gradient(135deg,#1a1a2e,#2d2b55)', color:'#d4c5ff', fontFamily:'var(--font-data)', letterSpacing:'.03em' }}>1ST EDITION</span>:null}
                      {filSet.includes('-shadowless')?<span style={{ fontSize:'8px', fontWeight:700, padding:'2px 6px', borderRadius:'4px', background:'linear-gradient(135deg,#e8eeff,#dde4ff)', color:'#4338ca', fontFamily:'var(--font-data)', letterSpacing:'.03em' }}>SHADOWLESS</span>:null}
                      <span style={{ fontSize:'10px', color:'#AEAEB2', fontFamily:'var(--font-display)', marginLeft:'4px' }}>
                        {filSet.includes('-shadowless-ns')?'1st print run, no drop shadow on art box + 1st Edition stamp':(filSet.includes('-shadowless')&&!filSet.includes('-shadowless-ns'))?'1st print run, no drop shadow on art box, no 1st Ed. stamp':filSet.includes('-1st')?'First Edition print run with 1st Edition stamp':''}
                      </span>
                    </div>
                  )}
                  <div style={{ display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' as const }}>
                    <div style={{ height:'6px', flex:1, minWidth:'120px', maxWidth:'240px', background:'#E5E5EA', borderRadius:'3px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:pct+'%', background:pct===100?'#2E9E6A':pct>50?'#F5A623':'#E03020', borderRadius:'3px', transition:'width .4s ease' }}/>
                    </div>
                    <span style={{ fontSize:'12px', fontWeight:600, color:pct===100?'#2E9E6A':'#1D1D1F', fontFamily:'var(--font-data)' }}>{ownedInSet}/{totalInSet} ({pct}%)</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' as const }}>
                  {topRarities.map(([r,n])=>{ const rc=getRarityColor(r); return <span key={r} style={{ fontSize:'9px', fontWeight:600, padding:'3px 8px', borderRadius:'6px', background:rc.bg, color:rc.fg, fontFamily:'var(--font-display)' }}>{r} ({n})</span> })}
                </div>
              </div>
            )
          })()}
          {!loading && !loadErr && view==='grid' && (()=>{
            const cfg = {
              S:{ col:'repeat(auto-fill,minmax(130px,1fr))', imgH:'108px', nameSize:'11px', subSize:'9px',  pad:'8px 9px 9px'  },
              M:{ col:'repeat(auto-fill,minmax(185px,1fr))', imgH:'160px', nameSize:'13px', subSize:'10px', pad:'10px 12px 12px'},
              L:{ col:'repeat(auto-fill,minmax(240px,1fr))', imgH:'220px', nameSize:'14px', subSize:'11px', pad:'12px 14px 14px'},
            }[cardSize]
            return (
              <div className="kcard-grid" data-size={cardSize} style={{ display:'grid', gridTemplateColumns:cfg.col, gap: cardSize==='L'?'16px':'12px' }}>
                {pageCards.map((card,idx) => {
                  const isSel = selId===card.id
                  const base  = cardImageUrl(card, lang)
                  const img   = base ? (base.includes('.webp')||base.includes('.png')||base.includes('.jpg') ? base : `${base}/low.webp`) : null
                  return (
                    <div key={card.id}
                      className={`enc-card${isSel?' sel':''}`}
                      onClick={()=>handleCardClick(card.id)}
                      style={{
                        background: 'rgba(255,255,255,0.65)',
                        border: `1px solid ${isSel ? '#1D1D1F' : 'rgba(0,0,0,0.05)'}`,
                        boxShadow: isSel
                          ? '0 0 0 1px #1D1D1F, 0 16px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95)'
                          : '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
                        animation: `cardIn .35s ${Math.min(idx,18)*.025}s cubic-bezier(.2,.85,.3,1) both`,
                      }}>
                      <div style={{ height: cfg.imgH, background: 'rgba(0,0,0,0.025)', position: 'relative' as const, overflow: 'hidden' as const, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        {card.rarity && (()=>{
                          const rc = getRarityColor(card.rarity)
                          return (
                            <div style={{
                              position: 'absolute' as const,
                              bottom: 7, left: 7,
                              zIndex: 2,
                              padding: '3px 7px',
                              borderRadius: 5,
                              background: rc.bg,
                              fontSize: 7.5,
                              fontWeight: 700,
                              color: rc.fg,
                              fontFamily: 'var(--font-sora, Sora, sans-serif)',
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase' as const,
                              opacity: 0.95,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)',
                            }}>{card.rarity}</div>
                          )
                        })()}
                        {img ? (
                          <CardImg setId={card.setId} localId={card.localId} lang={lang} image={card.image} enImage={card.enImage} name={card.name} number={card.localId} variant="full" imgClassName="card-img" imgStyle={{ padding: cardSize==='L'?'6px':'3px', boxSizing:'border-box' }} />
                        ) : (
                          <div style={{
                            position: 'absolute' as const, inset: 0,
                            background: 'linear-gradient(145deg, rgba(0,0,0,0.025) 0%, rgba(0,0,0,0.045) 100%)',
                            display: 'flex',
                            flexDirection: 'column' as const,
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                          }}>
                            {cardSize!=='S' && <div style={{ fontSize:'7px', color:'#BBB', fontFamily:'var(--font-display)', textAlign:'center' as const, lineHeight:1.3 }}>Image non<br/>disponible</div>}
                          </div>
                        )}
                        <div style={{
                          position: 'absolute' as const,
                          bottom: 6, right: 7,
                          fontSize: cardSize === 'S' ? 10 : 11,
                          background: 'rgba(255,255,255,0.92)',
                          backdropFilter: 'blur(10px) saturate(180%)',
                          WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                          borderRadius: 5,
                          padding: '2px 6px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.95)',
                          border: '1px solid rgba(0,0,0,0.04)',
                        }}>
                          {flag(lang)}
                        </div>
                        <button className="zoom-btn" onClick={e=>{ e.stopPropagation(); setLightbox(card) }}
                          style={{
                            position: 'absolute' as const, top: 7, right: 7,
                            width: 26, height: 26,
                            borderRadius: 7,
                            background: 'rgba(255,255,255,0.9)',
                            backdropFilter: 'blur(12px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                            border: '1px solid rgba(0,0,0,0.06)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0,
                            zIndex: 3,
                            transition: 'all .2s cubic-bezier(.2,.85,.3,1)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
                          }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
                        </button>
                        {isOwned(card) && (
                          <div style={{
                            position: 'absolute' as const, top: 7, right: 7,
                            width: 22, height: 22,
                            borderRadius: '50%',
                            background: '#1D9E75',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2,
                            boxShadow: '0 2px 8px rgba(29,158,117,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                            border: '1.5px solid rgba(255,255,255,0.95)',
                          }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                          </div>
                        )}
                      </div>
                      <div style={{ padding:cfg.pad }}>
                        <div className="card-name" style={{ fontSize:cfg.nameSize, fontWeight:600, color:'#111', fontFamily:'var(--font-display)', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, lineHeight:1.3 }}>
                          {card.name}
                        </div>
                        <div style={{ fontSize:cfg.subSize, color:ERA_COLORS[card.era]||'#BBBBBB', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
                          {setLogos[card.setId]&&<img src={setLogos[card.setId]} alt="" style={{ height:'11px', maxWidth:'40px', objectFit:'contain', verticalAlign:'middle', marginRight:'3px', opacity:.6 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                          {card.setName}
                          {cardSize!=='S' && <span style={{ fontFamily:'monospace', marginLeft:'4px' }}>#{card.localId}</span>}
                          {lang==='JP'&&card.enSetName&&<span style={{ color:'#AEAEB2', marginLeft:'4px', fontSize:'9px' }}>{card.enSetName}</span>}
                        </div>
                        {(card.setId?.includes('-shadowless')||card.setId?.includes('-1st'))&&cardSize!=='S'&&(
                          <div style={{ display:'flex', alignItems:'center', gap:'3px', marginTop:'2px' }}>
                            {card.setId?.includes('-shadowless-ns')||card.setId?.includes('-1st')?<span style={{ fontSize:'7px', fontWeight:700, padding:'1px 4px', borderRadius:'3px', background:'linear-gradient(135deg,#1a1a2e,#2d2b55)', color:'#d4c5ff', fontFamily:'var(--font-data)', letterSpacing:'.03em' }}>1ST EDITION</span>:null}
                            {card.setId?.includes('-shadowless')?<span style={{ fontSize:'7px', fontWeight:700, padding:'1px 4px', borderRadius:'3px', background:'linear-gradient(135deg,#e8eeff,#dde4ff)', color:'#4338ca', fontFamily:'var(--font-data)', letterSpacing:'.03em' }}>SHADOWLESS</span>:null}
                          </div>
                        )}
                        {(()=>{ const gp = getPrice(card); return gp ? <div style={{ fontSize:'11px', fontWeight:600, color:'#2E9E6A', fontFamily:'var(--font-data)', marginTop:'3px' }}>{formatEUR(gp, 'small')}</div> : null })()}
                        {lang==='JP' && jpToNames(card.name,jpEnDict) && cardSize!=='S' && (()=>{
                          const t = jpToNames(card.name,jpEnDict)!
                          return (
                            <div style={{ fontSize:cardSize==='L'?'10px':'9px', color:'#86868B', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, fontFamily:'var(--font-display)', display:'flex', gap:'6px', alignItems:'center' }}>
                              <span style={{ display:'inline-flex', alignItems:'center', gap:'2px' }}><span style={{ fontSize:'9px' }}>🇬🇧</span>{t.en}</span>
                              {t.fr !== t.en && <span style={{ display:'inline-flex', alignItems:'center', gap:'2px' }}><span style={{ fontSize:'9px' }}>🇫🇷</span>{t.fr}</span>}
                            </div>
                          )
                        })()}
                        {cardSize==='L' && (
                          <button
                            onClick={e=>{ e.stopPropagation(); handleCardClick(card.id) }}
                            className="add-btn"
                            style={{ marginTop:'10px', width:'100%', padding:'7px', borderRadius:'7px', background:isSel?'#111':'#F5F5F5', color:isSel?'#fff':'#555', border:'none', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                            {isSel ? '✓ Sélectionnée' : 'Voir la carte'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {pageCards.length===0 && (
                  <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px', color:'#AAA', fontSize:'13px', fontFamily:'var(--font-display)' }}>
                    Aucune carte ne correspond à votre recherche
                  </div>
                )}
              </div>
            )
          })()}

          {/* LIST */}
          {!loading && !loadErr && view==='list' && (
            <div style={{ background:'rgba(255,255,255,0.65)', backdropFilter:'blur(14px) saturate(180%)', WebkitBackdropFilter:'blur(14px) saturate(180%)', border:'1px solid rgba(0,0,0,0.05)', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
              <div style={{ display:'grid', gridTemplateColumns:'40px minmax(0,2.5fr) minmax(0,1.2fr) 90px 55px 50px', padding:'10px 18px', background:'rgba(0,0,0,0.025)', borderBottom:'1px solid rgba(0,0,0,0.05)', gap:8 }}>
                {['','Carte','Série','Rareté','N°',''].map((h,i)=>(
                  <div key={i} style={{ fontSize:'10px', fontWeight:600, color:'#AAA', textTransform:'uppercase' as const, letterSpacing:'.07em', fontFamily:'var(--font-display)', textAlign:i>=4?'right' as const:'left' as const }}>{h}</div>
                ))}
              </div>
              {pageCards.map((card,i) => {
                const isSel = selId===card.id
                const rc = card.rarity ? getRarityColor(card.rarity) : null
                const owned = isOwned(card)
                return (
                  <div key={card.id} className="rh"
                    onClick={()=>handleCardClick(card.id)}
                    style={{ display:'grid', gridTemplateColumns:'40px minmax(0,2.5fr) minmax(0,1.2fr) 90px 55px 50px', padding:'8px 16px', borderBottom:i<pageCards.length-1?'1px solid #F8F8F8':'none', alignItems:'center', background:isSel?'#F5F5F7':owned?'#FAFEF5':'transparent', borderLeft:isSel?'3px solid #111':'3px solid transparent', transition:'all .1s', gap:'8px', cursor:'pointer' }}>
                    <div style={{ width:'32px', height:'44px', flexShrink:0, borderRadius:'5px', overflow:'hidden', background:'#F5F5F5', border:'1px solid #EBEBEB' }}>
                      <CardImg setId={card.setId} localId={card.localId} lang={lang} image={card.image} enImage={card.enImage} name={card.name} number={card.localId} variant="thumb" />
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, display:'flex', alignItems:'center', gap:'6px' }}>
                        {card.name}
                        {owned&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2E9E6A" strokeWidth="3" strokeLinecap="round" style={{ flexShrink:0 }}><path d="M20 6L9 17l-5-5"/></svg>}
                      </div>
                      {lang==='JP' && jpToNames(card.name,jpEnDict) && (()=>{
                        const t = jpToNames(card.name,jpEnDict)!
                        return (
                          <div style={{ fontSize:'10px', color:'#86868B', fontFamily:'var(--font-display)', display:'flex', gap:'6px', alignItems:'center' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:'2px' }}><span style={{ fontSize:'9px' }}>🇬🇧</span>{t.en}</span>
                            {t.fr !== t.en && <span style={{ display:'inline-flex', alignItems:'center', gap:'2px' }}><span style={{ fontSize:'9px' }}>🇫🇷</span>{t.fr}</span>}
                          </div>
                        )
                      })()}
                    </div>
                    <div style={{ fontSize:'11px', color:'#86868B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, display:'flex', alignItems:'center', gap:'5px' }}>
                      {setLogos[card.setId]&&<img src={setLogos[card.setId]} alt="" style={{ height:'13px', maxWidth:'40px', objectFit:'contain', opacity:.5, flexShrink:0 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                      {card.setName}{lang==='JP'&&card.enSetName&&<span style={{ color:'#AEAEB2', marginLeft:'4px' }}>({card.enSetName})</span>}
                    </div>
                    <div>{rc&&<span style={{ fontSize:'9px', fontWeight:600, padding:'2px 6px', borderRadius:'4px', background:rc.bg, color:rc.fg, fontFamily:'var(--font-display)' }}>{card.rarity}</span>}</div>
                    <div style={{ fontSize:'11px', color:'#AEAEB2', fontFamily:'var(--font-data)', textAlign:'right' as const }}>#{card.localId}</div>
                    <div style={{ textAlign:'right' }}>
                      <button className="zoom-btn" onClick={e=>{e.stopPropagation();setLightbox(card)}} style={{ width:'26px', height:'26px', borderRadius:'6px', background:'#F5F5F7', border:'1px solid #EBEBEB', cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', opacity:.5, transition:'all .15s' }}
                        onMouseEnter={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.background='#1D1D1F';(e.currentTarget.querySelector('svg') as SVGElement).style.stroke='#fff'}}
                        onMouseLeave={e=>{e.currentTarget.style.opacity='.5';e.currentTarget.style.background='#F5F5F7';(e.currentTarget.querySelector('svg') as SVGElement).style.stroke='#1D1D1F'}}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
                      </button>
                    </div>
                  </div>
                )
              })}
              {pageCards.length===0 && (
                <div style={{ padding:'40px', textAlign:'center', color:'#AAA', fontSize:'13px', fontFamily:'var(--font-display)' }}>Aucune carte trouvée</div>
              )}
            </div>
          )}

          {/* Pagination */}
          {!loading && !loadErr && pageCount>1 && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'5px', marginTop:'24px' }}>
              <button className="pgbtn" disabled={page===0} onClick={()=>{setPage(0);window.scrollTo({top:0,behavior:'smooth'})}}>«</button>
              <button className="pgbtn" disabled={page===0} onClick={()=>{setPage(p=>p-1);window.scrollTo({top:0,behavior:'smooth'})}}>‹</button>
              {Array.from({length:Math.min(7,pageCount)}, (_,i) => {
                const mid = Math.min(Math.max(page,3), pageCount-4)
                const p   = pageCount<=7 ? i : Math.max(0, mid-3+i)
                return p<pageCount ? (
                  <button key={p} onClick={()=>setPage(p)}
                    style={{ width:'32px', height:'32px', borderRadius:'7px', border:`1px solid ${p===page?'#111':'#E8E8E8'}`, background:p===page?'#111':'#fff', color:p===page?'#fff':'#555', cursor:'pointer', fontSize:'12px', fontFamily:'var(--font-display)', transition:'all .1s' }}>
                    {p+1}
                  </button>
                ) : null
              })}
              <button className="pgbtn" disabled={page>=pageCount-1} onClick={()=>{setPage(p=>p+1);window.scrollTo({top:0,behavior:'smooth'})}}>›</button>
              <button className="pgbtn" disabled={page>=pageCount-1} onClick={()=>{setPage(pageCount-1);window.scrollTo({top:0,behavior:'smooth'})}}>»</button>
            </div>
          )}

        </div>

        {/* ── DETAIL PANEL : CardSidePanel unifie (SpotlightV2) ── */}
        <AddToCollectionModal
          open={!!addSeed}
          onClose={() => setAddSeed(null)}
          card={addSeed}
          onAdd={handleModalAdd}
        />
        {drawerMounted && selId && selCard && createPortal(
          <CardSidePanel
            cardId={kodoIdOf(selCard)}
            lang={lang === 'JP' ? 'JP' : lang === 'EN' ? 'EN' : 'FR'}
            onClose={() => { setSelId(null); setDetail(null); setEnDetail(null) }}
            actions={
              isOwned(selCard) ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px 18px', borderRadius:12, background:'rgba(29,158,117,0.1)', border:'1px solid rgba(29,158,117,0.25)', color:'#1D9E75', fontSize:14, fontWeight:700, fontFamily:'var(--font-display)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  Dans ma collection
                </div>
              ) : (
                <button onClick={() => { if(selCard) openAddModal(selCard) }} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px 18px', borderRadius:12, background:'#1D1D1F', color:'#fff', border:'none', fontSize:14, fontWeight:700, fontFamily:'var(--font-display)', cursor:'pointer', transition:'all .18s cubic-bezier(.2,.8,.2,1)' }} onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,0.18)' }} onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  Ajouter au portfolio
                </button>
              )
            }
          />,
          document.body
        )}


      </div>

      {/* TOAST */}
      {toast&&<div style={{ position:'fixed', bottom:'80px', left:'50%', transform:'translateX(-50%)', background:'#1D1D1F', color:'#fff', padding:'10px 20px', borderRadius:'99px', fontSize:'13px', fontWeight:500, fontFamily:'var(--font-display)', zIndex:60, boxShadow:'0 8px 24px rgba(0,0,0,.15)', animation:'fadeUp .2s ease-out' }}>{toast}</div>}

      {/* LIGHTBOX */}

      {/* Infinite scroll sentinel */}
      {hasMore && !loading && (
        <div ref={loadMoreRef} style={{ display:'flex', justifyContent:'center', padding:'32px 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', color:'#AEAEB2', fontSize:'12px', fontFamily:'var(--font-display)' }}>
            <div style={{ width:'16px', height:'16px', border:'2px solid #E5E5EA', borderTop:'2px solid #86868B', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
            Chargement...
          </div>
        </div>
      )}
      {!hasMore && filtered.length > CHUNK_SIZE && !loading && (
        <div style={{ textAlign:'center', padding:'20px 0', color:'#AEAEB2', fontSize:'11px', fontFamily:'var(--font-display)' }}>
          {filtered.length.toLocaleString('fr-FR')} cartes affichées
        </div>
      )}

            {/* Hidden upload input */}

            {lightbox && (()=>{
        const base = cardImageUrl(lightbox, lang)
        const imgHd = base || (detail?.set?.id && detail?.localId ? getCardImageUrl({ lang: lang, setId: detail.set.id, localId: detail.localId }) : null)
        // Navigation dans le set
        const setCards = filtered.filter(c=>c.setId===lightbox.setId).sort((a,b)=>parseInt(a.localId)-parseInt(b.localId))
        const curIdx = setCards.findIndex(c=>c.id===lightbox.id)
        const prevCard = curIdx > 0 ? setCards[curIdx-1] : null
        const nextCard = curIdx < setCards.length-1 ? setCards[curIdx+1] : null
        const rc = getRarityColor(lightbox.rarity||'')
        return createPortal(
          <div className="kc-lightbox" style={{ position:'fixed', inset:0, background:'rgba(8,8,12,0.94)', backdropFilter:'blur(10px) saturate(120%)', WebkitBackdropFilter:'blur(10px) saturate(120%)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', animation:'kcLightboxIn .22s cubic-bezier(.2,.85,.3,1)' }}
            onClick={()=>setLightbox(null)}>
            {/* Prev */}
            {prevCard && (
              <button onClick={e=>{e.stopPropagation();setLightbox(prevCard)}}
                style={{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)', width:'48px', height:'48px', borderRadius:'50%', background:'rgba(255,255,255,0.12)', backdropFilter:'blur(16px) saturate(180%)', WebkitBackdropFilter:'blur(16px) saturate(180%)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', transition:'all .15s', zIndex:2, boxShadow:'0 4px 16px rgba(0,0,0,0.3)' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.2)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.1)'}}>
                {String.fromCharCode(8249)}
              </button>
            )}
            {/* Next */}
            {nextCard && (
              <button onClick={e=>{e.stopPropagation();setLightbox(nextCard)}}
                style={{ position:'absolute', right:'16px', top:'50%', transform:'translateY(-50%)', width:'48px', height:'48px', borderRadius:'50%', background:'rgba(255,255,255,0.12)', backdropFilter:'blur(16px) saturate(180%)', WebkitBackdropFilter:'blur(16px) saturate(180%)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', transition:'all .15s', zIndex:2, boxShadow:'0 4px 16px rgba(0,0,0,0.3)' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.2)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.1)'}}>
                {String.fromCharCode(8250)}
              </button>
            )}
            {/* Card */}
            <div onClick={e=>e.stopPropagation()} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'16px', maxWidth:'420px', width:'100%' }}>
              {imgHd && <img src={imgHd} alt={lightbox.name}
                style={{ maxHeight:'75vh', maxWidth:'100%', objectFit:'contain', borderRadius:'16px', boxShadow:'0 24px 60px rgba(0,0,0,.4)' }}
                onError={e=>{const t=e.target as HTMLImageElement; if(t.src.includes('high.webp')) t.src=t.src.replace('high.webp','high.png')}}/>}
              <div style={{ textAlign:'center', background:'rgba(255,255,255,0.08)', backdropFilter:'blur(16px) saturate(180%)', WebkitBackdropFilter:'blur(16px) saturate(180%)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'14px', padding:'12px 20px' }}>
                <div style={{ fontSize:'16px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)', marginBottom:'4px' }}>{lightbox.name}</div>
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,.5)', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                  <span>{lightbox.setName}</span>
                  <span>{String.fromCharCode(183)}</span>
                  <span>#{lightbox.localId}</span>
                  {lightbox.rarity && <><span>{String.fromCharCode(183)}</span><span style={{ background:rc.bg, color:rc.fg, padding:'1px 6px', borderRadius:'4px', fontSize:'10px', fontWeight:600 }}>{lightbox.rarity}</span></>}
                </div>
                {curIdx>=0 && <div style={{ fontSize:'11px', color:'rgba(255,255,255,.3)', marginTop:'6px' }}>{curIdx+1} / {setCards.length}</div>}
              </div>
              <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
                {!isOwned(lightbox) && (
                  <button onClick={()=>{openAddModal(lightbox)}}
                    style={{ padding:'8px 16px', borderRadius:'8px', background:'#fff', color:'#1D1D1F', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                    + Ajouter au portfolio
                  </button>
                )}
                {isOwned(lightbox) && (
                  <div style={{ padding:'8px 16px', borderRadius:'8px', background:'rgba(39,80,10,.3)', color:'#C0DD97', fontSize:'12px', fontWeight:600, fontFamily:'var(--font-display)', display:'flex', alignItems:'center', gap:'6px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C0DD97" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                    Dans ma collection
                  </div>
                )}
              </div>
            </div>
            {/* Close */}
            <button onClick={()=>setLightbox(null)}
              style={{ position:'absolute', top:'20px', right:'20px', width:'42px', height:'42px', borderRadius:'50%', background:'rgba(255,255,255,0.12)', backdropFilter:'blur(16px) saturate(180%)', WebkitBackdropFilter:'blur(16px) saturate(180%)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', transition:'all .15s', zIndex:3, boxShadow:'0 4px 16px rgba(0,0,0,0.3)' }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.15)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.08)'}}>
              {String.fromCharCode(215)}
            </button>
            <style>{`@keyframes kcLightboxIn{from{opacity:0}to{opacity:1}}`}</style>
          </div>,
          document.body
        )
      })()}
      {/* Back to top */}
      <button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} className="scrolltop-fab" style={{ position:'fixed', bottom:'96px', right:'22px', width:'44px', height:'44px', borderRadius:'50%', background:'#1D1D1F', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(0,0,0,.15)', zIndex:30, transition:'all .2s' }}
        onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.2)'}}
        onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.15)'}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
      </button>
      <CollectionGate
        card={gateCard}
        onClose={()=>setGateCard(null)}
        onSignup={()=>{ setGateCard(null); setAuthModal('signup') }}
        onLogin={()=>{ setGateCard(null); setAuthModal('login') }}
      />
      <AuthModal
        open={authModal!==null}
        defaultMode={authModal||'login'}
        onClose={()=>setAuthModal(null)}
      />
    </>
  )
}
