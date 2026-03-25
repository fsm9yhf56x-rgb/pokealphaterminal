'use client'

const DEALS = [
  { name:'Blissey V Alt Art',         set:'Chilling Reign',  type:'water',    fair:180, listed:128, gap:28, conf:81, source:'eBay', lang:'EN', signal:'A', psa:null, why:'PSA Pop très faible, Alt Art populaire' },
  { name:'Espeon VMAX Alt Art',        set:'Evolving Skies',  type:'psychic',  fair:420, listed:318, gap:24, conf:74, source:'CM',   lang:'JP', signal:'A', psa:1240, why:'Version JP toujours sous-cotée vs EN'   },
  { name:'Glaceon VMAX Alt Art',       set:'Evolving Skies',  type:'water',    fair:260, listed:198, gap:24, conf:69, source:'eBay', lang:'EN', signal:'B', psa:null, why:'Momentum Eevee set en cours'           },
  { name:'Leafeon VMAX Alt Art',       set:'Evolving Skies',  type:'grass',    fair:310, listed:241, gap:22, conf:72, source:'CM',   lang:'EN', signal:'B', psa:null, why:'Set complet, toutes les évolus montent' },
  { name:'Ditto V Alt Art',            set:'Fusion Strike',   type:'psychic',  fair:95,  listed:74,  gap:22, conf:61, source:'eBay', lang:'JP', signal:'B', psa:null, why:'Alt Art rare, sous-évalué vs Gengar'    },
  { name:'Vaporeon VMAX Alt Art',      set:'Evolving Skies',  type:'water',    fair:240, listed:188, gap:22, conf:68, source:'CM',   lang:'EN', signal:'B', psa:2100, why:'Trio Eevee en hausse, Vaporeon en retard'},
]

const EC: Record<string,string> = { fire:'#FF6B35', water:'#42A5F5', psychic:'#C855D4', dark:'#7E57C2', electric:'#D4A800', grass:'#3DA85A' }
const LS: Record<string,{flag:string;color:string;bg:string}> = {
  EN: { flag:'🇺🇸', color:'#C84B00', bg:'#FFF5F0' },
  JP: { flag:'🇯🇵', color:'#003DAA', bg:'#F0F5FF' },
  FR: { flag:'🇫🇷', color:'#00660A', bg:'#F0FFF5' },
}

export function SousEvalues({ isPro = false }: { isPro?: boolean }) {
  if (!isPro) {
    return (
      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ marginBottom:'22px' }}>
          <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Market</p>
          <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:0 }}>Sous-évalués</h1>
        </div>
        {/* Teaser flou */}
        <div style={{ position:'relative', borderRadius:'16px', overflow:'hidden' }}>
          <div style={{ filter:'blur(3px)', pointerEvents:'none', opacity:0.6 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'14px' }}>
              {DEALS.map(d => (
                <div key={d.name} style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', padding:'16px' }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#AAA', fontFamily:'var(--font-display)', marginBottom:'4px' }}>{d.name}</div>
                  <div style={{ fontSize:'11px', color:'#CCC', marginBottom:'10px' }}>{d.set}</div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:'18px', fontWeight:700, color:'#AAA' }}>€ {d.listed}</span>
                    <span style={{ fontSize:'18px', fontWeight:700, color:'#AAA' }}>-{d.gap}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.75)', borderRadius:'16px', gap:'12px', textAlign:'center', padding:'40px' }}>
            <div style={{ fontSize:'32px' }}>🔒</div>
            <div style={{ fontSize:'22px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>Réservé Pro</div>
            <div style={{ fontSize:'14px', color:'#888', maxWidth:'320px', lineHeight:1.6 }}>
              Accède aux cartes détectées sous leur valeur marché en temps réel — eBay, Cardmarket, TCGPlayer.
            </div>
            <div style={{ display:'flex', gap:'20px', margin:'8px 0' }}>
              {[`${DEALS.length} deals actifs`,'Mise à jour toutes les 15min','Score de confiance IA'].map(f=>(
                <div key={f} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#2E9E6A' }} />
                  <span style={{ fontSize:'12px', color:'#555', fontFamily:'var(--font-display)' }}>{f}</span>
                </div>
              ))}
            </div>
            <button style={{ padding:'12px 32px', borderRadius:'12px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'0 4px 16px rgba(224,48,32,0.4)' }}>
              Passer Pro — €9,99/mois
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        .deal-card:hover { transform:translateY(-3px) !important; box-shadow:0 8px 24px rgba(0,0,0,0.1) !important; }
      `}</style>
      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>
        <div style={{ marginBottom:'22px' }}>
          <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Market</p>
          <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:0 }}>Sous-évalués</h1>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'14px' }}>
          {DEALS.map(d => {
            const ec = EC[d.type]??'#888'
            const ls = LS[d.lang]
            const potential = d.fair - d.listed
            return (
              <div key={d.name} className="deal-card" style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'14px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', transition:'all 0.18s', cursor:'pointer' }}>
                <div style={{ height:'3px', background:`linear-gradient(90deg,${ec},${ec}55)` }} />
                <div style={{ padding:'16px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px', marginBottom:'10px' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                        <span style={{ fontSize:'13px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)' }}>{d.name}</span>
                        <span style={{ fontSize:'8px', fontWeight:700, background:d.signal==='A'?'#C855D4':'#2E9E6A', color:'#fff', padding:'2px 5px', borderRadius:'3px', fontFamily:'var(--font-display)', flexShrink:0 }}>Tier {d.signal}</span>
                      </div>
                      <div style={{ fontSize:'10px', color:'#BBB' }}>{d.set} · {d.source}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'20px', fontWeight:700, color:'#2E9E6A', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1 }}>-{d.gap}%</div>
                      <div style={{ fontSize:'10px', color:'#AAA', marginTop:'2px' }}>{d.conf}% conf.</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'10px' }}>
                    <div>
                      <div style={{ fontSize:'22px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1 }}>€ {d.listed}</div>
                      <div style={{ fontSize:'11px', color:'#AAA', marginTop:'2px' }}>Valeur marché · <span style={{ textDecoration:'line-through' }}>€ {d.fair}</span></div>
                    </div>
                    <div style={{ display:'flex', gap:'5px', alignItems:'center' }}>
                      <span style={{ fontSize:'10px', background:ls.bg, color:ls.color, padding:'2px 7px', borderRadius:'4px', fontWeight:600, fontFamily:'var(--font-display)' }}>{ls.flag} {d.lang}</span>
                      {d.psa && <span style={{ fontSize:'9px', background:'#F5F5F5', color:'#666', padding:'2px 7px', borderRadius:'4px', fontFamily:'var(--font-display)' }}>Pop {d.psa.toLocaleString()}</span>}
                    </div>
                  </div>
                  <div style={{ background:'#F0FFF6', border:'1px solid #AAEEC8', borderRadius:'7px', padding:'7px 10px', marginBottom:'12px' }}>
                    <span style={{ fontSize:'10px', fontWeight:600, color:'#1A7A4A', fontFamily:'var(--font-display)' }}>+€ {potential} potentiel · </span>
                    <span style={{ fontSize:'10px', color:'#2E7A4A' }}>{d.why}</span>
                  </div>
                  <button style={{ width:'100%', padding:'10px', borderRadius:'9px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                    Voir le deal →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
