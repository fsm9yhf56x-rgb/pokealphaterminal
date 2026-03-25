'use client'

import { useState, useRef, useEffect } from 'react'

type Msg = { role: 'user'|'dexy'; text: string; time: string }

const SUGGESTIONS = [
  "Analyse Charizard Alt Art SV151 — bon moment pour acheter ?",
  "Compare Umbreon vs Espeon VMAX Alt Art comme investissement",
  "Quels sets OOP ont le meilleur potentiel en 2025 ?",
  "Explique-moi le PSA Pop report et pourquoi c'est important",
  "Stratégie pour un portfolio de €5,000 en TCG Pokémon",
]

const SYSTEM_PROMPT = `Tu es Dexy, l'analyste TCG Pokémon IA de PokéAlpha Terminal. Tu es expert en:
- Marchés cartes Pokémon (eBay, Cardmarket, TCGPlayer)
- Analyse fondamentale: PSA Pop, rareté, sets OOP, reprint risk
- Stratégies d'investissement TCG pour collectionneurs et investisseurs
- Données de prix, tendances, signaux Alpha

Réponds toujours en français. Sois précis, concis et actionnable. Utilise des emojis avec parcimonie.
Format: réponses courtes et percutantes, listes si nécessaire, chiffres concrets.`

export function DexyChat({ isPro = false }: { isPro?: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'dexy',
      text: "Bonjour ! Je suis Dexy, ton analyste TCG IA. Je peux t'aider à analyser des cartes, comparer des investissements, décrypter les tendances marché ou construire une stratégie portfolio. Pose-moi n'importe quelle question sur le marché Pokémon TCG.",
      time: 'Maintenant',
    }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef             = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Msg = { role:'user', text, time:new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role === 'dexy' ? 'assistant' : 'user',
        content: m.text,
      }))

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: history,
        }),
      })

      const data = await res.json()
      const reply = data.content?.[0]?.text ?? "Désolé, je n'ai pas pu répondre. Réessaie dans un instant."
      setMessages(prev => [...prev, {
        role: 'dexy',
        text: reply,
        time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'dexy',
        text: "Connexion impossible au moment. Vérifie ta connexion et réessaie.",
        time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes msgIn   { from{opacity:0;transform:translateY(8px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .sug:hover         { background:#F0F0F0 !important; border-color:#D4D4D4 !important; }
        .send-btn:hover    { background:#333 !important; }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%', display:'flex', flexDirection:'column', height:'calc(100vh - 140px)', minHeight:'500px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'16px', flexShrink:0 }}>
          <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:'linear-gradient(135deg,#FF7A5A,#E03020)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'20px', fontWeight:700, boxShadow:'0 4px 14px rgba(224,48,32,0.3)', flexShrink:0 }}>D</div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ fontSize:'18px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)' }}>Dexy AI</span>
              <div style={{ display:'flex', alignItems:'center', gap:'4px', background:'#F0FFF6', border:'1px solid #AAEEC8', borderRadius:'20px', padding:'2px 9px' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#2E9E6A', animation:'blink 2s ease-in-out infinite' }} />
                <span style={{ fontSize:'10px', fontWeight:600, color:'#2E9E6A', fontFamily:'var(--font-display)' }}>En ligne</span>
              </div>
            </div>
            <p style={{ fontSize:'12px', color:'#888', margin:'3px 0 0', fontFamily:'var(--font-sans)' }}>Analyste TCG Pokémon IA · Propulsé par Claude</p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'12px', paddingRight:'4px', marginBottom:'14px' }}>

          {/* Suggestions si seul message */}
          {messages.length === 1 && (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'8px' }}>
              <div style={{ fontSize:'11px', color:'#AAA', fontFamily:'var(--font-display)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Suggestions</div>
              {SUGGESTIONS.map((s,i)=>(
                <button key={i} className="sug" onClick={()=>send(s)} style={{ textAlign:'left', padding:'10px 14px', borderRadius:'10px', border:'1px solid #EBEBEB', background:'#FAFAFA', cursor:'pointer', fontSize:'13px', color:'#555', fontFamily:'var(--font-sans)', lineHeight:1.4, transition:'all 0.12s' }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg,i)=>(
            <div key={i} style={{ display:'flex', justifyContent:msg.role==='user'?'flex-end':'flex-start', animation:'msgIn 0.25s ease-out' }}>
              {msg.role==='dexy' && (
                <div style={{ width:'30px', height:'30px', borderRadius:'9px', background:'linear-gradient(135deg,#FF7A5A,#E03020)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'12px', fontWeight:700, flexShrink:0, marginRight:'8px', alignSelf:'flex-end', marginBottom:'18px' }}>D</div>
              )}
              <div style={{ maxWidth:'75%' }}>
                <div style={{
                  background: msg.role==='user' ? '#111' : '#fff',
                  color: msg.role==='user' ? '#fff' : '#222',
                  borderRadius: msg.role==='user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '12px 16px',
                  fontSize: '13px',
                  lineHeight: '1.65',
                  fontFamily: 'var(--font-sans)',
                  border: msg.role==='dexy' ? '1px solid #EBEBEB' : 'none',
                  boxShadow: msg.role==='dexy' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.text}
                </div>
                <div style={{ fontSize:'10px', color:'#CCC', marginTop:'4px', textAlign:msg.role==='user'?'right':'left', fontFamily:'var(--font-display)' }}>
                  {msg.role==='dexy'?'Dexy · ':'Toi · '}{msg.time}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display:'flex', justifyContent:'flex-start', animation:'msgIn 0.2s ease-out' }}>
              <div style={{ width:'30px', height:'30px', borderRadius:'9px', background:'linear-gradient(135deg,#FF7A5A,#E03020)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'12px', fontWeight:700, flexShrink:0, marginRight:'8px', alignSelf:'flex-end', marginBottom:'18px' }}>D</div>
              <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'16px 16px 16px 4px', padding:'14px 18px', display:'flex', gap:'5px', alignItems:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#CCC', animation:`blink 1.2s ${i*0.2}s ease-in-out infinite` }} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ flexShrink:0, background:'#fff', border:'1.5px solid #EBEBEB', borderRadius:'14px', padding:'10px 12px', display:'flex', gap:'10px', alignItems:'flex-end', boxShadow:'0 -2px 12px rgba(0,0,0,0.04)' }}>
          <textarea
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(input) }}}
            placeholder="Pose une question sur le marché TCG..."
            rows={1}
            style={{ flex:1, resize:'none', border:'none', outline:'none', fontSize:'13px', color:'#111', fontFamily:'var(--font-sans)', lineHeight:1.5, background:'transparent', padding:'3px 0', maxHeight:'120px', overflowY:'auto' }}
          />
          <button className="send-btn" onClick={()=>send(input)} disabled={loading||!input.trim()} style={{ width:'38px', height:'38px', borderRadius:'10px', background:input.trim()&&!loading?'#111':'#F0F0F0', border:'none', color:input.trim()&&!loading?'#fff':'#CCC', fontSize:'16px', cursor:input.trim()&&!loading?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
            ↑
          </button>
        </div>
        <div style={{ textAlign:'center', marginTop:'8px', fontSize:'10px', color:'#CCC', fontFamily:'var(--font-display)' }}>
          Shift+Entrée pour aller à la ligne · Entrée pour envoyer
        </div>

      </div>
    </>
  )
}
