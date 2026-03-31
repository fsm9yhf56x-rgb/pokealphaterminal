'use client'
import { useRouter } from 'next/navigation'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card }  from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const USER = {
  name:'Alonguez', plan:'free' as 'free'|'pro',
  streak:7, xp:2340, xpNext:3000, level:12,
  streakExpiresIn: 2*3600 + 14*60,
  portfolioValue: 54280, portfolioGain: 340,
}

const DAILY_ALPHA = {
  id:'006', name:'Charizard Alt Art', tier:'S' as const,
  price:920, market:1240, pct:53, confidence:72, psa:312,
  reason:'Alt Art extrêmement rare, PSA Pop faible, fort momentum acheteur détecté sur eBay JP et Cardmarket.',
  target:1300, lang:'EN', expiresIn: 4*3600 - 18*60, watching: 847,
}

const DEXY = {
  text:"Les Alt Art Fire sont en pleine phase haussière. Charizard 151 et Magikarp Snap affichent un momentum inhabituel — PSA Pop très bas, pression acheteuse JP forte. Position à accumuler avant la semaine prochaine.",
  time:'Il y a 12 min',
  tags:['Alt Art haussier','PSA Pop bas','Momentum ▲','JP en avance'],
  tip:"Le marché JP précède l'EN de 2-3 semaines historiquement.",
}

const MISSIONS = [
  { id:1, label:'Consulter 3 signaux Alpha',      progress:1, total:3, xp:50, done:false },
  { id:2, label:'Ajouter une carte au portfolio', progress:1, total:1, xp:30, done:true  },
  { id:3, label:'Rechercher un deal eBay',        progress:0, total:1, xp:40, done:false },
  { id:4, label:'Lire le briefing Dexy du jour',  progress:1, total:1, xp:20, done:true  },
]

const PORTFOLIO_MOVES = [
  { name:'Charizard Alt Art', change:+53, amount:'+€ 300', hot:true  },
  { name:'Umbreon VMAX Alt',  change:+24, amount:'+€ 170', hot:false },
  { name:'Blastoise Base',    change:-4,  amount:'-€ 19',  hot:false },
]

const MOVERS = [
  { name:'Gengar VMAX Alt',  price:'€ 340', change:18,  color:'#C855D4' },
  { name:'Umbreon VMAX Alt', price:'€ 880', change:24,  color:'#7E57C2' },
  { name:'Mewtwo V',         price:'€ 280', change:12,  color:'#C855D4' },
  { name:'Blastoise Base',   price:'€ 620', change:-4,  color:'#42A5F5' },
  { name:'Rayquaza Gold',    price:'€ 740', change:31,  color:'#FFD700' },
]

const HEATMAP = [
  { name:'Charizard', pct:53 },{ name:'Gengar',   pct:18 },{ name:'Mewtwo',   pct:12 },
  { name:'Umbreon',   pct:24 },{ name:'Blastoise', pct:-4 },{ name:'Pikachu',  pct:8  },
  { name:'Lugia',     pct:7  },{ name:'Rayquaza',  pct:31 },{ name:'Eevee',    pct:5  },
  { name:'Mew',       pct:9  },{ name:'Venusaur',  pct:-2 },{ name:'Snorlax',  pct:3  },
  { name:'Dragonite', pct:15 },{ name:'Gyarados',  pct:-6 },{ name:'Raichu',   pct:11 },
]

const STREAK_DAYS = [
  { day:'L', done:true },{ day:'M', done:true },{ day:'M', done:true },
  { day:'J', done:true },{ day:'V', done:true },{ day:'S', done:true },
  { day:'D', done:false },
]

const LEADERBOARD = [
  { rank:1,   name:'RedDragonKai', score:1240, delta:'+82', crown:true  },
  { rank:2,   name:'SakuraTCG',    score:1180, delta:'+61'              },
  { rank:3,   name:'MewCollector', score:1050, delta:'+44'              },
  { rank:null, name:'Toi',         score:742,  delta:'+42', isMe:true   },
]

const WHALE_FEED = [
  { name:'RedDragonKai', action:'Acheté', card:'Charizard Alt Art ×2', amount:'€ 8,400', time:'2h', rank:'LEGEND', color:'#FFD700', locked:false },
  { name:'SakuraTCG',    action:'Acheté', card:'Umbreon VMAX Alt',     amount:'€ 2,800', time:'5h', rank:'PRO',    color:'#C0C0C0', locked:false },
  { name:'???',          action:'Vendu',  card:'Carte masquée',         amount:'€ ?',     time:'6h', rank:'LEGEND', color:'#888',    locked:true  },
]

const LOCKED_SIGNALS = [
  { tier:'A', name:'Umbreon VMAX Alt Art',   pct:24, conf:68 },
  { tier:'A', name:'Rayquaza Gold Star',      pct:31, conf:74 },
  { tier:'B', name:'Pikachu Illustrator Rep', pct:12, conf:61 },
]

const DEALS = [
  { name:'Gengar VMAX Alt Art', discount:28, price:'€ 290', source:'eBay · EN · PSA 9' },
  { name:'Mewtwo V Alt Art',    discount:22, price:'€ 218', source:'CM · JP · Raw'     },
  { name:'Lugia Neo PSA 9',     discount:19, price:'€ 890', source:'eBay · EN'         },
]

const ALPHA_SCORE_BARS = [
  { label:'Signaux',   value:72, display:'72%', color:'#E03020' },
  { label:'Missions',  value:50, display:'2/4',  color:'#FF8C00' },
  { label:'Deals',     value:30, display:'3',    color:'#42A5F5' },
  { label:'Portfolio', value:85, display:'85%', color:'#2E9E6A' },
]

function heatColor(pct: number) {
  if (pct > 20) return { bg:'#DCFCE7', text:'#166534', border:'#BBF7D0' }
  if (pct > 5)  return { bg:'#F0FFF6', text:'#1A7A4A', border:'#AAEEC8' }
  if (pct > 0)  return { bg:'#F8FFFC', text:'#2E9E6A', border:'#D0F0E0' }
  if (pct > -5) return { bg:'#FFF8F0', text:'#C06000', border:'#FFD8A0' }
  return              { bg:'#FFF0EE', text:'#C03020', border:'#FFD0C8' }
}

function Sec({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
      <div style={{ width:'3px', height:'16px', borderRadius:'2px', background:'#E03020', flexShrink:0 }} />
      <span style={{ fontSize:'11px', fontWeight:700, color:'#444', textTransform:'uppercase' as const, letterSpacing:'0.09em', fontFamily:'var(--font-display)' }}>{children}</span>
      <div style={{ flex:1, height:'1px', background:'#EBEBEB' }} />
      {action && <div style={{ fontSize:'11px', fontWeight:600, color:'#2E9E6A', fontFamily:'var(--font-display)', flexShrink:0 }}>{action}</div>}
    </div>
  )
}

function Bar({ value, color, h = 4 }: { value:number; color:string; h?:number }) {
  return (
    <div style={{ height:`${h}px`, background:'#F0F0F0', borderRadius:'99px', overflow:'hidden', flex:1 }}>
      <div style={{ height:'100%', width:`${Math.min(value,100)}%`, background:color, borderRadius:'99px', transition:'width 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
    </div>
  )
}

function Timer({ seconds, urgent }: { seconds:number; urgent?:boolean }) {
  const [s, setS] = useState(seconds)
  useEffect(() => { const t = setInterval(()=>setS(v=>Math.max(0,v-1)),1000); return ()=>clearInterval(t) },[])
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60
  const u = urgent || s < 3600
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'3px' }}>
      {[h,m,sec].map((v,i)=>(
        <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:'3px' }}>
          <span style={{ background:u?'#E03020':'#111', color:'#fff', fontSize:'11px', fontWeight:700, padding:'2px 6px', borderRadius:'4px', fontFamily:'var(--font-display)', minWidth:'24px', textAlign:'center' }}>{String(v).padStart(2,'0')}</span>
          {i<2&&<span style={{ color:'#AAA', fontSize:'10px' }}>:</span>}
        </span>
      ))}
      <span style={{ fontSize:'9px', color:u?'#E03020':'#888', marginLeft:'3px', fontFamily:'var(--font-display)' }}>restant</span>
    </div>
  )
}

function ProGate({ children, reason, cta }: { children: React.ReactNode; reason: string; cta?: string }) {
  return (
    <div style={{ position:'relative', borderRadius:'12px', overflow:'hidden' }}>
      <div style={{ filter:'blur(1.5px)', pointerEvents:'none', userSelect:'none', opacity:0.8 }}>{children}</div>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.62)', borderRadius:'12px', padding:'14px', textAlign:'center', gap:'7px' }}>
        <div style={{ fontSize:'16px' }}>🔒</div>
        <div style={{ fontSize:'12px', color:'#555', fontFamily:'var(--font-sans)', lineHeight:1.5, maxWidth:'200px' }}>{reason}</div>
        <button style={{ padding:'8px 20px', borderRadius:'20px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
          {cta ?? 'Passer Pro →'}
        </button>
      </div>
    </div>
  )
}

function Toast({ msg, onClose }: { msg:string; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return ()=>clearTimeout(t) }, [onClose])
  return (
    <div style={{ position:'fixed', top:'96px', right:'24px', zIndex:1000, background:'rgba(17,17,17,0.88)', backdropFilter:'blur(8px)', color:'#fff', padding:'12px 16px', borderRadius:'12px', fontSize:'13px', fontFamily:'var(--font-sans)', boxShadow:'0 8px 24px rgba(0,0,0,0.15)', display:'flex', alignItems:'center', gap:'10px', maxWidth:'280px', animation:'toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
      <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#FFD700', flexShrink:0, animation:'pulse 1.2s ease-in-out infinite' }} />
      <span style={{ flex:1, lineHeight:1.5 }}>{msg}</span>
      <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'16px', padding:0 }}>×</button>
    </div>
  )
}

export function DailyHub() {
  const [done, setDone]           = useState<number[]>(MISSIONS.filter(m=>m.done).map(m=>m.id))
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const [xpAnim, setXpAnim]       = useState(false)
  const [particles, setParticles] = useState<{id:number;x:number;y:number;xp:number}[]>([])
  const [toast, setToast]         = useState<string|null>(null)
  const [toastIdx, setToastIdx]   = useState(0)
  const particleRef               = useRef(0)

  const isPro    = USER.plan === 'pro'
  const xpPct    = Math.round((USER.xp/USER.xpNext)*100)
  const xpEarned = MISSIONS.filter(m=>done.includes(m.id)).reduce((a,m)=>a+m.xp,0)
  const today    = new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})

  const TOASTS = [
    "🐋 RedDragonKai vient d'acheter Charizard Alt Art · €4,200",
    '🔥 Signal Tier S activé sur Rayquaza Gold Star',
  ]

  useEffect(() => {
    if (toastIdx >= TOASTS.length) return
    const delays = [9000, 24000]
    const t = setTimeout(() => { setToast(TOASTS[toastIdx]); setToastIdx(i=>i+1) }, delays[toastIdx])
    return () => clearTimeout(t)
  }, [toastIdx])

  const toggleMission = (id:number, xp:number, e:React.MouseEvent) => {
    const isDone = done.includes(id)
    if (!isDone) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const pid  = ++particleRef.current
      setParticles(prev=>[...prev,{id:pid,x:rect.right-20,y:rect.top-10,xp}])
      setTimeout(()=>setParticles(prev=>prev.filter(p=>p.id!==pid)),1200)
      setXpAnim(true); setTimeout(()=>setXpAnim(false),600)
    }
    setDone(prev=>isDone?prev.filter(i=>i!==id):[...prev,id])
  }

  const closeToast = useCallback(()=>setToast(null),[])

  return (
    <>
      <style>{`
        @keyframes fadeIn     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatXP    { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-44px)} }
        @keyframes float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes xpBump     { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        @keyframes pulse      { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.7)} }
        @keyframes toastIn    { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes streakGlow { 0%,100%{box-shadow:0 0 0 0 rgba(224,48,32,0)} 50%{box-shadow:0 0 0 5px rgba(224,48,32,0.12)} }
        @keyframes shimmer    { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes xpFill     { from{width:0} }

        .hub-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .hub-pro  { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:20px; }
        @media(max-width:1100px){ .hub-grid{ grid-template-columns:1fr; } .hub-pro{ grid-template-columns:1fr; } }

        .rh:hover        { background:#F8F8F8 !important; cursor:pointer; }
        .heatcell:hover  { opacity:0.82; transform:scale(1.04); cursor:pointer; }
        .btn-blk:hover   { opacity:0.86; }
        .btn-pro:hover   { opacity:0.88; }

        .xp-particle  { position:fixed; pointer-events:none; font-size:13px; font-weight:700; color:#E03020; font-family:var(--font-display); z-index:9999; animation:floatXP 1.1s ease-out forwards; }
        .streak-glow  { animation: streakGlow 2.5s ease-in-out infinite; }
        .shimmer-bg   { background:linear-gradient(90deg,#F0F0F0 25%,#E4E4E4 50%,#F0F0F0 75%); background-size:200% 100%; animation:shimmer 1.8s linear infinite; }
      `}</style>

      {toast && <Toast msg={toast} onClose={closeToast} />}
      {particles.map(p=>(
        <div key={p.id} className="xp-particle" style={{left:p.x,top:p.y}}>+{p.xp} XP</div>
      ))}

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        {/* ══ HEADER ══════════════════════════════════════════ */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'20px', gap:'16px', flexWrap:'wrap' }}>

          {/* Gauche — titre + nudge */}
          <div>
            <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 5px', fontFamily:'var(--font-display)' }}>{today}</p>
            <h1 style={{ fontSize:'28px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.6px', margin:'0 0 10px', lineHeight:1.1 }}>
              Bonjour, {USER.name} 👋
            </h1>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
              <span style={{ fontSize:'12px', fontWeight:500, color:'#2E9E6A', background:'#F0FFF6', border:'1px solid #AAEEC8', padding:'3px 10px', borderRadius:'20px', fontFamily:'var(--font-display)' }}>
                Portfolio +€ {USER.portfolioGain.toLocaleString('en-US')} depuis hier
              </span>
              {!isPro && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'#FFF5F0', border:'1.5px solid #FFCBB0', borderRadius:'20px', padding:'4px 6px 4px 12px' }}>
                  <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#E03020', animation:'pulse 1.5s ease-in-out infinite', flexShrink:0 }} />
                  <span style={{ fontSize:'12px', color:'#6A3020', fontFamily:'var(--font-sans)' }}>
                    <strong style={{ fontFamily:'var(--font-display)', color:'#111' }}>12 signaux</strong> et <strong style={{ fontFamily:'var(--font-display)', color:'#111' }}>8 deals</strong> avec Pro
                  </span>
                  <button className="btn-pro" style={{ fontSize:'11px', fontWeight:700, color:'#fff', background:'#E03020', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', padding:'4px 12px', borderRadius:'14px', transition:'opacity 0.15s' }}>
                    Passer Pro ↗
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Droite — RPG : Streak + XP */}
          <div style={{ display:'flex', gap:'10px', alignItems:'stretch', flexShrink:0 }}>

            {/* Streak RPG */}
            <div className="streak-glow" style={{ background:'#fff', border:'1.5px solid #FFD8D0', borderRadius:'16px', padding:'12px 16px', display:'flex', flexDirection:'column', justifyContent:'space-between', gap:'10px', minWidth:'200px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'22px', lineHeight:1 }}>🔥</span>
                  <div>
                    <div style={{ fontSize:'22px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', lineHeight:1, letterSpacing:'-0.5px' }}>{USER.streak} <span style={{ fontSize:'13px', fontWeight:400, color:'#888' }}>jours</span></div>
                    <div style={{ fontSize:'9px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'var(--font-display)' }}>Streak actif</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'3px' }}>
                  {STREAK_DAYS.map((d,i)=>(
                    <div key={i} title={d.day} style={{ width:'19px', height:'19px', borderRadius:'4px', background:d.done?'#E03020':'#F0F0F0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'8px', color:d.done?'#fff':'#CCC', fontWeight:700 }}>{d.done?'✓':d.day}</div>
                  ))}
                </div>
              </div>
              {/* Streak danger */}
              <div style={{ background:'#FFF0EE', border:'1px solid #FFD8D0', borderRadius:'7px', padding:'5px 9px', display:'flex', alignItems:'center', gap:'6px' }}>
                <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#E03020', animation:'pulse 1.2s ease-in-out infinite', flexShrink:0 }} />
                <span style={{ fontSize:'10px', color:'#C03020', fontWeight:500, fontFamily:'var(--font-display)' }}>En danger ·</span>
                <Timer seconds={USER.streakExpiresIn} urgent />
              </div>
            </div>

            {/* XP + Level RPG */}
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'16px', padding:'12px 16px', display:'flex', flexDirection:'column', justifyContent:'space-between', gap:'10px', minWidth:'200px', animation:xpAnim?'xpBump 0.4s ease':'none' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:'11px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'var(--font-display)', marginBottom:'3px' }}>Niveau</div>
                  <div style={{ fontSize:'26px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', lineHeight:1, letterSpacing:'-0.5px' }}>{USER.level}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'11px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'var(--font-display)', marginBottom:'3px' }}>Alpha Score</div>
                  <div style={{ fontSize:'22px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', lineHeight:1, letterSpacing:'-0.5px' }}>742</div>
                </div>
              </div>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                  <span style={{ fontSize:'10px', color:'#2E9E6A', fontWeight:600, fontFamily:'var(--font-display)' }}>+{xpEarned} XP aujourd'hui</span>
                  <span style={{ fontSize:'10px', color:'#AAA', fontFamily:'var(--font-display)' }}>{USER.xp.toLocaleString()} / {USER.xpNext.toLocaleString()}</span>
                </div>
                <Bar value={xpPct} color="linear-gradient(90deg,#E03020,#FF8C00,#FFD700)" h={7} />
              </div>
            </div>

          </div>
        </div>

        {/* ══ HERO : DAILY ALPHA ═══════════════════════════════ */}
        <div style={{ marginBottom:'20px' }}>
          <Sec action={<Timer seconds={DAILY_ALPHA.expiresIn} />}>Signal du jour</Sec>
          {!dismissed ? (
            <div style={{ background:'#fff', border:'1px solid #E8E8E8', borderRadius:'16px', overflow:'hidden', boxShadow:'0 2px 16px rgba(220,50,30,0.07)' }}>
              <div style={{ height:'3px', background:'linear-gradient(90deg,#FFD700,#FF8C00,#E03020)' }} />
              <div style={{ padding:'20px 24px', display:'grid', gridTemplateColumns:'1fr auto', gap:'32px', alignItems:'center' }}>
                <div style={{ display:'flex', gap:'18px', alignItems:'flex-start' }}>
                  <div style={{ width:'60px', height:'84px', flexShrink:0, borderRadius:'10px', background:'linear-gradient(145deg,#FFF5F0,#FFE8DC)', border:'1.5px solid #F5D0C0', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'5px', boxShadow:'0 4px 14px rgba(200,80,60,0.15)' }}>
                    <span style={{ fontSize:'20px', color:'#FFD700' }}>★</span>
                    <span style={{ fontSize:'7px', background:'#FF6B35', color:'#fff', padding:'2px 6px', borderRadius:'3px', fontWeight:700, letterSpacing:'0.04em' }}>FIRE</span>
                    <span style={{ fontSize:'7px', color:'#B8998A', textAlign:'center', lineHeight:1.3 }}>Alt Art</span>
                  </div>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'7px' }}>
                      <span style={{ background:'linear-gradient(135deg,#FFD700,#FF8C00)', color:'#fff', fontSize:'11px', fontWeight:700, padding:'3px 12px', borderRadius:'20px', boxShadow:'0 2px 8px rgba(255,160,0,0.35)', fontFamily:'var(--font-display)', animation:'float 3s ease-in-out infinite', display:'inline-block' }}>Tier {DAILY_ALPHA.tier}</span>
                      <span style={{ fontSize:'11px', color:'#AAA', fontFamily:'var(--font-display)' }}>#{DAILY_ALPHA.id}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                        <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#E03020', animation:'pulse 1.5s ease-in-out infinite' }} />
                        <span style={{ fontSize:'11px', color:'#888' }}>{DAILY_ALPHA.watching.toLocaleString()} regardent</span>
                      </div>
                    </div>
                    <div style={{ fontSize:'20px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', marginBottom:'6px', letterSpacing:'-0.2px' }}>{DAILY_ALPHA.name}</div>
                    <div style={{ display:'flex', gap:'5px', marginBottom:'8px' }}>
                      <Badge variant="energy-fire">Fire</Badge>
                      <Badge variant="tier-a">Alt Art</Badge>
                      <Badge variant="green">PSA {DAILY_ALPHA.lang}</Badge>
                    </div>
                    <div style={{ fontSize:'12px', color:'#777', lineHeight:1.6, maxWidth:'440px' }}>{DAILY_ALPHA.reason}</div>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px', alignItems:'flex-end', flexShrink:0 }}>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ display:'flex', alignItems:'baseline', gap:'8px', justifyContent:'flex-end', marginBottom:'3px' }}>
                      <span style={{ fontSize:'36px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-1.5px', lineHeight:1 }}>€ {DAILY_ALPHA.price.toLocaleString('en-US')}</span>
                      <span style={{ fontSize:'18px', fontWeight:700, color:'#2E9E6A' }}>+{DAILY_ALPHA.pct}%</span>
                    </div>
                    <div style={{ fontSize:'12px', color:'#AAA' }}>Marché € {DAILY_ALPHA.market.toLocaleString('en-US')} · Cible € {DAILY_ALPHA.target.toLocaleString('en-US')}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'5px', width:'190px' }}>
                    {[
                      { label:'Tier score', value:90, color:'linear-gradient(90deg,#FFD700,#FF8C00)', d:'S'    },
                      { label:'Confiance',  value:72, color:'linear-gradient(90deg,#42A5F5,#26C6DA)', d:'72%' },
                      { label:'PSA Pop',    value:62, color:'linear-gradient(90deg,#C855D4,#7C4DFF)', d:'312' },
                    ].map(s=>(
                      <div key={s.label} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <span style={{ fontSize:'10px', color:'#AAA', width:'60px', textAlign:'right', flexShrink:0, fontFamily:'var(--font-display)' }}>{s.label}</span>
                        <div style={{ flex:1, height:'4px', background:'#F0F0F0', borderRadius:'99px', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${s.value}%`, background:s.color, borderRadius:'99px' }} />
                        </div>
                        <span style={{ fontSize:'10px', fontWeight:600, color:'#111', width:'28px', fontFamily:'var(--font-display)' }}>{s.d}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button className="btn-blk" style={{ padding:'10px 22px', borderRadius:'9px', background:'#111', color:'#fff', border:'none', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', transition:'opacity 0.15s' }}>
                      Voir le signal →
                    </button>
                    <button onClick={()=>setDismissed(true)} style={{ padding:'10px 14px', borderRadius:'9px', background:'transparent', color:'#888', border:'1px solid #E0E0E0', fontSize:'13px', cursor:'pointer', fontFamily:'var(--font-display)' }}>
                      Ignorer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Card padding="md">
              <div style={{ textAlign:'center', padding:'10px 0', display:'flex', alignItems:'center', justifyContent:'center', gap:'12px' }}>
                <span style={{ fontSize:'14px', color:'#888' }}>Signal du jour ignoré</span>
                <button onClick={()=>setDismissed(false)} style={{ fontSize:'12px', color:'#E03020', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:600 }}>Restaurer</button>
              </div>
            </Card>
          )}
        </div>

        {/* ══ DEXY ═══════════════════════════════════════════ */}
        <div style={{ marginBottom:'20px' }}>
          <div style={{ background:'#fff', border:'1px solid #E8E8E8', borderRadius:'14px', padding:'16px 20px', display:'flex', gap:'14px', alignItems:'flex-start', borderLeft:'3px solid #E03020' }}>
            <div style={{ width:'38px', height:'38px', borderRadius:'11px', flexShrink:0, background:'linear-gradient(135deg,#FF7A5A,#E03020)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'15px', fontWeight:700, boxShadow:'0 3px 8px rgba(220,50,30,0.25)' }}>D</div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'7px', gap:'12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'14px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)' }}>Dexy AI · Briefing du jour</span>
                  <div style={{ background:'#FFFDE0', border:'1px solid #FFE87A', borderRadius:'5px', padding:'2px 8px', display:'inline-flex', alignItems:'center', gap:'4px' }}>
                    <span style={{ fontSize:'10px', fontWeight:600, color:'#B8960A', fontFamily:'var(--font-display)' }}>💡 {DEXY.tip}</span>
                  </div>
                </div>
                <span style={{ fontSize:'11px', color:'#CCC', flexShrink:0 }}>{DEXY.time}</span>
              </div>
              <div style={{ display:'flex', alignItems:'flex-start', gap:'16px' }}>
                <p style={{ fontSize:'13px', color:'#4A3020', lineHeight:1.7, margin:0, flex:1 }}>{DEXY.text}</p>
                <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', flexShrink:0, maxWidth:'220px', justifyContent:'flex-end' }}>
                  {DEXY.tags.map(tag=>(
                    <span key={tag} style={{ fontSize:'10px', background:'#FFF5F0', color:'#C84B00', border:'1px solid #FFD0B8', padding:'2px 8px', borderRadius:'10px', fontFamily:'var(--font-display)', whiteSpace:'nowrap' }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ CONTENU PRINCIPAL ═══════════════════════════════ */}
        <div className="hub-grid">

          {/* ── COL GAUCHE : TON MARCHÉ ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>

            {/* Tes cartes ont bougé */}
            <div>
              <Sec action="+€ 451 net">Tes cartes ont bougé</Sec>
              <Card padding="none">
                {PORTFOLIO_MOVES.map((c,i)=>(
                  <div key={c.name} className="rh" style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', borderBottom:i<PORTFOLIO_MOVES.length-1?'1px solid #F5F5F5':'none', transition:'background 0.1s' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:c.hot?'#E03020':c.change>=0?'#2E9E6A':'#E03020', flexShrink:0, animation:c.hot?'pulse 1.5s ease-in-out infinite':'none' }} />
                    <span style={{ flex:1, fontSize:'13px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)' }}>{c.name}</span>
                    <span style={{ fontSize:'13px', fontWeight:700, color:c.change>=0?'#2E9E6A':'#E03020', minWidth:'44px', textAlign:'right' }}>{c.change>=0?'+':''}{c.change}%</span>
                    <span style={{ fontSize:'14px', fontWeight:700, color:c.change>=0?'#2E9E6A':'#E03020', fontFamily:'var(--font-display)', minWidth:'68px', textAlign:'right' }}>{c.amount}</span>
                  </div>
                ))}
              </Card>
            </div>

            {/* Top Movers */}
            <div>
              <Sec>Top Movers · 24h</Sec>
              <Card padding="none">
                {MOVERS.map((m,i)=>(
                  <div key={m.name} className="rh" style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', borderBottom:i<MOVERS.length-1?'1px solid #F5F5F5':'none', transition:'background 0.1s' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:m.color, flexShrink:0 }} />
                    <span style={{ flex:1, fontSize:'13px', color:'#111', fontFamily:'var(--font-display)' }}>{m.name}</span>
                    <span style={{ fontSize:'13px', fontWeight:500, color:'#555', fontFamily:'var(--font-display)', letterSpacing:'-0.2px' }}>{m.price}</span>
                    <span style={{ fontSize:'12px', fontWeight:700, color:m.change>=0?'#2E9E6A':'#E03020', minWidth:'50px', textAlign:'right' }}>{m.change>=0?'▲':'▼'} {Math.abs(m.change)}%</span>
                  </div>
                ))}
              </Card>
            </div>

            {/* Heatmap */}
            <div>
              <Sec>Market heatmap · 24h</Sec>
              <Card padding="md">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'7px' }}>
                  {HEATMAP.map(cell=>{
                    const s = heatColor(cell.pct)
                    return (
                      <div key={cell.name} className="heatcell" style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:'8px', padding:'9px 6px', textAlign:'center', transition:'all 0.15s' }}>
                        <div style={{ fontSize:'11px', fontWeight:600, color:s.text, fontFamily:'var(--font-display)', marginBottom:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cell.name}</div>
                        <div style={{ fontSize:'11px', fontWeight:700, color:s.text }}>{cell.pct>=0?'+':''}{cell.pct}%</div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>

            {/* Alpha Score — complète la colonne gauche */}
            <div>
              <Sec>Ton Alpha Score</Sec>
              <Card padding="md">
                <div style={{ display:'flex', alignItems:'center', gap:'20px', marginBottom:'14px', paddingBottom:'14px', borderBottom:'1px solid #F0F0F0' }}>
                  <div>
                    <div style={{ fontSize:'48px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-2px', lineHeight:1 }}>742</div>
                    <div style={{ fontSize:'11px', color:'#888', marginTop:'4px' }}>Score · Semaine en cours</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'#F0FFF6', border:'1px solid #AAEEC8', padding:'4px 12px', borderRadius:'20px', marginBottom:'8px' }}>
                      <span style={{ fontSize:'12px', fontWeight:600, color:'#2E9E6A', fontFamily:'var(--font-display)' }}>▲ +42 depuis lundi</span>
                    </div>
                    <div style={{ fontSize:'12px', color:'#888', lineHeight:1.5 }}>Consulte plus de signaux pour améliorer ton score cette semaine.</div>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {ALPHA_SCORE_BARS.map(s=>(
                    <div key={s.label} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <span style={{ fontSize:'11px', color:'#888', width:'80px', flexShrink:0, fontFamily:'var(--font-display)' }}>{s.label}</span>
                      <Bar value={s.value} color={s.color} />
                      <span style={{ fontSize:'11px', fontWeight:600, color:'#111', width:'32px', textAlign:'right', fontFamily:'var(--font-display)' }}>{s.display}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

          </div>

          {/* ── COL DROITE : TES ACTIONS ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>

            {/* Missions */}
            <div>
              <Sec action={`${done.length}/${MISSIONS.length} · +${xpEarned} XP`}>Missions du jour</Sec>
              <Card padding="md">
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {MISSIONS.map(mission=>{
                    const isDone = done.includes(mission.id)
                    const pct   = Math.round((mission.progress/mission.total)*100)
                    return (
                      <div key={mission.id} onClick={(e)=>toggleMission(mission.id,mission.xp,e)} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', borderRadius:'10px', background:isDone?'#F5FFF9':'#FAFAFA', border:`1px solid ${isDone?'#AAEEC8':'#EBEBEB'}`, cursor:'pointer', transition:'all 0.15s' }}>
                        <div style={{ width:'22px', height:'22px', borderRadius:'7px', border:`2px solid ${isDone?'#2E9E6A':'#D4D4D4'}`, background:isDone?'#2E9E6A':'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s', color:'#fff', fontSize:'12px', fontWeight:700 }}>{isDone?'✓':''}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'13px', fontWeight:isDone?400:500, color:isDone?'#888':'#111', fontFamily:'var(--font-display)', textDecoration:isDone?'line-through':'none', marginBottom:!isDone?'6px':0 }}>{mission.label}</div>
                          {!isDone&&(
                            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                              <Bar value={pct} color="#E03020" />
                              <span style={{ fontSize:'10px', color:'#888', whiteSpace:'nowrap' }}>{mission.progress}/{mission.total}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize:'10px', fontWeight:700, background:isDone?'#E0FFF0':'#FFF0EE', color:isDone?'#2E9E6A':'#E03020', border:`1px solid ${isDone?'#AAEEC8':'#FFD8D0'}`, padding:'3px 9px', borderRadius:'8px', flexShrink:0, fontFamily:'var(--font-display)' }}>+{mission.xp} XP</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop:'14px', paddingTop:'12px', borderTop:'1px solid #EBEBEB' }}>
                  <Bar value={Math.round((done.length/MISSIONS.length)*100)} color="linear-gradient(90deg,#E03020,#FF8C00)" h={6} />
                </div>
              </Card>
            </div>

            {/* Leaderboard */}
            <div>
              <Sec>Classement · Cette semaine</Sec>
              <Card padding="none">
                {LEADERBOARD.map((u,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', borderBottom:i<LEADERBOARD.length-1?'1px solid #F5F5F5':'none', background:(u as any).isMe?'#FFFDE0':'transparent' }}>
                    <div style={{ width:'26px', textAlign:'center', fontSize:'15px', fontWeight:700, color:u.rank===1?'#FFD700':u.rank===2?'#C0C0C0':u.rank===3?'#CD7F32':'#AAA', flexShrink:0 }}>
                      {(u as any).crown?'👑':u.rank??'—'}
                    </div>
                    <div style={{ flex:1, display:'flex', alignItems:'center', gap:'7px' }}>
                      <span style={{ fontSize:'13px', fontWeight:(u as any).isMe?700:400, color:(u as any).isMe?'#111':'#555', fontFamily:'var(--font-display)' }}>{u.name}</span>
                      {(u as any).isMe&&<span style={{ fontSize:'9px', background:'#FFF0EE', color:'#E03020', border:'1px solid #FFD8D0', padding:'2px 6px', borderRadius:'4px', fontWeight:700, fontFamily:'var(--font-display)' }}>MOI</span>}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'14px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>{u.score}</div>
                      <div style={{ fontSize:'11px', color:'#2E9E6A', fontWeight:600 }}>{u.delta}</div>
                    </div>
                  </div>
                ))}
                {!isPro&&(
                  <div style={{ padding:'10px 16px', background:'#FAFAFA', borderTop:'1px solid #F0F0F0', borderRadius:'0 0 12px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:'12px', color:'#AAA' }}>Top 3 réservé aux Pro</span>
                    <button className="btn-pro" style={{ fontSize:'12px', fontWeight:600, color:'#E03020', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', padding:0 }}>Rejoindre →</button>
                  </div>
                )}
              </Card>
            </div>

            {/* Whale Tracker */}
            <div>
              <Sec>Whale tracker · Live</Sec>
              <Card padding="none">
                {WHALE_FEED.map((w,i)=> w.locked && !isPro ? (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', borderBottom:i<WHALE_FEED.length-1?'1px solid #F5F5F5':'none', background:'#FAFAFA' }}>
                    <div className="shimmer-bg" style={{ width:'36px', height:'36px', borderRadius:'10px', flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'12px', color:'#CCC', fontFamily:'var(--font-display)', marginBottom:'2px' }}>Mouvement masqué</div>
                      <div style={{ fontSize:'11px', color:'#DDD' }}>Visible avec Pro</div>
                    </div>
                    <div style={{ fontSize:'13px', color:'#DDD', fontFamily:'var(--font-display)' }}>€ ···</div>
                  </div>
                ) : (
                  <div key={i} className="rh" style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', borderBottom:i<WHALE_FEED.length-1?'1px solid #F5F5F5':'none', transition:'background 0.1s' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:`linear-gradient(135deg,${w.color}20,${w.color}40)`, border:`1px solid ${w.color}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color:w.color, flexShrink:0, fontFamily:'var(--font-display)' }}>{w.name.slice(0,2).toUpperCase()}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                        <span style={{ fontSize:'13px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)' }}>{w.name}</span>
                        <span style={{ fontSize:'9px', fontWeight:700, background:'#111', color:'#fff', padding:'2px 6px', borderRadius:'3px', letterSpacing:'0.03em' }}>{w.rank}</span>
                      </div>
                      <div style={{ fontSize:'11px', color:'#888' }}>{w.action} · {w.card} · {w.time}</div>
                    </div>
                    <div style={{ fontSize:'14px', fontWeight:700, color:w.action==='Acheté'?'#2E9E6A':'#E03020', fontFamily:'var(--font-display)' }}>{w.amount}</div>
                  </div>
                ))}
                {!isPro&&(
                  <div style={{ padding:'10px 16px', background:'#FAFAFA', borderTop:'1px solid #F0F0F0', borderRadius:'0 0 12px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:'12px', color:'#AAA' }}>1 mouvement masqué</span>
                    <button className="btn-pro" style={{ fontSize:'12px', fontWeight:600, color:'#E03020', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', padding:0 }}>Voir avec Pro →</button>
                  </div>
                )}
              </Card>
            </div>

          </div>
        </div>

        {/* ══ PRO GATE ═════════════════════════════════════════ */}
        <div className="hub-pro">
          <div>
            <Sec>Signaux Alpha · Tier A/B</Sec>
            {isPro ? (
              <Card padding="none">
                {LOCKED_SIGNALS.map((s,i)=>(
                  <div key={i} className="rh" style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', borderBottom:i<LOCKED_SIGNALS.length-1?'1px solid #F5F5F5':'none', transition:'background 0.1s' }}>
                    <span style={{ fontSize:'10px', fontWeight:700, background:s.tier==='A'?'#F5EAFF':'#F0FFF6', color:s.tier==='A'?'#7B2D8B':'#1A7A4A', border:`1px solid ${s.tier==='A'?'#D8B8FF':'#AAEEC8'}`, padding:'3px 9px', borderRadius:'5px', fontFamily:'var(--font-display)', flexShrink:0 }}>Tier {s.tier}</span>
                    <span style={{ flex:1, fontSize:'13px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)' }}>{s.name}</span>
                    <span style={{ fontSize:'13px', fontWeight:700, color:'#2E9E6A' }}>+{s.pct}%</span>
                    <span style={{ fontSize:'11px', color:'#AAA', minWidth:'36px', textAlign:'right' }}>{s.conf}%</span>
                  </div>
                ))}
              </Card>
            ) : (
              <ProGate reason={`${LOCKED_SIGNALS.length} signaux Tier A et B disponibles en temps réel`} cta="Débloquer avec Pro →">
                <Card padding="none">
                  {LOCKED_SIGNALS.map((s,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', borderBottom:i<LOCKED_SIGNALS.length-1?'1px solid #F5F5F5':'none' }}>
                      <span style={{ fontSize:'10px', fontWeight:700, background:'#F5F5F5', color:'#AAA', border:'1px solid #E8E8E8', padding:'3px 9px', borderRadius:'5px', fontFamily:'var(--font-display)', flexShrink:0 }}>Tier {s.tier}</span>
                      <span style={{ flex:1, fontSize:'13px', color:'#AAA', fontFamily:'var(--font-display)' }}>{s.name}</span>
                      <span style={{ fontSize:'13px', fontWeight:700, color:'#AAA' }}>+{s.pct}%</span>
                    </div>
                  ))}
                </Card>
              </ProGate>
            )}
          </div>

          <div>
            <Sec>Deals du moment</Sec>
            {isPro ? (
              <Card padding="none">
                {DEALS.map((d,i)=>(
                  <div key={i} className="rh" style={{ display:'flex', alignItems:'center', gap:'14px', padding:'13px 16px', borderBottom:i<DEALS.length-1?'1px solid #F5F5F5':'none', transition:'background 0.1s' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)', marginBottom:'3px' }}>{d.name}</div>
                      <div style={{ fontSize:'11px', color:'#888' }}>{d.source}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'15px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>{d.price}</div>
                      <div style={{ fontSize:'12px', fontWeight:700, color:'#2E9E6A' }}>-{d.discount}%</div>
                    </div>
                  </div>
                ))}
              </Card>
            ) : (
              <ProGate reason={`${DEALS.length} deals sous valeur marché disponibles`} cta="Voir les deals avec Pro →">
                <Card padding="none">
                  {DEALS.map((d,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'13px 16px', borderBottom:i<DEALS.length-1?'1px solid #F5F5F5':'none' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', color:'#AAA', fontFamily:'var(--font-display)', marginBottom:'3px' }}>{d.name}</div>
                        <div style={{ fontSize:'11px', color:'#CCC' }}>{d.source}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'15px', fontWeight:700, color:'#AAA', fontFamily:'var(--font-display)' }}>{d.price}</div>
                        <div style={{ fontSize:'12px', fontWeight:700, color:'#AAA' }}>-{d.discount}%</div>
                      </div>
                    </div>
                  ))}
                </Card>
              </ProGate>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
