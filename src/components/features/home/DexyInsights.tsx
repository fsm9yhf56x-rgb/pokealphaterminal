'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { INSIGHTS, TYPE_CONFIG, TIER_STYLE } from '@/lib/data/insights'



export function DexyInsights() {
  const router = useRouter()
  const [insights, setInsights] = useState(INSIGHTS)
  const [filter,   setFilter]   = useState('all')
  const [expanded, setExpanded] = useState<string|null>('1')

  const toggle = (id: string, field: 'read'|'saved') => {
    setInsights(prev => prev.map(i => i.id===id ? {...i,[field]:!i[field]} : i))
  }

  const filtered = insights.filter(i => filter==='all' || i.type===filter || (filter==='unread'&&!i.read) || (filter==='saved'&&i.saved))
  const unread   = insights.filter(i => !i.read).length

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes expand  { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        .ins-row:hover     { background:#FAFAFA !important; }
        .pill { padding:5px 12px; border-radius:8px; border:1px solid #E8E8E8; background:#fff; color:#666; font-size:12px; font-weight:500; cursor:pointer; font-family:var(--font-display); transition:all 0.12s; white-space:nowrap; }
        .pill:hover { border-color:#999; }
        .pill.on { background:#111 !important; color:#fff !important; border-color:#111 !important; }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'22px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Home</p>
            <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:'0 0 5px' }}>Kodo Insights</h1>
            <div style={{ fontSize:'12px', color:'#888' }}>
              {unread > 0 && <><span style={{ fontWeight:700, color:'#E03020' }}>{unread} non lus</span> · </>}
              {insights.length} insights · mis à jour en continu par Kodo AI
            </div>
          </div>
          <button onClick={()=>setInsights(prev=>prev.map(i=>({...i,read:true})))} style={{ padding:'7px 16px', borderRadius:'9px', background:'#F5F5F5', border:'1px solid #EBEBEB', fontSize:'12px', color:'#666', cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:500 }}>
            Tout marquer lu
          </button>
        </div>

        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'18px' }}>
          {[{v:'all',l:'Tous'},{v:'unread',l:`Non lus (${unread})`},{v:'saved',l:'Sauvegardés'},{v:'signal',l:'⚡ Signaux'},{v:'market',l:'📊 Marché'},{v:'whale',l:'🐋 Whales'},{v:'arb',l:'🔄 Arbitrage'},{v:'report',l:'📈 Rapports'}].map(o=>(
            <button key={o.v} onClick={()=>setFilter(o.v)} className={`pill${filter===o.v?' on':''}`}>{o.l}</button>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {filtered.map(ins => {
            const tc  = TYPE_CONFIG[ins.type]
            const ts  = TIER_STYLE[ins.tier]
            const isX = expanded === ins.id
            return (
              <div key={ins.id} style={{ background:'#fff', border:`1px solid ${isX?'#E0E0E0':'#EBEBEB'}`, borderRadius:'14px', overflow:'hidden', transition:'all 0.2s', opacity:ins.read&&!isX?0.75:1 }}>
                <div className="ins-row" onClick={()=>{setExpanded(isX?null:ins.id); if(!ins.read) toggle(ins.id,'read')}} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 18px', cursor:'pointer', transition:'background 0.1s' }}>
                  <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:ts.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:'12px', fontWeight:800, color:'#fff', fontFamily:'var(--font-display)' }}>{ins.tier}</span>
                  </div>
                  <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:tc.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', flexShrink:0 }}>{tc.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'3px' }}>
                      {!ins.read && <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#E03020', flexShrink:0 }} />}
                      <span style={{ fontSize:'13px', fontWeight:ins.read?500:600, color:'#111', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ins.title}</span>
                    </div>
                    <div style={{ fontSize:'10px', color:'#AAA' }}>{tc.label} · {ins.time}</div>
                  </div>
                  <div style={{ display:'flex', gap:'12px', flexShrink:0 }}>
                    {ins.metrics.slice(0,2).map(m=>(
                      <div key={m.label} style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'12px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>{m.value}</div>
                        <div style={{ fontSize:'9px', color:'#AAA' }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={e=>{e.stopPropagation();toggle(ins.id,'saved')}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'14px', padding:'0 4px', flexShrink:0 }}>
                    {ins.saved ? '❤️' : '🤍'}
                  </button>
                  <div style={{ fontSize:'11px', color:'#CCC', transform:isX?'rotate(180deg)':'none', transition:'transform 0.2s', flexShrink:0 }}>▼</div>
                </div>

                {isX && (
                  <div style={{ borderTop:'1px solid #F5F5F5', padding:'16px 18px', animation:'expand 0.18s ease-out', background:'#FAFAFA' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'16px', alignItems:'start' }}>
                      <div>
                        <p style={{ fontSize:'13px', color:'#444', lineHeight:1.75, margin:'0 0 12px', fontFamily:'var(--font-sans)' }}>{ins.body}</p>
                        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                          {ins.tags.map(tag=>(
                            <span key={tag} style={{ fontSize:'10px', background:'#FFF5F0', color:'#C84B00', border:'1px solid #FFD0B8', padding:'3px 9px', borderRadius:'10px', fontFamily:'var(--font-display)' }}>{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'6px', minWidth:'160px' }}>
                        {ins.metrics.map(m=>(
                          <div key={m.label} style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'8px', padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span style={{ fontSize:'10px', color:'#888', fontFamily:'var(--font-display)' }}>{m.label}</span>
                            <span style={{ fontSize:'13px', fontWeight:700, color:'#111', fontFamily:'var(--font-display)' }}>{m.value}</span>
                          </div>
                        ))}
                        <button
                          onClick={() => ins.type==='signal'||ins.type==='whale' ? router.push('/alpha') : ins.type==='market'||ins.type==='report' ? router.push('/market') : router.push('/alpha/deals')}
                          style={{ padding:'9px', borderRadius:'9px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', marginTop:'4px' }}>
                          Voir le détail →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </>
  )
}
