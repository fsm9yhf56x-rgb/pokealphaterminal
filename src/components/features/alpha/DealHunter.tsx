'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { ProGate } from './ProGate'
import { SNOW, FONT, GLASS, RADIUS } from '@/lib/design/snow'

type Deal = {
  id:        string
  name:      string
  set:       string
  type:      string
  condition: string
  graded:    boolean
  lang:      'EN'|'JP'|'FR'
  listed:    number
  fair:      number
  gap:       number
  conf:      number
  source:    'eBay'|'CM'|'TCGPlayer'
  seller:    string
  timeLeft?: string
  signal?:   'A'|'B'
  newItem:   boolean
}

const DEALS: Deal[] = [
  { id:'1',  name:'Charizard Alt Art PSA 9',     set:'SV151',          type:'fire',     condition:'PSA 9',  graded:true,  lang:'EN', listed:840,   fair:1100,  gap:24, conf:81, source:'eBay', seller:'cards_haven',    timeLeft:'2h 14min', signal:'A', newItem:true  },
  { id:'2',  name:'Umbreon VMAX Alt Art Raw',     set:'Evolving Skies', type:'dark',     condition:'Raw',    graded:false, lang:'EN', listed:720,   fair:880,   gap:18, conf:74, source:'CM',   seller:'TopCards_EU',                        signal:'A', newItem:false },
  { id:'3',  name:'Gengar VMAX Alt Art Raw',      set:'Fusion Strike',  type:'psychic',  condition:'Raw',    graded:false, lang:'EN', listed:245,   fair:340,   gap:28, conf:79, source:'eBay', seller:'PsychicGamer',   timeLeft:'5h 30min', signal:'A', newItem:true  },
  { id:'4',  name:'Lugia Neo Genesis PSA 8',      set:'Neo Genesis',    type:'water',    condition:'PSA 8',  graded:true,  lang:'EN', listed:440,   fair:580,   gap:24, conf:71, source:'eBay', seller:'vintage_grails', timeLeft:'18h',                  newItem:false },
  { id:'5',  name:'Espeon VMAX Alt Art Raw',      set:'Evolving Skies', type:'psychic',  condition:'Raw',    graded:false, lang:'JP', listed:218,   fair:318,   gap:31, conf:76, source:'CM',   seller:'JP_Cards_Osaka',                                   newItem:true  },
  { id:'6',  name:'Rayquaza VMAX Alt Art Raw',    set:'Evolving Skies', type:'electric', condition:'Raw',    graded:false, lang:'EN', listed:618,   fair:740,   gap:16, conf:65, source:'eBay', seller:'alt_art_deals',  timeLeft:'12h',                  newItem:false },
  { id:'7',  name:'Blastoise Base Set PSA 7',     set:'Base Set',       type:'water',    condition:'PSA 7',  graded:true,  lang:'EN', listed:180,   fair:260,   gap:31, conf:68, source:'eBay', seller:'vintage_poke',   timeLeft:'1h 45min',             newItem:false },
  { id:'8',  name:'Pikachu Illustrator Copy',     set:'CoroCoro',       type:'electric', condition:'Raw',    graded:false, lang:'JP', listed:12000, fair:18000, gap:33, conf:88, source:'CM',   seller:'JP_Grails',                                        newItem:true  },
]

const EC: Record<string,string> = { fire:'#FF6B35', water:'#42A5F5', psychic:'#C855D4', dark:'#7E57C2', electric:'#D4A800', grass:'#3DA85A' }
const LS: Record<string,{flag:string;bg:string;color:string;border:string}> = {
  EN: { flag:'🇺🇸', bg:'#FFF5F0', color:'#C84B00', border:'#FFD0B0' },
  JP: { flag:'🇯🇵', bg:'#F0F5FF', color:'#003DAA', border:'#C0D0FF' },
  FR: { flag:'🇫🇷', bg:'#F0FFF5', color:'#00660A', border:'#A0DDAA' },
}

const POS = SNOW.greenAccent
const POS_BG = 'rgba(38,166,91,.10)'
const POS_BORDER = 'rgba(38,166,91,.30)'
const EDGE = '0 0 0 0.5px rgba(255,255,255,0.7)'

function fmtEur(n: number) {
  const r = Math.round(n)
  return r >= 1000 ? `€ ${(r/1000).toFixed(1)}k` : `€ ${r.toLocaleString('fr-FR')}`
}
function confColor(c: number) {
  return c >= 80 ? POS : c >= 70 ? SNOW.ink : SNOW.amberDark
}

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Compteur animé easeOutCubic — tourne une seule fois au montage. */
function useCountUp(target: number, duration = 650, delay = 0) {
  const [val, setVal] = useState(reduceMotion() ? target : 0)
  useEffect(() => {
    if (reduceMotion()) { setVal(target); return }
    let raf = 0, t0 = 0
    const tick = (t: number) => {
      if (!t0) t0 = t
      const p = Math.min(1, (t - t0 - delay) / duration)
      if (p < 0) { raf = requestAnimationFrame(tick); return }
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setVal(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay])
  return val
}

function DealPreview() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'14px' }}>
      {DEALS.slice(0,4).map(deal => {
        const ec = EC[deal.type]??'#888'
        const potential = deal.fair - deal.listed
        return (
          <div key={deal.id} style={{ ...GLASS.cardSoft, overflow:'hidden' }}>
            <div style={{ height:'4px', background:`linear-gradient(90deg,${ec},${ec}55)` }} />
            <div style={{ padding:'16px' }}>
              <div style={{ fontSize:'13px', fontWeight:600, color:SNOW.mutedLight, fontFamily:FONT.display, marginBottom:'3px' }}>{deal.name}</div>
              <div style={{ fontSize:'10px', color:SNOW.borderHover, marginBottom:'12px', fontFamily:FONT.body }}>{deal.set} · {deal.source}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:SNOW.surface, borderRadius:'10px', padding:'10px 12px' }}>
                <span style={{ fontSize:'14px', fontWeight:700, color:SNOW.borderHover, fontFamily:FONT.data }}>{fmtEur(deal.listed)}</span>
                <span style={{ fontSize:'14px', fontWeight:700, color:'#AAEEC8', fontFamily:FONT.data }}>+{fmtEur(potential)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DealCard({ deal, idx, isSaved, onToggle }: { deal: Deal; idx: number; isSaved: boolean; onToggle: (id:string)=>void }) {
  const ec        = EC[deal.type]??'#888'
  const ls        = LS[deal.lang]
  const potential = deal.fair - deal.listed
  const cc        = confColor(deal.conf)
  const stagger   = Math.min(idx, 8) * 55

  const gapVal  = useCountUp(deal.gap, 600, stagger)
  const gainVal = useCountUp(potential, 700, stagger)

  // barre de confiance : remplissage au montage
  const [fill, setFill] = useState(0)
  useEffect(() => {
    if (reduceMotion()) { setFill(deal.conf); return }
    const t = setTimeout(() => setFill(deal.conf), 80 + stagger)
    return () => clearTimeout(t)
  }, [deal.conf, stagger])

  // pop du coeur au save
  const [pop, setPop] = useState(false)
  const handleSave = () => { onToggle(deal.id); if (!isSaved) { setPop(true); setTimeout(()=>setPop(false), 360) } }

  return (
    <div className="deal-h" style={{
      ...GLASS.card, overflow:'hidden',
      boxShadow: deal.newItem ? `${GLASS.card.boxShadow as string}, 0 0 0 1.5px ${POS_BORDER}` : `${GLASS.card.boxShadow as string}, ${EDGE}`,
      position:'relative',
      animation:`dealIn .5s cubic-bezier(.16,1,.3,1) ${stagger}ms both`,
    }}>
      <div className="deal-accent" style={{ height:'4px', background:`linear-gradient(90deg,${ec},${ec}55)` }} />
      <div style={{ padding:'17px 18px' }}>

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'10px', marginBottom:'9px' }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'5px', flexWrap:'wrap' }}>
              {deal.newItem && (
                <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'8px', fontWeight:700, background:POS_BG, color:POS, border:`1px solid ${POS_BORDER}`, padding:'2px 6px', borderRadius:'4px', fontFamily:FONT.display, letterSpacing:'.04em' }}>
                  <span className="blip" style={{ width:'4px', height:'4px', borderRadius:'50%', background:POS }} />NOUVEAU
                </span>
              )}
              {deal.signal && <span style={{ fontSize:'8px', fontWeight:700, background:deal.signal==='A'?'#C855D4':POS, color:'#fff', padding:'2px 6px', borderRadius:'4px', fontFamily:FONT.display, flexShrink:0 }}>Tier {deal.signal}</span>}
            </div>
            <div style={{ fontSize:'14px', fontWeight:700, color:SNOW.ink, fontFamily:FONT.display, letterSpacing:'-.2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{deal.name}</div>
            <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', alignItems:'center', marginTop:'6px' }}>
              <span style={{ fontSize:'10px', color:SNOW.mutedLight, fontFamily:FONT.body }}>{deal.set}</span>
              <span style={{ fontSize:'9px', background:ls.bg, color:ls.color, border:`1px solid ${ls.border}`, padding:'1px 5px', borderRadius:'4px', fontWeight:600, fontFamily:FONT.display }}>{ls.flag} {deal.lang}</span>
              <span style={{ fontSize:'9px', background:SNOW.surface, color:SNOW.muted, border:`1px solid ${SNOW.border}`, padding:'1px 5px', borderRadius:'4px', fontFamily:FONT.display }}>{deal.condition}</span>
              <span style={{ fontSize:'9px', background:'#F0F5FF', color:SNOW.inkSoft, border:'1px solid #D0D8FF', padding:'1px 5px', borderRadius:'4px', fontFamily:FONT.display }}>{deal.source}</span>
            </div>
          </div>
          <div style={{ flexShrink:0, textAlign:'center', background:POS_BG, border:`1px solid ${POS_BORDER}`, borderRadius:'12px', padding:'8px 11px', minWidth:'68px' }}>
            <div style={{ fontSize:'22px', fontWeight:800, color:POS, fontFamily:FONT.data, letterSpacing:'-1px', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>−{Math.round(gapVal)}%</div>
            <div style={{ fontSize:'8px', color:POS, opacity:.8, marginTop:'3px', textTransform:'uppercase', letterSpacing:'.06em', fontFamily:FONT.body, fontWeight:600 }}>sous cote</div>
          </div>
        </div>

        <div style={{ background:'rgba(255,255,255,.55)', border:`1px solid ${SNOW.border}`, borderRadius:'12px', padding:'12px 14px', marginBottom:'11px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
            <div>
              <div style={{ fontSize:'9px', color:SNOW.mutedLight, textTransform:'uppercase', letterSpacing:'.06em', fontFamily:FONT.display, marginBottom:'2px' }}>Prix listé</div>
              <div style={{ fontSize:'17px', fontWeight:800, color:SNOW.ink, fontFamily:FONT.data, letterSpacing:'-.3px', lineHeight:1 }}>{fmtEur(deal.listed)}</div>
            </div>
            <span style={{ fontSize:'15px', color:SNOW.mutedExtraLight }}>→</span>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:'9px', color:SNOW.mutedLight, textTransform:'uppercase', letterSpacing:'.06em', fontFamily:FONT.display, marginBottom:'2px' }}>Valeur cote</div>
              <div style={{ fontSize:'17px', fontWeight:700, color:SNOW.muted, fontFamily:FONT.data, letterSpacing:'-.3px', lineHeight:1 }}>{fmtEur(deal.fair)}</div>
            </div>
          </div>
          <div style={{ height:'1px', background:SNOW.borderSoft, margin:'11px 0' }} />
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:'11px', color:SNOW.muted, fontFamily:FONT.body, fontWeight:500 }}>Gain potentiel</span>
            <span style={{ fontSize:'16px', fontWeight:800, color:POS, fontFamily:FONT.data, letterSpacing:'-.3px', fontVariantNumeric:'tabular-nums' }}>+{fmtEur(gainVal)}</span>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'9px', marginBottom:'11px' }}>
          <span style={{ fontSize:'10px', color:SNOW.mutedLight, fontFamily:FONT.body, whiteSpace:'nowrap' }}>Confiance IA</span>
          <div style={{ flex:1, height:'5px', background:SNOW.border, borderRadius:'3px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${fill}%`, background:cc, borderRadius:'3px', transition:'width 1s cubic-bezier(.16,1,.3,1)' }} />
          </div>
          <span style={{ fontSize:'11px', fontWeight:700, color:cc, fontFamily:FONT.data, minWidth:'30px', textAlign:'right' }}>{deal.conf}%</span>
        </div>

        {deal.timeLeft && (
          <div style={{ background:SNOW.amber, border:`1px solid #FFD8A0`, borderRadius:'8px', padding:'7px 11px', marginBottom:'11px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:'11px', color:SNOW.amberDark, fontFamily:FONT.display, fontWeight:600 }}>⏱ Enchère — {deal.timeLeft}</span>
            <span style={{ fontSize:'10px', color:SNOW.amberDark, fontFamily:FONT.body }}>{deal.seller}</span>
          </div>
        )}

        <div style={{ display:'flex', gap:'7px' }}>
          <button className="deal-cta" style={{ flex:1, padding:'10px', borderRadius:RADIUS.md, background:SNOW.ink, color:'#fff', border:'none', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:FONT.display, letterSpacing:'-.2px', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px' }}>
            Voir le deal <span className="cta-arrow" style={{ display:'inline-block', transition:'transform .25s cubic-bezier(.16,1,.3,1)' }}>→</span>
          </button>
          <button onClick={handleSave} className={`deal-save${pop?' pop':''}`} style={{ width:'40px', height:'40px', borderRadius:RADIUS.md, background:isSaved?SNOW.redLight:SNOW.surface, border:`1px solid ${isSaved?'#FFD8D0':SNOW.border}`, fontSize:'16px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {isSaved ? '❤️' : '🤍'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function DealHunter({ isPro = false }: { isPro?: boolean }) {
  const [saved,     setSaved]     = useState<Set<string>>(new Set())
  const [filSource, setFilSource] = useState('all')
  const [filLang,   setFilLang]   = useState('all')
  const [filGraded, setFilGraded] = useState('all')
  const [minGap,    setMinGap]    = useState(0)
  const [sort,      setSort]      = useState<'gap'|'conf'|'listed'>('gap')

  const toggleSave = (id: string) => setSaved(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })

  const filtered = useMemo(() => DEALS
    .filter(d => filSource==='all' || d.source===filSource)
    .filter(d => filLang==='all'   || d.lang===filLang)
    .filter(d => filGraded==='all' || (filGraded==='graded'?d.graded:!d.graded))
    .filter(d => d.gap >= minGap)
    .sort((a,b) => sort==='gap'?b.gap-a.gap:sort==='conf'?b.conf-a.conf:a.listed-b.listed)
  , [filSource,filLang,filGraded,minGap,sort])

  // clé qui force le replay de l'animation à chaque changement de filtre/tri
  const fk = `${filSource}-${filLang}-${filGraded}-${minGap}-${sort}`

  if (!isPro) return (
    <ProGate page="deals">
      <DealPreview />
    </ProGate>
  )

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dealIn { from{opacity:0;transform:translateY(16px) scale(.985)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes blipPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
        @keyframes headPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes heartPop { 0%{transform:scale(1)} 40%{transform:scale(1.35)} 70%{transform:scale(.92)} 100%{transform:scale(1)} }
        @keyframes toolsIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

        .dh-tools{animation:toolsIn .35s cubic-bezier(.16,1,.3,1) both}

        .deal-h{transition:transform .4s cubic-bezier(.16,1,.3,1), box-shadow .4s cubic-bezier(.16,1,.3,1)}
        .deal-h:hover { transform:translateY(-4px) scale(1.007) !important; box-shadow:0 16px 48px rgba(0,0,0,0.11),0 5px 14px rgba(0,0,0,0.05),${EDGE} !important; }
        .deal-accent{transition:height .3s cubic-bezier(.16,1,.3,1)}
        .deal-h:hover .deal-accent{height:6px}
        .blip{animation:blipPulse 1.6s ease-in-out infinite}

        .pill { padding:6px 13px; border-radius:8px; color:${SNOW.muted}; font-size:12px; font-weight:600; cursor:pointer; font-family:${FONT.display}; transition:transform .15s cubic-bezier(.16,1,.3,1), color .15s, background .15s; white-space:nowrap;
          background:linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.55) 100%);
          backdrop-filter:blur(20px) saturate(200%); -webkit-backdrop-filter:blur(20px) saturate(200%);
          border:0.5px solid rgba(255,255,255,0.7); box-shadow:0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85); }
        .pill:hover { transform:translateY(-1px); color:${SNOW.ink}; }
        .pill:active { transform:scale(.95); }
        .pill.on { background:${SNOW.ink} !important; color:#fff !important; border-color:${SNOW.ink} !important; }

        .srt { padding:6px 12px; border-radius:7px; border:none; background:transparent; color:${SNOW.muted}; font-size:11px; font-weight:600; cursor:pointer; font-family:${FONT.display}; transition:all 0.15s cubic-bezier(.16,1,.3,1); }
        .srt:hover { background:rgba(0,0,0,0.05); }
        .srt:active { transform:scale(.95); }
        .srt.on { background:${SNOW.ink} !important; color:#fff !important; }

        .deal-cta{transition:transform .15s cubic-bezier(.16,1,.3,1), box-shadow .2s}
        .deal-cta:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,0,0,.18)}
        .deal-cta:hover .cta-arrow{transform:translateX(4px)}
        .deal-cta:active{transform:translateY(0) scale(.98)}

        .deal-save{transition:transform .15s cubic-bezier(.16,1,.3,1), background .15s}
        .deal-save:hover{transform:scale(1.08)}
        .deal-save:active{transform:scale(.9)}
        .deal-save.pop{animation:heartPop .36s cubic-bezier(.16,1,.3,1)}

        @media (prefers-reduced-motion: reduce){
          .deal-h, .dh-tools{animation:none !important}
          .blip{animation:none !important}
          .deal-h:hover{transform:none !important}
        }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        <div className="dh-tools" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'22px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <p style={{ fontSize:'10px', color:SNOW.mutedLight, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:FONT.display }}>Alpha</p>
            <h1 style={{ fontSize:'26px', fontWeight:600, color:SNOW.ink, fontFamily:FONT.display, letterSpacing:'-0.5px', margin:'0 0 5px' }}>Deal Hunter</h1>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:POS, animation:'headPulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize:'12px', color:SNOW.muted, fontFamily:FONT.body }}>{filtered.length} deals · eBay + Cardmarket · mis à jour il y a 8 min</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:'3px', ...GLASS.button, borderRadius:'10px', padding:'3px' }}>
            {([['gap','Écart %'],['conf','Confiance'],['listed','Prix']] as ['gap'|'conf'|'listed',string][]).map(([k,l])=>(
              <button key={k} onClick={()=>setSort(k)} className={`srt${sort===k?' on':''}`}>{l}</button>
            ))}
          </div>
        </div>

        <div className="dh-tools" style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'18px', alignItems:'center', animationDelay:'.05s' }}>
          {[{v:'all',l:'Toutes sources'},{v:'eBay',l:'eBay'},{v:'CM',l:'Cardmarket'},{v:'TCGPlayer',l:'TCGPlayer'}].map(o=>(
            <button key={o.v} onClick={()=>setFilSource(o.v)} className={`pill${filSource===o.v?' on':''}`}>{o.l}</button>
          ))}
          <div style={{ width:'1px', height:'22px', background:SNOW.border }} />
          {[{v:'all',l:'Toutes'},{v:'EN',l:'🇺🇸 EN'},{v:'JP',l:'🇯🇵 JP'},{v:'FR',l:'🇫🇷 FR'}].map(o=>(
            <button key={o.v} onClick={()=>setFilLang(o.v)} className={`pill${filLang===o.v?' on':''}`}>{o.l}</button>
          ))}
          <div style={{ width:'1px', height:'22px', background:SNOW.border }} />
          {[{v:'all',l:'Toutes'},{v:'graded',l:'Gradée'},{v:'raw',l:'Raw'}].map(o=>(
            <button key={o.v} onClick={()=>setFilGraded(o.v)} className={`pill${filGraded===o.v?' on':''}`}>{o.l}</button>
          ))}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginLeft:'4px' }}>
            <span style={{ fontSize:'12px', color:SNOW.muted, fontFamily:FONT.display, whiteSpace:'nowrap' }}>Min écart</span>
            <select value={minGap} onChange={e=>setMinGap(Number(e.target.value))} style={{ height:'33px', padding:'0 8px', border:`1px solid ${SNOW.border}`, borderRadius:'8px', fontSize:'12px', color:SNOW.muted, outline:'none', background:SNOW.bg, cursor:'pointer', fontFamily:FONT.display }}>
              {[0,10,15,20,25,30].map(v=><option key={v} value={v}>{v===0?'Tous':'>'+v+'%'}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:'14px' }}>
          {filtered.map((deal,idx)=>(
            <DealCard key={`${deal.id}-${fk}`} deal={deal} idx={idx} isSaved={saved.has(deal.id)} onToggle={toggleSave} />
          ))}
        </div>

        {filtered.length===0 && (
          <div style={{ padding:'70px 20px', textAlign:'center', ...GLASS.cardSoft, borderRadius:RADIUS.lg }}>
            <p style={{ fontSize:'14px', color:SNOW.mutedExtraLight, margin:0, fontFamily:FONT.body }}>Aucun deal sur ces filtres.</p>
          </div>
        )}
      </div>
    </>
  )
}
