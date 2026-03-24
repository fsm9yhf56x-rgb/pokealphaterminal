'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'

type Msg = { id: number; text: string; type: 'tip'|'alert'|'signal'|'streak'; urgent?: boolean }

const PAGE_MSGS: Record<string, Msg[]> = {
  '/home': [
    { id:1, text:"Signal Charizard Alt Art — sous-évalué de 26%. Expire dans 3h 42min.", type:'signal', urgent:true },
    { id:2, text:"Ton streak est en danger ! Il te reste 2 missions à compléter aujourd'hui.", type:'streak', urgent:true },
    { id:3, text:"Gengar VMAX vient de prendre +8% en 2h. Momentum détecté.", type:'alert' },
    { id:4, text:"Ton portfolio a gagné €340 depuis ce matin. Belle journée.", type:'tip' },
  ],
  '/portfolio': [
    { id:5, text:"Tu es surexposé en cartes Fire — 68% du portfolio. Pense à diversifier.", type:'alert' },
    { id:6, text:"Performance +14.2% ce mois. Tu bats l'index Cards de 11 points.", type:'tip' },
  ],
  '/cartes': [
    { id:7, text:"Les SV151 sont en forte demande. Bonne période pour vendre.", type:'tip' },
    { id:8, text:"PSA Pop mis à jour. Charizard 151 PSA 10 : seulement 312 exemplaires.", type:'signal' },
  ],
  '/market': [
    { id:9, text:"Le sealed est en correction -3.2% cette semaine. Opportunité d'achat ?", type:'alert' },
    { id:10, text:"Vintage +6.8% ce mois. Lugia Neo et Base Set en tête.", type:'tip' },
  ],
  '/alpha': [
    { id:11, text:"3 nouveaux signaux Tier S ce matin. Umbreon et Mewtwo en tête.", type:'signal', urgent:true },
    { id:12, text:"RedDragonKai vient d'acheter €12,400 de Charizard Alt. Whale alert.", type:'alert', urgent:true },
  ],
}

const TYPE_STYLE: Record<string, { bg:string; border:string; accent:string; label:string }> = {
  tip:    { bg:'#F8F8F8', border:'#E0E0E0', accent:'#888',    label:'Conseil'  },
  alert:  { bg:'#FFF8F0', border:'#FFCC88', accent:'#E08000', label:'Alerte'   },
  signal: { bg:'#FFF0EE', border:'#FFBFB8', accent:'#E03020', label:'Signal'   },
  streak: { bg:'#FFFDE0', border:'#FFE060', accent:'#C8A000', label:'Streak'   },
}

// Smart positions — never top-center (blocks nav), never bottom-right on mobile
const POSITIONS = [
  { bottom:'88px', right:'24px',  label:'br' },
  { bottom:'88px', left:'24px',   label:'bl' },
  { top:'110px',   right:'24px',  label:'tr' },
]

export function DexyFloat() {
  const pathname = usePathname()
  const [visible, setVisible]     = useState(false)
  const [expanded, setExpanded]   = useState(false)
  const [msgIdx, setMsgIdx]       = useState(0)
  const [posIdx, setPosIdx]       = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [inputVal, setInputVal]   = useState('')
  const [chat, setChat]           = useState<{role:'dexy'|'user';text:string}[]>([])
  const [typing, setTyping]       = useState(false)
  const [entering, setEntering]   = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  const msgs = PAGE_MSGS['/' + pathname.split('/')[1]] ?? PAGE_MSGS['/home']
  const msg  = msgs[msgIdx % msgs.length]
  const pos  = POSITIONS[posIdx]

  // Pop automatiquement après 2s, change de position selon page
  useEffect(() => {
    setDismissed(false)
    setExpanded(false)
    setMsgIdx(0)
    const t = setTimeout(() => {
      setEntering(true)
      setVisible(true)
    }, 2000)
    return () => clearTimeout(t)
  }, [pathname])

  // Change de position toutes les 3 pages visitées pour ne pas être prévisible
  useEffect(() => {
    setPosIdx(p => (p + 1) % POSITIONS.length)
  }, [pathname])

  // Auto-rotate messages toutes les 12s
  useEffect(() => {
    if (!visible || expanded) return
    const t = setInterval(() => {
      setEntering(false)
      setTimeout(() => { setMsgIdx(i => i + 1); setEntering(true) }, 200)
    }, 12000)
    return () => clearInterval(t)
  }, [visible, expanded])

  // Scroll chat en bas
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
      setChat(prev => [...prev, { role:'dexy', text:"Bonne question ! En me basant sur les données marché actuelles, je te recommande de consulter les Alpha Signals pour une analyse détaillée. Je travaille sur ta réponse complète." }])
    }, 1200)
  }, [inputVal])

  if (!visible || dismissed) return null

  const s = TYPE_STYLE[msg.type]
  const posStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 999,
    ...(pos.bottom ? { bottom: pos.bottom } : {}),
    ...(pos.top    ? { top:    pos.top    } : {}),
    ...(pos.right  ? { right:  pos.right  } : {}),
    ...(pos.left   ? { left:   pos.left   } : {}),
  }

  return (
    <>
      <style>{`
        @keyframes dexy-pop  { 0%{opacity:0;transform:translateY(10px) scale(0.92)} 60%{transform:translateY(-3px) scale(1.02)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes dexy-out  { to{opacity:0;transform:translateY(8px) scale(0.9)} }
        @keyframes msg-slide { from{opacity:0;transform:translateX(6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes blink2    { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes wiggle    { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-4deg)} 75%{transform:rotate(4deg)} }
        .dexy-entering { animation: dexy-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .dexy-msg-in   { animation: msg-slide 0.2s ease-out; }
        .dexy-dismiss:hover { opacity:0.7; }
        .dexy-next:hover    { background:#F0F0F0 !important; }
        .dexy-send:hover    { background:#C82010 !important; }
        .dexy-expand:hover  { background:#F5F5F5 !important; }
        .dexy-chat-bubble   { transition: all 0.15s; }
      `}</style>

      <div style={{ ...posStyle, display:'flex', flexDirection:'column', alignItems: pos.right ? 'flex-end' : 'flex-start', gap:'8px', maxWidth:'300px' }}>

        {/* PANEL ÉTENDU */}
        {expanded && (
          <div className="dexy-entering" style={{
            width:'290px', background:'#fff',
            border:'1px solid #E8E8E8', borderRadius:'14px',
            boxShadow:'0 12px 40px rgba(0,0,0,0.13), 0 3px 10px rgba(0,0,0,0.06)',
            overflow:'hidden',
          }}>
            {/* Header */}
            <div style={{ background:'#111', padding:'10px 13px', display:'flex', alignItems:'center', gap:'9px' }}>
              <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'linear-gradient(135deg,#FF7A5A,#E03020)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'12px', fontWeight:700, flexShrink:0 }}>D</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'12px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)' }}>Dexy AI</div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginTop:'1px' }}>Analyste TCG</div>
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
                  <span style={{ fontSize:'10px', color:'#CCC' }}>{msgIdx % msgs.length + 1}/{msgs.length}</span>
                  <button className="dexy-next" onClick={() => { setEntering(false); setTimeout(() => { setMsgIdx(i=>i+1); setEntering(true) }, 150) }} style={{ fontSize:'10px', color:'#888', background:'transparent', border:'1px solid #E8E8E8', padding:'2px 8px', borderRadius:'5px', cursor:'pointer', fontFamily:'var(--font-display)', transition:'background 0.1s' }}>Suivant →</button>
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
              <input value={inputVal} onChange={e=>setInputVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSend()} placeholder="Pose une question..." style={{ flex:1, height:'32px', padding:'0 9px', border:'1px solid #E8E8E8', borderRadius:'7px', fontSize:'11px', color:'#111', fontFamily:'var(--font-sans)', outline:'none', background:'#FAFAFA' }} />
              <button className="dexy-send" onClick={handleSend} style={{ width:'32px', height:'32px', borderRadius:'7px', background:'#E03020', border:'none', color:'#fff', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.15s' }}>↑</button>
            </div>
          </div>
        )}

        {/* BUBBLE COMPACTE — toujours visible */}
        <div className={entering ? 'dexy-entering' : ''} style={{ display:'flex', alignItems:'center', gap:'10px', flexDirection: pos.right ? 'row-reverse' : 'row' }}>

          {/* Message flottant condensé */}
          {!expanded && (
            <div className="dexy-msg-in" style={{
              background:s.bg, border:`1px solid ${s.border}`,
              borderRadius:'10px', padding:'8px 11px',
              maxWidth:'200px', cursor:'pointer',
              boxShadow:'0 4px 14px rgba(0,0,0,0.08)',
            }}
            onClick={() => setExpanded(true)}
            >
              <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'3px' }}>
                <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:s.accent, flexShrink:0 }} />
                <span style={{ fontSize:'9px', fontWeight:600, color:s.accent, textTransform:'uppercase' as const, letterSpacing:'0.06em', fontFamily:'var(--font-display)' }}>{s.label}</span>
              </div>
              <p style={{ fontSize:'11px', color:'#333', lineHeight:1.5, margin:0, fontFamily:'var(--font-sans)',
                display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const, overflow:'hidden' }}>
                {msg.text}
              </p>
            </div>
          )}

          {/* Avatar Dexy */}
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
            {/* Dismiss */}
            {!expanded && (
              <button className="dexy-dismiss" onClick={() => setDismissed(true)} style={{ position:'absolute', top:'-4px', right:'-4px', width:'16px', height:'16px', borderRadius:'50%', background:'#888', border:'2px solid #fff', color:'#fff', fontSize:'9px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, fontWeight:700, transition:'opacity 0.15s', padding:0 }}>×</button>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
