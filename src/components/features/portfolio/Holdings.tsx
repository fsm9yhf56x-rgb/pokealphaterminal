'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type CardItem = {
  id:string; name:string; set:string; year:number; number:string
  rarity:string; type:string; lang:'EN'|'JP'|'FR'
  condition:string; graded:boolean
  buyPrice:number; curPrice:number; qty:number
  psa?:number; signal?:'S'|'A'|'B'; hot?:boolean; favorite?:boolean
}
type BinderSlot =
  | { kind:'filled'; slotId:string; card:CardItem }
  | { kind:'empty';  slotId:string; name:string; set:string; type:string; estPrice:string }
type BinderType = 'libre'|'set'|'preset'
type BinderData = { id:string; name:string; binderType:BinderType; theme:string; cols:number; slots:BinderSlot[] }

const CARDS: CardItem[] = [
  { id:'1',  name:'Charizard Alt Art',    set:'SV151',            year:2023, number:'006', rarity:'Alt Art',     type:'fire',     lang:'EN', condition:'PSA 9',  graded:true,  buyPrice:620, curPrice:920,  qty:1, psa:312,  signal:'S', hot:true,  favorite:true  },
  { id:'2',  name:'Umbreon VMAX Alt',     set:'Evolving Skies',   year:2021, number:'215', rarity:'Alt Art',     type:'dark',     lang:'EN', condition:'Raw',    graded:false, buyPrice:540, curPrice:880,  qty:2,            signal:'A',        favorite:true  },
  { id:'3',  name:'Charizard VMAX',       set:'Champion Path',    year:2020, number:'074', rarity:'Secret Rare', type:'fire',     lang:'EN', condition:'PSA 10', graded:true,  buyPrice:280, curPrice:420,  qty:1, psa:1240,                     favorite:false },
  { id:'4',  name:'Gengar VMAX Alt',      set:'Fusion Strike',    year:2021, number:'271', rarity:'Alt Art',     type:'psychic',  lang:'EN', condition:'Raw',    graded:false, buyPrice:220, curPrice:340,  qty:1,                                favorite:false },
  { id:'5',  name:'Pikachu VMAX RR',      set:'Vivid Voltage',    year:2020, number:'188', rarity:'Secret Rare', type:'electric', lang:'JP', condition:'PSA 9',  graded:true,  buyPrice:80,  curPrice:110,  qty:3, psa:4200,                     favorite:false },
  { id:'6',  name:'Rayquaza VMAX Alt',    set:'Evolving Skies',   year:2021, number:'218', rarity:'Alt Art',     type:'electric', lang:'EN', condition:'Raw',    graded:false, buyPrice:480, curPrice:740,  qty:1,            signal:'A',        favorite:true  },
  { id:'7',  name:'Mewtwo V Alt',         set:'Pokemon GO',       year:2022, number:'071', rarity:'Alt Art',     type:'psychic',  lang:'JP', condition:'Raw',    graded:false, buyPrice:160, curPrice:280,  qty:2,            signal:'B',        favorite:false },
  { id:'8',  name:'Blastoise Base Set',   set:'Base Set',         year:1999, number:'002', rarity:'Holo Rare',   type:'water',    lang:'EN', condition:'PSA 9',  graded:true,  buyPrice:480, curPrice:620,  qty:1, psa:890,                      favorite:true  },
  { id:'9',  name:'Lugia Neo Genesis',    set:'Neo Genesis',      year:2000, number:'009', rarity:'Holo Rare',   type:'water',    lang:'EN', condition:'PSA 8',  graded:true,  buyPrice:320, curPrice:580,  qty:1, psa:2100,                     favorite:true  },
  { id:'10', name:'Mew ex Alt Art',       set:'SV151',            year:2023, number:'205', rarity:'Alt Art',     type:'psychic',  lang:'JP', condition:'Raw',    graded:false, buyPrice:95,  curPrice:140,  qty:4,                                favorite:false },
  { id:'11', name:'Gardevoir ex SAR',     set:'Scarlet & Violet', year:2023, number:'245', rarity:'Secret Rare', type:'psychic',  lang:'FR', condition:'Raw',    graded:false, buyPrice:60,  curPrice:95,   qty:2,                                favorite:false },
  { id:'12', name:'Miraidon ex SAR',      set:'Scarlet & Violet', year:2023, number:'254', rarity:'Secret Rare', type:'electric', lang:'FR', condition:'Raw',    graded:false, buyPrice:45,  curPrice:72,   qty:3,                                favorite:false },
]

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
const CARD_SETS = [...new Set(CARDS.map(c=>c.set))]
const THEMES = ['fire','water','psychic','dark','electric','grass']
const PRESET_TEMPLATES = [
  { id:'eeveelutions', name:'Eeveelutions', icon:'🌈', desc:'8 Eeveelutions · 24 slots' },
  { id:'charizards',   name:'Charizards',   icon:'🔥', desc:'Tous les Charizard · 18 slots' },
  { id:'legendaries',  name:'Légendaires',  icon:'✨', desc:'Pokémon légendaires · 20 slots' },
  { id:'starters',     name:'Starters',     icon:'🌿', desc:'Starters Gen 1–9 · 27 slots' },
]
type ViewMode = 'binder'|'showcase'|'wrapped'

const f = (card:CardItem, i:number): BinderSlot => ({ kind:'filled', slotId:'s'+i, card })
const e = (id:string, name:string, set:string, type:string, estPrice:string): BinderSlot =>
  ({ kind:'empty', slotId:id, name, set, type, estPrice })

const INITIAL_BINDERS: BinderData[] = [
  {
    id:'b1', name:'Eeveelutions', binderType:'preset', theme:'dark', cols:3,
    slots:[
      f(CARDS[0],1), f(CARDS[1],2),
      e('e1','Sylveon VMAX Alt','Evolving Skies','psychic','€ 250–310'),
      f(CARDS[2],3), f(CARDS[3],4),
      e('e2','Énergie Alt Art','Evolving Skies','electric','€ 40–60'),
      f(CARDS[4],5), f(CARDS[5],6), f(CARDS[6],7),
      f(CARDS[7],8), f(CARDS[8],9), f(CARDS[9],10),
      f(CARDS[10],11), f(CARDS[11],12),
    ]
  },
  {
    id:'b2', name:'Ma Collection', binderType:'libre', theme:'fire', cols:3,
    slots: CARDS.map((card,i) => f(card,i+100))
  }
]

const tiltCard = (e:React.MouseEvent<HTMLDivElement>) => {
  const el=e.currentTarget, r=el.getBoundingClientRect()
  const x=((e.clientX-r.left)/r.width-.5)*24, y=((e.clientY-r.top)/r.height-.5)*-24
  el.style.transform=`perspective(600px) rotateY(${x}deg) rotateX(${y}deg) translateZ(12px) scale(1.04)`
  const s=el.querySelector('.hm') as HTMLElement|null
  if(s){s.style.backgroundPosition=`${Math.round((e.clientX-r.left)/r.width*100)}% ${Math.round((e.clientY-r.top)/r.height*100)}%`;s.style.opacity='0.35'}
}
const resetCard = (e:React.MouseEvent<HTMLDivElement>) => {
  const el=e.currentTarget
  el.style.transition='transform 0.6s cubic-bezier(.23,1,.32,1)'
  el.style.transform=''
  const s=el.querySelector('.hm') as HTMLElement|null
  if(s) s.style.opacity='0'
  setTimeout(()=>{el.style.transition=''},600)
}

export function Holdings() {
  const router = useRouter()
  const [view,         setView]         = useState<ViewMode>('binder')
  const [binders,      setBinders]      = useState<BinderData[]>(INITIAL_BINDERS)
  const [activeBinder, setActiveBinder] = useState('b1')
  const [binderPage,   setBinderPage]   = useState(0)
  const [showCreate,   setShowCreate]   = useState(false)
  const [newName,      setNewName]      = useState('')
  const [newType,      setNewType]      = useState<BinderType>('libre')
  const [newTheme,     setNewTheme]     = useState('fire')
  const [newSet,       setNewSet]       = useState(CARD_SETS[0])
  const [newPreset,    setNewPreset]    = useState('eeveelutions')
  const [inserting,    setInserting]    = useState<string|null>(null)
  const [removing,     setRemoving]     = useState<string|null>(null)
  const [pendingIns,   setPendingIns]   = useState<{slotId:string;card:CardItem}|null>(null)
  const [spotCard,     setSpotCard]     = useState<CardItem|null>(null)
  const [favs,         setFavs]         = useState<Set<string>>(new Set(CARDS.filter(c=>c.favorite).map(c=>c.id)))
  const [shareOpen,    setShareOpen]    = useState(false)
  const [toast,        setToast]        = useState<string|null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout>|null>(null)

  const binder = binders.find(b=>b.id===activeBinder)??binders[0]

  const openBinder = (id:string) => { setActiveBinder(id); setBinderPage(0) }
  const setBinderCols = (n:number) => {
    setBinders(prev=>prev.map(b=>b.id===activeBinder?{...b,cols:n}:b))
    setBinderPage(0)
  }

  const totalBuy  = CARDS.reduce((s,c)=>s+c.buyPrice*c.qty,0)
  const totalCur  = CARDS.reduce((s,c)=>s+c.curPrice*c.qty,0)
  const totalGain = totalCur-totalBuy
  const totalROI  = Math.round((totalGain/totalBuy)*100)
  const bestCard  = [...CARDS].sort((a,b)=>((b.curPrice-b.buyPrice)/b.buyPrice)-((a.curPrice-a.buyPrice)/a.buyPrice))[0]

  const showToast = (msg:string) => {
    setToast(msg)
    if(toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(()=>setToast(null),2400)
  }
  const toggleFav = (id:string, e:React.MouseEvent) => {
    e.stopPropagation()
    setFavs(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})
  }

  const insertCard = (slot:Extract<BinderSlot,{kind:'empty'}>) => {
    if(inserting||removing) return
    const newCard: CardItem = {
      id:slot.slotId+'_card', name:slot.name, set:slot.set, year:2021, number:'???',
      rarity:'Alt Art', type:slot.type, lang:'EN', condition:'Raw',
      graded:false, buyPrice:280, curPrice:290, qty:1, signal:'A',
    }
    setPendingIns({ slotId:slot.slotId, card:newCard })
    const shell = document.getElementById('shell-'+slot.slotId)
    if(shell){
      shell.style.transformOrigin='top center'
      shell.style.transition='transform 0.25s ease-out'
      shell.style.transform='scaleY(1.025)'
      setTimeout(()=>{if(shell)shell.style.transform=''},200)
    }
    setTimeout(()=>{ setInserting(slot.slotId) },30)
    setTimeout(()=>{
      if(shell){
        shell.style.transition='border-color 0.1s'
        shell.style.borderColor='rgba(255,255,255,.7)'
        setTimeout(()=>{if(shell){shell.style.transition='border-color 0.4s';shell.style.borderColor=''}},150)
      }
    },670)
    setTimeout(()=>{
      const emptyLeft = binder.slots.filter(s=>s.kind==='empty').length
      // Remplace le slot EN PLACE — position préservée
      setBinders(prev=>prev.map(b=>b.id!==activeBinder?b:{
        ...b, slots:b.slots.map(s=>s.slotId===slot.slotId
          ? {kind:'filled' as const, slotId:slot.slotId, card:newCard}
          : s
        )
      }))
      setInserting(null); setPendingIns(null)
      if(emptyLeft===1) showToast('SET COMPLET 🏆 · +500 XP !')
      else showToast(slot.name+' insérée ✓')
    },1080)
  }

  const removeCard = (slotId:string, card:CardItem, e:React.MouseEvent) => {
    e.stopPropagation()
    if(removing||inserting) return
    const shell = document.getElementById('shell-'+slotId)
    if(shell){
      shell.style.transformOrigin='top center'
      shell.style.transition='transform 0.2s ease-out'
      shell.style.transform='scaleY(1.02)'
      setTimeout(()=>{if(shell)shell.style.transform=''},200)
    }
    setRemoving(slotId)
    setTimeout(()=>{
      setBinders(prev=>prev.map(b=>b.id!==activeBinder?b:{
        ...b,
        slots: b.binderType==='libre'
          ? b.slots.filter(s=>s.slotId!==slotId)
          : b.slots.map(s=>s.slotId!==slotId?s:{
              kind:'empty' as const, slotId,
              name:card.name, set:card.set, type:card.type, estPrice:'€ '+card.curPrice
            })
      }))
      setRemoving(null)
      showToast(card.name+' retirée du binder')
    },560)
  }

  const createBinder = () => {
    if(!newName.trim()) return
    const newId = 'b'+Date.now()
    let slots: BinderSlot[] = []
    if(newType==='libre'){
      slots = CARDS.map((card,i)=>({kind:'filled' as const,slotId:newId+'s'+i,card}))
    } else if(newType==='set'){
      const sc = CARDS.filter(c=>c.set===newSet)
      slots = sc.map((card,i)=>({kind:'filled' as const,slotId:newId+'s'+i,card}))
      for(let i=0;i<3;i++) slots.push({kind:'empty',slotId:newId+'e'+i,name:'Carte manquante '+(i+1),set:newSet,type:'fire',estPrice:'€ ???'})
    } else {
      for(let i=0;i<12;i++) slots.push({kind:'empty',slotId:newId+'e'+i,name:'Emplacement '+(i+1),set:'Preset',type:'psychic',estPrice:'€ ???'})
    }
    const nb: BinderData = {id:newId,name:newName.trim(),binderType:newType,theme:newTheme,cols:3,slots}
    setBinders(prev=>[...prev,nb])
    openBinder(newId)
    setShowCreate(false); setNewName(''); setNewType('libre')
    showToast(newName.trim()+' créé ✓')
  }

  const deleteBinder = (id:string, e:React.MouseEvent) => {
    e.stopPropagation()
    if(binders.length<=1) return
    const nb = binders.filter(b=>b.id!==id)
    setBinders(nb)
    if(activeBinder===id) openBinder(nb[0].id)
  }

  const slotsPer    = binder.cols * 3
  const slots       = binder.slots
  const totalSlots  = slots.length
  const binderPages = Math.max(1,Math.ceil(totalSlots/slotsPer))
  const pageSlots   = slots.slice(binderPage*slotsPer,(binderPage+1)*slotsPer)
  const phantomCount= Math.max(0,slotsPer-pageSlots.length)
  const filledCount = slots.filter(s=>s.kind==='filled').length
  const pct         = totalSlots>0 ? Math.round(filledCount/totalSlots*100) : 100
  const setComplete = pct===100

  const CardBodyContent = ({card,cols}:{card:CardItem;cols:number}) => {
    const ec=EC[card.type]??'#888',eg=EG[card.type]??'rgba(128,128,128,.4)'
    const roi=Math.round(((card.curPrice-card.buyPrice)/card.buyPrice)*100)
    const isHolo=HOLO_RARITIES.includes(card.rarity),isVintage=card.year<2002
    const orbSz=cols<=3?'36px':cols===4?'28px':'24px'
    const fsName=cols<=3?'10px':cols===4?'9px':'8px'
    const fsPx=cols<=3?'12px':cols===4?'11px':'10px'
    return (<>
      {isHolo&&<div className="holo"/>}
      {isHolo&&<div className="hm"/>}
      <div className="ptcl" style={{background:ec,bottom:'22%',left:'20%'}}/>
      <div className="ptcl" style={{background:ec,bottom:'35%',left:'62%'}}/>
      <div style={{position:'absolute',top:0,left:0,right:0,height:'2.5px',background:`linear-gradient(90deg,${ec},${ec}44)`,zIndex:4}}/>
      <div style={{position:'absolute',top:'8px',left:'8px',right:'8px',bottom:'54px',borderRadius:'7px',background:`${ec}12`,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
        <div style={{position:'absolute',width:'65%',height:'65%',borderRadius:'50%',background:eg,filter:'blur(14px)',opacity:.6}}/>
        <div style={{width:orbSz,height:orbSz,borderRadius:'50%',background:`radial-gradient(circle at 35% 35%,${ec}CC,${ec}77)`,boxShadow:`0 0 16px ${eg}`,position:'relative',zIndex:1}}/>
        {card.signal&&<div style={{position:'absolute',top:'4px',right:'4px',fontSize:'7px',fontWeight:700,background:TIER_BG[card.signal],color:'#fff',padding:'1px 5px',borderRadius:'3px',fontFamily:'var(--font-display)',zIndex:2}}>{card.signal}</div>}
        {favs.has(card.id)&&<div style={{position:'absolute',top:'4px',left:'4px',fontSize:'10px',zIndex:2}}>❤️</div>}
        {card.graded&&<div style={{position:'absolute',bottom:'4px',right:'4px',fontSize:'7px',fontWeight:700,background:'rgba(0,0,0,.75)',color:'rgba(255,255,255,.9)',padding:'1px 5px',borderRadius:'3px',fontFamily:'var(--font-display)',zIndex:2}}>{card.condition}</div>}
        {card.hot&&<div style={{position:'absolute',top:'4px',left:'4px',width:'6px',height:'6px',borderRadius:'50%',background:'#E03020',animation:'shimGlow 1.4s ease-in-out infinite',zIndex:3}}/>}
        {isVintage&&<div style={{position:'absolute',bottom:0,left:0,right:0,height:'10px',background:'linear-gradient(0deg,rgba(0,0,0,.5),transparent)',zIndex:3,pointerEvents:'none'}}/>}
      </div>
      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'6px 8px 8px'}}>
        <div style={{fontSize:fsName,fontWeight:600,color:'rgba(255,255,255,.85)',fontFamily:'var(--font-display)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:'2px'}}>{card.name}</div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:fsPx,fontWeight:700,color:'rgba(255,255,255,.9)',fontFamily:'var(--font-display)',letterSpacing:'-0.3px'}}>€ {card.curPrice}</div>
          <div style={{fontSize:'10px',fontWeight:600,color:roi>=0?'#4ECCA3':'#FF6B8A'}}>{roi>=0?'+':''}{roi}%</div>
        </div>
      </div>
    </>)
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp     { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cardIn     { from{opacity:0;transform:scale(.88) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes holoShift  { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes breatheS   { 0%,100%{box-shadow:0 0 18px rgba(255,107,53,.4),0 4px 24px rgba(0,0,0,.6)} 50%{box-shadow:0 0 44px rgba(255,107,53,.7),0 8px 40px rgba(0,0,0,.7)} }
        @keyframes breatheA   { 0%,100%{box-shadow:0 0 12px rgba(200,85,212,.35),0 4px 18px rgba(0,0,0,.5)} 50%{box-shadow:0 0 28px rgba(200,85,212,.6),0 6px 28px rgba(0,0,0,.6)} }
        @keyframes ptcl       { 0%{transform:translateY(0) scale(1);opacity:.8} 100%{transform:translateY(-28px) scale(0);opacity:0} }
        @keyframes shimGlow   { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes toastIn    { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes complBadge { from{opacity:0;transform:scale(1.4)} to{opacity:1;transform:scale(1)} }
        @keyframes wrappedIn  { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        @keyframes modalIn    { from{opacity:0;transform:translateY(24px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes slideDown {
          0%   { transform:translateY(-100%); }
          62%  { transform:translateY(4px); }
          80%  { transform:translateY(1.5px); }
          91%  { transform:translateY(-0.5px); }
          100% { transform:translateY(0); }
        }
        @keyframes slideUp {
          0%   { transform:translateY(0); }
          100% { transform:translateY(-102%); }
        }
        .gem          { position:relative;border-radius:14px;overflow:hidden;cursor:pointer;will-change:transform; }
        .gem .holo    { position:absolute;inset:0;border-radius:inherit;background:linear-gradient(115deg,#ff0080,#ff8c00,#ffd700,#00ff88,#00cfff,#8b00ff,#ff0080);background-size:500% 500%;mix-blend-mode:overlay;opacity:0;pointer-events:none;transition:opacity .35s;animation:holoShift 8s ease infinite; }
        .gem .hm      { position:absolute;inset:0;border-radius:inherit;background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.4),transparent 65%);opacity:0;pointer-events:none;mix-blend-mode:overlay;transition:opacity .25s; }
        .gem:hover .holo { opacity:.28; }
        .gem .ptcl    { position:absolute;width:3px;height:3px;border-radius:50%;pointer-events:none;opacity:0; }
        .gem:hover .ptcl:nth-child(1){ animation:ptcl 2s ease-out infinite; }
        .gem:hover .ptcl:nth-child(2){ animation:ptcl 2.4s .5s ease-out infinite; }
        .gem:hover .ptcl:nth-child(3){ animation:ptcl 1.8s 1s ease-out infinite; }
        .breathe-S    { animation:breatheS 2.4s ease-in-out infinite; }
        .breathe-A    { animation:breatheA 3s ease-in-out infinite; }
        .pocket-shell  { position:relative;border-radius:9px;overflow:hidden;cursor:pointer;transition:transform .2s cubic-bezier(.34,1.2,.64,1); }
        .pocket-shell:hover  { transform:translateY(-5px) scale(1.04) !important; }
        .pocket-shell.empty:hover { border-color:rgba(255,255,255,.28) !important; }
        .pocket-shell::before { content:'';position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(180deg,rgba(255,255,255,.12),transparent);border-radius:9px 9px 0 0;z-index:10;pointer-events:none; }
        .pocket-shell::after  { content:'';position:absolute;bottom:0;left:0;right:0;height:8px;background:linear-gradient(0deg,rgba(0,0,0,.45),transparent);z-index:10;pointer-events:none; }
        .card-body     { position:absolute;inset:0; }
        .card-body.ins { animation:slideDown 1.05s cubic-bezier(.22,.58,.36,1) forwards; }
        .card-body.rem { animation:slideUp .55s cubic-bezier(.4,0,.6,1) forwards;pointer-events:none; }
        .vtab    { padding:7px 18px;border-radius:99px;border:1px solid rgba(255,255,255,.12);background:transparent;color:rgba(255,255,255,.4);font-size:12px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .15s; }
        .vtab.on { background:rgba(255,255,255,.12) !important;border-color:rgba(255,255,255,.3) !important;color:#fff !important; }
        .colbtn  { width:28px;height:28px;border-radius:7px;font-size:11px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .15s; }
        .share-fmt { border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;cursor:pointer;transition:transform .15s,border-color .15s; }
        .share-fmt:hover { transform:translateY(-3px);border-color:rgba(255,255,255,.25); }
        .remove-btn { pointer-events:all !important; }
        .btab    { padding:6px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.45);font-size:11px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .15s;white-space:nowrap;display:flex;align-items:center;gap:6px; }
        .btab.on { background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.28);color:#fff; }
        .btab:hover { background:rgba(255,255,255,.08); }
        .theme-dot { width:14px;height:14px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:all .15s; }
        .theme-dot.sel { border-color:#fff;transform:scale(1.2); }
      `}</style>

      <div style={{background:'#070503',minHeight:'100vh',borderRadius:'16px',overflow:'hidden',position:'relative'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(ellipse at 15% 30%,rgba(255,107,53,.07) 0%,transparent 40%),radial-gradient(ellipse at 85% 70%,rgba(126,87,194,.07) 0%,transparent 40%)',pointerEvents:'none',zIndex:0}}/>

        {toast&&(
          <div style={{position:'absolute',bottom:'24px',left:'50%',transform:'translateX(-50%)',background:'rgba(10,6,2,.95)',color:'rgba(255,255,255,.85)',padding:'9px 20px',borderRadius:'22px',fontSize:'12px',fontWeight:500,border:'1px solid rgba(255,255,255,.12)',whiteSpace:'nowrap',zIndex:50,animation:'toastIn .3s ease-out',fontFamily:'var(--font-display)'}}>
            {setComplete?'🏆 ':'✓ '}{toast}
          </div>
        )}

        {/* MODAL CRÉER BINDER */}
        {showCreate&&(
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.75)',zIndex:48,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}} onClick={()=>setShowCreate(false)}>
            <div style={{background:'#0F0A04',borderRadius:'20px',border:'1px solid rgba(255,255,255,.1)',padding:'28px',maxWidth:'480px',width:'100%',animation:'modalIn .25s ease-out'}} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:'16px',fontWeight:600,color:'#fff',fontFamily:'var(--font-display)',marginBottom:'20px'}}>Nouveau binder</div>
              <div style={{marginBottom:'16px'}}>
                <div style={{fontSize:'10px',color:'rgba(255,255,255,.35)',textTransform:'uppercase' as const,letterSpacing:'.1em',fontFamily:'var(--font-display)',marginBottom:'6px'}}>Nom</div>
                <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Mon binder..."
                  style={{width:'100%',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)',borderRadius:'9px',padding:'10px 14px',color:'#fff',fontSize:'13px',outline:'none',fontFamily:'var(--font-display)'}}/>
              </div>
              <div style={{marginBottom:'16px'}}>
                <div style={{fontSize:'10px',color:'rgba(255,255,255,.35)',textTransform:'uppercase' as const,letterSpacing:'.1em',fontFamily:'var(--font-display)',marginBottom:'8px'}}>Type</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
                  {([['libre','📚','Libre','Toute ta collection, sans emplacement dédié'],['set','🃏','Par set','Un binder par extension complète'],['preset','✨','Preset','Thème préconstruit (Eeveelutions, etc.)']] as [BinderType,string,string,string][]).map(([t,icon,label,desc])=>(
                    <div key={t} onClick={()=>setNewType(t)} style={{padding:'12px',borderRadius:'10px',border:`1px solid ${newType===t?'rgba(255,255,255,.3)':'rgba(255,255,255,.08)'}`,background:newType===t?'rgba(255,255,255,.1)':'rgba(255,255,255,.03)',cursor:'pointer',transition:'all .15s'}}>
                      <div style={{fontSize:'18px',marginBottom:'4px'}}>{icon}</div>
                      <div style={{fontSize:'12px',fontWeight:600,color:newType===t?'#fff':'rgba(255,255,255,.6)',fontFamily:'var(--font-display)'}}>{label}</div>
                      <div style={{fontSize:'10px',color:'rgba(255,255,255,.3)',marginTop:'2px',lineHeight:1.4}}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              {newType==='set'&&(
                <div style={{marginBottom:'16px'}}>
                  <div style={{fontSize:'10px',color:'rgba(255,255,255,.35)',textTransform:'uppercase' as const,letterSpacing:'.1em',fontFamily:'var(--font-display)',marginBottom:'6px'}}>Extension</div>
                  <select value={newSet} onChange={e=>setNewSet(e.target.value)} style={{width:'100%',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)',borderRadius:'9px',padding:'10px 14px',color:'#fff',fontSize:'13px',outline:'none',fontFamily:'var(--font-display)'}}>
                    {CARD_SETS.map(s=><option key={s} value={s} style={{background:'#111'}}>{s}</option>)}
                  </select>
                </div>
              )}
              {newType==='preset'&&(
                <div style={{marginBottom:'16px'}}>
                  <div style={{fontSize:'10px',color:'rgba(255,255,255,.35)',textTransform:'uppercase' as const,letterSpacing:'.1em',fontFamily:'var(--font-display)',marginBottom:'8px'}}>Thème</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'6px'}}>
                    {PRESET_TEMPLATES.map(p=>(
                      <div key={p.id} onClick={()=>setNewPreset(p.id)} style={{padding:'10px 12px',borderRadius:'8px',border:`1px solid ${newPreset===p.id?'rgba(255,255,255,.3)':'rgba(255,255,255,.08)'}`,background:newPreset===p.id?'rgba(255,255,255,.09)':'rgba(255,255,255,.02)',cursor:'pointer',display:'flex',gap:'8px',alignItems:'center'}}>
                        <span style={{fontSize:'16px'}}>{p.icon}</span>
                        <div>
                          <div style={{fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,.8)',fontFamily:'var(--font-display)'}}>{p.name}</div>
                          <div style={{fontSize:'9px',color:'rgba(255,255,255,.3)'}}>{p.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{marginBottom:'22px'}}>
                <div style={{fontSize:'10px',color:'rgba(255,255,255,.35)',textTransform:'uppercase' as const,letterSpacing:'.1em',fontFamily:'var(--font-display)',marginBottom:'8px'}}>Couleur</div>
                <div style={{display:'flex',gap:'8px'}}>
                  {THEMES.map(t=>(
                    <div key={t} onClick={()=>setNewTheme(t)} className={`theme-dot${newTheme===t?' sel':''}`} style={{background:EC[t]??'#888'}}/>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={createBinder} style={{flex:1,padding:'12px',borderRadius:'10px',background:'linear-gradient(135deg,#E03020,#FF4433)',color:'#fff',border:'none',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)'}}>Créer le binder →</button>
                <button onClick={()=>setShowCreate(false)} style={{padding:'12px 18px',borderRadius:'10px',background:'rgba(255,255,255,.06)',color:'rgba(255,255,255,.5)',border:'1px solid rgba(255,255,255,.1)',fontSize:'13px',cursor:'pointer',fontFamily:'var(--font-display)'}}>Annuler</button>
              </div>
            </div>
          </div>
        )}

        {/* SPOTLIGHT */}
        {spotCard&&(()=>{
          const ec=EC[spotCard.type]??'#888',eg=EG[spotCard.type]??'rgba(128,128,128,.4)'
          const roi=Math.round(((spotCard.curPrice-spotCard.buyPrice)/spotCard.buyPrice)*100)
          const gain=(spotCard.curPrice-spotCard.buyPrice)*spotCard.qty
          const isHolo=HOLO_RARITIES.includes(spotCard.rarity)
          return(
            <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.82)',zIndex:40,display:'flex',alignItems:'center',justifyContent:'center',padding:'32px'}} onClick={()=>setSpotCard(null)}>
              <div style={{background:'#0F0A04',borderRadius:'20px',border:`1px solid ${ec}40`,boxShadow:`0 0 60px ${eg},0 24px 60px rgba(0,0,0,.8)`,padding:'28px',maxWidth:'680px',width:'100%',animation:'fadeUp .25s ease-out'}} onClick={e=>e.stopPropagation()}>
                <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:'24px',alignItems:'start'}}>
                  <div className="gem" style={{background:`linear-gradient(160deg,${ec}22,${ec}08)`,border:`2px solid ${ec}50`,boxShadow:`0 0 40px ${eg},0 12px 40px rgba(0,0,0,.7)`}} onMouseMove={tiltCard} onMouseLeave={resetCard}>
                    {isHolo&&<div className="holo"/>}
                    <div className="hm"/>
                    <div className="ptcl" style={{background:ec,bottom:'22%',left:'20%'}}/>
                    <div className="ptcl" style={{background:ec,bottom:'35%',left:'65%'}}/>
                    <div style={{height:'3px',background:`linear-gradient(90deg,${ec},${ec}55)`,position:'absolute',top:0,left:0,right:0}}/>
                    {spotCard.signal&&<div style={{position:'absolute',top:'10px',right:'10px',zIndex:3,fontSize:'10px',fontWeight:700,background:TIER_BG[spotCard.signal],color:'#fff',padding:'3px 9px',borderRadius:'6px',fontFamily:'var(--font-display)'}}>Tier {spotCard.signal}</div>}
                    <div style={{height:'200px',margin:'6px 6px 0',borderRadius:'10px',background:`${ec}14`,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
                      <div style={{position:'absolute',width:'75%',height:'75%',borderRadius:'50%',background:eg,filter:'blur(28px)',opacity:.65}}/>
                      <div style={{width:'64px',height:'64px',borderRadius:'50%',background:`radial-gradient(circle at 35% 35%,${ec}DD,${ec}77)`,boxShadow:`0 0 28px ${eg}`,zIndex:1}}/>
                    </div>
                    <div style={{padding:'14px'}}>
                      <div style={{fontSize:'16px',fontWeight:600,color:'#fff',fontFamily:'var(--font-display)',marginBottom:'3px'}}>{spotCard.name}</div>
                      <div style={{fontSize:'11px',color:'rgba(255,255,255,.3)'}}>{spotCard.set} · #{spotCard.number} · {spotCard.year}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:'40px',fontWeight:600,color:'#fff',fontFamily:'var(--font-display)',letterSpacing:'-1.5px',lineHeight:1,marginBottom:'6px'}}>€ {spotCard.curPrice.toLocaleString('fr-FR')}</div>
                    <div style={{fontSize:'16px',color:'#4ECCA3',fontWeight:500,marginBottom:'20px'}}>▲ +{roi}% · +€ {gain.toLocaleString('fr-FR')}</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'16px'}}>
                      {[{l:'Achat',v:`€ ${spotCard.buyPrice.toLocaleString('fr-FR')}`,c:'rgba(255,255,255,.5)'},{l:'Marché',v:`€ ${spotCard.curPrice.toLocaleString('fr-FR')}`,c:'#fff'},{l:'ROI',v:`+${roi}%`,c:'#4ECCA3'},{l:'Quantité',v:`×${spotCard.qty}`,c:'rgba(255,255,255,.7)'},{l:'PSA Pop',v:spotCard.psa?spotCard.psa.toLocaleString():'—',c:'rgba(255,255,255,.7)'},{l:'Gain',v:`+€ ${Math.abs(gain).toLocaleString('fr-FR')}`,c:'#4ECCA3'}].map(s=>(
                        <div key={s.l} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:'9px',padding:'10px 12px'}}>
                          <div style={{fontSize:'9px',color:'rgba(255,255,255,.3)',textTransform:'uppercase' as const,letterSpacing:'.08em',fontFamily:'var(--font-display)',marginBottom:'4px'}}>{s.l}</div>
                          <div style={{fontSize:'15px',fontWeight:600,color:s.c,fontFamily:'var(--font-display)'}}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                    {spotCard.signal&&(
                      <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'10px',padding:'12px 14px',marginBottom:'14px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}}>
                          <div style={{width:'24px',height:'24px',borderRadius:'7px',background:'linear-gradient(135deg,#FF7A5A,#E03020)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'11px',fontWeight:700}}>D</div>
                          <span style={{fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,.7)',fontFamily:'var(--font-display)'}}>Dexy IA · Tier {spotCard.signal}</span>
                        </div>
                        <p style={{fontSize:'12px',color:'rgba(255,255,255,.45)',lineHeight:1.7,margin:0}}>
                          {spotCard.signal==='S'?`PSA Pop de seulement ${spotCard.psa||'?'} exemplaires. Signal S maintenu.`:`Signal ${spotCard.signal} actif — progression attendue 2–4 semaines.`}
                        </p>
                      </div>
                    )}
                    <div style={{display:'flex',gap:'8px'}}>
                      <button onClick={()=>router.push('/alpha')} style={{flex:2,padding:'11px',borderRadius:'9px',background:'linear-gradient(135deg,#E03020,#FF4433)',color:'#fff',border:'none',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)'}}>Voir signal →</button>
                      <button onClick={()=>setShareOpen(true)} style={{flex:1,padding:'11px',borderRadius:'9px',background:'rgba(255,255,255,.07)',color:'rgba(255,255,255,.7)',border:'1px solid rgba(255,255,255,.12)',fontSize:'13px',cursor:'pointer',fontFamily:'var(--font-display)'}}>Partager</button>
                      <button onClick={e=>toggleFav(spotCard.id,e)} style={{width:'44px',borderRadius:'9px',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{favs.has(spotCard.id)?'❤️':'🤍'}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* SHARE SHEET — EN HAUT */}
        {shareOpen&&(
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.75)',zIndex:45,display:'flex',alignItems:'flex-start',borderRadius:'16px'}} onClick={()=>setShareOpen(false)}>
            <div style={{width:'100%',background:'#0F0B07',borderBottom:'1px solid rgba(255,255,255,.1)',borderRadius:'16px 16px 0 0',padding:'24px 28px',animation:'fadeUp .25s ease-out'}} onClick={e=>e.stopPropagation()}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px'}}>
                <div style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,.8)',fontFamily:'var(--font-display)'}}>Partager ma collection</div>
                <button onClick={()=>setShareOpen(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,.4)',cursor:'pointer',fontSize:'20px',padding:0,lineHeight:1}}>×</button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'16px'}}>
                {[
                  {title:'Story Instagram',sub:'9:16 · TikTok · Reels',preview:(
                    <div style={{height:'130px',background:'#1A0A05',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
                      <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 50% 40%,rgba(255,107,53,.2),transparent 60%)'}}/>
                      <div style={{width:'60px',height:'104px',borderRadius:'8px',background:'linear-gradient(145deg,rgba(255,107,53,.2),rgba(200,60,20,.08))',border:'1px solid rgba(255,107,53,.35)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'6px',position:'relative'}}>
                        <div style={{fontSize:'6px',color:'rgba(255,255,255,.25)',letterSpacing:'.1em'}}>POKÉ ALPHA</div>
                        <div style={{width:'24px',height:'24px',borderRadius:'50%',background:'radial-gradient(circle at 35% 35%,#FF9050,#E03020)'}}/>
                        <div style={{fontSize:'7px',fontWeight:500,color:'rgba(255,255,255,.7)',textAlign:'center',lineHeight:1.3}}>Charizard Alt Art</div>
                        <div style={{fontSize:'10px',fontWeight:500,color:'#fff'}}>€ 920</div>
                        <div style={{fontSize:'7px',color:'#4ECCA3'}}>+53% ROI</div>
                      </div>
                    </div>
                  )},
                  {title:'Grille Top 4',sub:'1:1 · Feed · Twitter',preview:(
                    <div style={{height:'130px',background:'#1A0A05',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <div style={{width:'108px',height:'108px',borderRadius:'10px',background:'#111',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px',padding:'3px'}}>
                        {[EC.fire,EC.dark,EC.water,EC.psychic].map((c,i)=>(
                          <div key={i} style={{borderRadius:'5px',background:`linear-gradient(145deg,${c}40,${c}18)`,border:`1px solid ${c}50`}}/>
                        ))}
                      </div>
                    </div>
                  )},
                  {title:'Carte investisseur',sub:'Portfolio · ROI branding',preview:(
                    <div style={{height:'130px',background:'#1A0A05',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <div style={{width:'160px',height:'88px',borderRadius:'10px',overflow:'hidden',position:'relative'}}>
                        <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#111,#1A1208)'}}/>
                        <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 80% 40%,rgba(255,107,53,.12),transparent 60%)'}}/>
                        <div style={{position:'relative',padding:'10px 12px',height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
                          <div><div style={{fontSize:'7px',color:'rgba(255,255,255,.25)',letterSpacing:'.1em',textTransform:'uppercase' as const}}>Ma Collection</div><div style={{fontSize:'18px',fontWeight:500,color:'#fff',letterSpacing:'-0.5px',fontFamily:'var(--font-display)'}}>€ {totalCur.toLocaleString('fr-FR')}</div></div>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                            <div><div style={{fontSize:'7px',color:'rgba(255,255,255,.25)'}}>ROI TOTAL</div><div style={{fontSize:'12px',fontWeight:500,color:'#4ECCA3',fontFamily:'var(--font-display)'}}>+{totalROI}%</div></div>
                            <div style={{fontSize:'7px',color:'rgba(255,255,255,.2)'}}>POKÉ ALPHA</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )},
                ].map(f=>(
                  <div key={f.title} className="share-fmt">
                    {f.preview}
                    <div style={{padding:'10px 12px',background:'rgba(255,255,255,.03)',borderTop:'1px solid rgba(255,255,255,.06)'}}>
                      <div style={{fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,.7)',fontFamily:'var(--font-display)'}}>{f.title}</div>
                      <div style={{fontSize:'10px',color:'rgba(255,255,255,.3)',marginTop:'2px'}}>{f.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <button style={{flex:1,padding:'12px',borderRadius:'10px',background:'linear-gradient(135deg,#E03020,#FF4433)',color:'#fff',border:'none',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',boxShadow:'0 4px 16px rgba(224,48,32,.4)'}}>Générer les 3 formats · PNG HD</button>
                <button style={{padding:'12px 18px',borderRadius:'10px',background:'rgba(255,255,255,.06)',color:'rgba(255,255,255,.6)',border:'1px solid rgba(255,255,255,.1)',fontSize:'13px',cursor:'pointer',fontFamily:'var(--font-display)'}}>Copier le lien</button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div style={{position:'relative',zIndex:1,padding:'28px 28px 20px'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap' as const,gap:'16px',marginBottom:'22px'}}>
            <div>
              <div style={{fontSize:'10px',fontWeight:500,color:'rgba(255,255,255,.25)',textTransform:'uppercase' as const,letterSpacing:'.15em',fontFamily:'var(--font-display)',marginBottom:'6px'}}>Portfolio</div>
              <div style={{fontSize:'38px',fontWeight:600,color:'#fff',fontFamily:'var(--font-display)',letterSpacing:'-1.5px',lineHeight:1}}>€ {totalCur.toLocaleString('fr-FR')}</div>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'6px'}}>
                <span style={{fontSize:'14px',fontWeight:500,color:'#4ECCA3'}}>▲ +{totalROI}% · +€ {totalGain.toLocaleString('fr-FR')}</span>
                <span style={{width:'4px',height:'4px',borderRadius:'50%',background:'rgba(255,255,255,.2)',display:'inline-block'}}/>
                <span style={{fontSize:'13px',color:'rgba(255,255,255,.35)'}}>{CARDS.length} cartes · {CARDS.reduce((s,c)=>s+c.qty,0)} ex.</span>
              </div>
            </div>
            <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
              <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'12px 16px'}}>
                <div style={{fontSize:'9px',color:'rgba(255,255,255,.3)',textTransform:'uppercase' as const,letterSpacing:'.08em',fontFamily:'var(--font-display)',marginBottom:'4px'}}>Meilleure perf.</div>
                <div style={{fontSize:'18px',fontWeight:600,color:'#FFD700',fontFamily:'var(--font-display)'}}>+{Math.round(((bestCard.curPrice-bestCard.buyPrice)/bestCard.buyPrice)*100)}%</div>
                <div style={{fontSize:'10px',color:'rgba(255,255,255,.3)'}}>{bestCard.name}</div>
              </div>
              <button onClick={()=>setShareOpen(true)} style={{padding:'10px 18px',borderRadius:'12px',background:'linear-gradient(135deg,#E03020,#FF4433)',color:'#fff',border:'none',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',boxShadow:'0 4px 16px rgba(224,48,32,.45)'}}>Partager →</button>
            </div>
          </div>
          <div style={{display:'flex',gap:'6px'}}>
            {([['binder','Binder'],['showcase','Vitrine'],['wrapped','Wrapped 2026']] as [ViewMode,string][]).map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)} className={`vtab${view===v?' on':''}`}>{l}</button>
            ))}
          </div>
        </div>

        {/* ── VUE BINDER ── */}
        {view==='binder'&&(
          <div style={{position:'relative',zIndex:1,padding:'0 24px 28px',animation:'fadeUp .3s ease-out'}}>
            {/* Binder tabs */}
            <div style={{display:'flex',gap:'6px',marginBottom:'14px',overflowX:'auto' as const,paddingBottom:'2px'}}>
              {binders.map(b=>{
                const tc=EC[b.theme]??'#888'
                return(
                  <button key={b.id} onClick={()=>openBinder(b.id)} className={`btab${activeBinder===b.id?' on':''}`}
                    style={{borderColor:activeBinder===b.id?`${tc}55`:'rgba(255,255,255,.1)'}}>
                    <div style={{width:'8px',height:'8px',borderRadius:'50%',background:tc,flexShrink:0,opacity:activeBinder===b.id?1:.5}}/>
                    <span>{b.name}</span>
                    <span style={{fontSize:'9px',color:'rgba(255,255,255,.25)',marginLeft:'2px'}}>
                      {b.binderType==='libre'?'📚':b.binderType==='set'?'🃏':'✨'}
                    </span>
                    {binders.length>1&&(
                      <span onClick={e=>deleteBinder(b.id,e)} style={{marginLeft:'2px',opacity:.4,fontSize:'13px',lineHeight:1,transition:'opacity .15s'}}
                        onMouseEnter={e=>(e.currentTarget.style.opacity='1')} onMouseLeave={e=>(e.currentTarget.style.opacity='.4')}>×</span>
                    )}
                  </button>
                )
              })}
              <button onClick={()=>setShowCreate(true)} className="btab" style={{borderStyle:'dashed'}}>+ Nouveau</button>
            </div>

            <div style={{background:'linear-gradient(160deg,#1C1008 0%,#130C05 50%,#1C1008 100%)',borderRadius:'18px',boxShadow:'0 24px 60px rgba(0,0,0,.55),0 4px 12px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.05)',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.018) 39px,rgba(255,255,255,.018) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.018) 39px,rgba(255,255,255,.018) 40px)',pointerEvents:'none'}}/>
              <div style={{position:'absolute',inset:0,backgroundImage:`radial-gradient(ellipse at 20% 30%,${EC[binder.theme]??'#888'}0A 0%,transparent 45%),radial-gradient(ellipse at 80% 70%,rgba(126,87,194,.05) 0%,transparent 45%)`,pointerEvents:'none'}}/>
              <div style={{position:'relative',padding:'22px 22px 18px'}}>

                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'18px'}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <div style={{width:'8px',height:'8px',borderRadius:'50%',background:EC[binder.theme]??'#888'}}/>
                      <div style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,.7)',fontFamily:'var(--font-display)'}}>{binder.name}</div>
                      <div style={{fontSize:'9px',color:'rgba(255,255,255,.25)',background:'rgba(255,255,255,.06)',padding:'2px 8px',borderRadius:'20px',fontFamily:'var(--font-display)'}}>
                        {binder.binderType==='libre'?'Libre':binder.binderType==='set'?'Par set':'Preset'}
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'4px'}}>
                      <span style={{fontSize:'11px',color:'rgba(255,255,255,.3)'}}>{filledCount}/{totalSlots} · page {binderPage+1}/{binderPages}</span>
                      {setComplete&&<span style={{fontSize:'10px',fontWeight:600,background:'linear-gradient(135deg,#FFD700,#FF8C00)',color:'#fff',padding:'2px 10px',borderRadius:'12px',boxShadow:'0 2px 8px rgba(255,215,0,.5)',animation:'complBadge .4s ease-out',fontFamily:'var(--font-display)'}}>SET COMPLET 🏆</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column' as const,alignItems:'flex-end',gap:'8px'}}>
                    <div style={{display:'flex',gap:'4px'}}>
                      {[3,4,5].map(n=>(
                        <button key={n} onClick={()=>setBinderCols(n)} className="colbtn" style={{border:`1px solid ${binder.cols===n?'rgba(255,255,255,.3)':'rgba(255,255,255,.08)'}`,background:binder.cols===n?'rgba(255,255,255,.12)':'transparent',color:binder.cols===n?'#fff':'rgba(255,255,255,.35)'}}>{n}</button>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                      <button onClick={()=>setBinderPage(p=>Math.max(0,p-1))} disabled={binderPage===0} style={{width:'28px',height:'28px',borderRadius:'7px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:binderPage===0?'rgba(255,255,255,.2)':'rgba(255,255,255,.55)',cursor:binderPage===0?'default':'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
                      <span style={{fontSize:'10px',color:'rgba(255,255,255,.3)',minWidth:'36px',textAlign:'center' as const,fontFamily:'var(--font-display)'}}>{binderPage+1}/{binderPages}</span>
                      <button onClick={()=>setBinderPage(p=>Math.min(binderPages-1,p+1))} disabled={binderPage>=binderPages-1} style={{width:'28px',height:'28px',borderRadius:'7px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:binderPage>=binderPages-1?'rgba(255,255,255,.2)':'rgba(255,255,255,.55)',cursor:binderPage>=binderPages-1?'default':'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
                    </div>
                  </div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:`repeat(${binder.cols},1fr)`,gap:'10px'}}>
                  {pageSlots.map((slot, idx) => {
                    if(slot.kind==='empty'){
                      const pCard = pendingIns?.slotId===slot.slotId ? pendingIns.card : null
                      const pec   = pCard ? (EC[pCard.type]??'#888') : (EC[slot.type]??'#888')
                      return (
                        <div key={slot.slotId} id={`shell-${slot.slotId}`}
                          className={`pocket-shell${pCard?' gem':' empty'}`}
                          style={{aspectRatio:'2/3',border:pCard?`1.5px solid ${pec}45`:'1.5px dashed rgba(255,255,255,.12)',background:pCard?`linear-gradient(145deg,${pec}20,${pec}08)`:'rgba(255,255,255,.02)',cursor:pCard?'default':'pointer'}}
                          onClick={()=>{ if(!pCard) insertCard(slot) }}
                        >
                          {pCard ? (
                            <div className={`card-body${inserting===slot.slotId?' ins':''}`}>
                              <CardBodyContent card={pCard} cols={binder.cols}/>
                            </div>
                          ) : (
                            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',gap:'5px'}}>
                              <div style={{width:'26px',height:'26px',borderRadius:'50%',border:'1.5px dashed rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <span style={{fontSize:'14px',color:'rgba(255,255,255,.12)',lineHeight:1}}>+</span>
                              </div>
                              <div style={{fontSize:'8px',color:'rgba(255,100,100,.5)',textAlign:'center' as const,lineHeight:1.6,padding:'0 6px'}}>
                                {slot.name}<br/><span style={{color:'rgba(255,255,255,.2)',fontSize:'8px'}}>{slot.estPrice}</span>
                              </div>
                              <div style={{fontSize:'7px',background:'rgba(224,48,32,.15)',color:'rgba(224,48,32,.6)',padding:'2px 8px',borderRadius:'10px',fontFamily:'var(--font-display)'}}>Cliquer pour insérer</div>
                            </div>
                          )}
                        </div>
                      )
                    }
                    const {card} = slot
                    const ec = EC[card.type]??'#888'
                    return (
                      <div key={slot.slotId} id={`shell-${slot.slotId}`}
                        className={`pocket-shell gem${card.signal==='S'?' breathe-S':card.signal==='A'?' breathe-A':''}`}
                        style={{aspectRatio:'2/3',background:`linear-gradient(145deg,${ec}20,${ec}08)`,border:`1.5px solid ${ec}45`,boxShadow:'0 4px 14px rgba(0,0,0,.5)',animation:`cardIn .3s ${Math.min(idx,8)*.04}s ease-out both`}}
                        onMouseMove={tiltCard}
                        onMouseLeave={e=>{resetCard(e);const rb=e.currentTarget.querySelector('.remove-btn') as HTMLElement|null;if(rb)rb.style.opacity='0'}}
                        onMouseEnter={e=>{const rb=e.currentTarget.querySelector('.remove-btn') as HTMLElement|null;if(rb)rb.style.opacity='1'}}
                        onClick={()=>setSpotCard(card)}
                      >
                        <div className={`card-body${removing===slot.slotId?' rem':''}`}>
                          <CardBodyContent card={card} cols={binder.cols}/>
                        </div>
                        <button className="remove-btn" onClick={e=>removeCard(slot.slotId,card,e)}
                          style={{position:'absolute',top:'6px',left:'50%',transform:'translateX(-50%)',zIndex:20,background:'rgba(0,0,0,.8)',border:'1px solid rgba(255,255,255,.2)',color:'rgba(255,255,255,.85)',borderRadius:'20px',padding:'3px 10px',fontSize:'9px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',opacity:0,transition:'opacity .2s',whiteSpace:'nowrap',backdropFilter:'blur(4px)'}}>
                          ↑ Retirer
                        </button>
                      </div>
                    )
                  })}
                  {Array.from({length:phantomCount}).map((_,i)=>(
                    <div key={`ph-${i}`} style={{aspectRatio:'2/3',borderRadius:'9px',border:'1px solid rgba(255,255,255,.04)',background:'rgba(255,255,255,.01)',opacity:.4}}/>
                  ))}
                </div>

                {binderPages>1&&(
                  <div style={{display:'flex',justifyContent:'center',gap:'6px',marginTop:'16px'}}>
                    {Array.from({length:binderPages}).map((_,i)=>(
                      <div key={i} onClick={()=>setBinderPage(i)} style={{height:'4px',borderRadius:'2px',background:i===binderPage?'rgba(255,255,255,.55)':'rgba(255,255,255,.15)',cursor:'pointer',transition:'all .2s',width:i===binderPage?'18px':'6px'}}/>
                    ))}
                  </div>
                )}

                {binder.binderType!=='libre'&&(
                  <div style={{marginTop:'16px',paddingTop:'14px',borderTop:'1px solid rgba(255,255,255,.05)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                      <span style={{fontSize:'9px',color:'rgba(255,255,255,.2)',letterSpacing:'.08em',textTransform:'uppercase' as const,fontFamily:'var(--font-display)'}}>Complétion</span>
                      <span style={{fontSize:'9px',color:setComplete?'#FFD700':'rgba(255,255,255,.3)',fontFamily:'var(--font-display)',fontWeight:setComplete?600:400}}>{pct}%</span>
                    </div>
                    <div style={{height:'4px',borderRadius:'99px',background:'rgba(255,255,255,.07)',overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,borderRadius:'99px',background:setComplete?'linear-gradient(90deg,#FFD700,#FF8C00)':`linear-gradient(90deg,${EC[binder.theme]??'#7E57C2'},${EC[binder.theme]??'#C855D4'})`,transition:'width .8s cubic-bezier(.23,1,.32,1)'}}/>
                    </div>
                  </div>
                )}
                <div style={{position:'absolute',bottom:'14px',right:'18px',fontSize:'9px',color:'rgba(255,255,255,.05)',letterSpacing:'.2em',textTransform:'uppercase' as const,fontFamily:'var(--font-display)'}}>PokéAlpha Terminal</div>
              </div>
            </div>
          </div>
        )}

        {/* ── VUE VITRINE ── */}
        {view==='showcase'&&(
          <div style={{position:'relative',zIndex:1,padding:'0 24px 28px',animation:'fadeUp .3s ease-out'}}>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap' as const,marginBottom:'18px'}}>
              {[{v:'all',l:'Toutes'},{v:'fav',l:'♥ Favoris'},{v:'fire',l:'🔥'},{v:'water',l:'💧'},{v:'psychic',l:'🔮'},{v:'dark',l:'🌑'},{v:'electric',l:'⚡'}].map(o=>(
                <button key={o.v} style={{padding:'5px 12px',borderRadius:'7px',border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'rgba(255,255,255,.4)',fontSize:'12px',cursor:'pointer',fontFamily:'var(--font-display)'}}>{o.l}</button>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:'14px'}}>
              {CARDS.map((card,idx)=>{
                const ec=EC[card.type]??'#888',eg=EG[card.type]??'rgba(128,128,128,.4)'
                const roi=Math.round(((card.curPrice-card.buyPrice)/card.buyPrice)*100)
                const isHolo=HOLO_RARITIES.includes(card.rarity),ls=LS[card.lang]
                return(
                  <div key={card.id} className={`gem${card.signal==='S'?' breathe-S':card.signal==='A'?' breathe-A':''}`}
                    style={{background:`linear-gradient(160deg,${ec}18,${ec}06)`,border:`1.5px solid ${ec}35`,animation:`cardIn .35s ${Math.min(idx,10)*.04}s ease-out both`}}
                    onMouseMove={tiltCard} onMouseLeave={resetCard} onClick={()=>setSpotCard(card)}>
                    {isHolo&&<div className="holo"/>}
                    {isHolo&&<div className="hm"/>}
                    <div className="ptcl" style={{background:ec,bottom:'20%',left:'20%'}}/>
                    <div className="ptcl" style={{background:ec,bottom:'30%',left:'60%'}}/>
                    <div style={{height:'2.5px',background:`linear-gradient(90deg,${ec},${ec}55)`,position:'absolute',top:0,left:0,right:0}}/>
                    {card.signal&&<div style={{position:'absolute',top:'8px',right:'8px',zIndex:3,fontSize:'9px',fontWeight:700,background:TIER_BG[card.signal],color:'#fff',padding:'3px 8px',borderRadius:'6px',fontFamily:'var(--font-display)'}}>{card.signal}</div>}
                    <div style={{height:'120px',margin:'6px 6px 0',borderRadius:'9px',background:`${ec}14`,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
                      <div style={{position:'absolute',width:'70%',height:'70%',borderRadius:'50%',background:eg,filter:'blur(20px)',opacity:.55}}/>
                      <div style={{width:'44px',height:'44px',borderRadius:'50%',background:`radial-gradient(circle at 35% 35%,${ec}DD,${ec}88)`,boxShadow:`0 0 18px ${eg}`,zIndex:1}}/>
                      {card.hot&&<div style={{position:'absolute',top:'6px',left:'6px',width:'6px',height:'6px',borderRadius:'50%',background:'#E03020',animation:'shimGlow 1.5s ease-in-out infinite'}}/>}
                      <div style={{position:'absolute',bottom:'6px',left:'6px',fontSize:'9px',fontWeight:700,background:ls.bg,color:ls.color,padding:'1px 6px',borderRadius:'4px',fontFamily:'var(--font-display)'}}>{ls.flag} {card.lang}</div>
                      {card.graded&&<div style={{position:'absolute',bottom:'6px',right:'6px',fontSize:'8px',fontWeight:700,background:'rgba(0,0,0,.8)',color:'rgba(255,255,255,.9)',padding:'1px 6px',borderRadius:'4px',fontFamily:'var(--font-display)'}}>{card.condition}</div>}
                    </div>
                    <div style={{padding:'12px'}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'6px',marginBottom:'4px'}}>
                        <div style={{fontSize:'13px',fontWeight:600,color:'rgba(255,255,255,.88)',fontFamily:'var(--font-display)',lineHeight:1.25,flex:1}}>{card.name}</div>
                        <button onClick={e=>toggleFav(card.id,e)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'14px',padding:0,flexShrink:0}}>{favs.has(card.id)?'❤️':'🤍'}</button>
                      </div>
                      <div style={{fontSize:'10px',color:'rgba(255,255,255,.25)',marginBottom:'10px'}}>{card.set}</div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                        <div>
                          <div style={{fontSize:'18px',fontWeight:600,color:'#fff',fontFamily:'var(--font-display)',letterSpacing:'-0.5px',lineHeight:1}}>€ {card.curPrice.toLocaleString('fr-FR')}</div>
                          <div style={{fontSize:'9px',color:'rgba(255,255,255,.2)',marginTop:'2px'}}>Achat € {card.buyPrice}</div>
                        </div>
                        <div style={{textAlign:'right' as const}}>
                          <div style={{fontSize:'14px',fontWeight:600,color:roi>=0?'#4ECCA3':'#FF6B8A',fontFamily:'var(--font-display)'}}>{roi>=0?'+':''}{roi}%</div>
                          {card.psa&&<div style={{fontSize:'9px',color:'rgba(255,255,255,.22)'}}>Pop {card.psa.toLocaleString()}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── VUE WRAPPED ── */}
        {view==='wrapped'&&(
          <div style={{position:'relative',zIndex:1,animation:'wrappedIn .35s ease-out'}}>
            <div style={{padding:'40px 28px 28px',textAlign:'center' as const,position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(ellipse at 50% 60%,rgba(255,107,53,.12) 0%,transparent 55%)',pointerEvents:'none'}}/>
              <div style={{fontSize:'120px',fontWeight:700,color:'rgba(255,255,255,.04)',position:'absolute',top:'10px',left:'50%',transform:'translateX(-50%)',letterSpacing:'-6px',lineHeight:1,pointerEvents:'none',userSelect:'none' as const}}>2026</div>
              <div style={{position:'relative'}}>
                <div style={{fontSize:'11px',fontWeight:500,color:'rgba(255,255,255,.25)',textTransform:'uppercase' as const,letterSpacing:'.18em',fontFamily:'var(--font-display)',marginBottom:'12px'}}>Ta collection en chiffres</div>
                <div style={{fontSize:'52px',fontWeight:600,color:'#fff',fontFamily:'var(--font-display)',letterSpacing:'-2px',lineHeight:1}}>€ {totalCur.toLocaleString('fr-FR')}</div>
                <div style={{fontSize:'16px',color:'#4ECCA3',marginTop:'8px',fontWeight:500}}>+{totalROI}% depuis janvier · +€ {totalGain.toLocaleString('fr-FR')}</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',borderTop:'1px solid rgba(255,255,255,.07)',borderBottom:'1px solid rgba(255,255,255,.07)'}}>
              {[{l:'Cartes',v:String(CARDS.length)},{l:'Meilleur ROI',v:`+${Math.round(((bestCard.curPrice-bestCard.buyPrice)/bestCard.buyPrice)*100)}%`,c:'#FFD700'},{l:'Binders',v:String(binders.length)},{l:'Favoris',v:String(favs.size)}].map((s,i)=>(
                <div key={s.l} style={{padding:'18px',borderRight:i<3?'1px solid rgba(255,255,255,.07)':'none',textAlign:'center' as const}}>
                  <div style={{fontSize:'28px',fontWeight:600,color:s.c??'#fff',fontFamily:'var(--font-display)',letterSpacing:'-0.5px'}}>{s.v}</div>
                  <div style={{fontSize:'10px',color:'rgba(255,255,255,.3)',marginTop:'4px',textTransform:'uppercase' as const,letterSpacing:'.08em',fontFamily:'var(--font-display)'}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{padding:'24px 28px'}}>
              <div style={{fontSize:'10px',fontWeight:500,color:'rgba(255,255,255,.25)',textTransform:'uppercase' as const,letterSpacing:'.12em',fontFamily:'var(--font-display)',marginBottom:'14px'}}>Tes cartes les plus performantes</div>
              <div style={{display:'flex',flexDirection:'column' as const,gap:'8px'}}>
                {[...CARDS].sort((a,b)=>((b.curPrice-b.buyPrice)/b.buyPrice)-((a.curPrice-a.buyPrice)/a.buyPrice)).slice(0,3).map((card,i)=>{
                  const roi=Math.round(((card.curPrice-card.buyPrice)/card.buyPrice)*100),ec=EC[card.type]??'#888'
                  return(
                    <div key={card.id} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'12px 16px',display:'flex',alignItems:'center',gap:'12px'}}>
                      <div style={{fontSize:'20px',flexShrink:0}}>{['🥇','🥈','🥉'][i]}</div>
                      <div style={{width:'36px',height:'36px',borderRadius:'9px',background:`linear-gradient(145deg,${ec}25,${ec}10)`,border:`1px solid ${ec}35`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <div style={{width:'14px',height:'14px',borderRadius:'50%',background:ec,opacity:.7}}/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'13px',fontWeight:500,color:'rgba(255,255,255,.8)',fontFamily:'var(--font-display)'}}>{card.name}</div>
                        <div style={{fontSize:'10px',color:'rgba(255,255,255,.3)'}}>{card.set} · {card.year}</div>
                      </div>
                      <div style={{textAlign:'right' as const}}>
                        <div style={{fontSize:'16px',fontWeight:600,color:'#4ECCA3',fontFamily:'var(--font-display)'}}>+{roi}%</div>
                        <div style={{fontSize:'11px',color:'rgba(255,255,255,.35)'}}>€ {card.curPrice}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{padding:'0 28px 28px',display:'flex',gap:'8px'}}>
              <button onClick={()=>setShareOpen(true)} style={{flex:1,padding:'14px',borderRadius:'12px',background:'linear-gradient(135deg,#E03020,#FF4433)',color:'#fff',border:'none',fontSize:'14px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',boxShadow:'0 6px 20px rgba(224,48,32,.45)'}}>Partager mon Wrapped 2026 →</button>
              <button style={{padding:'14px 20px',borderRadius:'12px',background:'rgba(255,255,255,.06)',color:'rgba(255,255,255,.6)',border:'1px solid rgba(255,255,255,.1)',fontSize:'14px',fontWeight:500,cursor:'pointer',fontFamily:'var(--font-display)'}}>Sauvegarder</button>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
