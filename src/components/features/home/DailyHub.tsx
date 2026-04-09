'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

type WidgetId = 'portfolio'|'collections'|'missions'|'resume'|'dexy'|'movers'|'whales'|'deals'
const WIDGET_META: Record<WidgetId,{label:string;icon:string;col:'left'|'right'}> = {
  portfolio:   {label:'Mon portfolio',    icon:'\ud83d\udcb0', col:'left'},
  collections: {label:'Mes collections',  icon:'\ud83d\udcda', col:'left'},
  missions:    {label:'Missions du jour', icon:'\ud83c\udfaf', col:'left'},
  resume:      {label:'Reprendre',        icon:'\u23ea',       col:'left'},
  dexy:        {label:'Dexy AI Briefing', icon:'\ud83e\udd16', col:'right'},
  movers:      {label:'Top movers',       icon:'\ud83d\udcc8', col:'right'},
  whales:      {label:'Whale tracker',    icon:'\ud83d\udc0b', col:'right'},
  deals:       {label:'Deals du moment',  icon:'\ud83d\udcb8', col:'right'},
}
const DEFAULT_ORDER: WidgetId[] = ['portfolio','collections','missions','resume','dexy','movers','whales','deals']
const DEFAULT_HIDDEN: WidgetId[] = []

const USER = {
  name:'Alon', plan:'free' as 'free'|'pro',
  streak:7, xp:2340, xpNext:3000, level:12,
  streakExpiresIn: 2*3600 + 14*60,
  portfolioValue: 54280, portfolioGain: 340, portfolioGainPct: 0.63,
}

const DAILY_ALPHA = {
  id:'006', name:'Charizard Alt Art', tier:'S' as const,
  price:920, market:1240, pct:53, confidence:72, psa:312,
  reason:'Alt Art rare, PSA Pop faible (312), momentum acheteur JP et Cardmarket en hausse.',
  target:1300, watching: 847, expiresIn: 4*3600 - 18*60,
}

const DEXY = {
  text:"Les Alt Art Fire sont en phase haussi\u00e8re. Charizard 151 et Magikarp Snap affichent un momentum inhabituel \u2014 PSA Pop tr\u00e8s bas, pression acheteuse JP forte.",
  time:'Il y a 12 min',
  tags:['Alt Art haussier','PSA Pop bas','Momentum \u25b2','JP en avance'],
}

const MISSIONS = [
  { id:1, label:'Consulter 3 signaux Alpha',      progress:1, total:3, xp:50, done:false },
  { id:2, label:'Ajouter une carte au portfolio', progress:1, total:1, xp:30, done:true  },
  { id:3, label:'Rechercher un deal eBay',        progress:0, total:1, xp:40, done:false },
  { id:4, label:'Lire le briefing Dexy du jour',  progress:1, total:1, xp:20, done:true  },
]

const PORTFOLIO_MOVES = [
  { name:'Charizard Alt Art', change:+53, amount:'+\u20ac 300', hot:true  },
  { name:'Umbreon VMAX Alt',  change:+24, amount:'+\u20ac 170', hot:false },
  { name:'Blastoise Base',    change:-4,  amount:'-\u20ac 19',  hot:false },
]

const MOVERS = [
  { name:'Rayquaza Gold Star', price:'\u20ac 740', change:31,  color:'#EF9F27' },
  { name:'Umbreon VMAX Alt',   price:'\u20ac 880', change:24,  color:'#7F77DD' },
  { name:'Gengar VMAX Alt',    price:'\u20ac 340', change:18,  color:'#D85A30' },
  { name:'Dragonite V Alt',    price:'\u20ac 290', change:15,  color:'#7F77DD' },
  { name:'Blastoise Base',     price:'\u20ac 620', change:-4,  color:'#378ADD' },
]

const COLLECTIONS = [
  { name:'SV 151', owned:120, total:150, color:'#1D9E75' },
  { name:'Evolving Skies', owned:105, total:210, color:'#EF9F27' },
  { name:'Prismatic Evolutions', owned:49, total:245, color:'#E24B4A' },
]

const WHALE_FEED = [
  { name:'RedDragonKai', initials:'RD', card:'Charizard Alt Art \u00d72', amount:'\u20ac 8,400', time:'2h', bg:'#FAEEDA', fg:'#854F0B', border:'#FAC775' },
  { name:'SakuraTCG',    initials:'SA', card:'Umbreon VMAX Alt',         amount:'\u20ac 2,800', time:'5h', bg:'#EEEDFE', fg:'#534AB7', border:'#CECBF6' },
]

const DEALS = [
  { name:'Gengar VMAX Alt Art', discount:28, price:'\u20ac 290', source:'eBay \u00b7 EN \u00b7 PSA 9' },
  { name:'Mewtwo V Alt Art',    discount:22, price:'\u20ac 218', source:'CM \u00b7 JP \u00b7 Raw'     },
  { name:'Lugia Neo PSA 9',     discount:19, price:'\u20ac 890', source:'eBay \u00b7 EN'               },
]

const RESUME_ITEMS = [
  { icon:'\ud83d\udccb', name:'Set SV 151', sub:'Derni\u00e8re visite il y a 2h', href:'/cartes' },
  { icon:'\ud83d\udce6', name:'Display Prismatic', sub:'Ajout\u00e9 hier', href:'/cartes/scelles' },
  { icon:'\ud83d\udd0d', name:'Deal Umbreon', sub:'Sauv\u00e9 ce matin', href:'/alpha/deals' },
]

function Timer({ seconds }: { seconds:number }) {
  const [s, setS] = useState(seconds)
  useEffect(() => { const t = setInterval(()=>setS(v=>Math.max(0,v-1)),1000); return ()=>clearInterval(t) },[])
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60
  return (
    <span style={{ fontSize:10, color:s<3600?'#E24B4A':'#888', fontWeight:500, fontFamily:'var(--font-data)', animation:s<3600?'pulse 1.5s ease-in-out infinite':'none' }}>
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(sec).padStart(2,'0')} restant
    </span>
  )
}

function Bar({ value, color, h=4 }: { value:number; color:string; h?:number }) {
  return (
    <div style={{ height:h, background:'#F0F0F0', borderRadius:99, overflow:'hidden', flex:1 }}>
      <div style={{ height:'100%', width:`${Math.min(value,100)}%`, background:color, borderRadius:99, transition:'width .8s cubic-bezier(.34,1.56,.64,1)' }} />
    </div>
  )
}

function ProgressCircle({ pct, color, size=36 }: { pct:number; color:string; size?:number }) {
  const r = (size-6)/2, c = 2*Math.PI*r, dash = (pct/100)*c
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F0F0F0" strokeWidth={3}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3} strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{transition:'stroke-dasharray .8s ease'}}/>
      <text x={size/2} y={size/2+3} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>{pct}%</text>
    </svg>
  )
}

function Toast({ msg, onClose }: { msg:string; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return ()=>clearTimeout(t) }, [onClose])
  return (
    <div className="toast-slide" style={{ position:'fixed', top:96, right:24, zIndex:1000, background:'rgba(17,17,17,.92)', backdropFilter:'blur(8px)', color:'#fff', padding:'12px 16px', borderRadius:12, fontSize:13, fontFamily:'var(--font-sans)', boxShadow:'0 8px 24px rgba(0,0,0,.15)', display:'flex', alignItems:'center', gap:10, maxWidth:300 }}>
      <div className="live-dot" style={{ flexShrink:0 }} />
      <span style={{ flex:1, lineHeight:1.5 }}>{msg}</span>
      <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', fontSize:16, padding:0 }}>{String.fromCharCode(215)}</button>
    </div>
  )
}

function CountUp({ target, suffix, duration=1200 }: { target:number; suffix?:string; duration?:number }) {
  const [val, setVal] = useState(0)
  const ref = useRef<number>(0)
  useEffect(() => {
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(target * eased))
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(ref.current)
  }, [target, duration])
  return <>{val.toLocaleString()}{suffix || ''}</>
}

export function DailyHub() {
  const router = useRouter()
  const [done, setDone] = useState<number[]>(MISSIONS.filter(m=>m.done).map(m=>m.id))
  const [dismissed, setDismissed] = useState(false)
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_ORDER
    try { const v = localStorage.getItem('pka_hub_order'); return v ? JSON.parse(v) : DEFAULT_ORDER } catch { return DEFAULT_ORDER }
  })
  const [hiddenWidgets, setHiddenWidgets] = useState<WidgetId[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_HIDDEN
    try { const v = localStorage.getItem('pka_hub_hidden'); return v ? JSON.parse(v) : DEFAULT_HIDDEN } catch { return DEFAULT_HIDDEN }
  })
  const [editMode, setEditMode] = useState(false)
  const [ewDrag, setEwDrag] = useState<WidgetId|null>(null)
  const [ewOver, setEwOver] = useState<WidgetId|null>(null)
  const [dragId, setDragId] = useState<WidgetId|null>(null)
  const [overId, setOverId] = useState<WidgetId|null>(null)

  const [particles, setParticles] = useState<{id:number;x:number;y:number;xp:number}[]>([])
  const [xpAnim, setXpAnim] = useState(false)
  const [dexyOpen, setDexyOpen] = useState(false)
  const [toast, setToast] = useState<string|null>(null)
  const [toastIdx, setToastIdx] = useState(0)
  const [streakShake, setStreakShake] = useState(false)
  const [showNewBadge, setShowNewBadge] = useState(true)
  const pidRef = useRef(0)

  useEffect(() => { localStorage.setItem('pka_hub_order', JSON.stringify(widgetOrder)) }, [widgetOrder])
  useEffect(() => { localStorage.setItem('pka_hub_hidden', JSON.stringify(hiddenWidgets)) }, [hiddenWidgets])

  const toggleWidget = (id: WidgetId) => {
    setHiddenWidgets(prev => prev.includes(id) ? prev.filter(i=>i!==id) : [...prev, id])
  }
  const moveWidget = (id: WidgetId, dir: -1|1) => {
    setWidgetOrder(prev => {
      const idx = prev.indexOf(id)
      if (idx === -1) return prev
      const next = [...prev]
      const swap = idx + dir
      if (swap < 0 || swap >= next.length) return prev
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
  }

  const resetLayout = () => { setWidgetOrder(DEFAULT_ORDER); setHiddenWidgets(DEFAULT_HIDDEN) }





  const leftWidgets = widgetOrder.filter(id => WIDGET_META[id].col === 'left' && !hiddenWidgets.includes(id))
  const rightWidgets = widgetOrder.filter(id => WIDGET_META[id].col === 'right' && !hiddenWidgets.includes(id))

  const isPro = USER.plan === 'pro'
  const xpPct = Math.round((USER.xp/USER.xpNext)*100)
  const xpEarned = MISSIONS.filter(m=>done.includes(m.id)).reduce((a,m)=>a+m.xp,0)
  const TOASTS = [
    '\ud83d\udc0b RedDragonKai vient d\'acheter Charizard Alt Art \u00b7 \u20ac4,200',
    '\ud83d\udd25 Signal Tier S activ\u00e9 sur Rayquaza Gold Star',
    '\ud83d\udcc8 Umbreon VMAX Alt +8% en 1h \u00b7 Momentum acheteur',
  ]
  useEffect(() => {
    if (toastIdx >= TOASTS.length) return
    const delays = [8000, 22000, 40000]
    const t = setTimeout(() => { setToast(TOASTS[toastIdx]); setToastIdx(i=>i+1) }, delays[toastIdx] || 30000)
    return () => clearTimeout(t)
  }, [toastIdx])
  useEffect(() => { const t = setTimeout(()=>setStreakShake(true), 2000); const t2 = setTimeout(()=>setStreakShake(false), 2500); return ()=>{clearTimeout(t);clearTimeout(t2)} }, [])
  const closeToast = useCallback(()=>setToast(null),[])

  const today = new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})
  const missionPct = Math.round((done.length/MISSIONS.length)*100)

  const toggleMission = (id:number, xp:number, e:React.MouseEvent) => {
    const isDone = done.includes(id)
    if (!isDone) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const pid = ++pidRef.current
      setParticles(p=>[...p,{id:pid,x:rect.right-20,y:rect.top-10,xp}])
      setTimeout(()=>setParticles(p=>p.filter(pp=>pp.id!==pid)),1200)
      setXpAnim(true); setTimeout(()=>setXpAnim(false),600)
    }
    setDone(prev=>isDone?prev.filter(i=>i!==id):[...prev,id])
    if (!isDone) setShowNewBadge(false)
  }

  const renderWidget = (id: WidgetId) => {
    const isEditing = true
    const cls = 'w' + (dragId === id ? ' w-dragging' : '') + (overId === id && dragId !== id ? ' w-drop-target' : '')
    const editHandle = (
      <>
        <div className="w-grip"><div className="w-grip-row"><i/><i/></div><div className="w-grip-row"><i/><i/></div><div className="w-grip-row"><i/><i/></div></div>
        <button className="w-hide" onClick={e=>{e.stopPropagation();toggleWidget(id)}} title="Masquer">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </>
    )
    const dragProps = {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', id)
        setTimeout(() => setDragId(id), 0)
      },
      onDragEnd: () => { setDragId(null); setOverId(null) },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (dragId && dragId !== id) setOverId(id)
      },
      onDragLeave: (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverId(null)
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault()
        const from = e.dataTransfer.getData('text/plain') as WidgetId
        if (!from || from === id) { setDragId(null); setOverId(null); return }
        setWidgetOrder(prev => {
          const next = [...prev]
          const fromIdx = next.indexOf(from)
          const toIdx = next.indexOf(id)
          if (fromIdx === -1 || toIdx === -1) return prev
          next.splice(fromIdx, 1)
          next.splice(toIdx, 0, from)
          return next
        })
        setDragId(null)
        setOverId(null)
      },
    }

    switch(id) {
      case 'portfolio': return (
        <div key={id} className={cls} style={{position:'relative'}} data-widget-id={id} {...dragProps}>
          {editHandle}
          <div className="wh"><div className="wt"><div className="bar"/>Mon portfolio</div><span className="wb wb-g">+{'\u20ac'} {USER.portfolioGain} aujourd'hui</span></div>
          <div className="wc">
            <div className="num-reveal" style={{ fontSize:28, fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-1px', marginBottom:2 }}><CountUp target={USER.portfolioValue} /> {'\u20ac'}</div>
            <div style={{ fontSize:13, fontWeight:600, color:'#1D9E75', marginBottom:14 }}>{'\u25b2'} +{USER.portfolioGainPct}% {'\u00b7'} +{USER.portfolioGain} {'\u20ac'} depuis hier</div>
            <div style={{ borderTop:'1px solid #F5F5F5', paddingTop:10 }}>
              {PORTFOLIO_MOVES.map((c,i)=>(
                <div key={i} className="row">
                  <div className="dot" style={{ background:c.hot?'#E03020':c.change>=0?'#1D9E75':'#E24B4A', animation:c.hot?'pulse 1.5s infinite':'none' }}/>
                  <span className="rn">{c.name}</span>
                  <span className={'rv '+(c.change>=0?'up':'dn')}>{c.amount}</span>
                  <span className={'rp '+(c.change>=0?'up':'dn')}>{c.change>=0?'+':''}{c.change}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
      case 'collections': return (
        <div key={id} className={cls} style={{position:'relative'}} data-widget-id={id} {...dragProps}>
          {editHandle}
          <div className="wh"><div className="wt"><div className="bar"/>Mes collections</div><span className="wb">{COLLECTIONS.length} en cours</span></div>
          <div className="wc">
            {COLLECTIONS.map((col,i)=>{
              const pct=Math.round((col.owned/col.total)*100)
              return (
                <div key={i} className="row" style={{ cursor:'pointer' }} onClick={()=>router.push('/cartes')}>
                  <ProgressCircle pct={pct} color={col.color} />
                  <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500, fontFamily:'var(--font-display)' }}>{col.name}</div><div style={{ fontSize:11, color:'#BBB' }}>{col.owned} / {col.total} cartes</div></div>
                  <div style={{ fontSize:11, color:pct>=75?'#1D9E75':'#888', fontWeight:500, fontFamily:'var(--font-display)' }}>{col.total-col.owned} manquantes</div>
                </div>
              )
            })}
          </div>
        </div>
      )
      case 'missions': return (
        <div key={id} className={cls} style={{position:'relative'}} data-widget-id={id} {...dragProps}>
          {editHandle}
          <div className="wh"><div className="wt"><div className="bar"/>Missions du jour</div><span className="wb">{done.length}/{MISSIONS.length} {'\u00b7'} +{xpEarned} XP</span></div>
          <div className="wc">
            {MISSIONS.map(m=>{
              const isDone=done.includes(m.id)
              return (
                <div key={m.id} className="mis" onClick={e=>toggleMission(m.id,m.xp,e)}>
                  <div className={'ck'+(isDone?' on':'')}>{isDone?'\u2713':''}</div>
                  <span className={'ml'+(isDone?' done':'')}>{m.label}</span>
                  <span className="xp-badge">+{m.xp}</span>
                </div>
              )
            })}
            <div style={{ marginTop:12 }}><Bar value={missionPct} color="linear-gradient(90deg,#E03020,#FF8C00)" h={4} /></div>
            {done.length < MISSIONS.length && (
              <div style={{ marginTop:10, fontSize:11, color:'#E03020', fontWeight:500, fontFamily:'var(--font-display)', display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ animation:'pulse 1.5s infinite', display:'inline-block' }}>{'\u26a1'}</span>
                Encore {MISSIONS.length - done.length} mission{MISSIONS.length-done.length>1?'s':''} pour d{'\u00e9'}bloquer +{MISSIONS.filter(m=>!done.includes(m.id)).reduce((a,m)=>a+m.xp,0)} XP
              </div>
            )}
            {done.length === MISSIONS.length && (
              <div className="celeb" style={{ marginTop:10, fontSize:12, color:'#1D9E75', fontWeight:600, fontFamily:'var(--font-display)', display:'flex', alignItems:'center', gap:6, background:'#E1F5EE', padding:'8px 12px', borderRadius:8 }}>
                {'\u2728'} Toutes les missions compl{'\u00e9'}t{'\u00e9'}es ! +{xpEarned} XP gagn{'\u00e9'}s
              </div>
            )}
          </div>
        </div>
      )
      case 'resume': return (
        <div key={id} className={cls} style={{position:'relative'}} data-widget-id={id} {...dragProps}>
          {editHandle}
          <div className="wh"><div className="wt"><div className="bar"/>Reprendre</div></div>
          <div className="wc">
            <div style={{ display:'flex', gap:8 }}>
              {RESUME_ITEMS.map((r,i)=>(
                <div key={i} className="resume-card" onClick={()=>router.push(r.href)}>
                  <div style={{ fontSize:11, fontWeight:500, fontFamily:'var(--font-display)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.icon} {r.name}</div>
                  <div style={{ fontSize:10, color:'#BBB' }}>{r.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
      case 'dexy': return (
        <div key={id} className={cls} style={{ borderLeft:'3px solid #E03020', borderRadius:'0 12px 12px 0', position:'relative' }} data-widget-id={id} {...dragProps}>
          {editHandle}
          <div className="wh">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'#E03020', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700 }}>D</div>
              <span style={{ fontSize:13, fontWeight:600, color:'#111', fontFamily:'var(--font-display)' }}>Dexy AI {'\u00b7'} Briefing</span>
            </div>
            <span className="wb">{DEXY.time}</span>
          </div>
          <div className="wc">
            <div style={{ fontSize:13, color:'#666', lineHeight:1.7 }}>{DEXY.text}</div>
            <div style={{ marginTop:8, display:'flex', gap:4, flexWrap:'wrap' }}>
              {DEXY.tags.map(t=>(<span key={t} style={{ fontSize:10, background:'#FEF2F2', color:'#993C1D', padding:'2px 8px', borderRadius:6, fontFamily:'var(--font-display)' }}>{t}</span>))}
            </div>
          </div>
        </div>
      )
      case 'movers': return (
        <div key={id} className={cls} style={{position:'relative'}} data-widget-id={id} {...dragProps}>
          {editHandle}
          <div className="wh"><div className="wt"><div className="bar"/>Top movers</div><span className="wb">24h</span></div>
          <div className="wc">
            {MOVERS.map((m,i)=>(<div key={i} className="row"><div className="dot" style={{ background:m.color }}/><span className="rn">{m.name}</span><span className="rv">{m.price}</span><span className={'rp '+(m.change>=0?'up':'dn')}>{m.change>=0?'\u25b2':'\u25bc'} {Math.abs(m.change)}%</span></div>))}
          </div>
        </div>
      )
      case 'whales': return (
        <div key={id} className={cls} style={{position:'relative'}} data-widget-id={id} {...dragProps}>
          {editHandle}
          <div className="wh"><div className="wt"><div className="bar"/>Whale tracker</div><div style={{ display:'flex', alignItems:'center', gap:4 }}><div className="live-dot"/><span className="wb">Live</span></div></div>
          <div className="wc">
            {WHALE_FEED.map((w,i)=>(<div key={i} className="row"><div className="whale-av" style={{ background:w.bg, color:w.fg, border:'1px solid '+w.border }}>{w.initials}</div><div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500, fontFamily:'var(--font-display)' }}>{w.name}</div><div style={{ fontSize:11, color:'#BBB' }}>Achet{'\u00e9'} {w.card} {'\u00b7'} {w.time}</div></div><div style={{ fontSize:13, fontWeight:600, color:'#1D9E75', fontFamily:'var(--font-data)' }}>{w.amount}</div></div>))}
            <div className="row" style={{ opacity:.35 }}><div className="whale-av" style={{ background:'#F0F0F0', color:'#BBB' }}>??</div><div style={{ flex:1 }}><div style={{ fontSize:13 }}>Mouvement masqu{'\u00e9'}</div><div style={{ fontSize:11, color:'#BBB' }}>Visible avec Pro</div></div><div style={{ fontSize:13, color:'#BBB' }}>{'\u00b7\u00b7\u00b7'}</div></div>
            {!isPro && (<div style={{ paddingTop:8, borderTop:'1px solid #F5F5F5', display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:4 }}><span style={{ fontSize:11, color:'#BBB' }}>1 mouvement masqu{'\u00e9'}</span><span style={{ fontSize:11, fontWeight:600, color:'#E03020', cursor:'pointer', fontFamily:'var(--font-display)' }}>Voir avec Pro {'\u2192'}</span></div>)}
          </div>
        </div>
      )
      case 'deals': return (
        <div key={id} className={cls} style={{ position:'relative', overflow:'hidden' }} data-widget-id={id} {...dragProps}>
          {editHandle}
          <div className="wh"><div className="wt"><div className="bar"/>Deals du moment</div><span className="wb">{DEALS.length} sous march{'\u00e9'}</span></div>
          {isPro ? (
            <div className="wc">{DEALS.map((d,i)=>(<div key={i} className="row"><span className="rn">{d.name}</span><span className="rv">{d.price}</span><span className="rp up">-{d.discount}%</span></div>))}</div>
          ) : (
            <><div className="wc" style={{ filter:'blur(2px)', pointerEvents:'none', userSelect:'none', opacity:.6 }}>{DEALS.map((d,i)=>(<div key={i} className="row"><span className="rn">{d.name}</span><span className="rv">{d.price}</span><span className="rp up">-{d.discount}%</span></div>))}</div>
            <div style={{ position:'absolute', inset:0, top:30, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
              <div style={{ fontSize:14 }}>{'\ud83d\udd12'}</div>
              <div style={{ fontSize:12, color:'#888', textAlign:'center', maxWidth:200, lineHeight:1.5 }}>{DEALS.length} deals sous valeur march{'\u00e9'}</div>
              <div style={{ fontSize:10, color:'#E03020', fontWeight:500, fontFamily:'var(--font-display)' }}>{'\u26a1'} 23 personnes en ont profit{'\u00e9'} aujourd'hui</div>
              <button className="btn-dark" style={{ fontSize:12, padding:'8px 18px' }}>D{'\u00e9'}bloquer avec Pro {'\u2192'}</button>
            </div></>
          )}
        </div>
      )
      default: return null
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes floatXP{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-44px)}}
        @keyframes xpBump{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
        @keyframes grow{from{width:0}}
        @keyframes countUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes streakShake{0%,100%{transform:rotate(0)}25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}
        @keyframes celebPop{0%{transform:scale(0) rotate(-10deg);opacity:0}50%{transform:scale(1.3) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
        @keyframes urgentPulse{0%,100%{border-color:#EBEBEB}50%{border-color:#E03020}}
        @keyframes liveDot{0%,100%{box-shadow:0 0 0 0 rgba(29,158,117,.4)}50%{box-shadow:0 0 0 6px rgba(29,158,117,0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes numberReveal{from{opacity:0;filter:blur(4px);transform:translateY(4px)}to{opacity:1;filter:blur(0);transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes badgeBounce{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
        .streak-fire{animation:streakShake .5s ease-in-out}
        .celeb{animation:celebPop .4s cubic-bezier(.34,1.56,.64,1)}
        .num-reveal{animation:numberReveal .6s ease-out both}
        .num-reveal-d1{animation-delay:.1s}
        .num-reveal-d2{animation-delay:.2s}
        .badge-bounce{animation:badgeBounce .3s ease}
        .new-dot{position:relative}
        .new-dot::after{content:'';position:absolute;top:-2px;right:-2px;width:8px;height:8px;border-radius:50%;background:#E03020;border:2px solid #fff}
        .live-dot{width:6px;height:6px;border-radius:50%;background:#1D9E75;animation:liveDot 2s ease-in-out infinite}
        .toast-slide{animation:slideIn .35s cubic-bezier(.34,1.56,.64,1)}
        .w{transition:transform .3s cubic-bezier(.2,.8,.2,1),box-shadow .3s,opacity .3s}
        .w-dragging{z-index:100 !important;opacity:.4 !important}
        .w-drop-target{border:2px solid #E03020 !important;background:#FEF2F2 !important;transform:scale(1.01);transition:all .15s}
        
        
        .w-hide{position:absolute;top:10px;right:10px;width:20px;height:20px;border-radius:50%;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:5;opacity:0;transition:all .15s;color:#CCC;font-size:11px}
        .w:hover .w-hide{opacity:.4}
        .w-hide:hover{opacity:1 !important;background:#FEF2F2;color:#E03020}
        .w-grip{position:absolute;top:14px;left:10px;width:16px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 4px;cursor:grab;opacity:.2;transition:opacity .2s;z-index:5;border-radius:4px}
        .w-grip:active{cursor:grabbing}
        .w:hover .w-grip{opacity:.45}
        .w-grip:hover{opacity:.8 !important;background:rgba(0,0,0,.04);border-radius:4px}
        .w-grip i{display:block;width:3px;height:3px;border-radius:50%;background:#999}
        .w-grip-row{display:flex;gap:3px}
        .edit-mode-bar{display:flex;align-items:center;gap:10px;padding:10px 16px;background:#FEF2F2;border:1px solid #FFD0C8;border-radius:10px;margin-bottom:14px;animation:fadeUp .2s ease-out}
        .edit-drawer{background:#fff;border:1px solid #EBEBEB;border-radius:14px;padding:16px 18px;margin-bottom:18px;animation:fadeUp .2s ease-out;box-shadow:0 4px 16px rgba(0,0,0,.04)}
        .ew{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:1px solid #EBEBEB;margin-bottom:6px;transition:all .15s;background:#fff}
        .ew:last-child{margin-bottom:0}
        .ew:hover{background:#FAFAFA}
        .ew{cursor:grab}
        .ew:active{cursor:grabbing}
        .ew.ew-dragging{opacity:.4}
        .ew.ew-drop-target{border-color:#E03020;background:#FEF2F2}
        .ew.off{opacity:.45;border-style:dashed}
        .ew .ew-icon{width:28px;height:28px;border-radius:7px;background:#F5F5F7;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
        .ew .ew-name{flex:1;font-size:13px;font-weight:500;font-family:var(--font-display)}
        .ew .ew-arrows{display:flex;gap:2px}
        .ew .ew-arrows button{width:24px;height:24px;border-radius:6px;border:1px solid #EBEBEB;background:#fff;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;transition:all .12s;color:#888}
        .ew .ew-arrows button:hover:not(:disabled){border-color:#111;color:#111;background:#F5F5F7}
        .ew .ew-arrows button:disabled{opacity:.15;cursor:default}
        .ew-toggle{width:36px;height:20px;border-radius:99px;border:none;cursor:pointer;transition:background .2s;position:relative;flex-shrink:0}
        .ew-toggle::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.15)}
        .ew-toggle.on{background:#1D9E75}
        .ew-toggle.on::after{transform:translateX(16px)}
        .ew-toggle.off{background:#D2D2D7}
        .edit-chip{padding:4px 10px;border-radius:6px;border:1px dashed #D2D2D7;background:#FAFAFA;font-size:10px;cursor:pointer;font-family:var(--font-display);color:#888;display:flex;align-items:center;gap:4px;transition:all .12s}
        .edit-chip:hover{border-color:#1D9E75;color:#1D9E75;background:#E1F5EE}
        .shimmer-text{background:linear-gradient(90deg,#111 0%,#E03020 50%,#111 100%);background-size:200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 3s linear infinite}
        .xp-particle{position:fixed;pointer-events:none;font-size:13px;font-weight:700;color:#E03020;font-family:var(--font-display);z-index:9999;animation:floatXP 1.1s ease-out forwards}
        .hub-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        @media(max-width:1000px){.hub-grid{grid-template-columns:1fr} .qa-grid{grid-template-columns:repeat(2,1fr) !important}}
        .w{background:#fff;border:1px solid #EBEBEB;border-radius:12px;overflow:hidden;animation:fadeUp .3s ease-out both}
        .w:nth-child(2){animation-delay:.04s}.w:nth-child(3){animation-delay:.08s}.w:nth-child(4){animation-delay:.12s}
        .wh{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 0 30px}
        .wt{font-size:11px;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:.07em;font-family:var(--font-display);display:flex;align-items:center;gap:6px}
        .wt .bar{width:3px;height:12px;border-radius:2px;background:#E03020}
        .wb{font-size:11px;color:#888;background:#F5F5F7;padding:2px 8px;border-radius:6px;font-family:var(--font-display)}
        .wb-g{color:#1D9E75;background:#E1F5EE}
        .wc{padding:12px 16px 16px}
        .row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #F8F8FA;transition:background .1s}
        .row:last-child{border-bottom:none}
        .row:hover{background:#FAFAFA}
        .rn{flex:1;font-size:13px;font-weight:500;font-family:var(--font-display)}
        .rv{font-size:13px;font-weight:600;min-width:60px;text-align:right;font-family:var(--font-data)}
        .rp{font-size:12px;font-weight:600;min-width:48px;text-align:right;font-family:var(--font-data)}
        .up{color:#1D9E75}.dn{color:#E24B4A}
        .dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
        .mis{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:9px;border:1px solid #EBEBEB;cursor:pointer;transition:all .15s}
        .mis:hover{background:#FAFAFA}
        .mis+.mis{margin-top:6px}
        .ck{width:20px;height:20px;border-radius:6px;border:1.5px solid #D4D4D4;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;color:#fff;transition:all .2s}
        .ck.on{background:#1D9E75;border-color:#1D9E75}
        .ml{flex:1;font-size:13px;font-family:var(--font-display)}
        .ml.done{text-decoration:line-through;color:#BBB}
        .xp-badge{font-size:10px;font-weight:700;color:#E03020;background:#FEF2F2;padding:2px 8px;border-radius:6px;font-family:var(--font-display)}
        .qa-btn{display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:12px;border:1px solid #EBEBEB;background:#fff;cursor:pointer;transition:all .15s;font-size:13px;font-weight:500;color:#111;font-family:var(--font-display)}
        .qa-btn:hover{border-color:#C7C7CC;background:#F8F8FA}
        .qa-btn:active{transform:scale(.98)}
        .qa-ico{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
        .signal{border:1px solid #EBEBEB;border-radius:12px;overflow:hidden;animation:fadeUp .3s ease-out}
        .signal-bar{height:3px;background:linear-gradient(90deg,#EF9F27,#E03020)}
        .signal-inner{padding:20px;display:flex;gap:24px;align-items:center}
        @media(max-width:800px){.signal-inner{flex-direction:column;align-items:flex-start}}
        .tier{display:inline-block;font-size:11px;font-weight:700;color:#fff;background:linear-gradient(135deg,#EF9F27,#E03020);padding:3px 12px;border-radius:6px;letter-spacing:.02em;font-family:var(--font-display)}
        .whale-av{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;flex-shrink:0}
        .stat-pill{display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:99px;border:1px solid #EBEBEB;background:#fff;font-size:12px;font-weight:600;font-family:var(--font-display)}
        .resume-card{flex:1;padding:10px;border-radius:9px;background:#F8F8FA;cursor:pointer;transition:background .15s}
        .resume-card:hover{background:#F0F0F2}
        .btn-dark{padding:10px 22px;border-radius:9px;background:#111;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-display);transition:opacity .15s}
        .btn-dark:hover{opacity:.85}
        .btn-ghost{padding:10px 14px;border-radius:9px;background:transparent;color:#888;border:1px solid #E0E0E0;font-size:13px;cursor:pointer;font-family:var(--font-display)}
      `}</style>

      {toast && <Toast msg={toast} onClose={closeToast} />}
      {particles.map(p=>(
        <div key={p.id} className="xp-particle" style={{left:p.x,top:p.y}}>+{p.xp} XP</div>
      ))}

      <div style={{ animation:'fadeUp .25s ease-out', width:'100%' }}>

        {/* ═══ HEADER ═══ */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:20, borderBottom:'1px solid #EBEBEB', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-.4px', margin:'0 0 2px' }}>Bonjour, {USER.name} {'\ud83d\udc4b'}</h1>
            <div style={{ fontSize:12, color:'#888' }}>{today}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div className="stat-pill" style={{ animation:USER.streakExpiresIn<3600?'urgentPulse 2s infinite':'none', borderColor:USER.streakExpiresIn<3600?'#FFD0C8':'#EBEBEB' }}>
              <span style={{ fontSize:16, display:'inline-block' }} className={streakShake?'streak-fire':''}>{'\ud83d\udd25'}</span>
              <span style={{ fontSize:16, letterSpacing:'-.5px', fontFamily:'var(--font-data)' }}>{USER.streak}</span>
              <span style={{ color:'#BBB', fontWeight:400 }}>jours</span>
              <Timer seconds={USER.streakExpiresIn} />
            </div>
            <div className="stat-pill" style={{ animation:xpAnim?'xpBump .4s ease':'none' }}>
              <span style={{ fontSize:13 }}>Nv.{USER.level}</span>
              <div style={{ width:48, height:4, background:'#F0F0F0', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${xpPct}%`, background:'linear-gradient(90deg,#E03020,#FF8C00)', borderRadius:99, animation:'grow .6s ease-out' }} />
              </div>
              <span style={{ fontSize:10, color:'#BBB', fontWeight:400 }}>{USER.xp.toLocaleString()} / {USER.xpNext.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* ═══ CUSTOMIZE ═══ */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', marginBottom:12 }}>
          <button onClick={()=>setEditMode(m=>!m)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, border:editMode?'1.5px solid #E03020':'1px solid #EBEBEB', background:editMode?'#FEF2F2':'#fff', color:editMode?'#E03020':'#888', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all .2s' }}>
            {editMode ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4m-9.2-6.4 3.5-2m11.4-6.6 3.5-2M1 12h4m14 0h4M4.2 4.2l2.8 2.8m10 10 2.8 2.8M4.2 19.8l2.8-2.8m10-10 2.8-2.8"/></svg>
            )}
            {editMode ? 'Terminé' : 'Personnaliser'}
          </button>
        </div>

        {editMode && (
          <div className="edit-drawer">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'#111', fontFamily:'var(--font-display)' }}>Organise ton dashboard</div>
                <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Réordonne avec les flèches ou glisse directement les cartes</div>
              </div>
              <button onClick={resetLayout} style={{ padding:'6px 12px', borderRadius:7, border:'1px solid #FFD0C8', background:'#FEF2F2', color:'#E03020', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>Réinitialiser</button>
            </div>
            {widgetOrder.map((id, idx) => {
              const meta = WIDGET_META[id]
              const isHidden = hiddenWidgets.includes(id)
              return (
                <div key={id}
                  className={'ew'+(isHidden?' off':'')+(ewDrag===id?' ew-dragging':'')+(ewOver===id&&ewDrag!==id?' ew-drop-target':'')}
                  draggable
                  onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);setTimeout(()=>setEwDrag(id),0)}}
                  onDragEnd={()=>{setEwDrag(null);setEwOver(null)}}
                  onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';if(ewDrag&&ewDrag!==id)setEwOver(id)}}
                  onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setEwOver(null)}}
                  onDrop={e=>{
                    e.preventDefault()
                    const from=e.dataTransfer.getData('text/plain') as WidgetId
                    if(from&&from!==id){
                      setWidgetOrder(prev=>{const next=[...prev];const fi=next.indexOf(from);const ti=next.indexOf(id);if(fi===-1||ti===-1)return prev;next.splice(fi,1);next.splice(ti,0,from);return next})
                    }
                    setEwDrag(null);setEwOver(null)
                  }}>
                  <div className="ew-arrows">
                    <button disabled={idx===0} onClick={e=>{e.stopPropagation();moveWidget(id,-1)}}>{String.fromCharCode(9650)}</button>
                    <button disabled={idx===widgetOrder.length-1} onClick={e=>{e.stopPropagation();moveWidget(id,1)}}>{String.fromCharCode(9660)}</button>
                  </div>
                  <div className="ew-icon">{meta.icon}</div>
                  <span className="ew-name">{meta.label}</span>
                  <span style={{ fontSize:10, color:'#BBB', fontFamily:'var(--font-display)' }}>{meta.col==='left'?'Gauche':'Droite'}</span>
                  <button className={'ew-toggle '+(isHidden?'off':'on')} onClick={e=>{e.stopPropagation();toggleWidget(id)}} />
                </div>
              )
            })}
          </div>
        )}

        {!editMode && hiddenWidgets.length > 0 && (
          <div className="edit-mode-bar" style={{ marginBottom:14 }}>
            <span style={{ fontSize:11, color:'#888', fontFamily:'var(--font-display)' }}>Masqués :</span>
            {hiddenWidgets.map(id => (
              <button key={id} className="edit-chip" onClick={()=>toggleWidget(id)}>
                {WIDGET_META[id].icon} {WIDGET_META[id].label}
                <span style={{ color:'#1D9E75', fontWeight:600, fontSize:12 }}>+</span>
              </button>
            ))}
          </div>
        )}

        {/* ═══ PRO NUDGE ═══ */}
        {!isPro && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', background:'#FEF2F2', border:'1px solid #FFD0C8', borderRadius:10, marginBottom:16, animation:'fadeUp .3s ease-out' }}>
            <div className="live-dot" style={{ background:'#E03020', flexShrink:0 }}/>
            <span style={{ fontSize:12, color:'#791F1F', flex:1 }}><strong style={{ color:'#111', fontFamily:'var(--font-display)' }}>12 signaux</strong> et <strong style={{ color:'#111', fontFamily:'var(--font-display)' }}>8 deals</strong> disponibles avec Pro</span>
            <button style={{ fontSize:11, fontWeight:700, color:'#fff', background:'#E03020', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', padding:'6px 14px', borderRadius:8, transition:'opacity .15s' }}>Passer Pro {'\u2197'}</button>
          </div>
        )}

        {/* ═══ QUICK ACTIONS ═══ */}
        <div className="qa-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          <div className="qa-btn" onClick={()=>router.push('/portfolio')}><div className="qa-ico" style={{ background:'#FEF2F2', color:'#E03020' }}>+</div>Ajouter carte</div>
          <div className="qa-btn"><div className="qa-ico" style={{ background:'#E6F1FB', color:'#185FA5' }}>{'\ud83d\udcf7'}</div>Scanner</div>
          <div className="qa-btn" onClick={()=>router.push('/alpha/dexy')}><div className="qa-ico" style={{ background:'#FAEEDA', color:'#854F0B' }}>{'\u2728'}</div>Dexy AI</div>
          <div className="qa-btn" onClick={()=>router.push('/alpha/deals')}><div className="qa-ico" style={{ background:'#E1F5EE', color:'#0F6E56' }}>{'\ud83d\udd0d'}</div>Chercher deal</div>
        </div>

        {/* ═══ SIGNAL DU JOUR ═══ */}
        {!dismissed ? (
          <div className="signal" style={{ marginBottom:20 }}>
            <div className="signal-bar" />
            <div className="signal-inner">
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                  <span className="tier">Tier {DAILY_ALPHA.tier}</span>
                  {showNewBadge && <span className="badge-bounce" style={{ fontSize:9, fontWeight:700, background:'#E03020', color:'#fff', padding:'2px 8px', borderRadius:4, fontFamily:'var(--font-display)', letterSpacing:'.04em' }}>NEW</span>}
                  <span style={{ fontSize:11, color:'#BBB', fontFamily:'var(--font-display)' }}>#{DAILY_ALPHA.id} {'\u00b7'} <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}><span className="live-dot" style={{ width:4, height:4 }}/><CountUp target={DAILY_ALPHA.watching} /> regardent</span></span>
                </div>
                <div style={{ fontSize:20, fontWeight:600, color:'#111', fontFamily:'var(--font-display)', margin:'8px 0 6px', letterSpacing:'-.3px' }}>{DAILY_ALPHA.name}</div>
                <div style={{ fontSize:12, color:'#888', lineHeight:1.6, maxWidth:420 }}>{DAILY_ALPHA.reason}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div className="num-reveal" style={{ fontSize:32, fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-1.5px', lineHeight:1 }}>{'\u20ac'} <CountUp target={DAILY_ALPHA.price} /></div>
                <div style={{ fontSize:18, fontWeight:700, color:'#1D9E75' }}>+{DAILY_ALPHA.pct}%</div>
                <div style={{ fontSize:11, color:'#BBB', marginTop:4 }}>March{'\u00e9'} {'\u20ac'} {DAILY_ALPHA.market.toLocaleString()} {'\u00b7'} Cible {'\u20ac'} {DAILY_ALPHA.target.toLocaleString()}</div>
                <div style={{ marginTop:14, display:'flex', gap:8, justifyContent:'flex-end' }}>
                  <button className="btn-ghost" onClick={()=>setDismissed(true)}>Ignorer</button>
                  <button className="btn-dark" onClick={()=>router.push('/alpha')}>Voir le signal {'\u2192'}</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding:'14px 20px', background:'#FAFAFA', border:'1px solid #EBEBEB', borderRadius:12, marginBottom:20, display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
            <span style={{ fontSize:13, color:'#888' }}>Signal du jour ignor{'\u00e9'}</span>
            <button onClick={()=>setDismissed(false)} style={{ fontSize:12, color:'#E03020', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:600 }}>Restaurer</button>
          </div>
        )}

        {/* ═══ GRID ═══ */}
        <div className="hub-grid">
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {leftWidgets.map(id => renderWidget(id))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {rightWidgets.map(id => renderWidget(id))}
          </div>
        </div>

      </div>
    </>
  )
}
