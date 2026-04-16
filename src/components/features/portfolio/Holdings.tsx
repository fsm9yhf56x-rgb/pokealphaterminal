'use client'

import { useState, useRef, useEffect } from 'react'
import { fetchSets, fetchCardsForSet, fetchCardDetail, type TCGSet, type TCGCard } from '@/lib/tcgApi'
import { cleanImageUrl } from '@/lib/cardImages'
import ImportPortfolioModal from './ImportPortfolioModal'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCardImageUrl } from '@/lib/cardImages'
import { getCardsForSet, staticToTCGCards } from '@/lib/cardDb'
import { useAuth } from '@/lib/useAuth'
import { ShareSheet } from './ShareSheet'
import { WrappedView } from './WrappedView'

type CardItem = {
  id: string; name: string; set: string; year: number; number: string
  rarity: string; type: string; lang: 'EN'|'JP'|'FR'
  condition: string; graded: boolean; imageStatus?: 'pending'|'approved'|'rejected'
  buyPrice: number; curPrice: number; qty: number
  psa?: number; signal?: 'S'|'A'|'B'; hot?: boolean; favorite?: boolean
  image?: string; setTotal?: number; setId?: string; edition?: string; variant?: string
}

const ENCYCLOPEDIA: CardItem[] = [
  { id:'e1',  name:'Charizard Alt Art',    set:'SV151',            year:2023, number:'006', rarity:'Alt Art',     type:'fire',     lang:'EN', condition:'Raw', graded:false, buyPrice:0, curPrice:920,  qty:1, psa:312,  signal:'S', hot:true  },
  { id:'e2',  name:'Umbreon VMAX Alt',     set:'Evolving Skies',   year:2021, number:'215', rarity:'Alt Art',     type:'dark',     lang:'EN', condition:'Raw', graded:false, buyPrice:0, curPrice:880,  qty:1,            signal:'A'           },
  { id:'e3',  name:'Charizard VMAX',       set:'Champion Path',    year:2020, number:'074', rarity:'Secret Rare', type:'fire',     lang:'EN', condition:'Raw', graded:false, buyPrice:0, curPrice:420,  qty:1, psa:1240                       },
  { id:'e4',  name:'Gengar VMAX Alt',      set:'Fusion Strike',    year:2021, number:'271', rarity:'Alt Art',     type:'psychic',  lang:'EN', condition:'Raw', graded:false, buyPrice:0, curPrice:340,  qty:1                                 },
  { id:'e5',  name:'Pikachu VMAX RR',      set:'Vivid Voltage',    year:2020, number:'188', rarity:'Secret Rare', type:'electric', lang:'JP', condition:'Raw', graded:false, buyPrice:0, curPrice:110,  qty:1, psa:4200                       },
  { id:'e6',  name:'Rayquaza VMAX Alt',    set:'Evolving Skies',   year:2021, number:'218', rarity:'Alt Art',     type:'electric', lang:'EN', condition:'Raw', graded:false, buyPrice:0, curPrice:740,  qty:1,            signal:'A'           },
  { id:'e7',  name:'Mewtwo V Alt',         set:'Pokemon GO',       year:2022, number:'071', rarity:'Alt Art',     type:'psychic',  lang:'JP', condition:'Raw', graded:false, buyPrice:0, curPrice:280,  qty:1,            signal:'B'           },
  { id:'e8',  name:'Blastoise Base Set',   set:'Base Set',         year:1999, number:'002', rarity:'Holo Rare',   type:'water',    lang:'EN', condition:'Raw', graded:false, buyPrice:0, curPrice:620,  qty:1, psa:890                        },
  { id:'e9',  name:'Lugia Neo Genesis',    set:'Neo Genesis',      year:2000, number:'009', rarity:'Holo Rare',   type:'water',    lang:'EN', condition:'Raw', graded:false, buyPrice:0, curPrice:580,  qty:1, psa:2100                       },
  { id:'e10', name:'Mew ex Alt Art',       set:'SV151',            year:2023, number:'205', rarity:'Alt Art',     type:'psychic',  lang:'JP', condition:'Raw', graded:false, buyPrice:0, curPrice:140,  qty:1                                 },
  { id:'e11', name:'Gardevoir ex SAR',     set:'Scarlet & Violet', year:2023, number:'245', rarity:'Secret Rare', type:'psychic',  lang:'FR', condition:'Raw', graded:false, buyPrice:0, curPrice:95,   qty:1                                 },
  { id:'e12', name:'Miraidon ex SAR',      set:'Scarlet & Violet', year:2023, number:'254', rarity:'Secret Rare', type:'electric', lang:'FR', condition:'Raw', graded:false, buyPrice:0, curPrice:72,   qty:1                                 },
  { id:'e13', name:'Sylveon VMAX Alt',     set:'Evolving Skies',   year:2021, number:'212', rarity:'Alt Art',     type:'psychic',  lang:'EN', condition:'Raw', graded:false, buyPrice:0, curPrice:290,  qty:1                                 },
  { id:'e14', name:'Glaceon VMAX Alt',     set:'Evolving Skies',   year:2021, number:'209', rarity:'Alt Art',     type:'water',    lang:'EN', condition:'Raw', graded:false, buyPrice:0, curPrice:180,  qty:1                                 },
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

type GridItem = { type:'owned'; card:CardItem } | { type:'ghost'; name:string; number:string; image:string; rarity:string }

export function Holdings() {
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
  const { user, loading: authLoading } = useAuth()
  const [view,        setView]        = useState<ViewMode>('binder')

  const [binderSet,   setBinderSet]   = useState<string|null>(null)
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
  const [binderSort,  setBinderSort]  = useState<'number'|'name'|'price'|'date'>('number')
  const [binderFilter, setBinderFilter] = useState<'all'|'graded'|'raw'|'rare'>('all')
  const [setTotalsMap, setSetTotalsMap] = useState<Record<string,number>>({})
  const [showcaseBg,  setShowcaseBg]  = useState('obsidienne')
  const [binderCols,  setBinderCols]  = useState(7)
  const [binderPage,  setBinderPage]  = useState(0)
  const [portfolio,   setPortfolio]   = useState<CardItem[]>([])
  const [portfolioLoaded, setPortfolioLoaded] = useState(false)
  useEffect(() => {
    if (authLoading) return
    if (user) {
      // User connecté → Supabase SEULE source. Vider le local pour éviter les ghosts.
      try { localStorage.removeItem('pka_portfolio') } catch {}
      dbSet('portfolio', [])
      supabase.from('portfolio_cards').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            const mapped: CardItem[] = data.map((c: any) => ({
              id: c.id, name: c.name, set: c.set_name || '', year: 0,
              number: c.card_number || '', rarity: c.rarity || '', type: c.card_type || 'fire',
              lang: (c.lang || 'FR') as 'EN'|'JP'|'FR',
              condition: c.condition || 'Raw', graded: c.graded || false,
              buyPrice: Number(c.buy_price) || 0, curPrice: Number(c.current_price) || 0,
              qty: c.qty || 1,
              image: c.image_url || (c.set_id && c.card_number ? getCardImageUrl({ lang: c.lang || 'FR', setId: c.set_id, localId: c.card_number }) : undefined),
              setId: c.set_id || undefined, favorite: c.is_favorite || false,
              notes: c.notes || undefined,
            }))
            setPortfolio(mapped.filter(c => !deletedIds.current.has(c.id)))
          } else {
            setPortfolio([])
          }
          setPortfolioLoaded(true)
        })
    } else {
      // Non connecté → IndexedDB puis localStorage
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
  }, [user, authLoading])
  const [showcase,    setShowcase]    = useState<CardItem[]>(()=>{
    try { const r=localStorage.getItem('pka_showcase'); return r?JSON.parse(r):[] } catch { return [] }
  })
  const [showPickerForShowcase, setShowPickerForShowcase] = useState(false)
  const [vitrineSearch, setVitrineSearch] = useState('')
  const [vitrineFilter, setVitrineFilter] = useState('all')
  const [spotCard,    setSpotCard]    = useState<CardItem|null>(null)
  const [editQty,     setEditQty]     = useState<number|null>(null)
  const [cardZoom,    setCardZoom]    = useState(false)
  const [favs,        setFavs]        = useState<Set<string>>(new Set())
  const [shareOpen,   setShareOpen]   = useState(false)
  const [shareCtx,    setShareCtx]    = useState<'portfolio'|'card'|'wrapped'|'showcase'>('portfolio')
  const [shareCard,   setShareCard]   = useState<CardItem|null>(null)
  const [refCopied,   setRefCopied]   = useState(false)
  const [selectedFmt, setSelectedFmt] = useState<string|null>(null)
  const [addOpen,     setAddOpen]     = useState(false)
  const [addSuggs,    setAddSuggs]    = useState<string[]>([])
  const [nameValidated, setNameValidated] = useState(false)
  const [addForm,     setAddForm]     = useState<{
    name:string; set:string; setId:string; type:string; lang:'EN'|'JP'|'FR';
    condition:string; graded:boolean; buyPrice:string; qty:number; year:number; image:string; setTotal:number; number:string; rarity:string; edition:string; variant:string;
  }>({name:'',set:'',setId:'',type:'fire',lang:'FR',condition:'Raw',graded:false,buyPrice:'',qty:1,year:new Date().getFullYear(),image:'',setTotal:0,number:'',rarity:'',edition:'Unlimited',variant:'Normal'})
  const [toast, setToast] = useState<string|null>(null)
  const [importOpen,   setImportOpen]   = useState(false)
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
  const uploadRef = useRef<HTMLInputElement|null>(null)
  const uploadTargetId = useRef<string|null>(null)
  const [uploadModal, setUploadModal] = useState<{
    open:boolean; preview:string|null;
    checks:{label:string;status:'pending'|'checking'|'pass'|'fail';detail?:string}[];
    done:boolean; success:boolean
  }>({ open:false, preview:null, checks:[], done:false, success:false })
  const [scannerOpen,  setScannerOpen]  = useState(false)
  // ── Prix depuis cache Supabase ──
  const [priceMap, setPriceMap] = useState<Record<string, { ebay: number|null; tcg: number|null; top: number|null; tier: string }>>({})
  const [priceDetails, setPriceDetails] = useState<Record<string, { ebay: number|null; tcg: number|null; cardmarket: number|null; poketrace: number|null; estimated: number|null }>>({})
  const pricesFetched = useRef<string|false>(false)
  const setMappingRef = useRef<Record<string,string>>({})
  useEffect(() => {
    fetch('/data/set-mapping-poketrace.json').then(r=>r.json()).then(d=>{ setMappingRef.current = d }).catch(()=>{})
  }, [])
  useEffect(() => {
    if (!portfolioLoaded || portfolio.length === 0) return
    // Re-fetch si nouvelles cartes ajoutées
    const portfolioKey = portfolio.map(c => c.name).sort().join(',')
    if (pricesFetched.current === portfolioKey) return
    pricesFetched.current = portfolioKey as any
    // Event-driven: check if prices need refresh, then fetch
    const setIds = [...new Set(portfolio.map(c => c.setId).filter(Boolean))]
    fetch('/api/prices/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sets: setIds })
    }).catch(() => {})

    // Load set mapping then fetch prices for portfolio sets
    fetch('/data/set-mapping-poketrace.json').then(r=>r.json()).catch(()=>({})).then((mapping: Record<string,string>) => {
      setMappingRef.current = mapping
      const cleanSet = (s: string) => s.replace(/-shadowless(-ns)?|-1st/g, '')
      const slugs = [...new Set(setIds.map(sid => mapping[sid as string] || mapping[cleanSet(sid as string)] || '').filter(Boolean))]
      return fetch('/api/prices?sets=' + slugs.join(',')).then(r=>r.json()).catch(()=>({data:null}))
    }).then(({ data }: any) => {
        if (!data) return
        const map: Record<string, { ebay: number|null; tcg: number|null; top: number|null; tier: string }> = {}
        data.forEach((p: any) => {
          // Index by set_slug + variant + card_number
          if (p.card_number && p.set_slug) {
            const num = p.card_number.split('/')[0].replace(/^0+/, '') || '0'
            const isPT = p.source !== 'ebay'
            if (p.variant) {
              const varKey = p.set_slug + '|' + p.variant + '|' + num
              const ex = map[varKey]
              // PokeTrace prioritaire (ventes réelles) > eBay (listings actifs)
              if (!ex || (isPT && (ex as any)._src === 'ebay') || (isPT === ((ex as any)._src !== 'ebay') && p.top_price && p.top_price > (ex.top||0))) {
                map[varKey] = { ebay: p.ebay_avg, tcg: p.tcg_avg, top: p.top_price, tier: p.tier, _src: isPT ? 'pt' : 'ebay' } as any
              }
            }
            const slugKey = p.set_slug + '|' + num
            const exS = map[slugKey]
            if (!exS || (isPT && (exS as any)._src === 'ebay') || (isPT === ((exS as any)._src !== 'ebay') && p.top_price && p.top_price > (exS.top||0))) {
              map[slugKey] = { ebay: p.ebay_avg, tcg: p.tcg_avg, top: p.top_price, tier: p.tier, _src: isPT ? 'pt' : 'ebay' } as any
            }
          }
          // Also index by card_name as fallback (use LOWEST price to be conservative)
          const key = (p.card_name || '').toLowerCase()
          if (!map[key] || (p.top_price && (!map[key].top || p.top_price < map[key].top))) {
            map[key] = { ebay: p.ebay_avg, tcg: p.tcg_avg, top: p.top_price, tier: p.tier }
          }
        })
        setPriceMap(map)
        // Build per-source detail map for spotlight
        const details: Record<string, { ebay: number|null; tcg: number|null; cardmarket: number|null; poketrace: number|null; estimated: number|null }> = {}
        const USD_EUR = 0.92
        data.forEach((p: any) => {
          if (!p.card_number || !p.set_slug) return
          const num = p.card_number.split('/')[0].replace(/^0+/, '') || '0'
          const variant = p.variant || ''
          const key = p.set_slug + '|' + variant + '|' + num
          if (!details[key]) details[key] = { ebay: null, tcg: null, cardmarket: null, poketrace: null, estimated: null }
          const d = details[key]
          // Only store sold data from PokeTrace (not eBay Browse active listings)
          const isPT = p.source !== 'ebay'
          if (isPT && p.ebay_avg && (!d.ebay || p.ebay_avg > d.ebay)) d.ebay = Math.round(p.ebay_avg * USD_EUR * 100) / 100
          if (isPT && p.tcg_avg && (!d.tcg || p.tcg_avg > d.tcg)) d.tcg = Math.round(p.tcg_avg * USD_EUR * 100) / 100
          if (isPT && p.top_price && (!d.poketrace || p.top_price > d.poketrace)) d.poketrace = Math.round(p.top_price * USD_EUR * 100) / 100
          if (p.cardmarket_avg && (!d.cardmarket || p.cardmarket_avg > d.cardmarket)) d.cardmarket = Math.round(p.cardmarket_avg * 100) / 100
          // Also index by slug without variant (for Unlimited/Holofoil matching)
          const dk2 = p.set_slug + '||' + num
          if (variant && dk2 !== key) {
            if (!details[dk2]) details[dk2] = { ebay: null, tcg: null, cardmarket: null, poketrace: null, estimated: null }
            const d2 = details[dk2]
            if (p.ebay_avg && (!d2.ebay || p.ebay_avg > d2.ebay)) d2.ebay = Math.round(p.ebay_avg * USD_EUR * 100) / 100
            if (p.tcg_avg && (!d2.tcg || p.tcg_avg > d2.tcg)) d2.tcg = Math.round(p.tcg_avg * USD_EUR * 100) / 100
            if (p.top_price && (!d2.poketrace || p.top_price > d2.poketrace)) d2.poketrace = Math.round(p.top_price * USD_EUR * 100) / 100
          }
          // Weighted average: eBay 40%, TCG 30%, Cardmarket 30% (when available)
          const sources = [d.ebay, d.tcg, d.cardmarket].filter(Boolean) as number[]
          if (sources.length > 0) {
            const weights = [d.ebay ? 0.4 : 0, d.tcg ? 0.3 : 0, d.cardmarket ? 0.3 : 0].filter((_, i) => sources[i] !== undefined)
            const totalW = weights.reduce((a, b) => a + b, 0) || 1
            d.estimated = Math.round(sources.reduce((s, p, i) => s + p * (weights[i] || 0), 0) / totalW * 100) / 100
          } else if (d.poketrace) {
            d.estimated = d.poketrace
          }
          // Update estimated for no-variant key too
          if (variant && details[dk2]) {
            const d2e = details[dk2]
            const sp2: [number,number][] = []
            if (d2e.ebay) sp2.push([d2e.ebay, 0.4])
            if (d2e.tcg) sp2.push([d2e.tcg, 0.3])
            if (d2e.cardmarket) sp2.push([d2e.cardmarket, 0.3])
            if (sp2.length > 0) {
              const tw2 = sp2.reduce((a,[,w])=>a+w,0)
              d2e.estimated = Math.round(sp2.reduce((a,[p,w])=>a+p*w,0) / tw2 * 100) / 100
            } else if (d2e.poketrace) {
              d2e.estimated = d2e.poketrace
            }
          }
        })
        setPriceDetails(details)
        // Update curPrice on portfolio cards (USD → EUR conversion)
        const USD_TO_EUR = 0.92
        setPortfolio(prev => prev.map(c => {
          const sid = c.setId || ''
          const slug = setMappingRef.current[sid] || setMappingRef.current[sid.replace(/-shadowless(-ns)?|-1st/g,'')] || ''
          const varHint = sid.includes('-1st') || sid.includes('-shadowless-ns') ? '1st_Edition_Holofoil' : sid.includes('-shadowless') ? 'Unlimited_Holofoil' : null
          const varKey = varHint ? slug + '|' + varHint + '|' + c.number : ''
          const slugKey = slug + '|' + c.number
          const nameKey = c.name.toLowerCase()
          let priceUSD = (varKey && map[varKey]?.top) || map[slugKey]?.top || map[nameKey]?.top
          // 1st Edition: use eBay if PokeTrace is lower than Shadowless, then apply floor
          if ((sid.includes('-1st') || sid.includes('-shadowless-ns')) && slug) {
            const shadowlessKey = slug + '|Unlimited_Holofoil|' + c.number
            const shadowlessPrice = map[shadowlessKey]?.top
            // Check if there's a better eBay price for 1st Edition
            const ebayVarKey = slug + '|1st_Edition_Holofoil|' + c.number
            const allPrices = [priceUSD, map[ebayVarKey]?.top, shadowlessPrice].filter(Boolean) as number[]
            if (allPrices.length) priceUSD = Math.max(...allPrices)
          }
          // Use weighted average from priceDetails as the display price
          const varH = varHint || ''
          const detKey = slug + '|' + varH + '|' + c.number
          const det = details[detKey]
          let priceEUR: number | null = null
          if (det?.estimated) {
            priceEUR = det.estimated
          } else if (priceUSD) {
            priceEUR = Math.round(priceUSD * USD_TO_EUR * 100) / 100
          } else if (det) {
            const srcs = [det.ebay, det.tcg, det.cardmarket].filter(Boolean) as number[]
            if (srcs.length) priceEUR = Math.round(srcs.reduce((a,b)=>a+b,0) / srcs.length * 100) / 100
          }
          if (priceEUR) {
            if (priceEUR !== c.curPrice) return { ...c, curPrice: priceEUR }
          }
          return c
        }))
      })
      .catch(() => {})
  }, [portfolioLoaded, portfolio.length])

  const getPrice = (card: { name: string; set: string; number: string; setId?: string }): number | null => {
    const USD_TO_EUR = 0.92
    const sid = (card as any).setId || ''
    const slug = setMappingRef.current[sid] || setMappingRef.current[sid.replace(/-shadowless(-ns)?|-1st/g,'')] || ''
    const varHint = sid.includes('-1st') || sid.includes('-shadowless-ns') ? '1st_Edition_Holofoil' : sid.includes('-shadowless') ? 'Unlimited_Holofoil' : null
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
      const nameKey = card.name.toLowerCase()
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
  const [celebSet,     setCelebSet]     = useState<string|null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout>|null>(null)
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
            set_id: c.setId || null, card_number: c.number || null,
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
                  if (idx >= 0) next[idx] = { ...next[idx], id: row.id }
                })
                return next
              })
            }
          })
        }
        // Update existing cards (skip recently deleted)
        const existing = portfolio.filter(c => !c.id.startsWith('u') && !deletedIds.current.has(c.id))
        if (existing.length > 0) {
          existing.forEach(card => {
            supabase.from('portfolio_cards').update({
              qty: card.qty, buy_price: card.buyPrice || null,
              current_price: card.curPrice || null, is_favorite: card.favorite || false,
              condition: card.condition || 'NM', graded: card.graded || false,
              image_url: cleanImageUrl(card.image) || null, updated_at: new Date().toISOString(),
            }).eq('id', card.id)
          })
        }
      }
    }, 500)
  }, [portfolio, portfolioLoaded, user])
  useEffect(() => {
    dbGet<CardItem[]>('showcase').then(data => {
      if (data && data.length > 0) setShowcase(data)
    })
  }, [])
  useEffect(()=>{
    dbSet('showcase', showcase)
    try { const slim = showcase.map(c => c.image && c.image.startsWith('data:') ? { ...c, image: '' } : c); localStorage.setItem('pka_showcase', JSON.stringify(slim)) } catch {}
  }, [showcase])
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
        condition:'Raw', graded:false, buyPrice:'', qty:1,
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
  useEffect(() => {
    if (rarityBackfilled.current) return
    const needsFix = portfolio.filter(c => !c.rarity && c.setId && c.number && c.number !== '???')
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
        const lang = card.lang === 'JP' ? 'JP' : card.lang === 'EN' ? 'EN' : 'FR'
        const setCards = card.setId ? staticCards[lang]?.[card.setId as string] : undefined
        if (setCards) {
          const match = setCards.find((c: any) => c.lid === card.number || c.id === card.setId + '-' + card.number)
          if (match?.r) { updates[card.id] = match.r; continue }
        }
        // Fallback API pour les cartes pas dans le dump
        try {
          const detail = await fetchCardDetail(lang, card.setId + '-' + card.number)
          if (detail?.rarity) updates[card.id] = detail.rarity
        } catch {}
      }
      if (Object.keys(updates).length > 0) {
        setPortfolio(prev => prev.map(c => updates[c.id] ? { ...c, rarity: updates[c.id] } : c))
      }
      rarityBackfilled.current = false
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

  // -- Fetch set logos via TCGDex API --
  useEffect(() => {
    const sets = [...new Set(portfolio.map(c => c.set))]
    sets.forEach(async setName => {
      if (setLogos[setName]) return
      const sc = portfolio.filter(c => c.set === setName)
      const sid = sc.find(c => c.setId)?.setId || liveSets.find(ls => ls.name === setName)?.id || liveSets.find(ls => ls.name.toLowerCase() === setName.toLowerCase())?.id || ''
      if (!sid) return
      // For edition sets, use parent set logo
      const parentSid = sid.replace(/-1st$|-shadowless$|-shadowless-ns$/, '')
      const lang = sc[0]?.lang === 'JP' ? 'ja' : sc[0]?.lang === 'EN' ? 'en' : 'fr'
      try {
        // Check if parent logo already cached
        if (parentSid !== sid) {
          const parentCacheKey = 'pka_logo_' + parentSid
          const parentCached = localStorage.getItem(parentCacheKey)
          if (parentCached) { setSetLogos(prev => ({ ...prev, [setName]: parentCached })); return }
        }
        const cacheKey = 'pka_logo_' + parentSid
        const cached = localStorage.getItem(cacheKey)
        if (cached) { setSetLogos(prev => ({ ...prev, [setName]: cached })); const cb=localStorage.getItem('pka_block_'+sid); if(cb){ setSetBlocks(prev=>({...prev,[setName]:cb})); return } }
        const res = await fetch('https://api.tcgdex.net/v2/' + lang + '/sets/' + parentSid)
        if (!res.ok) return
        const data = await res.json()
        const logo = data.logo || data.symbol || ''
        if (logo) {
          const logoWithExt = logo + '.png'
          localStorage.setItem(cacheKey, logoWithExt)
          setSetLogos(prev => ({ ...prev, [setName]: logoWithExt }))
          if (data.serie && data.serie.name) { setSetBlocks(prev => ({ ...prev, [setName]: data.serie.name })); localStorage.setItem('pka_block_'+sid, data.serie.name) }
        }
      } catch {}
    })
  }, [portfolio.length, liveSets.length])

  // -- Fetch shelf ghost cards pour chaque set visible --
  useEffect(() => {
    if (binderSet && binderSet !== '__all__') return
    const sets = [...new Set(portfolio.map(c => c.set))]
    sets.forEach(setName => {
      if (shelfSetCards[setName]) return
      const sc = portfolio.filter(c => c.set === setName)
      const sid = sc.find(c => c.setId)?.setId || liveSets.find(ls => ls.name === setName)?.id || liveSets.find(ls => ls.name.toLowerCase() === setName.toLowerCase())?.id || ''
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
    const sid = sc.find(c => c.setId)?.setId || liveSets.find(ls => ls.name === binderSet)?.id || liveSets.find(ls => ls.name.toLowerCase() === binderSet.toLowerCase())?.id || ''
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
  }, [binderSet, liveSets.length])

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
  useEffect(() => {
    if (!addSetOpen) return
    fetchSets(addSetLang).then(sets => setAddSetSets(sets)).catch(() => {})
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

  const totalBuy  = portfolio.reduce((s,c)=>s+c.buyPrice*c.qty,0)
  const totalCur  = portfolio.reduce((s,c)=>s+c.curPrice*c.qty,0)
  const totalGain = totalCur-totalBuy
  const totalROI  = totalBuy>0?Math.round((totalGain/totalBuy)*100):0

  // ── Animated counter ──
  const [displayValue, setDisplayValue] = useState(0)
  const [valuePulse, setValuePulse] = useState<false|'up'|'down'>(false)
  const prevTotal = useRef(0)
  useEffect(() => {
    const target = totalCur
    const from = prevTotal.current
    if (from === target) { setDisplayValue(target); return }
    setValuePulse(target > from ? 'up' : 'down')
    setTimeout(() => setValuePulse(false), 600)
    const duration = 800
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplayValue(Math.round((from + (target - from) * eased) * 100) / 100)
      if (progress < 1) requestAnimationFrame(tick)
      else prevTotal.current = target
    }
    requestAnimationFrame(tick)
  }, [totalCur])
  const bestCard  = portfolio.length>0?[...portfolio].sort((a,b)=>((b.curPrice-b.buyPrice)/Math.max(b.buyPrice,1))-((a.curPrice-a.buyPrice)/Math.max(a.buyPrice,1)))[0]:null
  const slotsPer  = (binderSet&&binderSet!=='__all__') ? 9999 : binderCols*10
  const binderFiltered = (!binderSet || binderSet==='__all__') ? portfolio : portfolio.filter(c=>c.set===binderSet)
  // binderPages moved after gridItems
  const binderSorted = [...binderFiltered].sort((a,b)=>{
    if(binderSort==='number') return (parseInt(a.number)||999)-(parseInt(b.number)||999)
    if(binderSort==='name') return a.name.localeCompare(b.name)
    if(binderSort==='price') return b.curPrice-a.curPrice
    return 0
  })
  const binderFilteredFinal = binderSorted.filter(c=>{
    if(binderFilter==='graded' && !c.graded) return false
    if(binderFilter==='raw' && c.graded) return false
    if(setSearch && !c.name.toLowerCase().includes(setSearch.toLowerCase()) && !c.set.toLowerCase().includes(setSearch.toLowerCase())) return false
    return true
  })
  const buildGridItems = (): GridItem[] => {
    if(binderSort!=='number'||!binderSet||binderSet==='__all__'||fullSetCards.length===0||binderFilter!=='all'||setSearch){
      return binderFilteredFinal.map(c=>({type:'owned' as const,card:c}))
    }
    const ownedByNum = new Map<string,CardItem[]>()
    binderFiltered.forEach(c=>{ const k=c.number; if(!ownedByNum.has(k)) ownedByNum.set(k,[]); ownedByNum.get(k)!.push(c) })
    const usedIds = new Set<string>()
    const result: typeof gridItems = []
    fullSetCards.forEach(fc=>{
      const num = fc.localId||''
      const arr = ownedByNum.get(num)
      if(arr){
        arr.forEach(owned=>{
          if(!usedIds.has(owned.id)){
            usedIds.add(owned.id)
            result.push({ type:'owned' as const, card:{ ...owned, image: cleanImageUrl(owned.image) || cleanImageUrl(fc.image) || '' } })
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
    setToast(msg)
    if(toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(()=>setToast(null),2400)
  }
  const toggleFav = (id:string, e:React.MouseEvent) => {
    e.stopPropagation()
    setFavs(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})
  }
  const removeCard = (card:CardItem, e:React.MouseEvent) => {
    e.stopPropagation()
    deletedIds.current.add(card.id)
    setPortfolio(prev=>prev.filter(c=>c.id!==card.id))
    if (user) {
      if (card.id.startsWith('u')) {
        // Local ID — delete by name + set + user
        supabase.from('portfolio_cards').delete()
          .eq('user_id', user.id).eq('name', card.name).eq('set_name', card.set || '')
          .then(({ error }) => {
            if (error) console.error('Delete by name failed:', error)
            else console.log('Deleted from Supabase by name:', card.name)
          })
      } else {
        supabase.from('portfolio_cards').delete().eq('id', card.id)
          .then(({ error }) => {
            if (error) console.error('Delete failed:', error)
            else console.log('Deleted from Supabase:', card.id)
          })
      }
    }
    setShowcase(prev=>prev.filter(c=>c.id!==card.id))
    showToast(card.name+' retiree')
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
  const handleNameInput = (val:string) => {
    setAddForm(p=>({...p,name:val}))
    setNameValidated(false)
    if(val.length<1){setAddSuggs([]);return}
    if (liveCards.length > 0) {
      const matches = liveCards
        .filter(c=>c.name.toLowerCase().includes(val.toLowerCase()))
        .map(c=>c.name)
      setAddSuggs([...new Set(matches)].slice(0,10))
    } else if (!addForm.setId) {
      // Fallback ENCYCLOPEDIA seulement si aucun set sélectionné
      const pool = addForm.set?ENCYCLOPEDIA.filter(cc=>cc.set===addForm.set):ENCYCLOPEDIA
      const matches = pool.filter(cc=>cc.name.toLowerCase().includes(val.toLowerCase())).map(cc=>cc.name)
      setAddSuggs([...new Set(matches)].slice(0,6))
    }
  }
  const handleSuggSelect = async (name:string) => {
    const extra = encyclopediaLookup(name, addForm.set)
    const liveCard = liveCards.find(c=>c.name===name)
    const img = liveCard?.image ?? ''
    const num = liveCard?.localId ?? extra.number ?? ''
    let rar = liveCard?.rarity ?? extra.rarity ?? ''
    // Fetch détails pour récupérer rarity si manquant
    if (!rar && liveCard) {
      try {
        const detail = await fetchCardDetail(addForm.lang as 'EN'|'FR'|'JP', liveCard.id)
        if (detail?.rarity) rar = detail.rarity
      } catch {}
    }
    setAddForm(p=>({...p, name, type:extra.type??p.type, year:extra.year??p.year, image:img, number:num, rarity:rar}))
    setAddSuggs([])
    setNameValidated(true)
  }
  const handleConditionChange = (cond:string) => {
    if (cond === '__graded__') {
      const current = addForm.condition
      const keep = (current !== 'Raw' && current !== 'Scelle' && current !== '') ? current : 'PSA 10'
      setAddForm(p=>({...p, graded:true, condition:keep}))
    } else {
      setAddForm(p=>({...p, condition:cond, graded:cond!=='Raw'&&cond!=='Scelle'}))
    }
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
      id:'u'+Date.now(), name:addForm.name, set:addForm.set,
      year:extra.year??addForm.year,
      number:resolvedNumber,
      rarity:resolvedRarity,
      type:addForm.type, lang:addForm.lang,
      condition:addForm.condition, graded:addForm.graded,
      buyPrice:bp, curPrice:extra.curPrice??bp, qty:addForm.qty,
      psa:extra.psa, signal:extra.signal,
      image:resolvedImage||undefined,
      setId:addForm.setId||undefined,
      setTotal:addForm.setTotal||undefined,
      edition:addForm.edition||'Unlimited',
      variant:addForm.variant||'Normal',
    }
    setPortfolio(prev=>{
      const next=[...prev,newCard]
      return next
    })
    setAddOpen(false); setAddSuggs([]); setNameValidated(false)
    setAddForm({name:'',set:'',setId:'',type:'fire',lang:'EN',condition:'Raw',graded:false,buyPrice:'',qty:1,year:new Date().getFullYear(),image:'',setTotal:0,number:'',rarity:'',edition:'Unlimited',variant:'Normal'})
    showToast(newCard.name+(newCard.qty>1?' x'+newCard.qty:'')+' ajoutee')
  }
  const addToShowcase = (card:CardItem) => {
    if(showcase.find(c=>c.id===card.id)) return
    setShowcase(prev=>[...prev,card])
    setShowPickerForShowcase(false)
    showToast(card.name+' dans la vitrine')
  }
  const removeFromShowcase = (id:string, e:React.MouseEvent) => {
    e.stopPropagation()
    setShowcase(prev=>prev.filter(c=>c.id!==id))
  }
  const triggerUpload = (cardId: string) => {
    uploadTargetId.current = cardId
    uploadRef.current?.click()
  }
  const runUploadChecks = async (file: File, cardId: string) => {
    const preview = URL.createObjectURL(file)
    const checks: {label:string;status:'pending'|'checking'|'pass'|'fail';detail?:string}[] = [
      { label:'Format du fichier', status:'pending' },
      { label:'Taille du fichier', status:'pending' },
      { label:'Dimensions', status:'pending' },
      { label:'Orientation portrait', status:'pending' },
      { label:'Ratio carte standard', status:'pending' },
      { label:'Résolution minimale', status:'pending' },
      { label:'Cadrage des bords', status:'pending' },
    ]
    setUploadModal({ open:true, preview, checks:[...checks], done:false, success:false })
    const delay = (ms:number) => new Promise(r=>setTimeout(r,ms))
    const upd = (i:number, st:'checking'|'pass'|'fail', detail?:string) => {
      checks[i] = { ...checks[i], status:st, detail }
      setUploadModal(p=>({ ...p, checks:[...checks] }))
    }
    let ok = true
    upd(0,'checking'); await delay(400)
    if(['image/jpeg','image/png','image/webp'].includes(file.type)){
      upd(0,'pass',file.type.replace('image/','').toUpperCase())
    } else { upd(0,'fail','Format: '+file.type); ok=false }
    upd(1,'checking'); await delay(350)
    const mb = file.size/1024/1024
    if(mb<=10){ upd(1,'pass',mb.toFixed(1)+' Mo') }
    else { upd(1,'fail',mb.toFixed(1)+' Mo (max 10)'); ok=false }
    upd(2,'checking')
    const img = new Image()
    try {
      await new Promise<void>((res,rej)=>{ img.onload=()=>res(); img.onerror=()=>rej(); img.src=preview })
      await delay(400)
      if(img.width>=500&&img.height>=700){ upd(2,'pass',img.width+'\u00d7'+img.height+' px') }
      else { upd(2,'fail',img.width+'\u00d7'+img.height+' px (min 500\u00d7700)'); ok=false }
      upd(3,'checking'); await delay(300)
      if(img.height>=img.width){ upd(3,'pass','Portrait') }
      else { upd(3,'fail','Paysage detecte'); ok=false }

      // 5. Ratio carte
      upd(4,'checking'); await delay(350)
      const ratio = img.width / img.height
      if(ratio >= 0.63 && ratio <= 0.80){ upd(4,'pass','Ratio ' + ratio.toFixed(3)) }
      else { upd(4,'fail','Ratio ' + ratio.toFixed(3) + ' (attendu 0.63-0.80)'); ok=false }

      // 6. Resolution
      upd(5,'checking'); await delay(350)
      if(img.width >= 600 && img.height >= 840){ upd(5,'pass',img.width+'x'+img.height+' px') }
      else { upd(5,'fail',img.width+'x'+img.height+' px (min 600x840)'); ok=false }

      // 7. Cadrage des bords — consistance couleur le long des 4 bords
      upd(6,'checking'); await delay(400)
      try {
        const cv = document.createElement('canvas')
        cv.width = img.width; cv.height = img.height
        const ctx = cv.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        // Echantillonner une bande de 3px le long de chaque bord
        const bw = 3
        const topStrip = ctx.getImageData(0, 0, img.width, bw)
        const botStrip = ctx.getImageData(0, img.height - bw, img.width, bw)
        const leftStrip = ctx.getImageData(0, 0, bw, img.height)
        const rightStrip = ctx.getImageData(img.width - bw, 0, bw, img.height)
        // Calculer la variance de couleur pour chaque bord
        const calcVariance = (data: Uint8ClampedArray) => {
          let sumR=0,sumG=0,sumB=0
          const n = data.length / 4
          for(let i=0;i<data.length;i+=4){ sumR+=data[i]; sumG+=data[i+1]; sumB+=data[i+2] }
          const avgR=sumR/n, avgG=sumG/n, avgB=sumB/n
          let varSum=0
          for(let i=0;i<data.length;i+=4){
            varSum+=Math.pow(data[i]-avgR,2)+Math.pow(data[i+1]-avgG,2)+Math.pow(data[i+2]-avgB,2)
          }
          return Math.sqrt(varSum/(n*3))
        }
        const variances = [
          calcVariance(topStrip.data),
          calcVariance(botStrip.data),
          calcVariance(leftStrip.data),
          calcVariance(rightStrip.data),
        ]
        const avgVar = variances.reduce((a,b)=>a+b,0) / 4
        // Une carte a des bords trés uniformes (variance < 35)
        // Une photo random a des bords trés variés (variance > 50)
        if (avgVar < 40) { upd(6,'pass','Bords uniformes (var: '+avgVar.toFixed(0)+')') }
        else { upd(6,'fail','Bords irréguliers (var: '+avgVar.toFixed(0)+') \u2014 pas une carte recadrée'); ok=false }
      } catch { upd(6,'fail','Analyse impossible'); ok=false }

        } catch { upd(2,'fail','Lecture impossible'); upd(3,'fail','\u2014'); upd(4,'fail','\u2014'); upd(5,'fail','\u2014'); upd(6,'fail','\u2014'); ok=false }
    await delay(300)
    if(ok){
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        setPortfolio(prev=>prev.map(c=>c.id===cardId?{...c,image:dataUrl,imageStatus:'pending' as const}:c))
        if(spotCard?.id===cardId) setSpotCard(prev=>prev?{...prev,image:dataUrl,imageStatus:'pending' as const}:null)
        setUploadModal(p=>({...p,done:true,success:true}))
      }
      reader.readAsDataURL(file)
    } else { setUploadModal(p=>({...p,done:true,success:false})) }
  }
  const canAdd = !!(addForm.name&&addForm.set)

  return (
    <>
    <div>
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes fadeUp    { 0%{opacity:0;transform:translateY(24px) scale(.97)} 60%{opacity:1;transform:translateY(-4px) scale(1.005)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes cardIn    { from{opacity:0;transform:scale(.88) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slotIn    { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }
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
        .set-header { transition:background .2s,transform .1s; padding:4px 8px; margin:-4px -8px; border-radius:12px; }

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
        .add-modal input:focus { border-color:#1D1D1F !important;box-shadow:0 0 0 3px rgba(29,29,31,.06) !important; }
        .add-modal select:focus { border-color:#1D1D1F !important;box-shadow:0 0 0 3px rgba(29,29,31,.06) !important; }
        .add-modal input:hover:not(:focus) { border-color:#C7C7CC !important; }
        .add-modal select:hover { border-color:#C7C7CC !important; }

        button:hover:not(:disabled) { filter:brightness(1.05); }
        .vtab:hover:not(.on) { background:#F0F0F5 !important;color:#48484A !important;border-color:#C7C7CC !important; }
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
        
        @keyframes slotPulse { 0%,100%{border-color:#D2D2D7;box-shadow:0 0 0 0 rgba(224,48,32,0)} 50%{border-color:#E03020;box-shadow:0 0 0 8px rgba(224,48,32,.1)} }
        .empty-pocket { animation:slotPulse 3s ease-in-out infinite;border:2px dashed #D2D2D7 !important;background:#FAFAFA !important; }
        .empty-pocket:hover { animation:none !important; }
        .vtab { padding:7px 18px;border-radius:99px;border:1px solid #C7C7CC;background:#FAFAFA;color:#6E6E73;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-display);transition:all .25s cubic-bezier(.25,.46,.45,.94); }
        .vtab:hover:not(.on) { background:#F0F0F5;color:#48484A;border-color:#C7C7CC; }
        .vtab:active { transform:scale(.96);transition-duration:.08s; }
        .vtab.on { background:#1D1D1F !important;border-color:#1D1D1F !important;color:#fff !important; }
        .colbtn { width:28px;height:28px;border-radius:7px;font-size:11px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .2s cubic-bezier(.25,.46,.45,.94);color:#86868B;border:1px solid #D2D2D7;background:#fff; }
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
        @keyframes confettiF  { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(120px) rotate(720deg);opacity:0} }
        @keyframes shimmerG   { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes scanPulse  { 0%,100%{border-color:rgba(16,185,129,.4)} 50%{border-color:rgba(16,185,129,.9)} }
        @keyframes scanLine   { 0%{top:10%} 100%{top:90%} }
        .scan-frame { animation:scanPulse 1.4s ease-in-out infinite; }
        .scan-line  { animation:scanLine 1.8s ease-in-out infinite alternate; }
      `}} />

      <div style={{ background:'#F8F8FA', minHeight:'100vh', borderRadius:'16px', overflow:'hidden', position:'relative', paddingBottom:'40px' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(ellipse at 15% 30%,rgba(255,107,53,.04) 0%,transparent 40%),radial-gradient(ellipse at 85% 70%,rgba(126,87,194,.04) 0%,transparent 40%)', pointerEvents:'none', zIndex:0 }} />

        {toast&&(
          <div style={{ position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)', background:'rgba(29,29,31,.85)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', color:'rgba(255,255,255,.95)', padding:'9px 20px', borderRadius:'22px', fontSize:'12px', fontWeight:500, border:'1.5px solid #D1CEC9', whiteSpace:'nowrap', zIndex:99, animation:'toastIn .3s ease-out', fontFamily:'var(--font-display)' }}>
            {toast}
          </div>
        )}

        {/* SPOTLIGHT */}
        {spotCard&&(()=>{
          const ec=EC[spotCard.type]??'#888', eg=EG[spotCard.type]??'rgba(128,128,128,.4)'
          const roi=spotCard.buyPrice>0?Math.round(((spotCard.curPrice-spotCard.buyPrice)/spotCard.buyPrice)*100):0
          const gain=(spotCard.curPrice-spotCard.buyPrice)*spotCard.qty
          const isHolo=HOLO_RARITIES.includes(spotCard.rarity)
          const curQty=editQty??spotCard.qty
          return(
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:40, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px' }} onClick={()=>{ setSpotCard(null); setEditQty(null); setCardZoom(false) }}>
              <div style={{ background:'#fff', borderRadius:'20px', border:'1px solid #E5E5EA', boxShadow:'0 24px 60px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.03)', padding:'28px', maxWidth:'680px', width:'100%', animation:'fadeUp .25s ease-out', position:'relative' }} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>{setSpotCard(null);setEditQty(null)}} style={{ position:'absolute', top:'16px', right:'16px', width:'28px', height:'28px', borderRadius:'50%', background:'#F0F0F5', border:'none', color:'#86868B', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:5, transition:'all .15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='#E5E5EA';e.currentTarget.style.color='#1D1D1F'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='#F0F0F5';e.currentTarget.style.color='#86868B'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
                <div style={{ display:'flex', overflow:'hidden', margin:'-28px', borderRadius:'20px' }}>
                  <div style={{ flexShrink:0, width:'250px', background:'#F5F5F7', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
                  <div className="gem" style={{ background:'transparent', borderRadius:'14px', width:'100%' }} onMouseMove={tiltCard} onMouseLeave={resetCard}>
                    {isHolo&&<div className="holo"/>}
                    <div className="hm"/>
                    
                    
                    
                    {spotCard.signal&&<div style={{ position:'absolute', top:'10px', right:'10px', zIndex:3, fontSize:'10px', fontWeight:700, background:TIER_BG[spotCard.signal], color:'#1D1D1F', padding:'3px 9px', borderRadius:'6px', fontFamily:'var(--font-display)' }}>Tier {spotCard.signal}</div>}
                    <div style={{ aspectRatio:'63/88', margin:'6px 6px 0', borderRadius:'12px', background:'#EBEBEB', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', maxHeight:'280px' }}>
                      {spotCard.image ? (
                        <img src={cleanImageUrl(spotCard.image)} alt={spotCard.name}
                          onClick={e=>{e.stopPropagation();setCardZoom(true)}}
                          style={{ width:'100%', height:'100%', objectFit:'cover', position:'relative', zIndex:1, cursor:'zoom-in' }}
                          onError={e=>{ const t=e.target as HTMLImageElement; t.onerror=null; t.style.opacity='0'; t.style.height='100%'; const p=t.parentElement; if(p&&!p.querySelector('.no-img-ph')){const d=document.createElement('div');d.className='no-img-ph';d.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;cursor:pointer';d.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg><span style="font-size:8px;color:#AEAEB2">Ajouter</span>';p.appendChild(d)} }}/>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', zIndex:1 }}>
                          <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:'#F0F0F5', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          </div>
                          <button onClick={()=>triggerUpload(spotCard.id)} style={{ padding:'6px 14px', borderRadius:'8px', background:'#1D1D1F', color:'#fff', fontSize:'10px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', border:'none', display:'flex', alignItems:'center', gap:'4px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            Ajouter une photo
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                  <div style={{ flex:1, minWidth:0, padding:'28px 28px 24px' }}>
                    <div style={{ paddingRight:'28px', marginBottom:'14px' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'10px' }}>
                        <div style={{ fontSize:'20px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', lineHeight:1.2 }}>{spotCard.name}</div>
                        {spotCard.graded&&(()=>{
                          const gn=parseFloat(spotCard.condition.replace(/[^0-9.]/g,''))
                          const bg=gn>=10?'linear-gradient(145deg,#8B7320,#B8942F,#D4AF37,#F5ECA0,#FFFAD0,#F5ECA0,#D4AF37,#B8942F,#8B7320)':gn>=9?'linear-gradient(145deg,#707070,#A8A8A8,#D8D8D8,#F0F0F0,#D8D8D8,#A8A8A8,#707070)':gn>=5?'linear-gradient(145deg,#6B4226,#A0724A,#C4956A,#E0BFA0,#C4956A,#A0724A,#6B4226)':'#6E6E73'
                          const fg=gn>=10?'#5C4A12':gn>=9?'#222':gn>=5?'#2a1800':'#fff'
                          const sh=gn>=10?'0 1px 3px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,240,.4)':gn>=9?'0 1px 3px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.4)':gn>=5?'0 1px 3px rgba(0,0,0,.12),inset 0 1px 0 rgba(224,191,160,.3)':'none'
                          return <div style={{ flexShrink:0, background:bg, color:fg, fontSize:'10px', fontWeight:800, padding:'4px 10px', borderRadius:'6px', fontFamily:'var(--font-data)', boxShadow:sh, letterSpacing:'.03em', overflow:'visible', position:'relative', border:gn>=10?'1px solid rgba(212,175,55,.4)':gn>=9?'1px solid rgba(168,168,168,.4)':gn>=5?'1px solid rgba(160,114,74,.3)':'none', backgroundSize:gn>=5?'300% 300%':'auto', animation:gn>=5?'metalShift 8s ease-in-out infinite':'none' }}>
                            {gn>=5&&<div style={{ position:'absolute', inset:0, borderRadius:'6px', background:gn>=10?'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)':gn>=9?'linear-gradient(145deg,transparent 30%,rgba(255,255,255,.3) 45%,transparent 60%)':'linear-gradient(145deg,transparent 30%,rgba(224,191,160,.25) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/>}
                            {gn>=10&&<div className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/>}
                            <span style={{ position:'relative', zIndex:1 }}>{spotCard.condition}</span>
                          </div>
                        })()}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'4px' }}>
                        <span style={{ fontSize:'12px', color:'#86868B' }}>{spotCard.set}</span>
                        {spotCard.setId?.includes('-shadowless')&&<span className="ed-badge ed-shadowless" style={{ marginLeft:'6px' }}>SHADOWLESS</span>}
                        {spotCard.setId?.includes('-shadowless')&&!spotCard.setId?.includes('-ns')&&<span className="ed-badge ed-1st-edition" style={{ marginLeft:'4px' }}>1ST EDITION</span>}
                        {spotCard.setId?.includes('-1st')&&!spotCard.setId?.includes('shadowless')&&<span className="ed-badge ed-1st-edition" style={{ marginLeft:'6px' }}>1ST EDITION</span>}
                        <span style={{ fontSize:'12px', color:'#C7C7CC' }}>{String.fromCharCode(183)}</span>
                        <span style={{ fontSize:'12px', color:'#86868B' }}>#{spotCard.number||'???'}</span>
                        {spotCard.rarity&&<><span style={{ fontSize:'12px', color:'#C7C7CC' }}>{String.fromCharCode(183)}</span><span style={{ fontSize:'12px', color:'#86868B' }}>{spotCard.rarity}</span></>}
                        <span style={{ fontSize:'12px', color:'#C7C7CC' }}>{String.fromCharCode(183)}</span>
                        <span style={{ fontSize:'14px' }}>{spotCard.lang==='EN'?'\u{1F1FA}\u{1F1F8}':spotCard.lang==='FR'?'\u{1F1EB}\u{1F1F7}':'\u{1F1EF}\u{1F1F5}'}</span>
                      </div>
                    </div>
                    {(()=>{
                      let displayPrice = spotCard.curPrice
                      if (!displayPrice) {
                        const sid = spotCard.setId || ''
                        const slug = setMappingRef.current[sid] || setMappingRef.current[sid.replace(/-shadowless(-ns)?|-1st/g,'')] || ''
                        const varHint = sid.includes('-1st') || sid.includes('-shadowless-ns') ? '1st_Edition_Holofoil' : sid.includes('-shadowless') ? 'Unlimited_Holofoil' : ''
                        const dKey = slug + '|' + varHint + '|' + spotCard.number
                        const det = priceDetails[dKey]
                        if (det) {
                          const sources = [det.ebay, det.tcg, det.cardmarket].filter(Boolean) as number[]
                          if (sources.length) displayPrice = Math.round(sources.reduce((a,b)=>a+b,0)/sources.length*100)/100
                        }
                      }
                      return <div style={{ fontSize:'32px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-1.5px', lineHeight:1, marginBottom:'16px' }}>EUR {displayPrice.toLocaleString('fr-FR')}</div>
                    })()}
                    {spotCard.buyPrice>0&&<div style={{ fontSize:'16px', color:'#4ECCA3', fontWeight:500, marginBottom:'16px' }}>+{roi}% | +EUR {gain.toLocaleString('fr-FR')}</div>}
                    {(()=>{
                      const sid = spotCard.setId || ''
                      const slug = setMappingRef.current[sid] || setMappingRef.current[sid.replace(/-shadowless(-ns)?|-1st/g,'')] || ''
                      const varHint = sid.includes('-1st') || sid.includes('-shadowless-ns') ? '1st_Edition_Holofoil' : sid.includes('-shadowless') ? 'Unlimited_Holofoil' : ''
                      const dKey = slug + '|' + varHint + '|' + spotCard.number
                      const dKeyHolo = slug + '|Holofoil|' + spotCard.number
                      const dKeyNormal = slug + '|Normal|' + spotCard.number
                      // Merge all matches — priority: exact > Holofoil > Normal
                      const candidates = [priceDetails[dKey], priceDetails[dKeyHolo], priceDetails[dKeyNormal]].filter(Boolean)
                      const det = candidates.length ? candidates.reduce((acc, c) => ({
                        ebay: acc.ebay || c.ebay,
                        tcg: acc.tcg || c.tcg,
                        cardmarket: acc.cardmarket || c.cardmarket,
                        poketrace: acc.poketrace || c.poketrace,
                        estimated: acc.estimated || c.estimated,
                      }), { ebay: null, tcg: null, cardmarket: null, poketrace: null, estimated: null }) : { ebay: null, tcg: null, cardmarket: null, poketrace: null, estimated: null }
                      const sources = [
                        { label: 'eBay', price: det.ebay, color: '#E53238', icon: '🔴' },
                        { label: 'TCGPlayer', price: det.tcg, color: '#1D4ED8', icon: '🔵' },
                        { label: 'Cardmarket', price: det.cardmarket, color: '#FF7900', icon: '🟠' },
                      ].filter(s => s.price)
                      return <>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'10px' }}>
                          {[
                            {l:'Achat',v:spotCard.buyPrice>0?spotCard.buyPrice.toLocaleString('fr-FR')+' €':'---',c:'#1D1D1F'},
                            {l:'Marché (est.)',v:spotCard.curPrice>0?spotCard.curPrice.toLocaleString('fr-FR')+' €':'---',c:'#1D1D1F'},
                            {l:'ROI',v:spotCard.buyPrice>0?(roi>=0?'+':'')+roi+'%':'---',c:roi>0?'#2E9E6A':roi<0?'#E03020':'#86868B'},
                            {l:'PSA Pop',v:spotCard.psa?spotCard.psa.toLocaleString():'---',c:'#48484A'},
                          ].map(st=>(
                            <div key={st.l} style={{ background:'#F5F5F7', borderRadius:'10px', padding:'10px 12px' }}>
                              <div style={{ fontSize:'9px', color:'#AEAEB2', textTransform:'uppercase' as const, letterSpacing:'.08em', fontFamily:'var(--font-display)', fontWeight:500 }}>{st.l}</div>
                              <div style={{ fontSize:'14px', fontWeight:600, color:st.c, fontFamily:'var(--font-display)', marginTop:'2px' }}>{st.v}</div>
                            </div>
                          ))}
                        </div>
                        {sources.length > 0 && (
                          <div style={{ background:'#F5F5F7', borderRadius:'10px', padding:'12px', marginBottom:'14px' }}>
                            <div style={{ fontSize:'9px', color:'#AEAEB2', textTransform:'uppercase' as const, letterSpacing:'.08em', fontFamily:'var(--font-display)', fontWeight:500, marginBottom:'8px' }}>Prix par source</div>
                            {sources.map(s=>(
                              <div key={s.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 0' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                                  <span style={{ fontSize:'10px' }}>{s.icon}</span>
                                  <span style={{ fontSize:'12px', fontWeight:500, color:'#48484A', fontFamily:'var(--font-display)' }}>{s.label}</span>
                                </div>
                                <span style={{ fontSize:'13px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-data)' }}>{s.price!.toLocaleString('fr-FR',{minimumFractionDigits:2})} €</span>
                              </div>
                            ))}
                            {!det?.cardmarket && (()=>{
                              const sidSpot = spotCard.setId || ''
                              const isVariant = sidSpot.includes('-shadowless') || sidSpot.includes('-1st')
                              return (
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 0', opacity:0.4 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                                  <span style={{ fontSize:'10px' }}>🟠</span>
                                  <span style={{ fontSize:'12px', fontWeight:500, color:'#48484A', fontFamily:'var(--font-display)' }}>Cardmarket</span>
                                </div>
                                <span style={{ fontSize:'11px', fontStyle:'italic', color:'#AEAEB2', fontFamily:'var(--font-display)' }}>{isVariant ? 'Non disponible' : 'Bientôt'}</span>
                              </div>
                              )
                            })()}
                          </div>
                        )}
                      </>
                    })()}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', padding:'10px 0', borderTop:'1px solid #F0F0F5', borderBottom:'1px solid #F0F0F5' }}>
                      <span style={{ fontSize:'12px', color:'#6E6E73', fontWeight:500, fontFamily:'var(--font-display)' }}>Quantité</span>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <button onClick={()=>setEditQty(Math.max(1,curQty-1))} style={{ width:'28px', height:'28px', borderRadius:'8px', background:'#F5F5F7', border:'none', color:'#48484A', fontSize:'14px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>-</button>
                        <span style={{ fontSize:'14px', fontWeight:600, color:'#1D1D1F', minWidth:'20px', textAlign:'center' as const, fontFamily:'var(--font-display)' }}>{curQty}</span>
                        <button onClick={()=>setEditQty(Math.min(99,curQty+1))} style={{ width:'28px', height:'28px', borderRadius:'8px', background:'#F5F5F7', border:'none', color:'#48484A', fontSize:'14px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                        {editQty!==null&&editQty!==spotCard.qty&&(
                          <button onClick={()=>{ setPortfolio(prev=>prev.map(c=>c.id===spotCard.id?{...c,qty:editQty!}:c)); setSpotCard({...spotCard,qty:editQty!}); setEditQty(null); showToast('Quantité mise à jour') }} style={{ padding:'6px 12px', borderRadius:'8px', background:'#1D1D1F', color:'#fff', border:'none', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const }}>
                            OK
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      <button onClick={()=>router.push('/alpha')} style={{ flex:2, padding:'11px', borderRadius:'9px', background:'#1D1D1F', color:'#fff', border:'none', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>Voir signal</button>
                      <button onClick={()=>{ setShareCtx('card'); setShareCard(spotCard); setShareOpen(true) }} style={{ flex:1, padding:'11px', borderRadius:'9px', background:'#E8E8ED', color:'#48484A', border:'1.5px solid #D1CEC9', fontSize:'13px', cursor:'pointer', fontFamily:'var(--font-display)' }}>Partager</button>
                      <button onClick={e=>toggleFav(spotCard.id,e)} style={{ width:'44px', borderRadius:'9px', background:favs.has(spotCard.id)?'#FFF0F0':'#E8E8ED', border:`1px solid ${favs.has(spotCard.id)?'rgba(224,48,32,.25)':'#E5E5EA'}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}
                        onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.06)'}}
                        onMouseLeave={e=>{e.currentTarget.style.transform=''}}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={favs.has(spotCard.id)?'#E03020':'none'} stroke={favs.has(spotCard.id)?'#E03020':'#86868B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        
        {/* Retour en haut */}
        {view==='binder'&&binderSet&&binderSet!=='__all__'&&(
          <button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} style={{ position:'fixed', bottom:'24px', right:'24px', width:'44px', height:'44px', borderRadius:'50%', background:'#1D1D1F', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(0,0,0,.15)', zIndex:30, transition:'all .2s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.2)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.15)'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
          </button>
        )}

        {/* SHOWCASE PICKER */}
        {showPickerForShowcase&&(
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:48, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }} onClick={()=>{setShowPickerForShowcase(false);setVitrineSearch('');setVitrineFilter('all')}}>
            <div style={{ background:'#fff', borderRadius:'20px', padding:'0', maxWidth:'520px', width:'100%', animation:'fadeUp .25s ease-out', maxHeight:'85vh', display:'flex', flexDirection:'column', overflow:'hidden' }} onClick={e=>e.stopPropagation()}>
              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 20px', borderBottom:'1px solid #E5E5EA', flexShrink:0 }}>
                <div>
                  <div style={{ fontSize:'16px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)' }}>Ajouter a la Vitrine</div>
                  <div style={{ fontSize:'11px', color:'#86868B', marginTop:'2px' }}>{showcase.length}/5 pieces exposees</div>
                </div>
                <button onClick={()=>setShowPickerForShowcase(false)} style={{ width:'28px', height:'28px', borderRadius:'50%', background:'#F0F0F5', border:'none', color:'#86868B', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              {(()=>{
                const available = portfolio.filter(c=>!showcase.find(sc=>sc.id===c.id))
                const filtered = available.filter(c=>{
                  const matchSearch = !vitrineSearch || c.name.toLowerCase().includes(vitrineSearch.toLowerCase()) || c.set.toLowerCase().includes(vitrineSearch.toLowerCase())
                  const matchFilter = vitrineFilter==='all' || c.type===vitrineFilter || (vitrineFilter==='graded'&&c.graded) || (vitrineFilter==='rare'&&c.rarity&&['Alt Art','Secret Rare','Gold Star','Ultra Rare','Illustration Rare','Special Art Rare'].includes(c.rarity))
                  return matchSearch && matchFilter
                })
                return available.length===0?(
                <div style={{ textAlign:'center', padding:'40px 20px', color:'#86868B', fontSize:'13px', fontFamily:'var(--font-display)' }}>Toutes vos cartes sont dans la vitrine.</div>
              ):(
                <>
                {/* Search + filters */}
                <div style={{ padding:'12px 16px 0', flexShrink:0 }}>
                  <div style={{ position:'relative', marginBottom:'10px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2" strokeLinecap="round" style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <input value={vitrineSearch} onChange={e=>setVitrineSearch(e.target.value)} placeholder="Rechercher une carte..."
                      style={{ width:'100%', height:'38px', padding:'0 12px 0 36px', borderRadius:'10px', border:'1px solid #E5E5EA', background:'#F5F5F7', fontSize:'13px', color:'#1D1D1F', fontFamily:'var(--font-display)', outline:'none', boxSizing:'border-box' }}/>
                  </div>
                  <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', marginBottom:'4px' }}>
                    {[{k:'all',l:'Toutes'},{k:'fire',l:'Feu'},{k:'water',l:'Eau'},{k:'psychic',l:'Psy'},{k:'grass',l:'Plante'},{k:'rare',l:'Rares'},{k:'graded',l:'Gradees'}].map(f=>(
                      <button key={f.k} onClick={()=>setVitrineFilter(f.k)}
                        style={{ padding:'5px 12px', borderRadius:'99px', border:`1px solid ${vitrineFilter===f.k?'#1D1D1F':'#E5E5EA'}`, background:vitrineFilter===f.k?'#1D1D1F':'transparent', color:vitrineFilter===f.k?'#fff':'#86868B', fontSize:'10px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .15s' }}>
                        {f.l}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize:'10px', color:'#AEAEB2', fontFamily:'var(--font-display)', padding:'4px 0' }}>{filtered.length} carte{filtered.length!==1?'s':''} disponible{filtered.length!==1?'s':''}</div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', padding:'8px 16px 16px', overflowY:'auto' as const }}>
                  {filtered.slice(0,18).map(card=>{
                    const ec2=EC[card.type]??'#888'
                    return (
                      <div key={card.id} onClick={()=>addToShowcase(card)}
                        style={{ borderRadius:'14px', overflow:'hidden', cursor:'pointer', background:'#F5F5F7', border:'1px solid #E5E5EA', transition:'all .2s cubic-bezier(.22,.68,0,1.1)' }}
                        onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,.08)';e.currentTarget.style.borderColor='#E03020'}}
                        onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='';e.currentTarget.style.borderColor='#E5E5EA'}}>
                        {card.image?(
                          <img src={`${cleanImageUrl(card.image).replace(/\/low\.(webp|jpg|png)$/,'')}/low.webp`} alt={card.name}
                            loading="lazy"
                            style={{ width:'100%', aspectRatio:'63/88', objectFit:'cover', display:'block' }}
                            onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                        ):(
                          <div style={{ width:'100%', aspectRatio:'63/88', background:`linear-gradient(145deg,${ec2}15,${ec2}06)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:ec2, opacity:.4 }}/>
                          </div>
                        )}
                        <div style={{ padding:'8px' }}>
                          <div style={{ fontSize:'11px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.name}</div>
                          <div style={{ fontSize:'9px', color:'#86868B', marginTop:'2px' }}>{card.set}</div>
                          {card.curPrice>0&&<div style={{ fontSize:'11px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-data)', marginTop:'4px' }}>{card.curPrice} EUR</div>}
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
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }} onClick={()=>{ setAddOpen(false); setAddSuggs([]); setNameValidated(false) }}>
            <div className='add-modal' style={{ background:'#fff', borderRadius:'20px', border:'1px solid #E5E5EA', boxShadow:'0 24px 60px rgba(0,0,0,.15), 0 8px 20px rgba(0,0,0,.06)', padding:'24px', maxWidth:'520px', width:'100%', animation:'fadeUp .25s ease-out', maxHeight:'94vh', overflowY:'auto' as const }} onClick={e=>e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px' }}>
                <div>
                  <div style={{ fontSize:'17px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)' }}>Ajouter une carte</div>
                  <div style={{ fontSize:'10px', marginTop:'3px', color:'#AEAEB2', fontWeight:500 }}>* champs obligatoires</div>
                </div>
                <button onClick={()=>{ setAddOpen(false); setAddSuggs([]); setNameValidated(false) }} style={{ width:'28px', height:'28px', borderRadius:'50%', background:'#F0F0F5', border:'none', color:'#86868B', cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='#E5E5EA';e.currentTarget.style.color='#1D1D1F'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='#F0F0F5';e.currentTarget.style.color='#86868B'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div style={{ marginBottom:'14px' }}>
                <div className="req-label">Langue *</div>
                <div style={{ display:'flex', gap:'6px' }}>
                  {([{k:'FR' as const,flag:'\u{1F1EB}\u{1F1F7}',label:'Francais'},{k:'EN' as const,flag:'\u{1F1FA}\u{1F1F8}',label:'English'},{k:'JP' as const,flag:'\u{1F1EF}\u{1F1F5}',label:'\u65E5\u672C\u8A9E'}]).map(l=>(
                    <button key={l.k} onClick={()=>setAddForm(p=>({...p,lang:l.k}))}
                      style={{ flex:1, padding:'10px 8px', borderRadius:'10px', border:`1.5px solid ${addForm.lang===l.k?'#1D1D1F':'#E5E5EA'}`, background:addForm.lang===l.k?'#1D1D1F':'#fff', color:addForm.lang===l.k?'#fff':'#86868B', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', transition:'all .15s' }}
                      onMouseEnter={e=>{if(addForm.lang!==l.k){e.currentTarget.style.borderColor='#C7C7CC';e.currentTarget.style.background='#F5F5F7'}}}
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
                    style={{ width:'100%', appearance:'none' as const, background:'#F5F5F7', borderRadius:'10px', border:'1px solid #E5E5EA', padding:'10px 36px 10px 12px', color:addForm.set?'#1D1D1F':'#AEAEB2', fontSize:'13px', fontFamily:'var(--font-display)', outline:'none', cursor:'pointer' }}>
                    <option value="">{setsLoading?'Chargement des séries…':'Sélectionner une série…'}</option>
                    {liveSets.map(s=>(
                      <option key={s.id} value={s.id} style={{background:'#fff',color:'#1D1D1F'}}>
                        {s.name}{addForm.lang==='JP'&&frSetsMap[s.id]?' — '+frSetsMap[s.id]:''}{s.total?' ('+s.total+')':''}
                      </option>
                    ))}
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
                  <input value={addForm.name} onChange={e=>handleNameInput(e.target.value)} onBlur={()=>setTimeout(()=>setAddSuggs([]),150)}
                    placeholder={cardsLoading?'Chargement des cartes…':addForm.set?'Chercher dans '+addForm.set+' ('+liveCards.length+' cartes)…':'Nom de la carte…'}
                    className={addForm.name?'req-field-ok':'req-field'}
                    style={{ width:'100%', background:nameValidated?'#fff':'#F5F5F7', borderRadius:'10px', border:`1px solid ${nameValidated?'#2E9E6A':'#E5E5EA'}`, padding:'10px 12px 10px '+(nameValidated?'32px':'12px'), color:'#1D1D1F', fontSize:'13px', fontFamily:'var(--font-display)', outline:'none', boxSizing:'border-box' as const }}/>
                  {addSuggs.length>0&&(
                    <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#fff', border:'1px solid #E5E5EA', borderRadius:'12px', overflow:'hidden', zIndex:99, boxShadow:'0 8px 24px rgba(0,0,0,.1)' }}>
                      {addSuggs.map((s,i)=>(
                        <div key={i} onMouseDown={()=>handleSuggSelect(s)}
                          style={{ padding:'9px 14px', fontSize:'13px', color:'#3A3A3C', fontFamily:'var(--font-display)', cursor:'pointer', borderBottom:i<addSuggs.length-1?'1px solid rgba(29,29,31,.05)':'none', display:'flex', alignItems:'center', gap:'8px' }}
                          onMouseEnter={e=>(e.currentTarget.style.background='#F0F0F5')}
                          onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                          <span>{s}</span>
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
                <div style={{ display:'flex', background:'#F0F0F5', borderRadius:'12px', padding:'3px', marginBottom:addForm.graded?'12px':'0' }}>
                  {([{k:'Raw',l:'Raw (neuf)'},{k:'__graded__',l:'Grade'}] as const).map(opt=>{
                    const active = opt.k==='__graded__' ? addForm.graded : (!addForm.graded && addForm.condition===opt.k)
                    return (
                      <button key={opt.k} onClick={()=>handleConditionChange(opt.k)}
                        style={{ flex:1, padding:'9px', borderRadius:'10px', border:'none', background:active?'#fff':'transparent', color:active?'#1D1D1F':'#86868B', fontSize:'12px', fontWeight:active?600:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .15s', boxShadow:active?'0 1px 3px rgba(0,0,0,.08)':'none' }}
                        onMouseEnter={e=>{if(!active)e.currentTarget.style.color='#48484A'}}
                        onMouseLeave={e=>{if(!active)e.currentTarget.style.color='#86868B'}}>
                        {opt.l}
                      </button>
                    )
                  })}
                </div>
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

              <div style={{ display:'flex', gap:'10px', marginBottom:'14px', alignItems:'flex-end' }}>
                {/* Prix */}
                <div style={{ flex:1 }}>
                  <div className="opt-label">Prix d'achat</div>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'13px', color:'#AEAEB2', fontFamily:'var(--font-data)', pointerEvents:'none' }}>EUR</span>
                    <input type="number" value={addForm.buyPrice} onChange={e=>setAddForm(p=>({...p,buyPrice:e.target.value}))}
                      placeholder="0.00"
                      style={{ width:'100%', background:'#F5F5F7', borderRadius:'10px', border:'1px solid #E5E5EA', padding:'10px 12px 10px 42px', color:'#1D1D1F', fontSize:'16px', fontWeight:600, fontFamily:'var(--font-data)', outline:'none', boxSizing:'border-box' as const }}/>
                  </div>
                  <div style={{ fontSize:'9px', color:'#AEAEB2', marginTop:'4px', fontFamily:'var(--font-display)' }}>Optionnel — permet le calcul du ROI</div>
                </div>
                {/* Quantité */}
                <div style={{ width:'120px', flexShrink:0 }}>
                  <div className="opt-label">Quantite</div>
                  <div style={{ display:'flex', alignItems:'center', background:'#F5F5F7', borderRadius:'10px', border:'1px solid #E5E5EA', overflow:'hidden' }}>
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
                </div>
              </div>

              {!canAdd&&(
                <div style={{ display:'flex', alignItems:'center', gap:'7px', padding:'9px 12px', borderRadius:'9px', background:'rgba(0,0,0,.012)', border:'1px solid rgba(255,107,53,.2)', marginBottom:'12px' }}>
                  <span style={{ fontSize:'11px', color:'#EA580C', fontFamily:'var(--font-display)' }}>
                    {!addForm.set?'Selectionnez une serie':!addForm.name?'Renseignez le nom':!nameValidated?'Selectionnez une carte dans la liste':''}
                    {' '}pour activer le bouton
                  </span>
                </div>
              )}

              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={addCard} disabled={!canAdd}
                  style={{ flex:1, padding:'13px', borderRadius:'11px', background:canAdd?'#1D1D1F':'#F0F0F5', color:canAdd?'#fff':'#AEAEB2', border:'none', fontSize:'14px', fontWeight:600, cursor:canAdd?'pointer':'default', fontFamily:'var(--font-display)', boxShadow:'none', transition:'all .2s' }}>
                  Ajouter {addForm.qty>1?addForm.qty+' exemplaires':'au portfolio'}
                </button>
                <button onClick={()=>{ setAddOpen(false); setAddSuggs([]); setNameValidated(false) }}
                  style={{ padding:'13px 20px', borderRadius:'11px', background:'#F5F5F7', color:'#6E6E73', border:'1px solid #E5E5EA', fontSize:'14px', cursor:'pointer', fontFamily:'var(--font-display)' }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div style={{ position:'relative', zIndex:1, padding:'20px 28px 12px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'12px', marginBottom:'14px' }}>
            <div>
              <div style={{ fontSize:'10px', fontWeight:500, color:'#48484A', textTransform:'uppercase' as const, letterSpacing:'.15em', fontFamily:'var(--font-display)', marginBottom:'6px' }} className='section-reveal'>Portfolio</div>
              <div className={"value-hero" + (valuePulse ? " price-pulse" : "")} style={{ fontSize:'38px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', letterSpacing:'-1.5px', lineHeight:1, display:'flex', alignItems:'baseline', gap:'6px' }}>
                {portfolio.length>0 ? (
                  <>
                    <span style={{ fontSize:'22px', fontWeight:500, color:'#86868B', letterSpacing:'0' }}>EUR</span>
                    <span style={{ transition:'color .3s', color:valuePulse==='up'?'#2E9E6A':valuePulse==='down'?'#E03020':'#1D1D1F' }}>{displayValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </>
                ) : <span style={{ color:'#C7C7CC' }}>---</span>}
              </div>
              <div className="value-hero-sub" style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'8px' }}>
                {portfolio.length>0&&totalBuy>0&&<span style={{ fontSize:'14px', fontWeight:600, color:totalGain>=0?'#2E9E6A':'#E03020', background:totalGain>=0?'rgba(46,158,106,.08)':'rgba(224,48,32,.08)', padding:'3px 10px', borderRadius:'99px' }}>{totalGain>=0?'+':''}{totalROI}% · {totalGain>=0?'+':''}EUR {totalGain.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>}
                {portfolio.length>0&&<span style={{ fontSize:'13px', color:'#86868B', fontFamily:'var(--font-display)' }}>{portfolio.length} carte{portfolio.length!==1?'s':''} · {[...new Set(portfolio.map(c=>c.set))].length} set{[...new Set(portfolio.map(c=>c.set))].length!==1?'s':''}</span>}
                {portfolio.length===0&&<span style={{ fontSize:'13px', color:'#86868B' }}>Commencez votre collection</span>}
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
              {bestCard&&bestCard.buyPrice>0&&(
                <div style={{ background:'#F5F5F7', border:'1px solid #E5E5EA', borderRadius:'10px', padding:'8px 14px' }}>
                  <div style={{ fontSize:'10px', color:'#48484A', textTransform:'uppercase' as const, letterSpacing:'.08em', fontFamily:'var(--font-display)', marginBottom:'4px' }}>Meilleure perf.</div>
                  <div style={{ fontSize:'18px', fontWeight:600, color:'#D97706', fontFamily:'var(--font-display)' }}>+{Math.round(((bestCard.curPrice-bestCard.buyPrice)/bestCard.buyPrice)*100)}%</div>
                  <div style={{ fontSize:'10px', color:'#48484A' }}>{bestCard.name}</div>
                </div>
              )}
              <button onClick={()=>{ setShareCtx('portfolio'); setShareCard(null); setShareOpen(true) }} style={{ padding:'10px 18px', borderRadius:'12px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }} className='btn-shimmer' onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(224,48,32,.3)'}}
                onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}>Partager</button>
            </div>
          </div>
          <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
            {([['binder','Binder'],['showcase','Vitrine'],['wrapped','Wrapped 2026']] as Array<[ViewMode,string]>).map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)} className={'vtab'+(view===v?' on':'')}>{l}</button>
            ))}
          </div>
          {view==='binder' && portfolio.length>0 && (
            <div style={{ display:'flex', gap:'4px', marginTop:'6px' }}>
              <button onClick={()=>{ setBinderSet(null); setBinderPage(0) }}
                style={{ padding:'5px 14px', borderRadius:'99px', border:`1px solid ${!binderSet?'rgba(29,29,31,.24)':'rgba(29,29,31,.06)'}`, background:!binderSet?'#1D1D1F':'transparent', color:!binderSet?'#fff':'rgba(29,29,31,.45)', fontSize:'11px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .15s' }}>
                Par séries
              </button>
              <button onClick={()=>{ setBinderSet('__all__'); setBinderPage(0) }}
                style={{ padding:'5px 14px', borderRadius:'99px', border:`1px solid ${binderSet==='__all__'?'rgba(29,29,31,.24)':'rgba(29,29,31,.06)'}`, background:binderSet==='__all__'?'#1D1D1F':'transparent', color:binderSet==='__all__'?'#fff':'#86868B', fontSize:'11px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .15s' }}>
                Toute ma collection
              </button>
            </div>
          )}
          {binderSet&&binderSet!=='__all__'&&view==='binder'&&(
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:'0', padding:'28px 0 20px', position:'relative' }}>
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'500px', height:'250px', borderRadius:'50%', background:'radial-gradient(ellipse, rgba(224,48,32,.07) 0%, rgba(255,107,53,.03) 35%, transparent 65%)', pointerEvents:'none' }}/>
              {setLogos[binderSet||'']&&(
                <img src={setLogos[binderSet||'']} alt={binderSet||''} style={{ height:'140px', maxWidth:'480px', objectFit:'contain', position:'relative', filter:'drop-shadow(0 6px 24px rgba(0,0,0,.12)) drop-shadow(0 2px 6px rgba(0,0,0,.06))' }}
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
                    id:'u'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
                    name:c.name,set:binderSet||'',year:new Date().getFullYear(),
                    number:c.localId||'',rarity:c.rarity||'',
                    type:'fire',lang:sc[0]?.lang||'FR',
                    condition:'Raw',graded:false,
                    buyPrice:0,curPrice:0,qty:1,
                    image:c.image||undefined,
                    setId:sc[0]?.setId||'',setTotal:fullSetCards.length,
                  }))
                  setPortfolio(prev=>[...prev,...newCards])
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
                      <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'6px 16px', borderRadius:'99px', background:'linear-gradient(145deg,#8B7320,#B8942F,#D4AF37,#F5ECA0,#FFFAD0,#F5ECA0,#D4AF37,#B8942F,#8B7320)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', border:'1px solid rgba(212,175,55,.4)', boxShadow:'0 1px 3px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,240,.4)', overflow:'visible', position:'relative' }}>
                        <div style={{ position:'absolute', inset:0, borderRadius:'99px', background:'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/>
                        <span style={{ position:'relative', zIndex:1, fontSize:'12px', fontWeight:700, color:'#5C4A12', fontFamily:'var(--font-display)', letterSpacing:'.08em' }}>{String.fromCharCode(9733)} MASTER SET {String.fromCharCode(9733)}</span>
                      </div>
                    </div>
                  )
                  return (<>
                    <div style={{ height:'8px',borderRadius:'4px',background:'#E8E8ED',overflow:'hidden' }}>
                      <div style={{ width:pct2+'%',height:'100%',background:'linear-gradient(90deg,#ff6b35,#ff4433)',borderRadius:'4px',transition:'width .5s' }}/>
                    </div>
                    <div style={{ position:'absolute',right:0,top:'-2px',width:'12px',height:'12px',borderRadius:'50%',background:'#E03020',border:'2px solid #fff',boxShadow:'0 1px 4px rgba(0,0,0,.15)' }}/>
                    <div style={{ fontSize:'10px',color:'#E03020',marginTop:'6px',textAlign:'right' as const,fontFamily:'var(--font-display)',fontWeight:500 }}>{'Ajouter les '+missing2+' ›'}</div>
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

              <div style={{ position:'relative', padding:'12px 0 10px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                  <div>
                    <div style={{ fontSize:'10px', color:'#48484A', textTransform:'uppercase' as const, letterSpacing:'.12em', fontFamily:'var(--font-display)' }}>Ma Collection</div>
                    <div style={{ fontSize:'13px', color:'#48484A', fontFamily:'var(--font-display)', marginTop:'2px' }}>
                  {binderSet
                    ? <button onClick={()=>setBinderSet(null)} style={{ background:'none', border:'none', color:'rgba(255,107,53,.8)', cursor:'pointer', fontSize:'12px', fontFamily:'var(--font-display)', padding:0, display:'flex', alignItems:'center', gap:'4px' }}>← Toutes les séries</button>
                    : <>{portfolio.length} carte{portfolio.length!==1?'s':''} · {[...new Set(portfolio.map(c=>c.set))].length} set{[...new Set(portfolio.map(c=>c.set))].length!==1?'s':''}</>
                  }
                  {binderSet && (
                    <button onClick={()=>setBinderSet('__all__')} style={{ background:'none', border:'none', color:'#48484A', cursor:'pointer', fontSize:'11px', fontFamily:'var(--font-display)', padding:'0 0 0 10px', textDecoration:'underline' }}>
                      Toute ma collection
                    </button>
                  )}
                </div>
                  </div>
                  <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                    <button onClick={()=>setAddOpen(true)} style={{ padding:'7px 16px', borderRadius:'10px', background:'#1D1D1F', border:'none', color:'#fff', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const, display:'flex', alignItems:'center', gap:'6px', transition:'all .15s' }}
                      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.12)'}}
                      onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      Ajouter une carte
                    </button>
                    {(!binderSet||binderSet==='__all__')&&<button onClick={()=>{/* TODO: modal ajouter serie */setAddSetOpen(true);setAddSetCards([]);setAddSetId('');setAddSetName('')}} style={{ padding:'7px 16px', borderRadius:'10px', background:'#1D1D1F', border:'none', color:'#fff', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const, display:'flex', alignItems:'center', gap:'6px', transition:'all .15s' }}
                      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.12)'}}
                      onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
                      Ajouter une série
                    </button>}
                    <button onClick={()=>setImportOpen(true)} style={{ padding:'7px 16px', borderRadius:'10px', background:'#F5F5F7', border:'1px solid #E5E5EA', color:'#1D1D1F', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const, display:'flex', alignItems:'center', gap:'6px', transition:'all .15s' }}
                      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.06)'}}
                      onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                      Importer
                    </button>
                    <button onClick={()=>setScannerOpen(true)} style={{ padding:'7px 16px', borderRadius:'10px', background:'#F5F5F7', border:'1px solid #E5E5EA', color:'#1D1D1F', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const, display:'flex', alignItems:'center', gap:'6px', transition:'all .15s' }}
                      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.06)'}}
                      onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      Scanner
                    </button>
                    {(binderSet!==null)&&[6,7,8,9].map(n=>(
                      <button key={n} onClick={()=>{setBinderCols(n);setBinderPage(0)}} className="colbtn" style={{ border:`1px solid ${binderCols===n?'#1D1D1F':'#D2D2D7'}`, background:binderCols===n?'#1D1D1F':'transparent', color:binderCols===n?'#fff':'#86868B' }}>{n}</button>
                    ))}

                  </div>
                </div>

                {portfolio.length===0?(
                  <div style={{ textAlign:'center', padding:'64px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:'16px' }}>
                    <div style={{ fontSize:'14px', color:'#48484A', fontFamily:'var(--font-display)' }}>Collection vide</div>
                    <div style={{ fontSize:'12px', color:'#6E6E73', fontFamily:'var(--font-display)', maxWidth:'260px' }}>Ajoutez votre premiere carte pour commencer</div>
                    <button onClick={()=>setAddOpen(true)} style={{ padding:'11px 24px', borderRadius:'11px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                      + Ajouter ma première carte
                    </button>
                  </div>
                ) : (!binderSet || binderSet==='__all__') && binderSet!=='__all__' ? (
                  /* VUE SETS — SHELF */
                  <div style={{ display:'flex', flexDirection:'column', gap:'0' }}>
                    {true&&(
                      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                        <div style={{ position:'relative', flex:1, minWidth:'120px' }}>
                          <input
                            type="text"
                            placeholder="Rechercher une série..." onFocus={e=>{e.currentTarget.style.borderColor='#E03020';e.currentTarget.style.boxShadow='0 0 0 3px rgba(224,48,32,.08)'}} onBlur={e=>{e.currentTarget.style.borderColor='#E5E5EA';e.currentTarget.style.boxShadow=''}}
                            value={setSearch}
                            onChange={e=>setSetSearch(e.target.value)}
                            style={{ width:'100%', padding:'7px 12px 7px 32px', borderRadius:'10px', background:'#fff', border:'1.5px solid #D1CEC9', color:'#48484A', fontSize:'11px', fontFamily:'var(--font-display)', outline:'none', boxSizing:'border-box' as const }}
                          />
                          <div style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'12px', color:'#AEAEB2', pointerEvents:'none' }}>🔍</div>
                          {setSearch&&<button onClick={()=>setSetSearch('')} style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#48484A', cursor:'pointer', fontSize:'13px', padding:0, lineHeight:1 }}>×</button>}
                        </div>
                        <div style={{ display:'flex', gap:'4px', alignItems:'center', flexShrink:0 }}>
                          {([{k:'all' as const,l:'Toutes'},{k:'graded' as const,l:'Gradees'},{k:'raw' as const,l:'Raw'}] as const).map(fi=>(
                            <button key={fi.k} onClick={()=>{setBinderFilter(fi.k);setBinderPage(0)}}
                              style={{ padding:'5px 12px',borderRadius:'99px',border:`1px solid ${binderFilter===fi.k?'#1D1D1F':'#E5E5EA'}`,background:binderFilter===fi.k?'#1D1D1F':'transparent',color:binderFilter===fi.k?'#fff':'#86868B',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}>
                              {fi.l}
                            </button>
                          ))}
                          <div style={{ width:'1px',height:'16px',background:'#E5E5EA',margin:'0 2px' }}/>
                          {([{k:'number' as const,l:'N°'},{k:'name' as const,l:'A→Z'},{k:'price' as const,l:'Prix'}] as const).map(so=>(
                            <button key={so.k} onClick={()=>setBinderSort(so.k)}
                              style={{ padding:'5px 10px',borderRadius:'99px',border:`1px solid ${binderSort===so.k?'#E03020':'#E5E5EA'}`,background:binderSort===so.k?'#FFF1EE':'transparent',color:binderSort===so.k?'#E03020':'#86868B',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}>
                              {so.l}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {(()=>{
                      const raw=[...new Set(portfolio.map(c=>c.set))]
                      const ordered=setOrder.length>0?[...setOrder.filter(n=>raw.includes(n)),...raw.filter(n=>!setOrder.includes(n))]:raw
                      return ordered
                    })().filter(n=>n.toLowerCase().includes(setSearch.toLowerCase())).map((setName,si)=>{
                      const setCards=portfolio.filter(c=>c.set===setName)
                      const setIdKey=setCards.find(c=>c.setId)?.setId??''
                      const total=setCards[0]?.setTotal||0
                      const resolvedTotal=total||(setIdKey?setTotalsMap[setIdKey]:0)||setTotalsMap[setName]||setTotalsMap[setName.toLowerCase()]||0
                      const uniqueNums=new Set(setCards.map(c=>c.number)).size
                      const pct=resolvedTotal>0?Math.round((uniqueNums/resolvedTotal)*100):null
                      const totalForDisplay=resolvedTotal
                      const ec2=EC[setCards[0]?.type??'fire']??'#888'
                      const isComplete=pct===100
                      const filteredSetCards=[...setCards].filter(c=>{
                        if(binderFilter==='graded') return c.graded
                        if(binderFilter==='raw') return !c.graded
                        return true
                      })
                      const shelfGhosts = shelfSetCards[setName] || []
                      const cardImgs: GridItem[] = (binderSort==='number' && shelfGhosts.length>0 && binderFilter==='all' && !setSearch)
                        ? (()=>{
                            const ownedMap = new Map<string,CardItem>()
                            setCards.forEach(c => ownedMap.set(c.number, c))
                            return shelfGhosts.map(fc => {
                              const owned = ownedMap.get(fc.localId||'')
                              if(owned) return { type:'owned' as const, card:owned }
                              return { type:'ghost' as const, name:fc.name, number:fc.localId||'', image:cleanImageUrl(fc.image)||'', rarity:fc.rarity||'' }
                            })
                          })()
                        : filteredSetCards.sort((a,b)=>{
                            if(binderSort==='number') return (parseInt(a.number)||999)-(parseInt(b.number)||999)
                            if(binderSort==='name') return a.name.localeCompare(b.name)
                            if(binderSort==='price') return b.curPrice-a.curPrice
                            return 0
                          }).map(c=>({ type:'owned' as const, card:c }))
                      return (
                        <div key={setName} className="set-block" style={{ marginBottom:'24px', animation:`slotIn .2s ${si*.05}s ease-out both` }}>
                          {/* Header du set — XP Bar gamifiée exact artifact */}
                          {(()=>{
                            const p=pct??0
                            const lvlColor = isComplete?'#fff':p>=75?'rgba(52,211,153,.95)':p>=50?'rgba(96,165,250,.9)':p>=25?'rgba(96,165,250,.75)':'#EA580C'
                            const lvlBg = isComplete?'linear-gradient(135deg,#D4AF37,#F0E080)':p>=75?'rgba(52,211,153,.22)':p>=50?'rgba(96,165,250,.22)':p>=25?'rgba(96,165,250,.2)':'rgba(255,107,53,.25)'
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
                              <div className='set-header' style={{ marginBottom:'12px', cursor:'pointer', opacity:dragSet===setName?.5:1, borderTop:dragOverSet===setName?'2px solid #E03020':'2px solid transparent', transition:'opacity .2s, border-color .2s' }}
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
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="2.5" strokeLinecap="round" style={{ transition:'transform .3s cubic-bezier(.4,0,.2,1)', transform:collapsedSets.has(setName)?'rotate(-90deg)':'rotate(0deg)', flexShrink:0 }}><path d="M6 9l6 6 6-6"/></svg>
                                    <div style={{ width:'22px', height:'22px', borderRadius:'6px', background:lvlBg, border:`1px solid ${lvlBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:isComplete?'12px':'9px', fontWeight:800, color:lvlColor, flexShrink:0, textShadow:isComplete?'0 1px 2px rgba(100,80,20,.4)':'none', boxShadow:'none', animation:isComplete?'starBreath 4s ease-in-out infinite':'none' }}>{lvl}</div>
                                                                        {setLogos[setName]&&(
                                      <img src={setLogos[setName]} alt="" style={{ height:'28px', maxWidth:'80px', objectFit:'contain', flexShrink:0 }}
                                        onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                                    )}
                                    <div>
                                      <div style={{ fontSize:'14px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', lineHeight:1.2, textShadow:'none' }}>{setName}</div>
                                      <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'2px', flexWrap:'wrap' }}>
                                        <span style={{ fontSize:'11px', lineHeight:1 }}>{(setCards[0]?.lang||'FR')==='EN'?'\u{1F1FA}\u{1F1F8}':(setCards[0]?.lang||'FR')==='JP'?'\u{1F1EF}\u{1F1F5}':'\u{1F1EB}\u{1F1F7}'}</span>
                                        {setBlocks[setName]?<span style={{ fontSize:'10px', color:'#86868B', fontFamily:'var(--font-display)' }}>{setBlocks[setName]}</span>:null}
                                        {(()=>{ const sid=setCards.find(c=>c.setId)?.setId||''; return (<>{(sid.includes('-shadowless')&&!sid.includes('-ns'))||sid.includes('-1st')?<span className="ed-badge ed-1st-edition">1ST EDITION</span>:null}{sid.includes('-shadowless')?<span className="ed-badge ed-shadowless">SHADOWLESS</span>:null}</>)})()}
                                      </div>
                                    </div>
                                    {(()=>{ const sid=setCards.find(c=>c.setId)?.setId; return sid&&frSetsMap[sid]&&frSetsMap[sid]!==setName?<span style={{ fontSize:'10px', color:'#AEAEB2', fontWeight:400, marginLeft:'4px' }}>({frSetsMap[sid]})</span>:null })()}
                                    {pct!==null&&!isComplete&&<span style={{ fontSize:'10px', fontWeight:700, color:lvlColor }}>{pct}%</span>}
                                    {isComplete&&<span style={{ fontSize:'7px', fontWeight:700, background:'linear-gradient(145deg,#8B7320,#B8942F,#D4AF37,#F5ECA0,#FFFAD0,#F5ECA0,#D4AF37,#B8942F,#8B7320)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', color:'#5C4A12', padding:'2px 8px', borderRadius:'3px', letterSpacing:'.12em', border:'1px solid rgba(212,175,55,.4)', boxShadow:'0 1px 3px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,240,.4)', display:'inline-flex', alignItems:'center', gap:'4px' }}><span style={{ fontSize:'10px' }}>{String.fromCharCode(9733)}</span>MASTER SET</span>}
                                    {pct!==null&&!isComplete&&p>=75&&<span style={{ fontSize:'8px', background:'rgba(52,211,153,.1)', border:'1px solid rgba(52,211,153,.25)', color:'rgba(52,211,153,.8)', padding:'1px 6px', borderRadius:'3px' }}>Presque !</span>}
                                  </div>
                                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                    <span style={{ fontSize:'10px', color:'#48484A', fontFamily:'var(--font-display)' }}>{uniqueNums}{resolvedTotal>0?<span style={{ color:'#86868B' }}> / {resolvedTotal}</span>:<span style={{ color:'#AEAEB2' }}> cartes</span>}</span>
                                    <button onClick={e=>{e.stopPropagation();if(window.confirm('Supprimer toutes les '+setCards.length+' cartes de "'+setName+'" ?')){const ids=setCards.filter(c=>!c.id.startsWith('u')).map(c=>c.id);if(user&&ids.length)supabase.from('portfolio_cards').delete().in('id',ids).then(({error})=>{if(error)console.error('Set delete error:',error);else console.log('Set deleted from Supabase:',ids.length,'cards')});setPortfolio(prev=>prev.filter(c=>c.set!==setName));showToast(setName+' supprimé')}}} style={{ width:'26px', height:'26px', borderRadius:'50%', background:'transparent', border:'1px solid #E5E5EA', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s', flexShrink:0 }}
                                      onMouseEnter={e=>{e.currentTarget.style.background='#FFF1EE';e.currentTarget.style.borderColor='rgba(224,48,32,.3)'}}
                                      onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='#E5E5EA'}}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E03020" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                    </button>
                                    <span className="voir-pill" onClick={e=>{e.stopPropagation();setBinderSet(setName);setBinderPage(0)}} style={{ fontSize:'11px', color:'#E03020', fontWeight:500, fontFamily:'var(--font-display)', padding:'3px 10px', borderRadius:'99px', background:'#FFF1EE', border:'1px solid rgba(224,48,32,.15)', transition:'all .2s', whiteSpace:'nowrap', cursor:'pointer' }}>Voir la série complète ›</span>
                                  </div>
                                </div>
                                {resolvedTotal>0&&(
                                  <>
                                    {isComplete?(
                                      <div style={{ height:'8px', borderRadius:'4px', background:'#F0EBD8', overflow:'visible', position:'relative' }}>
                                        <div style={{ width:'100%', height:'100%', borderRadius:'4px', background:'linear-gradient(90deg,#C9A84C,#D4AF37,#E8D48B,#D4AF37,#C9A84C)', overflow:'hidden' }}>
                                          <div style={{ position:'absolute', top:0, width:'80px', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,250,.7),transparent)', animation:'masterSweep 6s ease-in-out infinite', borderRadius:'4px' }}/>
                                          <div style={{ position:'absolute', top:0, width:'50px', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,250,.45),transparent)', animation:'masterSweep 6s 3s ease-in-out infinite', borderRadius:'4px' }}/>
                                        </div>
                                        <div style={{ position:'absolute', inset:0, borderRadius:'4px', background:'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.3) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/>
                                        <div className='master-glitter-container' style={{ position:'absolute', inset:'-2px 0', pointerEvents:'none' }}/>
                                      </div>
                                    ):(
                                    <div style={{ display:'flex', gap:'3px' }}>
                                      {segs.map((seg,si2)=>(
                                        <div key={si2} style={{ flex:1, height:'6px', borderRadius:'3px', overflow:'hidden', position:'relative', background:'#E8E8ED' }}>
                                          {(seg[0] as number)>0&&<div style={{ width:(seg[0] as number)+'%', height:'100%', background:seg[1] as string, borderRadius:'3px', position:'relative', overflow:'hidden', transition:'width .5s ease' }}>
                                            <div style={{ position:'absolute', top:0, bottom:0, width:'24px', background:'linear-gradient(90deg,transparent,rgba(29,29,31,.3),transparent)', animation:`shim ${1.8+si*.3}s ${si2*.35}s linear infinite` }}/>
                                          </div>}
                                        </div>
                                      ))}
                                    </div>
                                    )}
                                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:'3px', padding:'0 1px' }}>
                                      {!isComplete&&(['0','25%','50%','75%','100%'] as string[]).map((label,li)=>(
                                        <span key={li} style={{ fontSize:'8px', color:p>=(li*25)&&li>0?lvlColor:'#86868B', transition:'color .3s' }}>{p>=(li*25)&&li>0?label+' ✓':label}</span>
                                      ))}
                                    </div>
                                    
                                  </>
                                )}
                                {!resolvedTotal&&(
                                  <>
                                    <div style={{ display:'flex', gap:'3px' }}>
                                      {[0,1,2,3].map(i=>(
                                        <div key={i} style={{ flex:1, height:'6px', borderRadius:'3px', background:'#E8E8ED', overflow:'hidden', position:'relative' }}>
                                          {i===0&&<div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,#ff6b35,#ff4433)' }}><div style={{ position:'absolute', top:0, bottom:0, width:'24px', background:'linear-gradient(90deg,transparent,rgba(29,29,31,.3),transparent)', animation:'shim 2s linear infinite' }}/></div>}
                                        </div>
                                      ))}
                                    </div>
                                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:'3px', padding:'0 1px' }}>
                                      {['0','25%','50%','75%','100%'].map((label,li)=>(
                                        <span key={li} style={{ fontSize:'8px', color:li===0?'#EA580C99':'rgba(29,29,31,.07)' }}>{label}</span>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            )
                          })()}
                          {/* Rayon de cartes */}
                          {!collapsedSets.has(setName)&&<div>
                          <div className="shelf-row" ref={el=>{scrollRefs.current[setName]=el}} onScroll={e=>handleShelfScroll(setName,e)} onMouseDown={e=>{e.preventDefault();onShelfMouseDown(e)}} style={{ display:'flex', gap:'8px', overflowX:'auto' as const, padding:'8px 0 8px', WebkitOverflowScrolling:'touch' as any, cursor:'grab', willChange:'scroll-position' }}>
                            {cardImgs.map((item,ci)=>{
                              if(item.type==='ghost'){
                                const gi=item
                                return(
                                  <div key={'sg-'+gi.number}
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
                                          style={{ width:'100%', aspectRatio:'63/88', objectFit:'cover', display:'block', filter:'grayscale(1)' }}
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
                              <div key={card.id}
                                style={{ flexShrink:0, width:'149px', borderRadius:'12px', overflow:'visible', position:'relative', transition:'transform .2s cubic-bezier(.34,1.2,.64,1)' }}
                                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-6px)'; e.currentTarget.style.boxShadow='0 12px 24px rgba(0,0,0,.1)'; const rb=e.currentTarget.querySelector('.remove-btn') as HTMLElement|null; if(rb) rb.style.opacity='1' }}
                                onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; const rb=e.currentTarget.querySelector('.remove-btn') as HTMLElement|null; if(rb) rb.style.opacity='0' }}>
                                <div onClick={()=>{ setSpotCard(card); setEditQty(null) }} style={{ borderRadius:'12px', overflow:'hidden', border:`${borderW} solid ${borderColor}`, boxShadow:`0 2px 8px rgba(0,0,0,.08)`, position:'relative', cursor:'pointer' }}>
                                <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(29,29,31,.05) 0%,transparent 40%)', zIndex:2, pointerEvents:'none' }}/>
                                {card.image?(
                                  <img src={cleanImageUrl(card.image)} alt={card.name}
                                    style={{ width:'100%', aspectRatio:'63/88', objectFit:'cover', display:'block' }}
                                    onError={e=>{ const t=e.target as HTMLImageElement; t.onerror=null }}/>
                                ):(
                                  <div style={{ width:'100%', aspectRatio:'63/88', background:`linear-gradient(145deg,${ec2}18,${ec2}06)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                    <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec2}CC,${ec2}55)` }}/>
                                  </div>
                                )}
                                {inFullSet&&card.qty>1&&<span style={{ position:'absolute', top:'4px', left:'4px', fontSize:'9px', fontWeight:700, padding:'2px 6px', borderRadius:'99px', background:'rgba(0,0,0,.55)', color:'#fff', zIndex:3, backdropFilter:'blur(4px)', fontFamily:'var(--font-data)' }}>{String.fromCharCode(215)}{card.qty}</span>}
                                <div style={{ padding:'6px 6px 4px', position:'relative' }}>
                                  {card.imageStatus==='pending'&&<div style={{ position:'absolute', top:'4px', left:'4px', zIndex:10, background:'rgba(255,165,0,.9)', color:'#fff', fontSize:'7px', fontWeight:700, padding:'2px 5px', borderRadius:'3px', fontFamily:'var(--font-data)', letterSpacing:'.03em', backdropFilter:'blur(4px)' }}>EN ATTENTE</div>}
                                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'3px' }}>
                                    <div style={{ fontSize:'11px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }} title={card.lang==='JP'&&card.setId&&frCardsMap['__id__'+(card.number||'')]?frCardsMap['__id__'+card.number]:undefined}>{card.name}</div>
                                    {inFullSet&&card.graded&&<span style={{ fontSize:'8px', fontWeight:700, padding:'2px 5px', borderRadius:'4px', background:gradeBg, color:gradeFg, fontFamily:'var(--font-data)', letterSpacing:'.02em', flexShrink:0, backgroundSize:gn>=5?'300% 300%':'auto', animation:gn>=5?'metalShift 8s ease-in-out infinite':'none', position:'relative', overflow:'hidden' }}>{gn>=5&&<span style={{ position:'absolute', inset:0, borderRadius:'4px', background:gn>=10?'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)':gn>=8?'linear-gradient(145deg,transparent 30%,rgba(255,255,255,.3) 45%,transparent 60%)':'linear-gradient(145deg,transparent 30%,rgba(224,191,160,.25) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/>}<span style={{ position:'relative', zIndex:1 }}>{card.condition}</span></span>}
                                  </div>
                                  {(()=>{ const p = getPrice(card); return p ? <div style={{ fontSize:'10px', fontWeight:600, color:'#2E9E6A', fontFamily:'var(--font-data)', marginTop:'1px' }}>{p.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} {String.fromCharCode(8364)}</div> : null })()}
                                  <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'3px' }}>
                                    <span style={{ fontSize:'11px', lineHeight:1 }}>{card.lang==='EN'?'\u{1F1FA}\u{1F1F8}':card.lang==='FR'?'\u{1F1EB}\u{1F1F7}':'\u{1F1EF}\u{1F1F5}'}</span>
                                    {card.number&&card.number!=='???'&&<span style={{ fontSize:'9px', color:'#6E6E73', fontFamily:'var(--font-data)' }}>#{card.number}</span>}
                                    {card.rarity&&<span style={{ fontSize:'9px', color:'#86868B' }}>{card.rarity}</span>}
                                    {!card.graded&&card.condition&&card.condition!=='Raw'&&<span style={{ fontSize:'8px', color:'#86868B', background:'#F0F0F5', padding:'1px 4px', borderRadius:'3px' }}>{card.condition}</span>}
                                  </div>
                                  {(card.setId?.includes('-shadowless')||card.setId?.includes('-1st'))&&(
                                    <div style={{ display:'flex', alignItems:'center', gap:'3px', marginTop:'2px' }}>
                                      {(card.setId?.includes('-shadowless')&&!card.setId?.includes('-ns'))||card.setId?.includes('-1st')?<span className="ed-badge ed-1st-edition">1ST EDITION</span>:null}
                                      {card.setId?.includes('-shadowless')&&<span className="ed-badge ed-shadowless">SHADOWLESS</span>}
                                    </div>
                                  )}
                                </div>
                                </div>
                                <div className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}}
                                  onMouseEnter={e=>{const p=e.currentTarget.parentElement;if(p){p.style.transform='translateY(-6px)';p.style.transition='none'}}}
                                  onClick={e=>{e.stopPropagation();removeCard(card,e)}}
                                  style={{ position:'absolute', top:0, left:0, right:0, height:'25%', zIndex:20, cursor:'pointer', opacity:0, transition:'opacity .15s', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'8px', borderRadius:'12px 12px 0 0', background:'linear-gradient(to bottom, rgba(255,255,255,.85) 0%, rgba(255,255,255,.4) 60%, transparent 100%)' }}>
                                  <span style={{ background:'#fff', border:'1px solid #E5E5EA', color:'#E03020', borderRadius:'99px', padding:'5px 14px', fontSize:'10px', fontWeight:600, fontFamily:'var(--font-display)', whiteSpace:'nowrap', boxShadow:'0 2px 8px rgba(0,0,0,.1)', pointerEvents:'none' }}>Retirer</span>
                                </div>
                              </div>
                              )})())
                            })}
                            {/* Carte + ajout */}
                            <div onClick={()=>{
                                const lang=setCards[0]?.lang||'FR'
                                const sid=setCards.find(c=>c.setId)?.setId || liveSets.find(ls=>ls.name===setName)?.id || liveSets.find(ls=>ls.name.toLowerCase()===setName.toLowerCase())?.id || ''
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
                            const ownedNumbers = new Set(setCards.map(c => c.number))
                            // Build ghost card number list for positional matching
                            const ghostNums = (shelfSetCards[setName] || []).map((c: any) => c.localId || '')
                            return (
                              <div className="minimap" style={{ marginTop:'8px' }}
                                onMouseDown={e => mmDown(setName, total, e)}>
                                {/* Micro-rectangles */}
                                <div style={{ position:'absolute', inset:'3px', display:'flex', gap:'1px', borderRadius:'4px', overflow:'hidden' }}>
                                  {Array.from({ length: bars }).map((_, i) => {
                                    const idx = total <= 150 ? i : Math.round((i / bars) * total)
                                    const ghostNum = ghostNums[idx] || String(idx + 1)
                                    const isOwned = ownedNumbers.has(ghostNum) || ownedNumbers.has(String(idx + 1))
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
                          {si<(()=>{const raw=[...new Set(portfolio.map(c=>c.set))];const ordered=setOrder.length>0?[...setOrder.filter(n=>raw.includes(n)),...raw.filter(n=>!setOrder.includes(n))]:raw;return ordered})().filter(n=>n.toLowerCase().includes(setSearch.toLowerCase())).length-1&&<div style={{ height:'1px', background:'#F5F5F7', marginTop:collapsedSets.has(setName)?'8px':'20px' }}/>}
                        </div>
                      )
                    })}
                  </div>
                ):(<>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
                    <div style={{ position:'relative', flex:1, minWidth:'120px' }}>
                      <input type="text" placeholder="Rechercher une carte..."
                        onFocus={e=>{e.currentTarget.style.borderColor='#E03020';e.currentTarget.style.boxShadow='0 0 0 3px rgba(224,48,32,.08)'}}
                        onBlur={e=>{e.currentTarget.style.borderColor='#E5E5EA';e.currentTarget.style.boxShadow=''}}
                        value={setSearch} onChange={e=>{setSetSearch(e.target.value);setBinderPage(0)}}
                        style={{ width:'100%', padding:'7px 12px 7px 32px', borderRadius:'10px', background:'#fff', border:'1.5px solid #D1CEC9', color:'#48484A', fontSize:'11px', fontFamily:'var(--font-display)', outline:'none', boxSizing:'border-box' as const }}/>
                      <div style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'12px', color:'#AEAEB2', pointerEvents:'none' }}>🔍</div>
                      {setSearch&&<button onClick={()=>setSetSearch('')} style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#48484A', cursor:'pointer', fontSize:'13px', padding:0, lineHeight:1 }}>×</button>}
                    </div>
                    <div style={{ display:'flex', gap:'4px', alignItems:'center', flexShrink:0 }}>
                      {([{k:'all' as const,l:'Toutes'},{k:'graded' as const,l:'Gradees'},{k:'raw' as const,l:'Raw'}] as const).map(fi=>(
                        <button key={fi.k} onClick={()=>{setBinderFilter(fi.k);setBinderPage(0)}}
                          style={{ padding:'5px 12px',borderRadius:'99px',border:`1px solid ${binderFilter===fi.k?'#1D1D1F':'#E5E5EA'}`,background:binderFilter===fi.k?'#1D1D1F':'transparent',color:binderFilter===fi.k?'#fff':'#86868B',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}>
                          {fi.l}
                        </button>
                      ))}
                      <div style={{ width:'1px',height:'16px',background:'#E5E5EA',margin:'0 2px' }}/>
                      {([{k:'number' as const,l:'N°'},{k:'name' as const,l:'A→Z'},{k:'price' as const,l:'Prix'}] as const).map(so=>(
                        <button key={so.k} onClick={()=>setBinderSort(so.k)}
                          style={{ padding:'5px 10px',borderRadius:'99px',border:`1px solid ${binderSort===so.k?'#E03020':'#E5E5EA'}`,background:binderSort===so.k?'#FFF1EE':'transparent',color:binderSort===so.k?'#E03020':'#86868B',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}>
                          {so.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:`repeat(${binderCols},minmax(0,1fr))`, gridAutoRows:'1fr', gap:binderCols>=7?'8px':'12px', padding:'4px 0' }}>
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
                          style={{ background:'transparent', border:'none', boxShadow:'none', animation:`illuminate .35s ${Math.min(idx,12)*.06}s ease-out both`, position:'relative', borderRadius:'10px', overflow:'visible', cursor:'pointer', transition:'transform .3s cubic-bezier(.22,.68,0,1.1), box-shadow .35s ease', display:'flex', flexDirection:'column' as const, height:'100%' }}
                          onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; const rb=e.currentTarget.querySelector('.remove-btn') as HTMLElement|null; if(rb) rb.style.opacity='0' }}
                          onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-8px)'; e.currentTarget.style.boxShadow='0 20px 40px rgba(0,0,0,.10), 0 8px 16px rgba(0,0,0,.04)'; const rb=e.currentTarget.querySelector('.remove-btn') as HTMLElement|null; if(rb) rb.style.opacity='1' }}
                          onClick={()=>{ setSpotCard(card); setEditQty(null) }}>

                          {/* Image pleine hauteur */}
                          <div style={{ position:'relative', width:'100%', aspectRatio:'63/88', overflow:'hidden', borderRadius:'10px', boxShadow:'0 2px 8px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.04)', flex:'none' }}>
                            {card.image ? (()=>{
                              return <img src={cleanImageUrl(card.image)} alt={card.name}
                                style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', display:'block', borderRadius:'10px', transition:'transform .4s cubic-bezier(.34,1.1,.64,1)' }}
                                onError={e=>{ const t=e.target as HTMLImageElement; t.onerror=null; t.style.opacity='0'; t.style.height='100%'; const p=t.parentElement; if(p&&!p.querySelector('.no-img-ph')){const d=document.createElement('div');d.className='no-img-ph';d.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;cursor:pointer';d.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg><span style="font-size:8px;color:#AEAEB2">Ajouter</span>';p.appendChild(d)} }}
                              />
                            })() : (
                              <div style={{ width:'100%', aspectRatio:'63/88', background:`linear-gradient(145deg,${ec}15,${ec}06)`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'6px', position:'relative' }}>
                                <div style={{ position:'absolute', width:'60%', height:'60%', borderRadius:'50%', background:eg, filter:'blur(18px)', opacity:.5 }}/>
                                <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec}CC,${ec}77)`, boxShadow:`0 0 16px ${eg}`, position:'relative', zIndex:1 }}/>
                                <button onClick={e=>{e.stopPropagation();triggerUpload(card.id)}} style={{ position:'relative', zIndex:1, background:'rgba(255,255,255,.85)', border:'1px solid rgba(0,0,0,.08)', borderRadius:'6px', padding:'3px 8px', fontSize:'8px', fontWeight:600, color:'#48484A', cursor:'pointer', fontFamily:'var(--font-display)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', gap:'3px' }}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                  Photo
                                </button>
                              </div>
                            )}
                            {/* Gradient bas pour lire les infos */}
                            
                            {/* Badges positionnés sur l'image */}
                            {card.signal&&<div style={{ position:'absolute', top:'5px', right:'5px', fontSize:'8px', fontWeight:800, background:TIER_BG[card.signal], color:'#1D1D1F', padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-display)', zIndex:2 }}>{card.signal}</div>}

                            
                          </div>
                          {/* Étiquette bas — propre et sobre */}
                          <div style={{ padding:'6px 4px 8px', position:'relative' }}>
                            <span style={{ position:'absolute', bottom:'6px', right:'4px', fontSize:binderCols>=7?'9px':'11px', fontWeight:700, color:'#6E6E73', fontFamily:'var(--font-data)' }}>×{card.qty}</span>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'3px' }}>
                              <div style={{ fontSize:fsName, fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{card.name}</div>
                              {card.buyPrice>0&&<div style={{ fontSize:'11px', fontWeight:700, color:roi>=0?'#2E9E6A':'#E03020', fontFamily:'var(--font-data)', flexShrink:0 }}>{roi>=0?'+':''}{roi}%</div>}
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'3px' }}>
                              <span style={{ fontSize:'11px' }}>{card.lang==='EN'?'🇺🇸':card.lang==='FR'?'🇫🇷':'🇯🇵'}</span>
                              {card.number&&card.number!=='???'&&<span style={{ fontSize:'10px', color:'#6E6E73', fontFamily:'var(--font-data)' }}>#{card.number}</span>}
                              {card.rarity&&card.rarity!==''&&<span style={{ fontSize:binderCols>=7?'9px':'11px', color:'#6E6E73', fontFamily:'var(--font-display)', marginLeft:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, maxWidth:binderCols>=7?'60px':'none' }}>{card.rarity}</span>}

                              
                            </div>
                            {(card.setId?.includes('-shadowless')||card.setId?.includes('-1st'))&&(
                              <div style={{ display:'flex', alignItems:'center', gap:'3px', marginTop:'2px' }}>
                                {(card.setId?.includes('-shadowless')&&!card.setId?.includes('-ns'))||card.setId?.includes('-1st')?<span className="ed-badge ed-1st-edition">1ST EDITION</span>:null}
                                {card.setId?.includes('-shadowless')?<span className="ed-badge ed-shadowless">SHADOWLESS</span>:null}
                              </div>
                            )}
                          </div>
                          {card.graded&&(()=>{
                            const gn3=parseInt(card.condition.replace(/[^0-9]/g,''))
                            const bg3=gn3>=10?'linear-gradient(145deg,#8B7320,#B8942F,#D4AF37,#F5ECA0,#FFFAD0,#F5ECA0,#D4AF37,#B8942F,#8B7320)':gn3>=9?'linear-gradient(145deg,#707070,#A8A8A8,#D8D8D8,#F0F0F0,#D8D8D8,#A8A8A8,#707070)':gn3>=5?'linear-gradient(145deg,#6B4226,#A0724A,#C4956A,#E0BFA0,#C4956A,#A0724A,#6B4226)':'#6E6E73'
                            const fg3=gn3>=10?'#1a1200':gn3>=9?'#222':gn3>=5?'#2a1800':'#fff'
                            const sh3=gn3>=10?'0 1px 3px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,240,.4)':gn3>=9?'0 1px 3px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.4)':gn3>=5?'0 1px 3px rgba(0,0,0,.12),inset 0 1px 0 rgba(224,191,160,.3)':'0 1px 4px rgba(0,0,0,.15)'
                            return <div style={{ position:'absolute', bottom:'28px', right:'4px', zIndex:3, background:bg3, color:fg3, fontSize:'8px', fontWeight:800, padding:'3px 7px', borderRadius:'5px', fontFamily:'var(--font-data)', boxShadow:sh3, letterSpacing:'.03em', overflow:'visible', border:gn3>=10?'1px solid rgba(212,175,55,.4)':gn3>=9?'1px solid rgba(168,168,168,.4)':gn3>=5?'1px solid rgba(160,114,74,.3)':'none', backgroundSize:gn3>=5?'300% 300%':'auto', animation:gn3>=5?'metalShift 8s ease-in-out infinite':'none' }}>
                              {gn3>=5&&<div style={{ position:'absolute', inset:0, borderRadius:'5px', background:gn3>=10?'linear-gradient(145deg,transparent 30%,rgba(255,255,240,.35) 45%,transparent 60%)':gn3>=9?'linear-gradient(145deg,transparent 30%,rgba(255,255,255,.3) 45%,transparent 60%)':'linear-gradient(145deg,transparent 30%,rgba(224,191,160,.25) 45%,transparent 60%)', backgroundSize:'300% 300%', animation:'metalShift 8s ease-in-out infinite', pointerEvents:'none' }}/>}
                              {gn3>=10&&<div className='badge-glitter-container' style={{ position:'absolute', inset:'-1px 0', pointerEvents:'none' }}/>}
                              <span style={{ position:'relative', zIndex:1 }}>{card.condition}</span>
                            </div>
                          })()}
                          <div className="remove-btn" onMouseDown={e=>{e.stopPropagation();e.preventDefault()}}
                            onMouseEnter={e=>{const p=e.currentTarget.parentElement;if(p){p.style.transform='translateY(-8px)';p.style.transition='none'}}}
                            onClick={e=>{e.stopPropagation();removeCard(card,e)}}
                            style={{ position:'absolute', top:0, left:0, right:0, height:'25%', zIndex:20, cursor:'pointer', opacity:0, transition:'opacity .15s', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'6px', borderRadius:'10px 10px 0 0', background:'linear-gradient(to bottom, rgba(255,255,255,.85) 0%, rgba(255,255,255,.4) 60%, transparent 100%)' }}>
                            <span style={{ background:'#fff', border:'1px solid #E5E5EA', color:'#E03020', borderRadius:'99px', padding:'4px 12px', fontSize:'9px', fontWeight:600, fontFamily:'var(--font-display)', whiteSpace:'nowrap', boxShadow:'0 2px 8px rgba(0,0,0,.1)', pointerEvents:'none' }}>Retirer</span>
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
                {binderPages>1&&(
                  <div style={{ display:'flex', justifyContent:'center', gap:'6px', marginTop:'16px' }}>
                    {Array.from({length:binderPages}).map((_,i)=>(
                      <div key={i} onClick={()=>setBinderPage(i)} style={{ width:'28px', height:'28px', borderRadius:'8px', background:i===binderPage?'#1D1D1F':'transparent', color:i===binderPage?'#fff':'#86868B', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:i===binderPage?600:500, cursor:'pointer', transition:'all .15s', fontFamily:'var(--font-data)' }}>{i+1}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VITRINE */}
        {view==='showcase'&&(
          <div style={{ position:'relative', zIndex:1, padding:'0 24px 20px', animation:'fadeUp .3s ease-out' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px' }}>
              <div>
                <div style={{ fontSize:'10px', color:'#48484A', textTransform:'uppercase' as const, letterSpacing:'.15em', fontFamily:'var(--font-display)', marginBottom:'4px' }}>Vitrine</div>
                <div style={{ fontSize:'13px', color:'#48484A', fontFamily:'var(--font-display)' }}>{showcase.length===0?'Exposez vos plus belles pieces':showcase.length+' piece'+(showcase.length!==1?'s':'')+' exposee'+(showcase.length!==1?'s':'')}</div>
              </div>
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <select value={showcaseBg} onChange={e=>setShowcaseBg(e.target.value)}
                  style={{ height:'36px', padding:'0 28px 0 12px', borderRadius:'99px', background:'#F5F5F7', border:'1px solid #E5E5EA', color:'#1D1D1F', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', outline:'none', appearance:'none' as const, backgroundImage:'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1L5 5L9 1\' stroke=\'%2348484A\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")', backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center' }}>
                  <option value="obsidienne">Obsidienne & Or</option>
                  <option value="nuit">Nuit Etoilee</option>
                  <option value="jade">Jade Imperial</option>
                  <option value="pokedex">Interface Pokedex</option>
                  <option value="holodex">Pokedex Holo</option>
                  <option value="centre">Centre Pokemon</option>
                  <option value="labo">Labo Pr. Chen</option>
                </select>
                <button onClick={()=>setShowInfo(v=>!v)}
                  style={{ padding:'0', width:'36px', height:'36px', borderRadius:'99px', background:showInfo?'#F5F5F7':'#F5F5F7', border:'1px solid #E5E5EA', color:showInfo?'#1D1D1F':'#AEAEB2', fontSize:'12px', cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{showInfo?<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z"/>:<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/>}</svg>
                </button>
                <button onClick={()=>{ setShareCtx('showcase'); setShareCard(null); setShareOpen(true) }}
                  disabled={showcase.length===0}
                  style={{ padding:'9px 18px', borderRadius:'10px', background:showcase.length>0?'linear-gradient(135deg,#E03020,#FF4433)':'#E8E8ED', border:'none', color:showcase.length>0?'#fff':'#86868B', fontSize:'12px', fontWeight:600, cursor:showcase.length>0?'pointer':'default', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const, transition:'all .2s' }}>
                  Partager ma Vitrine
                </button>
                <button onClick={()=>{ if(portfolio.length===0){ showToast('Ajoutez des cartes a votre collection') }else if(showcase.length>=5){ showToast('La vitrine est limitee a 5 pieces') }else{ setShowPickerForShowcase(true) } }}
                  style={{ padding:'9px 18px', borderRadius:'10px', background:'#FFF1EE', border:'1px solid rgba(220,60,30,.3)', color:'#C53010', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const }}>
                  + Ajouter une carte
                </button>
              </div>
            </div>
            {showcase.length===0?(
              <div style={{ textAlign:'center', padding:'80px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:'18px' }}>
                <div style={{ fontSize:'15px', color:'#48484A', fontFamily:'var(--font-display)' }}>Vitrine vide</div>
                <div style={{ fontSize:'12px', color:'#6E6E73', fontFamily:'var(--font-display)', maxWidth:'280px' }}>Exposez vos pieces maitresses. Partagez-les avec votre communaute.</div>
                {portfolio.length>0&&(
                  <button onClick={()=>setShowPickerForShowcase(true)} style={{ padding:'10px 22px', borderRadius:'10px', background:'#FFF1EE', border:'1px solid rgba(220,60,30,.3)', color:'#C53010', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                    Choisir depuis ma collection
                  </button>
                )}
              </div>
            ):(
              /* ── VITRINE LUXE ── */
              <div style={{ background:(()=>{ const m:Record<string,string>={obsidienne:'#080604',nuit:'radial-gradient(ellipse at 50% 30%,#120820 0%,#080510 50%,#030208 100%)',jade:'linear-gradient(160deg,#020b06 0%,#030e08 50%,#020a07 100%)',pokedex:'#04080c',holodex:'#030b0f',centre:'#030206',labo:'#04080a'}; return m[showcaseBg]??'#080604' })(), borderRadius:'24px', padding:'60px 48px 52px', position:'relative', overflow:'hidden', boxShadow:'inset 0 1px 0 rgba(255,255,255,.03),inset 0 -1px 0 rgba(0,0,0,.8),0 40px 80px rgba(0,0,0,.5),0 0 0 1px rgba(0,0,0,.1)' }}>
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
                <div style={{ display:'flex', gap:'28px', flexWrap:'wrap' as const, justifyContent:'center', alignItems:'flex-end', position:'relative' }}>
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
                      <div key={card.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', animation:`showcaseReveal .6s ${idx*.12}s cubic-bezier(.16,1,.3,1) both`, position:'relative', zIndex:1 }}>
                        {/* Spotlight cone */}
                        <div style={{ position:'absolute', top:'-80px', left:'50%', transform:'translateX(-50%)', width:'200px', height:'160px', background:`radial-gradient(ellipse at 50% 0%,${isGold?'rgba(255,240,150,.18)':isFeat?`${ec}28`:'rgba(29,29,31,.05)'} 0%,transparent 60%)`, pointerEvents:'none' }}/>

                        {/* Card slot */}
                        <div
                          draggable
                          onDragStart={()=>setDragIdx(idx)}
                          onDragOver={e=>e.preventDefault()}
                          onDrop={()=>{ if(dragIdx===null||dragIdx===idx) return; setShowcase(prev=>{ const a=[...prev]; const [item]=a.splice(dragIdx,1); a.splice(idx,0,item); return a }); setDragIdx(null) }}
                          onDragEnd={()=>setDragIdx(null)}
                          onClick={()=>{ setSpotCard(card); setEditQty(null) }}
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
                              style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
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
                            style={{ position:'absolute', top:'7px', left:'7px', zIndex:10, background:'rgba(240,239,237,.94)', backdropFilter:'blur(4px)', border:'1px solid #D2D2D7', color:'#3A3A3C', borderRadius:'7px', padding:'3px 9px', fontSize:'9px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', opacity:0, transition:'opacity .2s', pointerEvents:'all' }}>
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
                          {/* Prix */}
                          <div style={{ fontSize:'22px', fontWeight:700, color:'#fff', fontFamily:'var(--font-data)', letterSpacing:'-.02em', lineHeight:1, marginBottom:'8px' }}>
                            {card.curPrice>0?card.curPrice.toLocaleString('fr-FR')+' €':'—'}
                          </div>
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
                            {roi!==0&&card.buyPrice>0&&<span style={{ fontSize:'11px', fontWeight:700, color:roi>=0?'#2E9E6A':'#E03020', fontFamily:'var(--font-data)' }}>{roi>=0?'+':''}{roi}%</span>}
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
      {/* ── UPLOAD GUIDELINES ── */}
      {/* ── UPLOAD ── */}
      <input ref={el=>{uploadRef.current=el}} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }}
        onChange={e=>{ const fi=e.target.files?.[0]; if(fi&&uploadTargetId.current) runUploadChecks(fi,uploadTargetId.current); if(uploadRef.current) uploadRef.current.value='' }}/>
      {uploadModal.open&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',backdropFilter:'blur(4px)' }}
          onClick={()=>{if(uploadModal.done)setUploadModal(p=>({...p,open:false}))}}>
          <div style={{ maxWidth:'380px',width:'100%',background:'#fff',borderRadius:'20px',border:'1px solid #E5E5EA',boxShadow:'0 24px 60px rgba(0,0,0,.18)',overflow:'hidden',animation:'fadeUp .25s ease-out' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex',justifyContent:'center',padding:'20px 20px 0' }}>
              {uploadModal.preview&&(
                <div style={{ width:'100px',aspectRatio:'63/88',borderRadius:'10px',overflow:'hidden',border:`1px solid ${uploadModal.done?(uploadModal.success?'#BBF7D0':'#FECACA'):'#E5E5EA'}`,boxShadow:'0 4px 16px rgba(0,0,0,.08)',transition:'border-color .3s' }}>
                  <img src={uploadModal.preview} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                </div>
              )}
            </div>
            <div style={{ padding:'14px 20px' }}>
              <div style={{ fontSize:'14px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)',marginBottom:'12px',textAlign:'center' }}>
                {uploadModal.done?(uploadModal.success?'Illustration validee':'Illustration rejetee'):'Verification en cours...'}
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:'6px' }}>
                {uploadModal.checks.map((c,i)=>(
                  <div key={i} style={{ display:'flex',alignItems:'center',gap:'10px',padding:'7px 10px',borderRadius:'8px',background:c.status==='fail'?'#FEF2F2':c.status==='pass'?'#F0FDF4':'#F5F5F7',border:`1px solid ${c.status==='fail'?'#FECACA':c.status==='pass'?'#BBF7D0':'#E5E5EA'}`,transition:'all .3s' }}>
                    <div style={{ width:'18px',height:'18px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:c.status==='checking'?'#D2D2D7':c.status==='pass'?'#2E9E6A':c.status==='fail'?'#E03020':'#E5E5EA',transition:'all .3s' }}>
                      {c.status==='checking'?<div style={{ width:'10px',height:'10px',border:'2px solid #fff',borderTop:'2px solid transparent',borderRadius:'50%',animation:'spin .6s linear infinite' }}/>
                      :c.status==='pass'?<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                      :c.status==='fail'?<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      :<div style={{ width:'6px',height:'6px',borderRadius:'50%',background:'#C7C7CC' }}/>}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:'11px',fontWeight:600,color:c.status==='fail'?'#991B1B':'#1D1D1F',fontFamily:'var(--font-display)' }}>{c.label}</div>
                      {c.detail&&<div style={{ fontSize:'9px',color:c.status==='fail'?'#DC2626':'#86868B',fontFamily:'var(--font-data)' }}>{c.detail}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {uploadModal.done&&(
              <div style={{ padding:'0 20px 16px',display:'flex',gap:'8px' }}>
                {uploadModal.success?(
                  <button onClick={()=>setUploadModal(p=>({...p,open:false}))} style={{ flex:1,padding:'12px',borderRadius:'10px',background:'#2E9E6A',color:'#fff',border:'none',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'var(--font-display)' }}>Fermer</button>
                ):(
                  <>
                    <button onClick={()=>{setUploadModal(p=>({...p,open:false}));setTimeout(()=>uploadRef.current?.click(),150)}} style={{ flex:1,padding:'12px',borderRadius:'10px',background:'#1D1D1F',color:'#fff',border:'none',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'var(--font-display)' }}>Reessayer</button>
                    <button onClick={()=>setUploadModal(p=>({...p,open:false}))} style={{ padding:'12px 18px',borderRadius:'10px',background:'#F5F5F7',color:'#6E6E73',border:'1px solid #E5E5EA',fontSize:'13px',cursor:'pointer',fontFamily:'var(--font-display)' }}>Annuler</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px' }}
          onClick={()=>setAddSetOpen(false)}>
          <div style={{ background:'#fff',borderRadius:'20px',border:'1px solid #E5E5EA',boxShadow:'0 24px 60px rgba(0,0,0,.15)',padding:'24px',maxWidth:'480px',width:'100%',animation:'fadeUp .25s ease-out' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px' }}>
              <div>
                <div style={{ fontSize:'17px',fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)' }}>Ajouter une série complète</div>
                <div style={{ fontSize:'10px',marginTop:'3px',color:'#AEAEB2',fontWeight:500 }}>Toutes les cartes seront ajoutées en Raw</div>
              </div>
              <button onClick={()=>setAddSetOpen(false)} style={{ width:'28px',height:'28px',borderRadius:'50%',background:'#F0F0F5',border:'none',color:'#86868B',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ marginBottom:'14px' }}>
              <div style={{ fontSize:'10px',fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'6px' }}>Langue</div>
              <div style={{ display:'flex',gap:'6px' }}>
                {([{k:'FR' as const,flag:'\u{1F1EB}\u{1F1F7}',label:'Français'},{k:'EN' as const,flag:'\u{1F1FA}\u{1F1F8}',label:'English'},{k:'JP' as const,flag:'\u{1F1EF}\u{1F1F5}',label:'日本語'}]).map(l=>(
                  <button key={l.k} onClick={()=>{setAddSetLang(l.k);setAddSetCards([]);setAddSetId('');setAddSetName('')}}
                    style={{ flex:1,padding:'10px 8px',borderRadius:'10px',border:`1.5px solid ${addSetLang===l.k?'#1D1D1F':'#E5E5EA'}`,background:addSetLang===l.k?'#1D1D1F':'#fff',color:addSetLang===l.k?'#fff':'#86868B',fontSize:'12px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',transition:'all .15s' }}>
                    <span style={{ fontSize:'16px' }}>{l.flag}</span>{l.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:'14px' }}>
              <div style={{ fontSize:'10px',fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'6px' }}>Série</div>
              <select value={addSetId} onChange={e=>{
                const found=addSetSets.find(x=>x.id===e.target.value)
                if(!found) return
                setAddSetId(found.id)
                setAddSetName(found.name)
                setAddSetLoading(true)
                setAddSetCards([])
                getCardsForSet(addSetLang as 'EN'|'FR'|'JP',found.id).then(cards=>{setAddSetCards(staticToTCGCards(cards,found.id,addSetLang,(l,si,lid)=>getCardImageUrl({lang:l,setId:si,localId:lid})) as any);setAddSetLoading(false)}).catch(()=>setAddSetLoading(false))
              }}
                style={{ width:'100%',appearance:'none' as const,background:'#F5F5F7',borderRadius:'10px',border:'1px solid #E5E5EA',padding:'10px 36px 10px 12px',color:addSetId?'#1D1D1F':'#AEAEB2',fontSize:'13px',fontFamily:'var(--font-display)',outline:'none',cursor:'pointer' }}>
                <option value=''>Sélectionner une série...</option>
                {addSetSets.map(ls=>(
                  <option key={ls.id} value={ls.id} style={{background:'#fff',color:'#1D1D1F'}}>{ls.name}{ls.total?' ('+ls.total+')':''}</option>
                ))}
              </select>
            </div>
            {addSetLoading&&(
              <div style={{ textAlign:'center',padding:'20px 0',color:'#86868B',fontSize:'12px',fontFamily:'var(--font-display)' }}>
                <div style={{ width:'20px',height:'20px',border:'2px solid #E5E5EA',borderTop:'2px solid #1D1D1F',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 8px' }}/>
                Chargement des cartes...
              </div>
            )}
            {addSetCards.length>0&&!addSetLoading&&(()=>{
              const existingNums = new Set(portfolio.filter(c=>c.set===addSetName).map(c=>c.number))
              const alreadyOwned = addSetCards.filter(c=>existingNums.has(c.localId||'')).length
              const toAdd = addSetCards.length - alreadyOwned
              return (
                <div>
                  <div style={{ background:'#F5F5F7',borderRadius:'12px',padding:'14px',marginBottom:'14px' }}>
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px' }}>
                      <span style={{ fontSize:'14px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)' }}>{addSetCards.length} cartes</span>
                      {alreadyOwned>0&&<span style={{ fontSize:'11px',color:'#86868B' }}>dont {alreadyOwned} déjà possédées</span>}
                    </div>
                    <div style={{ height:'6px',borderRadius:'3px',background:'#E8E8ED',overflow:'hidden',marginBottom:'10px' }}>
                      <div style={{ width:addSetCards.length>0?Math.round(alreadyOwned/addSetCards.length*100)+'%':'0%',height:'100%',background:'linear-gradient(90deg,#ff6b35,#ff4433)',borderRadius:'3px',transition:'width .3s' }}/>
                    </div>
                    <div style={{ display:'flex',gap:'16px',fontSize:'11px' }}>
                      {alreadyOwned>0&&<span style={{ color:'#2E9E6A',fontWeight:500 }}>{String.fromCharCode(10003)} {alreadyOwned} conservées</span>}
                      <span style={{ color:'#0C447C',fontWeight:500 }}>+ {toAdd} nouvelles</span>
                    </div>
                  </div>
                  <button onClick={()=>{
                    if(toAdd===0){ showToast('Série déjà complète'); return }
                    const newCards: CardItem[] = addSetCards
                      .filter(c=>!existingNums.has(c.localId||''))
                      .map(c=>({
                        id:'u'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
                        name:c.name, set:addSetName, year:new Date().getFullYear(),
                        number:c.localId||'', rarity:c.rarity||'',
                        type:'fire', lang:addSetLang,
                        condition:'Raw', graded:false,
                        buyPrice:0, curPrice:0, qty:1,
                        image:c.image||undefined,
                        setId:addSetId, setTotal:addSetCards.length,
                      }))
                    setPortfolio(prev=>[...prev,...newCards])
                    setAddSetOpen(false)
                    showToast(toAdd+' cartes ajoutées')
                  }}
                    style={{ width:'100%',padding:'13px',borderRadius:'11px',background:'#1D1D1F',color:'#fff',border:'none',fontSize:'14px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.15)'}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}>
                    {toAdd>0?'Ajouter les '+toAdd+' cartes manquantes':'Série déjà complète'}
                  </button>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── WELCOME ── */}
      {showWelcome&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(7,5,3,.96)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',backdropFilter:'blur(12px)' }}>
          <div style={{ maxWidth:'420px',width:'100%',textAlign:'center',animation:'welcomeIn .5s cubic-bezier(.34,1.2,.64,1)' }}>
            <div style={{ fontSize:'64px',marginBottom:'20px',animation:'burst .6s .2s cubic-bezier(.34,1.4,.64,1) both' }}>📖</div>
            <div style={{ fontSize:'11px',fontWeight:700,color:'rgba(255,107,53,.8)',letterSpacing:'.2em',textTransform:'uppercase',fontFamily:'var(--font-display)',marginBottom:'12px' }}>Bienvenue sur PokéAlpha Terminal</div>
            <h2 style={{ fontSize:'28px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)',letterSpacing:'-1px',lineHeight:1.15,marginBottom:'14px' }}>
              Votre collection mérite<br/>
              <span style={{ background:'linear-gradient(135deg,#FF6B35,#FFD700,#FF6B35)',backgroundSize:'200% 200%',animation:'shimmerG 3s ease infinite',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}>d'être célébrée.</span>
            </h2>
            <p style={{ fontSize:'14px',color:'#48484A',fontFamily:'var(--font-display)',lineHeight:1.7,marginBottom:'28px' }}>
              Ajoutez vos premières cartes et regardez votre binder prendre vie.
              Chaque carte est un souvenir, une victoire, une passion.
            </p>
            <button onClick={()=>setShowWelcome(false)}
              style={{ padding:'14px 36px',borderRadius:'12px',background:'linear-gradient(135deg,#E03020,#FF6B35)',color:'#1D1D1F',border:'none',fontSize:'14px',fontWeight:700,cursor:'pointer',fontFamily:'var(--font-display)',boxShadow:'0 8px 32px rgba(224,48,32,.45)',letterSpacing:'.03em' }}>
              Ouvrir mon binder →
            </button>
          </div>
        </div>
      )}

      {/* ── CELEBRATION ── */}
      {celebSet&&(()=>{
        const confetti = Array.from({length:48},(_,i)=>({
          left:(i*37+13)%100, top:(i*19+5)%100, size:4+(i*3)%10,
          round:i%3!==0, delay:(i*0.08)%2.5, dur:1.8+(i*0.09)%1.5,
          color:['#D97706','#FF6B35','#C855D4','#42A5F5','#4ECCA3','#FF6B8A','#E03020'][i%7],
        }))
        return (
          <div style={{ position:'fixed',inset:0,background:'rgba(7,5,3,.92)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',backdropFilter:'blur(8px)' }}
            onClick={()=>setCelebSet(null)}>
            {/* Confetti */}
            {confetti.map((c,i)=>(
              <div key={i} style={{ position:'absolute',left:`${c.left}%`,top:'-5%',width:`${c.size}px`,height:`${c.size}px`,borderRadius:c.round?'50%':'2px',background:c.color,animation:`confettiF ${c.dur}s ${c.delay}s ease-out forwards`,zIndex:1 }}/>
            ))}
            <div style={{ textAlign:'center',zIndex:2,animation:'welcomeIn .4s cubic-bezier(.34,1.2,.64,1)' }} onClick={e=>e.stopPropagation()}>
              <div style={{ fontSize:'72px',marginBottom:'8px',filter:'drop-shadow(0 0 32px rgba(255,215,0,.6))' }}>🏆</div>
              <div style={{ fontSize:'11px',fontWeight:700,color:'#D97706',letterSpacing:'.25em',textTransform:'uppercase',fontFamily:'var(--font-display)',marginBottom:'10px' }}>Set complété !</div>
              <h2 style={{ fontSize:'32px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)',letterSpacing:'-1px',marginBottom:'8px',lineHeight:1.2 }}>
                {celebSet}
              </h2>
              <p style={{ fontSize:'14px',color:'#6E6E73',fontFamily:'var(--font-display)',marginBottom:'28px' }}>
                Vous avez complété ce set à 100%. Impressionnant.
              </p>
              <button onClick={()=>setCelebSet(null)}
                style={{ padding:'12px 32px',borderRadius:'10px',background:'#EDEDF0',border:'1px solid rgba(29,29,31,.16)',color:'#1D1D1F',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)' }}>
                Continuer la collection
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── SCANNER ── */}
      {scannerOpen&&(()=>{
        const fileRef = { current: null as HTMLInputElement|null }
        const handleScan = async (file: File) => {
          setScannerLoad(true)
          const reader = new FileReader()
          reader.onload = async (e) => {
            const b64 = (e.target?.result as string).split(',')[1]
            setScannerImg(e.target?.result as string)
            try {
              const res = await fetch('https://api.anthropic.com/v1/messages',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({
                  model:'claude-sonnet-4-20250514', max_tokens:500,
                  messages:[{role:'user',content:[
                    {type:'image',source:{type:'base64',media_type:file.type as 'image/jpeg'|'image/png'|'image/webp',data:b64}},
                    {type:'text',text:'Identifie cette carte Pokemon TCG. Reponds UNIQUEMENT en JSON valide sans markdown: {"name":"nom exact","set":"nom du set","lang":"EN ou FR ou JP","type":"fire ou water ou psychic ou dark ou electric ou grass ou normal","year":2023,"rarity":"rarity"}'}
                  ]}]
                })
              })
              const data = await res.json()
              const txt = data.content?.find((x:any)=>x.type==='text')?.text??''
              const clean = txt.replace(/```json|```/g,'').trim()
              const parsed = JSON.parse(clean)
              setAddForm(p=>({...p,
                name:parsed.name??'', set:parsed.set??'',
                lang:(parsed.lang==='JP'?'JP':parsed.lang==='FR'?'FR':'EN') as 'EN'|'JP'|'FR',
                type:parsed.type??'fire', year:parsed.year??new Date().getFullYear(),
                rarity:parsed.rarity??'', setId:'',image:'',setTotal:0,
              }))
              setScannerOpen(false); setScannerImg(null); setScannerLoad(false)
              setAddOpen(true); setNameValidated(true)
              showToast('Carte identifiee — verifiez et ajoutez')
            } catch { setScannerLoad(false); showToast('Identification echouee') }
          }
          reader.readAsDataURL(file)
        }
        return (
          <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px' }}
            onClick={()=>{ if(!scannerLoad){ setScannerOpen(false); setScannerImg(null) } }}>
            <div style={{ maxWidth:'380px',width:'100%',background:'#fff',borderRadius:'20px',border:'1px solid #E5E5EA',boxShadow:'0 24px 60px rgba(0,0,0,.15)',overflow:'hidden',animation:'fadeUp .25s ease-out' }} onClick={e=>e.stopPropagation()}>

              {/* Header */}
              <div style={{ padding:'18px 20px',borderBottom:'1px solid #E5E5EA',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <div>
                  <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <span style={{ fontSize:'16px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)' }}>Scanner une carte</span>
                  </div>
                  <div style={{ fontSize:'11px',color:'#86868B',marginTop:'3px',paddingLeft:'26px' }}>L'IA identifie automatiquement la carte</div>
                </div>
                {!scannerLoad&&(
                  <button onClick={()=>{ setScannerOpen(false); setScannerImg(null) }} style={{ width:'28px',height:'28px',borderRadius:'50%',background:'#F0F0F5',border:'none',color:'#86868B',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s' }}
                    onMouseEnter={e=>{e.currentTarget.style.background='#E5E5EA';e.currentTarget.style.color='#1D1D1F'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='#F0F0F5';e.currentTarget.style.color='#86868B'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                )}
              </div>

              <div style={{ padding:'20px' }}>
                {/* Frame */}
                <div style={{ position:'relative',width:'100%',aspectRatio:'3/4',borderRadius:'16px',border:`2px dashed ${scannerImg?'#2E9E6A':'#D2D2D7'}`,background:'#FAFAFA',overflow:'hidden',marginBottom:'16px',display:'flex',alignItems:'center',justifyContent:'center',cursor:scannerLoad?'default':'pointer',transition:'all .2s' }}
                  onClick={()=>{if(!scannerLoad) fileRef.current?.click()}}
                  onMouseEnter={e=>{if(!scannerImg&&!scannerLoad)e.currentTarget.style.borderColor='#86868B'}}
                  onMouseLeave={e=>{if(!scannerImg&&!scannerLoad)e.currentTarget.style.borderColor='#D2D2D7'}}>
                  {scannerImg ? (
                    <img src={scannerImg} alt="scan" style={{ width:'100%',height:'100%',objectFit:'contain' }}/>
                  ) : (
                    <div style={{ textAlign:'center' }}>
                      <div style={{ width:'48px',height:'48px',borderRadius:'14px',background:'#F0F0F5',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      </div>
                      <div style={{ fontSize:'13px',color:'#48484A',fontFamily:'var(--font-display)',marginBottom:'4px' }}>Photographiez votre carte</div>
                      <div style={{ fontSize:'11px',color:'#AEAEB2' }}>Cliquez ou glissez une photo</div>
                    </div>
                  )}
                  {/* Corner marks */}
                  {!scannerImg&&!scannerLoad&&(
                    <>
                      <div style={{ position:'absolute',top:'8px',left:'8px',width:'20px',height:'20px',borderTop:'2px solid #1D1D1F',borderLeft:'2px solid #1D1D1F',borderRadius:'2px 0 0 0' }}/>
                      <div style={{ position:'absolute',top:'8px',right:'8px',width:'20px',height:'20px',borderTop:'2px solid #1D1D1F',borderRight:'2px solid #1D1D1F',borderRadius:'0 2px 0 0' }}/>
                      <div style={{ position:'absolute',bottom:'8px',left:'8px',width:'20px',height:'20px',borderBottom:'2px solid #1D1D1F',borderLeft:'2px solid #1D1D1F',borderRadius:'0 0 0 2px' }}/>
                      <div style={{ position:'absolute',bottom:'8px',right:'8px',width:'20px',height:'20px',borderBottom:'2px solid #1D1D1F',borderRight:'2px solid #1D1D1F',borderRadius:'0 0 2px 0' }}/>
                    </>
                  )}
                  {/* Loading overlay */}
                  {scannerLoad&&(
                    <div style={{ position:'absolute',inset:0,background:'rgba(255,255,255,.9)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'10px' }}>
                      <div style={{ width:'24px',height:'24px',border:'2px solid #E5E5EA',borderTop:'2px solid #1D1D1F',borderRadius:'50%',animation:'spin .8s linear infinite' }}/>
                      <div style={{ fontSize:'12px',color:'#1D1D1F',fontWeight:600,fontFamily:'var(--font-display)' }}>Identification en cours</div>
                      <div style={{ fontSize:'10px',color:'#86868B' }}>Analyse par IA...</div>
                    </div>
                  )}
                </div>

                <input type="file" accept="image/*" capture="environment" style={{ display:'none' }}
                  ref={el=>{ fileRef.current=el }}
                  onChange={e=>{ const f=e.target.files?.[0]; if(f) handleScan(f) }}/>

                {/* Buttons */}
                <div style={{ display:'flex',gap:'8px' }}>
                  <button disabled={scannerLoad}
                    onClick={()=>fileRef.current?.click()}
                    style={{ flex:1,padding:'13px',borderRadius:'12px',background:scannerLoad?'#F0F0F5':'#1D1D1F',border:'none',color:scannerLoad?'#AEAEB2':'#fff',fontSize:'13px',fontWeight:700,cursor:scannerLoad?'default':'pointer',fontFamily:'var(--font-display)',transition:'all .15s',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px' }}
                    onMouseEnter={e=>{if(!scannerLoad)e.currentTarget.style.background='#333'}}
                    onMouseLeave={e=>{if(!scannerLoad)e.currentTarget.style.background='#1D1D1F'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    {scannerLoad ? 'Analyse...' : scannerImg ? 'Nouvelle photo' : 'Prendre une photo'}
                  </button>
                  {scannerImg&&!scannerLoad&&(
                    <button onClick={()=>setScannerImg(null)}
                      style={{ padding:'13px 18px',borderRadius:'12px',background:'#F5F5F7',border:'1px solid #E5E5EA',color:'#48484A',fontSize:'13px',cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#EDEDF0'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#F5F5F7'}}>
                      Effacer
                    </button>
                  )}
                </div>

                {/* Info */}
                <div style={{ display:'flex',alignItems:'center',gap:'6px',marginTop:'12px',padding:'8px 10px',borderRadius:'8px',background:'#F5F5F7' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  <span style={{ fontSize:'10px',color:'#86868B',fontFamily:'var(--font-display)',lineHeight:1.4 }}>Sur mobile, utilisez la camera. La carte sera identifiee par l'IA et pre-remplie dans le formulaire d'ajout.</span>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      <ImportPortfolioModal
        isOpen={importOpen}
        onClose={()=>setImportOpen(false)}
        onImport={(imported)=>{
          const mapped = imported.map(c=>({
            id: c.id,
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
          setPortfolio(prev=>[...prev, ...mapped])
          setImportOpen(false)
          showToast(imported.length+' cartes importées')
        }}
      />
    </div>
    </>
  )
}