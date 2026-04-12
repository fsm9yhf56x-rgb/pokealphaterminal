'use client'

import { getCardImageUrl } from '@/lib/cardImages'
import { supabase } from '@/lib/supabase'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { fetchSets, fetchAllCards, fetchCardDetail, type TCGCard, type TCGCardFull } from '@/lib/tcgApi'
import { getSets, getCards, type StaticSet, type StaticCard } from '@/lib/cardDb'

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
  'Original (WotC)':'#854F0B', 'EX':'#993C1D', 'DP / Platinum':'#0F6E56',
  'Black & White':'#444441', 'XY':'#185FA5', 'Sun & Moon':'#BA7517',
  'Sword & Shield':'#534AB7', 'Scarlet & Violet':'#A32D2D', 'Autre':'#5F5E5A',
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

const ERA_ORDER = ['Original (WotC)','EX','DP / Platinum','Black & White','XY','Sun & Moon','Sword & Shield','Scarlet & Violet','Autre']

const ERA_PREFIX: [string, string][] = [
  ['base','Original (WotC)'],['jungle','Original (WotC)'],['fossil','Original (WotC)'],
  ['teamrocket','Original (WotC)'],['gym','Original (WotC)'],['neo','Original (WotC)'],
  ['si','Original (WotC)'],['lc','Original (WotC)'],['ecard','Original (WotC)'],
  ['expedition','Original (WotC)'],['aquapolis','Original (WotC)'],['skyridge','Original (WotC)'],
  ['ex','EX'],['pop','EX'],
  ['dp','DP / Platinum'],['pl','DP / Platinum'],['pt','DP / Platinum'],['hgss','DP / Platinum'],
  ['bw','Black & White'],['dv','Black & White'],
  ['xy','XY'],['g1','XY'],['dc','XY'],
  ['sm','Sun & Moon'],['det','Sun & Moon'],['tg','Sun & Moon'],
  ['swsh','Sword & Shield'],['cel','Sword & Shield'],['pgo','Sword & Shield'],
  ['sv','Scarlet & Violet'],
]

function setIdToEra(setId:string): string {
  const low = setId.toLowerCase()
  for (const [prefix, era] of ERA_PREFIX) {
    if (low.startsWith(prefix)) return era
  }
  return 'Autre'
}

function yearToEra(y:number): string {
  if (!y)      return 'Autre'
  if (y<=2003) return 'Original (WotC)'
  if (y<=2006) return 'EX'
  if (y<=2010) return 'DP / Platinum'
  if (y<=2013) return 'Black & White'
  if (y<=2016) return 'XY'
  if (y<=2019) return 'Sun & Moon'
  if (y<=2022) return 'Sword & Shield'
  return 'Scarlet & Violet'
}

type Lang     = 'EN'|'FR'|'JP'
type SortKey  = 'set'|'name'
type ViewMode = 'grid'|'list'

interface EnrichedCard extends TCGCard {
  setId:string; setName:string; year:number; era:string; enName?:string; enImage?:string
}

const CHUNK_SIZE = 60
const LC_MAP: Record<Lang,string> = { EN:'en', FR:'fr', JP:'ja' }

function cardImageUrl(card: EnrichedCard, lang: Lang): string|null {
  if (card.image) return card.image
  if (card.setId && card.localId) return getCardImageUrl({ lang, setId: card.setId, localId: card.localId })
  if (lang === 'JP' && card.enImage) return card.enImage
  return null
}

export function Encyclopedie() {
  const router = useRouter()

  const [lang,       setLang]        = useState<Lang>('FR')
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

  const addToPortfolio = async (card: EnrichedCard) => {
    const newCard: PortfolioCard = {
      id: 'enc_'+Date.now()+'-'+Math.random().toString(36).slice(2,6),
      name: card.name, set: card.setName, setId: card.setId,
      number: card.localId, rarity: card.rarity||'',
      type: 'fire', lang: lang, condition: 'Raw', graded: false,
      buyPrice: 0, curPrice: 0, qty: 1, year: card.year,
      image: card.image || card.enImage || '',
      setTotal: allCards.filter(c=>c.setId===card.setId).length,
    }
    const updated = [...portfolio, newCard]
    setPortfolioLocal(updated)
    await pkaDbSet('portfolio', updated)
    try { const slim = updated.map(c => c.image&&c.image.startsWith('data:')?{...c,image:''}:c); localStorage.setItem('pka_portfolio', JSON.stringify(slim)) } catch {}
    setToast(card.name + ' ajouté')
    setTimeout(() => setToast(''), 2000)
  }

  const [cardSize,   setCardSize]    = useState<'S'|'M'|'L'>('M')
  const [lightbox,   setLightbox]    = useState<EnrichedCard|null>(null)

  // ── Custom card images (user uploads) ──
  const [customImgs, setCustomImgs] = useState<Record<string,string>>({})
  const [setLogos, setSetLogos] = useState<Record<string,string>>({})
  const [setBlocks, setSetBlocks] = useState<Record<string,string>>({})
  const uploadRef = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<string|null>(null)
  const [uploadModal, setUploadModal] = useState<{
    open:boolean; preview:string|null;
    checks:{label:string;status:'pending'|'checking'|'pass'|'fail';detail?:string}[];
    done:boolean; success:boolean
  }>({ open:false, preview:null, checks:[], done:false, success:false })

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pka_custom_imgs')
      if (raw) setCustomImgs(JSON.parse(raw))
    } catch {}
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
  }, [lang])

  const saveCustomImg = useCallback((cardKey: string, b64: string) => {
    setCustomImgs(prev => {
      const next = { ...prev, [cardKey]: b64 }
      try { localStorage.setItem('pka_custom_imgs', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const customImgKey = (card: EnrichedCard) => `${card.setId}-${card.localId}-${lang}`

  const handleUploadClick = (card: EnrichedCard, e: React.MouseEvent) => {
    e.stopPropagation()
    setUploadTarget(customImgKey(card))
    setTimeout(() => uploadRef.current?.click(), 50)
  }

  const runUploadChecks = useCallback(async (file: File) => {
    if (!uploadTarget) return
    const preview = URL.createObjectURL(file)
    const checks: {label:string;status:'pending'|'checking'|'pass'|'fail';detail?:string}[] = [
      { label:'Format du fichier', status:'pending' },
      { label:'Taille du fichier', status:'pending' },
      { label:'Dimensions', status:'pending' },
      { label:'Orientation portrait', status:'pending' },
      { label:'Ratio carte standard', status:'pending' },
      { label:'Résolution minimale', status:'pending' },
      { label:'Cadrage des bords', status:'pending' },
      { label:'Contenu illustré', status:'pending' },
    ]
    setUploadModal({ open:true, preview, checks:[...checks], done:false, success:false })
    const delay = (ms:number) => new Promise(r=>setTimeout(r,ms))
    const upd = (i:number, st:'checking'|'pass'|'fail', detail?:string) => {
      checks[i] = { ...checks[i], status:st, detail }
      setUploadModal(p=>({ ...p, checks:[...checks] }))
    }
    let ok = true
    // 1. Format
    upd(0,'checking'); await delay(400)
    if(['image/jpeg','image/png','image/webp'].includes(file.type)){
      upd(0,'pass',file.type.replace('image/','').toUpperCase())
    } else { upd(0,'fail','Format: '+file.type); ok=false }
    // 2. Taille
    upd(1,'checking'); await delay(350)
    const mb = file.size/1024/1024
    if(mb<=5){ upd(1,'pass',mb.toFixed(1)+' Mo') } else { upd(1,'fail',mb.toFixed(1)+' Mo (max 5)'); ok=false }
    // 3-7. Image checks
    upd(2,'checking')
    const img = new Image()
    try {
      await new Promise<void>((res,rej)=>{ img.onload=()=>res(); img.onerror=()=>rej(); img.src=preview })
      await delay(400)
      if(img.width>=250&&img.height>=350){ upd(2,'pass',img.width+'\u00d7'+img.height+' px') }
      else { upd(2,'fail',img.width+'\u00d7'+img.height+' px (min 250\u00d7350)'); ok=false }
      upd(3,'checking'); await delay(300)
      if(img.height>=img.width){ upd(3,'pass','Portrait') }
      else { upd(3,'fail','Paysage detect\u00e9'); ok=false }
      upd(4,'checking'); await delay(350)
      const ratio = img.width / img.height
      if(ratio >= 0.55 && ratio <= 0.85){ upd(4,'pass','Ratio ' + ratio.toFixed(3)) }
      else { upd(4,'fail','Ratio ' + ratio.toFixed(3) + ' (attendu 0.55-0.85)'); ok=false }
      upd(5,'checking'); await delay(350)
      if(img.width >= 300 && img.height >= 420){ upd(5,'pass',img.width+'x'+img.height+' px') }
      else { upd(5,'fail',img.width+'x'+img.height+' px (min 300x420)'); ok=false }
      upd(6,'checking'); await delay(400)
      try {
        const cv = document.createElement('canvas')
        cv.width = img.width; cv.height = img.height
        const ctx = cv.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const bw = 3
        const strips = [
          ctx.getImageData(0,0,img.width,bw),
          ctx.getImageData(0,img.height-bw,img.width,bw),
          ctx.getImageData(0,0,bw,img.height),
          ctx.getImageData(img.width-bw,0,bw,img.height),
        ]
        const calcVar = (data: Uint8ClampedArray) => {
          let sR=0,sG=0,sB=0; const n=data.length/4
          for(let i=0;i<data.length;i+=4){ sR+=data[i]; sG+=data[i+1]; sB+=data[i+2] }
          const aR=sR/n,aG=sG/n,aB=sB/n; let v=0
          for(let i=0;i<data.length;i+=4){ v+=Math.pow(data[i]-aR,2)+Math.pow(data[i+1]-aG,2)+Math.pow(data[i+2]-aB,2) }
          return Math.sqrt(v/(n*3))
        }
        const avgVar = strips.map(s=>calcVar(s.data)).reduce((a,b)=>a+b,0)/4
        if(avgVar<45){ upd(6,'pass','Bords uniformes (var: '+avgVar.toFixed(0)+')') }
        else { upd(6,'fail','Bords irr\u00e9guliers (var: '+avgVar.toFixed(0)+')'); ok=false }
      } catch { upd(6,'fail','Analyse impossible'); ok=false }
      // 8. AI content verification — is this a Pokemon card illustration?
      upd(7,'checking')
      try {
        const cv2 = document.createElement('canvas')
        const maxDim = 256
        const scale = Math.min(maxDim/img.width, maxDim/img.height, 1)
        cv2.width = Math.round(img.width*scale); cv2.height = Math.round(img.height*scale)
        const ctx2 = cv2.getContext('2d')!
        ctx2.drawImage(img, 0, 0, cv2.width, cv2.height)
        const smallB64 = cv2.toDataURL('image/jpeg', 0.7).split(',')[1]
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            model:'claude-sonnet-4-20250514', max_tokens:100,
            messages:[{role:'user',content:[
              {type:'image',source:{type:'base64',media_type:'image/jpeg',data:smallB64}},
              {type:'text',text:'Is this image a Pokemon TCG card illustration or a scan/photo of a Pokemon card? Answer ONLY with JSON: {"isCard":true} or {"isCard":false,"reason":"brief reason"}'}
            ]}]
          })
        })
        const aiData = await aiRes.json()
        const aiTxt = aiData.content?.find((x:any)=>x.type==='text')?.text??''
        const aiClean = aiTxt.replace(/```json|```/g,'').trim()
        const aiParsed = JSON.parse(aiClean)
        if(aiParsed.isCard){
          upd(7,'pass','Carte Pok\u00e9mon d\u00e9tect\u00e9e')
        } else {
          upd(7,'fail',aiParsed.reason||'Pas une illustration de carte')
          ok=false
        }
      } catch {
        // Fallback: saturation check if AI fails
        try {
          const cv3 = document.createElement('canvas')
          cv3.width=100;cv3.height=100
          const ctx3=cv3.getContext('2d')!
          ctx3.drawImage(img,0,0,100,100)
          const px=ctx3.getImageData(0,0,100,100).data
          let satSum=0;const n3=px.length/4
          for(let i=0;i<px.length;i+=4){
            const mx=Math.max(px[i],px[i+1],px[i+2]),mn=Math.min(px[i],px[i+1],px[i+2])
            const l=(mx+mn)/2
            satSum+=mx===mn?0:(mx-mn)/(l>127?(510-mx-mn):(mx+mn))
          }
          if(satSum/n3>0.08) upd(7,'pass','Contenu color\u00e9')
          else { upd(7,'fail','Image sans couleur'); ok=false }
        } catch { upd(7,'fail','Analyse impossible'); ok=false }
      }
    } catch { upd(2,'fail','Lecture impossible'); upd(3,'fail','\u2014'); upd(4,'fail','\u2014'); upd(5,'fail','\u2014'); upd(6,'fail','\u2014'); ok=false }
    await delay(300)
    if(ok){
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        saveCustomImg(uploadTarget, dataUrl)
        setUploadModal(p=>({...p,done:true,success:true}))
      }
      reader.readAsDataURL(file)
    } else { setUploadModal(p=>({...p,done:true,success:false})) }
  }, [uploadTarget, saveCustomImg])

  const handleUploadFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadTarget) return
    e.target.value = ''
    runUploadChecks(file)
  }, [uploadTarget, runUploadChecks])


  const [selId,      setSelId]       = useState<string|null>(null)
  const [detail,     setDetail]      = useState<TCGCardFull|null>(null)
  const [detLoading, setDetLoading]  = useState(false)
  const [enDetail,   setEnDetail]    = useState<TCGCardFull|null>(null)

  useEffect(() => {
    setLoading(true); setLoadErr(false); setLoadMsg('Chargement...')
    setAllCards([]); setFilSet('all'); setFilEra('all')
    setPage(0); setSelId(null); setDetail(null); setEnDetail(null)

    // JP: charger depuis notre BDD Supabase (22k+ cartes)
    const loadFromSupabase = async (): Promise<{sets: {id:string;name:string;releaseDate?:string|null}[]; cards: EnrichedCard[]}|null> => {
      try {
        // Charger les sets JP
        const { data: setsData } = await supabase.from('tcg_sets').select('*').eq('lang', 'JP').order('id')
        if (!setsData || setsData.length === 0) return null

        // Charger les cartes JP par batch
        let allDbCards: any[] = []
        let from = 0
        const batchSize = 1000
        while (true) {
          const { data } = await supabase.from('tcg_cards').select('*').eq('lang', 'JP').range(from, from + batchSize - 1)
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
          const era = setIdToEra(cleanSetId) !== 'Autre' ? setIdToEra(cleanSetId) : yearToEra(year)
          return {
            id: c.id,
            localId: c.local_id || '',
            name: c.name || '',
            image: c.image_local || getCardImageUrl({ lang: 'JP', setId: cleanSetId, localId: c.local_id }),
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
          const era = setIdToEra(sid) !== 'Autre' ? setIdToEra(sid) : yearToEra(year)
          ;(cards as any[]).forEach(c => {
            const apiLang = lang === 'JP' ? 'ja' : lang === 'EN' ? 'en' : 'fr'
            enriched.push({
              id: sid+'-'+c.lid, localId: c.lid, name: c.n,
              image: c.img || getCardImageUrl({ lang: lang as string, setId: sid, localId: c.lid }),
              rarity: c.r||'',
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
    const map = new Map<string, {name:string; sets: {id:string;name:string;count:number}[]; total:number}>()
    allCards.forEach(c => {
      if (!map.has(c.era)) map.set(c.era, { name:c.era, sets:[], total:0 })
      const b = map.get(c.era)!
      b.total++
      if (!b.sets.find(st=>st.id===c.setId)) b.sets.push({ id:c.setId, name:c.setName, count:0 })
      b.sets.find(st=>st.id===c.setId)!.count++
    })
    return [...map.entries()].sort((a,b)=>ERA_ORDER.indexOf(a[0])-ERA_ORDER.indexOf(b[0])).map(([,v])=>v)
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

  const filtered = useMemo(() => {
    let r = allCards
    if (filEra!=='all') r = r.filter(c=>c.era===filEra)
    if (filSet!=='all') r = r.filter(c=>c.setId===filSet)
    if (filRarity!=='all') r = r.filter(c=>c.rarity===filRarity)
    if (search) {
      const q=search.toLowerCase()
      r = r.filter(c=>c.name.toLowerCase().includes(q)||c.setName.toLowerCase().includes(q)||c.localId===q)
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
  const hasMore = visibleCount < filtered.length

  const handleCardClick = useCallback(async (id:string) => {
    if (selId===id) { setSelId(null); setDetail(null); setEnDetail(null); return }
    setSelId(id); setDetail(null); setEnDetail(null); setDetLoading(true)
    const d = await fetchCardDetail(lang, id)
    setDetail(d); setDetLoading(false)
    if (lang==='JP') fetchCardDetail('EN', id).then(d=>{ if(d) setEnDetail(d) }).catch(()=>{})
  }, [selId, lang])

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

        .enc-card {
          transition: transform .22s cubic-bezier(.34,1.4,.64,1), box-shadow .22s ease, border-color .18s ease;
          border-radius: 12px; overflow: hidden; cursor: pointer; position: relative;
        }
        .enc-card { transition:transform .2s ease, box-shadow .2s ease !important; }
        .enc-card:hover { transform:translateY(-4px) !important; box-shadow:0 12px 32px rgba(0,0,0,.08) !important; border-color:#D2D2D7 !important; }
        .enc-card:hover .card-img { transform:scale(1.03); }
        .enc-card .card-img { transition:transform .25s ease; }
        .enc-card::after {
          content:''; position:absolute; inset:0; border-radius:12px; pointer-events:none;
          background: linear-gradient(115deg, rgba(255,255,255,0) 40%, rgba(255,255,255,.18) 50%, rgba(255,255,255,0) 60%);
          opacity: 0; transition: opacity .25s;
        }
        .enc-card:hover { transform: translateY(-5px) scale(1.02); box-shadow: 0 12px 32px rgba(0,0,0,.13) !important; }
        .enc-card:hover .zoom-btn { opacity: 1 !important; }
        .enc-card:hover::after { opacity: 1; }
        .enc-card:hover .card-img { transform: scale(1.06); }
        .enc-card.sel { animation: selPulse 2s ease-in-out infinite; border-color: #111 !important; }
        .enc-card.sel::before {
          content:''; position:absolute; inset:0; border-radius:12px; pointer-events:none; z-index:1;
          background: linear-gradient(135deg,rgba(255,220,100,.13),rgba(160,100,255,.1),rgba(100,200,255,.12));
          background-size:300% 300%; animation: holoMove 4s ease infinite;
        }
        .card-img { transition: transform .35s cubic-bezier(.34,1.2,.64,1); will-change:transform; }
        .card-img-loaded { animation: imgReveal .3s ease-out; }

        .enc-card .card-name {
          transition: color .15s;
        }
        .enc-card:hover .card-name { color: #000 !important; }

        .srt { padding:5px 10px; border-radius:6px; border:none; background:transparent; color:#666; font-size:11px; font-weight:500; cursor:pointer; transition:all .12s; font-family:var(--font-display); }
        .srt:hover { background:#EBEBEB; }
        .srt.on { background:#111 !important; color:#fff !important; }
        .rh { transition: background .12s; cursor:pointer; }
        .rh:hover { background:#F7F7F7 !important; }
        .rh:hover .rh-name { font-weight:600 !important; }

        .shimmer { background:linear-gradient(90deg,#F2F2F2 25%,#E8E8E8 50%,#F2F2F2 75%); background-size:800px 100%; animation:shimmer 1.4s infinite; }

        .pgbtn { padding:6px 12px; border-radius:7px; border:1px solid #E8E8E8; background:#fff; color:#555; font-size:12px; cursor:pointer; font-family:var(--font-display); transition:all .12s; }
        .pgbtn:disabled { color:#DDD; cursor:default; border-color:#F0F0F0; }
        .pgbtn:not(:disabled):hover { background:#F5F5F5; transform:scale(1.04); }

        .fsel { height:34px; padding:0 10px; border:1px solid #EBEBEB; border-radius:7px; font-size:12px; outline:none; background:#fff; cursor:pointer; font-family:var(--font-display); color:#555; transition:border-color .15s; }
        .fsel:focus, .fsel:hover { border-color:#BBBBBB; }

        .lang-btn { transition: all .2s cubic-bezier(.34,1.4,.64,1) !important; }
        .lang-btn:active { animation: langBounce .35s ease-out; }

        .detail-panel { animation: panelIn .28s cubic-bezier(.34,1.2,.64,1); }
        .attack-row { transition: background .12s; border-radius:8px; }
        .attack-row:hover { background:#F0F0F0 !important; }

        .add-btn { transition: all .18s cubic-bezier(.34,1.4,.64,1) !important; }
        .add-btn:hover { transform: translateY(-1px) scale(1.02) !important; box-shadow:0 4px 14px rgba(0,0,0,.18) !important; }
        .add-btn:active { transform: scale(.97) !important; }
      `}</style>

      <div style={{ animation:'fadeIn .25s ease-out', width:'100%', display:'flex', gap:'20px', alignItems:'flex-start' }}>

        {/* ── MAIN ── */}
        <div style={{ flex:1, minWidth:0 }}>

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
                  <span>{l==='EN'?'English':l==='FR'?'Français':'日本語'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search + sort + view */}
          {/* Series populaires */}
          {!loading && filSet==='all' && browseMode==='all' && (
            <div style={{ display:'flex', gap:'6px', marginBottom:'12px', overflowX:'auto' as const, paddingBottom:'4px', scrollbarWidth:'none' as any }}>
              {['sv03.5','base1','swsh12.5','sv04','sv01','cel25','sv08','sm12','swsh8','sv06'].filter(sid=>allCards.some(c=>c.setId===sid)).map(sid=>{
                const nm = allCards.find(c=>c.setId===sid)?.setName||sid
                const ct = allCards.filter(c=>c.setId===sid).length
                return (
                  <button key={sid} onClick={()=>{setFilSet(sid);setFilEra('all');setPage(0)}}
                    style={{ flexShrink:0, padding:'5px 12px', borderRadius:'99px', border:'1px solid #E5E5EA', background:'#fff', color:'#48484A', fontSize:'11px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .12s', whiteSpace:'nowrap' as const, display:'flex', alignItems:'center', gap:'4px' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='#1D1D1F';e.currentTarget.style.background='#1D1D1F';e.currentTarget.style.color='#fff'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='#E5E5EA';e.currentTarget.style.background='#fff';e.currentTarget.style.color='#48484A'}}>
                    {setLogos[sid]&&<img src={setLogos[sid]} alt="" style={{ height:'14px', maxWidth:'50px', objectFit:'contain' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                    {nm} <span style={{ opacity:.5 }}>{(()=>{ const ow=allCards.filter(c=>c.setId===sid&&isOwned(c)).length; return ow>0?<><span style={{ color:'#2E9E6A', fontWeight:700 }}>{ow}</span>/{ct}</>:ct })()}</span>
                  </button>
                )
              })}
            </div>
          )}

          <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:1, minWidth:'200px', zIndex:20 }}>
              <span style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)', color:'#CCC', fontSize:'15px', pointerEvents:'none' }}>{String.fromCharCode(8981)}</span>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                onFocus={()=>setSearchFocus(true)} onBlur={()=>setTimeout(()=>setSearchFocus(false),200)}
                placeholder={lang==='JP' ? 'Nom de la carte (japonais)...' : 'Rechercher une carte, un set...'}
                style={{ width:'100%', height:'38px', padding:'0 32px', border:'1px solid '+(searchFocus&&search.length>=2?'#1D1D1F':'#EBEBEB'), borderRadius:searchFocus&&searchSuggs.length>0?'9px 9px 0 0':'9px', fontSize:'13px', color:'#111', outline:'none', background:'#fff', boxSizing:'border-box' as const, fontFamily:'var(--font-sans)', transition:'border-color .15s' }}/>
              {search && (
                <button onClick={()=>setSearch('')} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#CCC', cursor:'pointer', fontSize:'16px', padding:0, lineHeight:1, zIndex:2 }}>{String.fromCharCode(215)}</button>
              )}
              {searchFocus && searchSuggs.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #1D1D1F', borderTop:'1px solid #EBEBEB', borderRadius:'0 0 9px 9px', boxShadow:'0 8px 24px rgba(0,0,0,.08)', maxHeight:'340px', overflowY:'auto' as const }}>
                  {searchSuggs.map(card => {
                    const owned = isOwned(card)
                    const cimg = card.image || (card.setId && card.localId ? getCardImageUrl({ lang: lang, setId: card.setId, localId: card.localId }) : null)
                    return (
                      <div key={card.id}
                        onMouseDown={e=>{e.preventDefault();handleCardClick(card.id);setSearchFocus(false)}}
                        style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid #F5F5F5', transition:'background .1s' }}
                        onMouseEnter={e=>{e.currentTarget.style.background='#F5F5F7'}}
                        onMouseLeave={e=>{e.currentTarget.style.background=''}}>
                        <div style={{ width:'32px', height:'44px', borderRadius:'4px', overflow:'hidden', background:'#F5F5F5', flexShrink:0 }}>
                          {cimg && <img src={cimg} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
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
            <div style={{ display:'flex', gap:'2px', background:'#F5F5F5', borderRadius:'9px', padding:'3px', flexShrink:0 }}>
              {(['grid','list'] as ViewMode[]).map(v=>(
                <button key={v} onClick={()=>setView(v)} style={{ width:'34px', height:'32px', borderRadius:'7px', border:'none', background:view===v?'#111':'transparent', color:view===v?'#fff':'#888', fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .12s' }}>
                  {v==='grid'?'⊞':'☰'}
                </button>
              ))}
            </div>
            {view==='grid' && (
              <div style={{ display:'flex', gap:'2px', background:'#F5F5F5', borderRadius:'9px', padding:'3px', flexShrink:0 }}>
                {(['S','M','L'] as const).map(sz=>(
                  <button key={sz} onClick={()=>setCardSize(sz)}
                    style={{ width:'30px', height:'32px', borderRadius:'7px', border:'none', background:cardSize===sz?'#111':'transparent', color:cardSize===sz?'#fff':'#888', fontSize:'10px', fontWeight:700, cursor:'pointer', transition:'all .12s', fontFamily:'var(--font-display)', letterSpacing:'.05em' }}>
                    {sz}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'18px', flexWrap:'wrap', alignItems:'center', position:'sticky' as const, top:0, zIndex:30, background:'rgba(255,255,255,.92)', backdropFilter:'blur(8px)', padding:'10px 0', marginLeft:'-2px', marginRight:'-2px', paddingLeft:'2px', paddingRight:'2px' }}>
            <select className="fsel" value={filEra} style={{ background:filEra!=='all'?'#FFF5F0':'', borderColor:filEra!=='all'?'#FFD0C0':'', color:filEra!=='all'?'#C84B00':'#AAA' }} onChange={e=>setFilEra(e.target.value)}>
              <option value="all">Tous les blocs</option>
              {eras.map(e=><option key={e} value={e}>{e}</option>)}
            </select>

            <select className="fsel" value={filSet} onChange={e=>setFilSet(e.target.value)} disabled={loading}
              style={{ maxWidth:'220px', color:filSet==='all'?'#AAA':'#111' }}>
              <option value="all">Toutes les séries{sets.length>0?` (${sets.length})`:''}</option>
              {sets.map(s=><option key={s.id} value={s.id}>{s.name} ({s.count})</option>)}
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
              <button onClick={()=>{setBrowseMode('all');setSelBloc(null);setFilSet('all');setFilEra('all');setPage(0)}} style={{ padding:'6px 14px', borderRadius:'99px', border:'1px solid '+(browseMode==='all'?'#1D1D1F':'#E5E5EA'), background:browseMode==='all'?'#1D1D1F':'#fff', color:browseMode==='all'?'#fff':'#86868B', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>Toutes les cartes</button>
              <button onClick={()=>{setBrowseMode('bloc');setSelBloc(null);setFilSet('all');setPage(0)}} style={{ padding:'6px 14px', borderRadius:'99px', border:'1px solid '+(browseMode==='bloc'?'#1D1D1F':'#E5E5EA'), background:browseMode==='bloc'?'#1D1D1F':'#fff', color:browseMode==='bloc'?'#fff':'#86868B', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>Par blocs</button>
            </div>
          )}
          {browseMode==='bloc'&&!selBloc&&!loading&&(
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'12px', marginBottom:'20px' }}>
              {blocs.map(b=>(
                <div key={b.name} onClick={()=>{setSelBloc(b.name);setFilEra(b.name);setPage(0)}} style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'12px', padding:'16px', cursor:'pointer', transition:'all .15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#1D1D1F';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.06)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#EBEBEB';e.currentTarget.style.boxShadow=''}}>
                  {(()=>{ const logoSid = b.sets.find(st=>setLogos[st.id])?.id; return logoSid ? <img src={setLogos[logoSid]} alt="" style={{ height:'28px', maxWidth:'140px', objectFit:'contain', marginBottom:'6px' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/> : null })()}
                  <div style={{ fontSize:'15px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)', marginBottom:'4px' }}>{b.name}</div>
                  <div style={{ fontSize:'11px', color:'#86868B' }}>{b.sets.length} série{b.sets.length>1?'s':''} · {b.total.toLocaleString()} cartes</div>
                  <div style={{ display:'flex', gap:'3px', marginTop:'10px', marginBottom:'8px' }}>
                    {(()=>{
                      const preview = allCards.filter(c=>c.era===b.name&&c.image).slice(0,5)
                      return preview.map(c=>{
                        const imgUrl = cardImageUrl(c, lang)
                        return imgUrl ? <img key={c.id} src={imgUrl.includes('.')?imgUrl:imgUrl+'/low.webp'} alt="" style={{ height:'42px', width:'30px', objectFit:'cover', borderRadius:'4px', border:'1px solid #EBEBEB' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/> : null
                      })
                    })()}
                  </div>
                  <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' as const }}>
                    {b.sets.slice(0,4).map(st=>(<span key={st.id} style={{ fontSize:'9px', color:'#AEAEB2', background:'#F5F5F7', padding:'2px 6px', borderRadius:'4px' }}>{st.name}</span>))}
                    {b.sets.length>4&&<span style={{ fontSize:'9px', color:'#AEAEB2', padding:'2px 4px' }}>+{b.sets.length-4}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {browseMode==='bloc'&&selBloc&&!loading&&(
            <div style={{ marginBottom:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                <button onClick={()=>{setSelBloc(null);setFilEra('all');setFilSet('all');setPage(0)}} style={{ background:'#F5F5F7', border:'none', borderRadius:'8px', padding:'6px 10px', cursor:'pointer', fontSize:'12px', color:'#48484A', fontFamily:'var(--font-display)', display:'flex', alignItems:'center', gap:'4px' }}>{String.fromCharCode(8249)} Blocs</button>
                {(()=>{ const logoSid = blocs.find(b=>b.name===selBloc)?.sets.find(st=>setLogos[st.id])?.id; return logoSid ? <img src={setLogos[logoSid]} alt="" style={{ height:'24px', maxWidth:'120px', objectFit:'contain' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/> : null })()}
                <span style={{ fontSize:'17px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)' }}>{selBloc}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'8px', marginBottom:'16px' }}>
                <div onClick={()=>{setFilSet('all');setPage(0)}} style={{ padding:'10px 14px', borderRadius:'10px', border:'1px solid '+(filSet==='all'?'#1D1D1F':'#E5E5EA'), background:filSet==='all'?'#1D1D1F':'#fff', color:filSet==='all'?'#fff':'#48484A', fontSize:'12px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)' }}>Toutes ({blocs.find(b=>b.name===selBloc)?.total.toLocaleString()})</div>
                {blocs.find(b=>b.name===selBloc)?.sets.map(st=>(
                  <div key={st.id} onClick={()=>{setFilSet(st.id);setPage(0)}}
                    className='rh'
                    style={{ padding:'10px 14px', borderRadius:'10px', border:'1px solid '+(filSet===st.id?'#1D1D1F':'#E5E5EA'), background:filSet===st.id?'#1D1D1F':'#fff', color:filSet===st.id?'#fff':'#48484A', fontSize:'12px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .15s', display:'flex', alignItems:'center', gap:'8px' }}
                    onMouseEnter={e=>{if(filSet!==st.id){e.currentTarget.style.borderColor='#1D1D1F';e.currentTarget.style.background='#F5F5F7';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.06)'}}}
                    onMouseLeave={e=>{if(filSet!==st.id){e.currentTarget.style.borderColor='#E5E5EA';e.currentTarget.style.background='#fff';e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}}>
                    {setLogos[st.id]&&<img src={setLogos[st.id]} alt="" style={{ height:'16px', maxWidth:'60px', objectFit:'contain', opacity:filSet===st.id?.9:.5 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                    {st.name} <span style={{ opacity:.5 }}>({(()=>{const ow=allCards.filter(c=>c.setId===st.id&&isOwned(c)).length; return ow>0?<><span style={{ color:filSet===st.id?'#BBF7D0':'#2E9E6A' }}>{ow}</span>/{st.count}</>:st.count})()})</span>
                  </div>
                ))}
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
                  {setBlocks[filSet]&&<div style={{ fontSize:'11px', color:'#86868B', fontFamily:'var(--font-display)', marginBottom:'8px' }}>{setBlocks[filSet]}</div>}
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
              <div style={{ display:'grid', gridTemplateColumns:cfg.col, gap: cardSize==='L'?'16px':'12px' }}>
                {pageCards.map((card,idx) => {
                  const isSel = selId===card.id
                  const base  = cardImageUrl(card, lang)
                  const img   = base ? (base.includes('.webp')||base.includes('.png')||base.includes('.jpg') ? base : `${base}/low.webp`) : null
                  return (
                    <div key={card.id}
                      className={`enc-card${isSel?' sel':''}`}
                      onClick={()=>handleCardClick(card.id)} onDoubleClick={e=>{e.stopPropagation();if(!isOwned(card)){addToPortfolio(card)}}}
                      style={{ background:'#fff', border:`1.5px solid ${isSel?'#111':'#EBEBEB'}`, boxShadow:isSel?'0 8px 28px rgba(0,0,0,.1)':'0 2px 8px rgba(0,0,0,.04)', animation:`cardIn .28s ${Math.min(idx,18)*.025}s ease-out both` }}>
                      <div style={{ height:cfg.imgH, background:'#F5F5F5', position:'relative', overflow:'hidden' }}>
                        {card.rarity && (()=>{ const rc=getRarityColor(card.rarity); return <div style={{ position:'absolute', bottom:'6px', left:'6px', zIndex:2, padding:'2px 6px', borderRadius:'4px', background:rc.bg, fontSize:'7px', fontWeight:600, color:rc.fg, fontFamily:'var(--font-display)', letterSpacing:'.02em', opacity:.9 }}>{card.rarity}</div> })()}
                        {img ? (
                          <img src={img} alt={card.name}
                            className="card-img"
                            style={{ width:'100%', height:'100%', objectFit:'contain', display:'block', padding: cardSize==='L'?'6px':'3px', boxSizing:'border-box' as const }}
                            onLoad={e=>{ (e.target as HTMLImageElement).classList.add('card-img-loaded') }}
                            onError={e=>{
                            const t=e.target as HTMLImageElement
                            const src=t.src
                            if(src.includes('high.webp')) t.src=src.replace('high.webp','high.png')
                            else if(src.includes('high.png')) t.src=src.replace('/high.','/low.')
                            else if(src.includes('/fr/')) t.src=src.replace('/fr/','/en/')
                            else t.style.opacity='0'
                          }}/>
                        ) : (
                          customImgs[customImgKey(card)] ? (
                          <img src={customImgs[customImgKey(card)]} alt={card.name}
                            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', borderRadius:'inherit' }}/>
                          ) : (
                          <div style={{ position:'absolute', inset:0, background:'linear-gradient(145deg,#F5F5F5,#EEEEEE)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'4px', cursor:'pointer' }}
                            onClick={e => handleUploadClick(card, e)}>
                            <div style={{ fontSize:cardSize==='S'?'16px':'20px', opacity:.25 }}>📷</div>
                            {cardSize!=='S' && <div style={{ fontSize:'7px', color:'#BBB', fontFamily:'var(--font-display)', textAlign:'center' as const, lineHeight:1.3 }}>Ajouter<br/>illustration</div>}
                            {lang==='JP' && cardSize!=='S' && <div style={{ fontSize:'7px', color:'#CCC', fontFamily:'var(--font-display)', textAlign:'center' as const, lineHeight:1.3 }}>Image JP{String.fromCharCode(10)}non disponible</div>}
                          </div>
                          )
                        )}
                        <div style={{ position:'absolute', bottom:'5px', right:'6px', fontSize: cardSize==='S'?'10px':'11px', background:'rgba(255,255,255,.92)', borderRadius:'4px', padding:'1px 5px', boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
                          {flag(lang)}
                        </div>
                        <button className="zoom-btn" onClick={e=>{ e.stopPropagation(); setLightbox(card) }}
                          style={{ position:'absolute', top:'6px', right:'6px', width:'24px', height:'24px', borderRadius:'6px', background:'rgba(255,255,255,.85)', backdropFilter:'blur(4px)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, zIndex:3 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
                        </button>
                        {isOwned(card)&&<div style={{ position:'absolute', top:'6px', right:'6px', width:'20px', height:'20px', borderRadius:'50%', background:'#27500A', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg></div>}
                      </div>
                      <div style={{ padding:cfg.pad }}>
                        <div className="card-name" style={{ fontSize:cfg.nameSize, fontWeight:600, color:'#111', fontFamily:'var(--font-display)', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, lineHeight:1.3 }}>
                          {card.name}
                        </div>
                        <div style={{ fontSize:cfg.subSize, color:ERA_COLORS[card.era]||'#BBBBBB', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
                          {setLogos[card.setId]&&<img src={setLogos[card.setId]} alt="" style={{ height:'11px', maxWidth:'40px', objectFit:'contain', verticalAlign:'middle', marginRight:'3px', opacity:.6 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                          {card.setName}
                          {cardSize!=='S' && <span style={{ fontFamily:'monospace', marginLeft:'4px' }}>#{card.localId}</span>}
                        </div>
                        {lang==='JP' && card.enName && cardSize!=='S' && (
                          <div style={{ fontSize:'9px', color:'#BBBBBB', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, fontStyle:'italic', display:'flex', alignItems:'center', gap:'3px' }}>
                            <span style={{ fontSize:'8px' }}>🇺🇸</span>
                            <span>{card.enName}</span>
                          </div>
                        )}
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
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'40px minmax(0,2.5fr) minmax(0,1.2fr) 90px 55px 50px', padding:'9px 16px', background:'#FAFAFA', borderBottom:'1px solid #F0F0F0', gap:'8px' }}>
                {['','Carte','Série','Rareté','N°',''].map((h,i)=>(
                  <div key={i} style={{ fontSize:'10px', fontWeight:600, color:'#AAA', textTransform:'uppercase' as const, letterSpacing:'.07em', fontFamily:'var(--font-display)', textAlign:i>=4?'right' as const:'left' as const }}>{h}</div>
                ))}
              </div>
              {pageCards.map((card,i) => {
                const isSel = selId===card.id
                const img = card.image || (card.setId && card.localId ? getCardImageUrl({ lang: lang, setId: card.setId, localId: card.localId }) : null)
                const rc = card.rarity ? getRarityColor(card.rarity) : null
                const owned = isOwned(card)
                return (
                  <div key={card.id} className="rh"
                    onClick={()=>handleCardClick(card.id)}
                    style={{ display:'grid', gridTemplateColumns:'40px minmax(0,2.5fr) minmax(0,1.2fr) 90px 55px 50px', padding:'8px 16px', borderBottom:i<pageCards.length-1?'1px solid #F8F8F8':'none', alignItems:'center', background:isSel?'#F5F5F7':owned?'#FAFEF5':'transparent', borderLeft:isSel?'3px solid #111':'3px solid transparent', transition:'all .1s', gap:'8px', cursor:'pointer' }}>
                    <div style={{ width:'32px', height:'44px', flexShrink:0, borderRadius:'5px', overflow:'hidden', background:'#F5F5F5', border:'1px solid #EBEBEB' }}>
                      {img && <img src={img} alt={card.name} loading="lazy" decoding="async" style={{ width:'100%', height:'100%', objectFit:'contain' }} onError={e=>{
                        const t=e.target as HTMLImageElement; const src=t.src
                        if(src.includes('high.webp')) t.src=src.replace('high.webp','high.png')
                        else if(src.includes('high.png')) t.src=src.replace('/high.','/low.')
                        else if(src.includes('/fr/')) t.src=src.replace('/fr/','/en/')
                        else t.style.opacity='0'
                      }}/>}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, display:'flex', alignItems:'center', gap:'6px' }}>
                        {card.name}
                        {owned&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2E9E6A" strokeWidth="3" strokeLinecap="round" style={{ flexShrink:0 }}><path d="M20 6L9 17l-5-5"/></svg>}
                      </div>
                      <div style={{ fontSize:'10px', color:'#AEAEB2', display:'flex', alignItems:'center', gap:'3px' }}>{flag(lang)} {lang==='JP'&&card.enName?card.enName:''}</div>
                    </div>
                    <div style={{ fontSize:'11px', color:'#86868B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, display:'flex', alignItems:'center', gap:'5px' }}>
                      {setLogos[card.setId]&&<img src={setLogos[card.setId]} alt="" style={{ height:'13px', maxWidth:'40px', objectFit:'contain', opacity:.5, flexShrink:0 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                      {card.setName}
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

        {/* ── DETAIL PANEL ── */}
        {selId && (
          <div className="detail-panel" style={{ width:'285px', flexShrink:0, position:'sticky' as any, top:'80px', maxHeight:'calc(100vh - 100px)', overflowY:'auto' as any }}>
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'16px', overflow:'hidden', overflowY:'auto' as const, boxShadow:'0 8px 32px rgba(0,0,0,.07)' }}>

              {detLoading ? (
                <div style={{ padding:'50px 20px', textAlign:'center' }}>
                  <div style={{ width:'20px', height:'20px', border:'2px solid #EBEBEB', borderTop:'2px solid #111', borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto 10px' }}/>
                  <div style={{ fontSize:'12px', color:'#AAA', fontFamily:'var(--font-display)' }}>Chargement de la carte…</div>
                </div>

              ) : detail ? (
                <>
                  {/* Image haute résolution */}
                  <div style={{ background:'#F8F8F8', padding:'14px', display:'flex', justifyContent:'center', alignItems:'center', minHeight:'180px', position:'relative' }}>
                    {detail.image ? (
                      <img
                        src={detail.image || getCardImageUrl({ lang: lang, setId: detail.set?.id, localId: detail.localId })}
                        alt={detail.name}
                        style={{ maxHeight:'220px', maxWidth:'100%', objectFit:'contain', borderRadius:'6px', boxShadow:'0 4px 20px rgba(0,0,0,.1)' }}
                        onError={e=>{ const t=e.target as HTMLImageElement; if(!t.src.includes('.jpg')) t.src=`${detail.image}/high.jpg`; else t.style.display='none' }}
                      />
                    ) : (
                      selCard && customImgs[customImgKey(selCard)] ? (
                      <img src={customImgs[customImgKey(selCard)]} alt={selCard.name}
                        style={{ maxHeight:'220px', maxWidth:'100%', objectFit:'contain', borderRadius:'6px', boxShadow:'0 4px 20px rgba(0,0,0,.1)' }}/>
                      ) : (
                      <div style={{ width:'140px', height:'196px', borderRadius:'8px', background:'#F5F5F5', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px', cursor:'pointer', border:'2px dashed #DDD', transition:'all .2s' }}
                        onClick={e => { if(selCard) handleUploadClick(selCard, e) }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='#E03020'; (e.currentTarget as HTMLElement).style.background='#FFF5F5' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='#DDD'; (e.currentTarget as HTMLElement).style.background='#F5F5F5' }}>
                        <div style={{ fontSize:'24px', opacity:.3 }}>📷</div>
                        <div style={{ fontSize:'10px', color:'#999', fontFamily:'var(--font-display)', textAlign:'center' as const, lineHeight:1.4 }}>Ajouter une<br/>illustration</div>
                        {lang==='JP' && <div style={{ fontSize:'9px', color:'#CCC', fontFamily:'var(--font-display)', textAlign:'center' as const }}>Image JP non disponible</div>}
                      </div>
                      )
                    )}
                    <button onClick={()=>{ setSelId(null); setDetail(null); setEnDetail(null) }}
                      style={{ position:'absolute', top:'8px', left:'8px', width:'26px', height:'26px', borderRadius:'50%', background:'rgba(255,255,255,.9)', border:'1px solid rgba(0,0,0,.08)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', color:'#666' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                    {selCard && (
                      <button className="zoom-btn" onClick={()=>setLightbox(selCard)}
                        style={{ position:'absolute', top:'8px', right:'8px', width:'30px', height:'30px', borderRadius:'50%', background:'rgba(0,0,0,.55)', border:'none', color:'#fff', fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
                      </button>
                    )}
                  </div>

                  <div style={{ padding:'14px' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px', marginBottom:'2px' }}>
                      <div style={{ fontSize:'16px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', lineHeight:1.2 }}>{detail.name}</div>
                      {detail.rarity && (()=>{ const rc=getRarityColor(detail.rarity); return <span style={{ flexShrink:0, padding:'3px 8px', borderRadius:'5px', background:rc.bg, color:rc.fg, fontSize:'9px', fontWeight:600, fontFamily:'var(--font-display)', letterSpacing:'.02em' }}>{detail.rarity}</span> })()}
                    </div>

                    {/* Traduction JP → EN */}
                    {lang==='JP' && enDetail && (
                      <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'6px', padding:'5px 8px', background:'#FFF5F0', borderRadius:'6px', border:'1px solid #FFE0D0' }}>
                        <span>🇺🇸</span>
                        <span style={{ fontSize:'12px', fontWeight:500, color:'#C84B00', fontFamily:'var(--font-display)' }}>{enDetail.name}</span>
                      </div>
                    )}

                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px', padding:'8px 10px', background:'#F8F8FA', borderRadius:'8px', border:'1px solid #F0F0F2' }}>
                      {selCard&&setLogos[selCard.setId]&&<img src={setLogos[selCard.setId]} alt="" style={{ height:'22px', maxWidth:'80px', objectFit:'contain', flexShrink:0 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:'11px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{detail.set?.name}{detail.localId ? ` · #${detail.localId}` : ''}</div>
                        <div style={{ fontSize:'9px', color:'#AEAEB2', fontFamily:'var(--font-display)' }}>
                          {selCard&&setBlocks[selCard.setId]?setBlocks[selCard.setId]+' · ':''}
                          {detail.set?.releaseDate ? detail.set.releaseDate.slice(0,4) : ''}
                        </div>
                      </div>
                    </div>

                    {/* Types + HP */}
                    {(detail.types?.length || detail.hp) && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginBottom:'14px' }}>
                        {detail.types?.map(t=>(
                          <span key={t} style={{ fontSize:'10px', fontWeight:600, background:`${TC[t]??'#888'}18`, color:TC[t]??'#888', border:`1px solid ${TC[t]??'#888'}30`, padding:'3px 8px', borderRadius:'5px', fontFamily:'var(--font-display)' }}>{t}</span>
                        ))}
                        {detail.hp && (
                          <span style={{ fontSize:'10px', fontWeight:600, background:'#F5F5F5', color:'#555', border:'1px solid #E8E8E8', padding:'3px 8px', borderRadius:'5px', fontFamily:'var(--font-display)' }}>{detail.hp} HP</span>
                        )}
                      </div>
                    )}

                    {/* Infos */}
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'14px' }}>
                      {([

                        ['Catégorie',   detail.category],
                        ['Stade',       detail.stage],
                        ['Évolue de',   detail.evolveFrom],
                        ['Illustrateur',detail.illustrator],
                      ] as [string,string|undefined][]).filter(([,v])=>v).map(([l,v])=>(
                        <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px' }}>
                          <span style={{ fontSize:'10px', color:'#AAA', fontFamily:'var(--font-display)', flexShrink:0 }}>{l}</span>
                          <span style={{ fontSize:'11px', color:'#111', fontFamily:'var(--font-display)', fontWeight:500, textAlign:'right' as const, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Attaques */}
                    {detail.attacks && detail.attacks.length>0 && (
                      <div style={{ marginBottom:'14px' }}>
                        <div style={{ fontSize:'9px', fontWeight:700, color:'#AAA', textTransform:'uppercase' as const, letterSpacing:'.1em', fontFamily:'var(--font-display)', marginBottom:'7px' }}>Attaques</div>
                        {detail.attacks.slice(0,3).map((a,i)=>(
                          <div key={i} className="attack-row" style={{ background:'#F8F8F8', borderRadius:'8px', padding:'8px 10px', marginBottom:'5px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                              <span style={{ fontSize:'11px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>{a.name}</span>
                              {a.damage!=null && <span style={{ fontSize:'12px', fontWeight:700, color:'#E03020', fontFamily:'var(--font-display)' }}>{a.damage}</span>}
                            </div>
                            {a.cost.length>0 && (
                              <div style={{ display:'flex', gap:'3px', marginBottom: a.effect?'4px':'0' }}>
                                {a.cost.slice(0,6).map((c,ci)=>(
                                  <span key={ci} style={{ width:'14px', height:'14px', borderRadius:'50%', background:`${TC[c]??'#AAA'}35`, border:`1px solid ${TC[c]??'#AAA'}70`, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'7px' }}>●</span>
                                ))}
                              </div>
                            )}
                            {a.effect && <div style={{ fontSize:'9px', color:'#888', lineHeight:1.5 }}>{a.effect.slice(0,100)}{a.effect.length>100?'…':''}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Faiblesses */}
                    {detail.weaknesses && detail.weaknesses.length>0 && (
                      <div style={{ marginBottom:'14px' }}>
                        <div style={{ fontSize:'9px', fontWeight:700, color:'#AAA', textTransform:'uppercase' as const, letterSpacing:'.1em', fontFamily:'var(--font-display)', marginBottom:'5px' }}>Faiblesses</div>
                        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                          {detail.weaknesses.map((w,i)=>(
                            <span key={i} style={{ fontSize:'11px', fontWeight:600, background:`${TC[w.type]??'#888'}18`, color:TC[w.type]??'#888', border:`1px solid ${TC[w.type]??'#888'}30`, padding:'3px 8px', borderRadius:'5px', fontFamily:'var(--font-display)' }}>
                              {w.type} {w.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Owned + set completion */}
                    {selCard && (()=>{
                      const setTotal = allCards.filter(c=>c.setId===selCard.setId).length
                      const setOwned = allCards.filter(c=>c.setId===selCard.setId && isOwned(c)).length
                      const pct = setTotal>0 ? Math.round(setOwned/setTotal*100) : 0
                      return setTotal>0 ? (
                        <div style={{ background:'#F5F5F7', borderRadius:'10px', padding:'10px 12px', marginBottom:'12px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                            <span style={{ fontSize:'10px', color:'#86868B', fontFamily:'var(--font-display)' }}>Complétion du set</span>
                            <span style={{ fontSize:'10px', fontWeight:600, color:'#1D1D1F', fontFamily:'var(--font-data)' }}>{setOwned}/{setTotal}</span>
                          </div>
                          <div style={{ height:'4px', borderRadius:'2px', background:'#E8E8ED', overflow:'hidden' }}>
                            <div style={{ width:pct+'%', height:'100%', borderRadius:'2px', background:pct===100?'linear-gradient(90deg,#C9A84C,#D4AF37)':'#E03020', transition:'width .3s' }}/>
                          </div>
                        </div>
                      ) : null
                    })()}

                    {selCard && isOwned(selCard) ? (
                      <div style={{ width:'100%', padding:'11px', borderRadius:'9px', background:'#EAF3DE', color:'#27500A', border:'none', fontSize:'12px', fontWeight:600, fontFamily:'var(--font-display)', textAlign:'center' as const, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#27500A" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                        Dans ma collection
                      </div>
                    ) : (
                      <button onClick={()=>{ if(selCard) addToPortfolio(selCard) }} className="add-btn"
                        style={{ width:'100%', padding:'11px', borderRadius:'9px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', letterSpacing:'.02em' }}>
                        + Ajouter au portfolio
                      </button>
                    )}
                  </div>
                </>

              ) : selCard && (
                <div style={{ padding:'30px 20px', textAlign:'center' }}>
                  {selCard.image && (
                    <img src={selCard.image?.includes('.webp')||selCard.image?.includes('.png')?selCard.image:`${selCard.image}/low.webp`} alt={selCard.name} style={{ maxHeight:'120px', marginBottom:'10px', objectFit:'contain' }}/>
                  )}
                  <div style={{ fontSize:'13px', color:'#888', fontFamily:'var(--font-display)', marginBottom:'4px' }}>{selCard.name}</div>
                  <div style={{ fontSize:'11px', color:'#CCC' }}>{selCard.setName}</div>
                </div>
              )}

            </div>
          </div>
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
      <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }}
        onChange={handleUploadFile}/>

      {/* Upload QC Modal */}
      {uploadModal.open&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',backdropFilter:'blur(4px)' }}
          onClick={()=>{if(uploadModal.done)setUploadModal(p=>({...p,open:false}))}}>
          <div style={{ maxWidth:'380px',width:'100%',background:'#fff',borderRadius:'20px',border:'1px solid #E5E5EA',boxShadow:'0 24px 60px rgba(0,0,0,.18)',overflow:'hidden',animation:'fadeUp .25s ease-out' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex',justifyContent:'center',padding:'20px 20px 0' }}>
              {uploadModal.preview&&(
                <div style={{ width:'100px',aspectRatio:'63/88',borderRadius:'10px',overflow:'hidden',border:'1px solid '+(uploadModal.done?(uploadModal.success?'#BBF7D0':'#FECACA'):'#E5E5EA'),boxShadow:'0 4px 16px rgba(0,0,0,.08)',transition:'border-color .3s' }}>
                  <img src={uploadModal.preview} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                </div>
              )}
            </div>
            <div style={{ padding:'14px 20px' }}>
              <div style={{ fontSize:'14px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)',marginBottom:'12px',textAlign:'center' }}>
                {uploadModal.done?(uploadModal.success?'Illustration validée':'Illustration rejetée'):'Vérification en cours...'}
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:'6px' }}>
                {uploadModal.checks.map((c,i)=>(
                  <div key={i} style={{ display:'flex',alignItems:'center',gap:'10px',padding:'7px 10px',borderRadius:'8px',background:c.status==='fail'?'#FEF2F2':c.status==='pass'?'#F0FDF4':'#F5F5F7',border:'1px solid '+(c.status==='fail'?'#FECACA':c.status==='pass'?'#BBF7D0':'#E5E5EA'),transition:'all .3s' }}>
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
                    <button onClick={()=>{setUploadModal(p=>({...p,open:false}));setTimeout(()=>uploadRef.current?.click(),150)}} style={{ flex:1,padding:'12px',borderRadius:'10px',background:'#1D1D1F',color:'#fff',border:'none',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'var(--font-display)' }}>Réessayer</button>
                    <button onClick={()=>setUploadModal(p=>({...p,open:false}))} style={{ padding:'12px 18px',borderRadius:'10px',background:'#F5F5F7',color:'#6E6E73',border:'1px solid #E5E5EA',fontSize:'13px',cursor:'pointer',fontFamily:'var(--font-display)' }}>Annuler</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

            {lightbox && (()=>{
        const base = cardImageUrl(lightbox, lang)
        const imgHd = base || (detail?.set?.id && detail?.localId ? getCardImageUrl({ lang: lang, setId: detail.set.id, localId: detail.localId }) : null)
        // Navigation dans le set
        const setCards = filtered.filter(c=>c.setId===lightbox.setId).sort((a,b)=>parseInt(a.localId)-parseInt(b.localId))
        const curIdx = setCards.findIndex(c=>c.id===lightbox.id)
        const prevCard = curIdx > 0 ? setCards[curIdx-1] : null
        const nextCard = curIdx < setCards.length-1 ? setCards[curIdx+1] : null
        const rc = getRarityColor(lightbox.rarity||'')
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.92)', zIndex:60, display:'flex', alignItems:'center', justifyContent:'center' }}
            onClick={()=>setLightbox(null)}>
            {/* Prev */}
            {prevCard && (
              <button onClick={e=>{e.stopPropagation();setLightbox(prevCard)}}
                style={{ position:'absolute', left:'20px', top:'50%', transform:'translateY(-50%)', width:'44px', height:'44px', borderRadius:'50%', background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.15)', color:'rgba(255,255,255,.7)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', transition:'all .15s', zIndex:2 }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.2)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.1)'}}>
                {String.fromCharCode(8249)}
              </button>
            )}
            {/* Next */}
            {nextCard && (
              <button onClick={e=>{e.stopPropagation();setLightbox(nextCard)}}
                style={{ position:'absolute', right:'20px', top:'50%', transform:'translateY(-50%)', width:'44px', height:'44px', borderRadius:'50%', background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.15)', color:'rgba(255,255,255,.7)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', transition:'all .15s', zIndex:2 }}
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
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'16px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', marginBottom:'4px' }}>{lightbox.name}</div>
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
                  <button onClick={()=>{addToPortfolio(lightbox);setToast(lightbox.name+' ajouté')}}
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
              style={{ position:'absolute', top:'20px', right:'20px', width:'38px', height:'38px', borderRadius:'50%', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.6)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', transition:'all .15s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.15)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.08)'}}>
              {String.fromCharCode(215)}
            </button>
          </div>
        )
      })()}
      {/* Back to top */}
      <button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} style={{ position:'fixed', bottom:'24px', right:'24px', width:'44px', height:'44px', borderRadius:'50%', background:'#1D1D1F', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(0,0,0,.15)', zIndex:30, transition:'all .2s' }}
        onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.2)'}}
        onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.15)'}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
      </button>
    </>
  )
}
