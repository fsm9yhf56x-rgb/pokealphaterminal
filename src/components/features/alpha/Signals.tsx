'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Signal = {
  id:         string
  name:       string
  set:        string
  type:       string
  tier:       'S'|'A'|'B'
  price:      number
  market:     number
  target:     number
  pct:        number
  conf:       number
  psa?:       number
  reason:     string
  tags:       string[]
  lang:       'EN'|'JP'|'FR'
  source:     string
  expiresIn:  number
  watching:   number
  dismissed?: boolean
}

const SIGNALS_DATA: Signal[] = [
  {
    id:'1', name:'Charizard Alt Art', set:'SV151', type:'fire',
    tier:'S', price:920, market:1240, target:1300, pct:53, conf:72, psa:312,
    reason:"Alt Art extrêmement rare — PSA Pop de seulement 312 exemplaires. Momentum acheteur détecté sur eBay JP et Cardmarket. Le marché JP est en avance de 2-3 semaines sur l'EN.",
    tags:['PSA Pop faible','Momentum JP','Alt Art rare','eBay actif'],
    lang:'EN', source:'eBay', expiresIn:4*3600-18*60, watching:847,
  },
  {
    id:'2', name:'Umbreon VMAX Alt Art', set:'Evolving Skies', type:'dark',
    tier:'A', price:880, market:1020, target:1100, pct:24, conf:68, psa:2840,
    reason:"Set OOP depuis 2022. La demande en Dark type reste structurellement haute. Plusieurs whales ont accumulé cette semaine.",
    tags:['Set OOP','Dark type haussier','Whale accumulation'],
    lang:'EN', source:'CM', expiresIn:8*3600, watching:412,
  },
  {
    id:'3', name:'Rayquaza VMAX Alt Art', set:'Evolving Skies', type:'electric',
    tier:'A', price:740, market:880, target:950, pct:31, conf:74,
    reason:"Gold Star momentum se transfère aux Alt Art Electric. Volume inhabituel détecté. PSA Pop très faible pour ce tier de popularité.",
    tags:['Electric haussier','Volume inhabituel','Set OOP'],
    lang:'EN', source:'eBay', expiresIn:12*3600, watching:298,
  },
  {
    id:'4', name:'Mewtwo V Alt Art', set:'Pokemon GO', type:'psychic',
    tier:'B', price:280, market:320, target:360, pct:28, conf:61,
    reason:"Undervalued vs les autres Alt Art Psychic. Le set Pokemon GO est en réévaluation post-hype. Bon point d'entrée avant la prochaine vague.",
    tags:['Undervalued','Psychic momentum','Point entrée'],
    lang:'JP', source:'CM', expiresIn:24*3600, watching:156,
  },
  {
    id:'5', name:'Lugia Neo Genesis Holo', set:'Neo Genesis', type:'water',
    tier:'A', price:580, market:690, target:750, pct:29, conf:71, psa:2100,
    reason:"Vintage en forte hausse. Neo Genesis est l'un des derniers sets sous-évalués de l'ère Neo. Lugia reste l'icône absolue des collectionneurs vintage.",
    tags:['Vintage','Neo haussier','Icône','PSA 8+ rare'],
    lang:'EN', source:'eBay', expiresIn:36*3600, watching:203,
  },
  {
    id:'6', name:'Espeon VMAX Alt Art', set:'Evolving Skies', type:'psychic',
    tier:'B', price:318, market:380, target:420, pct:19, conf:66,
    reason:"Version JP 24% sous la valeur EN. Spread historiquement élevé — rééquilibrage attendu dans les 30 jours.",
    tags:['JP vs EN spread','Arbitrage','Evolving Skies'],
    lang:'JP', source:'CM', expiresIn:48*3600, watching:89,
  },
]

const EC: Record<string,string> = {
  fire:'#FF6B35', water:'#42A5F5', psychic:'#C855D4',
  dark:'#7E57C2', electric:'#D4A800', grass:'#3DA85A',
}

const TIER_STYLE: Record<string,{bg:string;color:string;border:string;glow:string}> = {
  S: { bg:'linear-gradient(135deg,#FFD700,#FF8C00)', color:'#fff', border:'#FF8C00', glow:'rgba(255,160,0,0.35)' },
  A: { bg:'linear-gradient(135deg,#C855D4,#9C27B0)', color:'#fff', border:'#C855D4', glow:'rgba(200,85,212,0.3)'  },
  B: { bg:'linear-gradient(135deg,#2E9E6A,#1A7A4A)', color:'#fff', border:'#2E9E6A', glow:'rgba(46,158,106,0.3)' },
}

const LS: Record<string,{flag:string;bg:string;color:string;border:string}> = {
  EN: { flag:'🇺🇸', bg:'#FFF5F0', color:'#C84B00', border:'#FFD0B0' },
  JP: { flag:'🇯🇵', bg:'#F0F5FF', color:'#003DAA', border:'#C0D0FF' },
  FR: { flag:'🇫🇷', bg:'#F0FFF5', color:'#00660A', border:'#A0DDAA' },
}

function Timer({ seconds }: { seconds: number }) {
  const h = Math.floor(seconds/3600), m = Math.floor((seconds%3600)/60)
  const urgent = seconds < 3600
  return (
    <span style={{ fontSize:'11px', fontWeight:600, color:urgent?'#E03020':'#888', fontFamily:'var(--font-display)' }}>
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}h
    </span>
  )
}

export function Signals({ isPro = false }: { isPro?: boolean }) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [filter,    setFilter]    = useState<'all'|'S'|'A'|'B'>('all')
  const [expanded,  setExpanded]  = useState<string|null>('1')

  const visible = SIGNALS_DATA.filter(s => {
    if (dismissed.has(s.id)) return false
    if (filter !== 'all' && s.tier !== filter) return false
    return true
  })

  const dismiss = (id: string) => setDismissed(prev => new Set([...prev, id]))
  const restore = (id: string) => setDismissed(prev => { const n=new Set(prev); n.delete(id); return n })

  const free_limit = 1
  const lockedIds  = isPro ? [] : SIGNALS_DATA.filter(s=>!dismissed.has(s.id)).slice(free_limit).map(s=>s.id)

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes expand  { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .sig-row:hover     { background:#FAFAFA !important; }
        .pill              { padding:5px 14px; border-radius:8px; border:1px solid #E8E8E8; background:#fff; color:#666; font-size:12px; font-weight:500; cursor:pointer; font-family:var(--font-display); transition:all 0.12s; }
        .pill:hover        { border-color:#999; }
        .pill.on           { background:#111 !important; color:#fff !important; border-color:#111 !important; }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'22px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Alpha</p>
            <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:'0 0 5px' }}>Signals</h1>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#2E9E6A', animation:'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize:'12px', color:'#888' }}>{SIGNALS_DATA.length} signaux actifs · IA mise à jour en continu</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:'6px' }}>
            {(['all','S','A','B'] as const).map(t=>(
              <button key={t} onClick={()=>setFilter(t)} className={`pill${filter===t?' on':''}`}>
                {t==='all' ? 'Tous' : `Tier ${t}`}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'22px' }}>
          {[
            { label:'Tier S actifs',   value:String(SIGNALS_DATA.filter(s=>s.tier==='S').length), color:'#FF8C00', sub:'Priorité maximale'   },
            { label:'Tier A actifs',   value:String(SIGNALS_DATA.filter(s=>s.tier==='A').length), color:'#C855D4', sub:'Haute priorité'      },
            { label:'Tier B actifs',   value:String(SIGNALS_DATA.filter(s=>s.tier==='B').length), color:'#2E9E6A', sub:'Opportunités'        },
            { label:'Conf. moyenne',   value:`${Math.round(SIGNALS_DATA.reduce((s,x)=>s+x.conf,0)/SIGNALS_DATA.length)}%`, color:'#42A5F5', sub:'Score IA moyen' },
          ].map((s,i)=>(
            <div key={i} style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'12px', padding:'14px 16px' }}>
              <div style={{ fontSize:'9px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:'var(--font-display)', marginBottom:'6px' }}>{s.label}</div>
              <div style={{ fontSize:'24px', fontWeight:700, color:s.color, fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1, marginBottom:'4px' }}>{s.value}</div>
              <div style={{ fontSize:'10px', color:'#AAA' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {visible.map(sig => {
            const isLocked   = lockedIds.includes(sig.id)
            const isExpanded = expanded === sig.id
            const ts = TIER_STYLE[sig.tier]
            const ec = EC[sig.type] ?? '#888'
            const ls = LS[sig.lang]

            return (
              <div key={sig.id} style={{ background:'#fff', border:`1px solid ${isExpanded?ec:'#EBEBEB'}`, borderRadius:'14px', overflow:'hidden', boxShadow:isExpanded?`0 4px 20px ${ec}22`:'none', transition:'all 0.2s', position:'relative' }}>

                {isLocked && (
                  <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.88)', backdropFilter:'blur(2px)', zIndex:10, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'14px' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', textAlign:'center', padding:'20px' }}>
                      <div style={{ fontSize:'14px' }}>🔒</div>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)' }}>Signal Tier {sig.tier} — Pro</div>
                      <div style={{ fontSize:'12px', color:'#888', maxWidth:'220px', lineHeight:1.5 }}>Accède à tous les signaux avec un abonnement Pro</div>
                      <button onClick={() => router.push('/signup')} style={{ padding:'7px 18px', borderRadius:'20px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>Passer Pro →</button>
                    </div>
                  </div>
                )}

                <div className="sig-row" onClick={()=>setExpanded(isExpanded?null:sig.id)} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'16px 18px', cursor:'pointer', transition:'background 0.1s' }}>
                  <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:ts.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 3px 10px ${ts.glow}`, animation:'float 3s ease-in-out infinite' }}>
                    <span style={{ fontSize:'14px', fontWeight:800, color:'#fff', fontFamily:'var(--font-display)' }}>{sig.tier}</span>
                  </div>
                  <div style={{ width:'36px', height:'50px', borderRadius:'6px', background:`linear-gradient(145deg,${ec}20,${ec}08)`, border:`1.5px solid ${ec}28`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:ec, opacity:0.65 }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'14px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sig.name}</span>
                      <span style={{ fontSize:'9px', background:ls.bg, color:ls.color, border:`1px solid ${ls.border}`, padding:'1px 5px', borderRadius:'3px', fontWeight:600, fontFamily:'var(--font-display)', flexShrink:0 }}>{ls.flag} {sig.lang}</span>
                      {sig.psa && <span style={{ fontSize:'9px', background:'#F5F5F5', color:'#666', border:'1px solid #E8E8E8', padding:'1px 5px', borderRadius:'3px', fontFamily:'var(--font-display)', flexShrink:0 }}>PSA Pop {sig.psa.toLocaleString()}</span>}
                    </div>
                    <div style={{ fontSize:'11px', color:'#AAA' }}>{sig.set} · {sig.source} · {sig.watching.toLocaleString()} regardent</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:'18px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1 }}>€ {sig.price.toLocaleString('fr-FR')}</div>
                    <div style={{ fontSize:'13px', fontWeight:700, color:'#2E9E6A', marginTop:'2px' }}>+{sig.pct}%</div>
                  </div>
                  <div style={{ textAlign:'center', flexShrink:0, minWidth:'60px' }}>
                    <div style={{ fontSize:'16px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.3px' }}>{sig.conf}%</div>
                    <div style={{ fontSize:'10px', color:'#AAA', marginBottom:'2px' }}>confiance</div>
                    <Timer seconds={sig.expiresIn} />
                  </div>
                  <div style={{ fontSize:'12px', color:'#CCC', transform:isExpanded?'rotate(180deg)':'none', transition:'transform 0.2s', flexShrink:0 }}>▼</div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop:`1px solid ${ec}20`, padding:'16px 18px', animation:'expand 0.2s ease-out', background:`${ec}04` }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'16px', alignItems:'start' }}>
                      <div>
                        <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'14px' }}>
                          {[
                            { label:'Confiance IA', value:sig.conf, color:'linear-gradient(90deg,#42A5F5,#26C6DA)', display:`${sig.conf}%` },
                            { label:'PSA Pop',       value:sig.psa?Math.max(0,100-sig.psa/50):50, color:'linear-gradient(90deg,#C855D4,#7C4DFF)', display:sig.psa?`${sig.psa.toLocaleString()} ex.`:'N/A' },
                            { label:'Momentum',      value:Math.min(sig.pct*2,100), color:'linear-gradient(90deg,#2E9E6A,#34D399)', display:`+${sig.pct}%` },
                          ].map(b=>(
                            <div key={b.label} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                              <span style={{ fontSize:'10px', color:'#AAA', width:'80px', flexShrink:0, fontFamily:'var(--font-display)' }}>{b.label}</span>
                              <div style={{ flex:1, height:'5px', background:'#F0F0F0', borderRadius:'99px', overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${Math.min(b.value,100)}%`, background:b.color, borderRadius:'99px' }} />
                              </div>
                              <span style={{ fontSize:'10px', fontWeight:600, color:'#111', width:'60px', textAlign:'right', fontFamily:'var(--font-display)' }}>{b.display}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ background:'#FFF8F5', borderRadius:'9px', padding:'12px 14px', borderLeft:'3px solid #E03020', marginBottom:'12px' }}>
                          <div style={{ fontSize:'10px', fontWeight:600, color:'#E03020', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:'var(--font-display)', marginBottom:'5px' }}>Analyse IA</div>
                          <p style={{ fontSize:'12px', color:'#5A3A2A', lineHeight:1.7, margin:0, fontFamily:'var(--font-sans)' }}>{sig.reason}</p>
                        </div>
                        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                          {sig.tags.map(tag=>(
                            <span key={tag} style={{ fontSize:'10px', background:'#FFF5F0', color:'#C84B00', border:'1px solid #FFD0B8', padding:'3px 9px', borderRadius:'10px', fontFamily:'var(--font-display)' }}>{tag}</span>
                          ))}
                        </div>
                      </div>

                      <div style={{ display:'flex', flexDirection:'column', gap:'8px', minWidth:'180px' }}>
                        <div style={{ background:'#FAFAFA', borderRadius:'10px', padding:'12px 14px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                            <span style={{ fontSize:'11px', color:'#888', fontFamily:'var(--font-display)' }}>Prix actuel</span>
                            <span style={{ fontSize:'13px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>€ {sig.price.toLocaleString('fr-FR')}</span>
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                            <span style={{ fontSize:'11px', color:'#888', fontFamily:'var(--font-display)' }}>Valeur marché</span>
                            <span style={{ fontSize:'13px', fontWeight:600, color:'#888', fontFamily:'var(--font-display)', textDecoration:'line-through' }}>€ {sig.market.toLocaleString('fr-FR')}</span>
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', paddingTop:'6px', borderTop:'1px solid #EBEBEB' }}>
                            <span style={{ fontSize:'11px', color:'#888', fontFamily:'var(--font-display)' }}>Cible</span>
                            <span style={{ fontSize:'13px', fontWeight:700, color:'#2E9E6A', fontFamily:'var(--font-display)' }}>€ {sig.target.toLocaleString('fr-FR')}</span>
                          </div>
                        </div>
                        <button onClick={() => router.push('/alpha/deals')} style={{ padding:'10px', borderRadius:'9px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                          Voir le deal →
                        </button>
                        <button onClick={e=>{e.stopPropagation();dismiss(sig.id)}} style={{ padding:'8px', borderRadius:'9px', background:'transparent', color:'#888', border:'1px solid #E8E8E8', fontSize:'12px', cursor:'pointer', fontFamily:'var(--font-display)' }}>
                          Ignorer ce signal
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {dismissed.size > 0 && (
            <div style={{ textAlign:'center', padding:'12px', borderRadius:'10px', background:'#FAFAFA', border:'1px solid #EBEBEB' }}>
              <span style={{ fontSize:'12px', color:'#888' }}>{dismissed.size} signal(s) ignoré(s) · </span>
              <button onClick={()=>setDismissed(new Set())} style={{ fontSize:'12px', color:'#E03020', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:600 }}>Tout restaurer</button>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
