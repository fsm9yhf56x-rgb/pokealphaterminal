'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'

type Msg = { id: number; text: string; type: 'tip'|'alert'|'signal'|'streak' }

const PAGE_MSGS: Record<string, Msg[]> = {
  '/portfolio': [
    { id:1, text:"Tu es surexposé en cartes Fire — 68% du portfolio. Pense à diversifier vers Water ou Electric.", type:'alert' },
    { id:2, text:"Portfolio +14.2% ce mois. Tu bats l'index Cards de 11 points — excellente performance.", type:'tip' },
    { id:3, text:"Umbreon VMAX Alt a progressé de 24% depuis ton achat. Bonne prise ?", type:'signal' },
  ],
  '/cartes': [
    { id:4, text:"Les SV151 sont en forte demande cette semaine. Moment intéressant pour vendre.", type:'tip' },
    { id:5, text:"PSA Pop mis à jour ce matin. Charizard 151 PSA 10 : seulement 312 exemplaires.", type:'signal' },
    { id:6, text:"Les cartes JP précèdent le marché EN de 2-3 semaines historiquement.", type:'tip' },
  ],
  '/market': [
    { id:7, text:"Le sealed est en correction -3.2% cette semaine. Potentielle opportunité d'achat.", type:'alert' },
    { id:8, text:"Vintage +6.8% ce mois. Lugia Neo et Base Set en tête du mouvement.", type:'tip' },
    { id:9, text:"Momentum haussier détecté sur les Alt Art Psychic. Gengar VMAX en tête.", type:'signal' },
  ],
  '/alpha': [
    { id:10, text:"3 nouveaux signaux Tier S détectés ce matin. Umbreon et Mewtwo en tête.", type:'signal' },
    { id:11, text:"RedDragonKai vient d'acheter €12,400 de Charizard Alt Art. Whale alert active.", type:'alert' },
    { id:12, text:"5 deals eBay sous valeur marché détectés dans les 2 dernières heures.", type:'tip' },
  ],
}

const TYPE_STYLE: Record<string, { bg:string; border:string; accent:string; label:string }> = {
  tip:    { bg:'#F8F8F8', border:'#E0E0E0', accent:'#888',    label:'Conseil' },
  alert:  { bg:'#FFF8F0', border:'#FFCC88', accent:'#E08000', label:'Alerte'  },
  signal: { bg:'#FFF0EE', border:'#FFBFB8', accent:'#E03020', label:'Signal'  },
  streak: { bg:'#FFFDE0', border:'#FFE060', accent:'#C8A000', label:'Streak'  },
}

// Position fixe — toujours en bas à droite
const FIXED_POS = { bottom: '24px', right: '24px' }

export function DexyFloat() {
  const pathname = usePathname()

  const [visible, setVisible]     = useState(false)
  const [expanded, setExpanded]   = useState(false)
  const [msgIdx, setMsgIdx]       = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [inputVal, setInputVal]   = useState('')
  const [chat, setChat]           = useState<{ role:'dexy'|'user'; text:string }[]>([])
  const [typing, setTyping]       = useState(false)
  const [entering, setEntering]   = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  // Section active
  const section = '/' + pathname.split('/')[1]

  // Ne pas afficher sur /home
  const isHome = section === '/home' || pathname === '/'

  // Messages contextuels de la page courante
  const msgs = PAGE_MSGS[section] ?? []

  // Pop après 2s — reset à chaque changement de page
  useEffect(() => {
    setVisible(false)
    setExpanded(false)
    setDismissed(false)
    setMsgIdx(0)
    setEntering(false)

    if (isHome || msgs.length === 0) return

    const t = setTimeout(() => {
      setEntering(true)
      setVisible(true)
    }, 2000)
    return () => clearTimeout(t)
  }, [pathname])

  // Rotation messages toutes les 14s
  useEffect(() => {
    if (!visible || expanded || msgs.length <= 1) return
    const t = setInterval(() => {
      setEntering(false)
      setTimeout(() => { setMsgIdx(i => (i + 1) % msgs.length); setEntering(true) }, 200)
    }, 14000)
    return () => clearInterval(t)
  }, [visible, expanded, msgs.length])

  // Scroll chat
  useEffect(() => {
    chatRef.current?.scrollTo({ top: 9999, behavior: 'smooth' })
  }, [chat])

  const handleSend = useCallback(() => {
    if (!inputVal.trim()) return
    const q = inputVal.trim()
    setInputVal('')
    setChat(prev => [...prev, { role:'user', text:q }])
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setChat(prev => [...prev, { role:'dexy', text:"Bonne question ! En me basant sur les données marché actuelles, je te recommande de consulter les Alpha Signals pour une analyse détaillée." }])
    }, 1100)
  }, [inputVal])

  if (isHome || !visible || dismissed || msgs.length === 0) return null

  const msg = msgs[msgIdx]
  const s   = TYPE_STYLE[msg.type]

  return (
    <>
      <style>{`
        @keyframes dexy-pop  { 0%{opacity:0;transform:translateY(10px) scale(0.92)} 60%{transform:translateY(-3px) scale(1.02)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes msg-slide { from{opacity:0;transform:translateX(6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes blink2    { 0%,100%{opacity:1} 50%{opacity:0.25} }
        .dexy-entering { animation: dexy-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .dexy-msg-in   { animation: msg-slide 0.2s ease-out; }
        .dexy-dismiss:hover { opacity:0.7; }
        .dexy-next:hover    { background:#F0F0F0 !important; }
        .dexy-send:hover    { background:#C82010 !important; }
      `}</style>

      <div style={{
        position: 'fixed',
        bottom: FIXED_POS.bottom,
        right:  FIXED_POS.right,
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
      }}>

        {/* PANEL ÉTENDU */}
        {expanded && (
          <div className="dexy-entering" style={{ width:'290px', background:'#fff', border:'1px solid #E8E8E8', borderRadius:'14px', boxShadow:'0 12px 40px rgba(0,0,0,0.13), 0 3px 10px rgba(0,0,0,0.06)', overflow:'hidden' }}>

            {/* Header */}
            <div style={{ background:'#111', padding:'10px 13px', display:'flex', alignItems:'center', gap:'9px' }}>
              <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'linear-gradient(135deg,#FF7A5A,#E03020)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'12px', fontWeight:700, flexShrink:0 }}>D</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'12px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)' }}>Dexy AI</div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.4)', marginTop:'1px' }}>Analyste TCG</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#34C77B', animation:'blink2 2s ease-in-out infinite' }} />
                <span style={{ fontSize:'9px', color:'rgba(255,255,255,0.35)' }}>Live</span>
              </div>
            </div>

            {/* Context message */}
            <div style={{ padding:'10px 12px', borderBottom:'1px solid #F0F0F0' }}>
              <div style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:'9px', padding:'9px 11px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'5px' }}>
                  <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:s.accent, flexShrink:0 }} />
                  <span style={{ fontSize:'9px', fontWeight:600, color:s.accent, textTransform:'uppercase' as const, letterSpacing:'0.07em', fontFamily:'var(--font-display)' }}>{s.label}</span>
                </div>
                <p style={{ fontSize:'12px', color:'#333', lineHeight:1.6, margin:0, fontFamily:'var(--font-sans)' }}>{msg.text}</p>
              </div>
              {msgs.length > 1 && (
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'7px' }}>
                  <span style={{ fontSize:'10px', color:'#CCC' }}>{msgIdx + 1}/{msgs.length}</span>
                  <button className="dexy-next" onClick={() => { setEntering(false); setTimeout(() => { setMsgIdx(i => (i+1)%msgs.length); setEntering(true) }, 150) }} style={{ fontSize:'10px', color:'#888', background:'transparent', border:'1px solid #E8E8E8', padding:'2px 8px', borderRadius:'5px', cursor:'pointer', fontFamily:'var(--font-display)', transition:'background 0.1s' }}>Suivant →</button>
                </div>
              )}
            </div>

            {/* Chat */}
            {chat.length > 0 && (
              <div ref={chatRef} style={{ maxHeight:'140px', overflowY:'auto', padding:'8px 12px', display:'flex', flexDirection:'column', gap:'7px', borderBottom:'1px solid #F0F0F0' }}>
                {chat.map((m,i) => (
                  <div key={i} className="dexy-msg-in" style={{ display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth:'85%', background: m.role==='user' ? '#111' : '#F5F5F5', color: m.role==='user' ? '#fff' : '#333', borderRadius: m.role==='user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px', padding:'7px 9px', fontSize:'11px', lineHeight:1.55, fontFamily:'var(--font-sans)' }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {typing && (
                  <div style={{ display:'flex', justifyContent:'flex-start' }}>
                    <div style={{ background:'#F5F5F5', borderRadius:'10px 10px 10px 2px', padding:'8px 12px', display:'flex', gap:'4px', alignItems:'center' }}>
                      {[0,1,2].map(i => <div key={i} style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#BBB', animation:`blink2 1.2s ${i*0.2}s ease-in-out infinite` }} />)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input */}
            <div style={{ padding:'9px 12px', display:'flex', gap:'7px', alignItems:'center' }}>
              <input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Pose une question..."
                style={{ flex:1, height:'32px', padding:'0 9px', border:'1px solid #E8E8E8', borderRadius:'7px', fontSize:'11px', color:'#111', fontFamily:'var(--font-sans)', outline:'none', background:'#FAFAFA' }}
              />
              <button className="dexy-send" onClick={handleSend} style={{ width:'32px', height:'32px', borderRadius:'7px', background:'#E03020', border:'none', color:'#fff', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.15s' }}>↑</button>
            </div>
          </div>
        )}

        {/* BUBBLE COMPACTE */}
        <div className={entering ? 'dexy-entering' : ''} style={{ display:'flex', alignItems:'center', gap:'10px', flexDirection:'row-reverse' }}>

          {/* Message flottant */}
          {!expanded && (
            <div className="dexy-msg-in" style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:'10px', padding:'8px 11px', maxWidth:'210px', cursor:'pointer', boxShadow:'0 4px 14px rgba(0,0,0,0.08)' }}
              onClick={() => setExpanded(true)}
            >
              <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'3px' }}>
                <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:s.accent, flexShrink:0 }} />
                <span style={{ fontSize:'9px', fontWeight:600, color:s.accent, textTransform:'uppercase' as const, letterSpacing:'0.06em', fontFamily:'var(--font-display)' }}>{s.label}</span>
              </div>
              <p style={{
                fontSize:'11px', color:'#333', lineHeight:1.5, margin:0,
                fontFamily:'var(--font-sans)',
                display:'-webkit-box',
                WebkitLineClamp:2,
                WebkitBoxOrient:'vertical' as const,
                overflow:'hidden',
              }}>
                {msg.text}
              </p>
            </div>
          )}

          {/* Avatar */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                width:'44px', height:'44px', borderRadius:'50%',
                background: expanded ? '#111' : 'linear-gradient(135deg,#FF7A5A,#E03020)',
                border:'none', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 4px 14px rgba(224,48,32,0.3)',
                transition:'all 0.2s',
                color:'#fff', fontSize:'16px', fontWeight:700,
                fontFamily:'var(--font-display)',
              }}
            >
              {expanded ? '×' : 'D'}
            </button>
            {!expanded && (
              <button
                className="dexy-dismiss"
                onClick={() => setDismissed(true)}
                style={{ position:'absolute', top:'-3px', right:'-3px', width:'16px', height:'16px', borderRadius:'50%', background:'#999', border:'2px solid #fff', color:'#fff', fontSize:'9px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, transition:'opacity 0.15s', padding:0, lineHeight:1 }}
              >×</button>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
