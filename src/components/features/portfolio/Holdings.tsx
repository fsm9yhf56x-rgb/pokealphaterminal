'use client'
import { isSealed, kthumbFit } from '@/lib/sealed-fit'
import { track } from '@/components/layout/Analytics'
import { createPortal } from 'react-dom'

import { useState, useRef, useEffect, useMemo } from 'react'
import { AnimatedTotal } from './AnimatedTotal'
import { KodoSelect } from '@/components/ui/KodoSelect'
import { fetchSets, fetchCardsForSet, fetchCardDetail, type TCGSet, type TCGCard } from '@/lib/tcgApi'
import { groupSetsByEra, filterCoreSets, formatJPSetName } from '@/lib/setGroups'
import { formatEUR } from '@/lib/formatPrice'

import ImportPortfolioModal from './ImportPortfolioModal'
import AddSealedPicker from './AddSealedPicker'
import AddCardPicker, { type CardSeed } from './AddCardPicker'
import { AddSealedModal, type SealedSeed } from '@/components/features/card/AddSealedModal'
import { buildSealedDbRow, buildSealedLocalRow } from '@/lib/sealed-portfolio'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCardImageUrl, cleanLegacyUrl as cleanImageUrl } from '@/lib/images'
import { usePersona } from '@/lib/usePersona'
import { HeaderSparkline } from './HeaderSparkline'
import { getCardsForSet, staticToTCGCards } from '@/lib/cardDb'
import { LiquidProgress } from '@/components/ui/LiquidProgress'
import { useAuth } from '@/lib/useAuth'
import { normalizeCondition } from '@/lib/conditions'
import { useCardPrices } from '@/components/features/prices/hooks/useCardPrices'
import { PsaPopBlock } from '@/components/features/psa/PsaPopBlock'
import { GradedPriceTable } from '@/components/features/prices/GradedPriceTable'
import { SpotlightV2 } from '@/components/features/spotlight/SpotlightV2'
import { SNOW, PERF } from '@/lib/design/colors'
import { ShareSheet } from './ShareSheet'
import { CardLimitGate } from './CardLimitGate'
import { FREE_CARD_LIMIT } from '@/lib/constants/plan'
import { WrappedView } from './WrappedView'
import { GlassButton } from '@/components/ui/GlassButton'
import { SoonModal, SoonBadge } from '@/components/ui/snow'

type CardItem = {
  kCardId?: string
  id: string; name: string; set: string; year: number; number: string
  rarity: string; type: string; lang: 'EN'|'JP'|'FR'
  condition: string; graded: boolean
  buyPrice: number; curPrice: number; qty: number
  psa?: number; gradeCompany?: string; gradeValue?: string; signal?: 'S'|'A'|'B'; hot?: boolean; favorite?: boolean; showcasePos?: number; serverPriced?: boolean; priceBasis?: string
  image?: string; setTotal?: number; setId?: string; edition?: string; variant?: string; createdAt?: string
}

const ENCYCLOPEDIA: CardItem[] = [
  { id:'e1',  name:'Charizard Alt Art',    set:'SV151',            year:2023, number:'006', rarity:'Alt Art',     type:'fire',     lang:'EN', condition:'Near Mint', graded:false, buyPrice:0, curPrice:920,  qty:1, psa:312,  signal:'S', hot:true  },
  { id:'e2',  name:'Umbreon VMAX Alt',     set:'Evolving Skies',   year:2021, number:'215', rarity:'Alt Art',     type:'dark',     lang:'EN', condition:'Near Mint', graded:false, buyPrice:0, curPrice:880,  qty:1,            signal:'A'           },
  { id:'e3',  name:'Charizard VMAX',       set:'Champion Path',    year:2020, number:'074', rarity:'Secret Rare', type:'fire',     lang:'EN', condition:'Near Mint', graded:false, buyPrice:0, curPrice:420,  qty:1, psa:1240                       },
  { id:'e4',  name:'Gengar VMAX Alt',      set:'Fusion Strike',    year:2021, number:'271', rarity:'Alt Art',     type:'psychic',  lang:'EN', condition:'Near Mint', graded:false, buyPrice:0, curPrice:340,  qty:1                                 },
  { id:'e5',  name:'Pikachu VMAX RR',      set:'Vivid Voltage',    year:2020, number:'188', rarity:'Secret Rare', type:'electric', lang:'JP', condition:'Near Mint', graded:false, buyPrice:0, curPrice:110,  qty:1, psa:4200                       },
  { id:'e6',  name:'Rayquaza VMAX Alt',    set:'Evolving Skies',   year:2021, number:'218', rarity:'Alt Art',     type:'electric', lang:'EN', condition:'Near Mint', graded:false, buyPrice:0, curPrice:740,  qty:1,            signal:'A'           },
  { id:'e7',  name:'Mewtwo V Alt',         set:'Pokemon GO',       year:2022, number:'071', rarity:'Alt Art',     type:'psychic',  lang:'JP', condition:'Near Mint', graded:false, buyPrice:0, curPrice:280,  qty:1,            signal:'B'           },
  { id:'e8',  name:'Blastoise Base Set',   set:'Base Set',         year:1999, number:'002', rarity:'Holo Rare',   type:'water',    lang:'EN', condition:'Near Mint', graded:false, buyPrice:0, curPrice:620,  qty:1, psa:890                        },
  { id:'e9',  name:'Lugia Neo Genesis',    set:'Neo Genesis',      year:2000, number:'009', rarity:'Holo Rare',   type:'water',    lang:'EN', condition:'Near Mint', graded:false, buyPrice:0, curPrice:580,  qty:1, psa:2100                       },
  { id:'e10', name:'Mew ex Alt Art',       set:'SV151',            year:2023, number:'205', rarity:'Alt Art',     type:'psychic',  lang:'JP', condition:'Near Mint', graded:false, buyPrice:0, curPrice:140,  qty:1                                 },
  { id:'e11', name:'Gardevoir ex SAR',     set:'Scarlet & Violet', year:2023, number:'245', rarity:'Secret Rare', type:'psychic',  lang:'FR', condition:'Near Mint', graded:false, buyPrice:0, curPrice:95,   qty:1                                 },
  { id:'e12', name:'Miraidon ex SAR',      set:'Scarlet & Violet', year:2023, number:'254', rarity:'Secret Rare', type:'electric', lang:'FR', condition:'Near Mint', graded:false, buyPrice:0, curPrice:72,   qty:1                                 },
  { id:'e13', name:'Sylveon VMAX Alt',     set:'Evolving Skies',   year:2021, number:'212', rarity:'Alt Art',     type:'psychic',  lang:'EN', condition:'Near Mint', graded:false, buyPrice:0, curPrice:290,  qty:1                                 },
  { id:'e14', name:'Glaceon VMAX Alt',     set:'Evolving Skies',   year:2021, number:'209', rarity:'Alt Art',     type:'water',    lang:'EN', condition:'Near Mint', graded:false, buyPrice:0, curPrice:180,  qty:1                                 },
]

const CARD_SETS_ALL = ['Toutes', ...new Set(ENCYCLOPEDIA.map(c=>c.set))]
const EC: Record<string,string> = { fire:'#FF6B35',water:'#42A5F5',psychic:'#C855D4',dark:'#7E57C2',electric:'#D4A800',grass:'#3DA85A' }
const EG: Record<string,string> = { fire:'rgba(255,107,53,.55)',water:'rgba(66,165,245,.55)',psychic:'rgba(200,85,212,.55)',dark:'rgba(126,87,194,.55)',electric:'rgba(212,168,0,.55)',grass:'rgba(61,168,90,.55)' }
const LS: Record<string,{flag:string;bg:string;color:string}> = {
  EN:{flag:'\u{1F1FA}\u{1F1F8}',bg:'#FFF5F0',color:'#C84B00'},
  JP:{flag:'\u{1F1EF}\u{1F1F5}',bg:'#F0F5FF',color:'#003DAA'},
  FR:{flag:'\u{1F1EB}\u{1F1F7}',bg:'#F0FFF5',color:'#00660A'},
}
const TIER_BG: Record<string,string> = {
  S:'linear-gradient(135deg,#FFD700,#FF8C00)',
  A:'linear-gradient(135deg,#C855D4,#9C27B0)',
  B:'linear-gradient(135deg,#2E9E6A,#1A7A4A)',
}
const HOLO_RARITIES = ['Alt Art','Secret Rare','Gold Star','Promo']
type ViewMode = 'binder'|'showcase'|'wrapped'

// Badge d'etat pour cartes raw (non gradees) : label court + code couleur, pour
// comprendre d'un coup d'oeil pourquoi deux exemplaires d'une meme carte ont des
// prix differents (NM vs LP vs MP...). Pendant du badge de grade pour les gradees.
function rawStateLabel(condition?: string): string {
  const c = (condition || '').toLowerCase()
  if (c.includes('sealed') || c.includes('scell')) return 'SCELLÉ'
  if (c.includes('near') || c === 'nm' || c === 'mint')       return 'NM'
  if (c.includes('excellent') || c === 'ex')                  return 'EX'
  if (c.includes('lightly') || c === 'lp')                    return 'LP'
  if (c.includes('moderately') || c === 'mp')                 return 'MP'
  if (c.includes('heavily') || c === 'hp')                    return 'HP'
  if (c.includes('damaged') || c === 'dmg' || c === 'dm')     return 'DMG'
  return 'RAW'
}

const tiltCard = (e:React.MouseEvent<HTMLDivElement>) => {
  const el=e.currentTarget, r=el.getBoundingClientRect()
  const x=((e.clientX-r.left)/r.width-.5)*16, y=((e.clientY-r.top)/r.height-.5)*-16
  el.style.transform=`perspective(600px) rotateY(${x}deg) rotateX(${y}deg) translateZ(12px) scale(1.04)`
  const s=el.querySelector('.hm') as HTMLElement|null
  if(s){s.style.backgroundPosition=`${Math.round((e.clientX-r.left)/r.width*100)}% ${Math.round((e.clientY-r.top)/r.height*100)}%`;s.style.opacity='0.35'}
}
const resetCard = (e:React.MouseEvent<HTMLDivElement>) => {
  const el=e.currentTarget
  el.style.transition='transform 0.6s cubic-bezier(.23,1,.32,1)'; el.style.transform=''
  const s=el.querySelector('.hm') as HTMLElement|null
  if(s) s.style.opacity='0'
  setTimeout(()=>{el.style.transition=''},600)
}

// Grade companies data — outside component to avoid re-creation
const GRADE_COMPANIES = [
  {label:'PSA', grades:['PSA 1','PSA 2','PSA 3','PSA 4','PSA 5','PSA 6','PSA 7','PSA 8','PSA 9','PSA 10']},
  {label:'BGS', grades:['BGS 7','BGS 8','BGS 9','BGS 9.5','BGS 10']},
  {label:'CGC', grades:['CGC 8','CGC 9','CGC 9.5','CGC 10']},
  {label:'PCA', grades:['PCA 8','PCA 9','PCA 9.5','PCA 10']},
  {label:'CCC', grades:['CCC 8','CCC 9','CCC 10']},
]

type GridItem = { type:'owned'; card:CardItem; count?:number } | { type:'ghost'; name:string; number:string; image:string; rarity:string }

/** Un scelle porte card_number 'SEALED'. Regle unique : partout ou l'on veut des
 *  CARTES (series, vitrine, mur), on filtre avec ca, et nulle part autrement. */
// isSealed / kthumbFit vivent desormais dans src/lib/sealed-fit.ts

/**
 * Choisit la carte du mur pour la position donnee.
 *
 * i * pas (mod n) avec `pas` premier avec n parcourt TOUTES les cartes avant
 * d'en repeter une : deux voisines ne peuvent jamais etre identiques, et le
 * mur montre la collection entiere plutot que trois cartes en boucle.
 * Deterministe (pas de Math.random) : aucun ecart entre le rendu serveur et
 * le client.
 */
function makeWallPick(n: number) {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const pas = [7, 5, 11, 3, 13, 1].find(p => p < n && gcd(p, n) === 1) ?? 1
  return (i: number, row: number) => n > 0 ? ((i * pas + row * 3) % n + n) % n : 0
}

/** Le nombre de pieces se construit sous les yeux : la collection prend corps. */
function CountUpQty({ to }: { to: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(to); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min((t - t0) / 950, 1)
      setN(Math.round(to * (1 - Math.pow(1 - p, 4))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{n}</>
}

export function Holdings() {
  const { labels, show, isInvestor } = usePersona()
  // -- IndexedDB persistence --
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

  const router = useRouter()
  const { user, loading: authLoading, isPro } = useAuth()
  const [view,        setView]        = useState<ViewMode>('binder')

  const [binderSet,   setBinderSet]   = useState<string|null>('__all__')
  const [dragIdx,     setDragIdx]     = useState<number|null>(null)
  const [showInfo,    setShowInfo]    = useState(true)
  const [setSearch,   setSetSearch]   = useState('')
  const [setOrder, setSetOrder] = useState<string[]>(()=>{
    try { const r=localStorage.getItem('pka_set_order'); return r?JSON.parse(r):[] } catch { return [] }
  })
  const [dragSet, setDragSet] = useState<string|null>(null)
  const [dragOverSet, setDragOverSet] = useState<string|null>(null)
  const [collapsedSets, setCollapsedSets] = useState<Set<string>>(()=>{
    try { const r=localStorage.getItem('pka_collapsed'); return r?new Set(JSON.parse(r)):new Set() } catch { return new Set() }
  })
  const [binderSort,  setBinderSort]  = useState<'number'|'name'|'price'|'date'|'series'|'recent'>('number')
  const [valueHidden, setValueHidden] = useState(true)
  const [binderFilter, setBinderFilter] = useState<'all'|'graded'|'raw'|'rare'|'sealed'>('all')
  const [binderSetFilter, setBinderSetFilter] = useState<string>('all')
  const [binderLangFilter, setBinderLangFilter] = useState<'all'|'EN'|'FR'|'JP'>('all')
  useEffect(()=>{ if(binderSet==='__all__'){ setBinderSort(prev=> prev==='number' ? 'series' : prev) } else if(binderSet){ setBinderSort(prev=> (prev==='series'||prev==='recent') ? 'number' : prev) } else { setBinderSort('number') } },[binderSet])
  const [setTotalsMap, setSetTotalsMap] = useState<Record<string,number>>({})
  const [setDateMap, setSetDateMap] = useState<Record<string,string>>({})
  useEffect(()=>{
    const _c=localStorage.getItem('pka_set_dates_v1')
    if(_c){ try{ setSetDateMap(JSON.parse(_c)); return }catch(e){} }
    Promise.all(['EN','FR','JP'].map(l=>fetch('/data/sets-'+l+'.json').then(r=>r.ok?r.json():[]).catch(()=>[]))).then(all=>{
      const m:Record<string,string>={}
      ;([] as any[]).concat(...all).forEach((x:any)=>{ if(x&&x.releaseDate){ if(x.id)m[x.id]=x.releaseDate; if(x.name)m['n:'+String(x.name).toLowerCase()]=x.releaseDate } })
      setSetDateMap(m)
      try{ localStorage.setItem('pka_set_dates_v1', JSON.stringify(m)) }catch(e){}
    }).catch(()=>{})
  },[])
  const [showcaseBg,  setShowcaseBg]  = useState('obsidienne')
  const [binderCols,  setBinderCols]  = useState(7)
  const [binderPage,  setBinderPage]  = useState(0)
  const [portfolio,   setPortfolio]   = useState<CardItem[]>([])
  const [portfolioLoaded, setPortfolioLoaded] = useState(false)
  // ── Chargement portfolio : serveur si connecte, local sinon ──
  const lastFetchAt = useRef(0)
  const reloadPortfolio = useRef<() => void>(() => {})
  reloadPortfolio.current = () => {
    if (!user) return
    lastFetchAt.current = Date.now()
    supabase.from('portfolio_cards').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const mapped: CardItem[] = data.map((c: any) => ({
            id: c.id, kCardId: c.k_card_id || undefined, name: c.name, set: c.set_name || '', year: 0,
            number: c.card_number || '', rarity: c.rarity || '', type: c.card_type || 'fire',
            lang: (c.lang || 'FR') as 'EN'|'JP'|'FR',
            condition: c.condition || 'Near Mint', graded: c.graded || false,
            gradeCompany: c.grade_company || undefined, gradeValue: c.grade_value != null ? String(c.grade_value) : undefined,
            buyPrice: Number(c.buy_price) || 0, curPrice: Number(c.current_price) || 0,
            serverPriced: Number(c.current_price) > 0, priceBasis: c.price_basis || undefined,
            qty: c.qty || 1,
            image: (String(c.card_number ?? '') === 'SEALED'
              ? (c.image_url || undefined)
              : (c.set_id && c.card_number ? getCardImageUrl({ lang: c.lang || 'FR', setId: c.set_id, localId: c.card_number }) : c.image_url || undefined)),
            setId: c.set_id || undefined, favorite: c.is_favorite || false,
            showcasePos: c.showcase_position ?? undefined,
            notes: c.notes || undefined,
            createdAt: c.created_at || undefined,
          }))
          const visible = mapped.filter(c => !deletedIds.current.has(c.id))
          // Valeurs serveur = nouvelle reference : vider les signatures pour
          // que l'effect diff re-seede sans pousser d'UPDATE parasite.
          lastSynced.current.clear()
          setPortfolio(visible)
        } else {
          lastSynced.current.clear()
          setPortfolio([])
        }
        setPortfolioLoaded(true)
      })
  }

  useEffect(() => {
    if (authLoading) return
    if (user) {
      // User connecte → Neon SEULE source. Vider le local pour eviter les ghosts.
      try { localStorage.removeItem('pka_portfolio') } catch {}
      dbSet('portfolio', [])
      reloadPortfolio.current()
    } else {
      // Non connecte → IndexedDB puis localStorage
      dbGet<CardItem[]>('portfolio').then(data => {
        if (data && data.length > 0) {
          setPortfolio(data)
        } else {
          try {
            const r = localStorage.getItem('pka_portfolio')
            if (r) { const parsed = JSON.parse(r); if (parsed.length > 0) setPortfolio(parsed) }
          } catch {}
        }
        setPortfolioLoaded(true)
      }).catch(() => {
        try {
          const r = localStorage.getItem('pka_portfolio')
          if (r) setPortfolio(JSON.parse(r))
        } catch {}
        setPortfolioLoaded(true)
      })
    }
  }, [user?.id, authLoading])

  // Refetch quand l'onglet redevient visible (throttle 30s pour epargner Neon)
  useEffect(() => {
    if (!user) return
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastFetchAt.current < 30_000) return
      reloadPortfolio.current()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [user?.id])
  const [localShowcase, setLocalShowcase] = useState<CardItem[]>(()=>{
    try { const r=localStorage.getItem('pka_showcase'); return r?JSON.parse(r):[] } catch { return [] }
  })
  // CARTES seules. Un display n'est pas une carte d'un set : il fausserait la
  // completion x/226, la piece maitresse, la vitrine et le mur. Declare ICI parce
  // que la vitrine (juste dessous) et le mur (wallPick) en dependent tous les deux.
  const portfolioCards = useMemo(() => portfolio.filter(c => !isSealed(c)), [portfolio])
  // Connecte : vitrine derivee du portfolio (showcase_position). Invite : localStorage.
  const showcase = useMemo(() => (user
    ? portfolioCards.filter(c=>c.showcasePos!==undefined).sort((a,b)=>(a.showcasePos??0)-(b.showcasePos??0))
    : localShowcase.filter(c => !isSealed(c))
  ), [user?.id, portfolioCards, localShowcase])
  const [showPickerForShowcase, setShowPickerForShowcase] = useState(false)
  const [vitrineSearch, setVitrineSearch] = useState('')
  const [vitrineFilter, setVitrineFilter] = useState('all')
  const [spotCard,    setSpotCard]    = useState<CardItem|null>(null)
  const [gate,        setGate]        = useState<{ current: number; limit: number } | null>(null)
  useEffect(() => {
    if (spotCard) {
      document.body.classList.add('kc-modal-open')
      document.body.classList.add('kc-modal-opening')
      const t = setTimeout(() => document.body.classList.remove('kc-modal-opening'), 280)
      return () => clearTimeout(t)
    } else {
      document.body.classList.remove('kc-modal-open')
      document.body.classList.remove('kc-modal-opening')
    }
    return () => {
      document.body.classList.remove('kc-modal-open')
      document.body.classList.remove('kc-modal-opening')
    }
  }, [spotCard])
  const [editQty,     setEditQty]     = useState<number|null>(null)
  const [cardZoom,    setCardZoom]    = useState(false)
  const favs = new Set(portfolio.filter(c=>c.favorite).map(c=>c.id))
  const [shareOpen,   setShareOpen]   = useState(false)
  const [shareCtx,    setShareCtx]    = useState<'portfolio'|'card'|'wrapped'|'showcase'>('portfolio')
  const [shareCard,   setShareCard]   = useState<CardItem|null>(null)
  const [refCopied,   setRefCopied]   = useState(false)
  const [selectedFmt, setSelectedFmt] = useState<string|null>(null)
  const [addOpen,     setAddOpen]     = useState(false)
  const [addedInSession, setAddedInSession] = useState(0)  // mode A : compteur d'ajouts sans fermer
  const [addSuggs,    setAddSuggs]    = useState<string[]>([])
  const [nameValidated, setNameValidated] = useState(false)
  const [addForm,     setAddForm]     = useState<{
    name:string; set:string; setId:string; type:string; lang:'EN'|'JP'|'FR';
    condition:string; graded:boolean; gradeCompany?:string; gradeValue?:string; buyPrice:string; qty:number; year:number; image:string; setTotal:number; number:string; rarity:string; edition:string; variant:string;
  }>({name:'',set:'',setId:'',type:'fire',lang:'FR',condition:'Near Mint',graded:false,gradeCompany:'PSA',gradeValue:'',buyPrice:'',qty:1,year:new Date().getFullYear(),image:'',setTotal:0,number:'',rarity:'',edition:'Unlimited',variant:'Normal'})
  const [toast, setToast] = useState<{msg:string;undo?:()=>void}|null>(null)
  const [importOpen,   setImportOpen]   = useState(false)
  const [cardPickOpen,   setCardPickOpen]   = useState(false)
  const [sealedPickOpen, setSealedPickOpen] = useState(false)
  const [sealedSeed,     setSealedSeed]     = useState<SealedSeed | null>(null)
  const [addSetOpen,   setAddSetOpen]   = useState(false)
  const [addSetLang,   setAddSetLang]   = useState<'FR'|'EN'|'JP'>('FR')
  const [addSetId,     setAddSetId]     = useState('')
  const [addSetName,   setAddSetName]   = useState('')
  const [addSetCards,  setAddSetCards]  = useState<TCGCard[]>([])
  const [addSetLoading,setAddSetLoading]= useState(false)
  const [addSetSets,   setAddSetSets]   = useState<TCGSet[]>([])
  const [uploadCardId, setUploadCardId] = useState<string|null>(null)
  const ghostClickRef = useRef(false)
  const masterGlitterRef = useRef<HTMLDivElement|null>(null)
  const [scannerOpen,  setScannerOpen]  = useState(false)
  const [scannerSoonOpen, setScannerSoonOpen] = useState(false)
  // ── Prix via hook centralisé useCardPrices ──
  const portfolioSetIds = useMemo(
    () => Array.from(new Set(portfolio.map(c => c.setId).filter(Boolean) as string[])),
    // Cle stable : ne recalcule QUE si la liste des setIds change (pas a chaque
    // setPortfolio qui modifie les prix) -> evite le re-fetch en boucle / compteur qui danse
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Array.from(new Set(portfolio.map(c => c.setId).filter(Boolean) as string[])).sort().join(',')]
  )
  const {
    priceDetails,
    priceMap,
    setMapping: hookSetMapping,
    loading: pricesLoading,
  } = useCardPrices(portfolioLoaded && portfolio.length > 0 ? portfolioSetIds : null, { byName: true })

  // Keep a ref to the mapping for legacy synchronous lookups in getPrice()
  const setMappingRef = useRef<Record<string, string>>({})
  useEffect(() => { setMappingRef.current = hookSetMapping }, [hookSetMapping])

  // Prix par etat: gere par la modale Spotlight (SpotlightStates <- price_matrix Kodo).
  // Ancien useCardConditions (prices_v2_by_condition legacy) retire: recompute client desactive.

  // Pricing assure par Kodo Engine (cron portfolio-prices + priceCards a l'ajout).
  // Ancien appel /api/prices/refresh (PokeTrace -> prices_snapshots legacy) supprime:
  // il renvoyait 401 (CRON_SECRET requis) et le pricing Kodo le rend inutile.

  // Update curPrice on portfolio cards once prices are loaded
  const curPriceApplied = useRef<string | false>(false)
  useEffect(() => {
    // Kodo Engine: le cron portfolio-prices fait foi sur curPrice (serveur).
    // Recompute client desactive (moteur fige + bug variant = prix faux).
    return
    // eslint-disable-next-line no-unreachable
    if (pricesLoading || Object.keys(priceMap).length === 0) return
    const portfolioKey = portfolio.map(c => c.name).sort().join(',')
    if (curPriceApplied.current === portfolioKey) return
    curPriceApplied.current = portfolioKey as any

    const USD_TO_EUR = 0.92
    setPortfolio(prev => prev.map(c => {
      const sid = c.setId || ''
      const slug = hookSetMapping[sid] || hookSetMapping[sid.replace(/-shadowless(-ns)?|-1st/g, '')] || ''
      const varHint = sid.includes('-1st') || sid.includes('-shadowless-ns')
        ? '1st_Edition_Holofoil'
        : (sid.includes('-shadowless') && !sid.includes('-shadowless-ns')) ? 'Unlimited_Holofoil' : null
      const varKey = varHint ? slug + '|' + varHint + '|' + c.number : ''
      const slugKey = slug + '|' + c.number
      const nameKey = String(c.name ?? '').toLowerCase()
      let priceUSD = (varKey && priceMap[varKey]?.top) || priceMap[slugKey]?.top || priceMap[nameKey]?.top
      // 1st Edition: floor against Shadowless and check 1st-Ed eBay variant key
      if ((sid.includes('-1st') || sid.includes('-shadowless-ns')) && slug) {
        const shadowlessKey = slug + '|Unlimited_Holofoil|' + c.number
        const shadowlessPrice = priceMap[shadowlessKey]?.top
        const ebayVarKey = slug + '|1st_Edition_Holofoil|' + c.number
        const allPrices = [priceUSD, priceMap[ebayVarKey]?.top, shadowlessPrice].filter(Boolean) as number[]
        if (allPrices.length) priceUSD = Math.max(...allPrices)
      }
      // Prefer weighted estimate from priceDetails when available
      const detKey = slug + '|' + (varHint || '') + '|' + c.number
      const det = priceDetails[detKey]
      let priceEUR: number | null = null
      if (det?.estimated) {
        priceEUR = det.estimated
      } else if (priceUSD) {
        priceEUR = Math.round(priceUSD * USD_TO_EUR * 100) / 100
      } else if (det) {
        const srcs = [det.ebay, det.tcg, det.cardmarket].filter(Boolean) as number[]
        if (srcs.length) priceEUR = Math.round((srcs.reduce((a, b) => a + b, 0) / srcs.length) * 100) / 100
      }
      // Cron owns curPrice : le serveur (vue PPT) fait foi quand il a un prix.
      // Le moteur client ne comble que les trous (FR hors PPT, variantes).
      if (c.serverPriced) return c
      if (priceEUR && priceEUR !== c.curPrice) return { ...c, curPrice: priceEUR }
      return c
    }))
  }, [pricesLoading, priceMap, priceDetails, portfolio.length])

  const getPrice = (card: { name: string; set: string; number: string; setId?: string }): number | null => {
    const USD_TO_EUR = 0.92
    const sid = (card as any).setId || ''
    const slug = setMappingRef.current[sid] || setMappingRef.current[sid.replace(/-shadowless(-ns)?|-1st/g,'')] || ''
    const varHint = sid.includes('-1st') || sid.includes('-shadowless-ns') ? '1st_Edition_Holofoil' : (sid.includes('-shadowless') && !sid.includes('-shadowless-ns')) ? 'Unlimited_Holofoil' : null
    // Priority 1: weighted average from priceDetails
    const varH = varHint || ''
    const detKey = (setMappingRef.current[sid] || setMappingRef.current[sid.replace(/-shadowless(-ns)?|-1st/g,'')] || '') + '|' + varH + '|' + card.number
    const det = priceDetails[detKey]
    if (det?.estimated) {
      let est = det.estimated
      // 1st Edition floor: must be >= Shadowless
      if ((sid.includes('-1st') || sid.includes('-shadowless-ns')) && slug) {
        const shadowDk = slug + '|Unlimited_Holofoil|' + card.number
        const shadowEst = priceDetails[shadowDk]?.estimated
        if (shadowEst && est < shadowEst) est = shadowEst
      }
      return est
    }
    let priceUSD: number | null = null
    // Try variant match
    if (varHint && slug) {
      const varKey = slug + '|' + varHint + '|' + card.number
      if (priceMap[varKey]?.top) priceUSD = priceMap[varKey].top!
    }
    // Try slug+number
    if (!priceUSD && slug) {
      const slugKey = slug + '|' + card.number
      if (priceMap[slugKey]?.top) priceUSD = priceMap[slugKey].top!
    }
    // Fallback by name
    if (!priceUSD) {
      const nameKey = String(card.name ?? '').toLowerCase()
      if (priceMap[nameKey]?.top) priceUSD = priceMap[nameKey].top!
    }
    // 1st Edition floor
    if ((sid.includes('-1st') || sid.includes('-shadowless-ns')) && slug) {
      const shadowlessKey = slug + '|Unlimited_Holofoil|' + card.number
      const ebayKey = slug + '|1st_Edition_Holofoil|' + card.number
      const all = [priceUSD, priceMap[shadowlessKey]?.top, priceMap[ebayKey]?.top].filter(Boolean) as number[]
      if (all.length) priceUSD = Math.max(...all)
    }
    return priceUSD ? Math.round(priceUSD * USD_TO_EUR * 100) / 100 : null
  }

  const [fullSetCards, setFullSetCards] = useState<TCGCard[]>([])

  const [fullSetLoading, setFullSetLoading] = useState(false)
  const [shelfSetCards, setShelfSetCards] = useState<Record<string, TCGCard[]>>({})
  const [setLogos, setSetLogos] = useState<Record<string, string>>({})
  const [setBlocks, setSetBlocks] = useState<Record<string, string>>({})
  const [scannerLoad,  setScannerLoad]  = useState(false)
  const [scannerImg,   setScannerImg]   = useState<string|null>(null)
  const [showWelcome,  setShowWelcome]  = useState(false)
  const [welcomeCards, setWelcomeCards] = useState<{name:string;lang:string;setId:string;localId:string}[]>([])
  const toastRef = useRef<ReturnType<typeof setTimeout>|null>(null)
  const pendingDelete = useRef<{card:CardItem;index:number;timer:ReturnType<typeof setTimeout>}|null>(null)
  const scrollRefs = useRef<Record<string, HTMLDivElement|null>>({})
  const [scrollPcts, setScrollPcts] = useState<Record<string, number>>({})
  const handleShelfScroll = (setName: string, e: React.UIEvent<HTMLDivElement>) => {
    const t = e.currentTarget
    const max = t.scrollWidth - t.clientWidth
    setScrollPcts(p => ({ ...p, [setName]: max > 0 ? t.scrollLeft / max : 0 }))
  }
  const handleMinimapClick = (setName: string, totalCards: number, e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRefs.current[setName]
    if (!el) return
    const r = e.currentTarget.getBoundingClientRect()
    const clickFrac = (e.clientX - r.left) / r.width
    const viewFrac = Math.min(1, 7 / Math.max(totalCards, 1))
    const targetFrac = Math.max(0, Math.min(1, clickFrac - viewFrac / 2))
    el.scrollTo({ left: targetFrac * (el.scrollWidth - el.clientWidth), behavior: 'smooth' })
  }

  const deletedIds = useRef<Set<string>>(new Set())
  // Signature des champs user-edites : seuls leurs changements declenchent un UPDATE.
  // curPrice exclu volontairement (le cron portfolio-prices gere les prix serveur).
  const lastSynced = useRef<Map<string,string>>(new Map())
  const syncSig = (c: CardItem) => [c.qty, c.buyPrice, c.favorite?1:0, c.condition, c.graded?1:0, cleanImageUrl(c.image)||''].join('|')
  const saveTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
  useEffect(()=>{
    if (!portfolioLoaded || authLoading) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      // Save to local only if NOT logged in (avoid ghost data)
      if (!user) {
        dbSet('portfolio', portfolio)
        try {
          const slim = portfolio.map(c => c.image && c.image.startsWith('data:') ? { ...c, image: '' } : c)
          localStorage.setItem('pka_portfolio', JSON.stringify(slim))
        } catch {}
      }
      // Sync new local cards to Supabase if logged in
      if (user) {
        const localOnly = portfolio.filter(c => c.id.startsWith('u'))
        if (localOnly.length > 0) {
          const toInsert = localOnly.map(c => ({
            user_id: user.id, name: c.name, set_name: c.set || null,
            set_id: (c.setId || '').replace(/^(fr|en|jp)-/, '') || null, card_number: c.number || null,
            lang: c.lang || 'FR', rarity: c.rarity || null, card_type: c.type || null,
            condition: c.condition || 'NM', graded: c.graded || false,
            qty: c.qty || 1, buy_price: c.buyPrice || null,
            current_price: c.curPrice || null, image_url: c.image || null,
            is_favorite: c.favorite || false,
          }))
          supabase.from('portfolio_cards').insert(toInsert).select().then(({ data }) => {
            if (data) {
              setPortfolio(prev => {
                const next = [...prev]
                data.forEach((row: any, i: number) => {
                  const idx = next.findIndex(c => c.id === localOnly[i]?.id)
                  if (idx >= 0) next[idx] = {
                    ...next[idx],
                    id: row.id,
                    curPrice: Number(row.current_price) || next[idx].curPrice || 0,
                    serverPriced: Number(row.current_price) > 0,
                    priceBasis: row.price_basis || next[idx].priceBasis,
                  }
                })
                return next
              })
            }
          })
        }
        // Update UNIQUEMENT les cartes dont les champs user-edites ont change
        const existing = portfolio.filter(c => !c.id.startsWith('u') && !deletedIds.current.has(c.id))
        existing.forEach(card => {
          const sig = syncSig(card)
          const prev = lastSynced.current.get(card.id)
          lastSynced.current.set(card.id, sig)
          // jamais vue = vient d'etre chargee/inseree (deja a jour en base) ; identique = rien a pousser
          if (prev === undefined || prev === sig) return
          supabase.from('portfolio_cards').update({
            qty: card.qty, buy_price: card.buyPrice || null,
            is_favorite: card.favorite || false,
            condition: normalizeCondition(card.condition), graded: card.graded || false,
            image_url: cleanImageUrl(card.image) || null, updated_at: new Date().toISOString(),
          }).eq('id', card.id)
        })
      }
    }, 500)
  }, [portfolio, portfolioLoaded, user?.id])
  useEffect(() => {
    if (user) return
    dbGet<CardItem[]>('showcase').then(data => {
      if (data && data.length > 0) setLocalShowcase(data)
    })
  }, [user?.id])
  useEffect(()=>{
    if (user) return
    dbSet('showcase', localShowcase)
    try { const slim = localShowcase.map(c => c.image && c.image.startsWith('data:') ? { ...c, image: '' } : c); localStorage.setItem('pka_showcase', JSON.stringify(slim)) } catch {}
  }, [localShowcase, user?.id])
  useEffect(()=>{ try { localStorage.setItem('pka_collapsed', JSON.stringify([...collapsedSets])) } catch {} }, [collapsedSets])
  useEffect(()=>{ try { localStorage.setItem('pka_set_order', JSON.stringify(setOrder)) } catch {} }, [setOrder])

  // ── FR sets reference (pour traduction JP) ──
  useEffect(() => {
    fetchSets('FR').then(sets => {
      const map: Record<string,string> = {}
      sets.forEach(set => { if(set.id) map[set.id] = set.name })
      setFrSetsMap(map)
    }).catch(() => {})
  }, [])

  // ── Welcome first visit ──
  useEffect(()=>{
    if(!localStorage.getItem('pka_binder_seen')){
      setShowWelcome(true)
      localStorage.setItem('pka_binder_seen','1')
    }
  },[])

  // ── Cartes vitrine bienvenue : simple fetch (images R2 garanties) ──
  useEffect(()=>{
    if(!showWelcome) return
    let cancelled = false
    fetch('/api/portfolio/welcome-cards',{ cache:'no-store' })
      .then(r=>r.ok?r.json():{cards:[]})
      .then(j=>{ if(!cancelled) setWelcomeCards((j.cards??[]).slice(0,3)) })
      .catch(()=>{})
    return ()=>{ cancelled = true }
  },[showWelcome])

  // ── Totaux TCGDex — cache localStorage instantané ──
  useEffect(()=>{
    if(portfolio.length===0) return
    const cacheKey='pka_set_totals'
    const cached=localStorage.getItem(cacheKey)
    if(cached){ try{ setSetTotalsMap(JSON.parse(cached)) }catch(e){} }
    const langs=[...new Set(portfolio.map(c=>c.lang||'FR'))] as ('EN'|'FR'|'JP')[]
    langs.forEach(async lang=>{
      try {
        // Load from local JSON first (includes editions)
        const localRes = await fetch('/data/sets-' + lang + '.json')
        if (localRes.ok) {
          const localSets = await localRes.json()
          setSetTotalsMap(prev=>{
            const next={...prev}
            localSets.forEach((set: any)=>{ if(set.total&&set.id){ next[set.id]=set.total; next[set.name]=set.total; next[set.name.toLowerCase()]=set.total } })
            try{ localStorage.setItem(cacheKey,JSON.stringify(next)) }catch(e){}
            return next
          })
        }
      } catch(e){}
    })
  },[portfolio.length])

  // ── Card from Encyclopedie ──
  useEffect(() => {
    const raw = localStorage.getItem('pka_add_card')
    if (!raw) return
    try {
      const c = JSON.parse(raw)
      localStorage.removeItem('pka_add_card')
      const typeMap: Record<string,string> = {
        Fire:'fire',Water:'water',Psychic:'psychic',Darkness:'dark',
        Lightning:'electric',Grass:'grass',Colorless:'normal',Fighting:'fighting',Metal:'metal',Dragon:'dragon',
      }
      setAddForm({
        name:c.name??'', set:c.set??'', setId:c.setId??'',
        type:typeMap[c.type]??'fire',
        lang:(c.lang==='JP'?'JP':c.lang==='FR'?'FR':'EN') as 'EN'|'JP'|'FR',
        condition:'Near Mint', graded:false, buyPrice:'', qty:1,
        year:c.year??new Date().getFullYear(),
        image:c.image??'', setTotal:c.setTotal??0,
        number:c.number??'', rarity:c.rarity??'', edition:c.edition??'Unlimited', variant:c.variant??'Normal',
      })
      setAddOpen(true)
    } catch {}
  }, [])

  // ── Live TCG data ──
  const [frSetsMap,   setFrSetsMap]   = useState<Record<string,string>>({})
  const [liveSets,    setLiveSets]    = useState<TCGSet[]>([])
  const [liveCards,   setLiveCards]   = useState<TCGCard[]>([])
  const [setsLoading, setSetsLoading] = useState(false)
  const [cardsLoading,setCardsLoading]= useState(false)
  const [frCardsMap,  setFrCardsMap]  = useState<Record<string,string>>({})

  useEffect(() => {
    setSetsLoading(true)
    setLiveSets([])
    fetch('/data/sets-' + addForm.lang + '.json')
      .then(r => r.json())
      .then(sets => {
        const mapped = sets.map((s: any) => ({ id: s.id, name: s.name, cardCount: s.total }))
        setLiveSets(mapped)
        setSetsLoading(false)
      })
      .catch(() => {
        // Fallback TCGDex
        fetchSets(addForm.lang).then(sets => { setLiveSets(sets); setSetsLoading(false) }).catch(() => setSetsLoading(false))
      })
    // Re-fetch cartes si un set est déjà sélectionné
    if (addForm.setId) {
      setCardsLoading(true)
      setLiveCards([])
      setAddSuggs([])
      if(!ghostClickRef.current) setAddForm(p=>({...p, name:''}))
      ghostClickRef.current = false
      getCardsForSet(addForm.lang as 'EN'|'FR'|'JP', addForm.setId)
        .then(cards => { setLiveCards(staticToTCGCards(cards, addForm.setId, addForm.lang, (l,si,lid) => getCardImageUrl({lang:l,setId:si,localId:lid})) as any); setCardsLoading(false) })
        .catch(() => setCardsLoading(false))
    }
  }, [addForm.lang])

  // -- Backfill missing rarity from static data + API fallback --
  const rarityBackfilled = useRef(false)
  const rarityTriedIds = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (rarityBackfilled.current) return
    const needsFix = portfolio.filter(c => !c.rarity && c.setId && c.number && c.number !== '???' && !rarityTriedIds.current.has(c.id))
    if (needsFix.length === 0) return
    rarityBackfilled.current = true
    const doBackfill = async () => {
      const langs = [...new Set(needsFix.map(c => c.lang === 'JP' ? 'JP' : c.lang === 'EN' ? 'EN' : 'FR'))]
      const staticCards: Record<string, Record<string, {r:string|null}[]>> = {}
      for (const lang of langs) {
        try {
          const res = await fetch('/data/cards-' + lang + '.json')
          if (res.ok) staticCards[lang] = await res.json()
        } catch {}
      }
      const updates: Record<string, string> = {}
      for (const card of needsFix) {
        rarityTriedIds.current.add(card.id)
        const lang = card.lang === 'JP' ? 'JP' : card.lang === 'EN' ? 'EN' : 'FR'
        const setCards = card.setId ? staticCards[lang]?.[card.setId as string] : undefined
        if (setCards) {
          const match = setCards.find((c: any) => c.lid === card.number || c.id === card.setId + '-' + card.number)
          if (match?.r) { updates[card.id] = match.r; continue }
        }
        // Fallback API (rarete uniquement) pour les cartes pas dans le dump.
        // TCGdex ne connait QUE les ids canoniques (base1-9). Nos ids Kodo a suffixe
        // d'edition vintage WotC (base1-shadowless-ns-* = 1st Ed, base1-shadowless-* =
        // Shadowless) et le catalogue JP (jp-*, migre sur PPT) n'existent pas chez TCGdex
        // -> 404 garanti. On normalise l'id (strip suffixes edition) et on skip ce que
        // TCGdex ne resoudra jamais. Prix + images viennent de Kodo/R2, ce fetch ne
        // touche QUE la rarete cosmetique.
        const sid = String(card.setId)
        const isJp = lang === 'JP' || sid.startsWith('jp-')
        const isVintageSuffixed = /-shadowless(-ns)?$|-1st$/i.test(sid)
        if (!isJp && !isVintageSuffixed) {
          try {
            const cleanSetId = sid.replace(/-shadowless(-ns)?$|-1st$/i, '')
            const detail = await fetchCardDetail(lang, cleanSetId + '-' + card.number)
            if (detail?.rarity) updates[card.id] = detail.rarity
          } catch {}
        }
      }
      if (Object.keys(updates).length > 0) {
        setPortfolio(prev => prev.map(c => updates[c.id] ? { ...c, rarity: updates[c.id] } : c))
      }
      // NE PAS rearmer rarityBackfilled : un seul passage par session.
      // Les cartes tentees sont dans rarityTriedIds (pas de re-fetch des echecs).
    }
    doBackfill()
  }, [portfolio.length])

  // -- Backfill missing images from static data (FR+EN+JP) --
  const imgBackfilled = useRef(false)
  useEffect(() => {
    if (imgBackfilled.current) return
    const needsImg = portfolio.filter(c => !c.image && c.setId && c.number && c.number !== '???')
    if (needsImg.length === 0) return
    imgBackfilled.current = true
    const doImgBackfill = async () => {
      // Charger les 3 langues pour maximiser la couverture
      const allStatic: Record<string, Record<string, any[]>> = {}
      for (const lang of ['FR', 'EN', 'JP']) {
        try {
          const res = await fetch('/data/cards-' + lang + '.json')
          if (res.ok) allStatic[lang] = await res.json()
        } catch {}
      }
      const updates: Record<string, string> = {}
      for (const card of needsImg) {
        const lang = card.lang === 'JP' ? 'JP' : card.lang === 'EN' ? 'EN' : 'FR'
        const apiLang = card.lang === 'JP' ? 'ja' : card.lang === 'EN' ? 'en' : 'fr'
        const sid = card.setId as string
        if (!sid) continue
        // 1. Chercher dans la langue de la carte
        const match1 = allStatic[lang]?.[sid]?.find((c: any) => c.lid === card.number)
        if (match1?.img) { updates[card.id] = match1.img; continue }
        // 2. Chercher dans EN (meilleure couverture)
        if (lang !== 'EN') {
          const match2 = allStatic['EN']?.[sid]?.find((c: any) => c.lid === card.number)
          if (match2?.img) { updates[card.id] = match2.img; continue }
        }
        // 3. Chercher dans FR comme fallback
        if (lang !== 'FR') {
          const match3 = allStatic['FR']?.[sid]?.find((c: any) => c.lid === card.number)
          if (match3?.img) { updates[card.id] = match3.img; continue }
        }
        // 4. Construire URL directement (pas de HEAD — le onError gere)
        updates[card.id] = getCardImageUrl({ lang: card.lang, setId: sid, localId: card.number })
      }
      if (Object.keys(updates).length > 0) {
        setPortfolio(prev => prev.map(c => updates[c.id] ? { ...c, image: updates[c.id] } : c))
      }
      imgBackfilled.current = false
    }
    doImgBackfill()
  }, [portfolio.length])
  // -- Logos de set : lus dans NOS JSON statiques (k_sets.logo_url), plus
  // aucun appel TCGdex depuis le navigateur. Les variantes Ed1/Shadowless
  // heritent du logo parent DEJA en base (neo4-1st porte le logo de neo4).
  useEffect(() => {
    if (!portfolio.length) return
    let dead = false
    ;(async () => {
      // liveSets n'est peuple qu'a l'ouverture du formulaire d'ajout -> on lit
      // NOS index directement (une fois par langue, caches par le navigateur).
      const langs = [...new Set(portfolio.map(c => (c.lang === 'EN' ? 'EN' : c.lang === 'JP' ? 'JP' : 'FR')))]
      const idx: Record<string, { id:string; name:string; logo?:string|null; serie?:string|null }> = {}
      const byName: Record<string, { id:string; name:string; logo?:string|null; serie?:string|null }> = {}
      for (const L of langs) {
        try {
          const r = await fetch('/data/sets-' + L + '.json')
          if (!r.ok) continue
          const j = await r.json()
          for (const st of j) { idx[st.id] = st; byName[st.name] = st }
        } catch {}
      }
      if (dead) return
      const logos: Record<string,string> = {}
      const blocks: Record<string,string> = {}
      for (const setName of [...new Set(portfolio.map(c => c.set))]) {
        const sc = portfolio.filter(c => c.set === setName)
        const sid = String(sc.find(c => c.setId)?.setId || '')
        const bare = sid.replace(/^(fr-|en-|jp-)/, '')
        const parent = bare.replace(/-1st$|-shadowless$|-shadowless-ns$/, '')
        const hit = idx[bare] || idx[parent] || byName[String(setName)]
        if (hit?.logo) logos[setName] = hit.logo
        if (hit?.serie) blocks[setName] = hit.serie
      }
      if (Object.keys(logos).length) setSetLogos(prev => ({ ...logos, ...prev }))
      if (Object.keys(blocks).length) setSetBlocks(prev => ({ ...blocks, ...prev }))
    })()
    return () => { dead = true }
  }, [portfolio.length])

  // -- Fetch shelf ghost cards pour chaque set visible --
  useEffect(() => {
    if (binderSet && binderSet !== '__all__') return
    const sets = [...new Set(portfolio.map(c => c.set))]
    sets.forEach(setName => {
      if (shelfSetCards[setName]) return
      const sc = portfolio.filter(c => c.set === setName)
      const sid = sc.find(c => c.setId)?.setId || liveSets.find(ls => ls.name === setName)?.id || liveSets.find(ls => ls.name.toLowerCase() === String(setName ?? '').toLowerCase())?.id || ''
      if (!sid) return
      const lang = sc[0]?.lang || 'FR'
      getCardsForSet(lang as 'EN'|'FR'|'JP', sid)
          .then(cards => {
            const mapped = staticToTCGCards(cards, sid, lang, (l,s,lid) => getCardImageUrl({lang:l,setId:s,localId:lid}))
            setShelfSetCards(prev => ({ ...prev, [setName]: mapped as any }))
          })
          .catch(() => {})
    })
  }, [portfolio.length, liveSets.length, binderSet])

  // -- Fetch full set cards quand on entre dans un set --
  useEffect(() => {
    if (!binderSet || binderSet === '__all__') { setFullSetCards([]); return }
    const sc = portfolio.filter(c => c.set === binderSet)
    const sid = sc.find(c => c.setId)?.setId || liveSets.find(ls => ls.name === binderSet)?.id || liveSets.find(ls => ls.name.toLowerCase() === String(binderSet ?? '').toLowerCase())?.id || ''
    if (!sid) { setFullSetCards([]); return }
    const lang = sc[0]?.lang || 'FR'
    setFullSetLoading(true)
    getCardsForSet(lang as 'EN'|'FR'|'JP', sid)
      .then(cards => {
        const mapped = staticToTCGCards(cards, sid, lang, (l,s,lid) => getCardImageUrl({lang:l,setId:s,localId:lid}))
        setFullSetCards(mapped as any)
        setFullSetLoading(false)
      })
      .catch(() => setFullSetLoading(false))
  }, [binderSet])

  // -- Glitter: IntersectionObserver (perf) --
  const glitterObsRef = useRef<IntersectionObserver|null>(null)
  useEffect(() => {
    const fillGlitter = (el: Element, count: number) => {
      if (el.childNodes.length > 0) return
      const anims = ['gl1','gl2','gl3','gl4']
      for (let i = 0; i < count; i++) {
        const d = document.createElement('div')
        const sz = Math.random() > .6 ? 2 : 1
        const top = (count > 100 ? -2 + Math.random() * 12 : -1 + Math.random() * 18).toFixed(0)
        const left = (Math.random() * 99).toFixed(1)
        const delay = (Math.random() * 4).toFixed(2)
        d.style.cssText = `position:absolute;top:${top}px;left:${left}%;width:${sz}px;height:${sz}px;border-radius:50%;background:#fff;animation:${anims[i%4]} 4s ${delay}s linear infinite;transform:translateZ(0);backface-visibility:hidden`
        el.appendChild(d)
      }
    }
    const pauseGlitter = (el: Element) => {
      (el as HTMLElement).style.display = 'none'
    }
    const resumeGlitter = (el: Element, count: number) => {
      fillGlitter(el, count)
      ;(el as HTMLElement).style.display = ''
    }
    if (glitterObsRef.current) glitterObsRef.current.disconnect()
    glitterObsRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el = entry.target
        const count = el.classList.contains('master-glitter-container') ? 500 : 40
        if (entry.isIntersecting) {
          resumeGlitter(el, count)
        } else {
          pauseGlitter(el)
        }
      })
    }, { rootMargin: '200px' })
    const obs = glitterObsRef.current
    document.querySelectorAll('.master-glitter-container, .badge-glitter-container').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  })

  // -- Fetch sets pour modal ajouter serie --
  // Source : /data/sets-{lang}.json (enrichi avec variantes 1st Ed/Shadowless)
  // Fallback : TCGdex API live si le JSON local n'existe pas
  useEffect(() => {
    if (!addSetOpen) return
    fetch('/data/sets-' + addSetLang + '.json')
      .then(r => r.ok ? r.json() : Promise.reject('no local json'))
      .then((arr: any[]) => {
        const mapped: TCGSet[] = arr.map(s => ({
          id: s.id,
          name: s.name,
          lang: addSetLang,
          total: s.total,
          releaseDate: s.releaseDate || undefined,
        }))
        setAddSetSets(mapped)
      })
      .catch(() => {
        // Fallback TCGdex live
        fetchSets(addSetLang).then(sets => setAddSetSets(sets)).catch(() => {})
      })
  }, [addSetOpen, addSetLang])

  const mmDrag = useRef<{active:boolean;setN:string;total:number}>({active:false,setN:'',total:0})
  const mmSyncScroll = (setName:string, total:number, clientX:number, mmEl:HTMLElement) => {
    const el = scrollRefs.current[setName]
    if(!el) return
    const r = mmEl.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    const maxScroll = el.scrollWidth - el.clientWidth
    if(maxScroll <= 0) return
    el.scrollTo({ left: frac * maxScroll })
    setScrollPcts(p => ({ ...p, [setName]: frac }))
  }
  const mmDown = (setName:string, total:number, e:React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    mmDrag.current = {active:true, setN:setName, total}
    mmSyncScroll(setName, total, e.clientX, e.currentTarget)
    const mm = e.currentTarget
    const onMove = (ev:MouseEvent) => { if(mmDrag.current.active) mmSyncScroll(setName, total, ev.clientX, mm) }
    const onUp = () => { mmDrag.current.active=false; window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Drag-to-scroll shelf ──
  const shelfDrag = useRef<{active:boolean;dragging:boolean;startX:number;scrollLeft:number;el:HTMLElement|null;lastX:number;lastT:number;vx:number}>({active:false,dragging:false,startX:0,scrollLeft:0,el:null,lastX:0,lastT:0,vx:0})
  const onShelfMouseDown = (e:React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    shelfDrag.current = { active:true, dragging:false, startX:e.clientX, scrollLeft:el.scrollLeft, el, lastX:e.clientX, lastT:Date.now(), vx:0 }
    const onMove = (ev:MouseEvent) => {
      if (!shelfDrag.current.active) return
      const dx = ev.clientX - shelfDrag.current.startX
      if (!shelfDrag.current.dragging && Math.abs(dx) < 5) return
      if (!shelfDrag.current.dragging) {
        shelfDrag.current.dragging = true
        el.style.cursor = 'grabbing'
        el.style.userSelect = 'none'
      }
      const now = Date.now()
      const dt = now - shelfDrag.current.lastT
      if (dt > 0) shelfDrag.current.vx = (ev.clientX - shelfDrag.current.lastX) / dt * 16
      shelfDrag.current.lastX = ev.clientX
      shelfDrag.current.lastT = now
      el.scrollLeft = shelfDrag.current.scrollLeft - dx
    }
    const onUp = () => {
      const wasDragging = shelfDrag.current.dragging
      const vx = shelfDrag.current.vx
      shelfDrag.current.active = false
      shelfDrag.current.dragging = false
      el.style.cursor = ''
      el.style.userSelect = ''
      if (wasDragging && Math.abs(vx) > 1) {
        let momentum = -vx * 2.5
        const decay = () => {
          if (Math.abs(momentum) < 0.3) return
          el.scrollLeft += momentum
          momentum *= 0.94
          requestAnimationFrame(decay)
        }
        requestAnimationFrame(decay)
      }
      if (wasDragging) {
        const block = (ev:MouseEvent) => { ev.stopPropagation(); ev.preventDefault() }
        el.addEventListener('click', block, { capture:true, once:true })
      }
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  const wallPick = useMemo(() => makeWallPick(portfolioCards.length), [portfolioCards.length])

  const totalBuy  = portfolio.reduce((s,c)=>s+c.buyPrice*c.qty,0)
  const totalCur  = portfolio.reduce((s,c)=>s+c.curPrice*c.qty,0)
  // Taux de couverture : une valeur totale partielle DOIT dire qu elle l est.
  // Compte en EXEMPLAIRES (20 NM cotes + 1 commune sans cote = 95%, pas 50%) :
  // c est ce qui reflete la collection reelle, pas un decompte de lignes.
  const coverage = (() => {
    // Les communes et peu communes sont EXCLUES du denominateur : elles ne
    // valent objectivement rien (8,5% de couverture sur 10 400 cartes au
    // catalogue FR) et personne n attend une cote dessus. Les compter ferait
    // afficher "9% de ta collection cotée" a quelqu un dont toutes les cartes
    // de valeur sont pourtant cotees.
    // Les raretes du portfolio sont tantot FR tantot EN selon la porte
    // d ecriture (sonde: "Uncommon", "Double Rare" cotoient "Rare").
    // Une rarete NULL n est PAS exclue : on ne sait pas ce que c est,
    // et l ecarter fausserait le taux dans l autre sens.
    const sansInteret = (r?: string | null) =>
      !!r && /^(commune?|peu commune|common|uncommon|sans raret)/i.test(String(r).trim())
    let cotes = 0, tot = 0
    for (const c of portfolio) {
      if (sansInteret((c as any).rarity)) continue
      const q = Number(c.qty) || 1
      tot += q
      if (Number(c.curPrice) > 0) cotes += q
    }
    return { cotes, tot, pct: tot ? Math.round((cotes / tot) * 100) : 100 }
  })()
  // Nombre d'EXEMPLAIRES (somme des qty), pas de lignes : une carte x20 = 20.
  const totalQty  = portfolio.reduce((s,c)=>s+(c.qty||1),0)
  const totalGain = totalCur-totalBuy
  const totalROI  = totalBuy>0?Math.round((totalGain/totalBuy)*100):0

  // Compteur isolé dans <AnimatedTotal/> (animation confinée, ne re-rend pas tout Holdings)
  const valuePulse: false | 'up' | 'down' = false
  const bestCard  = portfolioCards.length>0?[...portfolioCards].sort((a,b)=>((b.curPrice-b.buyPrice)/Math.max(b.buyPrice,1))-((a.curPrice-a.buyPrice)/Math.max(a.buyPrice,1)))[0]:null
  const bestByValue = portfolioCards.length>0?[...portfolioCards].sort((a,b)=>(b.curPrice*b.qty)-(a.curPrice*a.qty))[0]:null
  const eraCount = new Set(portfolio.map(c=>{ const y=c.year||0; if(y&&y<=2002)return 'vintage'; if(y&&y<=2010)return 'classic'; if(y&&y<=2019)return 'modern'; if(y)return 'current'; return 'unknown' }).filter(e=>e!=='unknown')).size
  const slotsPer  = (binderSet&&binderSet!=='__all__') ? 9999 : binderCols*10
  const binderFiltered = (!binderSet || binderSet==='__all__') ? (binderSetFilter==='all' ? portfolio : portfolio.filter(c=>c.set===binderSetFilter)) : portfolio.filter(c=>c.set===binderSet)
  // binderPages moved after gridItems
  const setDateOf = (c:CardItem) => (c.setId&&setDateMap[c.setId])||setDateMap['n:'+String(c.set??'').toLowerCase()]||'9999-99-99'
  const binderSorted = [...binderFiltered].sort((a,b)=>{
    if(binderSort==='recent') return String(b.createdAt??'').localeCompare(String(a.createdAt??''))
    if(binderSort==='series'){ const da=setDateOf(a), db=setDateOf(b); if(da!==db) return da<db?-1:1; const sa=String(a.set??''),sb=String(b.set??''); if(sa!==sb) return sa.localeCompare(sb); return (parseInt(a.number)||999)-(parseInt(b.number)||999) }
    if(binderSort==='number') return (parseInt(a.number)||999)-(parseInt(b.number)||999)
    if(binderSort==='name') return a.name.localeCompare(b.name)
    if(binderSort==='price') return b.curPrice-a.curPrice
    return 0
  })
  const binderFilteredFinal = binderSorted.filter(c=>{
    if(binderFilter==='graded' && !c.graded) return false
    if(binderFilter==='sealed' && !isSealed(c)) return false
    if(binderFilter==='raw' && (c.graded || isSealed(c))) return false
    if(binderSet==='__all__' && binderLangFilter!=='all' && c.lang!==binderLangFilter) return false
    if(setSearch && !String(c.name ?? '').toLowerCase().includes(setSearch.toLowerCase()) && !String(c.set ?? '').toLowerCase().includes(setSearch.toLowerCase())) return false
    return true
  })
  const buildGridItems = (): GridItem[] => {
    if(binderSort!=='number'||!binderSet||binderSet==='__all__'||fullSetCards.length===0||binderFilter!=='all'||setSearch){
      return binderFilteredFinal.map(c=>({type:'owned' as const,card:c}))
    }
    const ownedByNum = new Map<string,CardItem[]>()
    const normNum = (x:any) => String(x ?? '').trim().replace(/^0+/, '') || '0'
    binderFiltered.forEach(c=>{ const k=normNum(c.number); if(!ownedByNum.has(k)) ownedByNum.set(k,[]); ownedByNum.get(k)!.push(c) })
    const usedIds = new Set<string>()
    const result: typeof gridItems = []
    fullSetCards.forEach(fc=>{
      const num = fc.localId||''
      const arr = ownedByNum.get(normNum(num))
      if(arr){
        // UNE VIGNETTE PAR EXEMPLAIRE (decision Alon 22/07) : le collectionneur
        // veut voir physiquement ce qu'il a — chaque etat, chaque quantite,
        // chaque gradee separement. L'agregation par carte a ete essayee puis
        // RETIREE : elle masquait 5 exemplaires derriere un seul '×28'.
        arr.forEach(owned=>{
          if(!usedIds.has(owned.id)){
            usedIds.add(owned.id)
            result.push({ type:'owned' as const, card:{ ...owned, image: cleanImageUrl(fc.image) || cleanImageUrl(owned.image) || '' } })
          }
        })
      } else {
        result.push({ type:'ghost' as const, name:fc.name, number:num, image:cleanImageUrl(fc.image)||'', rarity:fc.rarity||'' })
      }
    })
    // Ajouter les cartes owned sans match (numéro manquant dans fullSet)
    binderFiltered.forEach(c=>{ if(!usedIds.has(c.id)) result.push({ type:'owned' as const, card:c }) })
    return result
  }
  const gridItems = buildGridItems()
  const pageItems = gridItems.slice(binderPage*slotsPer,(binderPage+1)*slotsPer)
  const phantomCount = 0
  const binderPages = Math.max(1,Math.ceil(gridItems.length/slotsPer))

  const showToast = (msg:string) => {
    setToast({msg})
    if(toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(()=>setToast(null),2400)
  }
  const toggleFav = (id:string, e:React.MouseEvent) => {
    e.stopPropagation()
    const card = portfolio.find(c=>c.id===id)
    if (!card) return
    const nextFav = !card.favorite
    setPortfolio(prev=>prev.map(c=>c.id===id?{...c,favorite:nextFav}:c))
    if (user && !id.startsWith('u')) {
      supabase.from('portfolio_cards').update({ is_favorite: nextFav }).eq('id', id)
        .then(({ error }: any) => {
          if (error) {
            console.error('[KC FAV] update failed:', error)
            setPortfolio(prev=>prev.map(c=>c.id===id?{...c,favorite:!nextFav}:c))
          }
        })
    }
  }
  // DELETE serveur effectif (appele apres la fenetre d'undo)
  const commitDelete = (card:CardItem) => {
    if (user) {
      if (card.id.startsWith('u')) {
        // Local ID — delete by name + set + user
        supabase.from('portfolio_cards').delete()
          .eq('user_id', user.id).eq('name', card.name).eq('set_name', card.set || '')
          .then(({ error }: any) => {
            if (error) console.error('Delete by name failed:', error)
          })
      } else {
        supabase.from('portfolio_cards').delete().eq('id', card.id)
          .then(({ error }: any) => {
            if (error) console.error('Delete failed:', error)
          })
      }
    }
    if (!user) setLocalShowcase(prev=>prev.filter(c=>c.id!==card.id))
  }
  const removeCard = (card:CardItem, e:React.MouseEvent) => {
    e.stopPropagation()
    // Une suppression deja en attente ? On la valide immediatement
    if (pendingDelete.current) {
      clearTimeout(pendingDelete.current.timer)
      commitDelete(pendingDelete.current.card)
      pendingDelete.current = null
    }
    const index = portfolio.findIndex(c=>c.id===card.id)
    deletedIds.current.add(card.id)
    setPortfolio(prev=>prev.filter(c=>c.id!==card.id))
    const timer = setTimeout(()=>{
      commitDelete(card)
      pendingDelete.current = null
      setToast(t=>t&&t.undo?null:t)
    },5000)
    pendingDelete.current = { card, index, timer }
    if(toastRef.current) clearTimeout(toastRef.current)
    setToast({
      msg: card.name+' retiree',
      undo: () => {
        if (!pendingDelete.current || pendingDelete.current.card.id !== card.id) return
        clearTimeout(pendingDelete.current.timer)
        pendingDelete.current = null
        deletedIds.current.delete(card.id)
        setPortfolio(prev=>{
          if (prev.some(c=>c.id===card.id)) return prev
          const next = [...prev]
          next.splice(Math.min(Math.max(index,0), next.length), 0, card)
          return next
        })
        setToast(null)
      }
    })
  }
  const encyclopediaLookup = (name:string, set:string): Partial<CardItem> => {
    const found = ENCYCLOPEDIA.find(cc=>cc.name.toLowerCase()===name.toLowerCase()&&(set===''||cc.set===set))
    if(found) return { type:found.type, year:found.year, number:found.number, psa:found.psa, curPrice:found.curPrice, signal:found.signal }
    return {}
  }
  const handleSetChange = (id:string, name:string) => {
    setAddForm(p=>({...p, set:name, setId:id, name:''}))
    setAddSuggs([])
    setNameValidated(false)
    setLiveCards([])
    if (id) {
      setCardsLoading(true)
      getCardsForSet(addForm.lang as 'EN'|'FR'|'JP', id)
        .then(cards => { setLiveCards(staticToTCGCards(cards, id, addForm.lang, (l,s,lid) => getCardImageUrl({lang:l,setId:s,localId:lid})) as any); setCardsLoading(false) })
        .catch(() => setCardsLoading(false))
      // Fetch FR cards en parallele pour reference JP
      if (addForm.lang === 'JP') {
        getCardsForSet('FR', id).then(c => staticToTCGCards(c, id, 'FR', (l,si,lid) => getCardImageUrl({lang:l,setId:si,localId:lid})))
          .then(frCards => {
            const map: Record<string,string> = {}
            frCards.forEach((c,i) => { if(c.name) map[c.name] = c.name })
            // Match par localId
            frCards.forEach(c => { if(c.localId && c.name) map['__id__'+c.localId] = c.name })
            setFrCardsMap(map)
          })
          .catch(() => {})
      }
    }
  }
  // Noms des cartes de la serie chargee, tries par numero croissant (dedupe).
  const sortedLiveNames = () => {
    const num = (c:TCGCard) => { const m=String(c.localId??'').match(/[0-9]+/); return m?parseInt(m[0],10):99999 }
    return [...new Set([...liveCards].sort((a,b)=>num(a)-num(b)||String(a.localId??'').localeCompare(String(b.localId??''))).map(c=>c.name))]
  }
  const handleNameInput = (val:string) => {
    setAddForm(p=>({...p,name:val}))
    setNameValidated(false)
    if(val.length<1){ setAddSuggs(liveCards.length>0 ? sortedLiveNames() : []); return }
    if (liveCards.length > 0) {
      const norm=(x:string)=>x.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g,'')
      const q=norm(val)
      setAddSuggs(sortedLiveNames().filter(n=>norm(n).startsWith(q)))
    } else if (!addForm.setId) {
      // Fallback ENCYCLOPEDIA seulement si aucun set sélectionné
      const pool = addForm.set?ENCYCLOPEDIA.filter(cc=>cc.set===addForm.set):ENCYCLOPEDIA
      const matches = pool.filter(cc=>cc.name.toLowerCase().includes(val.toLowerCase())).map(cc=>cc.name)
      setAddSuggs([...new Set(matches)].slice(0,6))
    }
  }
  const handleSuggSelect = (name:string) => {
    // Validation SYNCHRONE: tout ce qui est dispo immédiatement (sans fetch réseau)
    const extra = encyclopediaLookup(name, addForm.set)
    const liveCard = liveCards.find(c=>c.name===name)
    const img = liveCard?.image ?? ''
    const num = liveCard?.localId ?? extra.number ?? ''
    const rar = liveCard?.rarity ?? extra.rarity ?? ''
    setAddForm(p=>({...p, name, type:extra.type??p.type, year:extra.year??p.year, image:img, number:num, rarity:rar}))
    setAddSuggs([])
    setNameValidated(true)
    // Enrichissement async en arrière-plan: fetch rarity si manquante
    // (n'attend pas, ne bloque pas la validation)
    if (!rar && liveCard) {
      const cleanId = liveCard.id.replace(/^(en|fr|jp)-/, '').replace(/-1st(-|$)/, '$1')
      fetchCardDetail(addForm.lang as 'EN'|'FR'|'JP', cleanId)
        .then(detail => {
          const newRarity = detail?.rarity
          if (newRarity) {
            setAddForm(prev => prev.name === name ? {...prev, rarity: newRarity} : prev)
          }
        })
        .catch(() => {})
    }
  }
  const handleConditionChange = (cond:string) => {
    if (cond === '__graded__') {
      const current = addForm.condition
      const keep = (current !== 'Raw' && current !== 'Scelle' && current !== '') ? current : 'PSA 10'
      // Splitte "PSA 10" -> gradeCompany='PSA', gradeValue='10' (colonnes dediees).
      const m = keep.match(/^\s*(PSA|BGS|CGC|SGC|ACE|TAG|CCC|PCA|AOG|GSG|PGS)\s*[_ ]?\s*([0-9]{1,2}(?:\.5)?)/i)
      setAddForm(p=>({...p, graded:true, condition:keep,
        gradeCompany: m ? m[1].toUpperCase() : p.gradeCompany,
        gradeValue: m ? m[2] : p.gradeValue}))
    } else if (cond === 'Raw' || cond === 'Scelle') {
      // 'Raw' = statut (non gradee), PAS un etat. Par defaut on ecrit Near Mint,
      // sinon la carte partait en base avec condition='Raw' -> badge RAW alors
      // que l'UI montrait Near Mint comme selectionne (mensonge d'affichage).
      setAddForm(p=>({...p, condition: cond === 'Raw' ? 'Near Mint' : cond, graded:false, gradeValue:''}))
    } else {
      // Grade choisi explicitement (ex "PSA 10", "CCC 9.5") -> splitte company + note.
      const m = cond.match(/^\s*(PSA|BGS|CGC|SGC|ACE|TAG|CCC|PCA|AOG|GSG|PGS)\s*[_ ]?\s*([0-9]{1,2}(?:\.5)?)/i)
      if (m) {
        setAddForm(p=>({...p, condition:cond, graded:true,
          gradeCompany: m[1].toUpperCase(), gradeValue: m[2]}))
      } else {
        setAddForm(p=>({...p, condition:cond, graded:false, gradeValue:''}))
      }
    }
  }
  // ── Persistance serveur : Neon = source de vérité (cross-device) ──
  const toDbRow = (c: CardItem) => ({
    id: c.id,
    user_id: user!.id,
    name: c.name,
    set_name: c.set || null,
    set_id: (c.setId || '').replace(/^(fr|en|jp)-/, '') || null,
    card_number: c.number || null,
    lang: c.lang || 'FR',
    rarity: c.rarity || null,
    card_type: c.type || null,
    condition: normalizeCondition(c.condition),
    graded: c.graded || false,
    grade_company: c.graded ? (c.gradeCompany || null) : null,
    grade_value: c.graded && c.gradeValue ? c.gradeValue : null,
    qty: c.qty || 1,
    buy_price: c.buyPrice || null,
    current_price: c.curPrice || null,
    image_url: c.image && !c.image.startsWith('data:') ? c.image : null,
    is_favorite: c.favorite || false,
    variant: c.variant || 'Normal',
    edition: c.edition || 'Unlimited',
  })

  // Garde de limite Free centralisee : retourne true si l'ajout de `n` carte(s)
  // depasserait FREE_CARD_LIMIT (et ouvre alors la modale de conversion).
  // Appelee en tete de CHAQUE point d'ajout -> zero ajout optimiste, zero clignotement.
  const guardLimit = (n: number): boolean => {
    if (!isPro && totalQty + n > FREE_CARD_LIMIT) {
      setGate({ current: totalQty, limit: FREE_CARD_LIMIT })
      return true
    }
    return false
  }

  const persistCards = async (cards: CardItem[]): Promise<boolean> => {
    if (!user || cards.length === 0) return true
    const { data: insData, error } = await supabase.from('portfolio_cards').insert(cards.map(toDbRow)).select()
    if (error) {
      // Rollback : la base a refusé, le state ne doit pas mentir
      const ids = new Set(cards.map(c => c.id))
      setPortfolio(prev => prev.filter(c => !ids.has(c.id)))
      const code = (error as any).code
      if (code === 'free_limit') {
        const lim = (error as any).limit ?? 800
        // Ouvre la modale de conversion (au lieu d'un simple toast) : moment cle Free -> Pro.
        setGate({ current: lim, limit: lim })
      } else {
        console.error('[KC PERSIST] insert failed:', error)
        showToast('Erreur de sauvegarde, carte non ajoutée')
      }
      return false
    }
    // Prix calcule a l'insert (meme regle que le cron) -> affichage immediat, toutes langues
    if (insData && insData.length) {
      const byId = new Map((insData as any[]).map((r: any) => [r.id, r]))
      setPortfolio(prev => prev.map(c => {
        const r = byId.get(c.id)
        return r && r.current_price != null
          ? { ...c, curPrice: Number(r.current_price) || 0, serverPriced: Number(r.current_price) > 0, priceBasis: r.price_basis || c.priceBasis }
          : c
      }))
    }
    track('card_added', { count: cards.length })
    return true
  }

  const addCard = () => {
    if(!addForm.name||!addForm.set||!nameValidated) return
    const extra = encyclopediaLookup(addForm.name, addForm.set)
    const bp = parseFloat(addForm.buyPrice)||0
    const liveMatch = liveCards.find(c=>c.name.toLowerCase()===addForm.name.toLowerCase())
    const resolvedImage = addForm.image || liveMatch?.image || ''
    const resolvedNumber = addForm.number || liveMatch?.localId || extra.number || '???'
    const resolvedRarity = addForm.rarity || liveMatch?.rarity || extra.rarity || ''
    const newCard:CardItem = {
      id:crypto.randomUUID(), name:addForm.name, set:addForm.set,
      year:extra.year??addForm.year,
      number:resolvedNumber,
      rarity:resolvedRarity,
      type:addForm.type, lang:addForm.lang,
      condition:addForm.condition, graded:addForm.graded,
      gradeCompany:addForm.graded?addForm.gradeCompany:undefined,
      gradeValue:addForm.graded&&addForm.gradeValue?addForm.gradeValue:undefined,
      buyPrice:bp, curPrice:extra.curPrice??bp, qty:addForm.qty,
      psa:extra.psa, signal:extra.signal,
      image:resolvedImage||undefined,
      setId:addForm.setId||undefined,
      setTotal:addForm.setTotal||undefined,
      edition:addForm.edition||'Unlimited',
      variant:addForm.variant||'Normal',
    }
    if (guardLimit(1)) { setAddOpen(false); setAddSuggs([]); setNameValidated(false); return }
    setPortfolio(prev=>[...prev,newCard])
    persistCards([newCard])
    // Mode A : on garde la modale ouverte et on reset SEULEMENT etat/grade/prix/qte
    // (name/set/carte conserves) -> permet d'enchainer plusieurs exemplaires de la
    // meme carte en etats/grades differents (ex 1 Near Mint + 1 PSA 9).
    setAddedInSession(n=>n+1)
    setAddForm(p=>({...p, condition:'Near Mint', graded:false, gradeValue:'', buyPrice:'', qty:1}))
    showToast(newCard.name+(newCard.qty>1?' x'+newCard.qty:'')+' ajoutee')
  }
  // Scelle : la FORME de la ligne vient de src/lib/sealed-portfolio (partagee avec
  // la page Scelles). Ne pas la redecider ici — c'est cette forme que joint la
  // valorisation nocturne sur lang-set_id-card_type.
  const handleSealedAdd = async (payload: Record<string, unknown>) => {
    if (guardLimit(1)) return null
    const id = crypto.randomUUID()
    const seed = {
      name: String(payload.name ?? 'Produit'),
      set_name: payload.set_name ? String(payload.set_name) : null,
      set_id: payload.set_id ? String(payload.set_id) : null,
      card_type: payload.card_type ? String(payload.card_type) : null,
      lang: String(payload.lang ?? 'FR'),
      image_url: payload.image_url ? String(payload.image_url) : null,
    }
    const opts = {
      qty: Number(payload.qty ?? 1) || 1,
      buyPrice: payload.buy_price != null ? (Number(payload.buy_price) || 0) : null,
      // La cote connue au moment du choix. La laisser nulle affichait une ligne
      // sans prix jusqu'au passage de portfolio-prices : le chiffre etait sous
      // les yeux de l'utilisateur une seconde plus tot.
      currentPrice: payload.current_price != null ? Number(payload.current_price) : null,
    }
    const local = buildSealedLocalRow(seed, opts, { id }) as any
    if (user) {
      const { error } = await supabase.from('portfolio_cards')
        .insert(buildSealedDbRow(seed, opts, { id, userId: user.id }))
      if (error) { console.error('[KC SEALED] insert failed:', error); return null }
    } else {
      try {
        const prev = JSON.parse(localStorage.getItem('portfolio') || '[]')
        prev.push(local); localStorage.setItem('portfolio', JSON.stringify(prev))
      } catch { }
    }
    setPortfolio(prev => [...prev, local])
    showToast(seed.name + (opts.qty > 1 ? ' x' + opts.qty : '') + ' ajoute')
    return { id }
  }

  // Le catalogue sait la langue, la serie, le nom, le numero, l'image et la
  // rarete. Il ne sait RIEN de l'etat, de la gradation ni du prix d'achat :
  // c'est pourquoi le formulaire reste la seconde etape.
  const applyCardSeed = (seed: CardSeed) => {
    setCardPickOpen(false)
    setLiveCards([])
    setAddForm(p => ({
      ...p, lang: seed.lang, set: seed.setName, setId: seed.setId,
      name: seed.name, number: seed.localId, image: seed.image || '',
      rarity: seed.rarity || '', setTotal: 0,
    }))
    setNameValidated(true)
    setAddSuggs([])
    setAddOpen(true)
    // La serie complete alimente les suggestions du formulaire (enchainer
    // plusieurs cartes du meme set sans repasser par le picker).
    setCardsLoading(true)
    getCardsForSet(seed.lang, seed.setId)
      .then(cards => {
        setLiveCards(staticToTCGCards(cards, seed.setId, seed.lang,
          (l, si, lid) => getCardImageUrl({ lang: l, setId: si, localId: lid })) as any)
        setAddForm(p => ({ ...p, setTotal: cards.length }))
      })
      .catch(() => {})
      .finally(() => setCardsLoading(false))
  }

  const addToShowcase = (card:CardItem) => {
    if(isSealed(card)) return
    if(showcase.find(c=>c.id===card.id)) return
    if (user) {
      const pos = Math.max(0, ...showcase.map(c=>c.showcasePos??0)) + 1
      setPortfolio(prev=>prev.map(c=>c.id===card.id?{...c,showcasePos:pos}:c))
      if (!card.id.startsWith('u')) {
        supabase.from('portfolio_cards').update({ showcase_position: pos }).eq('id', card.id)
          .then(({ error }: any) => {
            if (error) {
              console.error('[KC SHOWCASE] update failed:', error)
              setPortfolio(prev=>prev.map(c=>c.id===card.id?{...c,showcasePos:undefined}:c))
            }
          })
      }
    } else {
      setLocalShowcase(prev=>[...prev,card])
    }
    setShowPickerForShowcase(false)
    showToast(card.name+' dans la vitrine')
  }
  const reorderShowcase = (from:number, to:number) => {
    const a = [...showcase]
    const [item] = a.splice(from, 1)
    a.splice(to, 0, item)
    if (user) {
      const posById: Record<string,number> = {}
      a.forEach((c, i) => { posById[c.id] = i + 1 })
      setPortfolio(prev=>prev.map(c=>posById[c.id]!==undefined?{...c,showcasePos:posById[c.id]}:c))
      a.forEach((c, i) => {
        if (c.id.startsWith('u')) return
        supabase.from('portfolio_cards').update({ showcase_position: i + 1 }).eq('id', c.id)
          .then(({ error }: any) => { if (error) console.error('[KC SHOWCASE] reorder failed:', error) })
      })
    } else {
      setLocalShowcase(a)
    }
  }
  const removeFromShowcase = (id:string, e:React.MouseEvent) => {
    e.stopPropagation()
    if (user) {
      setPortfolio(prev=>prev.map(c=>c.id===id?{...c,showcasePos:undefined}:c))
      if (!id.startsWith('u')) {
        supabase.from('portfolio_cards').update({ showcase_position: null }).eq('id', id)
          .then(({ error }: any) => { if (error) console.error('[KC SHOWCASE] remove failed:', error) })
      }
    } else {
      setLocalShowcase(prev=>prev.filter(c=>c.id!==id))
    }
  }
  const canAdd = !!(addForm.name&&addForm.set)

  return (
    <>
      <CardLimitGate gate={gate} onClose={() => setGate(null)} />
    <div>
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes fadeUp    { 0%{opacity:0;transform:translateY(24px) scale(.97)} 60%{opacity:1;transform:translateY(-4px) scale(1.005)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        /* 48 cartes = 24 dupliquees. 108 + 11 de marge = 119px par carte,
           donc un jeu complet vaut 24 x 119 = 2856px : le raccord est exact. */
        @keyframes hdSheen {
          0%       { opacity: 0; transform: translateX(-40%) skewX(-14deg); }
          6%       { opacity: .5; }
          16%      { opacity: 0; transform: translateX(160%) skewX(-14deg); }
          100%     { opacity: 0; transform: translateX(160%) skewX(-14deg); }
        }
        .hd-sheen {
          position: absolute; top: -20%; bottom: -20%; left: 0; width: 26%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,.85), transparent);
          pointer-events: none; z-index: 1;
          animation: hdSheen 11s cubic-bezier(.3,.6,.3,1) infinite 2.5s;
        }
        @media (prefers-reduced-motion: reduce) { .hd-sheen { display: none; } }
        @keyframes hdDrift { from { transform: translateX(0); } to { transform: translateX(-2856px); } }
        .hd-wall { translate: var(--px, 0) var(--py, 0); transition: translate .55s cubic-bezier(.2,.8,.2,1); }
        .hd-row { will-change: transform; }
        .hd-row-0 { animation: hdDrift 86s linear infinite; }
        .hd-row-1 { animation: hdDrift 124s linear infinite reverse; }
        @media (prefers-reduced-motion: reduce) {
          .hd-row-0, .hd-row-1 { animation: none !important; }
          .hd-wall { transition: none !important; }
        }
        @keyframes wallIn { from { opacity: 0; transform: rotate(-7deg) translateX(34px) scale(1.04); } to { opacity: 1; transform: rotate(-7deg); } }
        @keyframes cardIn    { from{opacity:0;transform:scale(.88) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slotIn    { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }
        @keyframes setExpand { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .set-cards-in { animation: setExpand .42s cubic-bezier(.16,1,.3,1) both; }
        @media (prefers-reduced-motion: reduce){ .set-cards-in { animation:none; } }
        @keyframes illuminate{ 0%{opacity:0;transform:scale(.93) translateY(12px)} 50%{opacity:1;transform:scale(1.02) translateY(-2px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
        
        .pocket-shell { contain:layout style paint; }
        .master-glitter-container, .badge-glitter-container { contain:strict; will-change:opacity; pointer-events:none; }
        .master-glitter-container div, .badge-glitter-container div { will-change:opacity; transform:translateZ(0); backface-visibility:hidden; }
        .shelf-row > div { backface-visibility:hidden; }
        * { -webkit-font-smoothing:antialiased; }
        .img-missing { position:relative; }
        .img-missing::after { content:'+'; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:24px; opacity:.4; pointer-events:none; }
        .set-block { content-visibility:auto; contain-intrinsic-size:auto 400px; }
        .shelf-row img, .binder-grid img { content-visibility:auto; }
        .pocket-shell .card-plastic { position:absolute;inset:0;border-radius:inherit;background:linear-gradient(135deg,rgba(29,29,31,.06) 0%,rgba(29,29,31,0) 45%,rgba(29,29,31,.025) 100%);pointer-events:none;z-index:5;transition:opacity .2s; }
        @keyframes holoShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes breatheS  { 0%,100%{box-shadow:0 0 18px rgba(255,107,53,.2),0 4px 16px rgba(0,0,0,.08)} 50%{box-shadow:0 0 36px rgba(255,107,53,.35),0 8px 28px rgba(0,0,0,.12)} }
        @keyframes breatheA  { 0%,100%{box-shadow:0 0 12px rgba(200,85,212,.15),0 4px 12px rgba(0,0,0,.06)} 50%{box-shadow:0 0 24px rgba(200,85,212,.3),0 6px 20px rgba(0,0,0,.1)} }
        @keyframes ptcl      { 0%{transform:translateY(0) scale(1);opacity:.8} 100%{transform:translateY(-28px) scale(0);opacity:0} }
        @keyframes shimGlow  { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes shim { 0%{left:-100%} 100%{left:200%} }
        @keyframes toastIn   { 0%{opacity:0;transform:translateX(-50%) translateY(12px) scale(.95)} 60%{opacity:1;transform:translateX(-50%) translateY(-3px) scale(1.01)} 100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} }
        @keyframes undoBar   { from{width:100%} to{width:0%} }
        @keyframes wrappedIn { 0%{opacity:0;transform:scale(.94) translateY(20px)} 60%{opacity:1;transform:scale(1.01) translateY(-3px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes shareUp   { 0%{opacity:0;transform:translateY(100%)} 60%{opacity:1;transform:translateY(-8px)} 100%{opacity:1;transform:translateY(0)} }
        .gem { position:relative;border-radius:14px;overflow:hidden;cursor:pointer;will-change:transform; }

        /* ── MICRO-INTERACTIONS ───────── */
        button { transition:transform .15s cubic-bezier(.25,.46,.45,.94),opacity .15s,box-shadow .25s; }
        button:active:not(:disabled):not(.remove-btn) { transform:scale(.97) !important;transition-duration:.06s !important; }
        .pocket-shell:active:not(:has(.remove-btn:hover)) { transform:translateY(-3px) scale(.99) !important;transition-duration:.12s !important; }
        input:focus { box-shadow:0 0 0 3px rgba(224,48,32,.18) !important;border-color:#E03020 !important;transition:box-shadow .2s,border-color .2s; }
        /* ── CARD IMAGE SHINE ON HOVER ── */
        
        
        
        /* ── RARE CARD GLOW ── */
        
        @keyframes holoPulse { 0%,100%{opacity:.08} 50%{opacity:.18} }
        /* ── SMOOTH REVEAL FOR ALL CARDS ── */
        @keyframes cardReveal { 0%{opacity:0;transform:translateY(12px)} 100%{opacity:1;transform:translateY(0)} }
        .pocket-shell { animation:cardReveal .5s cubic-bezier(.22,.68,0,1.1) both; }

        /* ══ HOOK ANIMATIONS ══════════════════════ */
        /* Shimmer sur le bouton Partager */
        @keyframes btnShimmer {
          0%{background-position:-200% center}
          100%{background-position:200% center}
        }
        .btn-shimmer {
          background:linear-gradient(135deg,#E03020,#FF4433,#FF6B35,#FF4433,#E03020) !important;
          background-size:300% 100% !important;
          animation:btnShimmer 4s ease-in-out infinite !important;
          box-shadow:0 4px 16px rgba(224,48,32,.2),0 1px 3px rgba(0,0,0,.04) !important;
          transition:transform .2s var(--spring),box-shadow .3s !important;
        }
        .btn-shimmer:hover {
          transform:translateY(-2px) scale(1.03) !important;
          box-shadow:0 8px 24px rgba(224,48,32,.22),0 2px 6px rgba(0,0,0,.05) !important;
        }

        /* Compteur EUR animé */
        @keyframes pricePulse {
          0% { transform: scale(1) }
          30% { transform: scale(1.04) }
          100% { transform: scale(1) }
        }
        .price-pulse { animation: pricePulse .5s cubic-bezier(.34,1.4,.64,1); }
        @keyframes valueReveal {
          0%{opacity:0;transform:translateY(12px);filter:blur(4px)}
          100%{opacity:1;transform:translateY(0);filter:blur(0)}
        }
        .value-hero { animation:valueReveal .6s var(--ease-out-expo,.16,1,.3,1) both; }
        .value-hero-sub { animation:valueReveal .6s .15s cubic-bezier(.16,1,.3,1) both; }

        /* Sections staggered on load */
        @keyframes sectionIn {
          0%{opacity:0;transform:translateY(20px)}
          100%{opacity:1;transform:translateY(0)}
        }
        .section-reveal { animation:sectionIn .5s cubic-bezier(.16,1,.3,1) both; }
        .section-reveal-1 { animation-delay:.05s; }
        .section-reveal-2 { animation-delay:.12s; }
        .section-reveal-3 { animation-delay:.2s; }
        .section-reveal-4 { animation-delay:.3s; }

        /* Progress bar fill animated */
        @keyframes softHoloShift { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
        .holo-header-bg { animation: softHoloShift 14s linear infinite; }
        @media (prefers-reduced-motion: reduce){ .holo-header-bg { animation: none; } }
        @keyframes barGrow {
          0%{transform:scaleX(0);transform-origin:left}
          100%{transform:scaleX(1);transform-origin:left}
        }
        .bar-animated { animation:barGrow .8s .4s cubic-bezier(.16,1,.3,1) both; }

        /* Tab sliding indicator */
        .vtab { position:relative;overflow:hidden; }
        .vtab::after {
          content:'';position:absolute;bottom:0;left:50%;width:0;height:2px;
          background:#E03020;border-radius:1px;
          transition:all .25s cubic-bezier(.22,.68,0,1.1);
          transform:translateX(-50%);
        }
        .vtab:hover::after { width:60%; }
        .vtab.on::after { width:0; }

        /* Card subtle float on idle */
        .pocket-shell {
          transform-style:preserve-3d;
          perspective:800px;
        }

        /* Glow cursor follow on header area */
        .header-glow {
          position:relative;overflow:hidden;
        }
        .header-glow.DISABLED::before {
          content:'';position:absolute;width:300px;height:300px;
          border-radius:50%;
          background:radial-gradient(circle,rgba(224,48,32,.06) 0%,transparent 70%);
          pointer-events:none;opacity:0;
          transition:opacity .4s;
          transform:translate(-50%,-50%);
        }
        .header-glow:hover::before { opacity:1; }

        /* Empty slot breathing glow */
        .empty-pocket.DISABLED::before {
          content:'';position:absolute;inset:8px;border-radius:8px;
          background:radial-gradient(circle,rgba(224,48,32,.04) 0%,transparent 70%);
          animation:emptyGlow 3s ease-in-out infinite;
          pointer-events:none;
        }
        @keyframes emptyGlow {
          0%,100%{opacity:0;transform:scale(.9)}
          50%{opacity:1;transform:scale(1.05)}
        }

        /* Stats cards hover lift */
        .stat-card {
          transition:transform .25s cubic-bezier(.22,.68,0,1.1),box-shadow .3s !important;
        }
        .stat-card:hover {
          transform:translateY(-3px) !important;
          box-shadow:0 8px 24px rgba(0,0,0,.08),0 2px 8px rgba(0,0,0,.04) !important;
        }

        /* Set header hover — subtle lift */
        .set-header:hover {
          background:rgba(0,0,0,.015);border-radius:12px;
        }
        .shelf-row { scrollbar-width:none; -ms-overflow-style:none; overflow-x:scroll !important; -webkit-overflow-scrolling:touch; }
        .shelf-row img { -webkit-user-drag:none; user-drag:none; pointer-events:none; }
        .shelf-row * { -webkit-user-select:none; user-select:none; }
        .shelf-row::-webkit-scrollbar { display:none; }
        .shelf-row::-webkit-scrollbar { display:none; }
        .minimap { position:relative;height:20px;background:#F0F0F5;border-radius:7px;overflow:hidden;cursor:grab;transition:height .15s,opacity .15s;user-select:none;-webkit-user-select:none; }
        .minimap:hover { height:24px; }
        .minimap:active { cursor:grabbing; }
        .minimap:hover .mm-vp { border-color:rgba(29,29,31,.45) !important;background:rgba(224,48,32,.08) !important; }
        .set-header:active {
          transform:scale(.995);
        }
        .set-header { transition:background .2s,transform .1s; padding:14px 16px; margin:0; border-radius:16px; }
        .set-header.is-master:hover { background:transparent !important; }

        /* Rarity shimmer on holo cards */
        .pocket-shell.gem.DISABLED::before {
          content:'';position:absolute;inset:0;z-index:3;pointer-events:none;
          background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.15) 45%,rgba(255,255,255,.25) 50%,rgba(255,255,255,.15) 55%,transparent 60%);
          background-size:200% 100%;
          opacity:0;
          transition:opacity .4s;
        }
        .pocket-shell.gem:hover::before {
          opacity:1;
          animation:cardShine 1.5s ease-in-out;
        }
        @keyframes cardShine {
          0%{background-position:200% center}
          100%{background-position:-200% center}
        }

        /* ── VITRINE CARD ENTRANCE ── */
        @keyframes showcaseReveal {
          0% { opacity:0; transform:translateY(40px) scale(.9); }
          60% { opacity:1; transform:translateY(-6px) scale(1.02); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }

        /* ── GRADE VISUAL ── */
        @keyframes metalShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes masterSweep { 0%{left:-15%} 100%{left:115%} }
        @keyframes goldSlow { 0%{background-position:0% center} 100%{background-position:200% center} }
        @keyframes gl1 { 0%{opacity:0} 6%{opacity:1} 12%{opacity:0} 100%{opacity:0} }
        @keyframes gl2 { 0%{opacity:0} 8%{opacity:.8} 14%{opacity:1} 20%{opacity:0} 100%{opacity:0} }
        @keyframes gl3 { 0%{opacity:0} 4%{opacity:1} 8%{opacity:.6} 14%{opacity:0} 100%{opacity:0} }
        @keyframes gl4 { 0%{opacity:0} 10%{opacity:1} 16%{opacity:.4} 22%{opacity:0} 100%{opacity:0} }
        @keyframes starBreath { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes masterPulse { 0%,100%{box-shadow:0 0 12px rgba(255,215,0,.2),0 0 4px rgba(255,215,0,.1)} 50%{box-shadow:0 0 24px rgba(255,215,0,.4),0 0 8px rgba(255,215,0,.2)} }
        @keyframes masterShine { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes starSpin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes goldShine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes goldShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        /* ── HOOK HOVERS ── */
        /* ── ADD MODAL HOVERS ── */
        .add-modal input:focus { border-color:rgba(29,29,31,0.5) !important; box-shadow:inset 0 1px 0 rgba(255,255,255,0.95) !important; outline:none !important; }
        .add-modal select:focus { border-color:rgba(29,29,31,0.5) !important; box-shadow:inset 0 1px 0 rgba(255,255,255,0.95) !important; outline:none !important; }
        .add-modal input:hover:not(:focus) { border-color:rgba(0,0,0,0.18) !important; }
        .add-modal select:hover:not(:focus) { border-color:rgba(0,0,0,0.18) !important; }
        .add-modal input, .add-modal select, .add-modal textarea { outline:none !important; -webkit-appearance:none !important; appearance:none !important; }
        .add-modal input::placeholder { color:#86868B !important; }
        .add-modal input:-webkit-autofill { -webkit-box-shadow:0 0 0 1000px rgba(255,255,255,0.7) inset !important; -webkit-text-fill-color:#1D1D1F !important; }

        button:hover:not(:disabled) { filter:brightness(1.05); }
        .vtab:hover:not(.on) { color:#1D1D1F !important; }
        .vtab:active { transform:scale(.96) !important;transition-duration:.06s !important; }
        .colbtn:hover { background:#F0F0F5 !important;color:#48484A !important; }
        .colbtn:active { transform:scale(.9) !important; }
        .pocket-shell:hover .remove-btn { opacity:1 !important; }

        .set-header:hover { background:rgba(0,0,0,.02) !important;border-radius:12px; }
        @keyframes nudgeRight { 0%,100%{transform:translateX(0)} 50%{transform:translateX(3px)} }
        .voir-pill { animation:nudgeRight 1.5s ease-in-out infinite; }
        .set-header:active { transform:scale(.998) !important; }

        .gem .holo { position:absolute;inset:0;border-radius:inherit;background:linear-gradient(115deg,#ff0080,#ff8c00,#ffd700,#00ff88,#00cfff,#8b00ff,#ff0080);background-size:500% 500%;mix-blend-mode:overlay;opacity:0;pointer-events:none;transition:opacity .35s;animation:holoShift 8s ease infinite; }
        .gem .hm { position:absolute;inset:0;border-radius:inherit;background:radial-gradient(circle at 50% 50%,rgba(29,29,31,.3),transparent 65%);opacity:0;pointer-events:none;mix-blend-mode:overlay;transition:opacity .25s; }
        
        .gem .ptcl { position:absolute;width:3px;height:3px;border-radius:50%;pointer-events:none;opacity:0; }
        .gem:hover .ptcl:nth-child(1){ animation:ptcl 2s ease-out infinite; }
        .gem:hover .ptcl:nth-child(2){ animation:ptcl 2.4s .5s ease-out infinite; }
        .gem:hover .ptcl:nth-child(3){ animation:ptcl 1.8s 1s ease-out infinite; }
        .breathe-S { animation:breatheS 2.4s ease-in-out infinite; }
        .breathe-A { animation:breatheA 3s ease-in-out infinite; }
        .pocket-shell { position:relative;border-radius:12px;overflow:hidden;cursor:pointer;transition:transform .55s cubic-bezier(.4,0,.1,1),box-shadow .6s cubic-bezier(.4,0,.1,1);background:#fff;border:1px solid #EBEBEB;box-shadow:0 1px 3px rgba(0,0,0,.03); }
        .pocket-shell:hover { transform:translateY(-6px) !important;box-shadow:0 12px 32px rgba(0,0,0,.06),0 4px 12px rgba(0,0,0,.02) !important;border-color:#D2D2D7 !important; }
        @media (prefers-reduced-motion: reduce){ .kbinder-grid > *{ animation:none !important } }
        
        @keyframes slotPulse { 0%,100%{border-color:#D2D2D7;box-shadow:0 0 0 0 rgba(224,48,32,0)} 50%{border-color:#E03020;box-shadow:0 0 0 8px rgba(224,48,32,.1)} }
        .empty-pocket { animation:slotPulse 3s ease-in-out infinite;border:2px dashed #D2D2D7 !important;background:#FAFAFA !important; }
        .empty-pocket:hover { animation:none !important; }
        .vtab { padding:8px 18px;border-radius:99px;border:0.5px solid rgba(255,255,255,0.6);background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.4) 100%);backdrop-filter:blur(18px) saturate(180%);-webkit-backdrop-filter:blur(18px) saturate(180%);color:#6E6E73;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-display);transition:all .25s cubic-bezier(.2,.8,.2,1);box-shadow:0 1px 4px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8); }
        .vtab:hover:not(.on) { transform:translateY(-1px);color:#1D1D1F;box-shadow:0 6px 16px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9); }
        .vtab:active { transform:scale(.97);transition-duration:.08s; }
        .vtab.on { background:linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.7) 100%) !important;color:#1D1D1F !important;box-shadow:0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95) !important; }
        .ksubrail{ display:inline-flex; gap:2px; padding:3px; background:rgba(0,0,0,.045); border-radius:99px; }
        .kseg{ padding:6px 14px; border:none; background:transparent; border-radius:99px; color:#6E6E73; font-size:11.5px; font-weight:600; font-family:var(--font-display); cursor:pointer; white-space:nowrap; transition:background .22s cubic-bezier(.2,.85,.3,1), color .18s ease, transform .12s ease; }
        .kseg:hover{ color:#1D1D1F; }
        .kseg.on{ background:#FFF; color:#1D1D1F; box-shadow:0 1px 3px rgba(0,0,0,.10), 0 0 0 .5px rgba(0,0,0,.03); }
        .kseg:active{ transform:scale(.96); }
        .kadd-mini{ transition:background .2s cubic-bezier(.2,.85,.3,1), color .2s ease, transform .16s cubic-bezier(.2,.85,.3,1), box-shadow .22s ease; }
        .kadd-mini:hover{ transform:translateY(-1px); box-shadow:inset 0 0 0 .5px rgba(0,0,0,.07), 0 4px 12px rgba(0,0,0,.07); }
        .kadd-mini:active{ transform:translateY(0) scale(.95); transition-duration:.07s; }
        .kadd-secondary .kadd-mini{ height:28px; padding:0 11px; background:transparent; box-shadow:none; }
        .kadd-secondary .kadd-mini:hover{ background:#FFF; transform:none; box-shadow:0 1px 3px rgba(0,0,0,.10); }
        .kadd-secondary .kadd-mini:active{ transform:scale(.95); }
        .kadd-mini svg{ transition:transform .32s cubic-bezier(.34,1.45,.4,1); }
        .kadd-mini:hover svg{ transform:scale(1.13); }
        .kadd-primary{ box-shadow:0 1px 3px rgba(0,0,0,.15); transition:background .2s ease, transform .16s cubic-bezier(.2,.85,.3,1), box-shadow .24s ease; }
        .kadd-primary:hover{ transform:translateY(-1px); box-shadow:0 6px 16px rgba(0,0,0,.20); }
        .kadd-primary:active{ transform:translateY(0) scale(.97); transition-duration:.07s; }
        .kadd-primary svg{ transition:transform .38s cubic-bezier(.34,1.6,.4,1); }
        .kadd-primary:hover svg{ transform:scale(1.18); }
        .kseg{ transition:background .26s cubic-bezier(.34,1.25,.4,1), color .18s ease, transform .14s cubic-bezier(.2,.85,.3,1); }
        .kseg:hover:not(.on){ background:rgba(255,255,255,.45); }
        .kseg.on{ animation:ksegPop .32s cubic-bezier(.34,1.45,.4,1); }
        @keyframes ksegPop{ 0%{transform:scale(.93)} 58%{transform:scale(1.035)} 100%{transform:scale(1)} }
        .knum-pop{ display:inline-block; animation:knumPop .36s cubic-bezier(.34,1.55,.4,1); }
        @keyframes knumPop{ 0%{transform:translateY(-4px) scale(.82); opacity:.35} 100%{transform:none; opacity:1} }
        @media (prefers-reduced-motion: reduce){
          .kadd-mini:hover, .kadd-primary:hover{ transform:none }
          .kadd-mini:hover svg, .kadd-primary:hover svg{ transform:none }
          .kseg.on, .knum-pop{ animation:none }
        }
        .kreset{ display:inline-flex; align-items:center; gap:5px; height:26px; padding:0 11px; border:none; border-radius:99px; background:rgba(224,48,32,.08); color:#E03020; font-size:11px; font-weight:600; font-family:var(--font-display); cursor:pointer; white-space:nowrap; animation:kresetIn .26s cubic-bezier(.2,.85,.3,1) backwards; transition:background .18s ease, transform .12s ease; }
        .kreset:hover{ background:rgba(224,48,32,.14); }
        .kreset:active{ transform:scale(.95); }
        @keyframes kresetIn{ from{ opacity:0; transform:translateX(6px) } to{ opacity:1; transform:none } }
        @media (prefers-reduced-motion: reduce){ .kreset{ animation:none } .kreset:active{ transform:none } }
        .kseg:focus{ outline:none; }
        .kseg:focus-visible{ outline:none; box-shadow:0 0 0 3px rgba(0,0,0,.10); }
        .kadd-mini:focus{ outline:none; }
        .kadd-mini:focus-visible{ outline:none; box-shadow:0 0 0 3px rgba(0,0,0,.08); }
        .kseg-sm{ height:28px; padding:0 12px; font-size:11px; }
        .ksubrail{ height:34px; box-sizing:border-box; align-items:center; }
        .kctrl-field{ height:34px; padding:0 12px; border-radius:99px; border:none; background:rgba(255,255,255,.62); box-shadow:inset 0 0 0 .5px rgba(0,0,0,.07); color:#1D1D1F; font-size:11.5px; font-weight:600; font-family:var(--font-display); outline:none; transition:box-shadow .18s ease, background .18s ease; }
        .kctrl-field:hover{ background:rgba(255,255,255,.85); }
        .kctrl-field:focus{ background:#FFF; box-shadow:inset 0 0 0 .5px rgba(0,0,0,.07), 0 0 0 3px rgba(0,0,0,.05); }
        .kadd-btns{ flex-wrap:nowrap!important; flex-shrink:0; }
        @media (max-width:1700px){ .kadd-lbl{ display:none } }
        @media (max-width:1620px){ .kadd-long{ display:none } }
        @media (max-width:1540px){ .kadd-serie-lbl{ display:none } }
        /* Sous 1500px on ARRETE de comprimer : deux lignes assumees, filtres puis
           actions a droite. Une ligne qui casse au hasard est pire que deux lignes
           voulues. */
        @media (max-width:1500px){
          .kcollection-head{ flex-wrap:wrap!important; row-gap:10px; }
          .kcollection-title{ flex:1 1 100%!important; }
          .kadd-btns{ margin-left:auto; }
        }
        /* La grille suit la largeur reelle : a 1017px, 7 colonnes donnaient des
           vignettes de 55px et des noms reduits a une lettre. */
        @media (max-width:1500px){ .kbinder-grid{ grid-template-columns:repeat(6,minmax(0,1fr))!important } }
        @media (max-width:1300px){ .kbinder-grid{ grid-template-columns:repeat(5,minmax(0,1fr))!important } }
        @media (max-width:1150px){ .kbinder-grid{ grid-template-columns:repeat(4,minmax(0,1fr))!important } }
        @media (max-width:1400px){ .ed-badge{ font-size:7px!important; padding:2px 4px!important; letter-spacing:.02em!important } }
        @media (max-width:1023px){ .kadd-cols{ display:none!important } }
        @media (max-width:767px){
          .kadd-btns > .kadd-primary{ width:100%!important; justify-content:center; height:40px; }
          .kadd-btns > .kadd-sep{ display:none!important; }
          .kfilt-searchbox{ flex:1 1 100%!important; max-width:none!important; }
          .kctrl-field{ height:38px; font-size:12.5px; }
          .ksubrail{ height:38px; }
          .kseg-sm{ height:31px; font-size:11.5px; }
        }
        @media (prefers-reduced-motion: reduce){ .kseg{ transition:none } .kseg:active{ transform:none } }
        .colbtn { width:28px;height:28px;border-radius:7px;font-size:11px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .2s cubic-bezier(.25,.46,.45,.94);color:#86868B;border:1px solid #D2D2D7;background:#fff; }
        /* Responsive — clamp colonnes binder (override inline grid via !important) */
        @media (max-width:1023px){
          .kbinder-grid{ grid-template-columns:repeat(3,minmax(0,1fr))!important; }
          .kbinder-colpicker{ display:none!important; }
        }
        @media (max-width:767px){
          /* Étagère de cartes : 130px -> on voit 2,5 cartes, la demi-carte signale le swipe */
          .shelf-card{ width:130px!important; }
          /* Fade à droite : indice visuel "ça continue, swipe" */
          .shelf-row{ -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent 100%); mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent 100%); }
          /* Ligne de série : masquer la pill redondante (la ligne entière est cliquable) */
          .voir-pill{ display:none!important; }
          /* Ligne de set alignee : logo boite fixe -> le texte demarre au meme X partout */
          .ksetrow-head{ flex-wrap:nowrap!important; gap:8px; align-items:flex-start; }
          .ksetrow-left{ flex-wrap:nowrap!important; min-width:0; flex:1; align-items:flex-start!important; gap:6px!important; }
          .kset-logobox{ width:40px!important; align-self:flex-start; margin-top:1px; }
          .kset-logobox img{ max-width:40px!important; height:24px!important; }
          .kset-textcol{ min-width:0; flex:1; }
          .kmaster-pill{ width:26px; height:26px; padding:0!important; }
          .kmaster-pill-txt{ display:none!important; }
          /* Carte collection : titre en haut pleine largeur, actions empilées en dessous */
          .kcollection-head{ flex-direction:column!important; align-items:stretch!important; gap:12px; }
          .kcollection-title{ width:100%; }
          /* Carte d'actions : "Ajouter une carte" principal + 3 mini-boutons */
          .kadd-btns{ flex-direction:column!important; width:100%; align-items:stretch!important; gap:8px!important; }
          .kadd-btns > .gb, .kadd-btns > button:not(.kadd-mini){ width:100%!important; }
          /* La rangée des 3 mini-boutons : display:contents ne marche pas pour flexer, on remet un flex */
          .kadd-secondary{ display:flex!important; gap:8px!important; width:100%; justify-content:center; }
          .kadd-mini{ flex:0 1 96px; min-width:0; display:flex; flex-direction:row; align-items:center; justify-content:center; gap:6px; height:40px; border-radius:99px; border:none; background:rgba(255,255,255,0.5); backdrop-filter:blur(12px) saturate(180%); -webkit-backdrop-filter:blur(12px) saturate(180%); box-shadow:inset 0 0 0 0.5px rgba(255,255,255,0.7); color:#6E6E73; font-size:12px; font-weight:600; font-family:var(--font-display); cursor:pointer; }
          .kadd-mini:active{ background:rgba(0,0,0,0.04); }
          /* Boutons colonnes binder : inutiles en mobile (densité forcée) */
          .kadd-cols{ display:none!important; }
          /* En-tête Vitrine : titre en haut, actions en rangée dessous */
          .kvitrine-head{ flex-direction:column!important; align-items:stretch!important; gap:12px; }
          .kvitrine-title{ width:100%; }
          .kvitrine-actions{ width:100%; }
          .kvitrine-share{ flex:1; justify-content:center; }
          /* "Ajouter une carte" → icône seule (action principale = Partager) */
          .kvitrine-add-label{ display:none; }
          .kvitrine-add{ padding:10px!important; width:42px; justify-content:center; flex-shrink:0; }
          /* Présentoir Vitrine : piédestal — vedette en grand, reste en grille 2-col */
          .kvitrine-stage{ padding:32px 16px 28px!important; }
          .kvitrine-cards{ display:grid!important; grid-template-columns:repeat(2,1fr)!important; gap:16px 14px!important; align-items:start!important; }
          .kvc-slot{ width:100%!important; min-width:0; }
          .kvc-slot .kvitrine-card{ width:100%!important; }
          /* Vedette : occupe les 2 colonnes, centrée, plus grande */
          .kvc-star{ grid-column:1 / -1!important; }
          .kvc-star .kvitrine-card{ max-width:190px; margin:0 auto; }
          /* Rangée recherche+filtres : recherche en haut pleine largeur, filtres en dessous */
          .kfilt-row{ flex-direction:column!important; align-items:stretch!important; gap:10px; }
          .kfilt-search{ flex:none!important; width:100%; }
          /* Filtres+tri : scroll horizontal avec fade (indice swipe) */
          .kfilt-chips{ overflow-x:auto; flex-shrink:1!important; padding-bottom:2px; -webkit-overflow-scrolling:touch; scrollbar-width:none; -webkit-mask-image:linear-gradient(to right,#000 calc(100% - 24px),transparent 100%); mask-image:linear-gradient(to right,#000 calc(100% - 24px),transparent 100%); }
          .kfilt-chips::-webkit-scrollbar{ display:none; }
          .kfilt-chips > *{ flex-shrink:0; }
          .kbreadcrumb{ overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; -webkit-mask-image:linear-gradient(to right,#000 calc(100% - 20px),transparent 100%); mask-image:linear-gradient(to right,#000 calc(100% - 20px),transparent 100%); }
          .kbreadcrumb::-webkit-scrollbar{ display:none; }
          .kbreadcrumb > *{ flex-shrink:0; }
          .kdetail-logo{ height:52px!important; max-width:200px!important; }
          .kdetail-hero{ padding:14px 0 12px!important; }
          .kdetail-halo{ display:none!important; }
        }
        @media (max-width:600px){
          .kbinder-grid{ grid-template-columns:repeat(2,minmax(0,1fr))!important; gap:8px!important; }
          .kpicker-grid{ grid-template-columns:repeat(2,1fr)!important; }
        }
        .colbtn:hover { background:#F0F0F5;color:#48484A;border-color:#C7C7CC; }
        .colbtn:active { transform:scale(.92);transition-duration:.06s; }
        .remove-btn { pointer-events:all !important; }
        /* Edition badges */
        .ed-badge { display:inline-flex; align-items:center; font-size:8px; font-weight:700; padding:2px 5px; border-radius:3px; font-family:var(--font-data); letter-spacing:.03em; line-height:1; white-space:nowrap; vertical-align:middle; }
        .ed-1st { background:linear-gradient(135deg,#1a1a2e,#2d2b55); color:#d4c5ff; border:none; }
        .ed-shadowless { background:linear-gradient(135deg,#e8eeff,#dde4ff); color:#4338ca; border:none; }
        .ed-1st-edition { background:linear-gradient(135deg,#1a1a2e,#2d2b55); color:#d4c5ff; border:none; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
        .req-label { font-size:10px;font-weight:600;color:#1D1D1F;font-family:var(--font-display);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px; }
        .opt-label { font-size:10px;font-weight:500;color:#86868B;font-family:var(--font-display);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px; }
        .req-field { border:2px solid rgba(255,107,53,.35) !important; }
        .req-field-ok { border:2px solid rgba(78,204,163,.4) !important; }
        select { color-scheme:dark; }
        @keyframes binderOpen { 0%{transform:perspective(800px) rotateY(-90deg) translateX(-60px);opacity:0} 60%{transform:perspective(800px) rotateY(8deg);opacity:1} 100%{transform:perspective(800px) rotateY(0deg);opacity:1} }
        @keyframes floatCard { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-5px)} }
        @keyframes welcomeIn  { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
        @keyframes burst      { 0%{transform:scale(0) rotate(0deg);opacity:1} 60%{transform:scale(1.3) rotate(20deg);opacity:1} 100%{transform:scale(1.1) rotate(15deg);opacity:1} }
        @keyframes shimmerG   { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes holoSweep  { 0%,100%{background-position:0% 0%} 50%{background-position:100% 100%} }
        @keyframes wcFade     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes scanPulse  { 0%,100%{border-color:rgba(16,185,129,.4)} 50%{border-color:rgba(16,185,129,.9)} }
        @keyframes scanLine   { 0%{top:10%} 100%{top:90%} }
        .scan-frame { animation:scanPulse 1.4s ease-in-out infinite; }
        .scan-line  { animation:scanLine 1.8s ease-in-out infinite alternate; }
      `}} />

      <div style={{ background:'transparent', minHeight:'100vh', borderRadius:'16px', overflow:'visible', position:'relative', paddingBottom:'40px' }}>
        {/* Bokeh AppShell traverse - pas de blob local */}

        {toast&&(
          <div style={{ position:'fixed', bottom:toast.undo?'32px':'24px', left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:toast.undo?'16px':'14px', background:'rgba(29,29,31,.92)', backdropFilter:'blur(16px) saturate(180%)', WebkitBackdropFilter:'blur(16px) saturate(180%)', color:'rgba(255,255,255,.95)', padding:toast.undo?'14px 22px':'9px 20px', borderRadius:toast.undo?'16px':'22px', fontSize:toast.undo?'13px':'12px', fontWeight:500, border:'1.5px solid #D1CEC9', whiteSpace:'nowrap', zIndex:999, animation:'toastIn .3s ease-out', fontFamily:'var(--font-display)', boxShadow:toast.undo?'0 12px 40px rgba(0,0,0,.45), inset 0 0 0 0.5px rgba(255,255,255,0.12)':'none', overflow:'hidden' }}>
            {toast.undo && (
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#FF7A6E' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' style={{ flexShrink:0 }}><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/></svg>
            )}
            <span>{toast.msg}</span>
            {toast.undo && (
              <button onClick={toast.undo} style={{ background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.18)', color:'#FF7A6E', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', padding:'6px 14px', borderRadius:'10px', flexShrink:0 }}>
                Annuler
              </button>
            )}
            {toast.undo && (
              <div style={{ position:'absolute', bottom:0, left:0, height:'2.5px', background:'#FF7A6E', animation:'undoBar 5s linear forwards', borderRadius:'2px' }}/>
            )}
          </div>
        )}

        {/* SPOTLIGHT */}
        {spotCard && (() => {
          const curQty = editQty ?? spotCard.qty
          const isFav = favs.has(spotCard.id)
          // ID nettoye (retire suffixes variante -1st/-shadowless) pour la page complete
          const cleanId = spotCard.kCardId || spotCard.id
          const hasPrice = spotCard.curPrice > 0
          const flag = spotCard.lang === 'JP' ? '\uD83C\uDDEF\uD83C\uDDF5' : spotCard.lang === 'EN' ? '\uD83C\uDDFA\uD83C\uDDF8' : '\uD83C\uDDEB\uD83C\uDDF7'
          return createPortal(
            <div onClick={() => { setSpotCard(null); setEditQty(null) }}
              style={{ position:'fixed', inset:0, zIndex:120, display:'flex', alignItems:'center', justifyContent:'center', padding:24, background:'rgba(20,20,25,0.32)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', animation:'kcFadeIn .18s ease' }}>
              <div onClick={e => e.stopPropagation()}
                style={{ width:'min(420px, 94vw)', maxHeight:'90vh', overflowY:'auto', background:'rgba(255,255,255,0.96)', backdropFilter:'blur(30px) saturate(180%)', WebkitBackdropFilter:'blur(30px) saturate(180%)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 24px 60px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.9)', animation:'kcSpringIn .22s cubic-bezier(.2,.85,.3,1)', position:'relative' }}>
                <style>{`@keyframes kcFadeIn{from{opacity:0}to{opacity:1}}@keyframes kcSpringIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:none}}`}</style>

                {/* Fermer */}
                <button onClick={() => { setSpotCard(null); setEditQty(null) }} aria-label="Fermer"
                  style={{ position:'absolute', top:14, right:14, width:30, height:30, borderRadius:9, background:'rgba(255,255,255,0.7)', border:'1px solid var(--border)', color:'#86868B', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>

                <div style={{ padding:'22px 22px 20px' }}>
                  {/* Image + identite */}
                  <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                    {spotCard.image ? (
                      <img src={spotCard.image} alt={spotCard.name}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        style={{ width:96, borderRadius:8, boxShadow:'0 6px 18px rgba(0,0,0,0.16)', flexShrink:0 }} />
                    ) : null}
                    <div style={{ flex:1, minWidth:0, paddingTop:4 }}>
                      <div style={{ fontSize:11, color:'#86868B', fontFamily:'var(--font-display)', display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                        <span>{flag}</span>
                        <span style={{ textTransform:'uppercase', letterSpacing:'.04em' }}>{spotCard.set}</span>
                        {spotCard.number ? <span>· #{spotCard.number}</span> : null}
                      </div>
                      <div style={{ fontSize:19, fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-0.01em', lineHeight:1.2, marginBottom:6 }}>{spotCard.name}</div>
                      {/* Badge condition / grading */}
                      <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:7, marginBottom:10, background: spotCard.graded ? 'rgba(224,48,32,0.08)' : 'rgba(0,0,0,0.05)', border: `1px solid ${spotCard.graded ? 'rgba(224,48,32,0.2)' : 'var(--border)'}` }}>
                        <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:'.02em', color: spotCard.graded ? '#E03020' : '#6E6E73', fontFamily:'var(--font-display)', textTransform:'uppercase' }}>
                          {spotCard.graded ? `${spotCard.gradeCompany || 'PSA'} ${spotCard.gradeValue || ''}`.trim() : normalizeCondition(spotCard.condition)}
                        </span>
                      </div>
                      {hasPrice ? (
                        <div>
                          <div style={{ fontSize:10, color:'#86868B', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', fontFamily:'var(--font-display)', marginBottom:2 }}>{isInvestor ? 'Prix de marché' : (spotCard.rarity ? 'Rareté' : 'Dans ta collection')}</div>
                          <div style={{ fontSize:isInvestor?24:19, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', lineHeight:1.15 }}>{isInvestor ? formatEUR(spotCard.curPrice) : (spotCard.rarity || spotCard.set || '\u2014')}</div>
                          {spotCard.qty > 1 ? (
                            <div style={{ fontSize:12, color:'#6E6E73', fontFamily:'var(--font-display)', marginTop:3 }}>{'\u00D7'}{spotCard.qty}{isInvestor ? <> {'\u00B7'} {formatEUR(spotCard.curPrice * spotCard.qty)} au total</> : ' exemplaires'}</div>
                          ) : null}
                          {show.pnl && spotCard.buyPrice > 0 ? (() => {
                            const pv = spotCard.curPrice - spotCard.buyPrice
                            const pct = spotCard.buyPrice > 0 ? Math.round((pv / spotCard.buyPrice) * 100) : 0
                            const up = pv >= 0
                            return (
                              <div style={{ fontSize:12, fontFamily:'var(--font-display)', marginTop:5, color:'#86868B' }}>
                                Acheté {formatEUR(spotCard.buyPrice)} {'\u00B7'} <span style={{ fontWeight:700, color: up ? '#1D9E75' : '#E03020' }}>{up ? '+' : ''}{formatEUR(pv)} ({up ? '+' : ''}{pct}%)</span>
                              </div>
                            )
                          })() : null}
                        </div>
                      ) : (
                        <div style={{ fontSize:13, color:'#86868B', fontStyle:'italic', fontFamily:'var(--font-display)' }}>Données insuffisantes</div>
                      )}
                    </div>
                  </div>

                  {/* Gestion : quantite */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:18, padding:'10px 14px', borderRadius:14, background:'rgba(0,0,0,0.025)', border:'1px solid var(--border)' }}>
                    <span style={{ fontSize:12, color:'#6E6E73', fontWeight:500, fontFamily:'var(--font-display)' }}>Quantité</span>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <button onClick={()=>setEditQty(Math.max(1,curQty-1))} style={{ width:28, height:28, borderRadius:9, background:'#fff', border:'1px solid var(--border)', color:'#48484A', fontSize:14, fontWeight:600, cursor:'pointer' }}>-</button>
                      <span style={{ fontSize:14, fontWeight:600, color:'#1D1D1F', minWidth:20, textAlign:'center', fontFamily:'var(--font-display)' }}>{curQty}</span>
                      <button onClick={()=>setEditQty(Math.min(99,curQty+1))} style={{ width:28, height:28, borderRadius:9, background:'#fff', border:'1px solid var(--border)', color:'#48484A', fontSize:14, fontWeight:600, cursor:'pointer' }}>+</button>
                      {editQty!==null && editQty!==spotCard.qty && (
                        <button onClick={()=>{ setPortfolio(prev=>prev.map(c=>c.id===spotCard.id?{...c,qty:editQty!}:c)); setSpotCard({...spotCard,qty:editQty!}); setEditQty(null); showToast('Quantité mise à jour') }} style={{ padding:'6px 14px', borderRadius:10, background:'#1D1D1F', color:'#fff', border:'none', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' }}>OK</button>
                      )}
                    </div>
                  </div>

                  {/* Gestion : partager + favori */}
                  <div style={{ display:'flex', gap:8, marginTop:8 }}>
                    <button onClick={()=>{ setShareCtx('card'); setShareCard(spotCard); setShareOpen(true) }} style={{ flex:1, padding:12, borderRadius:12, background:'rgba(255,255,255,0.7)', border:'1px solid var(--border)', color:'#1D1D1F', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)' }}>Partager</button>
                    <button onClick={e=>toggleFav(spotCard.id,e)} style={{ width:44, borderRadius:12, background:isFav?'rgba(224,48,32,0.12)':'rgba(255,255,255,0.7)', border:`1px solid ${isFav?'rgba(224,48,32,.3)':'var(--border)'}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={isFav?'#E03020':'none'} stroke={isFav?'#E03020':'#86868B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                    </button>
                  </div>

                  {/* CTA page complete (mis en avant) */}
                  {/* Un scelle n'a pas de fiche catalogue : le lien pointait sur l'UUID
                      de la ligne portfolio -> /api/spotlight reconstruisait
                      'fr-sm12-SEALED', absent de k_cards_export = fiche vide. */}
                  {/* Scelle : la fiche est le panneau de la page Scelles, desormais
                      adressable par ?p=<cle>. La cle se reconstruit comme dans le
                      pipeline de valorisation : lang-set-sku (type = card_type). */}
                  <a href={isSealed(spotCard)
                    ? `/cartes/scelles?p=${encodeURIComponent(String(spotCard.lang).toLowerCase() + '-' + (spotCard.setId || '') + '-' + (spotCard.type || ''))}`
                    : `/cartes/${encodeURIComponent(cleanId)}`}
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:16, padding:'15px 18px', borderRadius:13, background:'#1D1D1F', color:'#fff', textDecoration:'none', fontSize:14.5, fontWeight:700, fontFamily:'var(--font-display)', boxShadow:'0 6px 18px rgba(0,0,0,0.18)', transition:'all .18s cubic-bezier(.2,.8,.2,1)' }}
                    onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 10px 26px rgba(0,0,0,0.24)'; const a=e.currentTarget.querySelector('.kc-cta-arrow') as HTMLElement|null; if(a) a.style.transform='translateX(3px)' }}
                    onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 6px 18px rgba(0,0,0,0.18)'; const a=e.currentTarget.querySelector('.kc-cta-arrow') as HTMLElement|null; if(a) a.style.transform='none' }}>
                    {isSealed(spotCard) ? 'Voir le produit' : 'Voir la fiche complète'}
                    <span className="kc-cta-arrow" style={{ display:'inline-flex', transition:'transform .18s cubic-bezier(.2,.8,.2,1)' }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </span>
                  </a>
                </div>
              </div>
            </div>,
            document.body
          )
        })()}

        
        {/* Retour en haut */}
        {view==='binder'&&binderSet&&binderSet!=='__all__'&&(
          <button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} className="scrolltop-fab" style={{ position:'fixed', bottom:'96px', right:'22px', width:'44px', height:'44px', borderRadius:'50%', background:'#1D1D1F', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(0,0,0,.15)', zIndex:30, transition:'all .2s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.2)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.15)'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
          </button>
        )}

        {/* SHOWCASE PICKER */}
        {showPickerForShowcase&&(
          <div style={{ position:'fixed', inset:0, background:'rgba(20,15,10,0.35)', backdropFilter:'blur(12px) saturate(150%)', WebkitBackdropFilter:'blur(12px) saturate(150%)', zIndex:48, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }} onClick={()=>{setShowPickerForShowcase(false);setVitrineSearch('');setVitrineFilter('all')}}>
            <div style={{
              background:'rgba(255,255,255,0.78)',
              backdropFilter:'blur(28px) saturate(180%)',
              WebkitBackdropFilter:'blur(28px) saturate(180%)',
              borderRadius:24,
              padding:0,
              maxWidth:560,
              width:'100%',
              animation:'fadeUp .25s ease-out',
              maxHeight:'85vh',
              display:'flex', flexDirection:'column' as const,
              overflow:'hidden',
              boxShadow:'0 24px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95), 0 0 0 1px rgba(0,0,0,0.04)',
              position:'relative',
            }} onClick={e=>e.stopPropagation()}>
              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'22px 24px 16px', flexShrink:0 }}>
                <div>
                  <div style={{ fontSize:17, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-0.2px', lineHeight:1.2 }}>Choisis tes pieces maitresses</div>
                  <div style={{ fontSize:11, color:'#86868B', marginTop:4, fontFamily:'var(--font-display)' }}>
                    <span style={{ fontWeight:700, color:'#1D1D1F' }}>{showcase.length}/5</span> exposees · {5-showcase.length} restantes
                  </div>
                </div>
                <button onClick={()=>setShowPickerForShowcase(false)} style={{
                  width:30, height:30, borderRadius:'50%',
                  background:'rgba(255,255,255,0.6)',
                  backdropFilter:'blur(8px)',
                  WebkitBackdropFilter:'blur(8px)',
                  border:'1px solid rgba(229,229,234,0.7)',
                  color:'#48484A',
                  cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                  boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
                }}
                  onMouseEnter={e=>{ e.currentTarget.style.background='#1D1D1F'; e.currentTarget.style.color='#fff'; e.currentTarget.style.transform='scale(1.05)' }}
                  onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.6)'; e.currentTarget.style.color='#48484A'; e.currentTarget.style.transform='' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              {(()=>{
                const available = portfolioCards.filter(c=>!showcase.find(sc=>sc.id===c.id))
                const filtered = available.filter(c=>{
                  const matchSearch = !vitrineSearch || String(c.name ?? '').toLowerCase().includes(vitrineSearch.toLowerCase()) || String(c.set ?? '').toLowerCase().includes(vitrineSearch.toLowerCase())
                  const RARE_SET = ['Alt Art','Secret Rare','Gold Star','Ultra Rare','Illustration Rare','Special Art Rare']
                  const matchFilter = vitrineFilter==='all'
                    || vitrineFilter==='top'
                    || (vitrineFilter==='rare' && c.rarity && RARE_SET.includes(c.rarity))
                    || (vitrineFilter==='graded' && c.graded)
                    || (vitrineFilter==='fr' && c.lang==='FR')
                    || (vitrineFilter==='vintage' && c.year && c.year < 2010)
                  return matchSearch && matchFilter
                }).sort((a,b)=>{
                  // Top valeur = tri par prix decroissant
                  if (vitrineFilter==='top') return (b.curPrice||0) - (a.curPrice||0)
                  return 0
                })
                return available.length===0?(
                <div style={{ textAlign:'center', padding:'60px 32px', display:'flex', flexDirection:'column' as const, alignItems:'center', gap:14 }}>
                  <div style={{ width:56, height:56, borderRadius:16, background:'rgba(245,245,247,0.7)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(229,229,234,0.7)' }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#48484A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                  </div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)' }}>Vitrine complete</div>
                  <div style={{ fontSize:12, color:'#86868B', maxWidth:280, lineHeight:1.5, fontFamily:'var(--font-body)' }}>Toutes tes cartes sont déjà exposées. Retire d&apos;abord une pièce pour en ajouter une autre.</div>
                </div>
              ):(
                <>
                {/* Search + filters glass */}
                <div style={{ padding:'8px 20px 0', flexShrink:0 }}>
                  <div style={{ position:'relative', marginBottom:12 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="2" strokeLinecap="round" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <input value={vitrineSearch} onChange={e=>setVitrineSearch(e.target.value)} placeholder="Rechercher une carte..."
                      style={{
                        width:'100%', height:42,
                        padding:'0 14px 0 38px',
                        borderRadius:12,
                        border:'1px solid rgba(229,229,234,0.7)',
                        background:'rgba(255,255,255,0.7)',
                        backdropFilter:'blur(12px) saturate(180%)',
                        WebkitBackdropFilter:'blur(12px) saturate(180%)',
                        fontSize:13, color:'#1D1D1F',
                        fontFamily:'var(--font-display)',
                        outline:'none', boxSizing:'border-box' as const,
                        boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
                        transition:'all .2s',
                      }}
                      onFocus={e=>{ e.currentTarget.style.borderColor='rgba(29,29,31,0.5)'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(29,29,31,0.06), inset 0 1px 0 rgba(255,255,255,0.95)' }}
                      onBlur={e=>{ e.currentTarget.style.borderColor='rgba(229,229,234,0.7)'; e.currentTarget.style.boxShadow='0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)' }}/>
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                    {[{k:'all',l:'Toutes'},{k:'top',l:'Top valeur'},{k:'rare',l:'Rares'},{k:'graded',l:'Gradées'},{k:'fr',l:'Françaises'},{k:'vintage',l:'Vintage'}].map(f=>(
                      <button key={f.k} onClick={()=>setVitrineFilter(f.k)} style={{
                        padding:'6px 13px',
                        borderRadius:99,
                        border: vitrineFilter===f.k ? '1px solid #1D1D1F' : '1px solid rgba(229,229,234,0.7)',
                        background: vitrineFilter===f.k ? '#1D1D1F' : 'rgba(255,255,255,0.7)',
                        backdropFilter: vitrineFilter===f.k ? 'none' : 'blur(12px) saturate(180%)',
                        WebkitBackdropFilter: vitrineFilter===f.k ? 'none' : 'blur(12px) saturate(180%)',
                        color: vitrineFilter===f.k ? '#fff' : '#48484A',
                        fontSize:10.5, fontWeight:700,
                        cursor:'pointer',
                        fontFamily:'var(--font-display)',
                        letterSpacing:'0.04em',
                        transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                        boxShadow: vitrineFilter===f.k ? '0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12)' : '0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
                      }}>
                        {f.l}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize:10, color:'#86868B', fontFamily:'var(--font-display)', padding:'4px 0 8px', letterSpacing:'0.05em' }}>
                    <span style={{ fontWeight:700, color:'#1D1D1F' }}>{filtered.length}</span> carte{filtered.length!==1?'s':''} disponible{filtered.length!==1?'s':''}
                  </div>
                </div>
                <div className="kpicker-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, padding:'8px 20px 20px', overflowY:'auto' as const }}>
                  {filtered.slice(0,18).map(card=>{
                    const ec2=EC[card.type]??'#888'
                    return (
                      <div key={card.id} onClick={()=>addToShowcase(card)} style={{
                        borderRadius:14,
                        overflow:'hidden',
                        cursor:'pointer',
                        background:'rgba(255,255,255,0.7)',
                        backdropFilter:'blur(12px) saturate(180%)',
                        WebkitBackdropFilter:'blur(12px) saturate(180%)',
                        border:'1px solid rgba(229,229,234,0.6)',
                        boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
                        transition:'all .25s cubic-bezier(.22,.68,0,1.1)',
                      }}
                        onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 12px 28px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.95), 0 0 0 1px rgba(29,29,31,0.4)'; e.currentTarget.style.borderColor='rgba(29,29,31,0.4)' }}
                        onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)'; e.currentTarget.style.borderColor='rgba(229,229,234,0.6)' }}>
                        {card.image?(
                          <img src={cleanImageUrl(card.image)} alt={card.name}
                            loading="lazy"
                            style={{ width:'100%', aspectRatio:'63/88', ...kthumbFit(card), display:'block' }}
                            onError={e=>{ const t=e.target as HTMLImageElement; t.onerror=null; t.style.display='none' }}/>
                        ):(
                          <div style={{ width:'100%', aspectRatio:'63/88', background:`linear-gradient(145deg,${ec2}15,${ec2}06)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <div style={{ width:24, height:24, borderRadius:'50%', background:ec2, opacity:.4 }}/>
                          </div>
                        )}
                        <div style={{ padding:'10px 10px 12px' }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', letterSpacing:'-0.1px' }}>{card.name}</div>
                          <div style={{ fontSize:9, color:'#86868B', marginTop:2, fontFamily:'var(--font-display)' }}>{card.set}</div>
                          {card.curPrice>0&&<div style={{ fontSize:11, fontWeight:800, color:'#1D1D1F', fontFamily:'var(--font-data)', marginTop:5, letterSpacing:'-0.2px' }}>{card.curPrice} EUR</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
                </>
              )
              })()}
            </div>
          </div>
        )}

                {/* ADD CARD MODAL */}
        {addOpen&&(
          <div style={{ position:'fixed', inset:0, background:'rgba(20,15,10,0.5)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }} onClick={()=>{ setAddOpen(false); setAddSuggs([]); setNameValidated(false); setAddedInSession(0) }}>
            <div className='add-modal' style={{ background:'rgba(255,255,255,0.62)', backdropFilter:'blur(32px) saturate(180%)', WebkitBackdropFilter:'blur(32px) saturate(180%)', borderRadius:26, padding:26, maxWidth:540, width:'100%', animation:'fadeUp .25s ease-out', maxHeight:'94vh', overflowY:'auto' as const, boxShadow:'0 30px 80px rgba(0,0,0,0.22), 0 10px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.95), 0 0 0 1px rgba(0,0,0,0.05)', border:'none' }} onClick={e=>e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px' }}>
                <div>
                  <div style={{ fontSize:'17px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)' }}>Ajouter</div>
                  <div style={{ fontSize:'10px', marginTop:'3px', color:'#AEAEB2', fontWeight:500 }}>* champs obligatoires</div>
                </div>
                <button onClick={()=>{ setAddOpen(false); setAddSuggs([]); setNameValidated(false); setAddedInSession(0) }} style={{
                  width:30, height:30, borderRadius:'50%',
                  background:'rgba(255,255,255,0.6)',
                  backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
                  border:'1px solid rgba(229,229,234,0.7)',
                  color:'#48484A',
                  cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                  boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
                }}
                  onMouseEnter={e=>{e.currentTarget.style.background='#1D1D1F';e.currentTarget.style.color='#fff';e.currentTarget.style.transform='scale(1.05)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.6)';e.currentTarget.style.color='#48484A';e.currentTarget.style.transform=''}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div style={{ display:'flex', gap:6, marginBottom:14 }}>
                {([['card','Carte'],['sealed','Scelle']] as const).map(([k,lbl])=>{
                  const on = k==='card'
                  return (
                    <button key={k} onClick={()=>{ setAddOpen(false); if(k==='sealed') setSealedPickOpen(true); else setCardPickOpen(true) }}
                      style={{ flex:1, padding:'10px 8px', borderRadius:10, border:'1px solid rgba(255,255,255,0.6)',
                        background: on ? 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)' : 'rgba(255,255,255,0.45)',
                        backdropFilter:'blur(12px) saturate(180%)', WebkitBackdropFilter:'blur(12px) saturate(180%)',
                        color: on ? '#1D1D1F' : '#48484A', fontSize:12.5, fontWeight:700, cursor:'pointer',
                        fontFamily:'var(--font-display)', transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                        boxShadow: on ? '0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)' : 'inset 0 1px 0 rgba(255,255,255,0.7)' }}>
                      {k==='sealed'?'Scell\u00E9':lbl}
                    </button>
                  )
                })}
              </div>

              <div style={{ marginBottom:'14px' }}>
                <div className="req-label">Langue *</div>
                <div style={{ display:'flex', gap:'6px' }}>
                  {([{k:'FR' as const,flag:'\u{1F1EB}\u{1F1F7}',label:'Francais'},{k:'EN' as const,flag:'\u{1F1FA}\u{1F1F8}',label:'English'},{k:'JP' as const,flag:'\u{1F1EF}\u{1F1F5}',label:'\u65E5\u672C\u8A9E'}]).map(l=>(
                    <button key={l.k} onClick={()=>setAddForm(p=>({...p,lang:l.k}))}
                      style={{
                        flex:1, padding:'11px 8px',
                        borderRadius:10,
                        border: '1px solid rgba(255,255,255,0.6)',
                        background: addForm.lang===l.k ? 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)' : 'rgba(255,255,255,0.45)',
                        backdropFilter: 'blur(12px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                        color: addForm.lang===l.k ? '#1D1D1F' : '#48484A',
                        fontSize:12, fontWeight:700,
                        cursor:'pointer',
                        fontFamily:'var(--font-display)',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                        transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                        boxShadow: addForm.lang===l.k ? '0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)' : 'inset 0 1px 0 rgba(255,255,255,0.7)',
                      }}
                      onMouseEnter={e=>{if(addForm.lang!==l.k){e.currentTarget.style.background='rgba(255,255,255,0.65)'}}}
                      onMouseLeave={e=>{if(addForm.lang!==l.k){e.currentTarget.style.borderColor='#E5E5EA';e.currentTarget.style.background='#fff'}}}>
                      <span style={{ fontSize:'16px' }}>{l.flag}</span>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:'12px' }}>
                <div className="req-label">Serie *</div>
                <div style={{ position:'relative' }}>
                  <select value={addForm.setId}
                    onChange={e=>{ const found=liveSets.find(x=>x.id===e.target.value); if(found) handleSetChange(found.id,found.name) }}
                    className={addForm.set?'req-field-ok':'req-field'}
                    style={{
                      width:'100%',
                      appearance:'none' as const,
                      background:'rgba(255,255,255,0.92)',
                      backdropFilter:'blur(20px) saturate(180%)',
                      WebkitBackdropFilter:'blur(20px) saturate(180%)',
                      borderRadius:12,
                      border:'1px solid rgba(0,0,0,0.08)',
                      padding:'12px 36px 12px 14px',
                      color: addForm.set ? '#1D1D1F' : '#86868B',
                      fontSize:13, fontWeight:500,
                      fontFamily:'var(--font-display)',
                      outline:'none', cursor:'pointer',
                      boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
                      backgroundImage:'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\'%3E%3Cpath d=\'M1 1L5 5L9 1\' stroke=\'%2348484A\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',
                      backgroundRepeat:'no-repeat',
                      backgroundPosition:'right 14px center',
                    }}>
                    <option value="">{setsLoading?'Chargement des séries…':'Sélectionner une série…'}</option>
                    {(() => {
                      const filteredRaw = filterCoreSets(liveSets)
                      const filtered = Array.from(new Map(filteredRaw.map(x => [x.id, x])).values())
                      const groups = groupSetsByEra(filtered)
                      return groups.map(g => (
                        <optgroup key={g.label} label={g.label}>
                          {g.sets.map(set => {
                            const displayName = addForm.lang === 'JP'
                              ? formatJPSetName(set, filtered)
                              : set.name + (frSetsMap[set.id] ? ' — ' + frSetsMap[set.id] : '')
                            return (
                              <option key={set.id} value={set.id} style={{background:'#fff',color:'#1D1D1F'}}>
                                {displayName}{set.total ? ' (' + set.total + ')' : ''}
                              </option>
                            )
                          })}
                        </optgroup>
                      ))
                    })()}
                  </select>
                  <div style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg></div>
                </div>
              </div>

              <div style={{ marginBottom:'12px' }}>
                <div className="req-label">
                  Nom de la carte *
                  {addForm.set&&<span style={{ marginLeft:'6px', fontSize:'9px', color:'rgba(255,107,53,.5)', fontWeight:400 }}>{cardsLoading?'chargement…':liveCards.length>0?liveCards.length+' cartes':'encyclopédie'}</span>}
                </div>
                <div style={{ position:'relative' }}>
                  {nameValidated&&<div style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', zIndex:2, pointerEvents:'none' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E9E6A" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg></div>}
                  <input value={addForm.name} onChange={e=>handleNameInput(e.target.value)} onFocus={()=>{ if(liveCards.length>0) setAddSuggs(sortedLiveNames()) }} onBlur={()=>setTimeout(()=>setAddSuggs([]),150)}
                    placeholder={cardsLoading?'Chargement des cartes…':addForm.set?'Chercher dans '+addForm.set+' ('+liveCards.length+' cartes)…':'Nom de la carte…'}
                    className={addForm.name?'req-field-ok':'req-field'}
                    style={{
                      width:'100%',
                      background: nameValidated ? 'rgba(46,158,106,0.06)' : 'rgba(255,255,255,0.92)',
                      backdropFilter:'blur(20px) saturate(180%)',
                      WebkitBackdropFilter:'blur(20px) saturate(180%)',
                      borderRadius:12,
                      border: `1px solid ${nameValidated ? 'rgba(46,158,106,0.45)' : 'rgba(0,0,0,0.08)'}`,
                      padding: '12px 14px 12px '+(nameValidated ? '34px' : '14px'),
                      color:'#1D1D1F',
                      fontSize:13, fontWeight:500,
                      fontFamily:'var(--font-display)',
                      outline:'none',
                      boxSizing:'border-box' as const,
                      boxShadow: nameValidated ? '0 1px 2px rgba(46,158,106,0.08), inset 0 1px 0 rgba(255,255,255,0.85)' : '0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
                      transition:'all .2s',
                    }}/>
                  {addSuggs.length>0&&(
                    <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'rgba(255,255,255,0.92)', backdropFilter:'blur(24px) saturate(180%)', WebkitBackdropFilter:'blur(24px) saturate(180%)', border:'1px solid rgba(229,229,234,0.7)', borderRadius:14, overflow:'hidden', overflowY:'auto', maxHeight:'300px', zIndex:99, boxShadow:'0 12px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.95)' }}>
                      {addSuggs.map((s,i)=>(
                        <div key={i} onMouseDown={()=>handleSuggSelect(s)}
                          style={{ padding:'9px 14px', fontSize:'13px', color:'#3A3A3C', fontFamily:'var(--font-display)', cursor:'pointer', borderBottom:i<addSuggs.length-1?'1px solid rgba(29,29,31,.05)':'none', display:'flex', alignItems:'center', gap:'8px' }}
                          onMouseEnter={e=>(e.currentTarget.style.background='#F0F0F5')}
                          onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                          <span>{s}</span>
                          {(()=>{ const lc=liveCards.find(c=>c.name===s); return lc?.localId?<span style={{ marginLeft:'auto', fontSize:'11px', color:'#AEAEB2', fontFamily:'var(--font-mono, monospace)' }}>#{lc.localId}</span>:null })()}
                          {addForm.lang==='JP'&&(()=>{
                            const lc=liveCards.find(c=>c.name===s)
                            const frName=lc?.localId?frCardsMap['__id__'+lc.localId]:null
                            return frName?<span style={{ fontSize:'11px', color:'#AEAEB2', fontStyle:'italic' }}>{frName}</span>:null
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>



              <div style={{ marginBottom:'14px' }}>
                <div className="opt-label">Etat</div>
                {/* Segmented control iOS-style */}
                <div style={{ display:'flex', background:'rgba(0,0,0,0.04)', borderRadius:12, padding:3, marginBottom: addForm.graded ? 12 : 0, boxShadow:'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
                  {([{k:'Raw',l:'Raw'},{k:'__graded__',l:'Grade'}] as const).map(opt=>{
                    const active = opt.k==='__graded__' ? addForm.graded : !addForm.graded
                    return (
                      <button key={opt.k} onClick={()=>handleConditionChange(opt.k)}
                        style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background: active ? 'rgba(255,255,255,0.95)' : 'transparent', backdropFilter: active ? 'blur(12px) saturate(180%)' : 'none', WebkitBackdropFilter: active ? 'blur(12px) saturate(180%)' : 'none', color: active ? '#1D1D1F' : '#86868B', fontSize:12, fontWeight: active ? 700 : 500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .2s cubic-bezier(.2,.85,.3,1)', boxShadow: active ? '0 2px 6px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95)' : 'none' }}
                        onMouseEnter={e=>{if(!active)e.currentTarget.style.color='#48484A'}}
                        onMouseLeave={e=>{if(!active)e.currentTarget.style.color='#86868B'}}>
                        {opt.l}
                      </button>
                    )
                  })}
                </div>
                {/* Etat de conservation (raw uniquement) — alimente la valo par etat kodo_state */}
                {!addForm.graded && addForm.condition !== 'Scelle' && (
                  <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', marginBottom:'4px' }}>
                    {['Near Mint','Excellent','Lightly Played','Moderately Played','Heavily Played','Damaged'].map(st=>{
                      const sel = addForm.condition === st || (st === 'Near Mint' && addForm.condition === 'Raw')
                      return (
                        <button key={st} onClick={()=>handleConditionChange(st)}
                          style={{ padding:'6px 11px', borderRadius:'8px', border:`1px solid ${sel?'#1D1D1F':'#E5E5EA'}`, background:sel?'#1D1D1F':'#fff', color:sel?'#fff':'#48484A', fontSize:'11px', fontWeight:sel?700:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .1s' }}
                          onMouseEnter={e=>{if(!sel){e.currentTarget.style.borderColor='#C7C7CC';e.currentTarget.style.background='#F5F5F7'}}}
                          onMouseLeave={e=>{if(!sel){e.currentTarget.style.borderColor='#E5E5EA';e.currentTarget.style.background='#fff'}}}>
                          {st}
                        </button>
                      )
                    })}
                  </div>
                )}
                {/* Grade selector */}
                {addForm.graded&&(
                  <div style={{ background:'#F5F5F7', borderRadius:'12px', padding:'12px' }}>
                    <div style={{ display:'flex', gap:'6px', marginBottom:'10px' }}>
                      {GRADE_COMPANIES.map(company=>{
                        const isActive = addForm.condition.startsWith(company.label+' ')
                        return (
                          <button key={company.label} onClick={()=>handleConditionChange(company.label+' 10')}
                            style={{ flex:1, padding:'7px 4px', borderRadius:'8px', border:`1.5px solid ${isActive?'#1D1D1F':'#E5E5EA'}`, background:isActive?'#1D1D1F':'#fff', color:isActive?'#fff':'#86868B', fontSize:'10px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .12s', letterSpacing:'.02em' }}
                            onMouseEnter={e=>{if(!isActive){e.currentTarget.style.borderColor='#C7C7CC';e.currentTarget.style.background='#F5F5F7'}}}
                            onMouseLeave={e=>{if(!isActive){e.currentTarget.style.borderColor='#E5E5EA';e.currentTarget.style.background='#fff'}}}>
                            {company.label}
                          </button>
                        )
                      })}
                    </div>
                    {/* Note selector */}
                    {(()=>{
                      const activeCompany = GRADE_COMPANIES.find(c=>addForm.condition.startsWith(c.label+' '))
                      if (!activeCompany) return null
                      const curVal = addForm.condition.replace(activeCompany.label+' ','')
                      return (
                        <div>
                          <div style={{ fontSize:'9px', color:'#86868B', fontFamily:'var(--font-display)', marginBottom:'6px' }}>Note {activeCompany.label}</div>
                          <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                            {activeCompany.grades.map(g=>{
                              const shortG = g.replace(activeCompany.label+' ','')
                              const isSel = curVal===shortG
                              return (
                                <button key={g} onClick={()=>handleConditionChange(activeCompany.label+' '+shortG)}
                                  style={{ padding:'6px 10px', borderRadius:'8px', border:`1px solid ${isSel?'#1D1D1F':'#E5E5EA'}`, background:isSel?'#1D1D1F':'#fff', color:isSel?'#fff':'#48484A', fontSize:'11px', fontWeight:isSel?700:500, cursor:'pointer', fontFamily:'var(--font-data)', transition:'all .1s', minWidth:'36px' }}
                                  onMouseEnter={e=>{if(!isSel){e.currentTarget.style.borderColor='#C7C7CC';e.currentTarget.style.background='#F5F5F7'}}}
                                  onMouseLeave={e=>{if(!isSel){e.currentTarget.style.borderColor='#E5E5EA';e.currentTarget.style.background='#fff'}}}>
                                  {shortG}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Prix + Quantité */}

              <div style={{ display:'flex', gap:'10px', marginBottom:'14px', alignItems:'flex-start' }}>
                {/* Prix */}
                <div style={{ flex:1 }}>
                  <div className="opt-label">Prix d'achat</div>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'13px', color:'#AEAEB2', fontFamily:'var(--font-data)', pointerEvents:'none' }}>EUR</span>
                    <input type="number" value={addForm.buyPrice} onChange={e=>setAddForm(p=>({...p,buyPrice:e.target.value}))}
                      placeholder="0.00"
                      style={{
                      width:'100%',
                      background:'rgba(255,255,255,0.92)',
                      backdropFilter:'blur(20px) saturate(180%)',
                      WebkitBackdropFilter:'blur(20px) saturate(180%)',
                      borderRadius:12,
                      border:'1px solid rgba(0,0,0,0.08)',
                      padding:'12px 14px 12px 44px',
                      color:'#1D1D1F',
                      fontSize:16, fontWeight:600,
                      fontFamily:'var(--font-data)',
                      outline:'none',
                      boxSizing:'border-box' as const,
                      boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
                      transition:'all .2s',
                    }}/>
                  </div>
                  <div style={{ fontSize:'9px', color:'#AEAEB2', marginTop:'4px', fontFamily:'var(--font-display)' }}>{show.pnl ? 'Optionnel — permet le calcul du ROI' : 'Optionnel — pour garder une trace de tes acquisitions'}</div>
                </div>
                {/* Quantité */}
                <div style={{ width:'120px', flexShrink:0 }}>
                  <div className="opt-label">Quantite</div>
                  <div style={{ display:'flex', alignItems:'center', background:'rgba(255,255,255,0.92)', backdropFilter:'blur(20px) saturate(180%)', WebkitBackdropFilter:'blur(20px) saturate(180%)', borderRadius:12, border:'1px solid rgba(0,0,0,0.08)', overflow:'hidden', boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
                    <button onClick={()=>setAddForm(p=>({...p,qty:Math.max(1,p.qty-1)}))} style={{ width:'36px', height:'38px', background:'transparent', border:'none', borderRight:'1px solid #E5E5EA', color:addForm.qty>1?'#1D1D1F':'#AEAEB2', fontSize:'16px', cursor:addForm.qty>1?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center' }}
                      onMouseEnter={e=>{if(addForm.qty>1)e.currentTarget.style.background='#EDEDF0'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>
                    </button>
                    <div style={{ flex:1, textAlign:'center', fontSize:'16px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-data)' }}>{addForm.qty}</div>
                    <button onClick={()=>setAddForm(p=>({...p,qty:Math.min(99,p.qty+1)}))} style={{ width:'36px', height:'38px', background:'transparent', border:'none', borderLeft:'1px solid #E5E5EA', color:'#1D1D1F', fontSize:'16px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#EDEDF0'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                  </div>
                  <div style={{ height:'13px' }} aria-hidden="true" />
                </div>
              </div>

              {!canAdd&&(
                <div style={{ display:'flex', alignItems:'center', gap:'7px', padding:'9px 12px', borderRadius:'9px', background:'rgba(0,0,0,.012)', border:'1px solid rgba(255,107,53,.2)', marginBottom:'12px' }}>
                  <span style={{ fontSize:'11px', color:'#EA580C', fontFamily:'var(--font-display)' }}>
                    {!addForm.set?'Sélectionnez une série':!addForm.name?'Renseignez le nom':!nameValidated?'Sélectionnez une carte dans la liste':''}
                    {' '}pour activer le bouton
                  </span>
                </div>
              )}

              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={addCard} disabled={!canAdd}
                  style={{
                    flex:1, padding:'14px 18px',
                    borderRadius:12,
                    background: canAdd ? '#1D1D1F' : 'rgba(0,0,0,0.05)',
                    color: canAdd ? '#fff' : '#AEAEB2',
                    border:'none',
                    fontSize:14, fontWeight:700,
                    cursor: canAdd ? 'pointer' : 'default',
                    fontFamily:'var(--font-display)',
                    transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                    letterSpacing:'0.02em',
                    boxShadow: canAdd ? '0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12)' : 'none',
                  }}
                  onMouseEnter={e=>{ if(canAdd){ e.currentTarget.style.background='#000'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)' } }}
                  onMouseLeave={e=>{ if(canAdd){ e.currentTarget.style.background='#1D1D1F'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12)' } }}>
                  Ajouter {addForm.qty>1?addForm.qty+' exemplaires':'au portfolio'}
                </button>
                <button onClick={()=>{ setAddOpen(false); setAddSuggs([]); setNameValidated(false); setAddedInSession(0) }}
                  style={{
                    padding:'14px 22px',
                    borderRadius:12,
                    background: addedInSession>0 ? '#1D1D1F' : 'rgba(255,255,255,0.7)',
                    backdropFilter:'blur(12px) saturate(180%)',
                    WebkitBackdropFilter:'blur(12px) saturate(180%)',
                    color: addedInSession>0 ? '#fff' : '#48484A',
                    border: addedInSession>0 ? 'none' : '1px solid rgba(229,229,234,0.7)',
                    fontSize:14, fontWeight:600,
                    cursor:'pointer',
                    fontFamily:'var(--font-display)',
                    transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                    boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
                    whiteSpace:'nowrap',
                  }}
                  onMouseEnter={e=>{ if(addedInSession===0){ e.currentTarget.style.background='rgba(255,255,255,0.95)'; e.currentTarget.style.color='#1D1D1F' } }}
                  onMouseLeave={e=>{ if(addedInSession===0){ e.currentTarget.style.background='rgba(255,255,255,0.7)'; e.currentTarget.style.color='#48484A' } }}>
                  {addedInSession>0 ? `Terminer (${addedInSession})` : 'Annuler'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div style={{ position:'relative', zIndex:1, padding:'8px 0 12px' }}>
          <style>{`@media (max-width: 768px){.kc-hide-sparkline-sm{display:none !important}}`}</style>
          <div style={{
            // Glass v5 card pour le hero du portfolio
            background: 'rgba(255,255,255,0.62)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderRadius: 18,
            border: 'none',
            boxShadow: '0 4px 24px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)',
            padding: '20px 26px 18px',
            marginBottom: 14,
            position: 'relative' as const,
            overflow: 'hidden' as const,
          }}
          onMouseMove={e=>{
            const el = e.currentTarget.querySelector('.hd-wall') as HTMLElement | null
            if (!el) return
            const r = e.currentTarget.getBoundingClientRect()
            const x = (e.clientX - r.left) / r.width - .5
            const y = (e.clientY - r.top) / r.height - .5
            el.style.setProperty('--px', (x * 22).toFixed(1) + 'px')
            el.style.setProperty('--py', (y * 14).toFixed(1) + 'px')
          }}
          onMouseLeave={e=>{
            const el = e.currentTarget.querySelector('.hd-wall') as HTMLElement | null
            if (el) { el.style.setProperty('--px','0px'); el.style.setProperty('--py','0px') }
          }}>
          {/* Le mur VIVANT : SA collection derive lentement, deux rangees a des
              vitesses differentes (parallaxe naturelle) et repond au curseur.
              PAS de gap : avec 2n cartes il y a 2n-1 intervalles, donc -50%
              tomberait a cote du raccord. marginRight sur chaque carte ->
              largeur exacte, boucle sans couture. */}
          {!show.pnl && portfolioCards.length > 0 && (
            <div aria-hidden className="hd-wall" style={{
              position:'absolute', inset:'-58% -8%', pointerEvents:'none', zIndex:0,
              display:'flex', flexDirection:'column', gap:'11px', justifyContent:'center',
              transform:'rotate(-7deg)', transformOrigin:'center',
              maskImage:'linear-gradient(100deg, transparent 0%, transparent 26%, rgba(0,0,0,.5) 42%, rgba(0,0,0,.92) 58%, rgba(0,0,0,.5) 84%, transparent 97%)',
              WebkitMaskImage:'linear-gradient(100deg, transparent 0%, transparent 26%, rgba(0,0,0,.5) 42%, rgba(0,0,0,.92) 58%, rgba(0,0,0,.5) 84%, transparent 97%)',
              animation:'wallIn 1.2s cubic-bezier(.2,.85,.3,1) both',
            }}>
              {/* L'eclat : les cartes accrochent la lumiere, comme quand on les
                  incline. Passage lent et espace — un reflet, pas un gyrophare. */}
              <span className="hd-sheen" aria-hidden />
              {[0, 1].map(row => (
                <div key={'row'+row} className={'hd-row hd-row-'+row} style={{
                  display:'flex', justifyContent:'flex-start',
                  // flex-end collait le contenu a droite : comme il est plus large
                  // que le cadre, il debordait a GAUCHE et l'animation le poussait
                  // encore plus loin -> plus rien a droite. On part de la gauche.
                  marginLeft: row === 1 ? '-59px' : '0',
                  width: 'max-content',
                }}>
                  {Array.from({ length: 48 }).map((_, i) => {
                    const c: any = portfolioCards[wallPick(i % 24, row)]
                    const src = c?.image ? cleanImageUrl(c.image) : ''
                    return (
                      <div key={'wm'+row+'-'+i} style={{
                        flex:'0 0 108px', width:'108px', height:'151px',
                        marginRight:'11px',
                        borderRadius:'9px', overflow:'hidden',
                        boxShadow:'0 8px 22px rgba(20,20,40,.16)',
                        background:'#E9E9EE',
                      }}>
                        {src ? (
                          <img src={src} alt="" loading="lazy"
                            style={{ width:'100%', height:'100%', ...kthumbFit(c), display:'block' }}
                            onError={e=>{(e.target as HTMLImageElement).style.visibility='hidden'}} />
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
          <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'16px', marginBottom:'14px', flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:'10px', fontWeight:600, color:'#6E6E73', textTransform:'uppercase' as const, letterSpacing:'.15em', fontFamily:'var(--font-display)', marginBottom:'6px', display:'flex', alignItems:'center', gap:6 }} className='section-reveal'>
                <span style={{ display:'inline-block', width:3, height:10, background:'#1D1D1F', borderRadius:2 }} />
                {labels.portfolio}
              </div>
              {show.pnl ? (
                <div className={"value-hero" + (valuePulse ? " price-pulse" : "")} style={{ fontSize:'clamp(26px, 7.5vw, 38px)', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-1.5px', lineHeight:1, display:'flex', alignItems:'baseline', gap:'6px' }}>
                  {portfolio.length>0 ? (
                    <>
                    <AnimatedTotal target={totalCur} ready={!pricesLoading} />
                    {!pricesLoading && coverage.pct < 100 && coverage.tot > 0 && (
                      <div
                        title={(coverage.tot - coverage.cotes) + ' carte(s) sans cote disponible — le total ne les compte pas.'}
                        style={{
                          marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 11, fontWeight: 600, color: '#86868B',
                          fontFamily: 'var(--font-display)', cursor: 'help',
                          letterSpacing: 'normal', wordSpacing: 'normal',
                          whiteSpace: 'nowrap',
                        }}>
                        <span style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: coverage.pct >= 90 ? '#1D9E75' : coverage.pct >= 70 ? '#D4A017' : '#AEAEB2',
                        }} />
                        <span>{coverage.pct}% de ta collection cotée</span>
                      </div>
                    )}
                    </>
                  ) : <span style={{ color:'#C7C7CC' }}>---</span>}
                </div>
              ) : (
                <div className="value-hero" style={{ fontSize:'38px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-1.5px', lineHeight:1, display:'flex', alignItems:'baseline', gap:'8px' }}>
                  {portfolio.length>0 ? (
                    <>
                      <span><CountUpQty to={totalQty} /></span>
                      <span style={{ fontSize:'17px', fontWeight:500, color:'#86868B', letterSpacing:'0' }}>pièce{totalQty!==1?'s':''}</span>
                    </>
                  ) : <span style={{ color:'#C7C7CC' }}>---</span>}
                </div>
              )}
              <div className="value-hero-sub" style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'8px', flexWrap:'wrap' }}>
                {show.pnl&&portfolio.length>0&&totalBuy>0&&<span style={{ fontSize:'14px', fontWeight:600, color:totalGain>=0?'#2E9E6A':'#E03020', background:totalGain>=0?'rgba(46,158,106,.08)':'rgba(224,48,32,.08)', padding:'3px 10px', borderRadius:'99px' }}>{totalGain>=0?'+':''}{totalROI}% · {totalGain>=0?'+':''}EUR {totalGain.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>}
                {portfolio.length>0&&(()=>{
                  const nSets = [...new Set(portfolio.map(c=>c.set))].length
                  if (show.pnl) return <span style={{ fontSize:'13px', color:'#86868B', fontFamily:'var(--font-display)' }}>{nSets} {isInvestor ? (nSets!==1?'sets':'set') : (nSets!==1?'séries':'série')}</span>

                  // Collectionneur : ce dont il est fier, pas ce que ca vaut.
                  const graded = portfolio.reduce((n,c)=>n+((c as any).graded?(Number(c.qty)||1):0),0)
                  const langs = [...new Set(portfolio.map(c=>c.lang).filter(Boolean))]

                  const chips: { n: string; l: string; tint?: string }[] = []
                  chips.push({ n: String(nSets), l: nSets>1 ? 'séries' : 'série' })
                  if (eraCount>0) chips.push({ n: String(eraCount), l: eraCount>1 ? 'ères' : 'ère' })
                  if (graded>0) chips.push({ n: String(graded), l: graded>1 ? 'gradées' : 'gradée', tint: '#C9A227' })

                  return (
                    <span style={{ display:'inline-flex', alignItems:'center', gap:'7px', flexWrap:'wrap' }}>
                      {chips.map((c,i)=>(
                        <span key={c.l} style={{
                          display:'inline-flex', alignItems:'baseline', gap:'5px',
                          padding:'5px 11px', borderRadius:'999px',
                          background: c.tint ? c.tint+'14' : 'rgba(0,0,0,0.04)',
                          border: '1px solid ' + (c.tint ? c.tint+'2E' : 'rgba(0,0,0,0.05)'),
                          animation:`cardIn .5s ${0.06*i}s cubic-bezier(.2,.85,.3,1) both`,
                        }}>
                          <strong style={{ fontSize:'13.5px', fontWeight:800, color: c.tint || '#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-.02em' }}>{c.n}</strong>
                          <span style={{ fontSize:'11.5px', fontWeight:600, color:'#86868B', fontFamily:'var(--font-display)' }}>{c.l}</span>
                        </span>
                      ))}
                      {langs.length>0&&(
                        <span style={{
                          display:'inline-flex', alignItems:'center', gap:'6px',
                          padding:'5px 11px', borderRadius:'999px',
                          background:'rgba(0,0,0,0.04)', border:'1px solid rgba(0,0,0,0.05)',
                          animation:`cardIn .5s ${0.06*chips.length}s cubic-bezier(.2,.85,.3,1) both`,
                        }}>
                          {langs.map(l=>(
                            <span key={l} style={{ fontSize:'11px', fontWeight:700, color:'#6E6E73', fontFamily:'var(--font-display)', letterSpacing:'.05em' }}>{l}</span>
                          ))}
                        </span>
                      )}
                    </span>
                  )
                })()}
                {portfolio.length===0&&<span style={{ fontSize:'13px', color:'#86868B' }}>Commence ta collection</span>}
              </div>
              {!isPro && portfolio.length > 0 && (() => {
                const used = totalQty
                const pctRaw = (used / FREE_CARD_LIMIT) * 100
                const pct = Math.min(100, pctRaw)
                const near = pctRaw >= 85
                const remaining = Math.max(0, FREE_CARD_LIMIT - used)
                const barColor = pctRaw >= 85 ? '#E03020' : pctRaw >= 75 ? '#F59E0B' : '#8E8E93'
                return (
                  <div style={{ marginTop: 14, width: 340, maxWidth: '100%' }}>
                    <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize:'11px', fontWeight:600, color:'#6E6E73', fontFamily:'var(--font-data)', letterSpacing:'.02em' }}>
                        {used} / {FREE_CARD_LIMIT} cartes
                      </span>
                      <span style={{ fontSize:'10px', fontWeight:600, color: barColor, fontFamily:'var(--font-data)' }}>
                        {Math.round(pctRaw)}%
                      </span>
                    </div>
                    <LiquidProgress pct={pct} color={barColor} height={8} />
                    {near && (
                      <a href="/abonnement" style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:8, fontSize:'12px', fontWeight:600, color:'#E03020', textDecoration:'none', fontFamily:'var(--font-display)' }}>
                        {remaining > 0 ? `Plus que ${remaining} carte${remaining !== 1 ? 's' : ''} — passe Pro pour l'illimité` : "Passe Pro pour un portfolio illimité"} →
                      </a>
                    )}
                  </div>
                )
              })()}
            </div>
            {show.pnl&&portfolio.length>0&&(
              <div className='header-sparkline kc-hide-sparkline-sm' style={{ flex:1, minWidth:0, maxWidth:580, display:'flex', flexDirection:'column' as const, justifyContent:'center', padding:'0 8px', overflow:'hidden' }}>
                <HeaderSparkline totalValue={totalCur} />
              </div>
            )}
            <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
              {show.pnl&&bestCard&&bestCard.buyPrice>0&&(
                <div style={{ background:'rgba(255,248,229,0.7)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', border:'1px solid rgba(212,175,55,0.25)', borderRadius:10, padding:'8px 14px' }}>
                  <div style={{ fontSize:10, color:'#8A6500', textTransform:'uppercase' as const, letterSpacing:'.08em', fontFamily:'var(--font-display)', marginBottom:4, fontWeight:600 }}>Meilleure perf.</div>
                  <div style={{ fontSize:18, fontWeight:700, color:'#8A6500', fontFamily:'var(--font-display)' }}>+{Math.round(((bestCard.curPrice-bestCard.buyPrice)/bestCard.buyPrice)*100)}%</div>
                  <div style={{ fontSize:10, color:'#6E6E73' }}>{bestCard.name}</div>
                </div>
              )}
              {!show.pnl&&bestByValue&&(
                <div className="kc-masterpiece" onClick={()=>{ setSpotCard(bestByValue); setEditQty(null) }} style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(253,247,236,0.86))', backdropFilter:'blur(22px) saturate(190%)', WebkitBackdropFilter:'blur(22px) saturate(190%)', border:'1px solid rgba(176,138,58,0.30)', boxShadow:'0 6px 20px rgba(120,90,20,0.13), 0 1px 3px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)', borderRadius:14, padding:'12px 18px 12px 12px', maxWidth:330, display:'flex', alignItems:'center', gap:14, cursor:'pointer', transition:'transform .22s cubic-bezier(.34,1.2,.64,1), box-shadow .22s ease' }}
                  onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 12px 30px rgba(120,90,20,0.16), inset 0 1px 0 rgba(255,255,255,0.9)' }}
                  onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 6px 20px rgba(120,90,20,0.13), 0 1px 3px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)' }}>
                  {/* La carte elle-meme : un collectionneur veut VOIR sa piece,
                      pas lire son nom. Halo dore diffus derriere = elle rayonne
                      au lieu d'etre posee. Retenue Snow+ : de la lumiere, pas de dorure. */}
                  <div aria-hidden style={{ position:'absolute', left:-30, bottom:-40, width:150, height:150, borderRadius:'50%', background:'radial-gradient(circle, rgba(212,175,55,0.30), rgba(212,175,55,0) 70%)', pointerEvents:'none' }} />
                  {cleanImageUrl(bestByValue.image) && (
                    <div style={{ position:'relative', flexShrink:0, width:88 }}>
                      <div aria-hidden style={{ position:'absolute', inset:-16, borderRadius:'50%', background:'radial-gradient(circle, rgba(196,150,60,0.28), rgba(196,150,60,0) 72%)', filter:'blur(10px)', pointerEvents:'none' }} />
                      <img src={cleanImageUrl(bestByValue.image)} alt={bestByValue.name} loading="lazy"
                        style={{ position:'relative', width:88, aspectRatio:'63/88', ...kthumbFit(bestByValue), borderRadius:7, display:'block', boxShadow:'0 8px 20px rgba(90,70,30,0.22), 0 2px 5px rgba(0,0,0,0.12)' }}
                        onError={e=>{ const t=e.target as HTMLImageElement; t.style.display='none' }} />
                    </div>
                  )}
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:9.5, color:'#8F6B22', textTransform:'uppercase' as const, letterSpacing:'.12em', fontFamily:'var(--font-display)', marginBottom:5, fontWeight:700 }}>Pièce maîtresse</div>
                    <div style={{ fontSize:15, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{bestByValue.name}</div>
                    <div style={{ fontSize:10, color:'#6E6E73', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{bestByValue.set}</div>
                  </div>
                </div>
              )}
              <GlassButton onClick={()=>{ setShareCtx('portfolio'); setShareCard(null); setShareOpen(true) }}
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>}>
                Partager
              </GlassButton>
            </div>
          </div>
          </div>
          <div style={{ display:'flex', gap:'6px', alignItems:'center', marginTop:14, flexWrap:'wrap' as const }}>
            {([['binder','Classeur'],['showcase','Vitrine'],['wrapped',`Wrapped ${new Date().getFullYear()}`]] as Array<[ViewMode,string]>).map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)} className={'vtab'+(view===v?' on':'')}>{l}</button>
            ))}
            {view==='binder' && portfolio.length>0 && (<>
              <span aria-hidden style={{ width:'1px', height:'20px', background:'rgba(0,0,0,0.09)', margin:'0 5px', flexShrink:0 }} />
              <div className="ksubrail">
                {[
                  { k:'all',    l:'Tout',        on:binderSet==='__all__'&&binderFilter==='all',    go:()=>{ setBinderSet('__all__'); setBinderFilter('all') } },
                  { k:'series', l:'Par séries', on:binderSet!=='__all__',                          go:()=>{ setBinderSet(null);      setBinderFilter('all') } },
                  { k:'graded', l:'Gradées',    on:binderSet==='__all__'&&binderFilter==='graded', go:()=>{ setBinderSet('__all__'); setBinderFilter('graded') } },
                  { k:'raw',    l:'Raw',         on:binderSet==='__all__'&&binderFilter==='raw',    go:()=>{ setBinderSet('__all__'); setBinderFilter('raw') } },
                  { k:'sealed', l:'Scellés',    on:binderSet==='__all__'&&binderFilter==='sealed', go:()=>{ setBinderSet('__all__'); setBinderFilter('sealed') } },
                ].map(t=>(
                  <button key={t.k} onClick={()=>{ t.go(); setBinderPage(0) }} className={'kseg'+(t.on?' on':'')}>{t.l}</button>
                ))}
              </div>
              <span aria-hidden style={{ flex:1, minWidth:'8px' }} />
              {binderSet!==null&&(()=>{
                const n=binderFilteredFinal.reduce((t,c)=>t+(c.qty||1),0)
                const neutre=binderFilter==='all'&&binderLangFilter==='all'&&binderSetFilter==='all'&&!setSearch
                return (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:'9px', flexShrink:0 }}>
                    <span style={{ fontSize:'11.5px', color:'#6E6E73', fontFamily:'var(--font-display)' }}>
                      <strong key={n} className="knum-pop" style={{ color:'#1D1D1F', fontWeight:700, fontFamily:'var(--font-data)' }}>{n.toLocaleString('fr-FR')}</strong>{' '}{neutre?'pi\u00e8ces':(n>1?'r\u00e9sultats':'r\u00e9sultat')}
                    </span>
                    {!neutre&&(
                      <button className="kreset" onClick={()=>{ setBinderFilter('all'); setBinderLangFilter('all'); setBinderSetFilter('all'); setSetSearch(''); setBinderPage(0) }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        {'R\u00e9initialiser'}
                      </button>
                    )}
                  </span>
                )
              })()}
            </>)}
          </div>
          {binderSet&&binderSet!=='__all__'&&view==='binder'&&(
            <div className="kdetail-hero" style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:'0', padding:'28px 0 20px', position:'relative' }}>
              <div className="kdetail-halo" style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'500px', height:'250px', borderRadius:'50%', background:'radial-gradient(ellipse, rgba(224,48,32,.07) 0%, rgba(255,107,53,.03) 35%, transparent 65%)', pointerEvents:'none' }}/>
              {setLogos[binderSet||'']&&(
                <img src={setLogos[binderSet||'']} alt={binderSet||''} className="kdetail-logo" style={{ height:'90px', maxWidth:'320px', objectFit:'contain', position:'relative', filter:'drop-shadow(0 4px 16px rgba(0,0,0,.10)) drop-shadow(0 2px 6px rgba(0,0,0,.05))' }}
                  onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
              )}
              {!setLogos[binderSet||'']&&(
                <div style={{ fontSize:'24px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', position:'relative' }}>{binderSet}</div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'12px', position:'relative' }}>
                <div style={{ height:'1px', width:'64px', background:'linear-gradient(to right, transparent, #AEAEB2)' }}/>
                <span style={{ fontSize:'14px', color:'#6E6E73', fontFamily:'var(--font-display)', letterSpacing:'.05em', fontWeight:500 }}>
                {binderFiltered.length} carte{binderFiltered.length!==1?'s':''}{(()=>{ const t=portfolio.filter(c=>c.set===binderSet); const sid=t.find(c=>c.setId)?.setId; const total=t[0]?.setTotal||(sid?setTotalsMap[sid]:0)||setTotalsMap[binderSet]||0; return total?' sur '+total+' • '+Math.round(binderFiltered.length/total*100)+'%':'' })()}
              </span>
                <div style={{ height:'1px', width:'64px', background:'linear-gradient(to left, transparent, #AEAEB2)' }}/>
              </div>
              <div style={{ marginTop:'12px', maxWidth:'320px', width:'100%', cursor:'pointer', position:'relative' }}
                onClick={()=>{
                  const sc=portfolio.filter(c=>c.set===binderSet)
                  const existingNums=new Set(sc.map(c=>c.number))
                  const toAdd=fullSetCards.filter(c=>!existingNums.has(c.localId||''))
                  if(toAdd.length===0){showToast('Série déjà complète');return}
                  const newCards:CardItem[]=toAdd.map(c=>({
                    id:crypto.randomUUID(),
                    name:c.name,set:binderSet||'',year:new Date().getFullYear(),
                    number:c.localId||'',rarity:c.rarity||'',
                    type:'fire',lang:sc[0]?.lang||'FR',
                    condition:'Near Mint',graded:false,
                    buyPrice:0,curPrice:0,qty:1,
                    image:c.image||undefined,
                    setId:sc[0]?.setId||'',setTotal:fullSetCards.length,
                  }))
                  if (guardLimit(newCards.length)) return
                  setPortfolio(prev=>[...prev,...newCards])
                  persistCards(newCards)
                  showToast(toAdd.length+' cartes ajoutées')
                }}>
                {(()=>{
                  const sc2=portfolio.filter(c=>c.set===binderSet)
                  const total2=fullSetCards.length||0
                  const owned2=sc2.length
                  const pct2=total2>0?Math.round(owned2/total2*100):0
                  const missing2=Math.max(0,total2-owned2)
                  if(total2===0) return null
                  if(missing2===0) return (
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                      <div style={{ position:'relative', overflow:'hidden', display:'inline-flex', alignItems:'center', gap:'8px', padding:'9px 22px', borderRadius:'99px', border:'0.5px solid rgba(255,255,255,0.7)', boxShadow:'0 4px 18px rgba(150,120,230,0.22), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
                        <div className="holo-header-bg" aria-hidden style={{ position:'absolute', inset:0, background:'linear-gradient(105deg, #ffc9e0, #c9dbff, #c9ffe9, #fff2c0, #e6c9ff, #ffc9e0)', backgroundSize:'200% 100%', opacity:0.78, pointerEvents:'none' }}/>
                        <div aria-hidden style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.28)', pointerEvents:'none' }}/>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="rgba(55,35,90,0.92)" style={{ position:'relative', zIndex:1 }}><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.5 6.8L12 17l-6 3.9 1.5-6.8L2.3 9.5l6.9-.6z"/></svg>
                        <span style={{ position:'relative', zIndex:1, fontSize:'13px', fontWeight:800, color:'rgba(50,32,82,0.95)', fontFamily:'var(--font-display)', letterSpacing:'.12em' }}>MASTER SET</span>
                      </div>
                    </div>
                  )
                  return (<>
                    <LiquidProgress pct={pct2} color={'#E03020'} height={10} />
                    <div style={{ fontSize:'10px',color:'#86868B',marginTop:'7px',textAlign:'right' as const,fontFamily:'var(--font-display)',fontWeight:500 }}>{'Il te manque '+missing2+' carte'+(missing2>1?'s':'')+' ›'}</div>
                  </>)
                })()}
              </div>
            </div>
          )}
        </div>

        {/* BINDER */}
        {view==='binder'&&(
          <div style={{ position:'relative', zIndex:1, padding:'0 20px 20px', animation:'fadeUp .3s ease-out' }}>
            <div style={{ background:'transparent', position:'relative' }}>

              <div style={{
                position:'relative',
                padding:'14px 18px 14px',
                marginBottom: 16,
                background: 'rgba(255,255,255,0.62)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                borderRadius: 14,
                border: 'none',
                boxShadow: '0 4px 24px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)',
              }}>
                <div className="kcollection-head" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                  <div className="kcollection-title" style={{ flex:1, minWidth:0 }}>
                    {binderSet===null&&(
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' as const }}>
                      <div style={{ position:'relative', flex:'1 1 160px', minWidth:'140px', maxWidth:'300px' }}>
                        <input type="text" placeholder="Rechercher une série" value={setSearch} onChange={e=>setSetSearch(e.target.value)} className="kctrl-field" style={{ width:'100%', paddingLeft:'31px', boxSizing:'border-box' as const }}/>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2.5" strokeLinecap="round" style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
                        {setSearch&&<button onClick={()=>setSetSearch('')} aria-label="Effacer" style={{ position:'absolute', right:'9px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#86868B', cursor:'pointer', fontSize:'14px', padding:0, lineHeight:1 }}>{String.fromCharCode(215)}</button>}
                      </div>
                    </div>
                    )}
                    {binderSet!==null&&(
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' as const }}>
                      {binderSet==='__all__'&&(
                        <div className="kfilt-serie" style={{ flexShrink:0 }}>
                          <KodoSelect ariaLabel="S\u00e9rie" heading={'S\u00e9rie'} searchable maxWidth={168} panelWidth={286}
                            value={binderSetFilter} onChange={v=>{setBinderSetFilter(v);setBinderPage(0)}}
                            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>}
                            options={[{ value:'all', label:'Toutes les s\u00e9ries', image:'', count:portfolioCards.reduce((t,c)=>t+(c.qty||1),0) },
                              ...[...new Set(portfolioCards.map(c=>c.set))].filter(Boolean).sort((x,y)=>String(x).localeCompare(String(y))).map(sn=>({
                                value:String(sn), label:String(sn),
                                image:setLogos[String(sn)]||'',
                                count:portfolioCards.filter(c=>c.set===sn).reduce((t,c)=>t+(c.qty||1),0),
                              }))]} />
                        </div>
                      )}
                      <div className="kfilt-searchbox" style={{ position:'relative', flex:'1 1 130px', minWidth:'120px', maxWidth:'260px' }}>
                        <input type="text" placeholder="Rechercher" value={setSearch} onChange={e=>{setSetSearch(e.target.value);setBinderPage(0)}} className="kctrl-field" style={{ width:'100%', paddingLeft:'31px', boxSizing:'border-box' as const }}/>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2.5" strokeLinecap="round" style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
                        {setSearch&&<button onClick={()=>setSetSearch('')} aria-label="Effacer" style={{ position:'absolute', right:'9px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#86868B', cursor:'pointer', fontSize:'14px', padding:0, lineHeight:1 }}>{String.fromCharCode(215)}</button>}
                      </div>
                      {binderSet==='__all__'&&(
                        <div className="ksubrail">
                          {([{k:'all',l:''},{k:'FR',l:'\u{1F1EB}\u{1F1F7}'},{k:'EN',l:'\u{1F1FA}\u{1F1F8}'},{k:'JP',l:'\u{1F1EF}\u{1F1F5}'}] as {k:'all'|'EN'|'FR'|'JP';l:string}[]).map(lg=>(
                            <button key={lg.k} onClick={()=>{setBinderLangFilter(lg.k);setBinderPage(0)}} className={'kseg kseg-sm'+(binderLangFilter===lg.k?' on':'')} aria-label={lg.k==='all'?'Toutes les langues':lg.k} title={lg.k==='all'?'Toutes les langues':lg.k} style={{ padding:'0 9px' }}>
                              {lg.k==='all'
                                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display:'block' }}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/></svg>
                                : lg.l}
                            </button>
                          ))}
                        </div>
                      )}
                      <div style={{ flexShrink:0 }}>
                        <KodoSelect ariaLabel="Trier" heading="Trier par" maxWidth={210} panelWidth={218}
                          value={binderSort} onChange={v=>setBinderSort(v as any)}
                          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h13M3 12h9M3 18h5"/></svg>}
                          options={((binderSet==='__all__'?([{k:'series',l:'Ordre des séries'},{k:'recent',l:'Ajoutées récemment'},{k:'name',l:'Nom (A→Z)'}] as any[]).concat(isInvestor?[{k:'price',l:'Valeur décroissante'}]:[]):([{k:'number',l:'Numéro de carte'},{k:'name',l:'Nom (A→Z)'}] as any[]).concat(isInvestor?[{k:'price',l:'Valeur décroissante'}]:[])) as {k:string;l:string}[]).map(so=>({ value:so.k, label:so.l }))} />
                      </div>
                    </div>
                    )}
                  </div>
                  <div className="kadd-btns" style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                    <style>{`
                      .kadd-mini{ display:inline-flex; flex-direction:row; align-items:center; gap:6px; height:34px; padding:0 13px; border-radius:99px; border:none; box-shadow:inset 0 0 0 .5px rgba(0,0,0,.07); background:rgba(255,255,255,.62); color:#48484A; font-size:12px; font-weight:600; font-family:var(--font-display); cursor:pointer; transition:background .18s ease, color .18s ease, transform .12s ease; flex-shrink:0; }
                      .kadd-mini:hover{ background:rgba(255,255,255,.92); color:#1D1D1F; }
                      .kadd-mini:active{ transform:scale(.97); }
                      .kadd-primary{ display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 13px; border-radius:99px; border:none; background:#1D1D1F; color:#FFF; font-size:11.5px; font-weight:600; font-family:var(--font-display); cursor:pointer; transition:background .18s ease, transform .12s ease; flex-shrink:0; }
                      .kadd-primary:hover{ background:#000; }
                      .kadd-primary:active{ transform:scale(.97); }
                      .kadd-sep{ width:1px; height:20px; background:rgba(0,0,0,.09); flex-shrink:0; margin:0 3px; }
                      @media (max-width:900px){ .kadd-sep{ display:none } }
                    `}</style>
                    <span aria-hidden className="kadd-sep" />
                    <button className="kadd-primary" onClick={()=>setCardPickOpen(true)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      <span>Ajouter</span>
                    </button>
                    <div className="kadd-secondary" style={{ display:'inline-flex', alignItems:'center', gap:2, padding:3, background:'rgba(0,0,0,.045)', borderRadius:99, flexShrink:0 }}>
                    {(!binderSet||binderSet==='__all__')&&<button className="kadd-mini" onClick={()=>{setAddSetOpen(true);setAddSetCards([]);setAddSetId('');setAddSetName('')}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
                      <span className="kadd-serie-lbl">Série</span>
                    </button>}
                    <button className="kadd-mini" onClick={()=>setImportOpen(true)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                      <span className="kadd-lbl">Import</span>
                    </button>
                    <button className="kadd-mini" onClick={()=>setScannerSoonOpen(true)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      <span className="kadd-lbl">Scan</span>
                    </button>
                    </div>
                    <span aria-hidden className="kadd-sep" />
                    {(binderSet!==null)&&(
                      <button className="kadd-mini kadd-cols" onClick={()=>{setBinderCols(n=>n>=9?6:n+1);setBinderPage(0)}}
                        aria-label={'Colonnes : '+binderCols} title={'Colonnes : '+binderCols+' (cliquer pour changer)'}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 4v16M9 4v16M15 4v16M21 4v16"/></svg>
                        <span key={binderCols} className="knum-pop" style={{ fontFamily:'var(--font-data)', minWidth:'7px' }}>{binderCols}</span>
                      </button>
                    )}

                  </div>
                </div>

                {portfolio.length===0?(
                  <div style={{ textAlign:'center', padding:'64px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:'16px' }}>
                    <div style={{ fontSize:'14px', color:'#48484A', fontFamily:'var(--font-display)' }}>Collection vide</div>
                    <div style={{ fontSize:'12px', color:'#6E6E73', fontFamily:'var(--font-display)', maxWidth:'260px' }}>Ajoutez votre première carte pour commencer</div>
                    <GlassButton size="lg" onClick={()=>setCardPickOpen(true)}>
                      + Ajouter ma première carte
                    </GlassButton>
                  </div>
                ) : (!binderSet || binderSet==='__all__') && binderSet!=='__all__' ? (
                  /* VUE SETS — SHELF */
                  <div style={{ display:'flex', flexDirection:'column', gap:'0' }}>
                    {(()=>{
                      const raw=[...new Set(portfolioCards.map(c=>c.set))]
                      const ordered=setOrder.length>0?[...setOrder.filter(n=>raw.includes(n)),...raw.filter(n=>!setOrder.includes(n))]:raw
                      return ordered
                    })().filter(n=>String(n ?? '').toLowerCase().includes(setSearch.toLowerCase())).map((setName,si)=>{
                      const setCards=portfolioCards.filter(c=>c.set===setName)
                      const setIdKey=setCards.find(c=>c.setId)?.setId??''
                      const total=setCards[0]?.setTotal||0
                      const resolvedTotal=total||(setIdKey?setTotalsMap[setIdKey]:0)||setTotalsMap[setName]||setTotalsMap[String(setName ?? '').toLowerCase()]||0
                      const uniqueNums=(()=>{const _n=(x:any)=>String(x??'').trim().replace(/^0+/,'')||'0';const _g=shelfSetCards[setName]||[];const _o=new Set(setCards.map(c=>_n(c.number)));return _g.length>0?_g.filter((q:any)=>_o.has(_n(q.localId||''))).length:Math.min(_o.size,resolvedTotal||_o.size)})()
                      const pct=resolvedTotal>0?Math.min(100,Math.round((uniqueNums/resolvedTotal)*100)):null
                      const totalForDisplay=resolvedTotal
                      const ec2=EC[setCards[0]?.type??'fire']??'#888'
                      const isComplete=resolvedTotal>0&&uniqueNums>=resolvedTotal
                      const filteredSetCards=[...setCards].filter(c=>{
                        if(binderFilter==='graded') return c.graded
                        if(binderFilter==='raw') return !c.graded
                        return true
                      })
                      const shelfGhosts = shelfSetCards[setName] || []
                      const cardImgs: GridItem[] = (binderSort==='number' && shelfGhosts.length>0 && binderFilter==='all' && !setSearch)
                        ? (()=>{
                            const normN = (x:any) => String(x ?? '').trim().replace(/^0+/, '') || '0'
                            const ownedMap = new Map<string,CardItem>()
                            const countMap = new Map<string,number>()
                            // Vue COMPLETION : une case = un numero du set, la vignette porte la
                            // VALEUR DE LIGNE (somme prix x qte) et le nombre d'exemplaires non
                            // cotes. Le representant est le mieux cote (avant : le premier
                            // rencontre -> un PSA 10 sans cote masquait 20 NM a 175,99 EUR).
                            const lineVal = new Map<string,number>()
                            const uncoted = new Map<string,number>()
                            setCards.forEach(c => {
                              const k = normN(c.number)
                              const q = Number(c.qty)||1
                              const px = Number(c.curPrice)||0
                              const prev = ownedMap.get(k)
                              if(!prev || px > (Number(prev.curPrice)||0)) ownedMap.set(k, c)
                              countMap.set(k, (countMap.get(k)||0)+q)
                              lineVal.set(k, (lineVal.get(k)||0) + px*q)
                              uncoted.set(k, (uncoted.get(k)||0) + (px>0?0:q))
                            })
                            return shelfGhosts.map(fc => {
                              const k = normN(fc.localId||'')
                              const owned = ownedMap.get(k)
                              if(owned) return { type:'owned' as const, count: countMap.get(k)||1, card:{ ...owned, image: cleanImageUrl(fc.image) || cleanImageUrl(owned.image) || '', __lineValue: lineVal.get(k)||0, __uncoted: uncoted.get(k)||0, __count: countMap.get(k)||1, __mixed: (countMap.get(k)||1) > (Number(owned.qty)||1) } as any }
                              return { type:'ghost' as const, name:fc.name, number:fc.localId||'', image:cleanImageUrl(fc.image)||'', rarity:fc.rarity||'' }
                            })
                          })()
                        : (()=>{
                            const normN2 = (x:any) => String(x ?? '').trim().replace(/^0+/, '') || '0'
                            // Grouper par carte (kCardId sinon numero) : une case par carte, count = nb d'exemplaires.
                            const grouped = new Map<string,{ card:CardItem; count:number }>()
                            filteredSetCards.forEach(c=>{
                              const key = c.kCardId || normN2(c.number) || c.id
                              const prev = grouped.get(key)
                              if(prev){ prev.count += (c.qty||1) }
                              else grouped.set(key, { card:c, count:(c.qty||1) })
                            })
                            return Array.from(grouped.values()).sort((a,b)=>{
                              if(binderSort==='number') return (parseInt(a.card.number)||999)-(parseInt(b.card.number)||999)
                              if(binderSort==='name') return a.card.name.localeCompare(b.card.name)
                              if(binderSort==='price') return b.card.curPrice-a.card.curPrice
                              return 0
                            }).map(g=>({ type:'owned' as const, count:g.count, card:g.card }))
                          })()
                      return (
                        <div key={setName} className="set-block" style={{ marginBottom:'24px', animation:`slotIn .2s ${si*.05}s ease-out both` }}>
                          {/* Header du set — XP Bar gamifiée exact artifact */}
                          {(()=>{
                            const p=pct??0
                            const lvlColor = isComplete?'#C9A227':p>=75?'rgba(52,211,153,.95)':p>=50?'rgba(96,165,250,.9)':p>=25?'rgba(96,165,250,.75)':'#EA580C'
                            const lvlBg = isComplete?'rgba(255,255,255,0.72)':p>=75?'rgba(52,211,153,.22)':p>=50?'rgba(96,165,250,.22)':p>=25?'rgba(96,165,250,.2)':'rgba(255,107,53,.25)'
                            const lvlBorder = isComplete?'#E8D48B':p>=75?'rgba(52,211,153,.3)':p>=50?'rgba(96,165,250,.3)':p>=25?'rgba(96,165,250,.25)':'rgba(255,107,53,.3)'
                            const lvl = isComplete?'★':String(si+1)
                            // Segments proportionnels exacts
                            const s1pct=isComplete?100:Math.min(100,p*4)
                            const s2pct=isComplete?100:Math.min(100,Math.max(0,(p-25)*4))
                            const s3pct=isComplete?100:Math.min(100,Math.max(0,(p-50)*4))
                            const s4pct=isComplete?100:Math.min(100,Math.max(0,(p-75)*4))
                            const s1col=isComplete?'linear-gradient(90deg,#C9A84C,#FFD700,#FFF1A8,#FFD700,#C9A84C)':'linear-gradient(90deg,#ff6b35,#ff4433)'
                            const s2col=isComplete?'linear-gradient(90deg,#FFD700,#FFF1A8,#FFD700,#C9A84C,#FFD700)':'linear-gradient(90deg,#60a5fa,#3b82f6)'
                            const s3col=isComplete?'linear-gradient(90deg,#C9A84C,#FFD700,#FFF1A8,#FFD700,#C9A84C)':'linear-gradient(90deg,#34d399,#10b981)'
                            const s4col=isComplete?'linear-gradient(90deg,#FFD700,#FFF1A8,#FFD700,#C9A84C,#FFD700)':'linear-gradient(90deg,#34d399,#10b981)'
                            const segs=[[s1pct,s1col],[s2pct,s2col],[s3pct,s3col],[s4pct,s4col]]
                            return (
                              <div className={'set-header'+(isComplete?' is-master':'')} style={{
                                marginBottom:'12px',
                                cursor:'pointer',
                                opacity:dragSet===setName?.5:1,
                                borderTop:dragOverSet===setName?'2px solid #E03020':'2px solid transparent',
                                transition:'opacity .2s, border-color .2s, transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s cubic-bezier(.2,.8,.2,1)',
                                background: 'rgba(255,255,255,0.55)',
                                backdropFilter: 'blur(24px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                                borderRadius: 16,
                                padding: '14px 16px',
                                position:'relative' as const,
                                overflow:'hidden' as const,
                                boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.7)',
                              }}
                                draggable
                                onDragStart={e=>{setDragSet(setName);e.dataTransfer.effectAllowed='move'}}
                                onDragEnd={()=>{setDragSet(null);setDragOverSet(null)}}
                                onDragOver={e=>{e.preventDefault();if(dragSet&&dragSet!==setName)setDragOverSet(setName)}}
                                onDragLeave={()=>setDragOverSet(null)}
                                onDrop={e=>{
                                  e.preventDefault()
                                  if(!dragSet||dragSet===setName) return
                                  const raw=[...new Set(portfolio.map(c=>c.set))]
                                  const current=setOrder.length>0?[...setOrder.filter(n=>raw.includes(n)),...raw.filter(n=>!setOrder.includes(n))]:raw
                                  const fromIdx=current.indexOf(dragSet)
                                  const toIdx=current.indexOf(setName)
                                  if(fromIdx<0||toIdx<0) return
                                  const next=[...current]
                                  next.splice(fromIdx,1)
                                  next.splice(toIdx,0,dragSet)
                                  setSetOrder(next)
                                  setDragSet(null)
                                  setDragOverSet(null)
                                }}
                                onClick={()=>{ setCollapsedSets(prev=>{ const n=new Set(prev); n.has(setName)?n.delete(setName):n.add(setName); return n }) }}>
                                {isComplete&&(<>
                                  <div className="holo-header-bg" aria-hidden style={{ position:'absolute', inset:0, background:'linear-gradient(105deg, #ffc9e0, #c9dbff, #c9ffe9, #fff2c0, #e6c9ff, #ffc9e0)', backgroundSize:'200% 100%', opacity:0.8, pointerEvents:'none' }}/>
                                  <div aria-hidden style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.26)', pointerEvents:'none' }}/>
                                </>)}
                                <div style={{ position:'relative', zIndex:1 }}>
                                <div className="ksetrow-head" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:isComplete?'0':'8px' }}>
                                  <div className="ksetrow-left" style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                    <svg className="kset-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="2.5" strokeLinecap="round" style={{ transition:'transform .3s cubic-bezier(.4,0,.2,1)', transform:collapsedSets.has(setName)?'rotate(-90deg)':'rotate(0deg)', flexShrink:0 }}><path d="M6 9l6 6 6-6"/></svg>
                                    <div className="kset-logobox" style={{ width:'48px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                      {setLogos[setName]&&(
                                      <img src={setLogos[setName]} alt="" style={{ height:'28px', maxWidth:'48px', objectFit:'contain' }}
                                        onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                                    )}
                                    </div>
                                    <div className="kset-textcol" style={{ minWidth:0, flex:1 }}>
                                      <div className="kset-titlerow" style={{ display:'flex', alignItems:'center', gap:'8px', minWidth:0 }}>
                                        <div style={{ fontSize:'14px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', lineHeight:1.2, textShadow:'none', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', minWidth:0 }}>{setName}</div>
                                        {pct!==null&&!isComplete&&<span style={{ fontSize:'12px', fontWeight:800, color:'#6E6E73', fontFamily:'var(--font-data)', flexShrink:0 }}>{pct}%</span>}
                                        {isComplete&&(
                                          <span className="kmaster-pill" title="Master Set complet" style={{ position:'relative', overflow:'hidden', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'5px', padding:'5px 13px', borderRadius:99, border:'0.5px solid rgba(255,255,255,0.8)', boxShadow:'0 2px 8px rgba(150,120,230,0.25), inset 0 1px 0 rgba(255,255,255,0.9)', flexShrink:0 }}>
                                            <span className="holo-header-bg" aria-hidden style={{ position:'absolute', inset:0, background:'linear-gradient(105deg, #ffc9e0, #c9dbff, #c9ffe9, #fff2c0, #e6c9ff, #ffc9e0)', backgroundSize:'200% 100%', opacity:0.7, pointerEvents:'none' }}/>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(55,35,90,0.92)" style={{ position:'relative', zIndex:1, flexShrink:0 }}><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.5 6.8L12 17l-6 3.9 1.5-6.8L2.3 9.5l6.9-.6z"/></svg>
                                            <span className="kmaster-pill-txt" style={{ position:'relative', zIndex:1, fontSize:'10px', fontWeight:800, letterSpacing:'.1em', color:'rgba(50,32,82,0.95)', fontFamily:'var(--font-display)', whiteSpace:'nowrap' }}>MASTER SET</span>
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'4px', flexWrap:'wrap' }}>
                                        <span style={{ fontSize:'11px', lineHeight:1 }}>{(setCards[0]?.lang||'FR')==='EN'?'\u{1F1FA}\u{1F1F8}':(setCards[0]?.lang||'FR')==='JP'?'\u{1F1EF}\u{1F1F5}':'\u{1F1EB}\u{1F1F7}'}</span>
                                        {setBlocks[setName]?<span style={{ fontSize:'10px', color:'#86868B', fontFamily:'var(--font-display)' }}>{setBlocks[setName]}</span>:null}
                                        {(()=>{ const sid=setCards.find(c=>c.setId)?.setId||''; const is1st=sid.includes('-shadowless-ns')||sid.includes('-1st'); const isShadow=sid.includes('-shadowless'); return (<>{is1st?<span className="ed-badge ed-1st-edition">1ST EDITION</span>:null}{isShadow?<span className="ed-badge ed-shadowless">SHADOWLESS</span>:null}</>)})()}
                                        {(()=>{ const sid=setCards.find(c=>c.setId)?.setId; return sid&&frSetsMap[sid]&&frSetsMap[sid]!==setName?<span style={{ fontSize:'10px', color:'#AEAEB2', fontWeight:400 }}>{frSetsMap[sid]}</span>:null })()}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                                    {pct!==null&&!isComplete&&p>=75&&<span style={{ fontSize:'9px', fontWeight:700, background:'rgba(52,211,153,.12)', border:'0.5px solid rgba(52,211,153,.3)', color:'#1D9A6C', padding:'2px 8px', borderRadius:99, fontFamily:'var(--font-display)', letterSpacing:'.04em' }}>Presque !</span>}
                                    {!isComplete&&<span style={{ fontSize:'11px', color:'#86868B', fontFamily:'var(--font-data)' }}>{uniqueNums}{resolvedTotal>0?<span style={{ color:'#AEAEB2' }}> / {resolvedTotal}</span>:<span style={{ color:'#AEAEB2' }}> cartes</span>}</span>}
                                    <button onClick={e=>{e.stopPropagation();if(window.confirm('Supprimer toutes les '+setCards.length+' cartes de "'+setName+'" ?')){const ids=setCards.filter(c=>!c.id.startsWith('u')).map(c=>c.id);if(user&&ids.length)supabase.from('portfolio_cards').delete().in('id',ids).then(({error})=>{if(error)console.error('Set delete error:',error);else console.log('Set deleted from Supabase:',ids.length,'cards')});setPortfolio(prev=>prev.filter(c=>c.set!==setName));showToast(setName+' supprimé')}}} style={{ width:'26px', height:'26px', borderRadius:'50%', background:'transparent', border:'1px solid #E5E5EA', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s', flexShrink:0 }}
                                      onMouseEnter={e=>{e.currentTarget.style.background='#FFF1EE';e.currentTarget.style.borderColor='rgba(224,48,32,.3)'}}
                                      onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='#E5E5EA'}}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E03020" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                    </button>
                                    <span className="voir-pill" onClick={e=>{e.stopPropagation();setBinderSet(setName);setBinderPage(0)}} style={{ fontSize:11, color:'#1D1D1F', fontWeight:600, fontFamily:'var(--font-display)', padding:'5px 12px', borderRadius:99, background:'rgba(255,255,255,0.7)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', border:'1px solid rgba(229,229,234,0.6)', transition:'all .2s cubic-bezier(.2,.8,.2,1)', whiteSpace:'nowrap', cursor:'pointer', boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)' }}>Voir la série complète ›</span>
                                  </div>
                                </div>
                                {resolvedTotal>0&&!isComplete&&(
                                  <>
                                    <LiquidProgress pct={p} color={ec2} height={10} />
                                    {!isComplete&&(
                                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'5px', padding:'0 2px' }}>
                                        {(['0','25%','50%','75%','100%'] as string[]).map((label,li)=>(
                                          <span key={li} style={{ fontSize:'8px', fontFamily:'var(--font-data)', color:p>=(li*25)&&li>0?ec2:'#AEAEB2', transition:'color .3s' }}>{p>=(li*25)&&li>0?label+' ✓':label}</span>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}
                                {!resolvedTotal&&(
                                  <>
                                    <LiquidProgress pct={0} color={ec2} height={10} />
                                    <div style={{ fontSize:'9px', color:'#AEAEB2', fontFamily:'var(--font-data)', marginTop:'5px' }}>Total du set inconnu</div>
                                  </>
                                )}
                              </div>
                              </div>
                            )
                          })()}
                          {/* Rayon de cartes */}
                          {!collapsedSets.has(setName)&&<div className="set-cards-in">
                          <div className="shelf-row" ref={el=>{scrollRefs.current[setName]=el}} onScroll={e=>handleShelfScroll(setName,e)} onMouseDown={e=>{e.preventDefault();onShelfMouseDown(e)}} style={{ display:'flex', gap:'8px', overflowX:'auto' as const, padding:'8px 0 8px', WebkitOverflowScrolling:'touch' as any, cursor:'grab', willChange:'scroll-position' }}>
                            {cardImgs.map((item,ci)=>{
                              if(item.type==='ghost'){
                                const gi=item
                                return(
                                  <div key={'sg-'+gi.number+'-'+ci} className="shelf-card"
                                    style={{ flexShrink:0, width:'149px', borderRadius:'12px', overflow:'hidden', opacity:.4, transition:'opacity .2s', cursor:'pointer' }}
                                    onMouseEnter={e=>{e.currentTarget.style.opacity='0.6'}}
                                    onMouseLeave={e=>{e.currentTarget.style.opacity='0.4'}}
                                    onClick={()=>{
                                      ghostClickRef.current=true
                                      const sid2=setCards.find(c=>c.setId)?.setId||liveSets.find(ls=>ls.name===setName)?.id||''
                                      const lang2=setCards[0]?.lang||'FR'
                                      setAddForm(p=>({...p, set:setName, setId:sid2, lang:lang2, name:gi.name, number:gi.number, image:gi.image||''}))
                                      setNameValidated(true)
                                      if(sid2){ setCardsLoading(true); setLiveCards([]); getCardsForSet(lang2 as 'EN'|'FR'|'JP',sid2).then(cards=>{setLiveCards(staticToTCGCards(cards,sid2,lang2,(l,s,lid)=>getCardImageUrl({lang:l,setId:s,localId:lid})) as any);setCardsLoading(false)}).catch(()=>setCardsLoading(false)) }
                                      setAddOpen(true)
                                    }}>
                                    <div style={{ borderRadius:'12px', overflow:'hidden', border:'1px solid #E5E5EA', position:'relative' }}>
                                      {gi.image?(
                                        <img src={cleanImageUrl(gi.image)} alt={gi.name}
                                          style={{ width:'100%', aspectRatio:'63/88', ...kthumbFit(gi), display:'block', filter:'grayscale(1)' }}
                                          onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                                      ):(
                                        <div style={{ width:'100%', aspectRatio:'63/88', background:'#EDEDF0' }}/>
                                      )}
                                    </div>
                                    <div style={{ padding:'6px 6px 4px' }}>
                                      <div style={{ fontSize:'11px', fontWeight:500, color:'#AEAEB2', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'var(--font-display)' }}>{gi.name}</div>
                                      <div style={{ display:'flex', alignItems:'center', gap:'3px', marginTop:'2px' }}>
                                        <span style={{ fontSize:'10px', color:'#C7C7CC', fontFamily:'var(--font-data)' }}>#{gi.number}</span>
                                        {gi.rarity&&<span style={{ fontSize:'9px', color:'#D2D2D7' }}>{gi.rarity}</span>}
                                      </div>
                                    </div>
                                  </div>
                                )
                              }
                              const card=item.card
                              return ((()=>{
                              const inFullSet=!!(binderSet)
                              const gn=card.graded?parseFloat(card.condition.replace(/[^0-9.]/g,'')):0
                              const borderColor=inFullSet&&card.graded?(gn>=10?'#D4AF37':gn>=8?'#B0B0B0':gn>=5?'#A0724A':'#555'):`${ec2}25`
                              const borderW=inFullSet&&card.graded?'2.5px':'1px'
                              const gradeBg=gn>=10?'linear-gradient(135deg,#B8942F,#D4AF37,#F5ECA0,#D4AF37)':gn>=8?'linear-gradient(135deg,#A8A8A8,#D8D8D8,#F0F0F0,#D8D8D8)':gn>=5?'linear-gradient(135deg,#A0724A,#C4956A,#E0BFA0,#C4956A)':'#555'
                              const gradeFg=gn>=10?'#1a1200':gn>=8?'#333':gn>=5?'#2a1800':'#fff'
                              return(
                              <div key={card.id} className="shelf-card"
                                style={{ flexShrink:0, width:'149px', borderRadius:'12px', overflow:'visible', position:'relative', transition:'transform .2s cubic-bezier(.34,1.2,.64,1)', contentVisibility:'auto' as any, containIntrinsicSize:'149px 260px' }}
                                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-6px)'; e.currentTarget.style.boxShadow='0 12px 24px rgba(0,0,0,.1)'; const rb=e.currentTarget.querySelector('.remove-btn') as HTMLElement|null; if(rb) rb.style.opacity='1' }}
                                onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; const rb=e.currentTarget.querySelector('.remove-btn') as HTMLElement|null; if(rb) rb.style.opacity='0' }}>
                                <div onClick={()=>{ setSpotCard(card); setEditQty(null) }} style={{ borderRadius:'12px', overflow:'hidden', border:`${borderW} solid ${borderColor}`, boxShadow:`0 2px 8px rgba(0,0,0,.08)`, position:'relative', cursor:'pointer' }}>
                                <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(29,29,31,.05) 0%,transparent 40%)', zIndex:2, pointerEvents:'none' }}/>
                                {card.image?(
                                  <img src={cleanImageUrl(card.image)} alt={card.name} loading="lazy" decoding="async"
                                    style={{ width:'100%', aspectRatio:'63/88', ...kthumbFit(card), display:'block' }}
                                    onError={e=>{ const t=e.target as HTMLImageElement; t.onerror=null }}/>
                                ):(
                                  <div style={{ width:'100%', aspectRatio:'63/88', background:`linear-gradient(145deg,${ec2}18,${ec2}06)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                    <div style={{ width:'26px', height:'26px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec2}CC,${ec2}55)` }}/>
                                  </div>
                                )}
                                {inFullSet&&card.qty>1&&<span style={{ position:'absolute', top:'4px', left:'4px', fontSize:'9px', fontWeight:700, padding:'2px 6px', borderRadius:'99px', background:'rgba(0,0,0,.55)', color:'#fff', zIndex:3, fontFamily:'var(--font-data)' }}>{String.fromCharCode(215)}{card.qty}</span>}
                                {inFullSet&&card.graded&&!((card as any).__mixed)&&(()=>{const gLbl=`${card.gradeCompany||'PSA'} ${card.gradeValue||''}`.trim();const gv=parseInt(String(card.gradeValue||card.condition).replace(/[^0-9]/g,''))||0;const bgG=gv>=10?'linear-gradient(145deg,#8B7320,#B8942F,#D4AF37,#F5ECA0,#FFFAD0,#F5ECA0,#D4AF37,#B8942F,#8B7320)':gv>=9?'linear-gradient(145deg,#707070,#A8A8A8,#D8D8D8,#F0F0F0,#D8D8D8,#A8A8A8,#707070)':gv>=5?'linear-gradient(145deg,#6B4226,#A0724A,#C4956A,#E0BFA0,#C4956A,#A0724A,#6B4226)':'rgba(0,0,0,.6)';const fgG=gv>=10?'#1a1200':gv>=9?'#222':gv>=5?'#2a1800':'#fff';return <span style={{ position:'absolute', bottom:'4px', right:'4px', zIndex:3, background:bgG, color:fgG, fontSize:'8px', fontWeight:800, padding:'3px 7px', borderRadius:'5px', fontFamily:'var(--font-data)', letterSpacing:'.03em', boxShadow:'0 1px 4px rgba(0,0,0,.2)', backgroundSize:gv>=5?'300% 300%':'auto', animation:gv>=5?'metalShift 8s ease-in-out infinite':'none', border:gv>=10?'1px solid rgba(212,175,55,.4)':gv>=9?'1px solid rgba(168,168,168,.4)':gv>=5?'1px solid rgba(160,114,74,.3)':'none', overflow:'hidden' }}>{gv>=5&&<span style={{ position:'absolute', inset:0, borderRadius:'5px', background:gv>=10?'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)':gv>=9?'linear-gradient(145deg,transparent 30%,rgba(255,255,255,.3) 45%,transparent 60%)':'linear-gradient(145deg,transparent 30%,rgba(224,191,160,.25) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/>}<span style={{ position:'relative', zIndex:1 }}>{gLbl}</span></span>})()}
                                {inFullSet&&!card.graded&&!((card as any).__mixed)&&(()=>{ const lbl=rawStateLabel(card.condition); return <span style={{ position:'absolute', bottom:'4px', right:'4px', zIndex:3, background:'rgba(255,255,255,0.9)', color:'#6E6E73', border:'0.5px solid rgba(0,0,0,0.06)', fontSize:'9px', fontWeight:700, padding:'2px 7px', borderRadius:'4px', fontFamily:'var(--font-display)', letterSpacing:'.02em', boxShadow:'0 1px 3px rgba(0,0,0,.12)', whiteSpace:'nowrap' as const }}>{lbl}</span> })()}
                                <div style={{ padding:'6px 6px 4px', position:'relative' }}>
                                  
                                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'3px' }}>
                                    <div style={{ fontSize:'11px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }} title={card.lang==='JP'&&card.setId&&frCardsMap['__id__'+(card.number||'')]?frCardsMap['__id__'+card.number]:undefined}>{card.name}</div>
                                  </div>
                                  <div style={{ minHeight:'14px', marginTop:'1px' }}>
                                    {(() => {
                                      const k:any=card
                                      const cnt = Number(k.__count||1)
                                      // Le collectionneur voit ce qu il possede, pas ce que ca vaut.
                                      if (!isInvestor) return cnt > 0
                                        ? <div style={{ fontSize:'10px', fontWeight:700, color:SNOW.ink, fontFamily:'var(--font-display)' }}>{cnt} exemplaire{cnt>1?'s':''}</div>
                                        : null
                                      const lv = k.__lineValue != null ? Number(k.__lineValue) : (Number(card.curPrice)||0)
                                      const unc = Number(k.__uncoted||0)
                                      return (<>{lv>0 && <div style={{ fontSize:'10px', fontWeight:600, color:SNOW.ink, fontFamily:'var(--font-data)' }}>{lv.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} {String.fromCharCode(8364)}</div>}{lv>0 && (cnt>1 || unc>0) && <div style={{ fontSize:'8px', fontWeight:500, color:'#AEAEB2', fontFamily:'var(--font-display)' }}>{cnt>1 ? 'Total ' + cnt + ' carte' + (cnt>1?'s':'') : ''}{cnt>1 && unc>0 ? ' \u00b7 ' : ''}{unc>0 ? unc + ' sans cote' : ''}</div>}</>)
                                    })()}
                                    {isInvestor && !(Number((card as any).__lineValue ?? card.curPrice) > 0) && <div title="Données insuffisantes" style={{ fontSize:'12px', fontWeight:700, color:'#D2D2D7', fontFamily:'var(--font-data)', lineHeight:1.3 }}>{String.fromCharCode(8212)}</div>}
                                  </div>
                                  <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'3px' }}>
                                    <span style={{ fontSize:'11px', lineHeight:1 }}>{card.lang==='EN'?'\u{1F1FA}\u{1F1F8}':card.lang==='FR'?'\u{1F1EB}\u{1F1F7}':'\u{1F1EF}\u{1F1F5}'}</span>
                                    {card.number&&card.number!=='???'&&card.number!=='SEALED'&&<span style={{ fontSize:'9px', color:'#6E6E73', fontFamily:'var(--font-data)' }}>#{card.number}</span>}
                                    {card.rarity&&<span style={{ fontSize:'9px', color:'#86868B' }}>{card.rarity}</span>}

                                  </div>
                                  {(card.setId?.includes('-shadowless')||card.setId?.includes('-1st'))&&(
                                    <div style={{ display:'flex', alignItems:'center', gap:'3px', marginTop:'2px' }}>
                                      {card.setId?.includes('-shadowless-ns')||card.setId?.includes('-1st')?<span className="ed-badge ed-1st-edition">1ST EDITION</span>:null}
                                      {card.setId?.includes('-shadowless')?<span className="ed-badge ed-shadowless">SHADOWLESS</span>:null}
                                    </div>
                                  )}
                                </div>
                                </div>
                                <div className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}}
                                  onMouseEnter={e=>{const p=e.currentTarget.parentElement;if(p){p.style.transform='translateY(-6px)';p.style.transition='none'}}}
                                  onClick={e=>{e.stopPropagation();removeCard(card,e)}}
                                  style={{ position:'absolute', top:0, left:0, right:0, height:'25%', zIndex:20, cursor:'pointer', opacity:0, transition:'opacity .15s', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'8px', borderRadius:'12px 12px 0 0', background:'linear-gradient(to bottom, rgba(255,255,255,.85) 0%, rgba(255,255,255,.4) 60%, transparent 100%)' }}>
                                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.55)', backdropFilter:'blur(16px) saturate(180%)', WebkitBackdropFilter:'blur(16px) saturate(180%)', color:'#E03020', borderRadius:'99px', padding:'5px 13px', fontSize:'10px', fontWeight:600, fontFamily:'var(--font-display)', whiteSpace:'nowrap', boxShadow:'0 2px 10px rgba(0,0,0,.12), inset 0 0 0 0.5px rgba(255,255,255,0.7)', pointerEvents:'none' }}><svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/></svg>Retirer</span>
                                </div>
                              </div>
                              )})())
                            })}
                            {/* Carte + ajout */}
                            <div onClick={()=>{
                                const lang=setCards[0]?.lang||'FR'
                                const sid=setCards.find(c=>c.setId)?.setId || liveSets.find(ls=>ls.name===setName)?.id || liveSets.find(ls=>ls.name.toLowerCase()===String(setName ?? '').toLowerCase())?.id || ''
                                setAddForm(p=>({...p, set:setName, setId:sid, lang}))
                                if(sid){ setCardsLoading(true); setLiveCards([]); getCardsForSet(addForm.lang as 'EN'|'FR'|'JP',sid).then(cards=>{setLiveCards(staticToTCGCards(cards,sid,addForm.lang,(l,si,lid)=>getCardImageUrl({lang:l,setId:si,localId:lid})) as any);setCardsLoading(false)}).catch(()=>setCardsLoading(false)) }
                                setAddOpen(true)
                              }}
                              style={{ flexShrink:0, width:'180px', aspectRatio:'63/88', borderRadius:'12px', border:'1.5px dashed #C8C5C0', background:'#F0F0F5', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all .15s' }}
                              onMouseEnter={e=>{ e.currentTarget.style.borderColor='#D2D2D7'; e.currentTarget.style.background='#F0F0F5'; e.currentTarget.style.transform='scale(1.03)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.06)' }}
                              onMouseLeave={e=>{ e.currentTarget.style.borderColor='#E5E5EA'; e.currentTarget.style.background='#F5F5F7'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}>
                              <span style={{ fontSize:'18px', color:'#48484A' }}>+</span>
                            </div>
                          </div>

                          {/* ── MINIMAP ── */}
                          {(()=>{
                            const total = resolvedTotal || setCards.length
                            const owned = setCards.length
                            const pct = scrollPcts[setName] ?? 0
                            const viewFrac = Math.min(1, Math.max(0.08, 7 / Math.max(total, 1)))
                            if (total <= 7) return null
                            const bars = Math.min(total, 150)
                            const normMM = (x:any) => String(x ?? '').trim().replace(/^0+/, '') || '0'
                            const ownedNumbers = new Set(setCards.map(c => normMM(c.number)))
                            // Build ghost card number list for positional matching
                            const ghostNums = (shelfSetCards[setName] || []).map((c: any) => c.localId || '')
                            return (
                              <div className="minimap" style={{ marginTop:'8px' }}
                                onMouseDown={e => mmDown(setName, total, e)}>
                                {/* Micro-rectangles */}
                                <div style={{ position:'absolute', inset:'3px', display:'flex', gap:'1px', borderRadius:'4px', overflow:'hidden' }}>
                                  {Array.from({ length: bars }).map((_, i) => {
                                    // Chaque barre couvre un INTERVALLE de cartes, pas un point.
                                    // Avant : un seul numero echantillonne (Math.round) -> sur un set
                                    // de 230 cartes pour 150 barres, ~1 carte sur 3 ne pouvait JAMAIS
                                    // allumer de repere (Draieul #161 invisible malgre l'ajout reussi).
                                    const from = Math.floor((i / bars) * total)
                                    const to = Math.max(from, Math.ceil(((i + 1) / bars) * total) - 1)
                                    let isOwned = false
                                    for (let n = from; n <= to && !isOwned; n++) {
                                      const g = ghostNums[n]
                                      if ((g && ownedNumbers.has(normMM(g))) || ownedNumbers.has(normMM(n + 1))) isOwned = true
                                    }
                                    return (
                                      <div key={i} style={{ flex:1, minWidth:'2px', borderRadius:'1.5px', background:isOwned ? '#E03020' : '#E5E5EA', opacity:isOwned ? 0.9 : 0.5 }} />
                                    )
                                  })}
                                </div>
                                {/* Viewport indicator */}
                                <div className="mm-vp" style={{ position:'absolute', top:'1px', bottom:'1px', left:`${pct * (1 - viewFrac) * 100}%`, width:`${viewFrac * 100}%`, background:'rgba(29,29,31,.08)', border:'1.5px solid rgba(29,29,31,.2)', borderRadius:'5px', transition:'left .12s cubic-bezier(.25,.46,.45,.94)', pointerEvents:'none' }} />
                              </div>
                            )
                          })()}
                          </div>}
                          {/* Séparateur */}
                          {si<(()=>{const raw=[...new Set(portfolio.map(c=>c.set))];const ordered=setOrder.length>0?[...setOrder.filter(n=>raw.includes(n)),...raw.filter(n=>!setOrder.includes(n))]:raw;return ordered})().filter(n=>String(n ?? '').toLowerCase().includes(setSearch.toLowerCase())).length-1&&<div style={{ height:'1px', background:'#F5F5F7', marginTop:collapsedSets.has(setName)?'8px':'20px' }}/>}
                        </div>
                      )
                    })}
                  </div>
                ):(<>
                  <div className="kbinder-grid" key={`g-${binderFilter}-${binderLangFilter}-${binderSetFilter}-${binderSort}-${binderPage}`} style={{ display:'grid', gridTemplateColumns:`repeat(${binderCols},minmax(0,1fr))`, gridAutoRows:'auto', gap:binderCols>=7?'8px':'12px', padding:'4px 0' }}>
                    {pageItems.map((item,idx)=>{
                      if(item.type==='ghost'){
                        const gi=item
                        return(
                          <div key={'g-'+gi.number}
                            style={{ position:'relative',borderRadius:'10px',overflow:'hidden',cursor:'pointer',opacity:.45,transition:'opacity .2s' }}
                            onMouseEnter={e=>{e.currentTarget.style.opacity='0.65'}}
                            onMouseLeave={e=>{e.currentTarget.style.opacity='0.45'}}
                            onClick={()=>{
                              ghostClickRef.current=true
                              const sc2=portfolio.filter(c=>c.set===binderSet)
                              const sid2=sc2.find(c=>c.setId)?.setId||liveSets.find(ls=>ls.name===(binderSet||''))?.id||''
                              const lang2=sc2[0]?.lang||'FR'
                              setAddForm(p=>({...p, set:binderSet||'', setId:sid2, lang:lang2, name:gi.name, number:gi.number, image:gi.image||''}))
                              setNameValidated(true)
                              if(sid2){ setCardsLoading(true); setLiveCards([]); getCardsForSet(lang2 as 'EN'|'FR'|'JP',sid2).then(cards=>{setLiveCards(staticToTCGCards(cards,sid2,lang2,(l,s,lid)=>getCardImageUrl({lang:l,setId:s,localId:lid})) as any);setCardsLoading(false)}).catch(()=>setCardsLoading(false)) }
                              setAddOpen(true)
                            }}>
                            <div style={{ position:'relative',width:'100%',aspectRatio:'63/88',overflow:'hidden',borderRadius:'10px' }}>
                              {gi.image?(
                                <img src={cleanImageUrl(gi.image)} alt={gi.name}
                                  style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',filter:'grayscale(1)',borderRadius:'10px' }}
                                  onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                              ):(
                                <div style={{ width:'100%',height:'100%',background:'#EDEDF0',borderRadius:'10px' }}/>
                              )}
                            </div>
                            <div style={{ padding:'6px 4px 8px' }}>
                              <div style={{ fontSize:'11px',fontWeight:500,color:'#AEAEB2',fontFamily:'var(--font-display)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{gi.name}</div>
                              <div style={{ display:'flex',alignItems:'center',gap:'3px',marginTop:'2px' }}>
                                <span style={{ fontSize:'10px',color:'#C7C7CC',fontFamily:'var(--font-data)' }}>#{gi.number}</span>
                                {gi.rarity&&<span style={{ fontSize:'9px',color:'#D2D2D7' }}>{gi.rarity}</span>}
                              </div>
                            </div>
                          </div>
                        )
                      }
                      const card=item.card
                      const ec=EC[card.type]??'#888', eg=EG[card.type]??'rgba(128,128,128,.4)'
                      const isHolo=HOLO_RARITIES.includes(card.rarity)
                      const roi=card.buyPrice>0?Math.round(((card.curPrice-card.buyPrice)/card.buyPrice)*100):0
                      const fsName=binderCols<=3?'15px':binderCols===4?'14px':binderCols===5?'13px':binderCols===6?'12px':'11px'
                      return (
                        <div key={card.id}
                          className='pocket-shell'
                          style={{ background:'transparent', border:'none', boxShadow:'none', animation:`illuminate .42s ${Math.min(idx,14)*.035}s cubic-bezier(.22,.85,.3,1) both`, position:'relative', borderRadius:'10px', overflow:'visible', cursor:'pointer', transition:'transform .3s cubic-bezier(.22,.68,0,1.1), box-shadow .35s ease', display:'flex', flexDirection:'column' as const, height:'100%' }}
                          onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; const rb=e.currentTarget.querySelector('.remove-btn') as HTMLElement|null; if(rb) rb.style.opacity='0' }}
                          onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-8px)'; e.currentTarget.style.boxShadow='0 20px 40px rgba(0,0,0,.10), 0 8px 16px rgba(0,0,0,.04)'; const rb=e.currentTarget.querySelector('.remove-btn') as HTMLElement|null; if(rb) rb.style.opacity='1' }}
                          onClick={()=>{ setSpotCard(card); setEditQty(null) }}>

                          {/* Image pleine hauteur */}
                          <div style={{ position:'relative', width:'100%', aspectRatio:'63/88', overflow:'hidden', borderRadius:'10px', boxShadow:'0 2px 8px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.04)', flex:'none' }}>
                            {card.image ? (
                              <img src={cleanImageUrl(card.image)} alt={card.name}
                                style={{ position:'absolute', inset:0, width:'100%', height:'100%', ...kthumbFit(card), display:'block', borderRadius:'10px', transition:'transform .4s cubic-bezier(.34,1.1,.64,1)' }}
                                onError={e=>{ const t=e.target as HTMLImageElement; t.onerror=null; t.style.opacity='0'; t.style.height='100%'; const p=t.parentElement; if(p&&!p.querySelector('.no-img-ph')){const d=document.createElement('div');d.className='no-img-ph';d.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;cursor:pointer';d.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg><span style="font-size:8px;color:#AEAEB2">Ajouter</span>';p.appendChild(d)} }}
                              />
                            ) : (
                              <div style={{ width:'100%', aspectRatio:'63/88', background:`linear-gradient(145deg,${ec}15,${ec}06)`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'6px', position:'relative' }}>
                                <div style={{ position:'absolute', width:'60%', height:'60%', borderRadius:'50%', background:eg, filter:'blur(18px)', opacity:.5 }}/>
                                <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec}CC,${ec}77)`, boxShadow:`0 0 16px ${eg}`, position:'relative', zIndex:1 }}/>
                              </div>
                            )}
                            {/* Gradient bas pour lire les infos */}
                            
                            {/* Badges positionnés sur l'image */}
                            {card.signal&&<div style={{ position:'absolute', top:'5px', right:'5px', fontSize:'8px', fontWeight:800, background:TIER_BG[card.signal], color:'#1D1D1F', padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-display)', zIndex:2 }}>{card.signal}</div>}

                            
                          </div>
                          {/* Étiquette bas — propre et sobre */}
                          <div style={{ padding:'6px 4px 6px', position:'relative', flex:1, display:'flex', flexDirection:'column' as const }}>
                            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'3px' }}>
                              <div style={{ flex:1, minWidth:0 }}>
                                {(()=>{
                                  const em=String.fromCharCode(8212)
                                  const cut=isSealed(card)&&card.name.includes(em)
                                  const t=cut?card.name.split(em)[0].trim():card.name
                                  const sr=cut?card.name.split(em).slice(1).join(em).trim():(card.set||'')
                                  return (<>
                                    <div title={card.name} style={{ fontSize:fsName, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, lineHeight:1.25 }}>{t}</div>
                                    <div title={sr} style={{ fontSize:binderCols>=7?'9px':'10px', fontWeight:500, color:'#86868B', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, lineHeight:1.35, marginTop:'1px' }}>{sr||String.fromCharCode(160)}</div>
                                  </>)
                                })()}
                              </div>
                              {show.pnl&&card.buyPrice>0&&<div style={{ fontSize:'11px', fontWeight:700, color:roi>=0?'#2E9E6A':'#E03020', fontFamily:'var(--font-data)', flexShrink:0 }}>{roi>=0?'+':''}{roi}%</div>}
                              {card.graded&&(()=>{const gLbl=`${card.gradeCompany||'PSA'} ${card.gradeValue||''}`.trim();const gv=parseInt(String(card.gradeValue||card.condition).replace(/[^0-9]/g,''))||0;const bgG=gv>=10?'linear-gradient(145deg,#8B7320,#B8942F,#D4AF37,#F5ECA0,#FFFAD0,#F5ECA0,#D4AF37,#B8942F,#8B7320)':gv>=9?'linear-gradient(145deg,#707070,#A8A8A8,#D8D8D8,#F0F0F0,#D8D8D8,#A8A8A8,#707070)':gv>=5?'linear-gradient(145deg,#6B4226,#A0724A,#C4956A,#E0BFA0,#C4956A,#A0724A,#6B4226)':'#6E6E73';const fgG=gv>=10?'#1a1200':gv>=9?'#222':gv>=5?'#2a1800':'#fff';return <span style={{ flexShrink:0, marginTop:'2px', background:bgG, color:fgG, fontSize:'8px', fontWeight:800, padding:'2px 6px', borderRadius:'5px', fontFamily:'var(--font-data)', letterSpacing:'.03em', backgroundSize:gv>=5?'300% 300%':'auto', animation:gv>=5?'metalShift 8s ease-in-out infinite':'none', border:gv>=10?'1px solid rgba(212,175,55,.4)':gv>=9?'1px solid rgba(168,168,168,.4)':gv>=5?'1px solid rgba(160,114,74,.3)':'none', position:'relative', overflow:'hidden', whiteSpace:'nowrap' as const }}>{gv>=5&&<span style={{ position:'absolute', inset:0, borderRadius:'5px', background:gv>=10?'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)':gv>=9?'linear-gradient(145deg,transparent 30%,rgba(255,255,255,.3) 45%,transparent 60%)':'linear-gradient(145deg,transparent 30%,rgba(224,191,160,.25) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/>}<span style={{ position:'relative', zIndex:1 }}>{gLbl}</span></span>})()}
                              {!card.graded&&(()=>{ const lbl=rawStateLabel(card.condition); return <span style={{ flexShrink:0, marginTop:'2px', background:'transparent', color:'#8A8A8E', border:'0.5px solid rgba(0,0,0,0.16)', fontSize:'9px', fontWeight:700, padding:'1px 6px', borderRadius:'4px', fontFamily:'var(--font-display)', letterSpacing:'.02em', whiteSpace:'nowrap' as const }}>{lbl}</span> })()}
                            </div>
                            {isInvestor && (
                            <div style={{ minHeight:binderCols>=7?'14px':'17px', marginTop:'2px' }}>
                              {isInvestor&&card.curPrice>0&&<div style={{ fontSize:binderCols>=7?'10px':'12px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-data)', letterSpacing:'-0.2px' }}>{card.curPrice.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} {String.fromCharCode(8364)}</div>}
                              {isInvestor && !(Number(card.curPrice) > 0)&&<div title="Données insuffisantes" style={{ fontSize:'12px', fontWeight:700, color:'#D2D2D7', fontFamily:'var(--font-data)', lineHeight:1.3 }}>{String.fromCharCode(8212)}</div>}
                            </div>
                            )}
                            <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'auto' }}>
                              <span style={{ fontSize:'11px' }}>{card.lang==='EN'?'🇺🇸':card.lang==='FR'?'🇫🇷':'🇯🇵'}</span>
                              {card.number&&card.number!=='???'&&card.number!=='SEALED'&&<span style={{ fontSize:'10px', color:'#6E6E73', fontFamily:'var(--font-data)' }}>#{card.number}</span>}
                              {(()=>{
                                const sid=card.setId||''
                                const is1st=sid.includes('-shadowless-ns')||sid.includes('-1st')
                                const isShd=sid.includes('-shadowless')&&!is1st
                                if(!is1st&&!isShd) return null
                                const lbl=is1st?'1ST EDITION':'SHADOWLESS'
                                return <span className={'ed-badge '+(is1st?'ed-1st-edition':'ed-shadowless')} style={{ flexShrink:0, marginLeft:'auto', fontSize:binderCols>=8?'7px':'8px', padding:binderCols>=8?'2px 4px':'2px 5px' }}>{lbl}</span>
                              })()}
                              {card.qty>1&&<span style={{ fontSize:'10px', fontWeight:700, color:'#AEAEB2', fontFamily:'var(--font-data)', flexShrink:0, marginLeft:'2px' }}>{String.fromCharCode(215)}{card.qty}</span>}
                            </div>
                          </div>
                          <div className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}}
                            onMouseEnter={e=>{const p=e.currentTarget.parentElement;if(p){p.style.transform='translateY(-8px)';p.style.transition='none'}}}
                            onClick={e=>{e.stopPropagation();removeCard(card,e)}}
                            style={{ position:'absolute', top:0, left:0, right:0, height:'25%', zIndex:20, cursor:'pointer', opacity:0, transition:'opacity .15s', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'6px', borderRadius:'10px 10px 0 0', background:'linear-gradient(to bottom, rgba(255,255,255,.85) 0%, rgba(255,255,255,.4) 60%, transparent 100%)' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.55)', backdropFilter:'blur(16px) saturate(180%)', WebkitBackdropFilter:'blur(16px) saturate(180%)', color:'#E03020', borderRadius:'99px', padding:'4px 11px', fontSize:'9px', fontWeight:600, fontFamily:'var(--font-display)', whiteSpace:'nowrap', boxShadow:'0 2px 10px rgba(0,0,0,.12), inset 0 0 0 0.5px rgba(255,255,255,0.7)', pointerEvents:'none' }}><svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/></svg>Retirer</span>
                          </div>
                        </div>
                      )
                    })}
                    {Array.from({length:phantomCount}).map((_,i)=>(
                      <div key={'ph-'+i} onClick={()=>setAddOpen(true)}
                        style={{ aspectRatio:'63/88', borderRadius:'10px', border:'1.5px dashed #C8C5C0', background:'#F0F0F5', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s', boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}
                        onMouseEnter={e=>{ e.currentTarget.style.borderColor='#D2D2D7'; e.currentTarget.style.background='#F0F0F5'; e.currentTarget.style.transform='scale(1.02)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.05)' }}
                        onMouseLeave={e=>{ e.currentTarget.style.borderColor='#C7C7CC'; e.currentTarget.style.background='#F0F0F5'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.08)' }}>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
                          <div style={{ width:'22px', height:'22px', borderRadius:'50%', border:'1px solid #E5E5EA', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', color:'#86868B' }}>+</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>)}
                {binderPages>1&&binderSet&&(
                  <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:8, marginTop:20, padding:'10px 12px', background:'rgba(255,255,255,0.6)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', borderRadius:14, border:'1px solid rgba(229,229,234,0.6)', boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)', width:'fit-content', margin:'20px auto 0' }}>
                    <button onClick={()=>setBinderPage(Math.max(0,binderPage-1))} disabled={binderPage===0} style={{ width:28, height:28, borderRadius:8, border:'none', background:'transparent', cursor:binderPage===0?'default':'pointer', opacity:binderPage===0?.3:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#1D1D1F', transition:'all .15s' }}
                      onMouseEnter={e=>{ if(binderPage>0) e.currentTarget.style.background='rgba(0,0,0,0.05)' }}
                      onMouseLeave={e=>{ e.currentTarget.style.background='transparent' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <div style={{ display:'flex', gap:4 }}>
                      {Array.from({length:binderPages}).map((_,i)=>(
                        <div key={i} onClick={()=>setBinderPage(i)} style={{ minWidth:28, height:28, padding:'0 10px', borderRadius:8, background:i===binderPage?'#1D1D1F':'transparent', color:i===binderPage?'#fff':'#6E6E73', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:i===binderPage?700:500, cursor:'pointer', transition:'all .15s', fontFamily:'var(--font-data)' }}
                          onMouseEnter={e=>{ if(i!==binderPage) e.currentTarget.style.background='rgba(0,0,0,0.05)' }}
                          onMouseLeave={e=>{ if(i!==binderPage) e.currentTarget.style.background='transparent' }}>{i+1}</div>
                      ))}
                    </div>
                    <button onClick={()=>setBinderPage(Math.min(binderPages-1,binderPage+1))} disabled={binderPage===binderPages-1} style={{ width:28, height:28, borderRadius:8, border:'none', background:'transparent', cursor:binderPage===binderPages-1?'default':'pointer', opacity:binderPage===binderPages-1?.3:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#1D1D1F', transition:'all .15s' }}
                      onMouseEnter={e=>{ if(binderPage<binderPages-1) e.currentTarget.style.background='rgba(0,0,0,0.05)' }}
                      onMouseLeave={e=>{ e.currentTarget.style.background='transparent' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VITRINE */}
        {view==='showcase'&&(
          <div style={{ position:'relative', zIndex:1, padding:'0 24px 20px', animation:'fadeUp .3s ease-out' }}>
            <div className="kvitrine-head" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px' }}>
              <div className="kvitrine-title">
                <div style={{ fontSize:'10px', color:'#48484A', textTransform:'uppercase' as const, letterSpacing:'.15em', fontFamily:'var(--font-display)', marginBottom:'4px' }}>Vitrine</div>
                <div style={{ fontSize:'13px', color:'#48484A', fontFamily:'var(--font-display)' }}>{showcase.length===0?'Exposez vos plus belles pieces':showcase.length+' piece'+(showcase.length!==1?'s':'')+' exposee'+(showcase.length!==1?'s':'')}</div>
              </div>
              <div className="kvitrine-actions" style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <button onClick={()=>setShowInfo(v=>!v)}
                  style={{ padding:'0', width:'36px', height:'36px', borderRadius:'99px', background:showInfo?'#F5F5F7':'#F5F5F7', border:'1px solid #E5E5EA', color:showInfo?'#1D1D1F':'#AEAEB2', fontSize:'12px', cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{showInfo?<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z"/>:<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/>}</svg>
                </button>
                <button className="kvitrine-share" onClick={()=>{ setShareCtx('showcase'); setShareCard(null); setShareOpen(true) }}
                  disabled={showcase.length===0}
                  style={{ padding:'10px 20px', borderRadius:12, background:showcase.length>0?'#1D1D1F':'rgba(0,0,0,0.05)', border:'none', color:showcase.length>0?'#fff':'#AEAEB2', fontSize:12, fontWeight:600, cursor:showcase.length>0?'pointer':'default', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const, transition:'all .2s cubic-bezier(.2,.8,.2,1)', display:'inline-flex', alignItems:'center', gap:6, opacity:showcase.length>0?1:.6 }}
                  onMouseEnter={e=>{ if(showcase.length>0){ e.currentTarget.style.background='#000'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)' } }}
                  onMouseLeave={e=>{ if(showcase.length>0){ e.currentTarget.style.background='#1D1D1F'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' } }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  Partager ma Vitrine
                </button>
                <button className="kvitrine-add" onClick={()=>{ if(portfolio.length===0){ showToast('Ajoutez des cartes a votre collection') }else if(showcase.length>=5){ showToast('La vitrine est limitee a 5 pieces') }else{ setShowPickerForShowcase(true) } }}
                  style={{ padding:'10px 20px', borderRadius:12, background:'#1D1D1F', border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const, transition:'all .2s cubic-bezier(.2,.8,.2,1)', display:'inline-flex', alignItems:'center', gap:6 }}
                  onMouseEnter={e=>{ e.currentTarget.style.background='#000'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)' }}
                  onMouseLeave={e=>{ e.currentTarget.style.background='#1D1D1F'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                  <span className="kvitrine-add-label">Ajouter une carte</span>
                </button>
              </div>
            </div>
            {showcase.length===0?(
              <div style={{
                textAlign:'center',
                padding:'72px 32px',
                display:'flex', flexDirection:'column', alignItems:'center', gap:20,
                background: 'rgba(255,255,255,0.62)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                borderRadius: 18,
                border: 'none',
                boxShadow: '0 4px 24px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)',
              }}>
                {/* Icone decorative */}
                <div style={{ width:64, height:64, borderRadius:16, background:'linear-gradient(135deg, rgba(255,180,90,0.18), rgba(255,140,60,0.12))', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(255,140,60,0.12)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C53010" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <div style={{ fontSize:18, color:'#1D1D1F', fontWeight:700, fontFamily:'var(--font-display)', letterSpacing:'-0.3px' }}>Compose ta vitrine</div>
                  <div style={{ fontSize:13, color:'#6E6E73', fontFamily:'var(--font-body)', maxWidth:340, lineHeight:1.5 }}>
                    Tes 5 plus belles pieces, mises en lumiere comme dans un musee personnel.
                  </div>
                </div>
                {portfolio.length>0&&(
                  <button onClick={()=>setShowPickerForShowcase(true)} style={{ padding:'12px 24px', borderRadius:12, background:'#1D1D1F', border:'none', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .2s cubic-bezier(.2,.8,.2,1)', display:'inline-flex', alignItems:'center', gap:8 }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='#000'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(0,0,0,0.18)' }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='#1D1D1F'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}>
                    Choisir depuis ma collection
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                )}
                {portfolio.length===0&&(
                  <div style={{ fontSize:11, color:'#AEAEB2', fontFamily:'var(--font-display)', textTransform:'uppercase' as const, letterSpacing:'.1em' }}>Ajoute d&apos;abord des cartes a ta collection</div>
                )}
              </div>
            ):(
              /* ── VITRINE LUXE ── */
              <div className="kvitrine-stage" style={{ background:(()=>{ const m:Record<string,string>={obsidienne:'#080604',nuit:'radial-gradient(ellipse at 50% 30%,#120820 0%,#080510 50%,#030208 100%)',jade:'linear-gradient(160deg,#020b06 0%,#030e08 50%,#020a07 100%)',pokedex:'#04080c',holodex:'#030b0f',centre:'#030206',labo:'#04080a'}; return m[showcaseBg]??'#080604' })(), borderRadius:'24px', padding:'60px 48px 52px', position:'relative', overflow:'hidden', boxShadow:'inset 0 1px 0 rgba(255,255,255,.03),inset 0 -1px 0 rgba(0,0,0,.8),0 40px 80px rgba(0,0,0,.5),0 0 0 1px rgba(0,0,0,.1)' }}>
                {showcaseBg==='obsidienne'&&<>
                  <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(201,168,76,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,.05) 1px,transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 50%,rgba(201,168,76,.06) 0%,transparent 60%)', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:'1px', background:'linear-gradient(90deg,transparent,rgba(201,168,76,.5),transparent)', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', top:0, left:0, width:'60px', height:'60px', borderTop:'1px solid rgba(201,168,76,.4)', borderLeft:'1px solid rgba(201,168,76,.4)', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', top:0, right:0, width:'60px', height:'60px', borderTop:'1px solid rgba(201,168,76,.4)', borderRight:'1px solid rgba(201,168,76,.4)', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', bottom:0, left:0, width:'60px', height:'60px', borderBottom:'1px solid rgba(201,168,76,.4)', borderLeft:'1px solid rgba(201,168,76,.4)', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', bottom:0, right:0, width:'60px', height:'60px', borderBottom:'1px solid rgba(201,168,76,.4)', borderRight:'1px solid rgba(201,168,76,.4)', pointerEvents:'none' }}/>
                </>}
                {showcaseBg==='nuit'&&<div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 25% 40%,rgba(100,40,200,.15) 0%,transparent 40%),radial-gradient(ellipse at 75% 30%,rgba(255,180,0,.08) 0%,transparent 35%),radial-gradient(ellipse at 50% 20%,rgba(200,80,255,.1) 0%,transparent 30%)', pointerEvents:'none' }}/>}
                {showcaseBg==='jade'&&<>
                  <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(30deg,transparent,transparent 14px,rgba(16,185,80,.022) 14px,rgba(16,185,80,.022) 15px),repeating-linear-gradient(-30deg,transparent,transparent 14px,rgba(16,185,80,.022) 14px,rgba(16,185,80,.022) 15px)', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(16,185,100,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,100,.04) 1px,transparent 1px)', backgroundSize:'24px 24px', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', bottom:0, left:'10%', right:'10%', height:'1px', background:'linear-gradient(90deg,transparent,rgba(16,185,80,.5),transparent)', pointerEvents:'none' }}/>
                </>}
                {(showcaseBg==='pokedex'||showcaseBg==='holodex')&&<>
                  <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,180,255,.018) 3px,rgba(0,180,255,.018) 4px)', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(0,160,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,160,255,.05) 1px,transparent 1px)', backgroundSize:'30px 30px', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', top:0, left:0, width:'18px', height:'18px', borderTop:'1.5px solid rgba(0,200,255,.5)', borderLeft:'1.5px solid rgba(0,200,255,.5)', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', top:0, right:0, width:'18px', height:'18px', borderTop:'1.5px solid rgba(0,200,255,.5)', borderRight:'1.5px solid rgba(0,200,255,.5)', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'1px', background:'linear-gradient(90deg,transparent,rgba(0,200,255,.5),transparent)', pointerEvents:'none' }}/>
                </>}
                {showcaseBg==='centre'&&<>
                  <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 55% 40%,rgba(255,80,160,.07) 0%,transparent 55%),radial-gradient(ellipse at 20% 60%,rgba(255,120,200,.04) 0%,transparent 40%)', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', top:'12px', left:'50%', transform:'translateX(-50%)', fontSize:'9px', fontWeight:700, letterSpacing:'.18em', color:'rgba(255,160,210,.2)', whiteSpace:'nowrap' as const, pointerEvents:'none' }}>✚ CENTRE POKÉMON ✚</div>
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'1px', background:'linear-gradient(90deg,transparent,rgba(255,120,200,.5),transparent)', pointerEvents:'none' }}/>
                </>}
                {showcaseBg==='labo'&&<>
                  <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(175deg,transparent,transparent 40px,rgba(120,80,40,.04) 40px,rgba(120,80,40,.04) 41px)', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 0%,rgba(200,140,40,.07) 0%,transparent 50%)', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:'200px', height:'60px', background:'radial-gradient(ellipse at 50% 0%,rgba(255,240,180,.07) 0%,transparent 70%)', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'1px', background:'linear-gradient(90deg,transparent,rgba(200,160,80,.4),transparent)', pointerEvents:'none' }}/>
                </>}
                <div className="kvitrine-cards" style={{ display:'flex', gap:'28px', flexWrap:'wrap' as const, justifyContent:'center', alignItems:'flex-end', position:'relative' }}>
                  {showcase.slice(0,5).map((card,idx)=>{
                    const ec=EC[card.type]??'#888', eg=EG[card.type]??'rgba(128,128,128,.4)'
                    const roi=card.buyPrice>0?Math.round(((card.curPrice-card.buyPrice)/card.buyPrice)*100):0
                    const ls=LS[card.lang]
                    const isGold=card.rarity?.includes('Gold')
                    const borderCol=isGold?'rgba(255,215,0,.45)':ec+'50'
                    const glowCol=isGold?'rgba(255,215,0,.18)':ec+'22'
                    const priceCol=isGold?'#FFD740':'#C9A84C'
                    const metalTop=isGold?'rgba(255,215,0,.5)':ec+'60'
                    const shimDelay=idx*0.9
                    const isFeat = showcase.length>1 && idx===Math.floor((showcase.length-1)/2)
                    return (
                      <div key={card.id} className={idx===0?'kvc-slot kvc-star':'kvc-slot kvc-mini'} style={{ display:'flex', flexDirection:'column', alignItems:'center', animation:`showcaseReveal .6s ${idx*.12}s cubic-bezier(.16,1,.3,1) both`, position:'relative', zIndex:1 }}>
                        {/* Spotlight cone */}
                        <div style={{ position:'absolute', top:'-80px', left:'50%', transform:'translateX(-50%)', width:'200px', height:'160px', background:`radial-gradient(ellipse at 50% 0%,${isGold?'rgba(255,240,150,.18)':isFeat?`${ec}28`:'rgba(29,29,31,.05)'} 0%,transparent 60%)`, pointerEvents:'none' }}/>

                        {/* Card slot */}
                        <div
                          draggable
                          onDragStart={()=>setDragIdx(idx)}
                          onDragOver={e=>e.preventDefault()}
                          onDrop={()=>{ if(dragIdx===null||dragIdx===idx) return; reorderShowcase(dragIdx, idx); setDragIdx(null) }}
                          onDragEnd={()=>setDragIdx(null)}
                          onClick={()=>{ setSpotCard(card); setEditQty(null) }}
                          className="kvitrine-card"
                          style={{ width:'220px', aspectRatio:'63/88', borderRadius:'14px', position:'relative', overflow:'hidden', cursor:'grab', border:`1.5px solid ${dragIdx===idx?'rgba(255,107,53,.8)':borderCol}`, boxShadow:dragIdx===idx?`0 0 0 2px rgba(255,107,53,.4)`:`0 12px 40px ${glowCol}`, opacity:dragIdx===idx?.4:1, transition:'box-shadow .45s ease', background:'#040302', animation:`floatCard ${6+idx*.6}s ${idx*1.2}s ease-in-out infinite` }}
                          onMouseMove={e=>{
                            const el=e.currentTarget as HTMLElement
                            if (!el.dataset.hovered) return
                            const r=el.getBoundingClientRect()
                            const x=((e.clientX-r.left)/r.width-.5)*16
                            const y=((e.clientY-r.top)/r.height-.5)*-20
                            el.style.transform=`perspective(700px) rotateY(${x}deg) rotateX(${y}deg) translateY(-20px) scale(1.05)`
                            el.style.boxShadow=`0 ${24+Math.abs(y)*1.2}px 48px rgba(0,0,0,.45), 0 0 50px ${ec}20, 0 0 0 1px ${borderCol}`
                          }}
                          onMouseEnter={e=>{
                            const el=e.currentTarget as HTMLElement
                            el.dataset.hovered='1'
                            el.style.animation='none'
                            el.style.transition='transform .35s cubic-bezier(.34,1.3,.64,1),box-shadow .35s ease'
                            el.style.transform='perspective(700px) translateY(-20px) scale(1.05)'
                            el.style.boxShadow=`0 24px 50px rgba(0,0,0,.5), 0 0 60px ${ec}25, 0 0 0 1px ${borderCol}`
                            setTimeout(()=>{ if(el.dataset.hovered) el.style.transition='none' }, 350)
                          }}
                          onMouseLeave={e=>{
                            const el=e.currentTarget as HTMLElement
                            delete el.dataset.hovered
                            el.style.transition='transform .55s cubic-bezier(.34,1.1,.64,1),box-shadow .55s ease'
                            el.style.transform=''
                            el.style.boxShadow=`0 12px 40px ${glowCol}`
                            setTimeout(()=>{ if(!el.dataset.hovered) el.style.animation=`floatCard ${6+idx*.6}s ${idx*1.2}s ease-in-out infinite` }, 560)
                          }}>
                          {/* BG */}
                          <div style={{ position:'absolute', inset:0, background:`linear-gradient(145deg,${ec}18,${ec}06)` }}/>
                          {/* Image */}
                          {card.image ? (
                            <img src={cleanImageUrl(card.image)} alt={card.name}
                              style={{ position:'absolute', inset:0, width:'100%', height:'100%', ...kthumbFit(card) }}
                              onError={e=>{ const t=e.target as HTMLImageElement; t.onerror=null; t.style.opacity='0'; t.style.height='100%'; const p=t.parentElement; if(p&&!p.querySelector('.no-img-ph')){const d=document.createElement('div');d.className='no-img-ph';d.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;cursor:pointer';d.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg><span style="font-size:8px;color:#AEAEB2">Ajouter</span>';p.appendChild(d)} }}/>
                          ) : (
                            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <div style={{ position:'absolute', width:'65%', height:'65%', borderRadius:'50%', background:eg, filter:'blur(24px)', opacity:.5 }}/>
                              <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec}DD,${ec}88)`, boxShadow:`0 0 24px ${eg}`, zIndex:1 }}/>
                            </div>
                          )}
                          {/* Shimmer */}
                          <div style={{ position:'absolute', top:0, left:'-80px', width:'50px', height:'100%', background:'linear-gradient(90deg,transparent,rgba(29,29,31,.07),transparent)', transform:'skewX(-12deg)', animation:`shim ${3+idx*.4}s ${shimDelay}s ease-in-out infinite` }}/>
                          {/* Metal lines */}
                          <div style={{ position:'absolute', top:0, left:0, right:0, height:'1px', background:`linear-gradient(90deg,transparent,${metalTop},transparent)` }}/>
                          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'1px', background:`linear-gradient(90deg,transparent,${ec}40,transparent)` }}/>
                          {/* Gradient overlay bas — discret */}
                          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.35) 0%,transparent 35%)', pointerEvents:'none' }}/>
                          {/* Drag dots */}
                          <div style={{ position:'absolute', top:'7px', left:'50%', transform:'translateX(-50%)', display:'flex', gap:'3px', opacity:.3, pointerEvents:'none' }}>
                            {[0,1,2].map(i=><div key={i} style={{ width:'3px', height:'3px', borderRadius:'50%', background:'#fff' }}/>)}
                          </div>
                          {/* Signal */}
                          {card.signal&&<div style={{ position:'absolute', top:'8px', right:'8px', zIndex:3, fontSize:'8px', fontWeight:700, background:TIER_BG[card.signal], color:'#1D1D1F', padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-display)' }}>{card.signal}</div>}
                          {/* Gold badge */}
                          {isGold&&<div style={{ position:'absolute', top:'8px', right:'8px', fontSize:'8px', fontWeight:800, background:'rgba(255,215,0,.15)', border:'1px solid rgba(255,215,0,.4)', color:'#FFD740', padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-display)' }}>★ Gold</div>}

                          {/* Retirer */}
                          <button className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}} onClick={e=>removeFromShowcase(card.id,e)}
                            style={{ position:'absolute', top:'7px', left:'7px', zIndex:10, background:'rgba(240,239,237,.94)', border:'1px solid #D2D2D7', color:'#3A3A3C', borderRadius:'7px', padding:'3px 9px', fontSize:'9px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', opacity:0, transition:'opacity .2s', pointerEvents:'all' }}>
                            Retirer
                          </button>
                        </div>
                        {/* Socle métal */}
                        <div style={{ width:'200px', height:'1px', background:`linear-gradient(90deg,transparent,${isGold?'rgba(255,215,0,.6)':ec+'60'},transparent)`, marginTop:'16px', transition:'width .4s' }}/>
                        <div style={{ width:'160px', height:'1px', background:`linear-gradient(90deg,transparent,${isGold?'rgba(255,215,0,.25)':ec+'25'},transparent)`, marginTop:'3px', transition:'width .4s' }}/>
                        {/* Ombre sol */}
                        <div style={{ width:'180px', height:'20px', background:`radial-gradient(ellipse at 50% 0%,rgba(0,0,0,.6) 0%,transparent 70%)`, marginTop:'4px', transition:'width .4s' }}/>
                        {/* Étiquette luxe */}
                        <div style={{ marginTop:'20px', textAlign:'center', opacity:showInfo?1:0, transition:'opacity .5s cubic-bezier(.16,1,.3,1),transform .5s cubic-bezier(.16,1,.3,1)', transform:showInfo?'translateY(0)':'translateY(8px)', minWidth:'190px', maxWidth:'240px' }}>
                          {/* Ligne décorative */}
                          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px', justifyContent:'center' }}>
                            <div style={{ flex:1, height:'1px', background:`linear-gradient(to right,transparent,${isGold?'rgba(255,215,0,.4)':'rgba(255,255,255,.12)'})` }}/>
                            <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:isGold?'rgba(255,215,0,.6)':'#E03020' }}/>
                            <div style={{ flex:1, height:'1px', background:`linear-gradient(to left,transparent,${isGold?'rgba(255,215,0,.4)':'rgba(255,255,255,.12)'})` }}/>
                          </div>
                          {/* Nom */}
                          <div style={{ fontSize:'14px', fontWeight:700, color:'rgba(255,255,255,.85)', fontFamily:'var(--font-display)', letterSpacing:'.06em', textTransform:'uppercase' as const, marginBottom:'6px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.name}</div>
                          {/* Place d'honneur : la valeur pour l'investisseur,
                              ce que la carte EST pour le collectionneur. */}
                          {isInvestor ? (
                            <div style={{ fontSize:'22px', fontWeight:700, color:'#fff', fontFamily:'var(--font-data)', letterSpacing:'-.02em', lineHeight:1, marginBottom:'8px' }}>
                              {formatEUR(card.curPrice, 'small')}
                            </div>
                          ) : (
                            <div style={{ marginBottom:'8px' }}>
                              {card.rarity ? (
                                <div style={{ fontSize:'16px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-.01em', lineHeight:1.15 }}>
                                  {card.rarity}
                                </div>
                              ) : null}
                              {card.set ? (
                                <div style={{ fontSize:'11px', fontWeight:500, color:'rgba(255,255,255,.5)', fontFamily:'var(--font-display)', marginTop:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                  {card.set}
                                </div>
                              ) : null}
                            </div>
                          )}
                          {/* Meta */}
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                            <span style={{ fontSize:'14px' }}>{ls.flag}</span>
                            {card.rarity&&<span style={{ fontSize:'10px', color:'rgba(255,255,255,.45)', fontFamily:'var(--font-display)', letterSpacing:'.06em' }}>{card.rarity}</span>}
                            {card.graded&&(()=>{
                            const gn=parseInt(card.condition.replace(/[^0-9]/g,''))
                            const gp=gn>=10||card.condition.includes('10')
                            const gh=gn>=9||card.condition.includes('9.5')||card.condition.includes('9')
                            return <span style={{ fontSize:'9px', fontWeight:800, fontFamily:'var(--font-data)', color:gp?'#FFD700':gh?'#D2D2D7':'rgba(255,255,255,.5)', letterSpacing:'.03em' }}>{card.condition}</span>
                          })()}
                            {show.pnl&&roi!==0&&card.buyPrice>0&&<span style={{ fontSize:'11px', fontWeight:700, color:roi>=0?'#2E9E6A':'#E03020', fontFamily:'var(--font-data)' }}>{roi>=0?'+':''}{roi}%</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* WRAPPED */}
        {view==='wrapped'&&(
          <WrappedView
            portfolio={portfolio}
            totalCur={totalCur}
            totalBuy={totalBuy}
            totalROI={totalROI}
            totalGain={totalGain}
            bestCard={bestCard}
            favs={favs}
            onShare={()=>{ setShareCtx('wrapped'); setShareCard(null); setShareOpen(true) }}
          />
        )}

        {/* SHARE SHEET */}
        <ShareSheet
          open={shareOpen}
          onClose={()=>{ setShareOpen(false); setSelectedFmt(null) }}
          context={shareCtx}
          card={shareCard}
          portfolio={portfolio}
          totalCur={totalCur}
          totalBuy={totalBuy}
          totalROI={totalROI}
          totalGain={totalGain}
          showToast={showToast}
          showcase={showcase}
        />

      </div>
            {/* CARD ZOOM */}
        {cardZoom&&spotCard&&spotCard.image&&(
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out', animation:'fadeUp .2s ease-out' }}
            onClick={()=>setCardZoom(false)}>
            <img src={cleanImageUrl(spotCard.image)} alt={spotCard.name}
              style={{ maxHeight:'90vh', maxWidth:'90vw', objectFit:'contain', borderRadius:'16px', boxShadow:'0 32px 80px rgba(0,0,0,.4)', animation:'illuminate .3s ease-out' }}
              onError={e=>{ const t=e.target as HTMLImageElement; if(t.src.includes('.webp')) t.src=t.src.replace('.webp','.jpg') }}/>
          </div>
        )}

                {/* ADD SET MODAL */}
      {addSetOpen&&(
        <div style={{ position:'fixed', inset:0, background:'rgba(20,15,10,0.35)', backdropFilter:'blur(12px) saturate(150%)', WebkitBackdropFilter:'blur(12px) saturate(150%)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}
          onClick={()=>setAddSetOpen(false)}>
          <div style={{
            background:'rgba(255,255,255,0.78)',
            backdropFilter:'blur(28px) saturate(180%)',
            WebkitBackdropFilter:'blur(28px) saturate(180%)',
            borderRadius:24,
            padding:24,
            maxWidth:500, width:'100%',
            animation:'fadeUp .25s ease-out',
            boxShadow:'0 24px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95), 0 0 0 1px rgba(0,0,0,0.04)',
          }}
            onClick={e=>e.stopPropagation()}>

            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22 }}>
              <div>
                <div style={{ fontSize:17, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-0.2px', lineHeight:1.2 }}>Ajouter une série complète</div>
                <div style={{ fontSize:11, color:'#86868B', marginTop:6, fontFamily:'var(--font-display)' }}>Toutes les cartes seront ajoutees en Raw</div>
              </div>
              <button onClick={()=>setAddSetOpen(false)} style={{
                width:30, height:30, borderRadius:'50%',
                background:'rgba(255,255,255,0.6)',
                backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
                border:'1px solid rgba(229,229,234,0.7)',
                color:'#48484A',
                cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
              }}
                onMouseEnter={e=>{ e.currentTarget.style.background='#1D1D1F'; e.currentTarget.style.color='#fff'; e.currentTarget.style.transform='scale(1.05)' }}
                onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.6)'; e.currentTarget.style.color='#48484A'; e.currentTarget.style.transform='' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Langue selector */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#48484A', fontFamily:'var(--font-display)', letterSpacing:'0.12em', textTransform:'uppercase' as const, marginBottom:8 }}>Langue</div>
              <div style={{ display:'flex', gap:6 }}>
                {([{k:'FR' as const, flag:'\u{1F1EB}\u{1F1F7}', label:'Francais'},{k:'EN' as const, flag:'\u{1F1FA}\u{1F1F8}', label:'English'},{k:'JP' as const, flag:'\u{1F1EF}\u{1F1F5}', label:'\u65E5\u672C\u8A9E'}]).map(l=>(
                  <button key={l.k} onClick={()=>{setAddSetLang(l.k);setAddSetCards([]);setAddSetId('');setAddSetName('')}} style={{
                    flex:1, padding:'11px 8px',
                    borderRadius:10,
                    border: '1px solid rgba(255,255,255,0.6)',
                    background: addSetLang===l.k ? 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)' : 'rgba(255,255,255,0.45)',
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    color: addSetLang===l.k ? '#1D1D1F' : '#48484A',
                    fontSize:12, fontWeight:700,
                    cursor:'pointer',
                    fontFamily:'var(--font-display)',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                    transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                    boxShadow: addSetLang===l.k ? '0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)' : 'inset 0 1px 0 rgba(255,255,255,0.7)',
                  }}>
                    <span style={{ fontSize:16 }}>{l.flag}</span>{l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Serie selector */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#48484A', fontFamily:'var(--font-display)', letterSpacing:'0.12em', textTransform:'uppercase' as const, marginBottom:8 }}>Serie</div>
              <select value={addSetId} onChange={e=>{
                const found=addSetSets.find(x=>x.id===e.target.value)
                if(!found) return
                setAddSetId(found.id)
                setAddSetName(found.name)
                setAddSetLoading(true)
                setAddSetCards([])
                getCardsForSet(addSetLang as 'EN'|'FR'|'JP',found.id).then(cards=>{setAddSetCards(staticToTCGCards(cards,found.id,addSetLang,(l,si,lid)=>getCardImageUrl({lang:l,setId:si,localId:lid})) as any);setAddSetLoading(false)}).catch(()=>setAddSetLoading(false))
              }} style={{
                width:'100%',
                appearance:'none' as const,
                background:'rgba(255,255,255,0.7)',
                backdropFilter:'blur(12px) saturate(180%)',
                WebkitBackdropFilter:'blur(12px) saturate(180%)',
                borderRadius:12,
                border:'1px solid rgba(229,229,234,0.7)',
                padding:'12px 36px 12px 14px',
                color: addSetId ? '#1D1D1F' : '#86868B',
                fontSize:13, fontWeight:500,
                fontFamily:'var(--font-display)',
                outline:'none', cursor:'pointer',
                boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
                backgroundImage:'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\'%3E%3Cpath d=\'M1 1L5 5L9 1\' stroke=\'%2348484A\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',
                backgroundRepeat:'no-repeat',
                backgroundPosition:'right 14px center',
              }}>
                <option value="">Sélectionner une série...</option>
                {(() => {
                  const filtered = filterCoreSets(addSetSets)
                  const groups = groupSetsByEra(filtered)
                  return groups.map(g => (
                    <optgroup key={g.label} label={g.label}>
                      {g.sets.map(ls => {
                        const displayName = addSetLang === 'JP'
                          ? formatJPSetName(ls, filtered)
                          : ls.name
                        return (
                          <option key={ls.id} value={ls.id} style={{background:'#fff',color:'#1D1D1F'}}>
                            {displayName}{ls.total ? ' (' + ls.total + ')' : ''}
                          </option>
                        )
                      })}
                    </optgroup>
                  ))
                })()}
              </select>
            </div>

            {/* Loading */}
            {addSetLoading&&(
              <div style={{ textAlign:'center', padding:'24px 0', color:'#86868B', fontSize:12, fontFamily:'var(--font-display)' }}>
                <div style={{ width:24, height:24, border:'2.5px solid rgba(0,0,0,0.08)', borderTop:'2.5px solid #1D1D1F', borderRadius:'50%', animation:'spin .8s linear infinite', margin:'0 auto 10px' }}/>
                Chargement des cartes...
              </div>
            )}

            {/* Cards count + progress + CTA */}
            {addSetCards.length>0&&!addSetLoading&&(()=>{
              const existingNums = new Set(portfolio.filter(c=>c.set===addSetName).map(c=>c.number))
              const alreadyOwned = addSetCards.filter(c=>existingNums.has(c.localId||'')).length
              const toAdd = addSetCards.length - alreadyOwned
              return (
                <div>
                  <div style={{
                    background:'rgba(255,255,255,0.7)',
                    backdropFilter:'blur(12px) saturate(180%)',
                    WebkitBackdropFilter:'blur(12px) saturate(180%)',
                    border:'1px solid rgba(229,229,234,0.7)',
                    borderRadius:14, padding:'16px 18px', marginBottom:14,
                    boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <span style={{ fontSize:15, fontWeight:800, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-0.2px' }}>{addSetCards.length} cartes</span>
                      {alreadyOwned>0&&<span style={{ fontSize:11, color:'#86868B', fontFamily:'var(--font-display)' }}>dont {alreadyOwned} deja possedees</span>}
                    </div>
                    <div style={{ height:6, borderRadius:3, background:'rgba(0,0,0,0.06)', overflow:'hidden', marginBottom:12 }}>
                      <div style={{ width: addSetCards.length>0 ? Math.round(alreadyOwned/addSetCards.length*100)+'%' : '0%', height:'100%', background:'linear-gradient(90deg,#1D1D1F,#48484A)', borderRadius:3, transition:'width .3s' }}/>
                    </div>
                    <div style={{ display:'flex', gap:18, fontSize:11, fontFamily:'var(--font-display)' }}>
                      {alreadyOwned>0&&<span style={{ color:'#2E9E6A', fontWeight:600 }}>✓ {alreadyOwned} conservees</span>}
                      <span style={{ color:'#1D1D1F', fontWeight:600 }}>+ {toAdd} nouvelles</span>
                    </div>
                  </div>
                  <button onClick={()=>{
                    if(toAdd===0){ showToast('Série déjà complète'); return }
                    const newCards: CardItem[] = addSetCards
                      .filter(c=>!existingNums.has(c.localId||''))
                      .map(c=>({
                        id:crypto.randomUUID(),
                        name:c.name, set:addSetName, year:new Date().getFullYear(),
                        number:c.localId||'', rarity:c.rarity||'',
                        type:'fire', lang:addSetLang,
                        condition:'Near Mint', graded:false,
                        buyPrice:0, curPrice:0, qty:1,
                        image:c.image||undefined,
                        setId:addSetId, setTotal:addSetCards.length,
                      }))
                    if (guardLimit(newCards.length)) { setAddSetOpen(false); return }
                    setPortfolio(prev=>[...prev,...newCards])
                    persistCards(newCards)
                    setAddSetOpen(false)
                    showToast(toAdd+' cartes ajoutees')
                  }} style={{
                    width:'100%', padding:'14px 18px',
                    borderRadius:12,
                    background:'#1D1D1F',
                    color:'#fff',
                    border:'none',
                    fontSize:14, fontWeight:700,
                    cursor:'pointer',
                    fontFamily:'var(--font-display)',
                    transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                    letterSpacing:'0.02em',
                    boxShadow:'0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12)',
                  }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='#000'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='#1D1D1F'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12)' }}>
                    {toAdd>0 ? 'Ajouter les '+toAdd+' cartes manquantes' : 'Série déjà complète'}
                  </button>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── WELCOME ── glass v7 (v2 enrichie) */}
      {showWelcome&&(
        <div style={{ position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',
          background:'rgba(245,245,247,0.74)',backdropFilter:'blur(28px) saturate(160%)',WebkitBackdropFilter:'blur(28px) saturate(160%)' }}
          onClick={()=>setShowWelcome(false)}>
          {/* bokeh doux */}
          <div style={{ position:'absolute',inset:0,pointerEvents:'none',
            backgroundImage:'radial-gradient(ellipse at 22% 26%, rgba(224,48,32,0.06) 0%, transparent 45%), radial-gradient(ellipse at 80% 74%, rgba(201,162,39,0.07) 0%, transparent 45%)' }} />
          <div onClick={e=>e.stopPropagation()} style={{
            position:'relative',maxWidth:'460px',width:'100%',textAlign:'center',
            background:'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.8) 100%)',
            backdropFilter:'blur(48px) saturate(200%)',WebkitBackdropFilter:'blur(48px) saturate(200%)',
            borderRadius:24,border:'0.5px solid rgba(255,255,255,0.6)',
            boxShadow:'0 24px 80px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)',
            padding:'44px 40px 36px',
            animation:'welcomeIn .55s cubic-bezier(.16,1,.3,1) both' }}>

            {/* 3 vraies cartes BDD en éventail */}
            <div style={{ position:'relative',height:'150px',marginBottom:'18px',display:'flex',alignItems:'center',justifyContent:'center' }}>
              {welcomeCards.length>0 ? (
                welcomeCards.slice(0,3).map((c,i)=>{
                  const order = [ -1, 1, 0 ]   // rend gauche, droite, puis centre (z-index)
                  const o = order[i] ?? 0
                  const url = getCardImageUrl({ lang:c.lang, setId:c.setId, localId:c.localId })
                  return (
                    <div key={`${c.setId}-${c.localId}-${i}`}
                      style={{
                        position:'absolute',
                        transform:`translateX(${o*52}px) rotate(${o*8}deg) translateY(${Math.abs(o)*10}px)`,
                        zIndex:o===0?3:1,
                        transition:'transform .45s cubic-bezier(.16,1,.3,1)',
                      }}>
                      {/* enfant : opacity SEULEMENT (n'écrase pas le transform de l'éventail) */}
                      <div style={{
                        width:'88px',height:'122px',borderRadius:'9px',overflow:'hidden',
                        background:'#EDEDF0',position:'relative',
                        boxShadow:'0 14px 32px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)',
                        opacity:0, animation:`wcFade .5s ease-out ${i*120}ms forwards`,
                      }}>
                        <img src={url} alt={c.name} draggable={false}
                          style={{ width:'100%',height:'100%',...kthumbFit(c),display:'block' }}
                          onError={e=>{ const el=e.currentTarget.parentElement as HTMLElement|null; if(el) el.style.display='none' }} />
                        <div style={{ position:'absolute',inset:0,pointerEvents:'none',mixBlendMode:'overlay',
                          background:'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.5) 48%, transparent 62%)',
                          backgroundSize:'250% 250%',animation:'holoSweep 4.5s ease-in-out infinite' }} />
                      </div>
                    </div>
                  )
                })
              ) : (
                // skeleton neutre le temps du fetch (jamais le livre en premier)
                [-1,1,0].map(o=>(
                  <div key={o} style={{ position:'absolute',width:'88px',height:'122px',borderRadius:'9px',
                    transform:`translateX(${o*52}px) rotate(${o*8}deg) translateY(${Math.abs(o)*10}px)`,
                    zIndex:o===0?3:1,
                    background:'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(245,245,247,0.5))',
                    border:'0.5px solid rgba(255,255,255,0.6)',
                    boxShadow:'0 10px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.85)' }} />
                ))
              )}
            </div>
            <div style={{ fontSize:'11px',fontWeight:700,color:'#E03020',letterSpacing:'.2em',textTransform:'uppercase',fontFamily:'var(--font-display)',marginBottom:'12px' }}>Bienvenue sur Kodo Cards</div>
            <h2 style={{ fontSize:'27px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)',letterSpacing:'-1px',lineHeight:1.18,marginBottom:'14px' }}>
              Votre collection mérite<br/>
              <span style={{ background:'linear-gradient(135deg,#E03020,#FF6B35,#C9A227)',backgroundSize:'200% 200%',animation:'shimmerG 3s ease infinite',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}>d&apos;être célébrée.</span>
            </h2>
            <p style={{ fontSize:'14px',color:'#48484A',fontFamily:'var(--font-body)',lineHeight:1.65,marginBottom:'24px',maxWidth:'340px',marginLeft:'auto',marginRight:'auto' }}>
              Ajoutez votre première carte et regardez votre binder prendre vie. Chaque carte est un souvenir, une victoire, une passion.
            </p>

            {/* Ce qui t'attend */}
            <div style={{ display:'flex',gap:'8px',justifyContent:'center',marginBottom:'26px',flexWrap:'wrap' }}>
              {[['📈','Suivi de valeur'],['🏆','Master sets'],['🔔','Alertes prix']].map(([ic,lbl])=>(
                <div key={lbl} style={{ display:'inline-flex',alignItems:'center',gap:'6px',padding:'7px 13px',borderRadius:'99px',
                  background:'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.55) 100%)',
                  border:'0.5px solid rgba(255,255,255,0.6)',
                  boxShadow:'0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
                  fontSize:'12px',fontWeight:600,color:'#3A3A3C',fontFamily:'var(--font-display)' }}>
                  <span style={{ fontSize:'13px' }}>{ic}</span>{lbl}
                </div>
              ))}
            </div>

            <div style={{ display:'flex',flexDirection:'column',gap:'10px',alignItems:'center' }}>
              <button onClick={()=>{ setShowWelcome(false); setAddOpen(true) }}
                style={{ width:'100%',maxWidth:'300px',padding:'14px 32px',borderRadius:'12px',background:'#1D1D1F',color:'#fff',border:'none',fontSize:'14px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',letterSpacing:'.02em',transition:'all .2s cubic-bezier(.2,.8,.2,1)',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'7px',
                  boxShadow:'0 8px 28px rgba(0,0,0,0.18)' }}
                onMouseEnter={e=>{e.currentTarget.style.background='#000';e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 12px 36px rgba(0,0,0,0.22)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='#1D1D1F';e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,0.18)'}}>
                + Ajouter ma première carte
              </button>
              <button onClick={()=>setShowWelcome(false)}
                style={{ padding:'8px 16px',borderRadius:'10px',background:'transparent',color:'#6E6E73',border:'none',fontSize:'13px',fontWeight:500,cursor:'pointer',fontFamily:'var(--font-display)',transition:'color .15s' }}
                onMouseEnter={e=>{e.currentTarget.style.color='#1D1D1F'}}
                onMouseLeave={e=>{e.currentTarget.style.color='#6E6E73'}}>
                Explorer d&apos;abord
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCANNER ── */}
      {scannerOpen&&(()=>{
        const fileRef = { current: null as HTMLInputElement|null }
        const handleScan = async (file: File) => {
          // Scan photo: pas encore actif (le bouton 'Scan' ouvre scannerSoonOpen = ecran SOON).
          // Code conserve pour reactivation post-lancement via route serveur. Aucun appel API direct.
          void file
          setScannerLoad(false)
          showToast('Le scan arrive bientot')
        }
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(20,15,10,0.35)', backdropFilter:'blur(12px) saturate(150%)', WebkitBackdropFilter:'blur(12px) saturate(150%)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}
            onClick={()=>{ if(!scannerLoad){ setScannerOpen(false); setScannerImg(null) } }}>
            <div style={{
              maxWidth:'420px', width:'100%',
              background:'rgba(255,255,255,0.78)',
              backdropFilter:'blur(28px) saturate(180%)',
              WebkitBackdropFilter:'blur(28px) saturate(180%)',
              borderRadius:24,
              overflow:'hidden',
              boxShadow:'0 24px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95), 0 0 0 1px rgba(0,0,0,0.04)',
              animation:'fadeUp .25s ease-out',
            }} onClick={e=>e.stopPropagation()}>

              {/* Header */}
              <div style={{ padding:'22px 24px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <div style={{ width:32, height:32, borderRadius:10, background:'rgba(245,245,247,0.7)', border:'1px solid rgba(229,229,234,0.7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>
                    <span style={{ fontSize:17, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-0.2px' }}>Scanner une carte</span>
                  </div>
                  <div style={{ fontSize:11, color:'#86868B', fontFamily:'var(--font-display)', paddingLeft:42 }}>L&apos;IA identifie automatiquement la carte</div>
                </div>
                {!scannerLoad&&(
                  <button onClick={()=>{ setScannerOpen(false); setScannerImg(null) }} style={{
                    width:30, height:30, borderRadius:'50%',
                    background:'rgba(255,255,255,0.6)',
                    backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
                    border:'1px solid rgba(229,229,234,0.7)',
                    color:'#48484A',
                    cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                    boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
                  }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='#1D1D1F'; e.currentTarget.style.color='#fff'; e.currentTarget.style.transform='scale(1.05)' }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.6)'; e.currentTarget.style.color='#48484A'; e.currentTarget.style.transform='' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>

              <div style={{ padding:'4px 24px 22px' }}>
                {/* Frame dropzone glass */}
                <div style={{
                  position:'relative', width:'100%', aspectRatio:'3/4',
                  borderRadius:18,
                  border: `2px dashed ${scannerImg ? '#2E9E6A' : 'rgba(0,0,0,0.18)'}`,
                  background:'rgba(255,255,255,0.5)',
                  backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
                  overflow:'hidden', marginBottom:14,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor: scannerLoad ? 'default' : 'pointer',
                  transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                  boxShadow: scannerImg ? '0 4px 16px rgba(46,158,106,0.12), inset 0 1px 0 rgba(255,255,255,0.95)' : 'inset 0 1px 0 rgba(255,255,255,0.85)',
                }}
                  onClick={()=>{if(!scannerLoad) fileRef.current?.click()}}
                  onMouseEnter={e=>{ if(!scannerImg&&!scannerLoad){ e.currentTarget.style.borderColor='rgba(0,0,0,0.35)'; e.currentTarget.style.background='rgba(255,255,255,0.7)' } }}
                  onMouseLeave={e=>{ if(!scannerImg&&!scannerLoad){ e.currentTarget.style.borderColor='rgba(0,0,0,0.18)'; e.currentTarget.style.background='rgba(255,255,255,0.5)' } }}>
                  {scannerImg ? (
                    <img src={scannerImg} alt="scan" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
                  ) : (
                    <div style={{ textAlign:'center' }}>
                      <div style={{ width:56, height:56, borderRadius:16, background:'rgba(255,255,255,0.7)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', border:'1px solid rgba(229,229,234,0.7)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', boxShadow:'0 4px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.95)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', marginBottom:4, letterSpacing:'-0.1px' }}>Photographiez votre carte</div>
                      <div style={{ fontSize:11, color:'#86868B', fontFamily:'var(--font-display)' }}>Cliquez ou glissez une photo</div>
                    </div>
                  )}
                  {/* Corner marks */}
                  {!scannerImg&&!scannerLoad&&(
                    <>
                      <div style={{ position:'absolute', top:10, left:10, width:22, height:22, borderTop:'2px solid #1D1D1F', borderLeft:'2px solid #1D1D1F', borderRadius:'2px 0 0 0' }}/>
                      <div style={{ position:'absolute', top:10, right:10, width:22, height:22, borderTop:'2px solid #1D1D1F', borderRight:'2px solid #1D1D1F', borderRadius:'0 2px 0 0' }}/>
                      <div style={{ position:'absolute', bottom:10, left:10, width:22, height:22, borderBottom:'2px solid #1D1D1F', borderLeft:'2px solid #1D1D1F', borderRadius:'0 0 0 2px' }}/>
                      <div style={{ position:'absolute', bottom:10, right:10, width:22, height:22, borderBottom:'2px solid #1D1D1F', borderRight:'2px solid #1D1D1F', borderRadius:'0 0 2px 0' }}/>
                    </>
                  )}
                  {/* Loading overlay */}
                  {scannerLoad&&(
                    <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.85)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', display:'flex', flexDirection:'column' as const, alignItems:'center', justifyContent:'center', gap:12 }}>
                      <div style={{ width:28, height:28, border:'2.5px solid rgba(0,0,0,0.08)', borderTop:'2.5px solid #1D1D1F', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
                      <div style={{ fontSize:12, color:'#1D1D1F', fontWeight:700, fontFamily:'var(--font-display)', letterSpacing:'0.02em' }}>Identification en cours</div>
                      <div style={{ fontSize:10, color:'#86868B', fontFamily:'var(--font-display)' }}>Analyse par IA...</div>
                    </div>
                  )}
                </div>

                <input type="file" accept="image/*" capture="environment" style={{ display:'none' }}
                  ref={el=>{ fileRef.current=el }}
                  onChange={e=>{ const f=e.target.files?.[0]; if(f) handleScan(f) }}/>

                {/* Buttons */}
                <div style={{ display:'flex', gap:8 }}>
                  <button disabled={scannerLoad}
                    onClick={()=>fileRef.current?.click()}
                    style={{
                      flex:1, padding:'14px 18px',
                      borderRadius:12,
                      background: scannerLoad ? 'rgba(0,0,0,0.05)' : '#1D1D1F',
                      border:'none',
                      color: scannerLoad ? '#AEAEB2' : '#fff',
                      fontSize:13, fontWeight:700,
                      cursor: scannerLoad ? 'default' : 'pointer',
                      fontFamily:'var(--font-display)',
                      transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                      letterSpacing:'0.02em',
                      boxShadow: scannerLoad ? 'none' : '0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12)',
                    }}
                    onMouseEnter={e=>{ if(!scannerLoad){ e.currentTarget.style.background='#000'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)' } }}
                    onMouseLeave={e=>{ if(!scannerLoad){ e.currentTarget.style.background='#1D1D1F'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12)' } }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    {scannerLoad ? 'Analyse...' : scannerImg ? 'Nouvelle photo' : 'Prendre une photo'}
                  </button>
                  {scannerImg&&!scannerLoad&&(
                    <button onClick={()=>setScannerImg(null)} style={{
                      padding:'14px 18px',
                      borderRadius:12,
                      background:'rgba(255,255,255,0.7)',
                      backdropFilter:'blur(12px) saturate(180%)',
                      WebkitBackdropFilter:'blur(12px) saturate(180%)',
                      border:'1px solid rgba(229,229,234,0.7)',
                      color:'#48484A',
                      fontSize:13, fontWeight:600,
                      cursor:'pointer',
                      fontFamily:'var(--font-display)',
                      transition:'all .2s cubic-bezier(.2,.85,.3,1)',
                      boxShadow:'0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
                    }}
                      onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.85)'; e.currentTarget.style.color='#1D1D1F' }}
                      onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.7)'; e.currentTarget.style.color='#48484A' }}>
                      Effacer
                    </button>
                  )}
                </div>

                {/* Info banner glass */}
                <div style={{
                  display:'flex', alignItems:'flex-start', gap:8,
                  marginTop:14,
                  padding:'10px 12px',
                  borderRadius:10,
                  background:'rgba(245,245,247,0.6)',
                  backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
                  border:'1px solid rgba(229,229,234,0.6)',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <span style={{ fontSize:10.5, color:'#48484A', fontFamily:'var(--font-display)', lineHeight:1.5 }}>Sur mobile, utilisez la camera. La carte sera identifiee par l&apos;IA et pre-remplie dans le formulaire d&apos;ajout.</span>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      <SoonModal
        open={scannerSoonOpen}
        onClose={()=>setScannerSoonOpen(false)}
        feature="Scanner IA"
        version="v2.0"
        description="Photographiez une carte et l'IA Kodo l'identifie automatiquement (set, numéro, langue, état) puis pré-remplit l'ajout au portefeuille."
        bullets={[
          'Reconnaissance instantanée par photo',
          'Pré-remplissage set / numéro / langue',
          'Détection auto raw vs gradée',
          'Ajout en un geste depuis mobile',
        ]}
        brevoListId={null}
      />
      <AddCardPicker open={cardPickOpen} onClose={()=>setCardPickOpen(false)}
        onSwitchToSealed={()=>{ setCardPickOpen(false); setSealedPickOpen(true) }}
        onPick={applyCardSeed} defaultLang={addForm.lang} />
      <AddSealedPicker open={sealedPickOpen} onClose={()=>setSealedPickOpen(false)}
        onSwitchToCard={()=>{ setSealedPickOpen(false); setCardPickOpen(true) }}
        onPick={(seed)=>{ setSealedPickOpen(false); setSealedSeed(seed) }} />
      <AddSealedModal open={!!sealedSeed} onClose={()=>setSealedSeed(null)}
        product={sealedSeed} onAdd={handleSealedAdd} />
      <ImportPortfolioModal
        isOpen={importOpen}
        onClose={()=>setImportOpen(false)}
        onImport={(imported)=>{
          const mapped = imported.map(c=>({
            id: crypto.randomUUID(),
            name: c.name,
            set: c.set,
            year: new Date().getFullYear(),
            number: '???',
            rarity: '',
            type: 'fire',
            lang: (c.language?.toUpperCase() === 'JP' ? 'JP' : c.language?.toUpperCase() === 'FR' ? 'FR' : 'EN') as 'EN'|'JP'|'FR',
            condition: c.grade ?? c.condition ?? 'Raw',
            graded: c.graded,
            buyPrice: c.price,
            curPrice: c.price,
            qty: c.qty,
          }))
          if (guardLimit(mapped.length)) { setImportOpen(false); return }
          setPortfolio(prev=>[...prev, ...mapped])
          persistCards(mapped)
          setImportOpen(false)
          showToast(imported.length+' cartes importées')
        }}
      />
    </div>
    </>
  )
}