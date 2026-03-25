'use client'

import { useState, useMemo } from 'react'

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

function ProGate() {
  return (
    <>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        {/* Header */}
        <div style={{ marginBottom:'28px' }}>
          <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Alpha</p>
          <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:0 }}>Deal Hunter</h1>
        </div>

        {/* Upsell hero */}
        <div style={{ background:'linear-gradient(135deg,#111 0%,#1C1208 100%)', borderRadius:'20px', padding:'36px 40px', marginBottom:'24px', position:'relative', overflow:'hidden', textAlign:'center' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 30% 50%, rgba(255,107,53,0.1) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(224,48,32,0.08) 0%, transparent 50%)', pointerEvents:'none' }} />
          <div style={{ fontSize:'40px', marginBottom:'14px' }}>🔍</div>
          <div style={{ fontSize:'24px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', marginBottom:'10px' }}>Deal Hunter</div>
          <p style={{ fontSize:'14px', color:'rgba(255,255,255,0.55)', maxWidth:'420px', margin:'0 auto 24px', lineHeight:1.7, fontFamily:'var(--font-sans)' }}>
            Scanne eBay et Cardmarket en temps réel pour détecter automatiquement les cartes listées sous leur valeur marché.
          </p>
          <div style={{ display:'flex', justifyContent:'center', gap:'28px', marginBottom:'28px', flexWrap:'wrap' }}>
            {[
              { icon:'⚡', label:'Scan toutes les 15 min' },
              { icon:'🎯', label:'Score de confiance IA' },
              { icon:'🌐', label:'eBay · Cardmarket · TCGPlayer' },
              { icon:'❤️', label:'Sauvegarde tes deals' },
            ].map(f=>(
              <div key={f.label} style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                <span style={{ fontSize:'16px' }}>{f.icon}</span>
                <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.65)', fontFamily:'var(--font-display)' }}>{f.label}</span>
              </div>
            ))}
          </div>
          <button style={{ padding:'14px 36px', borderRadius:'14px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'0 6px 20px rgba(224,48,32,0.45)', letterSpacing:'-0.2px' }}>
            Passer Pro — €9,99 / mois
          </button>
          <div style={{ marginTop:'12px', fontSize:'11px', color:'rgba(255,255,255,0.25)', fontFamily:'var(--font-display)' }}>Sans engagement · Annulation à tout moment</div>
        </div>

        {/* Preview floutée — grille complète */}
        <div style={{ position:'relative' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.09em', fontFamily:'var(--font-display)', marginBottom:'14px', display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'3px', height:'16px', borderRadius:'2px', background:'#EBEBEB' }} />
            Aperçu — {DEALS.length} deals détectés maintenant
          </div>
          <div style={{ filter:'blur(4px)', pointerEvents:'none', userSelect:'none' as const }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' }}>
              {DEALS.map((deal,idx)=>{
                const ec = EC[deal.type]??'#888'
                const potential = deal.fair - deal.listed
                return (
                  <div key={deal.id} style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ height:'3px', background:`linear-gradient(90deg,${ec},${ec}55)` }} />
                    <div style={{ padding:'16px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                        <div>
                          <div style={{ fontSize:'13px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', marginBottom:'3px' }}>{deal.name}</div>
                          <div style={{ fontSize:'10px', color:'#BBB' }}>{deal.set} · {deal.source}</div>
                        </div>
                        <div style={{ fontSize:'22px', fontWeight:800, color:'#2E9E6A', fontFamily:'var(--font-display)' }}>-{deal.gap}%</div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
                        <div style={{ background:'#F8F8F8', borderRadius:'8px', padding:'8px 10px' }}>
                          <div style={{ fontSize:'9px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:'var(--font-display)', marginBottom:'3px' }}>Listé</div>
                          <div style={{ fontSize:'15px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>€ {deal.listed.toLocaleString('fr-FR')}</div>
                        </div>
                        <div style={{ background:'#F0FFF6', borderRadius:'8px', padding:'8px 10px' }}>
                          <div style={{ fontSize:'9px', color:'#1A7A4A', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:'var(--font-display)', marginBottom:'3px' }}>Potentiel</div>
                          <div style={{ fontSize:'15px', fontWeight:700, color:'#2E9E6A', fontFamily:'var(--font-display)' }}>+€ {potential.toLocaleString('fr-FR')}</div>
                        </div>
                      </div>
                      <div style={{ height:'38px', borderRadius:'9px', background:'#F0F0F0' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          {/* Overlay gradient */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'160px', background:'linear-gradient(to bottom, transparent, #FAFAFA)', pointerEvents:'none' }} />
        </div>

      </div>
    </>
  )
}

export function DealHunter({ isPro = false }: { isPro?: boolean }) {
  const [saved,     setSaved]     = useState<Set<string>>(new Set())
  const [filSource, setFilSource] = useState('all')
  const [filLang,   setFilLang]   = useState('all')
  const [filGraded, setFilGraded] = useState('all')
  const [minGap,    setMinGap]    = useState(0)
  const [sort,      setSort]      = useState<'gap'|'conf'|'listed'>('gap')

  if (!isPro) return <ProGate />

  const toggleSave = (id: string) => setSaved(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })

  const filtered = useMemo(() => DEALS
    .filter(d => filSource==='all' || d.source===filSource)
    .filter(d => filLang==='all'   || d.lang===filLang)
    .filter(d => filGraded==='all' || (filGraded==='graded'?d.graded:!d.graded))
    .filter(d => d.gap >= minGap)
    .sort((a,b) => sort==='gap'?b.gap-a.gap:sort==='conf'?b.conf-a.conf:a.listed-b.listed)
  , [filSource,filLang,filGraded,minGap,sort])

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes newIn  { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        .deal-h:hover { transform:translateY(-3px) !important; box-shadow:0 8px 24px rgba(0,0,0,0.1) !important; }
        .pill { padding:5px 12px; border-radius:7px; border:1px solid #E8E8E8; background:#fff; color:#555; font-size:12px; font-weight:500; cursor:pointer; font-family:var(--font-display); transition:all 0.12s; white-space:nowrap; }
        .pill:hover { border-color:#999; }
        .pill.on { background:#111 !important; color:#fff !important; border-color:#111 !important; }
        .srt { padding:5px 11px; border-radius:6px; border:none; background:transparent; color:#666; font-size:11px; font-weight:500; cursor:pointer; font-family:var(--font-display); transition:all 0.12s; }
        .srt:hover { background:#EBEBEB; }
        .srt.on { background:#111 !important; color:#fff !important; }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'22px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Alpha</p>
            <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:'0 0 5px' }}>Deal Hunter</h1>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#2E9E6A', animation:'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize:'12px', color:'#888' }}>{filtered.length} deals · eBay + Cardmarket · mis à jour il y a 8 min</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:'3px', background:'#F5F5F5', borderRadius:'9px', padding:'3px' }}>
            {([['gap','Écart %'],['conf','Confiance'],['listed','Prix']] as ['gap'|'conf'|'listed',string][]).map(([k,l])=>(
              <button key={k} onClick={()=>setSort(k)} className={`srt${sort===k?' on':''}`}>{l}</button>
            ))}
          </div>
        </div>

        {/* Filtres */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'16px', alignItems:'center' }}>
          {[{v:'all',l:'Toutes sources'},{v:'eBay',l:'eBay'},{v:'CM',l:'Cardmarket'},{v:'TCGPlayer',l:'TCGPlayer'}].map(o=>(
            <button key={o.v} onClick={()=>setFilSource(o.v)} className={`pill${filSource===o.v?' on':''}`}>{o.l}</button>
          ))}
          <div style={{ width:'1px', background:'#EBEBEB', alignSelf:'stretch' }} />
          {[{v:'all',l:'Toutes'},{v:'EN',l:'🇺🇸 EN'},{v:'JP',l:'🇯🇵 JP'},{v:'FR',l:'🇫🇷 FR'}].map(o=>(
            <button key={o.v} onClick={()=>setFilLang(o.v)} className={`pill${filLang===o.v?' on':''}`}>{o.l}</button>
          ))}
          <div style={{ width:'1px', background:'#EBEBEB', alignSelf:'stretch' }} />
          {[{v:'all',l:'Toutes'},{v:'graded',l:'Gradée'},{v:'raw',l:'Raw'}].map(o=>(
            <button key={o.v} onClick={()=>setFilGraded(o.v)} className={`pill${filGraded===o.v?' on':''}`}>{o.l}</button>
          ))}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginLeft:'4px' }}>
            <span style={{ fontSize:'12px', color:'#888', fontFamily:'var(--font-display)', whiteSpace:'nowrap' }}>Min écart</span>
            <select value={minGap} onChange={e=>setMinGap(Number(e.target.value))} style={{ height:'32px', padding:'0 8px', border:'1px solid #EBEBEB', borderRadius:'7px', fontSize:'12px', color:'#555', outline:'none', background:'#fff', cursor:'pointer', fontFamily:'var(--font-display)' }}>
              {[0,10,15,20,25,30].map(v=><option key={v} value={v}>{v===0?'Tous':'>'+v+'%'}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'14px' }}>
          {filtered.map((deal,idx)=>{
            const ec       = EC[deal.type]??'#888'
            const ls       = LS[deal.lang]
            const isSaved  = saved.has(deal.id)
            const potential = deal.fair - deal.listed
            return (
              <div key={deal.id} className="deal-h" style={{ background:'#fff', border:`1.5px solid ${deal.newItem?'#AAEEC8':'#EBEBEB'}`, borderRadius:'14px', overflow:'hidden', boxShadow:deal.newItem?'0 2px 12px rgba(46,158,106,0.12)':'0 2px 8px rgba(0,0,0,0.05)', transition:'all 0.18s', position:'relative', animation:`${deal.newItem?'newIn':'fadeIn'} 0.3s ${Math.min(idx,8)*0.04}s ease-out both` }}>
                {deal.newItem && <div style={{ position:'absolute', top:'10px', right:'10px', fontSize:'9px', fontWeight:700, background:'#2E9E6A', color:'#fff', padding:'2px 7px', borderRadius:'4px', fontFamily:'var(--font-display)', zIndex:1 }}>NOUVEAU</div>}
                <div style={{ height:'3px', background:`linear-gradient(90deg,${ec},${ec}55)` }} />
                <div style={{ padding:'16px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px', marginBottom:'10px' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px', flexWrap:'wrap' }}>
                        <span style={{ fontSize:'13px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{deal.name}</span>
                        {deal.signal && <span style={{ fontSize:'8px', fontWeight:700, background:deal.signal==='A'?'#C855D4':'#2E9E6A', color:'#fff', padding:'2px 5px', borderRadius:'3px', fontFamily:'var(--font-display)', flexShrink:0 }}>Tier {deal.signal}</span>}
                      </div>
                      <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', alignItems:'center' }}>
                        <span style={{ fontSize:'10px', color:'#BBB' }}>{deal.set}</span>
                        <span style={{ fontSize:'9px', background:ls.bg, color:ls.color, border:`1px solid ${ls.border}`, padding:'1px 5px', borderRadius:'3px', fontWeight:600, fontFamily:'var(--font-display)' }}>{ls.flag} {deal.lang}</span>
                        <span style={{ fontSize:'9px', background:'#F5F5F5', color:'#666', border:'1px solid #E8E8E8', padding:'1px 5px', borderRadius:'3px', fontFamily:'var(--font-display)' }}>{deal.condition}</span>
                        <span style={{ fontSize:'9px', background:'#F0F5FF', color:'#333', border:'1px solid #D0D8FF', padding:'1px 5px', borderRadius:'3px', fontFamily:'var(--font-display)' }}>{deal.source}</span>
                      </div>
                    </div>
                    <div style={{ textAlign:'center', flexShrink:0 }}>
                      <div style={{ fontSize:'22px', fontWeight:800, color:'#2E9E6A', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1 }}>-{deal.gap}%</div>
                      <div style={{ fontSize:'9px', color:'#AAA', marginTop:'1px' }}>{deal.conf}% conf.</div>
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
                    <div style={{ background:'#F8F8F8', borderRadius:'8px', padding:'8px 10px' }}>
                      <div style={{ fontSize:'9px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:'var(--font-display)', marginBottom:'3px' }}>Listé</div>
                      <div style={{ fontSize:'16px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.3px', lineHeight:1 }}>
                        {deal.listed>=1000?`€ ${(deal.listed/1000).toFixed(1)}k`:`€ ${deal.listed}`}
                      </div>
                    </div>
                    <div style={{ background:'#F0FFF6', border:'1px solid #AAEEC8', borderRadius:'8px', padding:'8px 10px' }}>
                      <div style={{ fontSize:'9px', color:'#1A7A4A', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:'var(--font-display)', marginBottom:'3px' }}>Potentiel</div>
                      <div style={{ fontSize:'16px', fontWeight:700, color:'#2E9E6A', fontFamily:'var(--font-display)', letterSpacing:'-0.3px', lineHeight:1 }}>
                        +{potential>=1000?`€ ${(potential/1000).toFixed(1)}k`:`€ ${potential}`}
                      </div>
                    </div>
                  </div>

                  {deal.timeLeft && (
                    <div style={{ background:'#FFF8F0', border:'1px solid #FFD8A0', borderRadius:'7px', padding:'6px 10px', marginBottom:'10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:'11px', color:'#8B6E00', fontFamily:'var(--font-display)' }}>⏱ Enchère — {deal.timeLeft}</span>
                      <span style={{ fontSize:'10px', color:'#8B6E00', fontWeight:600, fontFamily:'var(--font-display)' }}>{deal.seller}</span>
                    </div>
                  )}

                  <div style={{ display:'flex', gap:'7px' }}>
                    <button style={{ flex:1, padding:'9px', borderRadius:'9px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                      Voir le deal →
                    </button>
                    <button onClick={()=>toggleSave(deal.id)} style={{ width:'38px', height:'38px', borderRadius:'9px', background:isSaved?'#FFF0EE':'#F5F5F5', border:`1px solid ${isSaved?'#FFD8D0':'#E8E8E8'}`, fontSize:'16px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                      {isSaved ? '❤️' : '🤍'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
