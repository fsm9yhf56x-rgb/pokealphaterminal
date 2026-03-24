'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'

type Goal = { id:string; type:'set'|'personal'; label:string; current:number; target:number; unit:string; color:string; deadline?:string }

const GOALS: Goal[] = [
  { id:'1', type:'set',      label:'Compléter SV151',                  current:142, target:165,  unit:'cartes',     color:'#FF6B35', deadline:'Juin 2026'   },
  { id:'2', type:'set',      label:'Compléter Evolving Skies Alt Arts', current:6,   target:10,   unit:'Alt Art',    color:'#C855D4', deadline:'Août 2026'   },
  { id:'3', type:'personal', label:'Atteindre € 75,000 de portfolio',  current:54280,target:75000,unit:'€',         color:'#2E9E6A', deadline:'Déc. 2026'   },
  { id:'4', type:'personal', label:'Obtenir 3 cartes PSA 10',          current:1,   target:3,    unit:'PSA 10',     color:'#FFD700', deadline:'Sept. 2026'  },
  { id:'5', type:'set',      label:'Compléter Aquapolis Holos',        current:12,  target:32,   unit:'holos',      color:'#42A5F5', deadline:'2027'        },
]

function Bar({ value, color, animated }: { value:number; color:string; animated?:boolean }) {
  return (
    <div style={{ height:'8px', background:'#F0F0F0', borderRadius:'99px', overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${Math.min(value,100)}%`, background:color, borderRadius:'99px', transition: animated ? 'width 1s cubic-bezier(0.34,1.56,0.64,1)' : 'none' }} />
    </div>
  )
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
      <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#E03020', flexShrink:0 }} />
      <span style={{ fontSize:'10px', fontWeight:600, color:'#888', textTransform:'uppercase' as const, letterSpacing:'0.1em', fontFamily:'var(--font-display)' }}>{children}</span>
      <div style={{ flex:1, height:'1px', background:'linear-gradient(90deg,#EBEBEB,transparent)' }} />
    </div>
  )
}

export function Objectifs() {
  const [showNew, setShowNew] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newType, setNewType] = useState<'set'|'personal'>('personal')

  const setGoals      = GOALS.filter(g => g.type === 'set')
  const personalGoals = GOALS.filter(g => g.type === 'personal')

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        .goal-card:hover { border-color:#D4D4D4 !important; }
        .add-btn:hover   { background:#333 !important; }
        .tab-btn:hover   { background:#F0F0F0 !important; }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'22px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <p style={{ fontSize:'10px', color:'#888', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Portfolio</p>
            <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:0 }}>Objectifs</h1>
          </div>
          <button className="add-btn" onClick={() => setShowNew(true)} style={{ padding:'9px 16px', background:'#111', color:'#fff', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'background 0.15s' }}>
            + Nouvel objectif
          </button>
        </div>

        {/* SUMMARY */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'24px' }}>
          {[
            { label:'Objectifs actifs',    value:String(GOALS.length),        sub:'En cours'        },
            { label:'Objectifs complétés', value:'2',                          sub:'Cette année'     },
            { label:'Progression moyenne', value:`${Math.round(GOALS.reduce((s,g)=>s+(g.current/g.target*100),0)/GOALS.length)}%`, sub:'Tous objectifs' },
          ].map((s,i) => (
            <div key={i} style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'12px', padding:'14px 16px' }}>
              <div style={{ fontSize:'9px', color:'#888', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:'var(--font-display)', marginBottom:'6px' }}>{s.label}</div>
              <div style={{ fontSize:'24px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1, marginBottom:'4px' }}>{s.value}</div>
              <div style={{ fontSize:'10px', color:'#888' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* OBJECTIFS SET */}
        <div style={{ marginBottom:'24px' }}>
          <SecTitle>Objectifs de sets</SecTitle>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'12px' }}>
            {setGoals.map(g => {
              const pct = Math.round((g.current/g.target)*100)
              return (
                <div key={g.id} className="goal-card" style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', padding:'16px', transition:'border-color 0.15s', cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'12px' }}>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)', marginBottom:'3px' }}>{g.label}</div>
                      <div style={{ fontSize:'10px', color:'#888' }}>Deadline · {g.deadline}</div>
                    </div>
                    <div style={{ fontSize:'20px', fontWeight:600, color:g.color, fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1 }}>
                      {pct}%
                    </div>
                  </div>
                  <Bar value={pct} color={g.color} animated />
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:'8px' }}>
                    <span style={{ fontSize:'11px', color:'#888' }}>{g.current.toLocaleString('fr-FR')} / {g.target.toLocaleString('fr-FR')} {g.unit}</span>
                    <span style={{ fontSize:'11px', color:'#888' }}>{(g.target-g.current).toLocaleString('fr-FR')} restants</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* OBJECTIFS PERSONNELS */}
        <div>
          <SecTitle>Objectifs personnels</SecTitle>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'12px' }}>
            {personalGoals.map(g => {
              const pct = Math.round((g.current/g.target)*100)
              const fmt = g.unit==='€' ? (v:number) => `€ ${v.toLocaleString('fr-FR')}` : (v:number) => `${v.toLocaleString('fr-FR')} ${g.unit}`
              return (
                <div key={g.id} className="goal-card" style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', padding:'16px', transition:'border-color 0.15s', cursor:'pointer', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:'2.5px', background:g.color, borderRadius:'14px 14px 0 0' }} />
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'14px', paddingTop:'4px' }}>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)', marginBottom:'3px' }}>{g.label}</div>
                      <div style={{ fontSize:'10px', color:'#888' }}>Deadline · {g.deadline}</div>
                    </div>
                    <div style={{ fontSize:'22px', fontWeight:600, color:g.color, fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1 }}>
                      {pct}%
                    </div>
                  </div>
                  <Bar value={pct} color={g.color} animated />
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:'10px' }}>
                    <span style={{ fontSize:'12px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)' }}>{fmt(g.current)}</span>
                    <span style={{ fontSize:'11px', color:'#888' }}>sur {fmt(g.target)}</span>
                  </div>
                </div>
              )
            })}

            {/* Add card */}
            <div onClick={() => setShowNew(true)} style={{ background:'#FAFAFA', border:'2px dashed #E0E0E0', borderRadius:'14px', padding:'16px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px', cursor:'pointer', minHeight:'120px', transition:'border-color 0.15s' }}>
              <div style={{ fontSize:'24px', color:'#CCC' }}>+</div>
              <div style={{ fontSize:'12px', color:'#888', fontFamily:'var(--font-display)' }}>Ajouter un objectif</div>
            </div>
          </div>
        </div>

        {/* MODAL ADD */}
        {showNew && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'#fff', borderRadius:'16px', padding:'24px', width:'360px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize:'16px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', marginBottom:'16px' }}>Nouvel objectif</div>
              <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
                {(['set','personal'] as const).map(t => (
                  <button key={t} className="tab-btn" onClick={() => setNewType(t)} style={{ flex:1, padding:'8px', borderRadius:'8px', border:`1px solid ${newType===t?'#111':'#E8E8E8'}`, background:newType===t?'#111':'#fff', color:newType===t?'#fff':'#666', fontSize:'12px', cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:500, transition:'all 0.12s' }}>
                    {t==='set' ? 'Objectif set' : 'Objectif personnel'}
                  </button>
                ))}
              </div>
              <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Ex: Compléter SV151..." style={{ width:'100%', height:'38px', padding:'0 12px', border:'1px solid #EBEBEB', borderRadius:'8px', fontSize:'13px', marginBottom:'10px', outline:'none', fontFamily:'var(--font-sans)', boxSizing:'border-box' as const }} />
              <input value={newTarget} onChange={e=>setNewTarget(e.target.value)} placeholder="Objectif chiffré..." style={{ width:'100%', height:'38px', padding:'0 12px', border:'1px solid #EBEBEB', borderRadius:'8px', fontSize:'13px', marginBottom:'16px', outline:'none', fontFamily:'var(--font-sans)', boxSizing:'border-box' as const }} />
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => setShowNew(false)} style={{ flex:1, padding:'10px', borderRadius:'8px', background:'#F5F5F5', border:'none', fontSize:'13px', cursor:'pointer', fontFamily:'var(--font-display)', color:'#666' }}>Annuler</button>
                <button onClick={() => setShowNew(false)} style={{ flex:1, padding:'10px', borderRadius:'8px', background:'#111', border:'none', color:'#fff', fontSize:'13px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)' }}>Créer</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
