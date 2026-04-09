'use client'
import { useState, useMemo, useEffect, useRef } from 'react'

const DEALS = [
  { name:'Blissey V Alt Art',    set:'Chilling Reign', fair:180,listed:128,gap:28,conf:81,source:'eBay',lang:'EN',signal:'S' as const,psa:null,  vol:34,trend:12.4,why:'PSA Pop tr\u00e8s faible, Alt Art populaire, momentum acheteur',img:'https://assets.tcgdex.net/en/swsh/swsh6/TG13/high.webp' },
  { name:'Espeon VMAX Alt Art',  set:'Evolving Skies', fair:420,listed:318,gap:24,conf:74,source:'CM',  lang:'JP',signal:'A' as const,psa:1240, vol:56,trend:8.5, why:'Version JP toujours sous-cot\u00e9e vs EN, set Eevee en hausse',img:'https://assets.tcgdex.net/en/swsh/swsh7/203/high.webp' },
  { name:'Glaceon VMAX Alt Art', set:'Evolving Skies', fair:260,listed:198,gap:24,conf:69,source:'eBay',lang:'EN',signal:'A' as const,psa:null,  vol:41,trend:6.2, why:'Momentum Eevee set, Glaceon en retard vs Umbreon',img:'https://assets.tcgdex.net/en/swsh/swsh7/209/high.webp' },
  { name:'Leafeon VMAX Alt Art', set:'Evolving Skies', fair:310,listed:241,gap:22,conf:72,source:'CM',  lang:'EN',signal:'B' as const,psa:null,  vol:38,trend:7.1, why:'Set complet Eevee, toutes les \u00e9volutions montent',img:'https://assets.tcgdex.net/en/swsh/swsh7/205/high.webp' },
  { name:'Ditto V Alt Art',      set:'Fusion Strike',  fair:95, listed:74, gap:22,conf:61,source:'eBay',lang:'JP',signal:'B' as const,psa:null,  vol:18,trend:4.3, why:'Alt Art rare, sous-\u00e9valu\u00e9 vs Gengar du m\u00eame set',img:'https://assets.tcgdex.net/en/swsh/swsh8/284/high.webp' },
  { name:'Vaporeon VMAX Alt Art',set:'Evolving Skies', fair:240,listed:188,gap:22,conf:68,source:'CM',  lang:'EN',signal:'B' as const,psa:2100, vol:29,trend:5.8, why:'Trio Eevee OG en hausse, Vaporeon en retard sur le groupe',img:'https://assets.tcgdex.net/en/swsh/swsh7/203/high.webp' },
  { name:'Mew VMAX Alt Art',     set:'Fusion Strike',  fair:185,listed:148,gap:20,conf:65,source:'eBay',lang:'EN',signal:'B' as const,psa:null,  vol:67,trend:9.1, why:'Mew iconique, Fusion Strike sous-cot\u00e9 globalement',img:'https://assets.tcgdex.net/en/swsh/swsh8/268/high.webp' },
  { name:'Sylveon VMAX Alt Art', set:'Evolving Skies', fair:340,listed:278,gap:18,conf:63,source:'CM',  lang:'FR',signal:'B' as const,psa:null,  vol:22,trend:3.8, why:'Version FR rare, premium fran\u00e7ais pas encore pric\u00e9',img:'https://assets.tcgdex.net/en/swsh/swsh7/211/high.webp' },
]

const SIG:{[k:string]:{bg:string;color:string;border:string;label:string}} = {
  S:{bg:'linear-gradient(135deg,#FEF2F2,#FFF8F8)',color:'#E03020',border:'#FFD0C8',label:'Signal fort'},
  A:{bg:'linear-gradient(135deg,#F5F0FF,#FAF8FF)',color:'#7E57C2',border:'#DDD0F5',label:'Opportunit\u00e9'},
  B:{bg:'linear-gradient(135deg,#F0FFF6,#F8FFFC)',color:'#2E9E6A',border:'#AAEEC8',label:'A surveiller'},
}

function CountUp({target,prefix,suffix,duration=1000}:{target:number;prefix?:string;suffix?:string;duration?:number}){
  const [val,setVal]=useState(0)
  const ref=useRef(0)
  useEffect(()=>{const t0=performance.now()
    ;(function f(t:number){const p=Math.min((t-t0)/duration,1);setVal(Math.round(target*(1-Math.pow(1-p,3))));if(p<1)ref.current=requestAnimationFrame(f)})(t0)
    return()=>cancelAnimationFrame(ref.current)
  },[target,duration])
  return <>{prefix}{val.toLocaleString('fr-FR')}{suffix}</>
}

function ConfRing({pct,size=36}:{pct:number;size?:number}){
  const r=(size-6)/2,c=2*Math.PI*r,dash=(pct/100)*c
  const color=pct>=75?'#2E9E6A':pct>=60?'#EF9F27':'#E03020'
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F0F0F0" strokeWidth={3}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{transition:'stroke-dasharray .8s cubic-bezier(.2,.8,.2,1)'}}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fontSize={10} fontWeight={700} fill={color} fontFamily="var(--font-data)">{pct}</text>
    </svg>
  )
}

function MiniTrend({trend}:{trend:number}){
  const pts=Array.from({length:12},(_,i)=>40-((trend/15)*30)*(i/11)+Math.sin(i*1.2)*6*(1-i/14))
  const d=pts.map((y,i)=>(i===0?'M':'L')+' '+(i*6)+' '+y).join(' ')
  return <svg width={66} height={44} viewBox="0 0 66 44"><path d={d} fill="none" stroke={trend>=0?'#2E9E6A':'#E03020'} strokeWidth={1.5} strokeLinecap="round"/></svg>
}

type SortKey='gap'|'conf'|'potential'|'price'

export function SousEvalues({ isPro = false }: { isPro?: boolean }){
  const [sort,setSort]=useState<SortKey>('gap')
  const [filterSignal,setFilterSignal]=useState<string>('all')
  const [expanded,setExpanded]=useState<string|null>(null)

  const filtered=useMemo(()=>{
    let l=[...DEALS]
    if(filterSignal!=='all')l=l.filter(d=>d.signal===filterSignal)
    l.sort((a,b)=>sort==='gap'?b.gap-a.gap:sort==='conf'?b.conf-a.conf:sort==='potential'?(b.fair-b.listed)-(a.fair-a.listed):a.listed-b.listed)
    return l
  },[filterSignal,sort])

  const totalPot=filtered.reduce((s,d)=>s+(d.fair-d.listed),0)
  const best=filtered[0]

  return(
    <><style>{`
      @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      .se-card{background:#fff;border:1px solid #EBEBEB;border-radius:14px;overflow:hidden;transition:all .2s cubic-bezier(.2,.8,.2,1);cursor:pointer;animation:slideUp .35s ease-out both}
      .se-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.06);border-color:#DDD}
      .se-card.open{box-shadow:0 8px 32px rgba(0,0,0,.08)}
      .se-chip{padding:4px 12px;border-radius:7px;border:1px solid #EBEBEB;background:#fff;font-size:11px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .12s;color:#888}
      .se-chip:hover{border-color:#C7C7CC;color:#111}
      .se-chip.on{background:#111;color:#fff;border-color:#111}
      .se-srt{padding:4px 12px;border-radius:7px;border:none;background:transparent;font-size:11px;color:#AAA;cursor:pointer;font-family:var(--font-display);transition:all .1s}
      .se-srt:hover{color:#111}.se-srt.on{background:#111;color:#fff;border-radius:7px}
    `}</style>

    <div style={{animation:'fadeIn .25s ease-out',width:'100%'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <p style={{fontSize:10,color:'#AAA',textTransform:'uppercase',letterSpacing:'.1em',margin:'0 0 4px',fontFamily:'var(--font-display)'}}>Market</p>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <h1 style={{fontSize:26,fontWeight:600,color:'#111',fontFamily:'var(--font-display)',letterSpacing:'-.5px',margin:0}}>Sous-{'\u00e9'}valu{'\u00e9'}s</h1>
            <span style={{fontSize:9,fontWeight:700,background:'#E03020',color:'#fff',padding:'3px 8px',borderRadius:4,fontFamily:'var(--font-display)'}}>PRO</span>
          </div>
          <div style={{fontSize:12,color:'#888',marginTop:4}}>D{'\u00e9'}tection IA de cartes sous leur valeur march{'\u00e9'}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#2E9E6A',animation:'pulse 1.5s infinite'}}/>
          <span style={{fontSize:11,color:'#2E9E6A',fontWeight:600,fontFamily:'var(--font-display)'}}>LIVE</span>
          <span style={{fontSize:11,color:'#AAA'}}>{'\u00b7'} Mis {'\u00e0'} jour il y a 8 min</span>
        </div>
      </div>

      {/* Hero — Best Deal */}
      {best&&(
        <div style={{background:'linear-gradient(135deg,#111 0%,#1a1a1f 100%)',borderRadius:16,padding:'22px 26px',marginBottom:20,display:'flex',alignItems:'center',gap:24,animation:'slideUp .35s ease-out',cursor:'pointer',transition:'transform .2s',position:'relative',overflow:'hidden'}}
          onClick={()=>setExpanded(expanded===best.name?null:best.name)}
          onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-1px)')} onMouseLeave={e=>(e.currentTarget.style.transform='translateY(0)')}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#FFD700,#FF8C00,#E03020)'}}/>
          <img src={best.img} alt="" style={{width:72,height:100,objectFit:'cover',borderRadius:8,border:'2px solid rgba(255,255,255,.1)',flexShrink:0}} onError={e=>{(e.target as HTMLImageElement).style.opacity='.3'}}/>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontSize:10,fontWeight:700,color:'#FFD700',background:'rgba(255,215,0,.12)',padding:'3px 8px',borderRadius:4,fontFamily:'var(--font-display)',letterSpacing:'.04em'}}>MEILLEUR DEAL</span>
              <span style={{fontSize:10,fontWeight:700,color:'#fff',background:SIG[best.signal].color,padding:'3px 8px',borderRadius:4,fontFamily:'var(--font-display)'}}>Tier {best.signal}</span>
            </div>
            <div style={{fontSize:18,fontWeight:600,color:'#fff',fontFamily:'var(--font-display)',letterSpacing:'-.3px'}}>{best.name}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>{best.set} {'\u00b7'} {best.source} {'\u00b7'} {best.lang}</div>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{fontSize:32,fontWeight:700,color:'#fff',fontFamily:'var(--font-data)',letterSpacing:'-1.5px',lineHeight:1}}><CountUp target={best.listed} suffix={' \u20ac'}/></div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.35)',textDecoration:'line-through',fontFamily:'var(--font-data)',marginTop:2}}>{best.fair} {'\u20ac'}</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8,marginTop:6}}>
              <span style={{fontSize:16,fontWeight:700,color:'#4ADE80',fontFamily:'var(--font-data)'}}>-{best.gap}%</span>
              <span style={{fontSize:12,color:'#4ADE80',background:'rgba(74,222,128,.1)',padding:'2px 8px',borderRadius:5,fontFamily:'var(--font-data)',fontWeight:600}}>+{best.fair-best.listed} {'\u20ac'}</span>
            </div>
          </div>
          <div style={{flexShrink:0,textAlign:'center'}}>
            <div style={{position:'relative',width:48,height:48}}>
              <svg width={48} height={48} viewBox="0 0 48 48">
                <circle cx={24} cy={24} r={20} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={3}/>
                <circle cx={24} cy={24} r={20} fill="none" stroke="#4ADE80" strokeWidth={3}
                  strokeDasharray={`${best.conf/100*2*Math.PI*20} ${2*Math.PI*20}`} strokeLinecap="round" transform="rotate(-90 24 24)"
                  style={{transition:'stroke-dasharray .8s ease'}}/>
                <text x={24} y={27} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff" fontFamily="var(--font-data)">{best.conf}</text>
              </svg>
            </div>
            <div style={{fontSize:8,color:'rgba(255,255,255,.3)',marginTop:2}}>confiance</div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {[
          {l:'Potentiel total',v:<CountUp target={totalPot} prefix="+" suffix={' \u20ac'}/>,color:'#2E9E6A'},
          {l:'D\u00e9cote moyenne',v:'-'+Math.round(filtered.reduce((s,d)=>s+d.gap,0)/filtered.length)+'%',color:'#111'},
          {l:'Confiance moy.',v:Math.round(filtered.reduce((s,d)=>s+d.conf,0)/filtered.length)+'%',color:'#111'},
          {l:'Deals actifs',v:String(filtered.length),color:'#111'},
        ].map(s=>(
          <div key={s.l} style={{flex:1,background:'#fff',border:'1px solid #EBEBEB',borderRadius:10,padding:'12px 14px',textAlign:'center'}}>
            <div style={{fontSize:20,fontWeight:700,fontFamily:'var(--font-data)',letterSpacing:'-.5px',color:s.color}}>{s.v}</div>
            <div style={{fontSize:10,color:'#AAA',fontFamily:'var(--font-display)',marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14}}>
        {['all','S','A','B'].map(v=>(
          <button key={v} className={'se-chip'+(filterSignal===v?' on':'')} onClick={()=>setFilterSignal(v)}>
            {v==='all'?'Tous les deals':'Tier '+v}
          </button>
        ))}
        <div style={{flex:1}}/>
        <span style={{fontSize:10,color:'#BBB',marginRight:4}}>Trier :</span>
        {([['gap','D\u00e9cote'],['conf','Confiance'],['potential','Potentiel'],['price','Prix']] as [SortKey,string][]).map(([k,l])=>(
          <button key={k} className={'se-srt'+(sort===k?' on':'')} onClick={()=>setSort(k)}>{l}</button>
        ))}
      </div>

      {/* Cards grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))',gap:12}}>
        {filtered.map((d,idx)=>{
          const sig=SIG[d.signal]
          const potential=d.fair-d.listed
          const isOpen=expanded===d.name
          const isBest=idx===0
          return(
            <div key={d.name} className={'se-card'+(isOpen?' open':'')} style={{animationDelay:idx*.04+'s'}} onClick={()=>setExpanded(isOpen?null:d.name)}>
              {/* Top accent */}
              <div style={{height:3,background:sig.color,opacity:.6}}/>

              <div style={{padding:'16px 18px'}}>
                {/* Header */}
                <div style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:12}}>
                  <img src={d.img} alt="" style={{width:52,height:72,objectFit:'cover',borderRadius:6,border:'1px solid #F0F0F0',flexShrink:0}}
                    onError={e=>{(e.target as HTMLImageElement).style.background='#F5F5F7'}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                      <span style={{fontSize:9,fontWeight:700,color:sig.color,background:sig.bg,border:'1px solid '+sig.border,padding:'2px 7px',borderRadius:4,fontFamily:'var(--font-display)'}}>{d.signal}</span>
                      <span style={{fontSize:9,color:'#AAA',background:'#F5F5F7',padding:'2px 6px',borderRadius:3,fontFamily:'var(--font-display)'}}>{d.source}</span>
                      <span style={{fontSize:9,color:'#AAA',background:'#F5F5F7',padding:'2px 6px',borderRadius:3,fontFamily:'var(--font-display)'}}>{d.lang}</span>
                    </div>
                    <div style={{fontSize:14,fontWeight:600,fontFamily:'var(--font-display)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name}</div>
                    <div style={{fontSize:10,color:'#BBB',marginTop:1}}>{d.set}</div>
                  </div>
                  <MiniTrend trend={d.trend}/>
                </div>

                {/* Price row */}
                <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:12}}>
                  <div>
                    <div style={{fontSize:24,fontWeight:700,fontFamily:'var(--font-data)',letterSpacing:'-1px',lineHeight:1}}>{d.listed} {'\u20ac'}</div>
                    <div style={{fontSize:11,color:'#AAA',marginTop:2,fontFamily:'var(--font-data)'}}>
                      March{'\u00e9'} <span style={{textDecoration:'line-through'}}>{d.fair} {'\u20ac'}</span>
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:22,fontWeight:700,color:'#2E9E6A',fontFamily:'var(--font-data)',letterSpacing:'-.5px',lineHeight:1}}>-{d.gap}%</div>
                    <div style={{fontSize:11,color:'#2E9E6A',fontFamily:'var(--font-data)',marginTop:2}}>+{potential} {'\u20ac'}</div>
                  </div>
                </div>

                {/* Confidence + Volume bar */}
                <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderTop:'1px solid #F5F5F5'}}>
                  <ConfRing pct={d.conf}/>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:10,color:'#AAA'}}>Confiance IA</span>
                      <span style={{fontSize:10,fontWeight:600,color:d.conf>=75?'#2E9E6A':d.conf>=60?'#EF9F27':'#E03020',fontFamily:'var(--font-data)'}}>{d.conf}%</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span style={{fontSize:10,color:'#AAA'}}>Volume 24h</span>
                      <span style={{fontSize:10,fontWeight:600,fontFamily:'var(--font-data)'}}>{d.vol} tx</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                      <span style={{fontSize:10,color:'#AAA'}}>Tendance 7j</span>
                      <span style={{fontSize:10,fontWeight:600,fontFamily:'var(--font-data)',color:d.trend>=0?'#2E9E6A':'#E03020'}}>+{d.trend}%</span>
                    </div>
                  </div>
                </div>

                {/* Expandable detail */}
                <div style={{maxHeight:isOpen?300:0,opacity:isOpen?1:0,overflow:'hidden',transition:'max-height .25s ease,opacity .2s'}}>
                  <div style={{paddingTop:12,borderTop:'1px solid #F5F5F5'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#888',fontFamily:'var(--font-display)',marginBottom:6}}>Analyse IA</div>
                    <div style={{fontSize:12,color:'#555',lineHeight:1.6,marginBottom:12,background:'#FAFBFC',padding:'10px 12px',borderRadius:8,borderLeft:'3px solid '+sig.color}}>{d.why}</div>
                    <div style={{display:'flex',gap:8}}>
                      {d.psa&&<div style={{background:'#F5F5F7',borderRadius:6,padding:'6px 10px',fontSize:10}}>
                        <span style={{color:'#AAA'}}>PSA Pop </span><span style={{fontWeight:600,fontFamily:'var(--font-data)'}}>{d.psa.toLocaleString('fr-FR')}</span>
                      </div>}
                      <div style={{background:'#F0FFF6',borderRadius:6,padding:'6px 10px',fontSize:10}}>
                        <span style={{color:'#2E9E6A'}}>ROI potentiel </span><span style={{fontWeight:600,fontFamily:'var(--font-data)',color:'#2E9E6A'}}>+{Math.round(potential/d.listed*100)}%</span>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6,marginTop:10}}>
                      <button onClick={e=>e.stopPropagation()} style={{flex:1,padding:'9px 16px',borderRadius:8,background:'#111',color:'#fff',border:'none',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-display)',transition:'opacity .12s'}}
                        onMouseEnter={e=>(e.currentTarget.style.opacity='.85')} onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
                        Voir sur {d.source} {'\u2192'}
                      </button>
                      <button onClick={e=>e.stopPropagation()} style={{padding:'9px 16px',borderRadius:8,background:'#fff',color:'#111',border:'1px solid #EBEBEB',fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'var(--font-display)',transition:'border-color .12s'}}
                        onMouseEnter={e=>(e.currentTarget.style.borderColor='#111')} onMouseLeave={e=>(e.currentTarget.style.borderColor='#EBEBEB')}>
                        + Portfolio
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length===0&&(
        <div style={{padding:40,textAlign:'center',color:'#BBB',fontSize:13,fontFamily:'var(--font-display)',background:'#fff',border:'1px solid #EBEBEB',borderRadius:14}}>
          Aucun deal ne correspond aux filtres
        </div>
      )}
    </div>
    </>
  )
}
