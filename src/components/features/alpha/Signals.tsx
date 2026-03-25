'use client'

import { useState } from 'react'

type Signal = {
  id:        string
  name:      string
  set:       string
  type:      string
  tier:      'S'|'A'|'B'
  price:     number
  market:    number
  target:    number
  pct:       number
  conf:      number
  psa?:      number
  reason:    string
  tags:      string[]
  lang:      'EN'|'JP'|'FR'
  source:    string
  expiresIn: number
  watching:  number
}

const SIGNALS_DATA: Signal[] = [
  { id:'1', name:'Charizard Alt Art',      set:'SV151',          type:'fire',     tier:'S', price:920,  market:1240, target:1300, pct:53, conf:72, psa:312,  reason:"Alt Art extrêmement rare — PSA Pop de seulement 312 exemplaires. Momentum acheteur détecté sur eBay JP et Cardmarket. Le marché JP est en avance de 2-3 semaines sur l'EN.", tags:['PSA Pop faible','Momentum JP','Alt Art rare','eBay actif'], lang:'EN', source:'eBay', expiresIn:4*3600-18*60, watching:847 },
  { id:'2', name:'Umbreon VMAX Alt Art',   set:'Evolving Skies', type:'dark',     tier:'A', price:880,  market:1020, target:1100, pct:24, conf:68, psa:2840, reason:"Set OOP depuis 2022. La demande en Dark type reste structurellement haute. Plusieurs whales ont accumulé cette semaine.", tags:['Set OOP','Dark type haussier','Whale accumulation'], lang:'EN', source:'CM',   expiresIn:8*3600,       watching:412 },
  { id:'3', name:'Rayquaza VMAX Alt Art',  set:'Evolving Skies', type:'electric', tier:'A', price:740,  market:880,  target:950,  pct:31, conf:74,           reason:"Gold Star momentum se transfère aux Alt Art Electric. Volume inhabituel détecté. PSA Pop très faible pour ce tier de popularité.", tags:['Electric haussier','Volume inhabituel','Set OOP'], lang:'EN', source:'eBay', expiresIn:12*3600,      watching:298 },
  { id:'4', name:'Mewtwo V Alt Art',       set:'Pokemon GO',     type:'psychic',  tier:'B', price:280,  market:320,  target:360,  pct:28, conf:61,           reason:"Undervalued vs les autres Alt Art Psychic. Le set Pokemon GO est en réévaluation post-hype. Bon point d'entrée avant la prochaine vague.", tags:['Undervalued','Psychic momentum','Point entrée'], lang:'JP', source:'CM',   expiresIn:24*3600,      watching:156 },
  { id:'5', name:'Lugia Neo Genesis Holo', set:'Neo Genesis',    type:'water',    tier:'A', price:580,  market:690,  target:750,  pct:29, conf:71, psa:2100, reason:"Vintage en forte hausse. Neo Genesis est l'un des derniers sets sous-évalués de l'ère Neo. Lugia reste l'icône absolue des collectionneurs vintage.", tags:['Vintage','Neo haussier','Icône','PSA 8+ rare'], lang:'EN', source:'eBay', expiresIn:36*3600,      watching:203 },
  { id:'6', name:'Espeon VMAX Alt Art',    set:'Evolving Skies', type:'psychic',  tier:'B', price:318,  market:380,  target:420,  pct:19, conf:66,           reason:"Version JP 24% sous la valeur EN. Spread historiquement élevé — rééquilibrage attendu dans les 30 jours.", tags:['JP vs EN spread','Arbitrage','Evolving Skies'], lang:'JP', source:'CM',   expiresIn:48*3600,      watching:89  },
]

const EC: Record<string,string> = { fire:'#FF6B35', water:'#42A5F5', psychic:'#C855D4', dark:'#7E57C2', electric:'#D4A800', grass:'#3DA85A' }

const TS: Record<string,{bg:string;glow:string}> = {
  S: { bg:'linear-gradient(135deg,#FFD700,#FF8C00)', glow:'rgba(255,160,0,0.35)'  },
  A: { bg:'linear-gradient(135deg,#C855D4,#9C27B0)', glow:'rgba(200,85,212,0.3)'  },
  B: { bg:'linear-gradient(135deg,#2E9E6A,#1A7A4A)', glow:'rgba(46,158,106,0.3)' },
}

const LS: Record<string,{flag:string;bg:string;color:string;border:string}> = {
  EN: { flag:'🇺🇸', bg:'#FFF5F0', color:'#C84B00', border:'#FFD0B0' },
  JP: { flag:'🇯🇵', bg:'#F0F5FF', color:'#003DAA', border:'#C0D0FF' },
  FR: { flag:'🇫🇷', bg:'#F0FFF5', color:'#00660A', border:'#A0DDAA' },
}

function Timer({ seconds }: { seconds: number }) {
  const h = Math.floor(seconds/3600), m = Math.floor((seconds%3600)/60)
  return <span style={{ fontSize:'11px', fontWeight:600, color:seconds<3600?'#E03020':'#888', fontFamily:'var(--font-display)' }}>{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}h</span>
}

function SignalCard({ sig, expanded, onToggle, onDismiss }: { sig:Signal; expanded:boolean; onToggle:()=>void; onDismiss:()=>void }) {
  const ts = TS[sig.tier], ec = EC[sig.type]??'#888', ls = LS[sig.lang]
  return (
    <div style={{ background:'#fff', border:`1px solid ${expanded?ec:'#EBEBEB'}`, borderRadius:'14px', overflow:'hidden', boxShadow:expanded?`0 4px 20px ${ec}22`:'none', transition:'all 0.2s' }}>
      {/* Row cliquable */}
      <div onClick={onToggle} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'16px 18px', cursor:'pointer' }}>
        <div style={{ width:'40px', height:'40px', borderRadius:'11px', background:ts.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 3px 10px ${ts.glow}` }}>
          <span style={{ fontSize:'15px', fontWeight:800, color:'#fff', fontFamily:'var(--font-display)' }}>{sig.tier}</span>
        </div>
        <div style={{ width:'34px', height:'48px', borderRadius:'6px', background:`linear-gradient(145deg,${ec}22,${ec}08)`, border:`1.5px solid ${ec}28`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <div style={{ width:'11px', height:'11px', borderRadius:'50%', background:ec, opacity:0.65 }} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'4px', flexWrap:'wrap' }}>
            <span style={{ fontSize:'14px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sig.name}</span>
            <span style={{ fontSize:'9px', background:ls.bg, color:ls.color, border:`1px solid ${ls.border}`, padding:'1px 6px', borderRadius:'3px', fontWeight:600, fontFamily:'var(--font-display)', flexShrink:0 }}>{ls.flag} {sig.lang}</span>
            {sig.psa && <span style={{ fontSize:'9px', background:'#F5F5F5', color:'#666', border:'1px solid #E8E8E8', padding:'1px 6px', borderRadius:'3px', fontFamily:'var(--font-display)', flexShrink:0 }}>PSA Pop {sig.psa.toLocaleString()}</span>}
          </div>
          <div style={{ fontSize:'11px', color:'#AAA' }}>{sig.set} · {sig.source} · {sig.watching.toLocaleString()} regardent</div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0, minWidth:'80px' }}>
          <div style={{ fontSize:'18px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1 }}>€ {sig.price.toLocaleString('fr-FR')}</div>
          <div style={{ fontSize:'13px', fontWeight:700, color:'#2E9E6A', marginTop:'2px' }}>+{sig.pct}%</div>
        </div>
        <div style={{ textAlign:'center', flexShrink:0, minWidth:'56px' }}>
          <div style={{ fontSize:'16px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>{sig.conf}%</div>
          <div style={{ fontSize:'9px', color:'#BBB', marginBottom:'2px' }}>confiance</div>
          <Timer seconds={sig.expiresIn} />
        </div>
        <div style={{ fontSize:'11px', color:'#CCC', transform:expanded?'rotate(180deg)':'none', transition:'transform 0.2s', flexShrink:0 }}>▼</div>
      </div>

      {/* Panel expandé */}
      {expanded && (
        <div style={{ borderTop:`1px solid ${ec}20`, padding:'18px 20px', background:`${ec}04` }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 200px', gap:'18px', alignItems:'start' }}>
            <div>
              <div style={{ display:'flex', flexDirection:'column', gap:'7px', marginBottom:'14px' }}>
                {[
                  { label:'Confiance IA', val:sig.conf,                              color:'linear-gradient(90deg,#42A5F5,#26C6DA)', d:`${sig.conf}%`                              },
                  { label:'PSA Pop',      val:sig.psa?Math.max(0,100-sig.psa/50):50, color:'linear-gradient(90deg,#C855D4,#7C4DFF)', d:sig.psa?`${sig.psa.toLocaleString()} ex.`:'N/A' },
                  { label:'Momentum',     val:Math.min(sig.pct*2,100),               color:'linear-gradient(90deg,#2E9E6A,#34D399)', d:`+${sig.pct}%`                              },
                ].map(b=>(
                  <div key={b.label} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <span style={{ fontSize:'10px', color:'#AAA', width:'78px', flexShrink:0, fontFamily:'var(--font-display)' }}>{b.label}</span>
                    <div style={{ flex:1, height:'5px', background:'#F0F0F0', borderRadius:'99px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(b.val,100)}%`, background:b.color, borderRadius:'99px' }} />
                    </div>
                    <span style={{ fontSize:'10px', fontWeight:600, color:'#111', width:'62px', textAlign:'right' as const, fontFamily:'var(--font-display)' }}>{b.d}</span>
                  </div>
                ))}
              </div>
              <div style={{ background:'#FFF8F5', borderRadius:'9px', padding:'12px 14px', borderLeft:'3px solid #E03020', marginBottom:'12px' }}>
                <div style={{ fontSize:'10px', fontWeight:700, color:'#E03020', textTransform:'uppercase' as const, letterSpacing:'0.07em', fontFamily:'var(--font-display)', marginBottom:'5px' }}>Analyse IA</div>
                <p style={{ fontSize:'12px', color:'#5A3A2A', lineHeight:1.7, margin:0, fontFamily:'var(--font-sans)' }}>{sig.reason}</p>
              </div>
              <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                {sig.tags.map(tag=>(
                  <span key={tag} style={{ fontSize:'10px', background:'#FFF5F0', color:'#C84B00', border:'1px solid #FFD0B8', padding:'3px 9px', borderRadius:'10px', fontFamily:'var(--font-display)' }}>{tag}</span>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <div style={{ background:'#FAFAFA', borderRadius:'10px', padding:'12px 14px' }}>
                {[
                  { label:'Prix actuel',   value:`€ ${sig.price.toLocaleString('fr-FR')}`,  color:'#111',    strike:false },
                  { label:'Valeur marché', value:`€ ${sig.market.toLocaleString('fr-FR')}`, color:'#888',    strike:true  },
                  { label:'Cible',         value:`€ ${sig.target.toLocaleString('fr-FR')}`, color:'#2E9E6A', strike:false },
                ].map((row,i)=>(
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:i>0?'7px':0, marginTop:i>0?'7px':0, borderTop:i>0?'1px solid #EBEBEB':'none' }}>
                    <span style={{ fontSize:'11px', color:'#888', fontFamily:'var(--font-display)' }}>{row.label}</span>
                    <span style={{ fontSize:'13px', fontWeight:700, color:row.color, fontFamily:'var(--font-display)', textDecoration:row.strike?'line-through':'none' }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <button style={{ padding:'10px', borderRadius:'9px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>Voir le deal →</button>
              <button onClick={e=>{e.stopPropagation();onDismiss()}} style={{ padding:'9px', borderRadius:'9px', background:'transparent', color:'#888', border:'1px solid #E8E8E8', fontSize:'12px', cursor:'pointer', fontFamily:'var(--font-display)' }}>Ignorer ce signal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function Signals({ isPro = false }: { isPro?: boolean }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [filter,    setFilter]    = useState<'all'|'S'|'A'|'B'>('all')
  const [expanded,  setExpanded]  = useState<string|null>('1')

  const visible = SIGNALS_DATA.filter(s => filter==='all' || s.tier===filter)
  const FREE    = 1
  const free    = visible.slice(0, FREE).filter(s => !dismissed.has(s.id))
  const locked  = visible.slice(FREE)

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
        .pill       { padding:5px 16px; border-radius:8px; border:1px solid #E8E8E8; background:#fff; color:#666; font-size:12px; font-weight:500; cursor:pointer; font-family:var(--font-display); transition:all 0.12s; }
        .pill:hover { border-color:#999; }
        .pill.on    { background:#111 !important; color:#fff !important; border-color:#111 !important; }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        {/* Header */}
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
              <button key={t} onClick={()=>setFilter(t)} className={`pill${filter===t?' on':''}`}>{t==='all'?'Tous':`Tier ${t}`}</button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'22px' }}>
          {[
            { label:'Tier S actifs',  value:String(SIGNALS_DATA.filter(s=>s.tier==='S').length), color:'#FF8C00', sub:'Priorité maximale' },
            { label:'Tier A actifs',  value:String(SIGNALS_DATA.filter(s=>s.tier==='A').length), color:'#C855D4', sub:'Haute priorité'    },
            { label:'Tier B actifs',  value:String(SIGNALS_DATA.filter(s=>s.tier==='B').length), color:'#2E9E6A', sub:'Opportunités'      },
            { label:'Conf. moyenne',  value:`${Math.round(SIGNALS_DATA.reduce((s,x)=>s+x.conf,0)/SIGNALS_DATA.length)}%`, color:'#42A5F5', sub:'Score IA moyen' },
          ].map((s,i)=>(
            <div key={i} style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'12px', padding:'14px 16px' }}>
              <div style={{ fontSize:'9px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:'var(--font-display)', marginBottom:'6px' }}>{s.label}</div>
              <div style={{ fontSize:'24px', fontWeight:700, color:s.color, fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1, marginBottom:'4px' }}>{s.value}</div>
              <div style={{ fontSize:'10px', color:'#AAA' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Signaux */}
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>

          {/* Free — 1 signal complet */}
          {free.map(sig=>(
            <SignalCard key={sig.id} sig={sig} expanded={expanded===sig.id} onToggle={()=>setExpanded(expanded===sig.id?null:sig.id)} onDismiss={()=>setDismissed(prev=>new Set([...prev,sig.id]))} />
          ))}

          {dismissed.size>0 && (
            <div style={{ textAlign:'center', padding:'10px', borderRadius:'10px', background:'#FAFAFA', border:'1px solid #EBEBEB' }}>
              <span style={{ fontSize:'12px', color:'#888' }}>{dismissed.size} signal(s) ignoré(s) · </span>
              <button onClick={()=>setDismissed(new Set())} style={{ fontSize:'12px', color:'#E03020', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:600 }}>Restaurer</button>
            </div>
          )}

          {/* PRO GATE — un seul bloc pour tous les signaux locked */}
          {!isPro && locked.length>0 && (
            <div style={{ position:'relative', borderRadius:'14px', overflow:'hidden' }}>
              {/* Aperçu flou */}
              <div style={{ filter:'blur(3px)', pointerEvents:'none', userSelect:'none' as const, display:'flex', flexDirection:'column', gap:'10px' }}>
                {locked.map(sig=>{
                  const ts=TS[sig.tier], ec=EC[sig.type]??'#888', ls=LS[sig.lang]
                  return (
                    <div key={sig.id} style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', padding:'16px 18px', display:'flex', alignItems:'center', gap:'14px' }}>
                      <div style={{ width:'40px', height:'40px', borderRadius:'11px', background:ts.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ fontSize:'15px', fontWeight:800, color:'#fff', fontFamily:'var(--font-display)' }}>{sig.tier}</span>
                      </div>
                      <div style={{ width:'34px', height:'48px', borderRadius:'6px', background:`linear-gradient(145deg,${ec}22,${ec}08)`, border:`1.5px solid ${ec}28`, flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'14px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', marginBottom:'4px' }}>{sig.name}</div>
                        <div style={{ fontSize:'11px', color:'#AAA' }}>{sig.set} · {sig.source}</div>
                      </div>
                      <div style={{ textAlign:'right' as const }}>
                        <div style={{ fontSize:'18px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>€ {sig.price.toLocaleString('fr-FR')}</div>
                        <div style={{ fontSize:'13px', fontWeight:700, color:'#2E9E6A' }}>+{sig.pct}%</div>
                      </div>
                      <div style={{ textAlign:'center' as const, minWidth:'56px' }}>
                        <div style={{ fontSize:'16px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>{sig.conf}%</div>
                        <div style={{ fontSize:'9px', color:'#BBB' }}>confiance</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Overlay unique centré */}
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(255,255,255,0.3) 0%,rgba(255,255,255,0.92) 30%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'14px', padding:'40px 20px', textAlign:'center' }}>
                <div style={{ fontSize:'28px' }}>🔒</div>
                <div style={{ fontSize:'22px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.3px' }}>
                  {locked.length} signal{locked.length>1?'s':''} bloqué{locked.length>1?'s':''}
                </div>
                <div style={{ fontSize:'14px', color:'#666', maxWidth:'340px', lineHeight:1.65, fontFamily:'var(--font-sans)' }}>
                  Accède à tous les signaux Tier S, A et B en temps réel avec un abonnement Pro.
                </div>
                <div style={{ display:'flex', gap:'20px' }}>
                  {['Signaux illimités','Alertes instantanées','Analyse IA complète'].map(f=>(
                    <div key={f} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                      <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#2E9E6A' }} />
                      <span style={{ fontSize:'12px', color:'#555', fontFamily:'var(--font-display)' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button style={{ padding:'12px 32px', borderRadius:'12px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'0 4px 16px rgba(224,48,32,0.4)', marginTop:'4px' }}>
                  Passer Pro — €9,99/mois →
                </button>
              </div>
            </div>
          )}

          {/* Pro — tous les signaux */}
          {isPro && locked.map(sig=>(
            <SignalCard key={sig.id} sig={sig} expanded={expanded===sig.id} onToggle={()=>setExpanded(expanded===sig.id?null:sig.id)} onDismiss={()=>setDismissed(prev=>new Set([...prev,sig.id]))} />
          ))}
        </div>

      </div>
    </>
  )
}
