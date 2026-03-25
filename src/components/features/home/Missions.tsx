'use client'

import { useState } from 'react'

type Mission = {
  id:       string
  title:    string
  desc:     string
  xp:       number
  icon:     string
  category: 'daily'|'weekly'|'challenge'
  progress: number
  total:    number
  done:     boolean
  locked:   boolean
  reward?:  string
}

const DAILY: Mission[] = [
  { id:'d1', title:'Consulter le Market Terminal',  desc:'Ouvre le terminal marché et consulte les indices du jour.',          xp:50,  icon:'📊', category:'daily',  progress:1, total:1, done:true,  locked:false },
  { id:'d2', title:'Analyser 3 signaux Alpha',       desc:'Ouvre et lis le détail de 3 signaux dans la section Alpha.',         xp:80,  icon:'⚡', category:'daily',  progress:1, total:3, done:false, locked:false },
  { id:'d3', title:'Ajouter une carte au portfolio', desc:'Ajoute ou modifie une carte dans ton portfolio holdings.',           xp:60,  icon:'🃏', category:'daily',  progress:0, total:1, done:false, locked:false },
  { id:'d4', title:'Poser une question à Dexy',      desc:'Utilise Dexy AI pour analyser une carte ou une tendance marché.',   xp:100, icon:'🤖', category:'daily',  progress:0, total:1, done:false, locked:false },
]

const WEEKLY: Mission[] = [
  { id:'w1', title:'7 jours de streak',              desc:'Connecte-toi 7 jours consécutifs pour maintenir ton streak.',        xp:300, icon:'🔥', category:'weekly', progress:5, total:7, done:false, locked:false, reward:'Badge Flame' },
  { id:'w2', title:'Analyser 10 cartes en détail',   desc:'Consulte le panel détail de 10 cartes différentes dans Encyclopédie.',xp:200, icon:'🔍', category:'weekly', progress:3, total:10,done:false, locked:false },
  { id:'w3', title:'Sauvegarder 5 deals',            desc:'Sauvegarde 5 deals dans le Deal Hunter.',                           xp:250, icon:'❤️', category:'weekly', progress:2, total:5, done:false, locked:true  },
  { id:'w4', title:'Compléter ton portfolio',        desc:'Ajoute au moins 10 cartes dans ton portfolio.',                     xp:400, icon:'🏆', category:'weekly', progress:12,total:10,done:true,  locked:false, reward:'Badge Collector' },
]

const CHALLENGES: Mission[] = [
  { id:'c1', title:'Premier signal S',               desc:'Accède à un signal de Tier S et consulte son analyse complète.',    xp:500, icon:'⭐', category:'challenge', progress:0, total:1, done:false, locked:true,  reward:'Badge Alpha S' },
  { id:'c2', title:'Portfolio > €1 000',             desc:'Atteins une valeur totale de portefeuille supérieure à €1 000.',    xp:1000,icon:'💎', category:'challenge', progress:1, total:1, done:true,  locked:false, reward:'Badge Investisseur' },
  { id:'c3', title:'Whale Watcher',                  desc:'Suis tous les mouvements d\'une baleine pendant 7 jours.',          xp:750, icon:'🐋', category:'challenge', progress:0, total:7, done:false, locked:true  },
  { id:'c4', title:'Encyclopédie — 50 cartes',       desc:'Consulte 50 cartes différentes dans l\'encyclopédie TCG.',         xp:600, icon:'📚', category:'challenge', progress:18,total:50,done:false, locked:false },
]

const TOTAL_XP    = 1240
const LEVEL       = Math.floor(TOTAL_XP / 500) + 1
const XP_IN_LEVEL = TOTAL_XP % 500
const STREAK      = 7

const BADGES = [
  { icon:'💎', label:'Investisseur',  earned:true  },
  { icon:'🏆', label:'Collector',     earned:true  },
  { icon:'🔥', label:'Flame x7',      earned:false },
  { icon:'⭐', label:'Alpha S',       earned:false },
  { icon:'🐋', label:'Whale Watcher', earned:false },
  { icon:'📚', label:'Encyclopédiste',earned:false },
]

function MissionCard({ m }: { m: Mission }) {
  const pct    = Math.min(m.progress / m.total * 100, 100)
  const barClr = m.done ? '#2E9E6A' : m.locked ? '#CCC' : '#E03020'

  return (
    <div style={{ background:m.done?'#F5FFF9':'#fff', border:`1px solid ${m.done?'#AAEEC8':m.locked?'#F0F0F0':'#EBEBEB'}`, borderRadius:'14px', padding:'16px', opacity:m.locked?0.55:1, position:'relative', transition:'all 0.15s' }}>
      {m.done && <div style={{ position:'absolute', top:'12px', right:'12px', fontSize:'16px' }}>✅</div>}
      {m.locked && <div style={{ position:'absolute', top:'12px', right:'12px', fontSize:'14px' }}>🔒</div>}

      <div style={{ display:'flex', alignItems:'flex-start', gap:'12px', marginBottom:'12px' }}>
        <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:m.done?'#E0F7EA':m.locked?'#F5F5F5':'#FFF0EE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>
          {m.icon}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'13px', fontWeight:600, color:m.locked?'#AAA':'#111', fontFamily:'var(--font-display)', marginBottom:'3px' }}>{m.title}</div>
          <div style={{ fontSize:'11px', color:'#AAA', lineHeight:1.5 }}>{m.desc}</div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:m.done?'#2E9E6A':'#888', fontFamily:'var(--font-display)' }}>+{m.xp} XP</div>
          {m.reward && <div style={{ fontSize:'9px', color:'#8B6E00', background:'#FFFDE0', border:'1px solid #FFE87A', padding:'1px 6px', borderRadius:'4px', fontFamily:'var(--font-display)', marginTop:'2px', whiteSpace:'nowrap' as const }}>{m.reward}</div>}
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <div style={{ flex:1, height:'5px', background:'#F0F0F0', borderRadius:'99px', overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:barClr, borderRadius:'99px', transition:'width 0.5s ease' }} />
        </div>
        <span style={{ fontSize:'10px', color:'#888', fontFamily:'var(--font-display)', flexShrink:0 }}>{m.progress}/{m.total}</span>
      </div>
    </div>
  )
}

export function Missions() {
  const [tab, setTab] = useState<'daily'|'weekly'|'challenge'>('daily')

  const lists: Record<string, Mission[]> = { daily:DAILY, weekly:WEEKLY, challenge:CHALLENGES }
  const current = lists[tab]
  const doneCount = current.filter(m=>m.done).length
  const totalXp   = current.filter(m=>!m.done&&!m.locked).reduce((s,m)=>s+m.xp,0)

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes xpFill { from{width:0} to{width:var(--w)} }
        .tab-btn { padding:7px 16px; border-radius:8px; border:none; background:transparent; color:#666; font-size:12px; font-weight:500; cursor:pointer; font-family:var(--font-display); transition:all 0.12s; }
        .tab-btn:hover { background:#F0F0F0; }
        .tab-btn.on { background:#111 !important; color:#fff !important; }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'22px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Home</p>
            <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:0 }}>Missions</h1>
          </div>
          <div style={{ display:'flex', gap:'3px', background:'#F5F5F5', borderRadius:'9px', padding:'3px' }}>
            {([['daily','Quotidiennes'],['weekly','Hebdomadaires'],['challenge','Défis']] as ['daily'|'weekly'|'challenge',string][]).map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} className={`tab-btn${tab===k?' on':''}`}>{l}</button>
            ))}
          </div>
        </div>

        {/* Profil XP */}
        <div style={{ background:'linear-gradient(135deg,#111,#1A1208)', borderRadius:'18px', padding:'24px 28px', marginBottom:'22px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 80% 50%, rgba(255,107,53,0.1) 0%, transparent 50%)', pointerEvents:'none' }} />
          <div style={{ display:'flex', alignItems:'center', gap:'20px', flexWrap:'wrap', position:'relative' }}>

            {/* Level */}
            <div style={{ width:'64px', height:'64px', borderRadius:'16px', background:'linear-gradient(135deg,#E03020,#FF6644)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 16px rgba(224,48,32,0.4)' }}>
              <div style={{ fontSize:'8px', color:'rgba(255,255,255,0.7)', fontFamily:'var(--font-display)', letterSpacing:'0.1em' }}>LVL</div>
              <div style={{ fontSize:'22px', fontWeight:800, color:'#fff', fontFamily:'var(--font-display)', lineHeight:1 }}>{LEVEL}</div>
            </div>

            {/* XP bar */}
            <div style={{ flex:1, minWidth:'180px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                <span style={{ fontSize:'14px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)' }}>{TOTAL_XP.toLocaleString('fr-FR')} XP</span>
                <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', fontFamily:'var(--font-display)' }}>→ Niveau {LEVEL+1} dans {500-XP_IN_LEVEL} XP</span>
              </div>
              <div style={{ height:'8px', background:'rgba(255,255,255,0.1)', borderRadius:'99px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${XP_IN_LEVEL/500*100}%`, background:'linear-gradient(90deg,#E03020,#FF8C00)', borderRadius:'99px', transition:'width 0.6s ease' }} />
              </div>
              <div style={{ display:'flex', gap:'16px', marginTop:'10px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                  <span style={{ fontSize:'14px' }}>🔥</span>
                  <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.7)', fontFamily:'var(--font-display)' }}>{STREAK} jours de streak</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                  <span style={{ fontSize:'14px' }}>⚡</span>
                  <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.7)', fontFamily:'var(--font-display)' }}>{totalXp} XP disponibles aujourd&apos;hui</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              {BADGES.map(b=>(
                <div key={b.label} title={b.label} style={{ width:'36px', height:'36px', borderRadius:'10px', background:b.earned?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.04)', border:`1px solid ${b.earned?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.06)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px', filter:b.earned?'none':'grayscale(1)', opacity:b.earned?1:0.35 }}>
                  {b.icon}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progression du tab */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
          <div style={{ fontSize:'12px', color:'#888' }}>
            <span style={{ fontWeight:600, color:'#2E9E6A' }}>{doneCount}</span>/{current.length} complétées · <span style={{ fontWeight:600, color:'#E03020' }}>+{totalXp} XP</span> à gagner
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'120px', height:'4px', background:'#F0F0F0', borderRadius:'99px', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${doneCount/current.length*100}%`, background:'linear-gradient(90deg,#E03020,#FF8C00)', borderRadius:'99px', transition:'width 0.5s' }} />
            </div>
            <span style={{ fontSize:'11px', color:'#AAA', fontFamily:'var(--font-display)' }}>{Math.round(doneCount/current.length*100)}%</span>
          </div>
        </div>

        {/* Missions */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:'12px' }}>
          {current.map(m => <MissionCard key={m.id} m={m} />)}
        </div>

      </div>
    </>
  )
}
