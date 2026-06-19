'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { SNOW, FONT, GLASS, RADIUS } from '@/lib/design/snow'
import { INSIGHTS, TYPE_CONFIG, TIER_STYLE } from '@/lib/data/insights'

type Msg = { role: 'user'|'dexy'; text: string; time: string }

const SYSTEM_PROMPT = `Tu es Nori, l'experte cartes de Kodo Cards — une assistante (tu parles d'elle au féminin). Tu accompagnes les collectionneurs et passionnés du TCG Pokémon.

Ton domaine :
- Marchés cartes Pokémon (eBay, Cardmarket, TCGplayer)
- Analyse : population PSA, rareté, sets épuisés (OOP), risque de réimpression
- Aide à la décision pour collectionneurs et investisseurs
- Prix, tendances, complétion de sets, gradation

Ton ton : chaleureuse, accessible et encourageante — tu tutoies. Tu t'enthousiasmes sincèrement pour les belles cartes, mais tu restes une experte fiable : tu donnes des infos justes et tu ne survends jamais. Si une donnée est incertaine ou manquante, tu le dis franchement plutôt que d'inventer un prix ou une estimation. Tu ne mens jamais à l'utilisateur.

Tu restes dans ton rôle d'experte cartes Pokémon : pas de roleplay, pas de sujets personnels ou intimes, tu es une assistante professionnelle et bienveillante.

Réponds toujours en français. Sois précise, concise et concrète. Emojis avec parcimonie. Format : réponses courtes et percutantes, listes si utile, chiffres réels.`

const KODO_GRAD = 'linear-gradient(135deg,#FF7A5A,#E03020)'

const QUICK_ACTIONS = [
  { icon:'📊', label:'Brief marché', prompt:"Donne-moi un brief complet du marché Pokémon TCG aujourd'hui : tendances, opportunités et risques." },
  { icon:'💼', label:'Analyser mon portfolio', prompt:"Analyse une stratégie de portfolio TCG équilibrée pour un budget de €5,000 aujourd'hui." },
  { icon:'🔍', label:'Trouver un deal', prompt:"Quelles cartes sont actuellement les plus sous-évaluées et pourquoi ?" },
  { icon:'🎯', label:'Conseil grading', prompt:"Comment décider si une carte raw vaut le coup d'être gradée ? Donne-moi ta méthode." },
]

const FILTERS = [
  { v:'all',    l:'Tous' },
  { v:'signal', l:'⚡ Signaux' },
  { v:'market', l:'📊 Marché' },
  { v:'whale',  l:'🐋 Whales' },
  { v:'arb',    l:'🔄 Arbitrage' },
]

export function DexyChat({ isPro = false }: { isPro?: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'dexy',
      text: "Coucou ! Moi c'est Nori, ton experte cartes. Pose-moi une question sur une carte, un set, une cote — ou explore les insights du jour ci-dessous.",
      time: 'Maintenant',
    }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [filter,  setFilter]  = useState('all')
  const bottomRef             = useRef<HTMLDivElement>(null)

  const empty = messages.length === 1

  useEffect(() => {
    if (!empty) bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages, empty])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Msg = { role:'user', text, time:new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Nori n'est pas encore disponible au chat (activation post-lancement, via route serveur).
    // Aucun appel direct a l'API depuis le front.
    void SYSTEM_PROMPT
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'dexy',
        text: "Je ne suis pas encore dispo pour discuter — ca arrive tres vite ! En attendant, explore les insights du jour ci-dessous.",
        time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),
      }])
      setLoading(false)
    }, 400)
  }

  const glassShadow = GLASS.card.boxShadow as string
  const POS = SNOW.greenAccent

  const brief = useMemo(() => {
    const signals = INSIGHTS.filter(i=>i.type==='signal').length
    const unread = INSIGHTS.filter(i=>!i.read).length
    return { signals, unread, mover:'Umbreon VMAX +24%', sentiment:'Haussier' }
  }, [])

  const filtered = useMemo(
    () => filter==='all' ? INSIGHTS : INSIGHTS.filter(i=>i.type===filter),
    [filter]
  )

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes msgIn   { from{opacity:0;transform:translateY(10px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes insIn   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .ins-card{transition:transform .35s cubic-bezier(.16,1,.3,1), box-shadow .35s}
        .ins-card:hover{transform:translateY(-2px) scale(1.005);box-shadow:0 12px 36px rgba(0,0,0,.08),0 0 0 0.5px rgba(255,255,255,.7)}
        .ins-card:hover .ins-ask{opacity:1;transform:translateX(0)}
        .ins-card:hover .ins-preview{max-height:60px;opacity:1;margin-top:9px}
        .qa{transition:transform .15s cubic-bezier(.16,1,.3,1), box-shadow .2s}
        .qa:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.07)}
        .qa:active{transform:scale(.97)}
        .sug{transition:transform .15s cubic-bezier(.16,1,.3,1), box-shadow .2s}
        .sug:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,0,0,.06)}
        .fpill{transition:transform .15s cubic-bezier(.16,1,.3,1)}
        .fpill:hover{transform:translateY(-1px)}
        .fpill:active{transform:scale(.95)}
        .send-btn{transition:transform .15s cubic-bezier(.16,1,.3,1), background .15s}
        .send-btn.live:hover{transform:translateY(-1px) scale(1.04)}
        .send-btn.live:active{transform:scale(.94)}
        @media (prefers-reduced-motion: reduce){
          .ins-card,.qa,.sug,.send-btn,.fpill{animation:none !important;transition:none !important}
          .ins-card:hover{transform:none !important}
        }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%', display:'flex', flexDirection:'column', height:'calc(100vh - 140px)', minHeight:'520px' }}>

        {/* Header */}
        <div style={{ ...GLASS.card, padding:'14px 16px', display:'flex', alignItems:'center', gap:'14px', marginBottom:'14px', flexShrink:0, boxShadow:`${glassShadow}, 0 0 0 0.5px rgba(255,255,255,0.7)` }}>
          <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:KODO_GRAD, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'20px', fontWeight:800, boxShadow:'0 4px 14px rgba(224,48,32,0.3)', flexShrink:0, fontFamily:FONT.display }}>K</div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ fontSize:'18px', fontWeight:700, color:SNOW.ink, fontFamily:FONT.display, letterSpacing:'-.3px' }}>Nori</span>
              <div style={{ display:'flex', alignItems:'center', gap:'5px', background:'rgba(38,166,91,.10)', border:`1px solid rgba(38,166,91,.28)`, borderRadius:'20px', padding:'2px 10px' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:POS, animation:'blink 2s ease-in-out infinite' }} />
                <span style={{ fontSize:'10px', fontWeight:700, color:POS, fontFamily:FONT.display }}>En ligne</span>
              </div>
            </div>
            <p style={{ fontSize:'12px', color:SNOW.muted, margin:'3px 0 0', fontFamily:FONT.body }}>Analyste TCG · Insights proactifs + chat · Propulsé par Claude</p>
          </div>
        </div>

        {/* Zone scroll */}
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'12px', paddingRight:'4px', marginBottom:'14px' }}>

          {empty ? (
            <>
              {/* Brief marché du jour */}
              <div style={{ ...GLASS.card, padding:'18px 20px', boxShadow:`${glassShadow}, 0 0 0 0.5px rgba(255,255,255,0.7)`, animation:'insIn .4s cubic-bezier(.16,1,.3,1) both', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:'-30%', right:'-5%', width:160, height:160, background:'radial-gradient(circle, rgba(224,48,32,0.08) 0%, transparent 70%)', filter:'blur(20px)', pointerEvents:'none' }} />
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                  <span style={{ fontSize:'14px' }}>🧠</span>
                  <span style={{ fontSize:'11px', fontWeight:700, color:SNOW.red, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:FONT.display }}>Brief du jour · Nori</span>
                </div>
                <p style={{ fontSize:'14px', color:SNOW.ink, lineHeight:1.6, margin:'0 0 14px', fontFamily:FONT.body, fontWeight:500 }}>
                  Marché <b style={{ color:POS }}>haussier</b> ce matin. Le momentum se concentre sur les <b>Alt Art Evolving Skies</b> et le <b>vintage Neo</b>. {brief.signals} signaux Alpha actifs, dont 1 Tier S sur Umbreon VMAX.
                </p>
                <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                  {[
                    { l:'Sentiment', v:brief.sentiment, c:POS },
                    { l:'Signaux actifs', v:`${brief.signals}`, c:SNOW.ink },
                    { l:'Top mover 24h', v:brief.mover, c:POS },
                  ].map(s=>(
                    <div key={s.l} style={{ background:SNOW.surface, borderRadius:'10px', padding:'8px 13px', flex:'1 1 auto', minWidth:'120px' }}>
                      <div style={{ fontSize:'9px', color:SNOW.mutedLight, textTransform:'uppercase', letterSpacing:'.06em', fontFamily:FONT.display, marginBottom:'3px' }}>{s.l}</div>
                      <div style={{ fontSize:'14px', fontWeight:800, color:s.c, fontFamily:FONT.data }}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions rapides */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'9px' }}>
                {QUICK_ACTIONS.map((a,i)=>(
                  <button key={a.label} className="qa" onClick={()=>send(a.prompt)} style={{ ...GLASS.cardSoft, padding:'13px 14px', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:'10px', animation:`insIn .35s cubic-bezier(.16,1,.3,1) ${i*45}ms both` }}>
                    <span style={{ fontSize:'18px', flexShrink:0 }}>{a.icon}</span>
                    <span style={{ fontSize:'12px', fontWeight:600, color:SNOW.ink, fontFamily:FONT.display, lineHeight:1.3 }}>{a.label}</span>
                  </button>
                ))}
              </div>

              {/* Insights header + filtres */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'8px' }}>
                <div style={{ fontSize:'11px', color:SNOW.mutedLight, fontFamily:FONT.display, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:700 }}>Insights du jour</div>
                {brief.unread>0 && <span style={{ fontSize:'10px', fontWeight:700, color:SNOW.red, background:SNOW.redLight, padding:'1px 8px', borderRadius:'6px', fontFamily:FONT.data }}>{brief.unread} nouveaux</span>}
              </div>
              <div style={{ display:'flex', gap:'7px', flexWrap:'wrap' }}>
                {FILTERS.map(f=>{
                  const on = filter===f.v
                  return (
                    <button key={f.v} className="fpill" onClick={()=>setFilter(f.v)} style={{ padding:'5px 13px', borderRadius:'8px', fontSize:'12px', fontWeight:600, fontFamily:FONT.display, cursor:'pointer', whiteSpace:'nowrap',
                      ...(on ? { background:SNOW.ink, color:'#fff', border:`1px solid ${SNOW.ink}` } : { background:'rgba(255,255,255,0.65)', color:SNOW.muted, border:'0.5px solid rgba(255,255,255,0.7)', backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)' }) }}>
                      {f.l}
                    </button>
                  )
                })}
              </div>

              {/* Insights enrichis */}
              {filtered.map((ins,i)=>{
                const tc=TYPE_CONFIG[ins.type], ts=TIER_STYLE[ins.tier]
                return (
                  <div key={ins.id} className="ins-card" onClick={()=>send(`Analyse cet insight et donne-moi ton avis actionnable : "${ins.title}". Contexte : ${ins.body}`)}
                    style={{ ...GLASS.cardSoft, padding:'13px 15px', cursor:'pointer', animation:`insIn .4s cubic-bezier(.16,1,.3,1) ${i*55}ms both` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'11px' }}>
                      <div style={{ width:'30px', height:'30px', borderRadius:'9px', background:ts.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ fontSize:'12px', fontWeight:800, color:'#fff', fontFamily:FONT.display }}>{ins.tier}</span>
                      </div>
                      <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:tc.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', flexShrink:0 }}>{tc.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                          {!ins.read && <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:SNOW.red, flexShrink:0 }} />}
                          <span style={{ fontSize:'13px', fontWeight:600, color:SNOW.ink, fontFamily:FONT.display, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ins.title}</span>
                        </div>
                        <div style={{ fontSize:'10px', color:SNOW.mutedLight, marginTop:'2px', fontFamily:FONT.body }}>{tc.label} · {ins.time}</div>
                      </div>
                      <div style={{ display:'flex', gap:'12px', flexShrink:0 }}>
                        {ins.metrics.slice(0,2).map(m=>(
                          <div key={m.label} style={{ textAlign:'right' }}>
                            <div style={{ fontSize:'12px', fontWeight:700, color:SNOW.ink, fontFamily:FONT.data }}>{m.value}</div>
                            <div style={{ fontSize:'9px', color:SNOW.mutedLight, fontFamily:FONT.body }}>{m.label}</div>
                          </div>
                        ))}
                      </div>
                      <span className="ins-ask" style={{ fontSize:'10px', fontWeight:700, color:SNOW.red, fontFamily:FONT.display, whiteSpace:'nowrap', opacity:0, transform:'translateX(-4px)', transition:'opacity .2s, transform .2s', flexShrink:0 }}>Demander →</span>
                    </div>
                    {/* Aperçu body au hover */}
                    <div className="ins-preview" style={{ maxHeight:0, opacity:0, overflow:'hidden', transition:'max-height .3s cubic-bezier(.16,1,.3,1), opacity .25s, margin-top .3s' }}>
                      <p style={{ fontSize:'12px', color:SNOW.muted, lineHeight:1.55, margin:0, fontFamily:FONT.body, paddingLeft:'53px' }}>{ins.body.slice(0,140)}{ins.body.length>140?'…':''}</p>
                    </div>
                  </div>
                )
              })}
            </>
          ) : (
            <>
              {messages.map((msg,i)=>(
                <div key={i} style={{ display:'flex', justifyContent:msg.role==='user'?'flex-end':'flex-start', animation:'msgIn 0.3s cubic-bezier(.16,1,.3,1)' }}>
                  {msg.role==='dexy' && (
                    <div style={{ width:'30px', height:'30px', borderRadius:'9px', background:KODO_GRAD, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'12px', fontWeight:800, flexShrink:0, marginRight:'8px', alignSelf:'flex-end', marginBottom:'18px', fontFamily:FONT.display }}>K</div>
                  )}
                  <div style={{ maxWidth:'75%' }}>
                    <div style={{
                      ...(msg.role==='user'
                        ? { background:SNOW.ink, color:'#fff', boxShadow:'0 2px 10px rgba(0,0,0,.12)' }
                        : { background:'rgba(255,255,255,0.62)', backdropFilter:'blur(24px) saturate(180%)', WebkitBackdropFilter:'blur(24px) saturate(180%)', color:SNOW.inkSoft, boxShadow:'0 4px 18px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)' }),
                      borderRadius: msg.role==='user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding:'12px 16px', fontSize:'13px', lineHeight:'1.65', fontFamily:FONT.body, whiteSpace:'pre-wrap', border:'none',
                    }}>
                      {msg.text}
                    </div>
                    <div style={{ fontSize:'10px', color:SNOW.borderHover, marginTop:'4px', textAlign:msg.role==='user'?'right':'left', fontFamily:FONT.display }}>
                      {msg.role==='dexy'?'Nori · ':'Toi · '}{msg.time}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display:'flex', justifyContent:'flex-start', animation:'msgIn 0.25s cubic-bezier(.16,1,.3,1)' }}>
                  <div style={{ width:'30px', height:'30px', borderRadius:'9px', background:KODO_GRAD, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'12px', fontWeight:800, flexShrink:0, marginRight:'8px', alignSelf:'flex-end', marginBottom:'18px', fontFamily:FONT.display }}>K</div>
                  <div style={{ background:'rgba(255,255,255,0.62)', backdropFilter:'blur(24px) saturate(180%)', WebkitBackdropFilter:'blur(24px) saturate(180%)', borderRadius:'16px 16px 16px 4px', padding:'14px 18px', display:'flex', gap:'5px', alignItems:'center', boxShadow:'0 4px 18px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
                    {[0,1,2].map(i=>(
                      <div key={i} style={{ width:'6px', height:'6px', borderRadius:'50%', background:SNOW.mutedExtraLight, animation:`blink 1.2s ${i*0.2}s ease-in-out infinite` }} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ flexShrink:0, ...GLASS.card, padding:'10px 12px', display:'flex', gap:'10px', alignItems:'flex-end', boxShadow:`${glassShadow}, 0 0 0 0.5px rgba(255,255,255,0.7)` }}>
          <textarea
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(input) }}}
            placeholder="Pose une question sur le marché TCG..."
            rows={1}
            style={{ flex:1, resize:'none', border:'none', outline:'none', fontSize:'13px', color:SNOW.ink, fontFamily:FONT.body, lineHeight:1.5, background:'transparent', padding:'5px 2px', maxHeight:'120px', overflowY:'auto' }}
          />
          <button className={`send-btn${input.trim()&&!loading?' live':''}`} onClick={()=>send(input)} disabled={loading||!input.trim()} style={{ width:'38px', height:'38px', borderRadius:RADIUS.md, background:input.trim()&&!loading?SNOW.ink:SNOW.surface, border:'none', color:input.trim()&&!loading?'#fff':SNOW.borderHover, fontSize:'16px', cursor:input.trim()&&!loading?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            ↑
          </button>
        </div>
        <div style={{ textAlign:'center', marginTop:'8px', fontSize:'10px', color:SNOW.borderHover, fontFamily:FONT.display }}>
          Shift+Entrée pour aller à la ligne · Entrée pour envoyer
        </div>

      </div>
    </>
  )
}
