'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { getCardImageUrl } from '@/lib/images'
import { SNOW, FONT, GLASS, RADIUS } from '@/lib/design/snow'

type Tier = 'S' | 'A' | 'B'
type FilterTier = 'all' | Tier

interface Signal {
  id: string; tier: Tier; name: string; set: string; lang: 'EN'|'FR'|'JP'; source: 'eBay'|'CM'|'Mercari'
  psaPop?: number; watchers: number; price: number; marketValue: number; target: number
  confidence: number; momentum: number; upside: number; detectedAt: number
  aiReason: string; tags: string[]; sparkline: number[]; setId?: string; localId?: string
}

const SIGNALS: Signal[] = [
  { id:'1', tier:'S', name:'Charizard Alt Art', set:'Obsidian Flames', lang:'EN', source:'eBay', psaPop:312, watchers:847, price:920, marketValue:1240, target:1300, confidence:72, momentum:53, upside:53, detectedAt:Date.now()-3.7*36e5, aiReason:"Alt Art extrêmement rare — PSA Pop de seulement 312 exemplaires. Momentum acheteur détecté sur eBay JP et Cardmarket. Le marché JP est en avance de 2-3 semaines sur l'EN.", tags:['PSA Pop faible','Momentum JP','Alt Art rare','eBay actif'], sparkline:[680,710,690,740,780,820,790,850,870,920], setId:'sv03', localId:'228' },
  { id:'2', tier:'A', name:'Umbreon VMAX Alt Art', set:'Evolving Skies', lang:'EN', source:'CM', psaPop:2840, watchers:412, price:880, marketValue:1090, target:1150, confidence:68, momentum:24, upside:24, detectedAt:Date.now()-8*36e5, aiReason:"Demande soutenue sur Cardmarket, spread achat/vente en compression. Historiquement corrélé avec une hausse dans les 4-6 semaines.", tags:['Spread serré','Demande EU','Blue chip'], sparkline:[760,780,800,790,830,850,840,860,870,880], setId:'swsh7', localId:'215' },
  { id:'3', tier:'A', name:'Rayquaza VMAX Alt Art', set:'Evolving Skies', lang:'EN', source:'eBay', watchers:298, price:740, marketValue:970, target:1050, confidence:74, momentum:31, upside:31, detectedAt:Date.now()-12*36e5, aiReason:"Volume de recherche en hausse de 40% sur 7 jours. Peu de listings disponibles — tension offre/demande imminente.", tags:['Volume recherche ↑','Stock faible','Evolving Skies'], sparkline:[580,600,590,620,650,680,700,710,730,740], setId:'swsh7', localId:'218' },
  { id:'4', tier:'B', name:'Mewtwo V Alt Art', set:'Pokémon GO', lang:'JP', source:'CM', watchers:156, price:280, marketValue:358, target:400, confidence:61, momentum:28, upside:28, detectedAt:Date.now()-24*36e5, aiReason:"Carte JP sous-évaluée par rapport à l'équivalent EN (+35% d'écart). Potentiel de rattrapage si la hype Mewtwo continue.", tags:['JP discount','Rattrapage','Pokémon GO'], sparkline:[220,230,240,235,250,260,255,270,275,280], setId:'swsh10.5', localId:'TG22' },
  { id:'5', tier:'A', name:'Lugia Neo Genesis Holo', set:'Neo Genesis', lang:'EN', source:'eBay', psaPop:2100, watchers:203, price:580, marketValue:748, target:820, confidence:71, momentum:29, upside:29, detectedAt:Date.now()-36*36e5, aiReason:"Vintage WOTC avec une demande constante. Les prix se stabilisent après une correction — point d'entrée attractif pour du long terme.", tags:['Vintage WOTC',"Point d'entrée",'Long terme'], sparkline:[620,610,590,570,560,550,560,570,575,580], setId:'neo1', localId:'9' },
  { id:'6', tier:'B', name:'Gengar VMAX Alt Art', set:'VMAX Climax', lang:'JP', source:'Mercari', watchers:189, price:340, marketValue:420, target:480, confidence:58, momentum:18, upside:24, detectedAt:Date.now()-48*36e5, aiReason:"Set VMAX Climax en épuisement progressif. Gengar reste un des Pokémon les plus populaires — potentiel spéculatif modéré.", tags:['Set épuisé','Fan favorite','JP exclusif'], sparkline:[290,300,310,305,320,315,330,335,340,340], setId:'swsh12.5', localId:'271' },
]

const TC: Record<Tier,{color:string;glow:string;bg:string;grad:string}> = {
  S:{color:'#FF6B00',glow:'rgba(255,107,0,.3)',bg:'rgba(255,107,0,.06)',grad:'linear-gradient(135deg,#FF6B00,#FF9500)'},
  A:{color:'#8B5CF6',glow:'rgba(139,92,246,.3)',bg:'rgba(139,92,246,.06)',grad:'linear-gradient(135deg,#8B5CF6,#A78BFA)'},
  B:{color:'#10B981',glow:'rgba(16,185,129,.3)',bg:'rgba(16,185,129,.06)',grad:'linear-gradient(135deg,#10B981,#34D399)'},
}
const FL: Record<string,string> = {EN:'🇬🇧',FR:'🇫🇷',JP:'🇯🇵'}
const POS = SNOW.greenAccent
const POS_BG = 'rgba(38,166,91,.08)'

function Spark({data,color,w=80,h=28}:{data:number[];color:string;w?:number;h?:number}) {
  const mn=Math.min(...data),mx=Math.max(...data),r=mx-mn||1
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/r)*(h-4)-2}`).join(' ')
  const uid=`s${color.replace('#','')}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block',flexShrink:0}}>
      <defs><linearGradient id={uid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.18"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${uid})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={w} cy={h-((data[data.length-1]-mn)/r)*(h-4)-2} r="2.5" fill={color}><animate attributeName="r" values="2.5;4;2.5" dur="2s" repeatCount="indefinite"/></circle>
    </svg>
  )
}

function Ring({value,color,sz=52}:{value:number;color:string;sz?:number}) {
  const r=(sz-7)/2,c=2*Math.PI*r,off=c-(value/100)*c
  return (
    <div style={{position:'relative',width:sz,height:sz,flexShrink:0}}>
      <svg width={sz} height={sz} style={{transform:'rotate(-90deg)'}}>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={SNOW.borderSoft} strokeWidth="4.5"/>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={color} strokeWidth="4.5" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{transition:'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)'}}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:800,color:SNOW.ink,fontFamily:FONT.data}}>{value}<span style={{fontSize:'8px',fontWeight:600}}>%</span></div>
    </div>
  )
}

function Timer({ts}:{ts:number}) {
  const [n,setN]=useState(Date.now())
  useEffect(()=>{const t=setInterval(()=>setN(Date.now()),60000);return()=>clearInterval(t)},[])
  const d=n-ts,h=Math.floor(d/36e5),m=Math.floor((d%36e5)/6e4)
  return <span style={{fontSize:'11px',color:SNOW.mutedExtraLight,fontFamily:FONT.data,fontVariantNumeric:'tabular-nums'}}>{h>0?`${h}h${String(m).padStart(2,'0')}`:`${m}min`}</span>
}

export default function AlphaSignals() {
  const [filter,setFilter]=useState<FilterTier>('all')
  const [expanded,setExpanded]=useState<string|null>(null)
  const [dismissed,setDismissed]=useState<Set<string>>(new Set())
  const [hovered,setHovered]=useState<string|null>(null)
  const [scanPulse,setScanPulse]=useState(false)
  const [revealed,setRevealed]=useState(0)

  const glassShadow = GLASS.card.boxShadow as string

  useEffect(()=>{let i=0;const t=setInterval(()=>{i++;setRevealed(i);if(i>=SIGNALS.length)clearInterval(t)},90);return()=>clearInterval(t)},[])
  useEffect(()=>{const t=setInterval(()=>{setScanPulse(true);setTimeout(()=>setScanPulse(false),2200)},14000);return()=>clearInterval(t)},[])

  const filtered=useMemo(()=>SIGNALS.filter(s=>!dismissed.has(s.id)).filter(s=>filter==='all'||s.tier===filter),[filter,dismissed])
  const stats=useMemo(()=>{
    const a=SIGNALS.filter(s=>!dismissed.has(s.id))
    return {s:a.filter(s=>s.tier==='S').length,a:a.filter(s=>s.tier==='A').length,b:a.filter(s=>s.tier==='B').length,totalUp:`€${Math.round(a.reduce((x,s)=>x+(s.target-s.price),0)).toLocaleString()}`}
  },[dismissed])

  const tilt=useCallback((e:React.MouseEvent<HTMLDivElement>)=>{
    const el=e.currentTarget,r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5
    el.style.transform=`perspective(900px) rotateY(${x*5}deg) rotateX(${-y*4}deg) scale(1.008)`
  },[])
  const untilt=useCallback((e:React.MouseEvent<HTMLDivElement>)=>{e.currentTarget.style.transform='perspective(900px) rotateY(0) rotateX(0) scale(1)'},[])

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulseLive{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}
        @keyframes scanSweep{0%{left:-60%}100%{left:100%}}
        @keyframes barGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes tagPop{from{opacity:0;transform:scale(.85) translateY(4px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes heroShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes shimmerGold{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes countPop{from{opacity:0;transform:translateY(8px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}

        .a-hero{
          background:linear-gradient(135deg,rgba(17,17,20,.86) 0%,rgba(26,26,30,.82) 35%,rgba(13,13,15,.86) 70%,rgba(17,17,20,.86) 100%);
          background-size:300% 300%;animation:heroShift 10s ease infinite;
          backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);
          border:.5px solid rgba(255,255,255,.08);
          box-shadow:0 8px 32px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.08);
        }
        .a-scan{position:absolute;top:0;bottom:0;width:50%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent);animation:scanSweep 2.2s ease-in-out;pointer-events:none}

        .a-card{transition:transform .22s ease-out,box-shadow .3s;will-change:transform;cursor:pointer;position:relative;overflow:hidden}
        .a-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2.5px;opacity:0;transition:opacity .3s;z-index:2}
        .a-card:hover::before{opacity:1}
        .a-card-S::before{background:linear-gradient(90deg,#FF6B00,#FF9500)}
        .a-card-A::before{background:linear-gradient(90deg,#8B5CF6,#A78BFA)}
        .a-card-B::before{background:linear-gradient(90deg,#10B981,#34D399)}
        .a-card-S:hover{box-shadow:0 12px 40px rgba(255,107,0,.12),0 0 0 1px rgba(255,107,0,.18)!important}
        .a-card-A:hover{box-shadow:0 12px 40px rgba(139,92,246,.12),0 0 0 1px rgba(139,92,246,.18)!important}
        .a-card-B:hover{box-shadow:0 12px 40px rgba(16,185,129,.12),0 0 0 1px rgba(16,185,129,.18)!important}

        .a-card-img{transition:transform .4s ease;border-radius:6px;object-fit:cover}
        .a-card:hover .a-card-img{transform:scale(1.08) rotate(1deg)}

        .a-tier-btn{transition:all .2s;position:relative;overflow:hidden}
        .a-tier-btn::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 30%,rgba(255,255,255,.12) 50%,transparent 70%);transform:translateX(-100%);transition:transform .5s}
        .a-tier-btn:hover::after{transform:translateX(100%)}
        .a-tier-btn-on{transform:scale(1.04)}

        .a-pro{background:linear-gradient(90deg,#C9A84C 0%,#FFE08A 40%,#C9A84C 60%,#FFE08A 100%);background-size:200% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmerGold 3s linear infinite}

        .a-cta{transition:all .2s}.a-cta:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.2)}.a-cta:active{transform:translateY(0)}
        .a-dismiss{transition:color .15s}.a-dismiss:hover{color:#E03020!important}
        .a-bar{transform-origin:left;animation:barGrow .8s cubic-bezier(.4,0,.2,1) both}
        .a-tag{animation:tagPop .25s ease-out both}
        .a-expand{animation:fadeUp .3s ease-out}
        .a-stat{animation:countPop .4s ease-out both}
        .a-upside{transition:transform .2s}.a-upside:hover{transform:scale(1.12)}

        @media(max-width:768px){
          .a-hero-nums{flex-direction:column!important;gap:16px!important}
          .a-hero-total{margin-left:0!important;text-align:left!important}
          .a-hero-total p{text-align:left!important}
          .a-row-grid{grid-template-columns:48px 1fr!important;gap:12px!important;padding:14px 16px!important}
          .a-row-right{display:none!important}
          .a-row-mobile-bottom{display:flex!important}
          .a-expand-inner{flex-direction:column!important}
          .a-expand-price{width:100%!important}
          .a-filters{overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px}
          .a-filters::-webkit-scrollbar{display:none}
        }
        @media(min-width:769px){
          .a-row-mobile-bottom{display:none!important}
        }
      `}</style>

      <div style={{width:'100%',maxWidth:'1000px'}}>

        {/* ═══ HERO (dark glass) ═══ */}
        <div className="a-hero" style={{borderRadius:RADIUS.xl,padding:'28px 30px',marginBottom:'22px',position:'relative',overflow:'hidden'}}>
          {scanPulse&&<div className="a-scan"/>}
          <div style={{position:'absolute',inset:0,opacity:.04,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,1) 39px,rgba(255,255,255,1) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,1) 39px,rgba(255,255,255,1) 40px)',pointerEvents:'none'}}/>
          <div style={{position:'relative',zIndex:1}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'18px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:POS,animation:'pulseLive 2s ease-in-out infinite',boxShadow:'0 0 10px rgba(38,166,91,.5)'}}/>
                <span style={{fontSize:'11px',color:'rgba(255,255,255,.45)',textTransform:'uppercase',letterSpacing:'.15em',fontWeight:600,fontFamily:FONT.display}}>Alpha Signals · Scanning en cours</span>
              </div>
              <span className="a-pro" style={{fontSize:'10px',fontWeight:800,letterSpacing:'.14em',fontFamily:FONT.display}}>PRO</span>
            </div>
            <div className="a-hero-nums" style={{display:'flex',alignItems:'flex-end',gap:'36px',flexWrap:'wrap'}}>
              <div>
                <p style={{fontSize:'48px',fontWeight:800,color:'#fff',margin:0,fontFamily:FONT.display,letterSpacing:'-2px',lineHeight:1}}>{filtered.length}</p>
                <p style={{fontSize:'13px',color:'rgba(255,255,255,.4)',margin:'8px 0 0',fontFamily:FONT.body}}>signaux actifs</p>
              </div>
              {([{l:'S',v:stats.s,c:TC.S.color},{l:'A',v:stats.a,c:TC.A.color},{l:'B',v:stats.b,c:TC.B.color}] as const).map((s,i)=>(
                <div key={i} className="a-stat" style={{animationDelay:`${i*120}ms`}}>
                  <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
                    <div style={{width:'12px',height:'12px',borderRadius:'4px',background:s.c,boxShadow:`0 2px 8px ${s.c}40`}}/>
                    <span style={{fontSize:'22px',fontWeight:800,color:'#fff',fontFamily:FONT.data}}>{s.v}</span>
                  </div>
                  <p style={{fontSize:'10px',color:'rgba(255,255,255,.3)',margin:'3px 0 0 19px',fontFamily:FONT.body}}>Tier {s.l}</p>
                </div>
              ))}
              <div className="a-stat a-hero-total" style={{animationDelay:'360ms',marginLeft:'auto'}}>
                <p style={{fontSize:'10px',color:'rgba(255,255,255,.3)',margin:'0 0 5px',fontFamily:FONT.body,textAlign:'right'}}>Potentiel cumulé</p>
                <p style={{fontSize:'24px',fontWeight:800,color:POS,margin:0,fontFamily:FONT.data,textAlign:'right',textShadow:'0 0 20px rgba(38,166,91,.3)'}}>{stats.totalUp}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ FILTERS (glass) ═══ */}
        <div className="a-filters" style={{display:'flex',gap:'8px',marginBottom:'18px'}}>
          {([{k:'all' as FilterTier,l:'Tous',n:filtered.length},{k:'S' as FilterTier,l:'Tier S',n:stats.s},{k:'A' as FilterTier,l:'Tier A',n:stats.a},{k:'B' as FilterTier,l:'Tier B',n:stats.b}]).map(t=>(
            <button key={t.k} onClick={()=>setFilter(t.k)} className={`a-tier-btn ${filter===t.k?'a-tier-btn-on':''}`} style={{
              padding:'8px 18px',borderRadius:RADIUS.md,fontSize:'12px',fontWeight:600,fontFamily:FONT.display,
              cursor:'pointer',display:'flex',alignItems:'center',gap:'7px',whiteSpace:'nowrap',flexShrink:0,
              ...(filter===t.k
                ? {background:SNOW.ink,color:'#fff',border:`1.5px solid ${SNOW.ink}`}
                : {...GLASS.button,color:SNOW.muted}),
            }}>
              {t.l}<span style={{fontSize:'10px',fontWeight:700,opacity:.5,fontFamily:FONT.data}}>{t.n}</span>
            </button>
          ))}
        </div>

        {/* ═══ CARDS (glass v7) ═══ */}
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {filtered.map((sig,idx)=>{
            const tc=TC[sig.tier],isOpen=expanded===sig.id
            if(idx>=revealed) return null
            return (
              <div key={sig.id} style={{animation:`fadeUp .35s ease-out ${idx*90}ms both`}}>
                <div className={`a-card a-card-${sig.tier}`} onClick={()=>setExpanded(isOpen?null:sig.id)}
                  onMouseMove={tilt} onMouseLeave={e=>{untilt(e);setHovered(null)}} onMouseEnter={()=>setHovered(sig.id)}
                  style={{...GLASS.card,boxShadow:isOpen?`${glassShadow}, 0 0 0 1.5px ${tc.color}30`:glassShadow}}>

                  <div className="a-row-grid" style={{display:'grid',gridTemplateColumns:'48px 52px 1fr auto',alignItems:'center',gap:'16px',padding:'16px 22px'}}>
                    <div style={{
                      width:'42px',height:'42px',borderRadius:'12px',background:tc.grad,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontWeight:800,fontSize:'16px',color:'#fff',fontFamily:FONT.display,
                      boxShadow:hovered===sig.id?`0 4px 18px ${tc.glow}`:'none',transition:'box-shadow .3s',
                    }}>{sig.tier}</div>

                    <div style={{width:'48px',height:'67px',borderRadius:'6px',overflow:'hidden',flexShrink:0,boxShadow:'0 2px 8px rgba(0,0,0,.1)',position:'relative'}}>
                      <img className="a-card-img" src={getCardImageUrl({lang:sig.lang,setId:sig.setId,localId:sig.localId})} alt={sig.name} width={48} height={67} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                      <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at center,${tc.color}15,transparent 70%)`,opacity:hovered===sig.id?1:0,transition:'opacity .3s',pointerEvents:'none'}}/>
                    </div>

                    <div style={{minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                        <span style={{fontSize:'15px',fontWeight:700,color:SNOW.ink,fontFamily:FONT.display}}>{sig.name}</span>
                        <span style={{fontSize:'11px',padding:'2px 7px',borderRadius:'5px',background:SNOW.surface,color:SNOW.muted,fontWeight:500,fontFamily:FONT.body}}>{FL[sig.lang]} {sig.lang}</span>
                        {sig.psaPop&&<span style={{fontSize:'11px',color:SNOW.mutedExtraLight,fontWeight:500,fontFamily:FONT.data}}>PSA Pop {sig.psaPop.toLocaleString()}</span>}
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'14px',marginTop:'5px'}}>
                        <p style={{fontSize:'12px',color:SNOW.mutedExtraLight,margin:0,fontFamily:FONT.body}}>{sig.set} · {sig.source} · {sig.watchers.toLocaleString()} regardent</p>
                        <Spark data={sig.sparkline} color={tc.color} w={70} h={22}/>
                      </div>

                      <div className="a-row-mobile-bottom" style={{display:'none',alignItems:'center',gap:'12px',marginTop:'10px',flexWrap:'wrap'}}>
                        <span style={{fontSize:'16px',fontWeight:700,color:SNOW.ink,fontFamily:FONT.data}}>€{sig.price.toLocaleString()}</span>
                        <span style={{fontSize:'12px',fontWeight:700,color:POS,fontFamily:FONT.data,padding:'2px 8px',borderRadius:'6px',background:POS_BG}}>+{sig.upside}%</span>
                        <Ring value={sig.confidence} color={tc.color} sz={36}/>
                        <Timer ts={sig.detectedAt}/>
                      </div>
                    </div>

                    <div className="a-row-right" style={{display:'flex',alignItems:'center',gap:'18px',flexShrink:0}}>
                      <div style={{textAlign:'right'}}>
                        <p style={{fontSize:'18px',fontWeight:700,color:SNOW.ink,margin:0,fontFamily:FONT.data,letterSpacing:'-.3px'}}>€{sig.price.toLocaleString()}</p>
                        <div className="a-upside" style={{display:'inline-block',marginTop:'4px',padding:'2px 9px',borderRadius:'6px',background:POS_BG}}>
                          <span style={{fontSize:'12px',fontWeight:700,color:POS,fontFamily:FONT.data}}>+{sig.upside}%</span>
                        </div>
                      </div>
                      <Ring value={sig.confidence} color={tc.color} sz={50}/>
                      <div style={{textAlign:'right',minWidth:'48px'}}>
                        <Timer ts={sig.detectedAt}/>
                        <p style={{fontSize:'9px',color:SNOW.borderHover,margin:'2px 0 0',fontFamily:FONT.body}}>détecté</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{transform:isOpen?'rotate(180deg)':'rotate(0)',transition:'transform .25s ease',color:SNOW.borderHover,flexShrink:0}}>
                        <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* ── EXPANDED (glass) ── */}
                {isOpen&&(
                  <div className="a-expand" style={{
                    background:'rgba(255,255,255,.55)',
                    backdropFilter:'blur(18px) saturate(170%)',WebkitBackdropFilter:'blur(18px) saturate(170%)',
                    borderRadius:`0 0 ${RADIUS.lg}px ${RADIUS.lg}px`,border:`1px solid ${tc.color}18`,borderTop:'none',marginTop:'-6px',paddingTop:'6px',
                  }}>
                    <div className="a-expand-inner" style={{padding:'22px 26px 26px',display:'flex',gap:'28px'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',flexDirection:'column',gap:'12px',marginBottom:'22px'}}>
                          {[
                            {label:'Confiance IA',value:sig.confidence,color:'#3B82F6',disp:`${sig.confidence}%`},
                            {label:'PSA Pop',value:sig.psaPop?Math.min(100,Math.round((1-sig.psaPop/5000)*100)):50,color:'#F59E0B',disp:sig.psaPop?`${sig.psaPop.toLocaleString()} ex.`:'—'},
                            {label:'Momentum',value:Math.min(100,sig.momentum*1.5),color:'#10B981',disp:`+${sig.momentum}%`},
                          ].map((b,i)=>(
                            <div key={i} style={{display:'flex',alignItems:'center',gap:'12px'}}>
                              <span style={{fontSize:'11px',color:SNOW.mutedLight,width:'88px',flexShrink:0,fontFamily:FONT.body,fontWeight:500}}>{b.label}</span>
                              <div style={{flex:1,height:'6px',background:SNOW.border,borderRadius:'3px',overflow:'hidden'}}>
                                <div className="a-bar" style={{height:'100%',borderRadius:'3px',background:b.color,width:`${b.value}%`,animationDelay:`${i*180}ms`}}/>
                              </div>
                              <span style={{fontSize:'11px',fontWeight:600,color:SNOW.muted,width:'58px',textAlign:'right',fontFamily:FONT.data}}>{b.disp}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{background:'rgba(255,255,255,.72)',borderRadius:'12px',padding:'16px 18px',border:`1px solid ${SNOW.border}`,position:'relative',overflow:'hidden'}}>
                          <div style={{position:'absolute',top:0,left:0,width:'3px',height:'100%',background:tc.grad}}/>
                          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
                            <div style={{width:'22px',height:'22px',borderRadius:'7px',background:'linear-gradient(135deg,#FF7A5A,#E03020)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:800,color:'#fff'}}>D</div>
                            <span style={{fontSize:'10px',fontWeight:700,color:SNOW.red,textTransform:'uppercase',letterSpacing:'.1em',fontFamily:FONT.display}}>Analyse Nori</span>
                          </div>
                          <p style={{fontSize:'13px',color:SNOW.inkSoft,lineHeight:1.7,margin:0,fontFamily:FONT.body}}>{sig.aiReason}</p>
                        </div>
                        <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'14px'}}>
                          {sig.tags.map((tag,i)=>(
                            <span key={i} className="a-tag" style={{animationDelay:`${i*70}ms`,fontSize:'11px',padding:'5px 12px',borderRadius:'8px',background:tc.bg,color:tc.color,fontWeight:600,fontFamily:FONT.body,border:`1px solid ${tc.color}18`}}>{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="a-expand-price" style={{width:'215px',flexShrink:0,background:'rgba(255,255,255,.72)',borderRadius:RADIUS.lg,border:`1px solid ${SNOW.border}`,padding:'18px',display:'flex',flexDirection:'column',gap:'12px'}}>
                        <div style={{borderRadius:'10px',overflow:'hidden',boxShadow:'0 4px 16px rgba(0,0,0,.1)',marginBottom:'4px'}}>
                          <img src={getCardImageUrl({lang:sig.lang,setId:sig.setId,localId:sig.localId})} alt={sig.name} width={179} height={250} style={{width:'100%',height:'auto',display:'block',borderRadius:'10px'}}/>
                        </div>
                        <Spark data={sig.sparkline} color={tc.color} w={179} h={40}/>
                        {[
                          {l:'Prix actuel',v:`€${sig.price.toLocaleString()}`,c:SNOW.ink,fw:700},
                          {l:'Valeur marché',v:`€${sig.marketValue.toLocaleString()}`,c:SNOW.mutedLight,fw:500},
                          {l:'Cible IA',v:`€${sig.target.toLocaleString()}`,c:POS,fw:700},
                        ].map((r,i)=>(
                          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <span style={{fontSize:'12px',color:SNOW.mutedLight,fontFamily:FONT.body}}>{r.l}</span>
                            <span style={{fontSize:'14px',fontWeight:r.fw,color:r.c,fontFamily:FONT.data}}>{r.v}</span>
                          </div>
                        ))}
                        <div style={{marginTop:'6px',display:'flex',flexDirection:'column',gap:'8px'}}>
                          <button className="a-cta" style={{width:'100%',padding:'12px',borderRadius:RADIUS.md,background:SNOW.ink,color:'#fff',border:'none',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:FONT.display,letterSpacing:'-.2px'}}>Voir le deal →</button>
                          <button className="a-dismiss" onClick={e=>{e.stopPropagation();setDismissed(d=>new Set([...d,sig.id]));setExpanded(null)}} style={{width:'100%',padding:'6px',background:'transparent',border:'none',color:SNOW.borderHover,fontSize:'11px',cursor:'pointer',fontFamily:FONT.body}}>Ignorer ce signal</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filtered.length===0&&(
          <div style={{padding:'80px 20px',textAlign:'center',...GLASS.cardSoft,borderRadius:RADIUS.lg}}>
            <p style={{fontSize:'14px',color:SNOW.mutedExtraLight,margin:0,fontFamily:FONT.body}}>Aucun signal actif pour ce filtre.</p>
          </div>
        )}
      </div>
    </>
  )
}
