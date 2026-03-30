'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type CardItem = {
  id: string; name: string; set: string; year: number; number: string
  rarity: string; type: string; lang: 'EN'|'JP'|'FR'
  condition: string; graded: boolean
  buyPrice: number; curPrice: number; qty: number
  psa?: number; signal?: 'S'|'A'|'B'; hot?: boolean; favorite?: boolean
}

// Encyclopédie PokéAlpha — base de données de référence (ne s'affiche pas dans le portfolio)
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
  EN:{flag:'🇺🇸',bg:'#FFF5F0',color:'#C84B00'},
  JP:{flag:'🇯🇵',bg:'#F0F5FF',color:'#003DAA'},
  FR:{flag:'🇫🇷',bg:'#F0FFF5',color:'#00660A'},
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

export function Holdings() {
  const router = useRouter()
  const [view,        setView]        = useState<ViewMode>('binder')
  const [binderCols,  setBinderCols]  = useState(4)
  const [binderPage,  setBinderPage]  = useState(0)
  // Portfolio vide par défaut — l'utilisateur ajoute ses cartes
  const [portfolio,   setPortfolio]   = useState<CardItem[]>([])
  // Vitrine — les cartes choisies depuis le portfolio
  const [showcase,    setShowcase]    = useState<CardItem[]>([])
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
    name:string; set:string; type:string; lang:'EN'|'JP'|'FR';
    condition:string; graded:boolean; buyPrice:string; qty:number; year:number;
  }>({name:'',set:'',type:'fire',lang:'EN',condition:'Raw',graded:false,buyPrice:'',qty:1,year:new Date().getFullYear()})
  const [toast, setToast] = useState<string|null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout>|null>(null)

  const totalBuy  = portfolio.reduce((s,c)=>s+c.buyPrice*c.qty,0)
  const totalCur  = portfolio.reduce((s,c)=>s+c.curPrice*c.qty,0)
  const totalGain = totalCur-totalBuy
  const totalROI  = totalBuy>0?Math.round((totalGain/totalBuy)*100):0
  const bestCard  = portfolio.length>0?[...portfolio].sort((a,b)=>((b.curPrice-b.buyPrice)/Math.max(b.buyPrice,1))-((a.curPrice-a.buyPrice)/Math.max(a.buyPrice,1)))[0]:null
  const slotsPer  = binderCols*3
  const binderPages = Math.max(1,Math.ceil(portfolio.length/slotsPer))
  const pageItems   = portfolio.slice(binderPage*slotsPer,(binderPage+1)*slotsPer)
  const phantomCount = Math.max(0,slotsPer-pageItems.length)

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
    showToast(card.name+' retirée')
  }

  // Encyclopédie helpers
  const encyclopediaLookup = (name:string, set:string): Partial<CardItem> => {
    const found = ENCYCLOPEDIA.find(cc=>cc.name.toLowerCase()===name.toLowerCase()&&(set===''||cc.set===set))
    if(found) return { type:found.type, year:found.year, number:found.number, psa:found.psa, curPrice:found.curPrice, signal:found.signal }
    return {}
  }
  const handleSetChange = (s:string) => { setAddForm(p=>({...p,set:s,name:''})); setAddSuggs([]) }
  const handleNameInput = (val:string) => {
    setAddForm(p=>({...p,name:val}))
    if(val.length<2){setAddSuggs([]);return}
    const pool = addForm.set?ENCYCLOPEDIA.filter(cc=>cc.set===addForm.set):ENCYCLOPEDIA
    const matches = pool.filter(cc=>cc.name.toLowerCase().includes(val.toLowerCase())).map(cc=>cc.name)
    setAddSuggs([...new Set(matches)].slice(0,6))
  }
  const handleSuggSelect = (name:string) => {
    const extra = encyclopediaLookup(name, addForm.set)
    setAddForm(p=>({...p,name,type:extra.type??p.type,year:extra.year??p.year}))
    setAddSuggs([])
  }
  const handleConditionChange = (cond:string) => {
    setAddForm(p=>({...p,condition:cond,graded:cond!=='Raw'&&cond!=='Scellé'}))
  }
  const addCard = () => {
    if(!addForm.name||!addForm.set||!addForm.buyPrice) return
    const extra = encyclopediaLookup(addForm.name, addForm.set)
    const bp = parseFloat(addForm.buyPrice)||0
    const newCard:CardItem = {
      id:'u'+Date.now(), name:addForm.name, set:addForm.set,
      year:extra.year??addForm.year, number:extra.number??'???',
      rarity:'', type:addForm.type, lang:addForm.lang,
      condition:addForm.condition, graded:addForm.graded,
      buyPrice:bp, curPrice:extra.curPrice??bp, qty:addForm.qty,
      psa:extra.psa, signal:extra.signal,
    }
    setPortfolio(prev=>[...prev,newCard])
    setAddOpen(false); setAddSuggs([])
    setAddForm({name:'',set:'',type:'fire',lang:'EN',condition:'Raw',graded:false,buyPrice:'',qty:1,year:new Date().getFullYear()})
    showToast(newCard.name+(newCard.qty>1?` ×${newCard.qty}`:'')+' ajoutée ✓')
  }
  const addToShowcase = (card:CardItem) => {
    if(showcase.find(c=>c.id===card.id)) return
    setShowcase(prev=>[...prev,card])
    setShowPickerForShowcase(false)
    showToast(card.name+' ajoutée à la vitrine ✓')
  }
  const removeFromShowcase = (id:string, e:React.MouseEvent) => {
    e.stopPropagation()
    setShowcase(prev=>prev.filter(c=>c.id!==id))
    showToast('Retirée de la vitrine')
  }

  const canAdd = !!(addForm.name&&addForm.set&&addForm.buyPrice)
  const missingHint = !addForm.set?'Sélectionne une série':!addForm.name?'Renseigne le nom':!addForm.buyPrice?'Renseigne le prix d\'achat':''

  return (
    <>
      <style>{`
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
        .pocket-shell::before { content:'';position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(180deg,rgba(255,255,255,.12),transparent);border-radius:9px 9px 0 0;z-index:10;pointer-events:none; }
        .pocket-shell::after  { content:'';position:absolute;bottom:0;left:0;right:0;height:8px;background:linear-gradient(0deg,rgba(0,0,0,.45),transparent);z-index:10;pointer-events:none; }
        .vtab { padding:7px 18px;border-radius:99px;border:1px solid rgba(255,255,255,.12);background:transparent;color:rgba(255,255,255,.4);font-size:12px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .15s; }
        .vtab.on { background:rgba(255,255,255,.12) !important;border-color:rgba(255,255,255,.3) !important;color:#fff !important; }
        .colbtn { width:28px;height:28px;border-radius:7px;font-size:11px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .15s; }
        .remove-btn { pointer-events:all !important; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
        .req-label { font-size:10px;font-weight:700;color:rgba(255,107,53,.9);font-family:var(--font-display);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px; }
        .opt-label { font-size:10px;color:rgba(255,255,255,.35);font-family:var(--font-display);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px; }
        .req-field { border:2px solid rgba(255,107,53,.35) !important; }
        .req-field:focus { border-color:rgba(255,107,53,.7) !important; }
        .req-field-ok { border:2px solid rgba(78,204,163,.4) !important; }
        select { color-scheme:dark; }
      `}</style>

      <div style={{ background:'#070503', minHeight:'100vh', borderRadius:'16px', overflow:'hidden', position:'relative' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(ellipse at 15% 30%,rgba(255,107,53,.07) 0%,transparent 40%),radial-gradient(ellipse at 85% 70%,rgba(126,87,194,.07) 0%,transparent 40%)', pointerEvents:'none', zIndex:0 }} />

        {toast&&(
          <div style={{ position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)', background:'rgba(10,6,2,.95)', color:'rgba(255,255,255,.85)', padding:'9px 20px', borderRadius:'22px', fontSize:'12px', fontWeight:500, border:'1px solid rgba(255,255,255,.12)', whiteSpace:'nowrap', zIndex:99, animation:'toastIn .3s ease-out', fontFamily:'var(--font-display)' }}>
            ✓ {toast}
          </div>
        )}

        {/* ── SPOTLIGHT ── */}
        {spotCard&&(()=>{
          const ec=EC[spotCard.type]??'#888', eg=EG[spotCard.type]??'rgba(128,128,128,.4)'
          const roi=spotCard.buyPrice>0?Math.round(((spotCard.curPrice-spotCard.buyPrice)/spotCard.buyPrice)*100):0
          const gain=(spotCard.curPrice-spotCard.buyPrice)*spotCard.qty
          const isHolo=HOLO_RARITIES.includes(spotCard.rarity)
          const curQty = editQty??spotCard.qty
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
                    <div style={{ height:'200px', margin:'6px 6px 0', borderRadius:'10px', background:`${ec}14`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', width:'75%', height:'75%', borderRadius:'50%', background:eg, filter:'blur(28px)', opacity:.65 }}/>
                      <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec}DD,${ec}77)`, boxShadow:`0 0 28px ${eg}`, zIndex:1 }}/>
                    </div>
                    <div style={{ padding:'14px' }}>
                      <div style={{ fontSize:'16px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', marginBottom:'3px' }}>{spotCard.name}</div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,.3)' }}>{spotCard.set} · {spotCard.year} · {spotCard.condition}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:'40px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-1.5px', lineHeight:1, marginBottom:'6px' }}>€ {spotCard.curPrice.toLocaleString('fr-FR')}</div>
                    {spotCard.buyPrice>0&&<div style={{ fontSize:'16px', color:'#4ECCA3', fontWeight:500, marginBottom:'16px' }}>▲ +{roi}% · +€ {gain.toLocaleString('fr-FR')}</div>}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'14px' }}>
                      {[
                        {l:'Achat',v:`€ ${spotCard.buyPrice.toLocaleString('fr-FR')}`,c:'rgba(255,255,255,.5)'},
                        {l:'Marché',v:`€ ${spotCard.curPrice.toLocaleString('fr-FR')}`,c:'#fff'},
                        {l:'ROI',v:spotCard.buyPrice>0?`+${roi}%`:'—',c:'#4ECCA3'},
                        {l:'Langue',v:spotCard.lang,c:'rgba(255,255,255,.7)'},
                        {l:'PSA Pop',v:spotCard.psa?spotCard.psa.toLocaleString():'—',c:'rgba(255,255,255,.7)'},
                        {l:'Gain total',v:spotCard.buyPrice>0?`+€ ${Math.abs(gain).toLocaleString('fr-FR')}`:'—',c:'#4ECCA3'},
                      ].map(s=>(
                        <div key={s.l} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:'9px', padding:'10px 12px' }}>
                          <div style={{ fontSize:'9px', color:'rgba(255,255,255,.3)', textTransform:'uppercase' as const, letterSpacing:'.08em', fontFamily:'var(--font-display)', marginBottom:'4px' }}>{s.l}</div>
                          <div style={{ fontSize:'15px', fontWeight:600, color:s.c, fontFamily:'var(--font-display)' }}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                    {/* Modifier quantité */}
                    <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:'10px', padding:'12px 14px', marginBottom:'12px' }}>
                      <div style={{ fontSize:'9px', color:'rgba(255,255,255,.3)', textTransform:'uppercase' as const, letterSpacing:'.08em', fontFamily:'var(--font-display)', marginBottom:'8px' }}>Quantité dans la collection</div>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <button onClick={()=>setEditQty(Math.max(1,curQty-1))}
                          style={{ width:'32px', height:'32px', borderRadius:'8px', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', color:'#fff', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                        <div style={{ flex:1, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', borderRadius:'8px', padding:'7px', textAlign:'center' as const, fontSize:'18px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)' }}>{curQty}</div>
                        <button onClick={()=>setEditQty(Math.min(99,curQty+1))}
                          style={{ width:'32px', height:'32px', borderRadius:'8px', background:'rgba(255,107,53,.2)', border:'1px solid rgba(255,107,53,.4)', color:'#FF9060', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                        {editQty!==null&&editQty!==spotCard.qty&&(
                          <button onClick={()=>{
                            setPortfolio(prev=>prev.map(c=>c.id===spotCard.id?{...c,qty:editQty!}:c))
                            setSpotCard({...spotCard,qty:editQty!})
                            setEditQty(null)
                            showToast('Quantité mise à jour ✓')
                          }} style={{ padding:'7px 12px', borderRadius:'8px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const }}>
                            Sauvegarder
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      <button onClick={()=>router.push('/alpha')} style={{ flex:2, padding:'11px', borderRadius:'9px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>Voir signal →</button>
                      <button onClick={()=>{ setShareCtx('card'); setShareCard(spotCard); setShareOpen(true) }} style={{ flex:1, padding:'11px', borderRadius:'9px', background:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.7)', border:'1px solid rgba(255,255,255,.12)', fontSize:'13px', cursor:'pointer', fontFamily:'var(--font-display)' }}>Partager</button>
                      <button onClick={e=>toggleFav(spotCard.id,e)} style={{ width:'44px', borderRadius:'9px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>{favs.has(spotCard.id)?'❤️':'🤍'}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── SHARE SHEET ── */}
        {shareOpen&&(()=>{
          const isCardCtx    = shareCtx==='card'&&shareCard
          const isWrappedCtx = shareCtx==='wrapped'
          const ctxCard2     = shareCard
          const ctxRoi       = ctxCard2&&ctxCard2.buyPrice>0?Math.round(((ctxCard2.curPrice-ctxCard2.buyPrice)/ctxCard2.buyPrice)*100):totalROI
          const ctxEc        = ctxCard2?(EC[ctxCard2.type]??'#888'):'#FF6B35'
          const shareUrl     = ctxCard2?`https://pokealphaterminal.io/share/card-${ctxCard2.id}`:'https://pokealphaterminal.io/share/collection-demo'
          const tweetText    = encodeURIComponent(isCardCtx
            ? `${ctxCard2!.name} vaut € ${ctxCard2!.curPrice.toLocaleString('fr-FR')} 🔥 Analysée sur PokéAlpha Terminal`
            : isWrappedCtx
            ? `Mon Wrapped 2026 Pokémon TCG : € ${totalCur.toLocaleString('fr-FR')}, ROI +${totalROI}% 🏆 via PokéAlpha Terminal`
            : `Ma collection Pokémon TCG vaut € ${totalCur.toLocaleString('fr-FR')} 🔥 via PokéAlpha Terminal`)
          const tweetUrl     = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}&via=PokeAlphaTerminal`
          const sheetTitle   = isCardCtx?`Partager · ${ctxCard2!.name}`:isWrappedCtx?'Partager mon Wrapped':'Partager ma collection'
          const top4cols     = portfolio.length>0?[...portfolio].sort((a,b)=>((b.curPrice-b.buyPrice)/Math.max(b.buyPrice,1))-((a.curPrice-a.buyPrice)/Math.max(a.buyPrice,1))).slice(0,4).map(c=>EC[c.type]??'#888'):[EC.fire,EC.dark,EC.water,EC.psychic]
          const formats = [
            { id:'story', title:'Story Instagram', sub:'9:16 · TikTok · Reels',
              action:()=>{ showToast('Story générée ✓'); setShareOpen(false); setSelectedFmt(null) },
              preview:(<div style={{ height:'110px', background:'#0D0804', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle at 50% 40%,${ctxEc}30,transparent 60%)` }}/>
                <div style={{ width:'48px', height:'84px', borderRadius:'7px', background:`linear-gradient(145deg,${ctxEc}22,${ctxEc}08)`, border:`1px solid ${ctxEc}45`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'4px' }}>
                  <div style={{ fontSize:'4px', color:'rgba(255,255,255,.3)', letterSpacing:'.1em', fontFamily:'var(--font-display)' }}>POKÉALPHA</div>
                  <div style={{ width:'16px', height:'16px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ctxEc}DD,${ctxEc}77)` }}/>
                  <div style={{ fontSize:'5px', fontWeight:600, color:'rgba(255,255,255,.75)', textAlign:'center' as const, lineHeight:1.2, padding:'0 3px' }}>{isCardCtx?ctxCard2!.name.split(' ').slice(0,2).join(' '):'Ma Collection'}</div>
                  <div style={{ fontSize:'8px', fontWeight:700, color:'#fff' }}>{isCardCtx?`€ ${ctxCard2!.curPrice}`:`€ ${totalCur.toLocaleString('fr-FR')}`}</div>
                  <div style={{ fontSize:'5px', color:'#4ECCA3', fontWeight:600 }}>+{ctxRoi}% ROI</div>
                </div>
              </div>)
            },
            { id:'grid', title:'Grille Top 4', sub:'1:1 · Feed · Instagram',
              action:()=>{ showToast('Grille générée ✓'); setShareOpen(false); setSelectedFmt(null) },
              preview:(<div style={{ height:'110px', background:'#0D0804', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:'88px', height:'88px', borderRadius:'9px', background:'#111', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2px', padding:'2px' }}>
                  {top4cols.map((col,i)=>(<div key={i} style={{ borderRadius:'4px', background:`linear-gradient(145deg,${col}40,${col}18)`, border:`1px solid ${col}50` }}/>))}
                </div>
              </div>)
            },
            { id:'card', title:isCardCtx?'Fiche carte':'Carte investisseur', sub:'Portfolio · ROI',
              action:()=>{ navigator.clipboard.writeText(shareUrl); showToast('Lien copié ✓'); setShareOpen(false); setSelectedFmt(null) },
              preview:(<div style={{ height:'110px', background:'#0D0804', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:'130px', height:'70px', borderRadius:'9px', overflow:'hidden', position:'relative' }}>
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#111,#1A1208)' }}/>
                  <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle at 80% 40%,${ctxEc}18,transparent 60%)` }}/>
                  <div style={{ position:'relative', padding:'8px 10px', height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontSize:'6px', color:'rgba(255,255,255,.3)', textTransform:'uppercase' as const, fontFamily:'var(--font-display)' }}>{isCardCtx?ctxCard2!.condition:'Ma Collection'}</div>
                      <div style={{ fontSize:isCardCtx?'10px':'14px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', lineHeight:1.2 }}>{isCardCtx?ctxCard2!.name:`€ ${totalCur.toLocaleString('fr-FR')}`}</div>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                      <div>
                        <div style={{ fontSize:'5px', color:'rgba(255,255,255,.3)' }}>ROI</div>
                        <div style={{ fontSize:'10px', fontWeight:600, color:'#4ECCA3', fontFamily:'var(--font-display)' }}>+{ctxRoi}%</div>
                      </div>
                      <div style={{ fontSize:'5px', color:'rgba(255,255,255,.2)', fontFamily:'var(--font-display)' }}>POKÉALPHA</div>
                    </div>
                  </div>
                </div>
              </div>)
            },
            { id:'twitter', title:'Tweet / X', sub:'Partage sur Twitter',
              action:()=>{ window.open(tweetUrl,'_blank','noopener'); showToast('Ouverture Twitter / X ✓') },
              preview:(<div style={{ height:'110px', background:'#050810', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 50% 50%,rgba(29,161,242,.12),transparent 60%)' }}/>
                <div style={{ maxWidth:'138px', padding:'9px', borderRadius:'9px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)' }}>
                  <div style={{ fontSize:'7px', color:'rgba(255,255,255,.55)', lineHeight:1.5, fontFamily:'var(--font-display)' }}>
                    {isCardCtx?<>{ctxCard2!.name}: <span style={{ color:'#fff', fontWeight:600 }}>€ {ctxCard2!.curPrice}</span> · <span style={{ color:'#4ECCA3', fontWeight:600 }}>+{ctxRoi}%</span></>:<>Collection: <span style={{ color:'#fff', fontWeight:600 }}>€ {totalCur.toLocaleString('fr-FR')}</span> · <span style={{ color:'#4ECCA3', fontWeight:600 }}>+{totalROI}%</span></>}
                  </div>
                  <div style={{ marginTop:'5px', fontSize:'6px', color:'rgba(29,161,242,.7)', fontFamily:'var(--font-display)' }}>pokealphaterminal.io</div>
                </div>
                <div style={{ position:'absolute', top:'8px', right:'10px', fontSize:'14px', opacity:.5 }}>𝕏</div>
              </div>)
            },
          ]
          return (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:45, display:'flex', alignItems:'flex-end' }} onClick={()=>{ setShareOpen(false); setSelectedFmt(null) }}>
              <div style={{ width:'100%', background:'#0F0B07', borderTop:'1px solid rgba(255,255,255,.12)', borderRadius:'16px 16px 0 0', padding:'22px 26px', animation:'shareUp .32s cubic-bezier(.22,.58,.36,1)' }} onClick={e=>e.stopPropagation()}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                  <div style={{ fontSize:'14px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)' }}>{sheetTitle}</div>
                  <button onClick={()=>{ setShareOpen(false); setSelectedFmt(null) }} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', fontSize:'20px', padding:0, lineHeight:1 }}>×</button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'12px' }}>
                  {formats.map(f=>{ const isSel=selectedFmt===f.id; return (
                    <div key={f.id} onClick={()=>setSelectedFmt(isSel?null:f.id)}
                      style={{ border:`1.5px solid ${isSel?'rgba(255,107,53,.7)':'rgba(255,255,255,.1)'}`, borderRadius:'12px', overflow:'hidden', cursor:'pointer', transition:'all .15s', transform:isSel?'translateY(-3px)':'none', boxShadow:isSel?'0 8px 24px rgba(255,107,53,.25)':'none', background:isSel?'rgba(255,107,53,.06)':'transparent' }}>
                      {f.preview}
                      <div style={{ padding:'8px 10px', background:isSel?'rgba(255,107,53,.08)':'rgba(255,255,255,.03)', borderTop:`1px solid ${isSel?'rgba(255,107,53,.25)':'rgba(255,255,255,.06)'}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div>
                          <div style={{ fontSize:'11px', fontWeight:600, color:isSel?'#FF9060':'rgba(255,255,255,.7)', fontFamily:'var(--font-display)' }}>{f.title}</div>
                          <div style={{ fontSize:'9px', color:'rgba(255,255,255,.3)', marginTop:'1px' }}>{f.sub}</div>
                        </div>
                        {isSel&&<div style={{ width:'16px', height:'16px', borderRadius:'50%', background:'#FF6B35', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', color:'#fff', flexShrink:0 }}>✓</div>}
                      </div>
                    </div>
                  )})}
                </div>
                <div style={{ display:'flex', gap:'8px', marginBottom:'10px', alignItems:'center', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:'10px', padding:'9px 14px' }}>
                  <div style={{ flex:1, overflow:'hidden' }}>
                    <div style={{ fontSize:'9px', color:'rgba(255,255,255,.35)', letterSpacing:'.1em', textTransform:'uppercase' as const, fontFamily:'var(--font-display)', marginBottom:'2px' }}>Ton lien de parrainage · gagne 1 mois Pro</div>
                    <div style={{ fontSize:'12px', color:'rgba(255,255,255,.6)', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>pokealphaterminal.io/ref/DEMO2026</div>
                  </div>
                  <button onClick={()=>{ navigator.clipboard.writeText('https://pokealphaterminal.io/ref/DEMO2026'); setRefCopied(true); setTimeout(()=>setRefCopied(false),2000) }}
                    style={{ padding:'6px 12px', borderRadius:'8px', background:refCopied?'rgba(78,204,163,.15)':'rgba(255,255,255,.1)', border:`1px solid ${refCopied?'rgba(78,204,163,.4)':'rgba(255,255,255,.18)'}`, color:refCopied?'#4ECCA3':'rgba(255,255,255,.7)', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', flexShrink:0, transition:'all .2s', whiteSpace:'nowrap' as const }}>
                    {refCopied?'✓ Copié !':'Copier'}
                  </button>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                  <div style={{ width:'18px', height:'18px', borderRadius:'5px', background:'linear-gradient(135deg,#E03020,#FF4433)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', flexShrink:0 }}>▲</div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,.3)', fontFamily:'var(--font-display)' }}>
                    Partagé depuis <span style={{ color:'rgba(255,255,255,.6)', fontWeight:600 }}>PokéAlpha Terminal</span> <span style={{ color:'rgba(255,255,255,.2)' }}>— le Bloomberg des cartes Pokémon</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  {selectedFmt?(
                    <button onClick={()=>formats.find(f=>f.id===selectedFmt)?.action()}
                      style={{ flex:1, padding:'12px', borderRadius:'10px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'0 4px 16px rgba(224,48,32,.4)' }}>
                      {selectedFmt==='twitter'?'Ouvrir Twitter / X →':selectedFmt==='card'?'Copier le lien →':'Générer · PNG HD →'}
                    </button>
                  ):(
                    <button onClick={()=>{ showToast('4 formats générés ✓'); setShareOpen(false) }}
                      style={{ flex:1, padding:'12px', borderRadius:'10px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'0 4px 16px rgba(224,48,32,.4)' }}>
                      Générer les 4 formats · PNG HD
                    </button>
                  )}
                  <button onClick={()=>{ navigator.clipboard.writeText(shareUrl); showToast('Lien copié ✓') }}
                    style={{ padding:'12px 18px', borderRadius:'10px', background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.6)', border:'1px solid rgba(255,255,255,.1)', fontSize:'13px', cursor:'pointer', fontFamily:'var(--font-display)' }}>
                    Copier
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── SHOWCASE PICKER ── */}
        {showPickerForShowcase&&(
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:48, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }} onClick={()=>setShowPickerForShowcase(false)}>
            <div style={{ background:'#0F0A04', borderRadius:'20px', border:'1px solid rgba(255,107,53,.2)', boxShadow:'0 24px 60px rgba(0,0,0,.8)', padding:'24px', maxWidth:'480px', width:'100%', animation:'fadeUp .25s ease-out', maxHeight:'85vh', display:'flex', flexDirection:'column' }} onClick={e=>e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexShrink:0 }}>
                <div>
                  <div style={{ fontSize:'15px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)' }}>Choisir une carte à exposer</div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,.3)', marginTop:'2px' }}>Depuis votre collection</div>
                </div>
                <button onClick={()=>setShowPickerForShowcase(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', fontSize:'20px', padding:0 }}>×</button>
              </div>
              {portfolio.filter(c=>!showcase.find(s=>s.id===c.id)).length===0?(
                <div style={{ textAlign:'center', padding:'32px 0', color:'rgba(255,255,255,.3)', fontSize:'13px', fontFamily:'var(--font-display)' }}>
                  Toutes vos cartes sont déjà dans la vitrine.
                </div>
              ):(
                <div style={{ display:'flex', flexDirection:'column', gap:'8px', overflowY:'auto' as const }}>
                  {portfolio.filter(c=>!showcase.find(s=>s.id===c.id)).map(card=>{
                    const ec=EC[card.type]??'#888'
                    const roi=card.buyPrice>0?Math.round(((card.curPrice-card.buyPrice)/card.buyPrice)*100):0
                    return (
                      <div key={card.id} onClick={()=>addToShowcase(card)}
                        style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', borderRadius:'10px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', cursor:'pointer', transition:'all .15s' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,107,53,.08)')}
                        onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,.04)')}>
                        <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:`linear-gradient(145deg,${ec}25,${ec}10)`, border:`1px solid ${ec}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:ec, opacity:.8 }}/>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'13px', fontWeight:500, color:'rgba(255,255,255,.85)', fontFamily:'var(--font-display)' }}>{card.name}</div>
                          <div style={{ fontSize:'10px', color:'rgba(255,255,255,.3)' }}>{card.set} · {card.condition}{card.qty>1?` · ×${card.qty}`:''}</div>
                        </div>
                        <div style={{ textAlign:'right' as const }}>
                          <div style={{ fontSize:'13px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)' }}>€ {card.curPrice}</div>
                          {card.buyPrice>0&&<div style={{ fontSize:'10px', color:'#4ECCA3', fontWeight:600 }}>+{roi}%</div>}
                        </div>
                        <div style={{ fontSize:'11px', color:'rgba(255,107,53,.7)', fontFamily:'var(--font-display)', flexShrink:0 }}>+ Exposer</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ADD CARD MODAL ── */}
        {addOpen&&(
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.88)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }} onClick={()=>{ setAddOpen(false); setAddSuggs([]) }}>
            <div style={{ background:'#0F0A04', borderRadius:'20px', border:'1px solid rgba(255,107,53,.25)', boxShadow:'0 0 60px rgba(255,107,53,.15),0 24px 60px rgba(0,0,0,.8)', padding:'24px', maxWidth:'520px', width:'100%', animation:'fadeUp .25s ease-out', maxHeight:'94vh', overflowY:'auto' as const }} onClick={e=>e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px' }}>
                <div>
                  <div style={{ fontSize:'17px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)' }}>Ajouter une carte ou un item</div>
                  <div style={{ fontSize:'11px', marginTop:'3px' }}>
                    <span style={{ color:'rgba(255,107,53,.7)', fontWeight:600 }}>* obligatoire</span>
                    <span style={{ color:'rgba(255,255,255,.25)' }}> · connecté à l'encyclopédie PokéAlpha</span>
                  </div>
                </div>
                <button onClick={()=>{ setAddOpen(false); setAddSuggs([]) }} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', fontSize:'22px', padding:0, lineHeight:1 }}>×</button>
              </div>

              {/* 1. Série * */}
              <div style={{ marginBottom:'12px' }}>
                <div className="req-label">Série *</div>
                <div style={{ position:'relative' }}>
                  <select value={addForm.set} onChange={e=>handleSetChange(e.target.value)}
                    className={addForm.set?'req-field-ok':'req-field'}
                    style={{ width:'100%', appearance:'none' as const, background:'rgba(255,255,255,.07)', borderRadius:'9px', padding:'10px 36px 10px 12px', color:addForm.set?'#fff':'rgba(255,255,255,.35)', fontSize:'13px', fontFamily:'var(--font-display)', outline:'none', cursor:'pointer' }}>
                    <option value="" style={{background:'#111'}}>Sélectionner une série…</option>
                    {CARD_SETS_ALL.filter(s=>s!=='Toutes').map(s=><option key={s} value={s} style={{background:'#111'}}>{s}</option>)}
                  </select>
                  <div style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', fontSize:'10px', color:'rgba(255,255,255,.45)' }}>▾</div>
                  {addForm.set&&<div style={{ position:'absolute', right:'30px', top:'50%', transform:'translateY(-50%)', fontSize:'12px', color:'#4ECCA3' }}>✓</div>}
                </div>
              </div>

              {/* 2. Nom * */}
              <div style={{ marginBottom:'12px' }}>
                <div className="req-label">
                  Nom de la carte ou de l'item *
                  {addForm.set&&<span style={{ marginLeft:'6px', fontSize:'9px', color:'rgba(255,107,53,.5)', fontWeight:400, textTransform:'none' as const }}>encyclopédie {addForm.set}</span>}
                </div>
                <div style={{ position:'relative' }}>
                  <input value={addForm.name} onChange={e=>handleNameInput(e.target.value)} onBlur={()=>setTimeout(()=>setAddSuggs([]),150)}
                    placeholder={addForm.set?`Chercher dans ${addForm.set}…`:"Sélectionne d'abord une série"}
                    disabled={!addForm.set}
                    className={addForm.name?'req-field-ok':'req-field'}
                    style={{ width:'100%', background:addForm.set?'rgba(255,255,255,.07)':'rgba(255,255,255,.03)', borderRadius:'9px', padding:'10px 12px', color:'#fff', fontSize:'13px', fontFamily:'var(--font-display)', outline:'none', boxSizing:'border-box' as const, opacity:addForm.set?1:.5, cursor:addForm.set?'text':'not-allowed' }}/>
                  {addForm.name&&<div style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'12px', color:'#4ECCA3' }}>✓</div>}
                  {addSuggs.length>0&&(
                    <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#1A0E06', border:'1px solid rgba(255,107,53,.3)', borderRadius:'10px', overflow:'hidden', zIndex:99, boxShadow:'0 8px 24px rgba(0,0,0,.6)' }}>
                      {addSuggs.map((s,i)=>(
                        <div key={i} onMouseDown={()=>handleSuggSelect(s)}
                          style={{ padding:'9px 14px', fontSize:'13px', color:'rgba(255,255,255,.85)', fontFamily:'var(--font-display)', cursor:'pointer', borderBottom:i<addSuggs.length-1?'1px solid rgba(255,255,255,.06)':'none' }}
                          onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,107,53,.1)')}
                          onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                          📋 {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Langue */}
              <div style={{ marginBottom:'12px' }}>
                <div className="opt-label">Langue</div>
                <div style={{ display:'flex', gap:'8px' }}>
                  {(['EN','JP','FR'] as const).map(l=>(
                    <button key={l} onClick={()=>setAddForm(p=>({...p,lang:l}))}
                      style={{ flex:1, padding:'9px', borderRadius:'8px', border:`1px solid ${addForm.lang===l?'rgba(255,107,53,.6)':'rgba(255,255,255,.1)'}`, background:addForm.lang===l?'rgba(255,107,53,.15)':'rgba(255,255,255,.04)', color:addForm.lang===l?'#FF9060':'rgba(255,255,255,.5)', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                      {l==='EN'?'🇺🇸 EN':l==='JP'?'🇯🇵 JP':'🇫🇷 FR'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. État / Grade — grille complète par société */}
              <div style={{ marginBottom:'12px' }}>
                <div className="opt-label">
                  État / Grade
                  {addForm.graded&&<span style={{ marginLeft:'6px', fontSize:'9px', color:'#4ECCA3', fontWeight:600, textTransform:'none' as const }}>· Gradée ✓</span>}
                  {addForm.condition==='Scellé'&&<span style={{ marginLeft:'6px', fontSize:'9px', color:'#D4A800', fontWeight:600, textTransform:'none' as const }}>· Scellé ✓</span>}
                </div>
                {/* Raw + Scellé */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px', marginBottom:'8px' }}>
                  {['Raw','Scellé'].map(cond=>(
                    <button key={cond} onClick={()=>handleConditionChange(cond)}
                      style={{ padding:'8px', borderRadius:'7px', border:`1px solid ${addForm.condition===cond?'rgba(255,107,53,.6)':'rgba(255,255,255,.1)'}`, background:addForm.condition===cond?'rgba(255,107,53,.15)':'rgba(255,255,255,.04)', color:addForm.condition===cond?'#FF9060':'rgba(255,255,255,.5)', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                      {cond==='Scellé'?'📦 Scellé':'Raw'}
                    </button>
                  ))}
                </div>
                {/* PSA */}
                <div style={{ fontSize:'9px', color:'rgba(255,255,255,.25)', fontFamily:'var(--font-display)', letterSpacing:'.06em', marginBottom:'4px' }}>PSA</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'4px', marginBottom:'8px' }}>
                  {['PSA 1','PSA 2','PSA 3','PSA 4','PSA 5','PSA 6','PSA 7','PSA 8','PSA 9','PSA 10'].map(cond=>(
                    <button key={cond} onClick={()=>handleConditionChange(cond)}
                      style={{ padding:'6px 2px', borderRadius:'6px', border:`1px solid ${addForm.condition===cond?'rgba(255,107,53,.6)':'rgba(255,255,255,.08)'}`, background:addForm.condition===cond?'rgba(255,107,53,.15)':'rgba(255,255,255,.03)', color:addForm.condition===cond?'#FF9060':'rgba(255,255,255,.45)', fontSize:'10px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                      {cond.replace('PSA ','')}
                    </button>
                  ))}
                </div>
                {/* BGS / CGC / PCA / CCC */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
                  {([
                    ['BGS', ['BGS 7','BGS 8','BGS 9','BGS 9.5','BGS 10']],
                    ['CGC', ['CGC 8','CGC 9','CGC 9.5','CGC 10']],
                    ['PCA', ['PCA 8','PCA 9','PCA 9.5','PCA 10']],
                    ['CCC', ['CCC 8','CCC 9','CCC 10']],
                  ] as [string,string[]][]).map(([label,grades])=>(
                    <div key={label}>
                      <div style={{ fontSize:'9px', color:'rgba(255,255,255,.25)', fontFamily:'var(--font-display)', letterSpacing:'.06em', marginBottom:'4px' }}>{label}</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
                        {grades.map(cond=>(
                          <button key={cond} onClick={()=>handleConditionChange(cond)}
                            style={{ padding:'5px 3px', borderRadius:'5px', border:`1px solid ${addForm.condition===cond?'rgba(255,107,53,.6)':'rgba(255,255,255,.08)'}`, background:addForm.condition===cond?'rgba(255,107,53,.15)':'rgba(255,255,255,.03)', color:addForm.condition===cond?'#FF9060':'rgba(255,255,255,.4)', fontSize:'9px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                            {cond}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Prix + Quantité */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'14px' }}>
                <div>
                  <div className="req-label">Prix d'achat € *</div>
                  <input type="number" value={addForm.buyPrice} onChange={e=>setAddForm(p=>({...p,buyPrice:e.target.value}))} placeholder="0"
                    className={addForm.buyPrice?'req-field-ok':'req-field'}
                    style={{ width:'100%', background:'rgba(255,255,255,.07)', borderRadius:'9px', padding:'10px 12px', color:'#fff', fontSize:'16px', fontWeight:700, fontFamily:'var(--font-display)', outline:'none', boxSizing:'border-box' as const }}/>
                </div>
                <div>
                  <div className="opt-label">Exemplaires</div>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                    <button onClick={()=>setAddForm(p=>({...p,qty:Math.max(1,p.qty-1)}))}
                      style={{ width:'38px', height:'38px', borderRadius:'8px', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', color:'#fff', fontSize:'20px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>−</button>
                    <div style={{ flex:1, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', borderRadius:'9px', padding:'9px 0', textAlign:'center' as const, fontSize:'18px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)' }}>{addForm.qty}</div>
                    <button onClick={()=>setAddForm(p=>({...p,qty:Math.min(99,p.qty+1)}))}
                      style={{ width:'38px', height:'38px', borderRadius:'8px', background:'rgba(255,107,53,.2)', border:'1px solid rgba(255,107,53,.4)', color:'#FF9060', fontSize:'20px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>+</button>
                  </div>
                </div>
              </div>

              {/* Hint champ manquant */}
              {!canAdd&&(
                <div style={{ display:'flex', alignItems:'center', gap:'7px', padding:'9px 12px', borderRadius:'9px', background:'rgba(255,107,53,.07)', border:'1px solid rgba(255,107,53,.2)', marginBottom:'12px' }}>
                  <span style={{ fontSize:'14px' }}>⚠️</span>
                  <span style={{ fontSize:'11px', color:'rgba(255,107,53,.85)', fontFamily:'var(--font-display)' }}>{missingHint} pour activer le bouton</span>
                </div>
              )}

              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={addCard} disabled={!canAdd}
                  style={{ flex:1, padding:'13px', borderRadius:'11px', background:canAdd?'linear-gradient(135deg,#E03020,#FF4433)':'rgba(255,255,255,.06)', color:canAdd?'#fff':'rgba(255,255,255,.2)', border:'none', fontSize:'14px', fontWeight:600, cursor:canAdd?'pointer':'default', fontFamily:'var(--font-display)', boxShadow:canAdd?'0 4px 16px rgba(224,48,32,.4)':'none', transition:'all .2s' }}>
                  Ajouter {addForm.qty>1?`${addForm.qty} exemplaires`:'au portfolio'} →
                </button>
                <button onClick={()=>{ setAddOpen(false); setAddSuggs([]) }}
                  style={{ padding:'13px 20px', borderRadius:'11px', background:'rgba(255,255,255,.05)', color:'rgba(255,255,255,.5)', border:'1px solid rgba(255,255,255,.1)', fontSize:'14px', cursor:'pointer', fontFamily:'var(--font-display)' }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── HEADER ── */}
        <div style={{ position:'relative', zIndex:1, padding:'28px 28px 20px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'16px', marginBottom:'22px' }}>
            <div>
              <div style={{ fontSize:'10px', fontWeight:500, color:'rgba(255,255,255,.25)', textTransform:'uppercase' as const, letterSpacing:'.15em', fontFamily:'var(--font-display)', marginBottom:'6px' }}>Portfolio</div>
              <div style={{ fontSize:'38px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-1.5px', lineHeight:1 }}>
                {portfolio.length>0?`€ ${totalCur.toLocaleString('fr-FR')}`:'—'}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'6px' }}>
                {portfolio.length>0&&totalBuy>0&&<span style={{ fontSize:'14px', fontWeight:500, color:'#4ECCA3' }}>▲ +{totalROI}% · +€ {totalGain.toLocaleString('fr-FR')}</span>}
                {portfolio.length>0&&<span style={{ fontSize:'13px', color:'rgba(255,255,255,.35)' }}>{portfolio.length} carte{portfolio.length!==1?'s':''} · {portfolio.reduce((s,c)=>s+c.qty,0)} ex.</span>}
                {portfolio.length===0&&<span style={{ fontSize:'13px', color:'rgba(255,255,255,.25)' }}>Aucune carte — commencez à construire votre collection</span>}
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
              <button onClick={()=>{ setShareCtx('portfolio'); setShareCard(null); setShareOpen(true) }} style={{ padding:'10px 18px', borderRadius:'12px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'0 4px 16px rgba(224,48,32,.45)' }}>Partager →</button>
            </div>
          </div>
          <div style={{ display:'flex', gap:'6px' }}>
            {([['binder','Binder'],['showcase','Vitrine 💎'],['wrapped','Wrapped 2026']] as [ViewMode,string][]).map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)} className={`vtab${view===v?' on':''}`}>{l}</button>
            ))}
          </div>
        </div>

        {/* ── VUE BINDER ── */}
        {view==='binder'&&(
          <div style={{ position:'relative', zIndex:1, padding:'0 24px 28px', animation:'fadeUp .3s ease-out' }}>
            <div style={{ background:'linear-gradient(160deg,#1C1008 0%,#130C05 50%,#1C1008 100%)', borderRadius:'18px', boxShadow:'0 24px 60px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.05)', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.018) 39px,rgba(255,255,255,.018) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.018) 39px,rgba(255,255,255,.018) 40px)', pointerEvents:'none' }}/>
              <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(ellipse at 20% 30%,rgba(255,107,53,.06) 0%,transparent 45%),radial-gradient(ellipse at 80% 70%,rgba(126,87,194,.06) 0%,transparent 45%)', pointerEvents:'none' }}/>
              <div style={{ position:'relative', padding:'22px 22px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
                  <div>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,.22)', textTransform:'uppercase' as const, letterSpacing:'.12em', fontFamily:'var(--font-display)' }}>Ma Collection</div>
                    <div style={{ fontSize:'13px', color:'rgba(255,255,255,.5)', fontFamily:'var(--font-display)', marginTop:'2px' }}>{portfolio.length} carte{portfolio.length!==1?'s':''} · page {binderPage+1}/{binderPages}</div>
                  </div>
                  <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                    <button onClick={()=>setAddOpen(true)}
                      style={{ padding:'6px 14px', borderRadius:'8px', background:'rgba(255,107,53,.15)', border:'1px solid rgba(255,107,53,.4)', color:'#FF9060', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const }}>
                      + Ajouter une carte
                    </button>
                    {[3,4,5].map(n=>(
                      <button key={n} onClick={()=>{setBinderCols(n);setBinderPage(0)}} className="colbtn" style={{ border:`1px solid ${binderCols===n?'rgba(255,255,255,.3)':'rgba(255,255,255,.08)'}`, background:binderCols===n?'rgba(255,255,255,.12)':'transparent', color:binderCols===n?'#fff':'rgba(255,255,255,.35)' }}>{n}</button>
                    ))}
                    <button onClick={()=>setBinderPage(p=>Math.max(0,p-1))} disabled={binderPage===0} style={{ width:'28px', height:'28px', borderRadius:'7px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:binderPage===0?'rgba(255,255,255,.2)':'rgba(255,255,255,.55)', cursor:binderPage===0?'default':'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
                    <button onClick={()=>setBinderPage(p=>Math.min(binderPages-1,p+1))} disabled={binderPage>=binderPages-1} style={{ width:'28px', height:'28px', borderRadius:'7px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:binderPage>=binderPages-1?'rgba(255,255,255,.2)':'rgba(255,255,255,.55)', cursor:binderPage>=binderPages-1?'default':'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
                  </div>
                </div>

                {portfolio.length===0?(
                  <div style={{ textAlign:'center', padding:'64px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:'16px' }}>
                    <div style={{ fontSize:'48px', opacity:.15 }}>📋</div>
                    <div style={{ fontSize:'14px', color:'rgba(255,255,255,.3)', fontFamily:'var(--font-display)' }}>Collection vide</div>
                    <div style={{ fontSize:'12px', color:'rgba(255,255,255,.2)', fontFamily:'var(--font-display)', lineHeight:1.6, maxWidth:'260px' }}>Ajoutez votre première carte pour commencer à tracker votre portfolio</div>
                    <button onClick={()=>setAddOpen(true)}
                      style={{ padding:'11px 24px', borderRadius:'11px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'0 4px 16px rgba(224,48,32,.4)' }}>
                      + Ajouter ma première carte →
                    </button>
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
                      const isVintage=card.year<2002
                      return (
                        <div key={card.id}
                          className={`pocket-shell gem${card.signal==='S'?' breathe-S':card.signal==='A'?' breathe-A':''}`}
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
                          {isVintage&&<div style={{ position:'absolute', bottom:0, left:0, right:0, height:'10px', background:'linear-gradient(0deg,rgba(0,0,0,.55),transparent)', zIndex:3, pointerEvents:'none' }}/>}
                          <div style={{ position:'absolute', top:'8px', left:'8px', right:'8px', bottom:'54px', borderRadius:'7px', background:`${ec}12`, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                            <div style={{ position:'absolute', width:'65%', height:'65%', borderRadius:'50%', background:eg, filter:'blur(14px)', opacity:.6 }}/>
                            <div style={{ width:orbSz, height:orbSz, borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec}CC,${ec}77)`, boxShadow:`0 0 16px ${eg}`, position:'relative', zIndex:1 }}/>
                            {card.signal&&<div style={{ position:'absolute', top:'4px', right:'4px', fontSize:'7px', fontWeight:700, background:TIER_BG[card.signal], color:'#fff', padding:'1px 5px', borderRadius:'3px', fontFamily:'var(--font-display)', zIndex:2 }}>{card.signal}</div>}
                            {favs.has(card.id)&&<div style={{ position:'absolute', top:'4px', left:'4px', fontSize:'10px', zIndex:2 }}>❤️</div>}
                            {card.graded&&<div style={{ position:'absolute', bottom:'4px', right:'4px', fontSize:'7px', fontWeight:700, background:'rgba(0,0,0,.75)', color:'rgba(255,255,255,.9)', padding:'1px 5px', borderRadius:'3px', fontFamily:'var(--font-display)', zIndex:2 }}>{card.condition}</div>}
                            {card.condition==='Scellé'&&<div style={{ position:'absolute', bottom:'4px', right:'4px', fontSize:'7px', fontWeight:700, background:'rgba(212,168,0,.9)', color:'#000', padding:'1px 5px', borderRadius:'3px', fontFamily:'var(--font-display)', zIndex:2 }}>📦</div>}
                            {card.qty>1&&<div style={{ position:'absolute', bottom:'4px', left:'4px', zIndex:4, background:'rgba(0,0,0,.82)', border:'1px solid rgba(255,255,255,.25)', borderRadius:'10px', padding:'1px 5px', fontSize:'7px', fontWeight:700, color:'rgba(255,255,255,.85)', fontFamily:'var(--font-display)', lineHeight:1.6 }}>×{card.qty}</div>}
                          </div>
                          <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'6px 8px 8px' }}>
                            <div style={{ fontSize:fsName, fontWeight:600, color:'rgba(255,255,255,.85)', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:'2px' }}>{card.name}</div>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <div style={{ fontSize:fsPx, fontWeight:700, color:'rgba(255,255,255,.9)', fontFamily:'var(--font-display)', letterSpacing:'-0.3px' }}>€ {card.curPrice}</div>
                              {card.buyPrice>0&&<div style={{ fontSize:'10px', fontWeight:600, color:roi>=0?'#4ECCA3':'#FF6B8A' }}>{roi>=0?'+':''}{roi}%</div>}
                            </div>
                          </div>
                          <button className="remove-btn" onClick={e=>removeCard(card,e)}
                            style={{ position:'absolute', top:'6px', left:'50%', transform:'translateX(-50%)', zIndex:20, background:'rgba(0,0,0,.8)', border:'1px solid rgba(255,255,255,.2)', color:'rgba(255,255,255,.85)', borderRadius:'20px', padding:'3px 10px', fontSize:'9px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', opacity:0, transition:'opacity .2s', whiteSpace:'nowrap', backdropFilter:'blur(4px)' }}>
                            ↑ Retirer
                          </button>
                        </div>
                      )
                    })}
                    {/* Phantom slots — ouvrent le modal d'ajout, sans nom */}
                    {Array.from({length:phantomCount}).map((_,i)=>(
                      <div key={`ph-${i}`} onClick={()=>setAddOpen(true)}
                        style={{ aspectRatio:'2/3', borderRadius:'9px', border:'1.5px dashed rgba(255,255,255,.07)', background:'rgba(255,255,255,.01)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}
                        onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(255,107,53,.3)'; e.currentTarget.style.background='rgba(255,107,53,.04)' }}
                        onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,.07)'; e.currentTarget.style.background='rgba(255,255,255,.01)' }}>
                        <div style={{ width:'24px', height:'24px', borderRadius:'50%', border:'1.5px dashed rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <span style={{ fontSize:'14px', color:'rgba(255,255,255,.1)', lineHeight:1 }}>+</span>
                        </div>
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
                <div style={{ position:'absolute', bottom:'14px', right:'18px', fontSize:'9px', color:'rgba(255,255,255,.05)', letterSpacing:'.2em', textTransform:'uppercase' as const, fontFamily:'var(--font-display)' }}>PokéAlpha Terminal</div>
              </div>
            </div>
          </div>
        )}

        {/* ── VUE VITRINE BIJOUTIER ── */}
        {view==='showcase'&&(
          <div style={{ position:'relative', zIndex:1, padding:'0 24px 28px', animation:'fadeUp .3s ease-out' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px' }}>
              <div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,.25)', textTransform:'uppercase' as const, letterSpacing:'.15em', fontFamily:'var(--font-display)', marginBottom:'4px' }}>Vitrine</div>
                <div style={{ fontSize:'13px', color:'rgba(255,255,255,.45)', fontFamily:'var(--font-display)' }}>
                  {showcase.length===0?'Exposez vos plus belles pièces':`${showcase.length} pièce${showcase.length!==1?'s':''} exposée${showcase.length!==1?'s':''}`}
                </div>
              </div>
              <button onClick={()=>{ if(portfolio.length===0){ showToast('Ajoutez d\'abord des cartes à votre collection') }else{ setShowPickerForShowcase(true) } }}
                style={{ padding:'9px 18px', borderRadius:'10px', background:'rgba(255,107,53,.15)', border:'1px solid rgba(255,107,53,.4)', color:'#FF9060', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const }}>
                + Ajouter une carte de ma collection
              </button>
            </div>

            {showcase.length===0?(
              <div style={{ textAlign:'center', padding:'80px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:'18px' }}>
                <div style={{ fontSize:'56px', opacity:.12 }}>💎</div>
                <div style={{ fontSize:'15px', color:'rgba(255,255,255,.3)', fontFamily:'var(--font-display)' }}>Votre vitrine est vide</div>
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,.2)', fontFamily:'var(--font-display)', maxWidth:'280px', lineHeight:1.7 }}>Exposez vos pièces maîtresses comme dans une vitrine de bijoutier. Partagez-les avec votre communauté.</div>
                {portfolio.length===0?(
                  <button onClick={()=>setAddOpen(true)}
                    style={{ padding:'10px 22px', borderRadius:'10px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                    Ajouter des cartes à ma collection d'abord
                  </button>
                ):(
                  <button onClick={()=>setShowPickerForShowcase(true)}
                    style={{ padding:'10px 22px', borderRadius:'10px', background:'rgba(255,107,53,.15)', border:'1px solid rgba(255,107,53,.4)', color:'#FF9060', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                    + Choisir depuis ma collection
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
                    <div key={card.id} className={`gem${card.signal==='S'?' breathe-S':card.signal==='A'?' breathe-A':''}`}
                      style={{ background:`linear-gradient(160deg,${ec}18,${ec}06)`, border:`1.5px solid ${ec}35`, animation:`cardIn .35s ${Math.min(idx,10)*.04}s ease-out both` }}
                      onMouseMove={tiltCard} onMouseLeave={resetCard} onClick={()=>{ setSpotCard(card); setEditQty(null) }}>
                      {isHolo&&<div className="holo"/>}
                      {isHolo&&<div className="hm"/>}
                      <div className="ptcl" style={{ background:ec, bottom:'20%', left:'20%' }}/>
                      <div className="ptcl" style={{ background:ec, bottom:'30%', left:'60%' }}/>
                      <div style={{ height:'2.5px', background:`linear-gradient(90deg,${ec},${ec}55)`, position:'absolute', top:0, left:0, right:0 }}/>
                      {card.signal&&<div style={{ position:'absolute', top:'8px', right:'8px', zIndex:3, fontSize:'9px', fontWeight:700, background:TIER_BG[card.signal], color:'#fff', padding:'3px 8px', borderRadius:'6px', fontFamily:'var(--font-display)' }}>{card.signal}</div>}
                      <div style={{ height:'130px', margin:'6px 6px 0', borderRadius:'9px', background:`${ec}14`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                        <div style={{ position:'absolute', width:'70%', height:'70%', borderRadius:'50%', background:eg, filter:'blur(20px)', opacity:.55 }}/>
                        <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec}DD,${ec}88)`, boxShadow:`0 0 18px ${eg}`, zIndex:1 }}/>
                        <div style={{ position:'absolute', bottom:'6px', left:'6px', fontSize:'9px', fontWeight:700, background:ls.bg, color:ls.color, padding:'1px 6px', borderRadius:'4px', fontFamily:'var(--font-display)' }}>{ls.flag} {card.lang}</div>
                        {card.graded&&<div style={{ position:'absolute', bottom:'6px', right:'6px', fontSize:'8px', fontWeight:700, background:'rgba(0,0,0,.8)', color:'rgba(255,255,255,.9)', padding:'1px 6px', borderRadius:'4px', fontFamily:'var(--font-display)' }}>{card.condition}</div>}
                      </div>
                      <div style={{ padding:'12px' }}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'6px', marginBottom:'4px' }}>
                          <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,.88)', fontFamily:'var(--font-display)', lineHeight:1.25, flex:1 }}>{card.name}</div>
                          <button onClick={e=>{ e.stopPropagation(); toggleFav(card.id,e) }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'14px', padding:0, flexShrink:0 }}>{favs.has(card.id)?'❤️':'🤍'}</button>
                        </div>
                        <div style={{ fontSize:'10px', color:'rgba(255,255,255,.25)', marginBottom:'10px' }}>{card.set}</div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                          <div>
                            <div style={{ fontSize:'18px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1 }}>€ {card.curPrice.toLocaleString('fr-FR')}</div>
                            {card.buyPrice>0&&<div style={{ fontSize:'9px', color:'rgba(255,255,255,.2)', marginTop:'2px' }}>Achat € {card.buyPrice}</div>}
                          </div>
                          <div style={{ textAlign:'right' }}>
                            {card.buyPrice>0&&<div style={{ fontSize:'14px', fontWeight:600, color:roi>=0?'#4ECCA3':'#FF6B8A', fontFamily:'var(--font-display)' }}>{roi>=0?'+':''}{roi}%</div>}
                            {card.psa&&<div style={{ fontSize:'9px', color:'rgba(255,255,255,.22)' }}>Pop {card.psa.toLocaleString()}</div>}
                          </div>
                        </div>
                        <button onClick={e=>removeFromShowcase(card.id,e)}
                          style={{ marginTop:'10px', width:'100%', padding:'6px', borderRadius:'7px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', color:'rgba(255,255,255,.3)', fontSize:'10px', cursor:'pointer', fontFamily:'var(--font-display)' }}>
                          Retirer de la vitrine
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── VUE WRAPPED ── */}
        {view==='wrapped'&&(
          <div style={{ position:'relative', zIndex:1, animation:'wrappedIn .35s ease-out' }}>
            <div style={{ padding:'40px 28px 28px', textAlign:'center', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(ellipse at 50% 60%,rgba(255,107,53,.12) 0%,transparent 55%)', pointerEvents:'none' }}/>
              <div style={{ fontSize:'120px', fontWeight:700, color:'rgba(255,255,255,.04)', position:'absolute', top:'10px', left:'50%', transform:'translateX(-50%)', letterSpacing:'-6px', lineHeight:1, pointerEvents:'none', userSelect:'none' as const }}>2026</div>
              <div style={{ position:'relative' }}>
                <div style={{ fontSize:'11px', fontWeight:500, color:'rgba(255,255,255,.25)', textTransform:'uppercase' as const, letterSpacing:'.18em', fontFamily:'var(--font-display)', marginBottom:'12px' }}>Ta collection en chiffres</div>
                <div style={{ fontSize:'52px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-2px', lineHeight:1 }}>
                  {portfolio.length>0?`€ ${totalCur.toLocaleString('fr-FR')}`:'—'}
                </div>
                {totalBuy>0&&<div style={{ fontSize:'16px', color:'#4ECCA3', marginTop:'8px', fontWeight:500 }}>+{totalROI}% depuis l'achat · +€ {totalGain.toLocaleString('fr-FR')}</div>}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderTop:'1px solid rgba(255,255,255,.07)', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
              {[
                {l:'Cartes',v:String(portfolio.length)},
                {l:'Meilleur ROI',v:bestCard&&bestCard.buyPrice>0?`+${Math.round(((bestCard.curPrice-bestCard.buyPrice)/bestCard.buyPrice)*100)}%`:'—',c:'#FFD700'},
                {l:'Signaux S',v:String(portfolio.filter(c=>c.signal==='S').length)},
                {l:'Favoris',v:String(favs.size)},
              ].map((s,i)=>(
                <div key={s.l} style={{ padding:'18px', borderRight:i<3?'1px solid rgba(255,255,255,.07)':'none', textAlign:'center' }}>
                  <div style={{ fontSize:'28px', fontWeight:600, color:(s as {c?:string}).c??'#fff', fontFamily:'var(--font-display)', letterSpacing:'-0.5px' }}>{s.v}</div>
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
                        <div style={{ fontSize:'20px', flexShrink:0 }}>{['🥇','🥈','🥉'][i]}</div>
                        <div style={{ width:'36px', height:'36px', borderRadius:'9px', background:`linear-gradient(145deg,${ec}25,${ec}10)`, border:`1px solid ${ec}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <div style={{ width:'14px', height:'14px', borderRadius:'50%', background:ec, opacity:.7 }}/>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'13px', fontWeight:500, color:'rgba(255,255,255,.8)', fontFamily:'var(--font-display)' }}>{card.name}</div>
                          <div style={{ fontSize:'10px', color:'rgba(255,255,255,.3)' }}>{card.set} · {card.year}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:'16px', fontWeight:600, color:'#4ECCA3', fontFamily:'var(--font-display)' }}>+{roi}%</div>
                          <div style={{ fontSize:'11px', color:'rgba(255,255,255,.35)' }}>€ {card.curPrice}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ):(
              <div style={{ textAlign:'center', padding:'40px', color:'rgba(255,255,255,.2)', fontSize:'13px', fontFamily:'var(--font-display)', lineHeight:1.7 }}>
                Ajoutez des cartes avec un prix d'achat<br/>pour voir votre Wrapped
              </div>
            )}
            <div style={{ padding:'0 28px 28px', display:'flex', gap:'8px' }}>
              <button onClick={()=>{ setShareCtx('wrapped'); setShareCard(null); setShareOpen(true) }} style={{ flex:1, padding:'14px', borderRadius:'12px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'0 6px 20px rgba(224,48,32,.45)' }}>Partager mon Wrapped 2026 →</button>
              <button style={{ padding:'14px 20px', borderRadius:'12px', background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.6)', border:'1px solid rgba(255,255,255,.1)', fontSize:'14px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)' }}>Sauvegarder</button>
            </div>
          </div>
        )}

      </div>
    </>
  )
}