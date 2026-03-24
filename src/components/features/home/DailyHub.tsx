'use client'

import { useState, useEffect, useRef } from 'react'
import { Card }  from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const USER = { name:'Alonguez', streak:7, xp:2340, xpNext:3000, level:12, lastVisit: new Date(Date.now()-3*3600*1000) }

const DAILY_ALPHA = {
  id:'006', name:'Charizard Alt Art', tier:'S' as const,
  price:920, market:1240, pct:53, confidence:72, psa:312,
  reason:'Alt Art extrêmement rare, PSA Pop faible, fort momentum acheteur détecté sur eBay JP et Cardmarket.',
  target:1300, lang:'EN', expiresIn: 4*3600 - 18*60,
}

const DEXY_CARD = {
  text:"Les Alt Art Fire sont en pleine phase haussière. Charizard 151 et Magikarp Snap affichent un momentum inhabituel — le PSA Pop très bas soutient les prix à moyen terme. Mon conseil : accumuler avant la semaine prochaine.",
  time:'Il y a 12 min',
  tags:['Alt Art haussier','PSA Pop bas','Momentum ▲','JP en avance'],
  tip:"Le marché JP précède l'EN de 2-3 semaines historiquement.",
}

const MISSIONS = [
  { id:1, label:'Consulter 3 signaux Alpha',      progress:1, total:3, xp:50, done:false },
  { id:2, label:'Ajouter une carte au portfolio', progress:1, total:1, xp:30, done:true  },
  { id:3, label:'Rechercher un deal eBay',         progress:0, total:1, xp:40, done:false },
  { id:4, label:'Lire le briefing Dexy du jour',  progress:1, total:1, xp:20, done:true  },
]

const INDICES = [
  { label:'Cards Index', value:'2,841',  change:3.2,  color:'#FF6B35' },
  { label:'Sealed',      value:'4,120',  change:-1.1, color:'#42A5F5' },
  { label:'Vintage',     value:'8,740',  change:6.8,  color:'#FFD700' },
  { label:'Portfolio',   value:'54,280', change:14.2, color:'#2E9E6A', prefix:'€ ' },
]

const MOVERS = [
  { name:'Gengar VMAX Alt',  price:'€ 340', change:18,  color:'#C855D4' },
  { name:'Umbreon VMAX Alt', price:'€ 880', change:24,  color:'#7E57C2' },
  { name:'Mewtwo V',         price:'€ 280', change:12,  color:'#C855D4' },
  { name:'Blastoise Base',   price:'€ 620', change:-4,  color:'#42A5F5' },
  { name:'Rayquaza Gold',    price:'€ 740', change:31,  color:'#FFD700' },
]

const HEATMAP = [
  { name:'Charizard',  pct:53  },{ name:'Gengar',   pct:18  },{ name:'Mewtwo',  pct:12  },
  { name:'Umbreon',    pct:24  },{ name:'Blastoise', pct:-4  },{ name:'Pikachu', pct:8   },
  { name:'Lugia',      pct:7   },{ name:'Rayquaza',  pct:31  },{ name:'Eevee',   pct:5   },
  { name:'Mew',        pct:9   },{ name:'Venusaur',  pct:-2  },{ name:'Snorlax', pct:3   },
  { name:'Dragonite',  pct:15  },{ name:'Gyarados',  pct:-6  },{ name:'Raichu',  pct:11  },
]

const STREAK_DAYS = [
  { day:'L', done:true },{ day:'M', done:true },{ day:'M', done:true },
  { day:'J', done:true },{ day:'V', done:true },{ day:'S', done:true },
  { day:'D', done:false },
]

const WHALE_ALERTS = [
  { name:'RedDragonKai', card:'Charizard Alt Art', amount:'€ 4,200', time:'Il y a 2h',  color:'#FFD700', rank:'LEGEND' },
  { name:'SakuraTCG',    card:'Umbreon VMAX',       amount:'€ 2,800', time:'Il y a 5h',  color:'#C0C0C0', rank:'PRO'    },
]

function heatColor(pct: number): string {
  if (pct > 20)  return { bg:'#DCFCE7', text:'#166534', border:'#BBF7D0' } as any
  if (pct > 5)   return { bg:'#F0FFF6', text:'#1A7A4A', border:'#AAEEC8' } as any
  if (pct > 0)   return { bg:'#F8FFFC', text:'#2E9E6A', border:'#D0F0E0' } as any
  if (pct > -5)  return { bg:'#FFF8F0', text:'#C06000', border:'#FFD8A0' } as any
  return         { bg:'#FFF0EE', text:'#C03020', border:'#FFD0C8' } as any
}

function SecTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
      <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#E03020', flexShrink:0 }} />
      <span style={{ fontSize:'10px', fontWeight:600, color:'#888', textTransform:'uppercase' as const, letterSpacing:'0.1em', fontFamily:'var(--font-display)', whiteSpace:'nowrap' as const }}>{children}</span>
      <div style={{ flex:1, height:'1px', background:'linear-gradient(90deg,#EBEBEB,transparent)' }} />
      {action}
    </div>
  )
}

function Bar({ value, color }: { value:number; color:string }) {
  return (
    <div style={{ height:'4px', background:'#F0F0F0', borderRadius:'99px', overflow:'hidden', flex:1 }}>
      <div style={{ height:'100%', width:`${Math.min(value,100)}%`, background:color, borderRadius:'99px', transition:'width 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
    </div>
  )
}

function Countdown({ seconds }: { seconds: number }) {
  const [secs, setSecs] = useState(seconds)
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s - 1), 1000)
    return () => clearInterval(t)
  }, [])
  const h = Math.floor(secs/3600)
  const m = Math.floor((secs%3600)/60)
  const s = secs%60
  const urgent = secs < 3600
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
      {[h,m,s].map((v,i) => (
        <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:'4px' }}>
          <span style={{
            background: urgent ? '#E03020' : '#111',
            color:'#fff', fontSize:'12px', fontWeight:700,
            padding:'2px 7px', borderRadius:'5px',
            fontFamily:'var(--font-display)', letterSpacing:'0.02em',
            minWidth:'26px', textAlign:'center',
          }}>
            {String(v).padStart(2,'0')}
          </span>
          {i < 2 && <span style={{ color:'#888', fontSize:'11px', fontWeight:600 }}>:</span>}
        </span>
      ))}
      <span style={{ fontSize:'10px', color:urgent?'#E03020':'#888', marginLeft:'2px', fontFamily:'var(--font-display)' }}>
        restant
      </span>
    </div>
  )
}

export function DailyHub() {
  const [done, setDone]           = useState<number[]>(MISSIONS.filter(m=>m.done).map(m=>m.id))
  const [dismissed, setDismissed] = useState(false)
  const [xpAnim, setXpAnim]       = useState(false)
  const [particles, setParticles] = useState<{id:number;x:number;y:number;xp:number}[]>([])
  const particleRef               = useRef(0)

  const xpPct    = Math.round((USER.xp/USER.xpNext)*100)
  const xpEarned = MISSIONS.filter(m=>done.includes(m.id)).reduce((a,m)=>a+m.xp,0)
  const today    = new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})
  const sinceLastVisit = '3 heures'
  const portfolioGainSinceVisit = '+€ 340'

  const toggleMission = (id:number, xp:number, e:React.MouseEvent) => {
    const isDone = done.includes(id)
    if (!isDone) {
      // XP particle animation
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const pid  = ++particleRef.current
      setParticles(prev => [...prev, { id:pid, x:rect.right-20, y:rect.top-10, xp }])
      setTimeout(() => setParticles(prev => prev.filter(p=>p.id!==pid)), 1200)
      setXpAnim(true)
      setTimeout(() => setXpAnim(false), 600)
    }
    setDone(prev => isDone ? prev.filter(i=>i!==id) : [...prev, id])
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatXP { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-40px)} }
        @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes xpBump  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes fadeSlide{ from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        .hub-indices { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:22px; }
        .hub-grid    { display:grid; grid-template-columns:1.15fr 0.85fr; gap:18px; }
        .hub-col-right{ display:flex; flex-direction:column; gap:16px; }
        .hub-row2    { display:grid; grid-template-columns:1.1fr 1fr; gap:16px; margin-top:18px; }
        @media(max-width:1200px){ .hub-grid{ grid-template-columns:1fr; } .hub-row2{ grid-template-columns:1fr; } }
        @media(max-width:800px) { .hub-indices{ grid-template-columns:repeat(2,1fr); } }
        .mover-row:hover   { background:#F8F8F8 !important; }
        .mission-row:hover { border-color:#D4D4D4 !important; }
        .heatcell:hover    { opacity:0.8; transform:scale(1.04); }
        .xp-particle { position:fixed; pointer-events:none; font-size:13px; font-weight:700; color:#E03020; font-family:var(--font-display); z-index:9999; animation:floatXP 1.1s ease-out forwards; }
        .btn-blk:hover { opacity:0.88; }
        .whale-row:hover { background:#F8F8F8 !important; }
      `}</style>

      {/* XP Particles */}
      {particles.map(p => (
        <div key={p.id} className="xp-particle" style={{ left:p.x, top:p.y }}>+{p.xp} XP</div>
      ))}

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        {/* ── HEADER ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'20px', flexWrap:'wrap', gap:'14px' }}>
          <div>
            <p style={{ fontSize:'10px', color:'#888', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>{today}</p>
            <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:'0 0 5px' }}>
              Bonjour, {USER.name} 👋
            </h1>
            {/* Since last visit */}
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ fontSize:'12px', color:'#888' }}>Depuis ta dernière visite ({sinceLastVisit}) :</span>
              <span style={{ fontSize:'12px', fontWeight:500, color:'#2E9E6A', background:'#F0FFF6', border:'1px solid #AAEEC8', padding:'1px 8px', borderRadius:'6px', fontFamily:'var(--font-display)' }}>
                Portfolio {portfolioGainSinceVisit}
              </span>
              <span style={{ fontSize:'12px', fontWeight:500, color:'#E03020', background:'#FFF0EE', border:'1px solid #FFD8D0', padding:'1px 8px', borderRadius:'6px', fontFamily:'var(--font-display)' }}>
                3 nouvelles alertes
              </span>
            </div>
          </div>

          <div style={{ display:'flex', gap:'10px', alignItems:'center', flexShrink:0 }}>
            {/* Streak + calendar */}
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', padding:'10px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                <div>
                  <div style={{ fontSize:'22px', lineHeight:1 }}>🔥</div>
                  <div style={{ fontSize:'18px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', lineHeight:1 }}>{USER.streak}</div>
                  <div style={{ fontSize:'9px', color:'#888', letterSpacing:'0.06em', textTransform:'uppercase' }}>Streak</div>
                </div>
                <div style={{ display:'flex', gap:'4px', alignItems:'flex-end' }}>
                  {STREAK_DAYS.map((d,i) => (
                    <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3px' }}>
                      <div style={{ width:'22px', height:'22px', borderRadius:'6px', background: d.done ? '#E03020' : '#F0F0F0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', color: d.done ? '#fff' : '#BBB' }}>
                        {d.done ? '✓' : ''}
                      </div>
                      <span style={{ fontSize:'8px', color:'#BBB', fontFamily:'var(--font-display)' }}>{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Level + XP */}
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', padding:'12px 16px', minWidth:'160px', animation: xpAnim ? 'xpBump 0.4s ease' : 'none' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                <span style={{ fontSize:'12px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)' }}>Niveau {USER.level}</span>
                <span style={{ fontSize:'9px', color:'#888' }}>{USER.xp.toLocaleString()} / {USER.xpNext.toLocaleString()} XP</span>
              </div>
              <Bar value={xpPct} color="linear-gradient(90deg,#E03020,#FF6B35)" />
              <div style={{ fontSize:'10px', color:'#2E9E6A', marginTop:'5px', fontWeight:500 }}>+{xpEarned} XP aujourd'hui</div>
            </div>
          </div>
        </div>

        {/* ── INDICES ── */}
        <div className="hub-indices">
          {INDICES.map(idx => (
            <div key={idx.label} style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'12px', padding:'14px 16px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:'2.5px', background:idx.color, borderRadius:'12px 12px 0 0' }} />
              <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'7px' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:idx.color }} />
                <span style={{ fontSize:'9px', color:'#888', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:'var(--font-display)' }}>{idx.label}</span>
              </div>
              <div style={{ fontSize:'22px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1, marginBottom:'5px' }}>
                {idx.prefix??''}{idx.value}
              </div>
              <div style={{ fontSize:'11px', fontWeight:500, color: idx.change>=0 ? '#2E9E6A' : '#E03020' }}>
                {idx.change>=0?'▲':'▼'} {Math.abs(idx.change)}% aujourd'hui
              </div>
            </div>
          ))}
        </div>

        {/* ── GRID PRINCIPALE ── */}
        <div className="hub-grid">

          {/* COL GAUCHE */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

            {/* DAILY ALPHA */}
            <div>
              <SecTitle action={<Countdown seconds={DAILY_ALPHA.expiresIn} />}>Daily Alpha Signal</SecTitle>
              {!dismissed ? (
                <Card variant="signal" padding="none">
                  <div style={{ padding:'16px 16px 14px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                        <span style={{ background:'linear-gradient(135deg,#FFD700,#FF8C00)', color:'#fff', fontSize:'10px', fontWeight:600, padding:'3px 11px', borderRadius:'20px', boxShadow:'0 2px 8px rgba(255,160,0,0.3)', fontFamily:'var(--font-display)', animation:'float 3s ease-in-out infinite', display:'inline-block' }}>Tier {DAILY_ALPHA.tier}</span>
                        <span style={{ fontSize:'10px', color:'#888' }}>#{DAILY_ALPHA.id}</span>
                      </div>
                      <span style={{ fontSize:'10px', color:'#888' }}>{DAILY_ALPHA.confidence}% conf.</span>
                    </div>
                    <div style={{ display:'flex', gap:'12px', marginBottom:'14px' }}>
                      <div style={{ width:'56px', height:'76px', flexShrink:0, borderRadius:'8px', background:'linear-gradient(145deg,#FFF5F0,#FFE8DC)', border:'1.5px solid #F5D0C0', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'4px', boxShadow:'0 4px 12px rgba(200,80,60,0.15)' }}>
                        <span style={{ fontSize:'18px', color:'#FFD700' }}>★</span>
                        <span style={{ fontSize:'6px', background:'#FF6B35', color:'#fff', padding:'1px 5px', borderRadius:'2px', fontWeight:700 }}>FIRE</span>
                        <span style={{ fontSize:'6px', color:'#B8998A', textAlign:'center', lineHeight:1.3 }}>Alt Art</span>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'15px', fontWeight:500, color:'#111', marginBottom:'6px', fontFamily:'var(--font-display)' }}>{DAILY_ALPHA.name}</div>
                        <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', marginBottom:'10px' }}>
                          <Badge variant="energy-fire">Fire</Badge>
                          <Badge variant="tier-a">Alt Art</Badge>
                          <Badge variant="green">PSA {DAILY_ALPHA.lang}</Badge>
                        </div>
                        <div style={{ display:'flex', alignItems:'baseline', gap:'8px', marginBottom:'3px' }}>
                          <span style={{ fontSize:'28px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-1px', lineHeight:1 }}>€ {DAILY_ALPHA.price.toLocaleString('fr-FR')}</span>
                          <span style={{ fontSize:'14px', fontWeight:500, color:'#2E9E6A' }}>+{DAILY_ALPHA.pct}%</span>
                        </div>
                        <div style={{ fontSize:'10px', color:'#888' }}>Marché · € {DAILY_ALPHA.market.toLocaleString('fr-FR')} · Cible € {DAILY_ALPHA.target.toLocaleString('fr-FR')}</div>
                      </div>
                    </div>
                    {[
                      { label:'Tier score', value:90, color:'linear-gradient(90deg,#FFD700,#FF8C00)', d:'S'    },
                      { label:'Confiance',  value:72, color:'linear-gradient(90deg,#42A5F5,#26C6DA)', d:'72%' },
                      { label:'PSA Pop',    value:62, color:'linear-gradient(90deg,#C855D4,#7C4DFF)', d:'312' },
                    ].map(s => (
                      <div key={s.label} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                        <span style={{ fontSize:'9px', color:'#B8998A', width:'54px', flexShrink:0 }}>{s.label}</span>
                        <div style={{ flex:1, height:'4px', background:'#F5EDE8', borderRadius:'99px', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${s.value}%`, background:s.color, borderRadius:'99px' }} />
                        </div>
                        <span style={{ fontSize:'9px', fontWeight:500, color:'#111', width:'28px', textAlign:'right' }}>{s.d}</span>
                      </div>
                    ))}
                    <div style={{ background:'#FFF8F5', borderRadius:'8px', padding:'10px 12px', margin:'12px 0', borderLeft:'2px solid #E03020' }}>
                      <p style={{ fontSize:'11px', color:'#5A3A2A', lineHeight:1.7, margin:0 }}>{DAILY_ALPHA.reason}</p>
                    </div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      <button className="btn-blk" style={{ flex:1, padding:'10px', borderRadius:'8px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'opacity 0.15s' }}>Voir le signal complet</button>
                      <button onClick={()=>setDismissed(true)} style={{ padding:'10px 14px', borderRadius:'8px', background:'transparent', color:'#888', border:'1px solid #EBEBEB', fontSize:'12px', cursor:'pointer', fontFamily:'var(--font-display)' }}>Ignorer</button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card padding="lg">
                  <div style={{ textAlign:'center', padding:'20px 0' }}>
                    <div style={{ fontSize:'28px', marginBottom:'8px' }}>✓</div>
                    <p style={{ fontSize:'13px', color:'#888', margin:0 }}>Signal du jour ignoré</p>
                    <button onClick={()=>setDismissed(false)} style={{ marginTop:'10px', fontSize:'11px', color:'#E03020', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:500 }}>Restaurer</button>
                  </div>
                </Card>
              )}
            </div>

            {/* WHALE ALERTS */}
            <div>
              <SecTitle>Whale alerts · Live</SecTitle>
              <Card padding="none">
                {WHALE_ALERTS.map((w,i) => (
                  <div key={w.name} className="whale-row" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px', borderBottom: i<WHALE_ALERTS.length-1 ? '1px solid #F5F5F5' : 'none', cursor:'pointer', transition:'background 0.1s' }}>
                    <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:`linear-gradient(135deg,${w.color}22,${w.color}44)`, border:`1px solid ${w.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:w.color, flexShrink:0, fontFamily:'var(--font-display)' }}>
                      {w.name.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
                        <span style={{ fontSize:'12px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)' }}>{w.name}</span>
                        <span style={{ fontSize:'8px', fontWeight:600, background:'#111', color:'#fff', padding:'1px 5px', borderRadius:'3px', letterSpacing:'0.04em' }}>{w.rank}</span>
                      </div>
                      <div style={{ fontSize:'11px', color:'#888' }}>Achat · {w.card} · {w.time}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#2E9E6A', fontFamily:'var(--font-display)' }}>{w.amount}</div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>

          </div>

          {/* COL DROITE */}
          <div className="hub-col-right">

            {/* DEXY CARD */}
            <div>
              <SecTitle>Dexy AI · Briefing du jour</SecTitle>
              <Card padding="md" style={{ borderLeft:'2.5px solid #E03020' }}>
                <div style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
                  <div style={{ width:'34px', height:'34px', borderRadius:'10px', flexShrink:0, background:'linear-gradient(135deg,#FF7A5A,#E03020)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'13px', fontWeight:700 }}>D</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'7px' }}>
                      <span style={{ fontSize:'12px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)' }}>Dexy AI</span>
                      <span style={{ fontSize:'9px', color:'#BBB' }}>{DEXY_CARD.time}</span>
                    </div>
                    <p style={{ fontSize:'12px', color:'#5A3A2A', lineHeight:1.7, margin:'0 0 10px' }}>{DEXY_CARD.text}</p>
                    {/* Tip du jour */}
                    <div style={{ background:'#FFFDE0', border:'1px solid #FFE87A', borderRadius:'7px', padding:'7px 10px', marginBottom:'10px' }}>
                      <span style={{ fontSize:'10px', fontWeight:600, color:'#B8960A', fontFamily:'var(--font-display)' }}>💡 Tip · </span>
                      <span style={{ fontSize:'10px', color:'#8B7000' }}>{DEXY_CARD.tip}</span>
                    </div>
                    <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                      {DEXY_CARD.tags.map(tag => (
                        <span key={tag} style={{ fontSize:'9px', background:'#FFF5F0', color:'#C84B00', border:'1px solid #FFD0B8', padding:'2px 7px', borderRadius:'10px', fontFamily:'var(--font-display)' }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* MISSIONS */}
            <div>
              <SecTitle action={<span style={{ fontSize:'10px', color:'#2E9E6A', fontFamily:'var(--font-display)', fontWeight:600, flexShrink:0 }}>{done.length}/{MISSIONS.length} · +{xpEarned} XP</span>}>Missions du jour</SecTitle>
              <Card padding="md">
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {MISSIONS.map(mission => {
                    const isDone = done.includes(mission.id)
                    const pct   = Math.round((mission.progress/mission.total)*100)
                    return (
                      <div key={mission.id} className="mission-row" onClick={(e)=>toggleMission(mission.id, mission.xp, e)} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'9px', background:isDone?'#F5FFF9':'#FAFAFA', border:`1px solid ${isDone?'#AAEEC8':'#EBEBEB'}`, cursor:'pointer', transition:'all 0.15s', animation: isDone ? 'fadeSlide 0.2s ease-out' : 'none' }}>
                        <div style={{ width:'20px', height:'20px', borderRadius:'6px', border:`2px solid ${isDone?'#2E9E6A':'#D4D4D4'}`, background:isDone?'#2E9E6A':'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s', color:'#fff', fontSize:'11px', fontWeight:700 }}>
                          {isDone?'✓':''}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'12px', fontWeight:isDone?400:500, color:isDone?'#888':'#111', fontFamily:'var(--font-display)', textDecoration:isDone?'line-through':'none', marginBottom:!isDone?'5px':0 }}>{mission.label}</div>
                          {!isDone && (
                            <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                              <Bar value={pct} color="#E03020" />
                              <span style={{ fontSize:'9px', color:'#888', whiteSpace:'nowrap' }}>{mission.progress}/{mission.total}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize:'9px', fontWeight:600, background:isDone?'#E0FFF0':'#FFF0EE', color:isDone?'#2E9E6A':'#E03020', border:`1px solid ${isDone?'#AAEEC8':'#FFD8D0'}`, padding:'2px 8px', borderRadius:'8px', flexShrink:0, fontFamily:'var(--font-display)' }}>+{mission.xp} XP</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop:'12px', paddingTop:'10px', borderTop:'1px solid #EBEBEB' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                    <span style={{ fontSize:'10px', color:'#888' }}>{done.length} / {MISSIONS.length} missions</span>
                    <span style={{ fontSize:'10px', fontWeight:600, color:'#E03020' }}>+{xpEarned} XP</span>
                  </div>
                  <Bar value={Math.round((done.length/MISSIONS.length)*100)} color="linear-gradient(90deg,#E03020,#FF6B35)" />
                </div>
              </Card>
            </div>

            {/* TOP MOVERS */}
            <div>
              <SecTitle>Top Movers · 24h</SecTitle>
              <Card padding="none">
                {MOVERS.map((m,i) => (
                  <div key={m.name} className="mover-row" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', borderBottom:i<MOVERS.length-1?'1px solid #F5F5F5':'none', cursor:'pointer', transition:'background 0.1s' }}>
                    <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:m.color, flexShrink:0 }} />
                    <span style={{ flex:1, fontSize:'12px', color:'#111', fontFamily:'var(--font-display)' }}>{m.name}</span>
                    <span style={{ fontSize:'12px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.2px' }}>{m.price}</span>
                    <span style={{ fontSize:'11px', fontWeight:600, color:m.change>=0?'#2E9E6A':'#E03020', minWidth:'44px', textAlign:'right' }}>{m.change>=0?'▲':'▼'} {Math.abs(m.change)}%</span>
                  </div>
                ))}
              </Card>
            </div>

          </div>
        </div>

        {/* ── ROW 2 — HEATMAP + ALPHA SCORE ── */}
        <div className="hub-row2">

          {/* MARKET HEATMAP */}
          <div>
            <SecTitle>Market heatmap · 24h</SecTitle>
            <Card padding="md">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'6px' }}>
                {HEATMAP.map(cell => {
                  const s = heatColor(cell.pct) as any
                  return (
                    <div key={cell.name} className="heatcell" style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:'8px', padding:'8px 6px', textAlign:'center', cursor:'pointer', transition:'all 0.15s' }}>
                      <div style={{ fontSize:'10px', fontWeight:500, color:s.text, fontFamily:'var(--font-display)', marginBottom:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cell.name}</div>
                      <div style={{ fontSize:'11px', fontWeight:600, color:s.text, fontFamily:'var(--font-display)' }}>
                        {cell.pct>=0?'+':''}{cell.pct}%
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* ALPHA SCORE PERSONNEL */}
          <div>
            <SecTitle>Ton Alpha Score</SecTitle>
            <Card padding="md">
              <div style={{ textAlign:'center', paddingBottom:'12px', borderBottom:'1px solid #F0F0F0', marginBottom:'14px' }}>
                <div style={{ fontSize:'52px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-2px', lineHeight:1, marginBottom:'4px' }}>
                  742
                </div>
                <div style={{ fontSize:'11px', color:'#888' }}>Score personnel · Semaine en cours</div>
                <div style={{ display:'inline-flex', alignItems:'center', gap:'5px', marginTop:'6px', background:'#F0FFF6', border:'1px solid #AAEEC8', padding:'3px 10px', borderRadius:'20px' }}>
                  <span style={{ fontSize:'11px', fontWeight:500, color:'#2E9E6A', fontFamily:'var(--font-display)' }}>▲ +42 depuis lundi</span>
                </div>
              </div>
              {[
                { label:'Signaux consultés',  value:72, display:'72%', color:'#E03020' },
                { label:'Missions complétées',value:50, display:'2/4',  color:'#FF8C00' },
                { label:'Deals cliqués',      value:30, display:'3',    color:'#42A5F5' },
                { label:'Portfolio actif',    value:85, display:'85%', color:'#2E9E6A' },
              ].map(s => (
                <div key={s.label} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                  <span style={{ fontSize:'10px', color:'#888', width:'120px', flexShrink:0, fontFamily:'var(--font-display)' }}>{s.label}</span>
                  <Bar value={s.value} color={s.color} />
                  <span style={{ fontSize:'10px', fontWeight:500, color:'#111', width:'28px', textAlign:'right', fontFamily:'var(--font-display)' }}>{s.display}</span>
                </div>
              ))}
            </Card>
          </div>

        </div>

      </div>
    </>
  )
}
