'use client'

import { useState, useRef, useEffect } from 'react'
import { fetchSets, fetchCardsForSet, type TCGSet, type TCGCard } from '@/lib/tcgApi'
import ImportPortfolioModal from './ImportPortfolioModal'
import { useRouter } from 'next/navigation'

type CardItem = {
  id: string; name: string; set: string; year: number; number: string
  rarity: string; type: string; lang: 'EN'|'JP'|'FR'
  condition: string; graded: boolean
  buyPrice: number; curPrice: number; qty: number
  psa?: number; signal?: 'S'|'A'|'B'; hot?: boolean; favorite?: boolean
  image?: string; setTotal?: number
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
  const x=((e.clientX-r.left)/r.width-.5)*24, y=((e.clientY-r.top)/r.height-.5)*-24
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

export function Holdings() {
  const router = useRouter()
  const [view,        setView]        = useState<ViewMode>('binder')
  const [binderSet,   setBinderSet]   = useState<string|null>(null)
  const [dragIdx,     setDragIdx]     = useState<number|null>(null)
  const [binderCols,  setBinderCols]  = useState(4)
  const [binderPage,  setBinderPage]  = useState(0)
  const [portfolio,   setPortfolio]   = useState<CardItem[]>(()=>{
    try { const r=localStorage.getItem('pka_portfolio'); return r?JSON.parse(r):[] } catch { return [] }
  })
  const [showcase,    setShowcase]    = useState<CardItem[]>(()=>{
    try { const r=localStorage.getItem('pka_showcase'); return r?JSON.parse(r):[] } catch { return [] }
  })
  const [showPickerForShowcase, setShowPickerForShowcase] = useState(false)
  const [spotCard,    setSpotCard]    = useState<CardItem|null>(null)
  const [editQty,     setEditQty]     = useState<number|null>(null)
  const [favs,        setFavs]        = useState<Set<string>>(new Set())
  const [shareOpen,   setShareOpen]   = useState(false)
  const [shareCtx,    setShareCtx]    = useState<'portfolio'|'card'|'wrapped'>('portfolio')
  const [shareCard,   setShareCard]   = useState<CardItem|null>(null)
  const [refCopied,   setRefCopied]   = useState(false)
  const [selectedFmt, setSelectedFmt] = useState<string|null>(null)
  const [addOpen,     setAddOpen]     = useState(false)
  const [addSuggs,    setAddSuggs]    = useState<string[]>([])
  const [addForm,     setAddForm]     = useState<{
    name:string; set:string; setId:string; type:string; lang:'EN'|'JP'|'FR';
    condition:string; graded:boolean; buyPrice:string; qty:number; year:number; image:string; setTotal:number; number:string; rarity:string;
  }>({name:'',set:'',setId:'',type:'fire',lang:'FR',condition:'Raw',graded:false,buyPrice:'',qty:1,year:new Date().getFullYear(),image:'',setTotal:0,number:'',rarity:''})
  const [toast, setToast] = useState<string|null>(null)
  const [importOpen,   setImportOpen]   = useState(false)
  const [scannerOpen,  setScannerOpen]  = useState(false)
  const [scannerLoad,  setScannerLoad]  = useState(false)
  const [scannerImg,   setScannerImg]   = useState<string|null>(null)
  const [showWelcome,  setShowWelcome]  = useState(false)
  const [celebSet,     setCelebSet]     = useState<string|null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout>|null>(null)

  useEffect(()=>{ try { localStorage.setItem('pka_portfolio', JSON.stringify(portfolio)) } catch {} }, [portfolio])
  useEffect(()=>{ try { localStorage.setItem('pka_showcase', JSON.stringify(showcase)) } catch {} }, [showcase])

  // ── Welcome first visit ──
  useEffect(()=>{
    if(!localStorage.getItem('pka_binder_seen')){
      setShowWelcome(true)
      localStorage.setItem('pka_binder_seen','1')
    }
  },[])

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
        number:c.number??'', rarity:c.rarity??'',
      })
      setAddOpen(true)
    } catch {}
  }, [])

  // ── Live TCG data ──
  const [liveSets,    setLiveSets]    = useState<TCGSet[]>([])
  const [liveCards,   setLiveCards]   = useState<TCGCard[]>([])
  const [setsLoading, setSetsLoading] = useState(false)
  const [cardsLoading,setCardsLoading]= useState(false)

  useEffect(() => {
    setSetsLoading(true)
    setLiveSets([])
    fetchSets(addForm.lang)
      .then(sets => { setLiveSets(sets); setSetsLoading(false) })
      .catch(() => setSetsLoading(false))
  }, [addForm.lang])

  const totalBuy  = portfolio.reduce((s,c)=>s+c.buyPrice*c.qty,0)
  const totalCur  = portfolio.reduce((s,c)=>s+c.curPrice*c.qty,0)
  const totalGain = totalCur-totalBuy
  const totalROI  = totalBuy>0?Math.round((totalGain/totalBuy)*100):0
  const bestCard  = portfolio.length>0?[...portfolio].sort((a,b)=>((b.curPrice-b.buyPrice)/Math.max(b.buyPrice,1))-((a.curPrice-a.buyPrice)/Math.max(a.buyPrice,1)))[0]:null
  const slotsPer  = binderCols*3
  const binderFiltered = (!binderSet || binderSet==='__all__') ? portfolio : portfolio.filter(c=>c.set===binderSet)
  const binderPages = Math.max(1,Math.ceil(binderFiltered.length/slotsPer))
  const pageItems   = binderFiltered.slice(binderPage*slotsPer,(binderPage+1)*slotsPer)
  const phantomCount = binderSet ? Math.max(0,slotsPer-pageItems.length) : 0

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
    setPortfolio(prev=>prev.filter(c=>c.id!==card.id))
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
    setLiveCards([])
    if (id) {
      setCardsLoading(true)
      fetchCardsForSet(addForm.lang, id)
        .then(cards => { setLiveCards(cards); setCardsLoading(false) })
        .catch(() => setCardsLoading(false))
    }
  }
  const handleNameInput = (val:string) => {
    setAddForm(p=>({...p,name:val}))
    if(val.length<2){setAddSuggs([]);return}
    if (liveCards.length > 0) {
      const matches = liveCards
        .filter(c=>c.name.toLowerCase().includes(val.toLowerCase()))
        .map(c=>c.name)
      setAddSuggs([...new Set(matches)].slice(0,8))
    } else {
      const pool = addForm.set?ENCYCLOPEDIA.filter(cc=>cc.set===addForm.set):ENCYCLOPEDIA
      const matches = pool.filter(cc=>cc.name.toLowerCase().includes(val.toLowerCase())).map(cc=>cc.name)
      setAddSuggs([...new Set(matches)].slice(0,6))
    }
  }
  const handleSuggSelect = (name:string) => {
    const extra = encyclopediaLookup(name, addForm.set)
    const liveCard = liveCards.find(c=>c.name===name)
    const img = liveCard?.image ?? ''
    setAddForm(p=>({...p,name,type:extra.type??p.type,year:extra.year??p.year,image:img}))
    setAddSuggs([])
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
    if(!addForm.name||!addForm.set) return
    const extra = encyclopediaLookup(addForm.name, addForm.set)
    const bp = parseFloat(addForm.buyPrice)||0
    const liveMatch = liveCards.find(c=>c.name.toLowerCase()===addForm.name.toLowerCase())
    const resolvedImage = addForm.image || liveMatch?.image || ''
    const newCard:CardItem = {
      id:'u'+Date.now(), name:addForm.name, set:addForm.set,
      year:extra.year??addForm.year,
      number:extra.number||(addForm.number||'???'),
      rarity:extra.rarity||(addForm.rarity||''),
      type:addForm.type, lang:addForm.lang,
      condition:addForm.condition, graded:addForm.graded,
      buyPrice:bp, curPrice:extra.curPrice??bp, qty:addForm.qty,
      psa:extra.psa, signal:extra.signal,
      image:resolvedImage||undefined,
    }
    setPortfolio(prev=>{
      const next=[...prev,newCard]
      return next
    })
    setAddOpen(false); setAddSuggs([])
    setAddForm({name:'',set:'',setId:'',type:'fire',lang:'EN',condition:'Raw',graded:false,buyPrice:'',qty:1,year:new Date().getFullYear(),image:'',setTotal:0,number:'',rarity:''})
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
  const canAdd = !!(addForm.name&&addForm.set)

  return (
    <>
    <div>
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes fadeUp    { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cardIn    { from{opacity:0;transform:scale(.88) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes holoShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes breatheS  { 0%,100%{box-shadow:0 0 18px rgba(255,107,53,.4),0 4px 24px rgba(0,0,0,.6)} 50%{box-shadow:0 0 44px rgba(255,107,53,.7),0 8px 40px rgba(0,0,0,.7)} }
        @keyframes breatheA  { 0%,100%{box-shadow:0 0 12px rgba(200,85,212,.35),0 4px 18px rgba(0,0,0,.5)} 50%{box-shadow:0 0 28px rgba(200,85,212,.6),0 6px 28px rgba(0,0,0,.6)} }
        @keyframes ptcl      { 0%{transform:translateY(0) scale(1);opacity:.8} 100%{transform:translateY(-28px) scale(0);opacity:0} }
        @keyframes shimGlow  { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes toastIn   { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes wrappedIn { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        @keyframes shareUp   { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
        .gem { position:relative;border-radius:14px;overflow:hidden;cursor:pointer;will-change:transform; }
        .gem .holo { position:absolute;inset:0;border-radius:inherit;background:linear-gradient(115deg,#ff0080,#ff8c00,#ffd700,#00ff88,#00cfff,#8b00ff,#ff0080);background-size:500% 500%;mix-blend-mode:overlay;opacity:0;pointer-events:none;transition:opacity .35s;animation:holoShift 8s ease infinite; }
        .gem .hm { position:absolute;inset:0;border-radius:inherit;background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.4),transparent 65%);opacity:0;pointer-events:none;mix-blend-mode:overlay;transition:opacity .25s; }
        .gem:hover .holo { opacity:.28; }
        .gem .ptcl { position:absolute;width:3px;height:3px;border-radius:50%;pointer-events:none;opacity:0; }
        .gem:hover .ptcl:nth-child(1){ animation:ptcl 2s ease-out infinite; }
        .gem:hover .ptcl:nth-child(2){ animation:ptcl 2.4s .5s ease-out infinite; }
        .gem:hover .ptcl:nth-child(3){ animation:ptcl 1.8s 1s ease-out infinite; }
        .breathe-S { animation:breatheS 2.4s ease-in-out infinite; }
        .breathe-A { animation:breatheA 3s ease-in-out infinite; }
        .pocket-shell { position:relative;border-radius:9px;overflow:hidden;cursor:pointer;transition:transform .2s cubic-bezier(.34,1.2,.64,1); }
        .pocket-shell:hover { transform:translateY(-5px) scale(1.04) !important; }
        .vtab { padding:7px 18px;border-radius:99px;border:1px solid rgba(255,255,255,.12);background:transparent;color:rgba(255,255,255,.4);font-size:12px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .15s; }
        .vtab.on { background:rgba(255,255,255,.12) !important;border-color:rgba(255,255,255,.3) !important;color:#fff !important; }
        .colbtn { width:28px;height:28px;border-radius:7px;font-size:11px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .15s; }
        .remove-btn { pointer-events:all !important; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
        .req-label { font-size:10px;font-weight:700;color:rgba(255,107,53,.9);font-family:var(--font-display);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px; }
        .opt-label { font-size:10px;color:rgba(255,255,255,.35);font-family:var(--font-display);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px; }
        .req-field { border:2px solid rgba(255,107,53,.35) !important; }
        .req-field-ok { border:2px solid rgba(78,204,163,.4) !important; }
        select { color-scheme:dark; }
        @keyframes binderOpen { 0%{transform:perspective(800px) rotateY(-90deg) translateX(-60px);opacity:0} 60%{transform:perspective(800px) rotateY(8deg);opacity:1} 100%{transform:perspective(800px) rotateY(0deg);opacity:1} }
        @keyframes welcomeIn  { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
        @keyframes burst      { 0%{transform:scale(0) rotate(0deg);opacity:1} 60%{transform:scale(1.3) rotate(20deg);opacity:1} 100%{transform:scale(1.1) rotate(15deg);opacity:1} }
        @keyframes confettiF  { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(120px) rotate(720deg);opacity:0} }
        @keyframes shimmerG   { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes scanPulse  { 0%,100%{border-color:rgba(16,185,129,.4)} 50%{border-color:rgba(16,185,129,.9)} }
        @keyframes scanLine   { 0%{top:10%} 100%{top:90%} }
        .scan-frame { animation:scanPulse 1.4s ease-in-out infinite; }
        .scan-line  { animation:scanLine 1.8s ease-in-out infinite alternate; }
      `}} />

      <div style={{ background:'#070503', minHeight:'100vh', borderRadius:'16px', overflow:'hidden', position:'relative' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(ellipse at 15% 30%,rgba(255,107,53,.07) 0%,transparent 40%),radial-gradient(ellipse at 85% 70%,rgba(126,87,194,.07) 0%,transparent 40%)', pointerEvents:'none', zIndex:0 }} />

        {toast&&(
          <div style={{ position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)', background:'rgba(10,6,2,.95)', color:'rgba(255,255,255,.85)', padding:'9px 20px', borderRadius:'22px', fontSize:'12px', fontWeight:500, border:'1px solid rgba(255,255,255,.12)', whiteSpace:'nowrap', zIndex:99, animation:'toastIn .3s ease-out', fontFamily:'var(--font-display)' }}>
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
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.82)', zIndex:40, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px' }} onClick={()=>{ setSpotCard(null); setEditQty(null) }}>
              <div style={{ background:'#0F0A04', borderRadius:'20px', border:`1px solid ${ec}40`, boxShadow:`0 0 60px ${eg},0 24px 60px rgba(0,0,0,.8)`, padding:'28px', maxWidth:'680px', width:'100%', animation:'fadeUp .25s ease-out' }} onClick={e=>e.stopPropagation()}>
                <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:'24px', alignItems:'start' }}>
                  <div className="gem" style={{ background:`linear-gradient(160deg,${ec}22,${ec}08)`, border:`2px solid ${ec}50`, boxShadow:`0 0 40px ${eg},0 12px 40px rgba(0,0,0,.7)` }} onMouseMove={tiltCard} onMouseLeave={resetCard}>
                    {isHolo&&<div className="holo"/>}
                    <div className="hm"/>
                    <div className="ptcl" style={{ background:ec, bottom:'22%', left:'20%' }}/>
                    <div className="ptcl" style={{ background:ec, bottom:'35%', left:'65%' }}/>
                    <div style={{ height:'3px', background:`linear-gradient(90deg,${ec},${ec}55)`, position:'absolute', top:0, left:0, right:0 }}/>
                    {spotCard.signal&&<div style={{ position:'absolute', top:'10px', right:'10px', zIndex:3, fontSize:'10px', fontWeight:700, background:TIER_BG[spotCard.signal], color:'#fff', padding:'3px 9px', borderRadius:'6px', fontFamily:'var(--font-display)' }}>Tier {spotCard.signal}</div>}
                    <div style={{ aspectRatio:'63/88', margin:'6px 6px 0', borderRadius:'12px', background:`${ec}14`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', maxHeight:'280px' }}>
                      {spotCard.image ? (
                        <img src={`${spotCard.image.replace(/\/low\.(webp|jpg|png)$/, '')}/high.webp`} alt={spotCard.name}
                          style={{ width:'100%', height:'100%', objectFit:'cover', position:'relative', zIndex:1 }}
                          onError={e=>{ const t=e.target as HTMLImageElement; if(t.src.includes('.webp')) t.src=t.src.replace('.webp','.jpg'); else if(t.src.includes('high')) t.src=t.src.replace('high','low'); else t.style.display='none' }}/>
                      ) : (
                        <>
                          <div style={{ position:'absolute', width:'75%', height:'75%', borderRadius:'50%', background:eg, filter:'blur(28px)', opacity:.65 }}/>
                          <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec}DD,${ec}77)`, boxShadow:`0 0 28px ${eg}`, zIndex:1 }}/>
                        </>
                      )}
                    </div>
                    <div style={{ padding:'14px' }}>
                      <div style={{ fontSize:'16px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', marginBottom:'3px' }}>{spotCard.name}</div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,.3)' }}>{spotCard.set} - {spotCard.year} - {spotCard.condition}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:'40px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-1.5px', lineHeight:1, marginBottom:'6px' }}>EUR {spotCard.curPrice.toLocaleString('fr-FR')}</div>
                    {spotCard.buyPrice>0&&<div style={{ fontSize:'16px', color:'#4ECCA3', fontWeight:500, marginBottom:'16px' }}>+{roi}% | +EUR {gain.toLocaleString('fr-FR')}</div>}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'14px' }}>
                      {[
                        {l:'Achat',v:'EUR '+spotCard.buyPrice.toLocaleString('fr-FR'),c:'rgba(255,255,255,.5)'},
                        {l:'Marche',v:'EUR '+spotCard.curPrice.toLocaleString('fr-FR'),c:'#fff'},
                        {l:'ROI',v:spotCard.buyPrice>0?'+'+roi+'%':'---',c:'#4ECCA3'},
                        {l:'Langue',v:spotCard.lang,c:'rgba(255,255,255,.7)'},
                        {l:'PSA Pop',v:spotCard.psa?spotCard.psa.toLocaleString():'---',c:'rgba(255,255,255,.7)'},
                        {l:'Gain',v:spotCard.buyPrice>0?'+EUR '+Math.abs(gain).toLocaleString('fr-FR'):'---',c:'#4ECCA3'},
                      ].map(s=>(
                        <div key={s.l} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:'9px', padding:'10px 12px' }}>
                          <div style={{ fontSize:'9px', color:'rgba(255,255,255,.3)', textTransform:'uppercase' as const, letterSpacing:'.08em', fontFamily:'var(--font-display)', marginBottom:'4px' }}>{s.l}</div>
                          <div style={{ fontSize:'15px', fontWeight:600, color:s.c, fontFamily:'var(--font-display)' }}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:'10px', padding:'12px 14px', marginBottom:'12px' }}>
                      <div style={{ fontSize:'9px', color:'rgba(255,255,255,.3)', textTransform:'uppercase' as const, letterSpacing:'.08em', fontFamily:'var(--font-display)', marginBottom:'8px' }}>Quantite dans la collection</div>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <button onClick={()=>setEditQty(Math.max(1,curQty-1))} style={{ width:'32px', height:'32px', borderRadius:'8px', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', color:'#fff', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>-</button>
                        <div style={{ flex:1, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', borderRadius:'8px', padding:'7px', textAlign:'center' as const, fontSize:'18px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)' }}>{curQty}</div>
                        <button onClick={()=>setEditQty(Math.min(99,curQty+1))} style={{ width:'32px', height:'32px', borderRadius:'8px', background:'rgba(255,107,53,.2)', border:'1px solid rgba(255,107,53,.4)', color:'#FF9060', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                        {editQty!==null&&editQty!==spotCard.qty&&(
                          <button onClick={()=>{ setPortfolio(prev=>prev.map(c=>c.id===spotCard.id?{...c,qty:editQty!}:c)); setSpotCard({...spotCard,qty:editQty!}); setEditQty(null); showToast('Quantite mise a jour') }} style={{ padding:'7px 12px', borderRadius:'8px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const }}>
                            Sauvegarder
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      <button onClick={()=>router.push('/alpha')} style={{ flex:2, padding:'11px', borderRadius:'9px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>Voir signal</button>
                      <button onClick={()=>{ setShareCtx('card'); setShareCard(spotCard); setShareOpen(true) }} style={{ flex:1, padding:'11px', borderRadius:'9px', background:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.7)', border:'1px solid rgba(255,255,255,.12)', fontSize:'13px', cursor:'pointer', fontFamily:'var(--font-display)' }}>Partager</button>
                      <button onClick={e=>toggleFav(spotCard.id,e)} style={{ width:'44px', borderRadius:'9px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>{favs.has(spotCard.id)?'X':'O'}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* SHOWCASE PICKER */}
        {showPickerForShowcase&&(
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:48, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }} onClick={()=>setShowPickerForShowcase(false)}>
            <div style={{ background:'#0F0A04', borderRadius:'20px', border:'1px solid rgba(255,107,53,.2)', padding:'24px', maxWidth:'480px', width:'100%', animation:'fadeUp .25s ease-out', maxHeight:'85vh', display:'flex', flexDirection:'column' }} onClick={e=>e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexShrink:0 }}>
                <div style={{ fontSize:'15px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)' }}>Choisir une carte</div>
                <button onClick={()=>setShowPickerForShowcase(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', fontSize:'20px', padding:0 }}>x</button>
              </div>
              {portfolio.filter(c=>!showcase.find(s=>s.id===c.id)).length===0?(
                <div style={{ textAlign:'center', padding:'32px 0', color:'rgba(255,255,255,.3)', fontSize:'13px' }}>Toutes vos cartes sont dans la vitrine.</div>
              ):(
                <div style={{ display:'flex', flexDirection:'column', gap:'8px', overflowY:'auto' as const }}>
                  {portfolio.filter(c=>!showcase.find(s=>s.id===c.id)).map(card=>{
                    const ec2=EC[card.type]??'#888'
                    return (
                      <div key={card.id} onClick={()=>addToShowcase(card)}
                        style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', borderRadius:'10px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', cursor:'pointer' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,107,53,.08)')}
                        onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,.04)')}>
                        <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:`linear-gradient(145deg,${ec2}25,${ec2}10)`, border:`1px solid ${ec2}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:ec2, opacity:.8 }}/>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'13px', fontWeight:500, color:'rgba(255,255,255,.85)', fontFamily:'var(--font-display)' }}>{card.name}</div>
                          <div style={{ fontSize:'10px', color:'rgba(255,255,255,.3)' }}>{card.set} - {card.condition}</div>
                        </div>
                        <div style={{ fontSize:'13px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)' }}>EUR {card.curPrice}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ADD CARD MODAL */}
        {addOpen&&(
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.88)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }} onClick={()=>{ setAddOpen(false); setAddSuggs([]) }}>
            <div style={{ background:'#0F0A04', borderRadius:'20px', border:'1px solid rgba(255,107,53,.25)', boxShadow:'0 0 60px rgba(255,107,53,.15),0 24px 60px rgba(0,0,0,.8)', padding:'24px', maxWidth:'520px', width:'100%', animation:'fadeUp .25s ease-out', maxHeight:'94vh', overflowY:'auto' as const }} onClick={e=>e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px' }}>
                <div>
                  <div style={{ fontSize:'17px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)' }}>Ajouter une carte ou un item</div>
                  <div style={{ fontSize:'11px', marginTop:'3px', color:'rgba(255,107,53,.7)', fontWeight:600 }}>* champs obligatoires</div>
                </div>
                <button onClick={()=>{ setAddOpen(false); setAddSuggs([]) }} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', fontSize:'22px', padding:0, lineHeight:1 }}>x</button>
              </div>

              <div style={{ marginBottom:'12px' }}>
                <div className="req-label">Serie *</div>
                <div style={{ position:'relative' }}>
                  <select value={addForm.setId}
                    onChange={e=>{ const found=liveSets.find(x=>x.id===e.target.value); if(found) handleSetChange(found.id,found.name) }}
                    className={addForm.set?'req-field-ok':'req-field'}
                    style={{ width:'100%', appearance:'none' as const, background:'rgba(255,255,255,.07)', borderRadius:'9px', padding:'10px 36px 10px 12px', color:addForm.set?'#fff':'rgba(255,255,255,.35)', fontSize:'13px', fontFamily:'var(--font-display)', outline:'none', cursor:'pointer' }}>
                    <option value="">{setsLoading?'Chargement des séries…':'Sélectionner une série…'}</option>
                    {liveSets.map(s=>(
                      <option key={s.id} value={s.id} style={{background:'#111'}}>
                        {s.name}{s.total?' ('+s.total+')':''}
                      </option>
                    ))}
                  </select>
                  <div style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', fontSize:'10px', color:'rgba(255,255,255,.45)' }}>v</div>
                </div>
              </div>

              <div style={{ marginBottom:'12px' }}>
                <div className="req-label">
                  Nom de la carte ou de l'item *
                  {addForm.set&&<span style={{ marginLeft:'6px', fontSize:'9px', color:'rgba(255,107,53,.5)', fontWeight:400 }}>{cardsLoading?'chargement…':liveCards.length>0?liveCards.length+' cartes':'encyclopédie'}</span>}
                </div>
                <div style={{ position:'relative' }}>
                  <input value={addForm.name} onChange={e=>handleNameInput(e.target.value)} onBlur={()=>setTimeout(()=>setAddSuggs([]),150)}
                    placeholder={cardsLoading?'Chargement des cartes…':addForm.set?'Chercher dans '+addForm.set+' ('+liveCards.length+' cartes)…':'Nom de la carte ou item…'}
                    className={addForm.name?'req-field-ok':'req-field'}
                    style={{ width:'100%', background:'rgba(255,255,255,.07)', borderRadius:'9px', padding:'10px 12px', color:'#fff', fontSize:'13px', fontFamily:'var(--font-display)', outline:'none', boxSizing:'border-box' as const }}/>
                  {addSuggs.length>0&&(
                    <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#1A0E06', border:'1px solid rgba(255,107,53,.3)', borderRadius:'10px', overflow:'hidden', zIndex:99, boxShadow:'0 8px 24px rgba(0,0,0,.6)' }}>
                      {addSuggs.map((s,i)=>(
                        <div key={i} onMouseDown={()=>handleSuggSelect(s)}
                          style={{ padding:'9px 14px', fontSize:'13px', color:'rgba(255,255,255,.85)', fontFamily:'var(--font-display)', cursor:'pointer', borderBottom:i<addSuggs.length-1?'1px solid rgba(255,255,255,.06)':'none' }}
                          onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,107,53,.1)')}
                          onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom:'12px' }}>
                <div className="opt-label">Langue</div>
                <div style={{ display:'flex', gap:'8px' }}>
                  {(['EN','JP','FR'] as const).map(l=>(
                    <button key={l} onClick={()=>setAddForm(p=>({...p,lang:l}))}
                      style={{ flex:1, padding:'9px', borderRadius:'8px', border:`1px solid ${addForm.lang===l?'rgba(255,107,53,.6)':'rgba(255,255,255,.1)'}`, background:addForm.lang===l?'rgba(255,107,53,.15)':'rgba(255,255,255,.04)', color:addForm.lang===l?'#FF9060':'rgba(255,255,255,.5)', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:'12px' }}>
                <div className="opt-label">Etat / Grade</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px', marginBottom:'10px' }}>
                  <button onClick={()=>handleConditionChange('Raw')}
                    style={{ padding:'10px', borderRadius:'8px', border:`1.5px solid ${!addForm.graded&&addForm.condition==='Raw'?'rgba(255,107,53,.7)':'rgba(255,255,255,.12)'}`, background:!addForm.graded&&addForm.condition==='Raw'?'rgba(255,107,53,.18)':'rgba(255,255,255,.04)', color:!addForm.graded&&addForm.condition==='Raw'?'#FF9060':'rgba(255,255,255,.5)', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                    Raw
                  </button>
                  <button onClick={()=>handleConditionChange('__graded__')}
                    style={{ padding:'10px', borderRadius:'8px', border:`1.5px solid ${addForm.graded?'rgba(255,107,53,.7)':'rgba(255,255,255,.12)'}`, background:addForm.graded?'rgba(255,107,53,.18)':'rgba(255,255,255,.04)', color:addForm.graded?'#FF9060':'rgba(255,255,255,.5)', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                    Grade
                  </button>
                  <button onClick={()=>handleConditionChange('Scelle')}
                    style={{ padding:'10px', borderRadius:'8px', border:`1.5px solid ${!addForm.graded&&addForm.condition==='Scelle'?'rgba(255,107,53,.7)':'rgba(255,255,255,.12)'}`, background:!addForm.graded&&addForm.condition==='Scelle'?'rgba(255,107,53,.18)':'rgba(255,255,255,.04)', color:!addForm.graded&&addForm.condition==='Scelle'?'#FF9060':'rgba(255,255,255,.5)', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                    Scelle
                  </button>
                </div>
                {addForm.graded&&(
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'6px' }}>
                    {GRADE_COMPANIES.map(company=>{
                      const isActive = addForm.condition.startsWith(company.label+' ')
                      const curVal = isActive ? addForm.condition.replace(company.label+' ','') : ''
                      return (
                        <div key={company.label}>
                          <div style={{ fontSize:'9px', color:isActive?'#FF9060':'rgba(255,255,255,.3)', fontFamily:'var(--font-display)', marginBottom:'5px', fontWeight:isActive?700:400, textAlign:'center' as const }}>{company.label}</div>
                          <select value={curVal} onChange={e=>{ if(e.target.value) handleConditionChange(company.label+' '+e.target.value) }}
                            style={{ width:'100%', appearance:'none' as const, background:isActive?'rgba(255,107,53,.15)':'rgba(255,255,255,.05)', border:`1px solid ${isActive?'rgba(255,107,53,.5)':'rgba(255,255,255,.1)'}`, borderRadius:'7px', padding:'7px 4px', color:isActive?'#FF9060':'rgba(255,255,255,.45)', fontSize:'11px', fontWeight:600, fontFamily:'var(--font-display)', outline:'none', cursor:'pointer', textAlign:'center' as const }}>
                            <option value="">-</option>
                            {company.grades.map(g=>{
                              const shortG = g.replace(company.label+' ','')
                              return <option key={g} value={shortG} style={{background:'#111'}}>{shortG}</option>
                            })}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Prix + Quantité */}
              {addForm.name && !addForm.buyPrice && (
                <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px', borderRadius:'10px', background:'rgba(255,107,53,.07)', border:'1px solid rgba(255,107,53,.18)', marginBottom:'10px', animation:'fadeUp .25s ease-out' }}>
                  <span style={{ fontSize:'16px' }}>💰</span>
                  <div>
                    <div style={{ fontSize:'11px', fontWeight:700, color:'#FF9060', fontFamily:'var(--font-display)' }}>Dernière étape — indiquez votre prix d'achat</div>
                    <div style={{ fontSize:'10px', color:'rgba(255,107,53,.5)', marginTop:'1px' }}>Nécessaire pour calculer votre ROI</div>
                  </div>
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'14px' }}>
                <div>
                  <div className="req-label">Prix d'achat EUR *</div>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'14px', color:'rgba(255,255,255,.3)', fontFamily:'var(--font-display)', pointerEvents:'none' }}>€</span>
                    <input type="number" value={addForm.buyPrice} onChange={e=>setAddForm(p=>({...p,buyPrice:e.target.value}))}
                      placeholder="0.00"
                      autoFocus={!!(addForm.name && !addForm.buyPrice)}
                      className={addForm.buyPrice?'req-field-ok':'req-field'}
                      style={{ width:'100%', background: !addForm.buyPrice && addForm.name ? 'rgba(255,107,53,.06)' : 'rgba(255,255,255,.07)', borderRadius:'9px', padding:'10px 12px 10px 26px', color:'#fff', fontSize:'18px', fontWeight:700, fontFamily:'var(--font-display)', outline:'none', boxSizing:'border-box' as const, transition:'all .2s' }}/>
                  </div>
                </div>
                <div>
                  <div className="opt-label">Exemplaires</div>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                    <button onClick={()=>setAddForm(p=>({...p,qty:Math.max(1,p.qty-1)}))} style={{ width:'38px', height:'38px', borderRadius:'8px', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', color:'#fff', fontSize:'20px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>-</button>
                    <div style={{ flex:1, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', borderRadius:'9px', padding:'9px 0', textAlign:'center' as const, fontSize:'18px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)' }}>{addForm.qty}</div>
                    <button onClick={()=>setAddForm(p=>({...p,qty:Math.min(99,p.qty+1)}))} style={{ width:'38px', height:'38px', borderRadius:'8px', background:'rgba(255,107,53,.2)', border:'1px solid rgba(255,107,53,.4)', color:'#FF9060', fontSize:'20px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>+</button>
                  </div>
                </div>
              </div>

              {!canAdd&&(
                <div style={{ display:'flex', alignItems:'center', gap:'7px', padding:'9px 12px', borderRadius:'9px', background:'rgba(255,107,53,.07)', border:'1px solid rgba(255,107,53,.2)', marginBottom:'12px' }}>
                  <span style={{ fontSize:'11px', color:'rgba(255,107,53,.85)', fontFamily:'var(--font-display)' }}>
                    {!addForm.set?'Selectionnez une serie':!addForm.name?'Renseignez le nom':''}
                    {' '}pour activer le bouton
                  </span>
                </div>
              )}

              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={addCard} disabled={!canAdd}
                  style={{ flex:1, padding:'13px', borderRadius:'11px', background:canAdd?'linear-gradient(135deg,#E03020,#FF4433)':'rgba(255,255,255,.06)', color:canAdd?'#fff':'rgba(255,255,255,.2)', border:'none', fontSize:'14px', fontWeight:600, cursor:canAdd?'pointer':'default', fontFamily:'var(--font-display)', boxShadow:canAdd?'0 4px 16px rgba(224,48,32,.4)':'none', transition:'all .2s' }}>
                  Ajouter {addForm.qty>1?addForm.qty+' exemplaires':'au portfolio'}
                </button>
                <button onClick={()=>{ setAddOpen(false); setAddSuggs([]) }}
                  style={{ padding:'13px 20px', borderRadius:'11px', background:'rgba(255,255,255,.05)', color:'rgba(255,255,255,.5)', border:'1px solid rgba(255,255,255,.1)', fontSize:'14px', cursor:'pointer', fontFamily:'var(--font-display)' }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div style={{ position:'relative', zIndex:1, padding:'28px 28px 20px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'16px', marginBottom:'22px' }}>
            <div>
              <div style={{ fontSize:'10px', fontWeight:500, color:'rgba(255,255,255,.25)', textTransform:'uppercase' as const, letterSpacing:'.15em', fontFamily:'var(--font-display)', marginBottom:'6px' }}>Portfolio</div>
              <div style={{ fontSize:'38px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-1.5px', lineHeight:1 }}>
                {portfolio.length>0?'EUR '+totalCur.toLocaleString('fr-FR'):'---'}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'6px' }}>
                {portfolio.length>0&&totalBuy>0&&<span style={{ fontSize:'14px', fontWeight:500, color:'#4ECCA3' }}>+{totalROI}% | +EUR {totalGain.toLocaleString('fr-FR')}</span>}
                {portfolio.length>0&&<span style={{ fontSize:'13px', color:'rgba(255,255,255,.35)' }}>{portfolio.length} carte{portfolio.length!==1?'s':''}</span>}
                {portfolio.length===0&&<span style={{ fontSize:'13px', color:'rgba(255,255,255,.25)' }}>Aucune carte - commencez votre collection</span>}
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
              {bestCard&&bestCard.buyPrice>0&&(
                <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:'12px', padding:'12px 16px' }}>
                  <div style={{ fontSize:'9px', color:'rgba(255,255,255,.3)', textTransform:'uppercase' as const, letterSpacing:'.08em', fontFamily:'var(--font-display)', marginBottom:'4px' }}>Meilleure perf.</div>
                  <div style={{ fontSize:'18px', fontWeight:600, color:'#FFD700', fontFamily:'var(--font-display)' }}>+{Math.round(((bestCard.curPrice-bestCard.buyPrice)/bestCard.buyPrice)*100)}%</div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,.3)' }}>{bestCard.name}</div>
                </div>
              )}
              <button onClick={()=>{ setShareCtx('portfolio'); setShareCard(null); setShareOpen(true) }} style={{ padding:'10px 18px', borderRadius:'12px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>Partager</button>
            </div>
          </div>
          <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
            {([['binder','Binder'],['showcase','Vitrine'],['wrapped','Wrapped 2026']] as Array<[ViewMode,string]>).map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)} className={'vtab'+(view===v?' on':'')}>{l}</button>
            ))}
          </div>
          {view==='binder' && portfolio.length>0 && (
            <div style={{ display:'flex', gap:'4px', marginTop:'10px' }}>
              <button onClick={()=>{ setBinderSet(null); setBinderPage(0) }}
                style={{ padding:'5px 14px', borderRadius:'99px', border:`1px solid ${!binderSet?'rgba(255,255,255,.3)':'rgba(255,255,255,.08)'}`, background:!binderSet?'rgba(255,255,255,.1)':'transparent', color:!binderSet?'#fff':'rgba(255,255,255,.4)', fontSize:'11px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .15s' }}>
                Par sets
              </button>
              <button onClick={()=>{ setBinderSet('__all__'); setBinderPage(0) }}
                style={{ padding:'5px 14px', borderRadius:'99px', border:`1px solid ${binderSet==='__all__'?'rgba(255,255,255,.3)':'rgba(255,255,255,.08)'}`, background:binderSet==='__all__'?'rgba(255,255,255,.1)':'transparent', color:binderSet==='__all__'?'#fff':'rgba(255,255,255,.4)', fontSize:'11px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .15s' }}>
                Toute ma collection
              </button>
            </div>
          )}
        </div>

        {/* BINDER */}
        {view==='binder'&&(
          <div style={{ position:'relative', zIndex:1, padding:'0 24px 28px', animation:'fadeUp .3s ease-out' }}>
            <div style={{ background:'linear-gradient(160deg,#1C1008 0%,#130C05 50%,#1C1008 100%)', borderRadius:'18px', boxShadow:'0 24px 60px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.05)', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.018) 39px,rgba(255,255,255,.018) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.018) 39px,rgba(255,255,255,.018) 40px)', pointerEvents:'none' }}/>
              <div style={{ position:'relative', padding:'22px 22px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
                  <div>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,.22)', textTransform:'uppercase' as const, letterSpacing:'.12em', fontFamily:'var(--font-display)' }}>Ma Collection</div>
                    <div style={{ fontSize:'13px', color:'rgba(255,255,255,.5)', fontFamily:'var(--font-display)', marginTop:'2px' }}>
                  {binderSet
                    ? <button onClick={()=>setBinderSet(null)} style={{ background:'none', border:'none', color:'rgba(255,107,53,.8)', cursor:'pointer', fontSize:'12px', fontFamily:'var(--font-display)', padding:0, display:'flex', alignItems:'center', gap:'4px' }}>← Tous les sets</button>
                    : <>{portfolio.length} carte{portfolio.length!==1?'s':''} · {[...new Set(portfolio.map(c=>c.set))].length} set{[...new Set(portfolio.map(c=>c.set))].length!==1?'s':''}</>
                  }
                  {binderSet && (
                    <button onClick={()=>setBinderSet('__all__')} style={{ background:'none', border:'none', color:'rgba(255,255,255,.3)', cursor:'pointer', fontSize:'11px', fontFamily:'var(--font-display)', padding:'0 0 0 10px', textDecoration:'underline' }}>
                      Toute ma collection
                    </button>
                  )}
                </div>
                  </div>
                  <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                    <button onClick={()=>setAddOpen(true)} style={{ padding:'6px 14px', borderRadius:'8px', background:'rgba(255,107,53,.15)', border:'1px solid rgba(255,107,53,.4)', color:'#FF9060', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const }}>
                      + Ajouter une carte ou un item
                    </button>
                    <button onClick={()=>setImportOpen(true)} style={{ padding:'6px 14px', borderRadius:'8px', background:'rgba(66,165,245,.12)', border:'1px solid rgba(66,165,245,.35)', color:'#60aef7', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const }}>
                      ↑ Importer votre collection
                    </button>
                    <button onClick={()=>setScannerOpen(true)} style={{ padding:'6px 14px', borderRadius:'8px', background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.3)', color:'#10b981', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const }}>
                      📷 Scanner
                    </button>
                    {[3,4,5].map(n=>(
                      <button key={n} onClick={()=>{setBinderCols(n);setBinderPage(0)}} className="colbtn" style={{ border:`1px solid ${binderCols===n?'rgba(255,255,255,.3)':'rgba(255,255,255,.08)'}`, background:binderCols===n?'rgba(255,255,255,.12)':'transparent', color:binderCols===n?'#fff':'rgba(255,255,255,.35)' }}>{n}</button>
                    ))}
                    <button onClick={()=>setBinderPage(p=>Math.max(0,p-1))} disabled={binderPage===0} style={{ width:'28px', height:'28px', borderRadius:'7px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:binderPage===0?'rgba(255,255,255,.2)':'rgba(255,255,255,.55)', cursor:binderPage===0?'default':'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center' }}>&#8249;</button>
                    <button onClick={()=>setBinderPage(p=>Math.min(binderPages-1,p+1))} disabled={binderPage>=binderPages-1} style={{ width:'28px', height:'28px', borderRadius:'7px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:binderPage>=binderPages-1?'rgba(255,255,255,.2)':'rgba(255,255,255,.55)', cursor:binderPage>=binderPages-1?'default':'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center' }}>&#8250;</button>
                  </div>
                </div>

                {portfolio.length===0?(
                  <div style={{ textAlign:'center', padding:'64px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:'16px' }}>
                    <div style={{ fontSize:'14px', color:'rgba(255,255,255,.3)', fontFamily:'var(--font-display)' }}>Collection vide</div>
                    <div style={{ fontSize:'12px', color:'rgba(255,255,255,.2)', fontFamily:'var(--font-display)', maxWidth:'260px' }}>Ajoutez votre premiere carte pour commencer</div>
                    <button onClick={()=>setAddOpen(true)} style={{ padding:'11px 24px', borderRadius:'11px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                      + Ajouter ma première carte
                    </button>
                  </div>
                ) : (!binderSet || binderSet==='__all__') && binderSet!=='__all__' ? (
                  /* VUE SETS */
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'12px' }}>
                    {/* Tuile "Toute ma collection" */}
                    {(()=>{
                      const allPreviews = portfolio.filter(c=>c.image).slice(0,3)
                      return (
                        <div onClick={()=>{ setBinderSet('__all__'); setBinderPage(0) }}
                          style={{ aspectRatio:'63/88', borderRadius:'14px', overflow:'hidden', cursor:'pointer', position:'relative', background:'linear-gradient(145deg,rgba(255,107,53,.18),rgba(255,107,53,.06))', border:'1.5px solid rgba(255,107,53,.3)', transition:'all .22s cubic-bezier(.34,1.2,.64,1)', boxShadow:'0 4px 20px rgba(0,0,0,.4)' }}
                          onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-6px) scale(1.03)'; e.currentTarget.style.boxShadow='0 12px 36px rgba(255,107,53,.2)' }}
                          onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,.4)' }}>
                          <div style={{ position:'absolute', inset:0, display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'1fr 1fr', gap:'3px', padding:'3px', opacity:.35 }}>
                            {allPreviews.map((c,i)=>(
                              <div key={i} style={{ borderRadius:'4px', overflow:'hidden', background:'rgba(255,255,255,.05)' }}>
                                {c.image&&<img src={`${c.image.replace(/\/low\.(webp|jpg|png)$/,'')}/low.webp`} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{ (e.target as HTMLImageElement).style.display='none' }}/>}
                              </div>
                            ))}
                          </div>
                          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.82) 0%, rgba(0,0,0,.15) 60%, transparent 100%)', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'12px 10px' }}>
                            <div style={{ fontSize:'10px', fontWeight:800, color:'#FF9060', fontFamily:'var(--font-display)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:'4px' }}>📚 Collection</div>
                            <div style={{ fontSize:'13px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)', marginBottom:'4px', lineHeight:1.2 }}>Toutes mes cartes</div>
                            <div style={{ fontSize:'9px', color:'rgba(255,255,255,.5)', fontFamily:'var(--font-display)' }}>{portfolio.length} cartes · {[...new Set(portfolio.map(c=>c.set))].length} sets</div>
                          </div>
                        </div>
                      )
                    })()}
                    {[...new Set(portfolio.map(c=>c.set))].map(setName => {
                      const setCards = portfolio.filter(c=>c.set===setName)
                      const total    = setCards[0]?.setTotal || 0
                      const pct      = total>0 ? Math.round((setCards.length/total)*100) : null
                      const preview  = setCards.find(c=>c.image)
                      const ec2      = EC[setCards[0]?.type??'fire']??'#888'
                      const isComplete = pct===100
                      return (
                        <div key={setName} onClick={()=>{ setBinderSet(setName); setBinderPage(0) }}
                          style={{ aspectRatio:'63/88', borderRadius:'14px', overflow:'hidden', cursor:'pointer', position:'relative', background:`linear-gradient(145deg,${ec2}22,${ec2}08)`, border:`1.5px solid ${isComplete?'rgba(255,215,0,.5)':ec2+'30'}`, transition:'all .22s cubic-bezier(.34,1.2,.64,1)', boxShadow:isComplete?'0 4px 20px rgba(255,215,0,.15)':'0 4px 16px rgba(0,0,0,.4)' }}
                          onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-6px) scale(1.03)'; e.currentTarget.style.boxShadow=isComplete?'0 12px 36px rgba(255,215,0,.25)':`0 12px 32px ${ec2}40` }}
                          onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=isComplete?'0 4px 20px rgba(255,215,0,.15)':'0 4px 16px rgba(0,0,0,.4)' }}>
                          {/* Image preview plein format */}
                          {preview?.image ? (
                            <img src={`${preview.image.replace(/\/low\.(webp|jpg|png)$/,'')}/low.webp`} alt={setName}
                              style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:.7 }}
                              onError={e=>{ (e.target as HTMLImageElement).style.display='none' }}/>
                          ) : (
                            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <div style={{ width:'52px', height:'52px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec2}CC,${ec2}44)`, boxShadow:`0 0 24px ${ec2}66` }}/>
                            </div>
                          )}
                          {/* Gradient + infos */}
                          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.82) 0%, rgba(0,0,0,.2) 55%, rgba(0,0,0,.0) 100%)' }}/>
                          {/* Badge completion */}
                          {pct!==null&&(
                            <div style={{ position:'absolute', top:'8px', right:'8px', fontSize:'9px', fontWeight:800, background:isComplete?'linear-gradient(135deg,#FFD700,#FF8C00)':'rgba(0,0,0,.75)', backdropFilter:'blur(4px)', color:'#fff', padding:'3px 8px', borderRadius:'8px', fontFamily:'var(--font-display)', boxShadow:isComplete?'0 2px 8px rgba(255,215,0,.4)':'none' }}>
                              {isComplete?'✓ Complet':pct+'%'}
                            </div>
                          )}
                          {/* Barre de progression */}
                          {pct!==null&&!isComplete&&(
                            <div style={{ position:'absolute', top:'8px', left:'8px', right:'8px', height:'2px', background:'rgba(255,255,255,.1)', borderRadius:'2px', overflow:'hidden' }}>
                              <div style={{ width:pct+'%', height:'100%', background:'#4ECCA3', borderRadius:'2px', transition:'width .3s' }}/>
                            </div>
                          )}
                          {/* Infos bas */}
                          <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'10px 10px 10px' }}>
                            <div style={{ fontSize:'11px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:'3px', textShadow:'0 1px 4px rgba(0,0,0,.8)' }}>{setName}</div>
                            <div style={{ fontSize:'9px', color:'rgba(255,255,255,.5)', fontFamily:'var(--font-display)' }}>
                              {setCards.length}{total>0?' / '+total:''} carte{setCards.length!==1?'s':''}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ):(
                  <div style={{ display:'grid', gridTemplateColumns:`repeat(${binderCols},1fr)`, gap:'10px' }}>
                    {pageItems.map((card,idx)=>{
                      const ec=EC[card.type]??'#888', eg=EG[card.type]??'rgba(128,128,128,.4)'
                      const isHolo=HOLO_RARITIES.includes(card.rarity)
                      const roi=card.buyPrice>0?Math.round(((card.curPrice-card.buyPrice)/card.buyPrice)*100):0
                      const orbSz=binderCols<=3?'36px':binderCols===4?'28px':'24px'
                      const fsName=binderCols<=3?'11px':binderCols===4?'10px':'9px'
                      const fsPx=binderCols<=3?'13px':binderCols===4?'12px':'11px'
                      return (
                        <div key={card.id}
                          className={'pocket-shell gem'+(card.signal==='S'?' breathe-S':card.signal==='A'?' breathe-A':'')}
                          style={{ aspectRatio:'2/3', background:`linear-gradient(145deg,${ec}20,${ec}08)`, border:`1.5px solid ${ec}45`, boxShadow:'0 4px 14px rgba(0,0,0,.5)', animation:`cardIn .3s ${Math.min(idx,8)*.04}s ease-out both` }}
                          onMouseMove={tiltCard}
                          onMouseLeave={e=>{ resetCard(e); const rb=e.currentTarget.querySelector('.remove-btn') as HTMLElement|null; if(rb) rb.style.opacity='0' }}
                          onMouseEnter={e=>{ const rb=e.currentTarget.querySelector('.remove-btn') as HTMLElement|null; if(rb) rb.style.opacity='1' }}
                          onClick={()=>{ setSpotCard(card); setEditQty(null) }}>
                          {isHolo&&<div className="holo"/>}
                          {isHolo&&<div className="hm"/>}
                          <div className="ptcl" style={{ background:ec, bottom:'22%', left:'20%' }}/>
                          <div className="ptcl" style={{ background:ec, bottom:'35%', left:'62%' }}/>
                          <div style={{ position:'absolute', top:0, left:0, right:0, height:'2.5px', background:`linear-gradient(90deg,${ec},${ec}44)`, zIndex:4 }}/>
                          <div style={{ position:'absolute', top:'8px', left:'8px', right:'8px', bottom:'54px', borderRadius:'7px', background:`${ec}12`, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                            {card.image ? (()=>{
                              const imgBase = card.image.replace(/\/low\.(webp|jpg|png)$/, '')
                              return <img src={`${imgBase}/low.webp`} alt={card.name}
                                style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }}
                                onError={e=>{ const t=e.target as HTMLImageElement; if(t.src.includes('.webp')) t.src=`${imgBase}/low.jpg`; else t.style.display='none' }}
                              />
                            })() : (
                              <>
                                <div style={{ position:'absolute', width:'65%', height:'65%', borderRadius:'50%', background:eg, filter:'blur(14px)', opacity:.6 }}/>
                                <div style={{ width:orbSz, height:orbSz, borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec}CC,${ec}77)`, boxShadow:`0 0 16px ${eg}`, position:'relative', zIndex:1 }}/>
                              </>
                            )}
                            {card.signal&&<div style={{ position:'absolute', top:'4px', right:'4px', fontSize:'7px', fontWeight:700, background:TIER_BG[card.signal], color:'#fff', padding:'1px 5px', borderRadius:'3px', fontFamily:'var(--font-display)', zIndex:2 }}>{card.signal}</div>}
                            {favs.has(card.id)&&<div style={{ position:'absolute', top:'4px', left:'4px', fontSize:'10px', zIndex:2 }}>H</div>}
                            {card.graded&&<div style={{ position:'absolute', bottom:'4px', right:'4px', fontSize:'7px', fontWeight:700, background:'rgba(0,0,0,.75)', color:'rgba(255,255,255,.9)', padding:'1px 5px', borderRadius:'3px', fontFamily:'var(--font-display)', zIndex:2 }}>{card.condition}</div>}
                            {card.qty>1&&<div style={{ position:'absolute', bottom:'4px', left:'4px', zIndex:4, background:'rgba(0,0,0,.82)', border:'1px solid rgba(255,255,255,.25)', borderRadius:'10px', padding:'1px 5px', fontSize:'7px', fontWeight:700, color:'rgba(255,255,255,.85)', fontFamily:'var(--font-display)', lineHeight:1.6 }}>x{card.qty}</div>}
                          </div>
                          <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(to top, rgba(0,0,0,.95) 0%, rgba(0,0,0,.85) 60%, rgba(0,0,0,.4) 100%)', backdropFilter:'blur(10px)', padding:'10px 10px 9px' }}>
                            {/* Nom + ROI */}
                            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'4px', marginBottom:'5px' }}>
                              <div style={{ fontSize:fsName, fontWeight:700, color:'#fff', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.2, flex:1 }}>{card.name}</div>
                              {card.buyPrice>0&&<div style={{ fontSize:'10px', fontWeight:800, color:roi>=0?'#4ECCA3':'#FF6B8A', flexShrink:0, lineHeight:1.2 }}>{roi>=0?'+':''}{roi}%</div>}
                            </div>
                            {/* Langue · numéro · année */}
                            <div style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:'4px' }}>
                              <span style={{ fontSize:'11px' }}>{card.lang==='EN'?'🇺🇸':card.lang==='FR'?'🇫🇷':'🇯🇵'}</span>
                              {card.number&&card.number!=='???'&&<span style={{ fontSize:'9px', color:'rgba(255,255,255,.6)', fontFamily:'monospace', fontWeight:600 }}>#{card.number}</span>}
                              {card.year>0&&<span style={{ fontSize:'9px', color:'rgba(255,255,255,.35)' }}>· {card.year}</span>}
                            </div>
                            {/* Rareté + grade + set */}
                            <div style={{ display:'flex', alignItems:'center', gap:'3px', flexWrap:'nowrap', overflow:'hidden' }}>
                              {card.rarity&&card.rarity!==''&&(
                                <span style={{ fontSize:'8px', fontWeight:700, color:'rgba(255,215,0,.9)', background:'rgba(255,215,0,.12)', border:'1px solid rgba(255,215,0,.25)', borderRadius:'4px', padding:'1px 5px', fontFamily:'var(--font-display)', flexShrink:0, whiteSpace:'nowrap' }}>{card.rarity}</span>
                              )}
                              {card.graded&&(
                                <span style={{ fontSize:'8px', fontWeight:700, color:'rgba(255,255,255,.9)', background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', borderRadius:'4px', padding:'1px 5px', fontFamily:'var(--font-display)', flexShrink:0 }}>⭐ {card.condition}</span>
                              )}
                              <span style={{ fontSize:'8px', color:'rgba(255,255,255,.3)', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.set}</span>
                            </div>
                          </div>
                          <button className="remove-btn" onClick={e=>removeCard(card,e)}
                            style={{ position:'absolute', top:'6px', left:'50%', transform:'translateX(-50%)', zIndex:20, background:'rgba(0,0,0,.8)', border:'1px solid rgba(255,255,255,.2)', color:'rgba(255,255,255,.85)', borderRadius:'20px', padding:'3px 10px', fontSize:'9px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', opacity:0, transition:'opacity .2s', whiteSpace:'nowrap', backdropFilter:'blur(4px)' }}>
                            Retirer
                          </button>
                        </div>
                      )
                    })}
                    {Array.from({length:phantomCount}).map((_,i)=>(
                      <div key={'ph-'+i} onClick={()=>setAddOpen(true)}
                        style={{ aspectRatio:'2/3', borderRadius:'9px', border:'1.5px dashed rgba(255,255,255,.07)', background:'rgba(255,255,255,.01)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}
                        onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(255,107,53,.3)'; e.currentTarget.style.background='rgba(255,107,53,.04)' }}
                        onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,.07)'; e.currentTarget.style.background='rgba(255,255,255,.01)' }}>
                        <span style={{ fontSize:'20px', color:'rgba(255,255,255,.08)' }}>+</span>
                      </div>
                    ))}
                  </div>
                )}
                {binderPages>1&&(
                  <div style={{ display:'flex', justifyContent:'center', gap:'6px', marginTop:'16px' }}>
                    {Array.from({length:binderPages}).map((_,i)=>(
                      <div key={i} onClick={()=>setBinderPage(i)} style={{ height:'4px', borderRadius:'2px', background:i===binderPage?'rgba(255,255,255,.55)':'rgba(255,255,255,.15)', cursor:'pointer', transition:'all .2s', width:i===binderPage?'18px':'6px' }}/>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VITRINE */}
        {view==='showcase'&&(
          <div style={{ position:'relative', zIndex:1, padding:'0 24px 28px', animation:'fadeUp .3s ease-out' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px' }}>
              <div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,.25)', textTransform:'uppercase' as const, letterSpacing:'.15em', fontFamily:'var(--font-display)', marginBottom:'4px' }}>Vitrine</div>
                <div style={{ fontSize:'13px', color:'rgba(255,255,255,.45)', fontFamily:'var(--font-display)' }}>{showcase.length===0?'Exposez vos plus belles pieces':showcase.length+' piece'+(showcase.length!==1?'s':'')+' exposee'+(showcase.length!==1?'s':'')}</div>
              </div>
              <button onClick={()=>{ if(portfolio.length===0){ showToast('Ajoutez des cartes a votre collection') }else{ setShowPickerForShowcase(true) } }}
                style={{ padding:'9px 18px', borderRadius:'10px', background:'rgba(255,107,53,.15)', border:'1px solid rgba(255,107,53,.4)', color:'#FF9060', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const }}>
                + Ajouter une carte de ma collection
              </button>
            </div>
            {showcase.length===0?(
              <div style={{ textAlign:'center', padding:'80px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:'18px' }}>
                <div style={{ fontSize:'15px', color:'rgba(255,255,255,.3)', fontFamily:'var(--font-display)' }}>Vitrine vide</div>
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,.2)', fontFamily:'var(--font-display)', maxWidth:'280px' }}>Exposez vos pieces maitresses. Partagez-les avec votre communaute.</div>
                {portfolio.length>0&&(
                  <button onClick={()=>setShowPickerForShowcase(true)} style={{ padding:'10px 22px', borderRadius:'10px', background:'rgba(255,107,53,.15)', border:'1px solid rgba(255,107,53,.4)', color:'#FF9060', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                    Choisir depuis ma collection
                  </button>
                )}
              </div>
            ):(
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'16px' }}>
                {showcase.map((card,idx)=>{
                  const ec=EC[card.type]??'#888', eg=EG[card.type]??'rgba(128,128,128,.4)'
                  const roi=card.buyPrice>0?Math.round(((card.curPrice-card.buyPrice)/card.buyPrice)*100):0
                  const isHolo=HOLO_RARITIES.includes(card.rarity)
                  const ls=LS[card.lang]
                  return (
                    <div key={card.id}
                      draggable
                      onDragStart={()=>setDragIdx(idx)}
                      onDragOver={e=>{ e.preventDefault() }}
                      onDrop={()=>{
                        if(dragIdx===null||dragIdx===idx) return
                        setShowcase(prev=>{ const a=[...prev]; const [item]=a.splice(dragIdx,1); a.splice(idx,0,item); return a })
                        setDragIdx(null)
                      }}
                      onDragEnd={()=>setDragIdx(null)}
                      className={'gem'+(card.signal==='S'?' breathe-S':card.signal==='A'?' breathe-A':'')}
                      style={{ background:`linear-gradient(160deg,${ec}18,${ec}06)`, border:`1.5px solid ${dragIdx===idx?'rgba(255,107,53,.6)':ec+'35'}`, animation:`cardIn .35s ${Math.min(idx,10)*.04}s ease-out both`, opacity:dragIdx===idx?.5:1, cursor:'grab' }}
                      onMouseMove={tiltCard} onMouseLeave={resetCard} onClick={()=>{ setSpotCard(card); setEditQty(null) }}>
                      {isHolo&&<div className="holo"/>}
                      {isHolo&&<div className="hm"/>}
                      <div className="ptcl" style={{ background:ec, bottom:'20%', left:'20%' }}/>
                      <div className="ptcl" style={{ background:ec, bottom:'30%', left:'60%' }}/>
                      <div style={{ height:'2.5px', background:`linear-gradient(90deg,${ec},${ec}55)`, position:'absolute', top:0, left:0, right:0 }}/>
                      {card.signal&&<div style={{ position:'absolute', top:'8px', right:'8px', zIndex:3, fontSize:'9px', fontWeight:700, background:TIER_BG[card.signal], color:'#fff', padding:'3px 8px', borderRadius:'6px', fontFamily:'var(--font-display)' }}>{card.signal}</div>}
                      {/* FULL ART — image seule */}
                      <div style={{ aspectRatio:'63/88', position:'relative', overflow:'hidden', borderRadius:'inherit', background:'#050505' }}>
                        {card.image ? (
                          <img src={`${card.image.replace(/\/low\.(webp|jpg|png)$/,'')}/high.webp`} alt={card.name}
                            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'transform .6s cubic-bezier(.34,1.15,.64,1)' }}
                            onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.06)')}
                            onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}
                            onError={e=>{ const t=e.target as HTMLImageElement; if(t.src.includes('.webp')) t.src=t.src.replace('.webp','.jpg'); else t.style.display='none' }}/>
                        ) : (
                          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:`linear-gradient(145deg,${ec}18,${ec}06)` }}>
                            <div style={{ position:'absolute', width:'65%', height:'65%', borderRadius:'50%', background:eg, filter:'blur(28px)', opacity:.5 }}/>
                            <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec}DD,${ec}88)`, boxShadow:`0 0 28px ${eg}`, zIndex:1 }}/>
                          </div>
                        )}
                        {/* Gradient overlay bas */}
                        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.88) 0%, rgba(0,0,0,.1) 45%, transparent 100%)', pointerEvents:'none' }}/>
                        {/* Drag handle */}
                        <div style={{ position:'absolute', top:'8px', left:'50%', transform:'translateX(-50%)', display:'flex', gap:'3px', opacity:.35, pointerEvents:'none' }}>
                          {[0,1,2].map(i=><div key={i} style={{ width:'3px', height:'3px', borderRadius:'50%', background:'#fff' }}/>)}
                        </div>
                        {/* Signal */}
                        {card.signal&&<div style={{ position:'absolute', top:'10px', right:'10px', fontSize:'9px', fontWeight:700, background:TIER_BG[card.signal], color:'#fff', padding:'3px 8px', borderRadius:'6px', fontFamily:'var(--font-display)', zIndex:2 }}>{card.signal}</div>}
                        {/* Infos bas overlay */}
                        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'14px 12px 12px', pointerEvents:'none' }}>
                          <div style={{ fontSize:'13px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textShadow:'0 1px 6px rgba(0,0,0,.8)' }}>{card.name}</div>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                              <span style={{ fontSize:'10px' }}>{ls.flag}</span>
                              <span style={{ fontSize:'9px', color:'rgba(255,255,255,.5)', fontFamily:'var(--font-display)' }}>{card.set}</span>
                            </div>
                            {card.graded&&<span style={{ fontSize:'8px', fontWeight:700, background:'rgba(0,0,0,.7)', color:'rgba(255,255,255,.9)', padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-display)' }}>⭐ {card.condition}</span>}
                          </div>
                        </div>
                        {/* Bouton retirer au hover */}
                        <button className="remove-btn" onClick={e=>removeFromShowcase(card.id,e)}
                          style={{ position:'absolute', top:'8px', left:'8px', zIndex:10, background:'rgba(0,0,0,.75)', backdropFilter:'blur(4px)', border:'1px solid rgba(255,255,255,.15)', color:'rgba(255,255,255,.8)', borderRadius:'8px', padding:'4px 10px', fontSize:'9px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', opacity:0, transition:'opacity .2s', pointerEvents:'all' }}>
                          Retirer
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* WRAPPED */}
        {view==='wrapped'&&(
          <div style={{ position:'relative', zIndex:1, animation:'wrappedIn .35s ease-out' }}>
            <div style={{ padding:'40px 28px 28px', textAlign:'center', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(ellipse at 50% 60%,rgba(255,107,53,.12) 0%,transparent 55%)', pointerEvents:'none' }}/>
              <div style={{ position:'relative' }}>
                <div style={{ fontSize:'11px', fontWeight:500, color:'rgba(255,255,255,.25)', textTransform:'uppercase' as const, letterSpacing:'.18em', fontFamily:'var(--font-display)', marginBottom:'12px' }}>Ta collection en chiffres</div>
                <div style={{ fontSize:'52px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-2px', lineHeight:1 }}>
                  {portfolio.length>0?'EUR '+totalCur.toLocaleString('fr-FR'):'---'}
                </div>
                {totalBuy>0&&<div style={{ fontSize:'16px', color:'#4ECCA3', marginTop:'8px', fontWeight:500 }}>+{totalROI}% depuis achat | +EUR {totalGain.toLocaleString('fr-FR')}</div>}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderTop:'1px solid rgba(255,255,255,.07)', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
              {([
                {l:'Cartes',v:String(portfolio.length),c:undefined},
                {l:'Meilleur ROI',v:bestCard&&bestCard.buyPrice>0?'+'+Math.round(((bestCard.curPrice-bestCard.buyPrice)/bestCard.buyPrice)*100)+'%':'---',c:'#FFD700'},
                {l:'Signaux S',v:String(portfolio.filter(c=>c.signal==='S').length),c:undefined},
                {l:'Favoris',v:String(favs.size),c:undefined},
              ]).map((s,i)=>(
                <div key={s.l} style={{ padding:'18px', borderRight:i<3?'1px solid rgba(255,255,255,.07)':'none', textAlign:'center' }}>
                  <div style={{ fontSize:'28px', fontWeight:600, color:s.c??'#fff', fontFamily:'var(--font-display)', letterSpacing:'-0.5px' }}>{s.v}</div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,.3)', marginTop:'4px', textTransform:'uppercase' as const, letterSpacing:'.08em', fontFamily:'var(--font-display)' }}>{s.l}</div>
                </div>
              ))}
            </div>
            {portfolio.filter(c=>c.buyPrice>0).length>0?(
              <div style={{ padding:'24px 28px' }}>
                <div style={{ fontSize:'10px', fontWeight:500, color:'rgba(255,255,255,.25)', textTransform:'uppercase' as const, letterSpacing:'.12em', fontFamily:'var(--font-display)', marginBottom:'14px' }}>Tes cartes les plus performantes</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {[...portfolio].filter(c=>c.buyPrice>0).sort((a,b)=>((b.curPrice-b.buyPrice)/b.buyPrice)-((a.curPrice-a.buyPrice)/a.buyPrice)).slice(0,3).map((card,i)=>{
                    const roi=Math.round(((card.curPrice-card.buyPrice)/card.buyPrice)*100), ec=EC[card.type]??'#888'
                    return(
                      <div key={card.id} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:'12px', padding:'12px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
                        <div style={{ fontSize:'20px', flexShrink:0 }}>{['1','2','3'][i]}</div>
                        <div style={{ width:'36px', height:'36px', borderRadius:'9px', background:`linear-gradient(145deg,${ec}25,${ec}10)`, border:`1px solid ${ec}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <div style={{ width:'14px', height:'14px', borderRadius:'50%', background:ec, opacity:.7 }}/>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'13px', fontWeight:500, color:'rgba(255,255,255,.8)', fontFamily:'var(--font-display)' }}>{card.name}</div>
                          <div style={{ fontSize:'10px', color:'rgba(255,255,255,.3)' }}>{card.set} - {card.year}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:'16px', fontWeight:600, color:'#4ECCA3', fontFamily:'var(--font-display)' }}>+{roi}%</div>
                          <div style={{ fontSize:'11px', color:'rgba(255,255,255,.35)' }}>EUR {card.curPrice}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ):(
              <div style={{ textAlign:'center', padding:'40px', color:'rgba(255,255,255,.2)', fontSize:'13px', fontFamily:'var(--font-display)' }}>
                Ajoutez des cartes avec un prix d achat pour voir votre Wrapped
              </div>
            )}
            <div style={{ padding:'0 28px 28px', display:'flex', gap:'8px' }}>
              <button onClick={()=>{ setShareCtx('wrapped'); setShareCard(null); setShareOpen(true) }} style={{ flex:1, padding:'14px', borderRadius:'12px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>Partager mon Wrapped 2026</button>
              <button style={{ padding:'14px 20px', borderRadius:'12px', background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.6)', border:'1px solid rgba(255,255,255,.1)', fontSize:'14px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)' }}>Sauvegarder</button>
            </div>
          </div>
        )}

        {/* SHARE SHEET */}
        {shareOpen&&(
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:45, display:'flex', alignItems:'flex-end' }} onClick={()=>{ setShareOpen(false); setSelectedFmt(null) }}>
            <div style={{ width:'100%', background:'#0F0B07', borderTop:'1px solid rgba(255,255,255,.12)', borderRadius:'16px 16px 0 0', padding:'22px 26px', animation:'shareUp .32s cubic-bezier(.22,.58,.36,1)' }} onClick={e=>e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                <div style={{ fontSize:'14px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)' }}>Partager</div>
                <button onClick={()=>{ setShareOpen(false); setSelectedFmt(null) }} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', fontSize:'20px', padding:0 }}>x</button>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={()=>{ navigator.clipboard.writeText('https://pokealphaterminal.io/share/demo'); showToast('Lien copie'); setShareOpen(false) }}
                  style={{ flex:1, padding:'12px', borderRadius:'10px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                  Copier le lien
                </button>
                <button onClick={()=>{ setRefCopied(true); setTimeout(()=>setRefCopied(false),2000) }}
                  style={{ padding:'12px 18px', borderRadius:'10px', background:'rgba(255,255,255,.06)', color:refCopied?'#4ECCA3':'rgba(255,255,255,.6)', border:'1px solid rgba(255,255,255,.1)', fontSize:'13px', cursor:'pointer', fontFamily:'var(--font-display)' }}>
                  {refCopied?'Copie!':'Parrainage'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      {/* ── WELCOME ── */}
      {showWelcome&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(7,5,3,.96)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',backdropFilter:'blur(12px)' }}>
          <div style={{ maxWidth:'420px',width:'100%',textAlign:'center',animation:'welcomeIn .5s cubic-bezier(.34,1.2,.64,1)' }}>
            <div style={{ fontSize:'64px',marginBottom:'20px',animation:'burst .6s .2s cubic-bezier(.34,1.4,.64,1) both' }}>📖</div>
            <div style={{ fontSize:'11px',fontWeight:700,color:'rgba(255,107,53,.8)',letterSpacing:'.2em',textTransform:'uppercase',fontFamily:'var(--font-display)',marginBottom:'12px' }}>Bienvenue sur PokéAlpha Terminal</div>
            <h2 style={{ fontSize:'28px',fontWeight:700,color:'#fff',fontFamily:'var(--font-display)',letterSpacing:'-1px',lineHeight:1.15,marginBottom:'14px' }}>
              Votre collection mérite<br/>
              <span style={{ background:'linear-gradient(135deg,#FF6B35,#FFD700,#FF6B35)',backgroundSize:'200% 200%',animation:'shimmerG 3s ease infinite',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}>d'être célébrée.</span>
            </h2>
            <p style={{ fontSize:'14px',color:'rgba(255,255,255,.4)',fontFamily:'var(--font-display)',lineHeight:1.7,marginBottom:'28px' }}>
              Ajoutez vos premières cartes et regardez votre binder prendre vie.
              Chaque carte est un souvenir, une victoire, une passion.
            </p>
            <button onClick={()=>setShowWelcome(false)}
              style={{ padding:'14px 36px',borderRadius:'12px',background:'linear-gradient(135deg,#E03020,#FF6B35)',color:'#fff',border:'none',fontSize:'14px',fontWeight:700,cursor:'pointer',fontFamily:'var(--font-display)',boxShadow:'0 8px 32px rgba(224,48,32,.45)',letterSpacing:'.03em' }}>
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
          color:['#FFD700','#FF6B35','#C855D4','#42A5F5','#4ECCA3','#FF6B8A','#fff'][i%7],
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
              <div style={{ fontSize:'11px',fontWeight:700,color:'#FFD700',letterSpacing:'.25em',textTransform:'uppercase',fontFamily:'var(--font-display)',marginBottom:'10px' }}>Set complété !</div>
              <h2 style={{ fontSize:'32px',fontWeight:700,color:'#fff',fontFamily:'var(--font-display)',letterSpacing:'-1px',marginBottom:'8px',lineHeight:1.2 }}>
                {celebSet}
              </h2>
              <p style={{ fontSize:'14px',color:'rgba(255,255,255,.5)',fontFamily:'var(--font-display)',marginBottom:'28px' }}>
                Vous avez complété ce set à 100%. Impressionnant.
              </p>
              <button onClick={()=>setCelebSet(null)}
                style={{ padding:'12px 32px',borderRadius:'10px',background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',color:'#fff',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)' }}>
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
                    {type:'text',text:'Identifie cette carte Pokémon TCG. Réponds UNIQUEMENT en JSON valide sans markdown: {"name":"nom exact de la carte","set":"nom du set","lang":"EN ou FR ou JP","type":"fire ou water ou psychic ou dark ou electric ou grass ou normal","year":2023}'}
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
                setId:'',image:'',setTotal:0,
              }))
              setScannerOpen(false); setScannerImg(null); setScannerLoad(false)
              setAddOpen(true)
              showToast('Carte identifiée — vérifiez et ajoutez')
            } catch { setScannerLoad(false); showToast('Identification échouée — saisissez manuellement') }
          }
          reader.readAsDataURL(file)
        }
        return (
          <div style={{ position:'fixed',inset:0,background:'rgba(7,5,3,.9)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',backdropFilter:'blur(10px)' }}
            onClick={()=>{ if(!scannerLoad){ setScannerOpen(false); setScannerImg(null) } }}>
            <div style={{ maxWidth:'340px',width:'100%',animation:'welcomeIn .3s ease-out' }} onClick={e=>e.stopPropagation()}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px' }}>
                <div>
                  <div style={{ fontSize:'16px',fontWeight:700,color:'#fff',fontFamily:'var(--font-display)' }}>📷 Scanner une carte</div>
                  <div style={{ fontSize:'11px',color:'rgba(255,255,255,.35)',marginTop:'3px' }}>L'IA identifie automatiquement la carte</div>
                </div>
                {!scannerLoad&&<button onClick={()=>{ setScannerOpen(false); setScannerImg(null) }} style={{ background:'none',border:'none',color:'rgba(255,255,255,.4)',cursor:'pointer',fontSize:'20px',padding:0 }}>×</button>}
              </div>

              {/* Frame */}
              <div className="scan-frame" style={{ position:'relative',width:'100%',aspectRatio:'63/88',borderRadius:'14px',border:'2px solid rgba(16,185,129,.4)',background:'#0a0a0a',overflow:'hidden',marginBottom:'16px',display:'flex',alignItems:'center',justifyContent:'center' }}>
                {scannerImg ? (
                  <img src={scannerImg} alt="scan" style={{ width:'100%',height:'100%',objectFit:'contain' }}/>
                ) : (
                  <>
                    <div style={{ textAlign:'center',color:'rgba(255,255,255,.2)' }}>
                      <div style={{ fontSize:'40px',marginBottom:'8px' }}>🎴</div>
                      <div style={{ fontSize:'11px',fontFamily:'var(--font-display)' }}>Photo de la carte</div>
                    </div>
                    {/* Scan line */}
                    <div className="scan-line" style={{ position:'absolute',left:0,right:0,height:'2px',background:'linear-gradient(90deg,transparent,rgba(16,185,129,.8),transparent)',pointerEvents:'none' }}/>
                    {/* Corner marks */}
                    {[[0,0,'top','left'],[0,100,'top','right'],[100,0,'bottom','left'],[100,100,'bottom','right']].map(([t,l,tb,lr],ci)=>(
                      <div key={ci} style={{ position:'absolute',[tb as string]:'-1px',[lr as string]:'-1px',width:'18px',height:'18px',borderTop:tb==='top'?'2px solid #10b981':'none',borderBottom:tb==='bottom'?'2px solid #10b981':'none',borderLeft:lr==='left'?'2px solid #10b981':'none',borderRight:lr==='right'?'2px solid #10b981':'none' }}/>
                    ))}
                  </>
                )}
                {scannerLoad&&(
                  <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,.75)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'10px' }}>
                    <div style={{ width:'24px',height:'24px',border:'2px solid rgba(16,185,129,.3)',borderTop:'2px solid #10b981',borderRadius:'50%',animation:'spin .8s linear infinite' }}/>
                    <div style={{ fontSize:'11px',color:'rgba(255,255,255,.6)',fontFamily:'var(--font-display)' }}>Identification en cours…</div>
                  </div>
                )}
              </div>

              <input type="file" accept="image/*" capture="environment" style={{ display:'none' }}
                ref={el=>{ fileRef.current=el }}
                onChange={e=>{ const f=e.target.files?.[0]; if(f) handleScan(f) }}/>
              <button disabled={scannerLoad}
                onClick={()=>fileRef.current?.click()}
                style={{ width:'100%',padding:'13px',borderRadius:'10px',background:scannerLoad?'rgba(16,185,129,.15)':'linear-gradient(135deg,#059669,#10b981)',border:'none',color:'#fff',fontSize:'13px',fontWeight:700,cursor:scannerLoad?'default':'pointer',fontFamily:'var(--font-display)',transition:'all .2s' }}>
                {scannerLoad ? 'Analyse…' : scannerImg ? 'Réanalyser' : 'Choisir une photo'}
              </button>
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