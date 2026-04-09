'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

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

export function DailyHub() {
  const router = useRouter()
  const [done, setDone] = useState<number[]>(MISSIONS.filter(m=>m.done).map(m=>m.id))
  const [dismissed, setDismissed] = useState(false)
  const [particles, setParticles] = useState<{id:number;x:number;y:number;xp:number}[]>([])
  const [xpAnim, setXpAnim] = useState(false)
  const [dexyOpen, setDexyOpen] = useState(false)
  const pidRef = useRef(0)

  const isPro = USER.plan === 'pro'
  const xpPct = Math.round((USER.xp/USER.xpNext)*100)
  const xpEarned = MISSIONS.filter(m=>done.includes(m.id)).reduce((a,m)=>a+m.xp,0)
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
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes floatXP{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-44px)}}
        @keyframes xpBump{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
        @keyframes grow{from{width:0}}
        .xp-particle{position:fixed;pointer-events:none;font-size:13px;font-weight:700;color:#E03020;font-family:var(--font-display);z-index:9999;animation:floatXP 1.1s ease-out forwards}
        .hub-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        @media(max-width:1000px){.hub-grid{grid-template-columns:1fr} .qa-grid{grid-template-columns:repeat(2,1fr) !important}}
        .w{background:#fff;border:1px solid #EBEBEB;border-radius:12px;overflow:hidden;animation:fadeUp .3s ease-out both}
        .w:nth-child(2){animation-delay:.04s}.w:nth-child(3){animation-delay:.08s}.w:nth-child(4){animation-delay:.12s}
        .wh{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 0}
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
            <div className="stat-pill">
              <span style={{ fontSize:16 }}>{'\ud83d\udd25'}</span>
              <span style={{ fontSize:16, letterSpacing:'-.5px' }}>{USER.streak}</span>
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
                  <span style={{ fontSize:11, color:'#BBB', fontFamily:'var(--font-display)' }}>#{DAILY_ALPHA.id} {'\u00b7'} {DAILY_ALPHA.watching.toLocaleString()} regardent</span>
                </div>
                <div style={{ fontSize:20, fontWeight:600, color:'#111', fontFamily:'var(--font-display)', margin:'8px 0 6px', letterSpacing:'-.3px' }}>{DAILY_ALPHA.name}</div>
                <div style={{ fontSize:12, color:'#888', lineHeight:1.6, maxWidth:420 }}>{DAILY_ALPHA.reason}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:32, fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-1.5px', lineHeight:1 }}>{'\u20ac'} {DAILY_ALPHA.price.toLocaleString()}</div>
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

          {/* ── COL GAUCHE : TOI ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Portfolio */}
            <div className="w">
              <div className="wh"><div className="wt"><div className="bar"/>Mon portfolio</div><span className="wb wb-g">+{'\u20ac'} {USER.portfolioGain} aujourd'hui</span></div>
              <div className="wc">
                <div style={{ fontSize:28, fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-1px', marginBottom:2 }}>{USER.portfolioValue.toLocaleString()} {'\u20ac'}</div>
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

            {/* Collections */}
            <div className="w">
              <div className="wh"><div className="wt"><div className="bar"/>Mes collections</div><span className="wb">{COLLECTIONS.length} en cours</span></div>
              <div className="wc">
                {COLLECTIONS.map((s,i)=>{
                  const pct=Math.round((s.owned/s.total)*100)
                  return (
                    <div key={i} className="row" style={{ cursor:'pointer' }} onClick={()=>router.push('/cartes')}>
                      <ProgressCircle pct={pct} color={s.color} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:500, fontFamily:'var(--font-display)' }}>{s.name}</div>
                        <div style={{ fontSize:11, color:'#BBB' }}>{s.owned} / {s.total} cartes</div>
                      </div>
                      <div style={{ fontSize:11, color:pct>=75?'#1D9E75':'#888', fontWeight:500, fontFamily:'var(--font-display)' }}>{s.total-s.owned} manquantes</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Missions */}
            <div className="w">
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
                <div style={{ marginTop:12 }}>
                  <Bar value={missionPct} color="linear-gradient(90deg,#E03020,#FF8C00)" h={4} />
                </div>
              </div>
            </div>

            {/* Reprendre */}
            <div className="w">
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
          </div>

          {/* ── COL DROITE : LE MARCH{'\u00c9'} ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Dexy */}
            <div className="w" style={{ borderLeft:'3px solid #E03020', borderRadius:'0 12px 12px 0' }}>
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
                  {DEXY.tags.map(t=>(
                    <span key={t} style={{ fontSize:10, background:'#FEF2F2', color:'#993C1D', padding:'2px 8px', borderRadius:6, fontFamily:'var(--font-display)' }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Movers */}
            <div className="w">
              <div className="wh"><div className="wt"><div className="bar"/>Top movers</div><span className="wb">24h</span></div>
              <div className="wc">
                {MOVERS.map((m,i)=>(
                  <div key={i} className="row">
                    <div className="dot" style={{ background:m.color }}/>
                    <span className="rn">{m.name}</span>
                    <span className="rv">{m.price}</span>
                    <span className={'rp '+(m.change>=0?'up':'dn')}>{m.change>=0?'\u25b2':'\u25bc'} {Math.abs(m.change)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Whale Tracker */}
            <div className="w">
              <div className="wh">
                <div className="wt"><div className="bar"/>Whale tracker</div>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div className="dot" style={{ background:'#1D9E75', animation:'pulse 2s infinite' }}/>
                  <span className="wb">Live</span>
                </div>
              </div>
              <div className="wc">
                {WHALE_FEED.map((w,i)=>(
                  <div key={i} className="row">
                    <div className="whale-av" style={{ background:w.bg, color:w.fg, border:`1px solid ${w.border}` }}>{w.initials}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500, fontFamily:'var(--font-display)' }}>{w.name}</div>
                      <div style={{ fontSize:11, color:'#BBB' }}>Achet{'\u00e9'} {w.card} {'\u00b7'} {w.time}</div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1D9E75', fontFamily:'var(--font-data)' }}>{w.amount}</div>
                  </div>
                ))}
                <div className="row" style={{ opacity:.35 }}>
                  <div className="whale-av" style={{ background:'#F0F0F0', color:'#BBB' }}>??</div>
                  <div style={{ flex:1 }}><div style={{ fontSize:13 }}>Mouvement masqu{'\u00e9'}</div><div style={{ fontSize:11, color:'#BBB' }}>Visible avec Pro</div></div>
                  <div style={{ fontSize:13, color:'#BBB' }}>{'\u00b7\u00b7\u00b7'}</div>
                </div>
                {!isPro && (
                  <div style={{ paddingTop:8, borderTop:'1px solid #F5F5F5', display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:4 }}>
                    <span style={{ fontSize:11, color:'#BBB' }}>1 mouvement masqu{'\u00e9'}</span>
                    <span style={{ fontSize:11, fontWeight:600, color:'#E03020', cursor:'pointer', fontFamily:'var(--font-display)' }}>Voir avec Pro {'\u2192'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Deals — Pro Gate */}
            <div className="w" style={{ position:'relative', overflow:'hidden' }}>
              <div className="wh"><div className="wt"><div className="bar"/>Deals du moment</div><span className="wb">{DEALS.length} sous march{'\u00e9'}</span></div>
              {isPro ? (
                <div className="wc">
                  {DEALS.map((d,i)=>(
                    <div key={i} className="row">
                      <span className="rn">{d.name}</span>
                      <span className="rv">{d.price}</span>
                      <span className="rp up">-{d.discount}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="wc" style={{ filter:'blur(2px)', pointerEvents:'none', userSelect:'none', opacity:.6 }}>
                    {DEALS.map((d,i)=>(
                      <div key={i} className="row">
                        <span className="rn">{d.name}</span>
                        <span className="rv">{d.price}</span>
                        <span className="rp up">-{d.discount}%</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ position:'absolute', inset:0, top:30, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <div style={{ fontSize:14 }}>{'\ud83d\udd12'}</div>
                    <div style={{ fontSize:12, color:'#888', textAlign:'center', maxWidth:180, lineHeight:1.5 }}>{DEALS.length} deals sous valeur march{'\u00e9'}</div>
                    <button className="btn-dark" style={{ fontSize:12, padding:'8px 18px' }}>D{'\u00e9'}bloquer avec Pro {'\u2192'}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
