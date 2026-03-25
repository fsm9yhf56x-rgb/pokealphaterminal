'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type CardItem = {
  id: string; name: string; set: string; year: number; number: string
  rarity: string; type: string; lang: 'EN'|'JP'|'FR'; condition: string
  graded: boolean; buyPrice: number; curPrice: number; qty: number
  psa?: number; signal?: 'S'|'A'|'B'; hot?: boolean; favorite?: boolean
}

const CARDS: CardItem[] = [
  { id:'1',  name:'Charizard Alt Art',    set:'SV151',           year:2023, number:'006', rarity:'Alt Art',     type:'fire',     lang:'EN', condition:'PSA 9',  graded:true,  buyPrice:620, curPrice:920,  qty:1, psa:312,  signal:'S', hot:true,  favorite:true  },
  { id:'2',  name:'Umbreon VMAX Alt Art', set:'Evolving Skies',  year:2021, number:'215', rarity:'Alt Art',     type:'dark',     lang:'EN', condition:'Raw',    graded:false, buyPrice:340, curPrice:880,  qty:2,            signal:'A',        favorite:true  },
  { id:'3',  name:'Charizard VMAX',       set:'Champion Path',   year:2020, number:'074', rarity:'Secret Rare', type:'fire',     lang:'EN', condition:'PSA 10', graded:true,  buyPrice:280, curPrice:420,  qty:1, psa:1240,                     favorite:false },
  { id:'4',  name:'Gengar VMAX Alt Art',  set:'Fusion Strike',   year:2021, number:'271', rarity:'Alt Art',     type:'psychic',  lang:'EN', condition:'Raw',    graded:false, buyPrice:220, curPrice:340,  qty:1,                                favorite:false },
  { id:'5',  name:'Pikachu VMAX RR',      set:'Vivid Voltage',   year:2020, number:'188', rarity:'Secret Rare', type:'electric', lang:'JP', condition:'PSA 9',  graded:true,  buyPrice:80,  curPrice:110,  qty:3, psa:4200,                     favorite:false },
  { id:'6',  name:'Rayquaza VMAX Alt',    set:'Evolving Skies',  year:2021, number:'218', rarity:'Alt Art',     type:'electric', lang:'EN', condition:'Raw',    graded:false, buyPrice:480, curPrice:740,  qty:1,            signal:'A',        favorite:true  },
  { id:'7',  name:'Mewtwo V Alt Art',     set:'Pokemon GO',      year:2022, number:'071', rarity:'Alt Art',     type:'psychic',  lang:'JP', condition:'Raw',    graded:false, buyPrice:160, curPrice:280,  qty:2,            signal:'B',        favorite:false },
  { id:'8',  name:'Blastoise Base Set',   set:'Base Set',        year:1999, number:'002', rarity:'Holo Rare',   type:'water',    lang:'EN', condition:'PSA 9',  graded:true,  buyPrice:480, curPrice:620,  qty:1, psa:890,                      favorite:true  },
  { id:'9',  name:'Lugia Neo Genesis',    set:'Neo Genesis',     year:2000, number:'009', rarity:'Holo Rare',   type:'water',    lang:'EN', condition:'PSA 8',  graded:true,  buyPrice:320, curPrice:580,  qty:1, psa:2100,                     favorite:true  },
  { id:'10', name:'Mew ex Alt Art',       set:'SV151',           year:2023, number:'205', rarity:'Alt Art',     type:'psychic',  lang:'JP', condition:'Raw',    graded:false, buyPrice:95,  curPrice:140,  qty:4,                                favorite:false },
  { id:'11', name:'Gardevoir ex SAR',     set:'Scarlet & Violet',year:2023, number:'245', rarity:'Secret Rare', type:'psychic',  lang:'FR', condition:'Raw',    graded:false, buyPrice:60,  curPrice:95,   qty:2,                                favorite:false },
  { id:'12', name:'Miraidon ex SAR',      set:'Scarlet & Violet',year:2023, number:'254', rarity:'Secret Rare', type:'electric', lang:'FR', condition:'Raw',    graded:false, buyPrice:45,  curPrice:72,   qty:3,                                favorite:false },
]

const EC: Record<string,string> = {
  fire:'#FF6B35', water:'#42A5F5', psychic:'#C855D4',
  dark:'#7E57C2', electric:'#D4A800', grass:'#3DA85A',
}
const EG: Record<string,string> = {
  fire:'rgba(255,107,53,0.55)', water:'rgba(66,165,245,0.55)',
  psychic:'rgba(200,85,212,0.55)', dark:'rgba(126,87,194,0.55)',
  electric:'rgba(212,168,0,0.55)', grass:'rgba(61,168,90,0.55)',
}
const LS: Record<string,{flag:string;bg:string;color:string}> = {
  EN:{ flag:'🇺🇸', bg:'#FFF5F0', color:'#C84B00' },
  JP:{ flag:'🇯🇵', bg:'#F0F5FF', color:'#003DAA' },
  FR:{ flag:'🇫🇷', bg:'#F0FFF5', color:'#00660A' },
}
const HOLO_RARITIES = ['Alt Art','Secret Rare','Gold Star']
const TIER_STYLE: Record<string,string> = {
  S:'linear-gradient(135deg,#FFD700,#FF8C00)',
  A:'linear-gradient(135deg,#C855D4,#9C27B0)',
  B:'linear-gradient(135deg,#2E9E6A,#1A7A4A)',
}

type View = 'vitrine'|'binder'|'wrapped'

const tiltMove = (e: React.MouseEvent<HTMLDivElement>) => {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = ((e.clientX - r.left) / r.width  - 0.5) * 22
  const y = ((e.clientY - r.top)  / r.height - 0.5) * -22
  el.style.transform = `perspective(700px) rotateY(${x}deg) rotateX(${y}deg) translateZ(10px) scale(1.03)`
  const h = el.querySelector('.hm') as HTMLElement
  if (h) {
    h.style.backgroundPosition = `${Math.round((e.clientX-r.left)/r.width*100)}% ${Math.round((e.clientY-r.top)/r.height*100)}%`
    h.style.opacity = '0.38'
  }
}
const tiltEnd = (e: React.MouseEvent<HTMLDivElement>) => {
  const el = e.currentTarget
  el.style.transition = 'transform 0.6s cubic-bezier(.23,1,.32,1)'
  el.style.transform = ''
  const h = el.querySelector('.hm') as HTMLElement
  if (h) h.style.opacity = '0'
  setTimeout(() => { el.style.transition = '' }, 600)
}

export function Holdings() {
  const router = useRouter()
  const [view,      setView]      = useState<View>('vitrine')
  const [selected,  setSelected]  = useState<string|null>(null)
  const [favs,      setFavs]      = useState<Set<string>>(new Set(CARDS.filter(c=>c.favorite).map(c=>c.id)))
  const [shareOpen, setShareOpen] = useState(false)
  const [filterType,setFilterType]= useState('all')
  const [binderPage,setBinderPage]= useState(0)

  const toggleFav = (id:string, e:React.MouseEvent) => {
    e.stopPropagation()
    setFavs(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })
  }

  const totalBuy  = CARDS.reduce((s,c)=>s+c.buyPrice*c.qty, 0)
  const totalCur  = CARDS.reduce((s,c)=>s+c.curPrice*c.qty, 0)
  const totalGain = totalCur - totalBuy
  const totalROI  = Math.round((totalGain/totalBuy)*100)
  const bestCard  = [...CARDS].sort((a,b)=>((b.curPrice-b.buyPrice)/b.buyPrice)-((a.curPrice-a.buyPrice)/a.buyPrice))[0]

  const filtered = CARDS
    .filter(c => filterType==='all' || c.type===filterType || (filterType==='fav'&&favs.has(c.id)))
    .sort((a,b)=>((b.curPrice-b.buyPrice)/b.buyPrice)-((a.curPrice-a.buyPrice)/a.buyPrice))

  const selCard = selected ? CARDS.find(c=>c.id===selected) : null

  const BINDER_SLOTS = 9
  const binderPages  = Math.ceil(CARDS.length / BINDER_SLOTS)
  const binderCards  = CARDS.slice(binderPage*BINDER_SLOTS, (binderPage+1)*BINDER_SLOTS)

  return (
    <>
      <style>{`
        @keyframes entrance  { from{opacity:0;transform:scale(0.88) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes breatheS  { 0%,100%{box-shadow:0 0 18px var(--gc),0 4px 24px rgba(0,0,0,.6)} 50%{box-shadow:0 0 42px var(--gc),0 8px 40px rgba(0,0,0,.7),0 0 60px var(--gc)} }
        @keyframes breatheA  { 0%,100%{box-shadow:0 0 12px var(--gc),0 4px 18px rgba(0,0,0,.5)} 50%{box-shadow:0 0 28px var(--gc),0 6px 28px rgba(0,0,0,.6)} }
        @keyframes holoShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes ptcl      { 0%{transform:translateY(0) translateX(0) scale(1);opacity:.8} 100%{transform:translateY(-28px) translateX(4px) scale(0);opacity:0} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimGlow  { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes pageIn    { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }

        .gem         { position:relative; border-radius:14px; overflow:hidden; cursor:pointer; will-change:transform; }
        .gem .holo   { position:absolute;inset:0;border-radius:14px;background:linear-gradient(135deg,#ff0080 0%,#ff8c00 15%,#ffd700 30%,#00ff88 45%,#00cfff 60%,#8b00ff 75%,#ff0080 90%);background-size:400% 400%;mix-blend-mode:overlay;opacity:0;pointer-events:none;transition:opacity .4s;animation:holoShift 10s ease infinite; }
        .gem .hm     { position:absolute;inset:0;border-radius:14px;background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.4) 0%,rgba(255,255,255,.1) 40%,transparent 70%);opacity:0;pointer-events:none;mix-blend-mode:overlay;transition:opacity .3s; }
        .gem:hover .holo { opacity:.3; }
        .gem .ptcl   { position:absolute;width:3px;height:3px;border-radius:50%;pointer-events:none;opacity:0; }
        .gem:hover .ptcl:nth-child(1) { animation:ptcl 2s ease-out infinite; }
        .gem:hover .ptcl:nth-child(2) { animation:ptcl 2.4s .5s ease-out infinite; }
        .gem:hover .ptcl:nth-child(3) { animation:ptcl 1.8s 1s ease-out infinite; }
        .breathe-S   { animation:breatheS 2.5s ease-in-out infinite; }
        .breathe-A   { animation:breatheA 3s ease-in-out infinite; }
        .vtab        { padding:7px 18px;border-radius:99px;border:1px solid rgba(255,255,255,.12);background:transparent;color:rgba(255,255,255,.4);font-size:12px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .15s;letter-spacing:.02em; }
        .vtab:hover  { border-color:rgba(255,255,255,.25);color:rgba(255,255,255,.7); }
        .vtab.on     { background:rgba(255,255,255,.1) !important;border-color:rgba(255,255,255,.25) !important;color:#fff !important; }
        .fpill       { padding:5px 12px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);font-size:12px;cursor:pointer;font-family:var(--font-display);transition:all .15s; }
        .fpill:hover { border-color:rgba(255,255,255,.2);color:rgba(255,255,255,.7); }
        .fpill.on    { border-color:rgba(255,255,255,.3) !important;color:#fff !important;background:rgba(255,255,255,.08) !important; }
        .bslot       { aspect-ratio:2/3;border-radius:10px;position:relative;overflow:hidden;cursor:pointer;transition:transform .2s cubic-bezier(.34,1.2,.64,1); }
        .bslot:hover { transform:translateY(-5px) rotate(-1.5deg) !important; }
        .bslot.empty { border:1.5px dashed rgba(255,255,255,.1);background:rgba(255,255,255,.02); }
        .share-fmt   { border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;cursor:pointer;transition:transform .15s,border-color .15s; }
        .share-fmt:hover { transform:translateY(-3px);border-color:rgba(255,255,255,.25); }
      `}</style>

      <div style={{ background:'#070503', minHeight:'100vh', borderRadius:'16px', overflow:'hidden', position:'relative' }}>

        {/* ── AMBIENT BACKGROUND ─────────────────────── */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(ellipse at 15% 30%, rgba(255,107,53,.07) 0%, transparent 40%), radial-gradient(ellipse at 85% 70%, rgba(126,87,194,.07) 0%, transparent 40%), radial-gradient(ellipse at 50% 10%, rgba(66,165,245,.04) 0%, transparent 35%)', pointerEvents:'none', zIndex:0 }} />

        {/* ── HEADER ─────────────────────────────────── */}
        <div style={{ position:'relative', zIndex:1, padding:'28px 28px 20px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'16px', marginBottom:'24px' }}>

            {/* Left: titre + valeur */}
            <div>
              <div style={{ fontSize:'10px', fontWeight:500, color:'rgba(255,255,255,.25)', textTransform:'uppercase', letterSpacing:'.15em', fontFamily:'var(--font-display)', marginBottom:'6px' }}>Portfolio</div>
              <div style={{ fontSize:'38px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-1.5px', lineHeight:1 }}>
                € {totalCur.toLocaleString('fr-FR')}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'6px' }}>
                <span style={{ fontSize:'14px', fontWeight:500, color:'#4ECCA3' }}>▲ +{totalROI}% · +€ {totalGain.toLocaleString('fr-FR')}</span>
                <span style={{ width:'4px', height:'4px', borderRadius:'50%', background:'rgba(255,255,255,.2)', display:'inline-block' }} />
                <span style={{ fontSize:'13px', color:'rgba(255,255,255,.35)' }}>{CARDS.length} cartes · {CARDS.reduce((s,c)=>s+c.qty,0)} exemplaires</span>
              </div>
            </div>

            {/* Right: quick stats + share */}
            <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
              {[
                { label:'Meilleure perf.', value:`+${Math.round(((bestCard.curPrice-bestCard.buyPrice)/bestCard.buyPrice)*100)}%`, sub:bestCard.name, color:'#FFD700' },
                { label:'Favoris', value:String(favs.size), sub:'cartes chéries', color:EC.fire },
              ].map(s=>(
                <div key={s.label} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:'12px', padding:'12px 16px', minWidth:'110px' }}>
                  <div style={{ fontSize:'9px', color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.08em', fontFamily:'var(--font-display)', marginBottom:'5px' }}>{s.label}</div>
                  <div style={{ fontSize:'20px', fontWeight:600, color:s.color, fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,.25)', marginTop:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.sub}</div>
                </div>
              ))}
              <button onClick={()=>setShareOpen(true)} style={{ padding:'10px 18px', borderRadius:'12px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'0 4px 16px rgba(224,48,32,.45)', letterSpacing:'.01em' }}>
                Partager →
              </button>
            </div>
          </div>

          {/* View switcher */}
          <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
            {([['vitrine','Vitrine'],['binder','Binder'],['wrapped','Wrapped 2026']] as [View,string][]).map(([v,l])=>(
              <button key={v} onClick={()=>{setView(v);setSelected(null)}} className={`vtab${view===v?' on':''}`}>{l}</button>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            VUE VITRINE
        ════════════════════════════════════════════════ */}
        {view==='vitrine' && !selCard && (
          <div style={{ position:'relative', zIndex:1, padding:'0 28px 28px', animation:'fadeUp .3s ease-out' }}>

            {/* Filter pills */}
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'20px' }}>
              {[{v:'all',l:'Toutes'},{v:'fav',l:'♥ Favoris'},{v:'fire',l:'🔥'},{v:'water',l:'💧'},{v:'psychic',l:'🔮'},{v:'dark',l:'🌑'},{v:'electric',l:'⚡'},{v:'grass',l:'🌿'}].map(o=>(
                <button key={o.v} onClick={()=>setFilterType(o.v)} className={`fpill${filterType===o.v?' on':''}`}>{o.l}</button>
              ))}
              <div style={{ marginLeft:'auto', fontSize:'12px', color:'rgba(255,255,255,.25)', alignSelf:'center', fontFamily:'var(--font-display)' }}>
                {filtered.length} cartes
              </div>
            </div>

            {/* Cards grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(188px,1fr))', gap:'14px' }}>
              {filtered.map((card,idx)=>{
                const ec    = EC[card.type]??'#888'
                const eg    = EG[card.type]??'rgba(128,128,128,.4)'
                const roi   = Math.round(((card.curPrice-card.buyPrice)/card.buyPrice)*100)
                const isHolo= HOLO_RARITIES.includes(card.rarity)
                const ls    = LS[card.lang]
                const isFav = favs.has(card.id)
                const breathClass = card.signal==='S'?'breathe-S':card.signal==='A'?'breathe-A':''

                return (
                  <div
                    key={card.id}
                    className={`gem ${breathClass}`}
                    style={{
                      background:`linear-gradient(160deg,${ec}18,${ec}06)`,
                      border:`1.5px solid ${ec}35`,
                      '--gc': eg,
                      animation:`entrance .35s ${Math.min(idx,10)*0.04}s ease-out both`,
                    } as React.CSSProperties}
                    onMouseMove={tiltMove}
                    onMouseLeave={tiltEnd}
                    onClick={()=>setSelected(card.id)}
                  >
                    {/* Holo overlay (shimmer automatique) */}
                    {isHolo && <div className="holo" />}
                    {/* Holo overlay (suivi souris) */}
                    {isHolo && <div className="hm" />}

                    {/* Particules flottantes */}
                    <div className="ptcl" style={{ background:ec, bottom:'20%', left:'20%' }} />
                    <div className="ptcl" style={{ background:ec, bottom:'30%', left:'60%' }} />
                    <div className="ptcl" style={{ background:ec, bottom:'25%', left:'40%' }} />

                    {/* Top accent line */}
                    <div style={{ height:'2.5px', background:`linear-gradient(90deg,${ec},${ec}55)`, position:'absolute', top:0, left:0, right:0 }} />

                    {/* Signal badge */}
                    {card.signal && (
                      <div style={{ position:'absolute', top:'8px', right:'8px', zIndex:3, fontSize:'9px', fontWeight:700, background:TIER_STYLE[card.signal], color:'#fff', padding:'3px 8px', borderRadius:'6px', fontFamily:'var(--font-display)', boxShadow:`0 2px 8px ${eg}` }}>
                        {card.signal}
                      </div>
                    )}

                    {/* Art placeholder */}
                    <div style={{ height:'120px', margin:'6px 6px 0', borderRadius:'9px', background:`${ec}14`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                      {/* Inner glow */}
                      <div style={{ position:'absolute', width:'70%', height:'70%', borderRadius:'50%', background:eg, filter:'blur(20px)', opacity:.5 }} />
                      <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec}DD,${ec}88)`, boxShadow:`0 0 18px ${eg}`, zIndex:1 }} />
                      {/* Hot dot */}
                      {card.hot && (
                        <div style={{ position:'absolute', top:'6px', left:'6px', width:'6px', height:'6px', borderRadius:'50%', background:'#E03020', animation:'shimGlow 1.5s ease-in-out infinite' }} />
                      )}
                      {/* Lang badge */}
                      <div style={{ position:'absolute', bottom:'6px', left:'6px', fontSize:'9px', fontWeight:700, background:ls.bg, color:ls.color, padding:'1px 6px', borderRadius:'4px', fontFamily:'var(--font-display)' }}>
                        {ls.flag} {card.lang}
                      </div>
                      {/* Grade */}
                      {card.graded && (
                        <div style={{ position:'absolute', bottom:'6px', right:'6px', fontSize:'8px', fontWeight:700, background:'rgba(0,0,0,.7)', color:'rgba(255,255,255,.9)', padding:'1px 6px', borderRadius:'4px', fontFamily:'var(--font-display)' }}>
                          {card.condition}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding:'12px' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'6px', marginBottom:'4px' }}>
                        <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,.88)', fontFamily:'var(--font-display)', lineHeight:1.25, flex:1 }}>{card.name}</div>
                        <button
                          onClick={e=>toggleFav(card.id,e)}
                          style={{ background:'none', border:'none', cursor:'pointer', fontSize:'14px', padding:0, flexShrink:0, transition:'transform .2s', color:'inherit' }}
                          onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.3)')}
                          onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}
                        >
                          {isFav?'❤️':'🤍'}
                        </button>
                      </div>
                      <div style={{ fontSize:'10px', color:'rgba(255,255,255,.28)', marginBottom:'10px' }}>{card.set} · #{card.number}</div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                        <div>
                          <div style={{ fontSize:'18px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1 }}>€ {card.curPrice.toLocaleString('fr-FR')}</div>
                          <div style={{ fontSize:'9px', color:'rgba(255,255,255,.25)', marginTop:'2px' }}>Achat € {card.buyPrice}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:'14px', fontWeight:600, color:roi>=0?'#4ECCA3':'#FF6B8A', fontFamily:'var(--font-display)' }}>{roi>=0?'+':''}{roi}%</div>
                          {card.psa && <div style={{ fontSize:'9px', color:'rgba(255,255,255,.25)' }}>Pop {card.psa.toLocaleString()}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            SPOTLIGHT — plein écran sur une carte
        ════════════════════════════════════════════════ */}
        {view==='vitrine' && selCard && (()=>{
          const ec  = EC[selCard.type]??'#888'
          const eg  = EG[selCard.type]??'rgba(128,128,128,.4)'
          const roi = Math.round(((selCard.curPrice-selCard.buyPrice)/selCard.buyPrice)*100)
          const gain= (selCard.curPrice-selCard.buyPrice)*selCard.qty
          const ls  = LS[selCard.lang]
          const isHolo = HOLO_RARITIES.includes(selCard.rarity)
          return (
            <div style={{ position:'relative', zIndex:1, padding:'0 28px 28px', animation:'fadeUp .25s ease-out' }}>
              <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.45)', fontSize:'13px', cursor:'pointer', fontFamily:'var(--font-display)', marginBottom:'20px', padding:'0', display:'flex', alignItems:'center', gap:'6px' }}>
                ← Retour à la vitrine
              </button>
              <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:'24px', alignItems:'start' }}>

                {/* Grande carte */}
                <div>
                  <div
                    className="gem"
                    style={{
                      background:`linear-gradient(160deg,${ec}22,${ec}08)`,
                      border:`2px solid ${ec}50`,
                      boxShadow:`0 0 60px ${eg}, 0 20px 60px rgba(0,0,0,.7)`,
                      '--gc':eg,
                    } as React.CSSProperties}
                    onMouseMove={tiltMove}
                    onMouseLeave={tiltEnd}
                  >
                    {isHolo && <div className="holo" />}
                    {isHolo && <div className="hm" />}
                    <div className="ptcl" style={{ background:ec, bottom:'20%', left:'20%' }} />
                    <div className="ptcl" style={{ background:ec, bottom:'35%', left:'65%' }} />
                    <div className="ptcl" style={{ background:ec, bottom:'28%', left:'45%' }} />
                    <div style={{ height:'3px', background:`linear-gradient(90deg,${ec},${ec}66)`, position:'absolute', top:0, left:0, right:0 }} />

                    {selCard.signal && (
                      <div style={{ position:'absolute', top:'10px', right:'10px', zIndex:3, fontSize:'11px', fontWeight:700, background:TIER_STYLE[selCard.signal], color:'#fff', padding:'4px 10px', borderRadius:'7px', fontFamily:'var(--font-display)', boxShadow:`0 3px 12px ${eg}` }}>
                        Signal Tier {selCard.signal}
                      </div>
                    )}

                    <div style={{ height:'220px', margin:'8px 8px 0', borderRadius:'11px', background:`${ec}14`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', width:'80%', height:'80%', borderRadius:'50%', background:eg, filter:'blur(32px)', opacity:.6 }} />
                      <div style={{ width:'80px', height:'80px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec}EE,${ec}88)`, boxShadow:`0 0 32px ${eg}, 0 0 64px ${eg}55`, zIndex:1 }} />
                      <div style={{ position:'absolute', bottom:'10px', left:'10px', fontSize:'10px', fontWeight:700, background:ls.bg, color:ls.color, padding:'2px 8px', borderRadius:'5px', fontFamily:'var(--font-display)' }}>
                        {ls.flag} {selCard.lang}
                      </div>
                      {selCard.graded && (
                        <div style={{ position:'absolute', bottom:'10px', right:'10px', fontSize:'10px', fontWeight:700, background:'rgba(0,0,0,.8)', color:'rgba(255,255,255,.9)', padding:'2px 8px', borderRadius:'5px', fontFamily:'var(--font-display)' }}>
                          {selCard.condition}
                        </div>
                      )}
                    </div>
                    <div style={{ padding:'16px' }}>
                      <div style={{ fontSize:'18px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', marginBottom:'3px' }}>{selCard.name}</div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,.3)' }}>{selCard.set} · #{selCard.number} · {selCard.year}</div>
                    </div>
                  </div>
                </div>

                {/* Stats + actions */}
                <div>
                  {/* Prix hero */}
                  <div style={{ marginBottom:'20px' }}>
                    <div style={{ fontSize:'44px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-2px', lineHeight:1 }}>€ {selCard.curPrice.toLocaleString('fr-FR')}</div>
                    <div style={{ fontSize:'16px', color:'#4ECCA3', fontWeight:500, marginTop:'5px' }}>▲ +{roi}% · +€ {gain.toLocaleString('fr-FR')} gain</div>
                  </div>

                  {/* Stats grid */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px' }}>
                    {[
                      { label:'Prix achat',    value:`€ ${selCard.buyPrice.toLocaleString('fr-FR')}`, color:'rgba(255,255,255,.6)' },
                      { label:'Valeur marché', value:`€ ${selCard.curPrice.toLocaleString('fr-FR')}`, color:'#fff'                 },
                      { label:'ROI',           value:`+${roi}%`,                                      color:'#4ECCA3'               },
                      { label:'Quantité',      value:`×${selCard.qty}`,                               color:'rgba(255,255,255,.7)' },
                      { label:'PSA Pop',       value:selCard.psa?selCard.psa.toLocaleString():'—',    color:'rgba(255,255,255,.7)' },
                      { label:'Gain total',    value:`+€ ${Math.abs(gain).toLocaleString('fr-FR')}`,  color:'#4ECCA3'               },
                    ].map(s=>(
                      <div key={s.label} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:'10px', padding:'12px 14px' }}>
                        <div style={{ fontSize:'9px', color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.08em', fontFamily:'var(--font-display)', marginBottom:'5px' }}>{s.label}</div>
                        <div style={{ fontSize:'16px', fontWeight:600, color:s.color, fontFamily:'var(--font-display)', letterSpacing:'-0.3px' }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Dexy insight */}
                  {selCard.signal && (
                    <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:'12px', padding:'14px 16px', marginBottom:'16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                        <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'linear-gradient(135deg,#FF7A5A,#E03020)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'12px', fontWeight:700, flexShrink:0 }}>D</div>
                        <span style={{ fontSize:'12px', fontWeight:500, color:'rgba(255,255,255,.7)', fontFamily:'var(--font-display)' }}>Dexy IA · Analyse</span>
                        <span style={{ marginLeft:'auto', fontSize:'10px', fontWeight:700, background:TIER_STYLE[selCard.signal], color:'#fff', padding:'2px 7px', borderRadius:'5px', fontFamily:'var(--font-display)' }}>Tier {selCard.signal}</span>
                      </div>
                      <p style={{ fontSize:'12px', color:'rgba(255,255,255,.5)', lineHeight:1.7, margin:0 }}>
                        {selCard.signal==='S' ? `PSA Pop de seulement ${selCard.psa||'?'} exemplaires pour l'une des cartes les plus demandées. Momentum acheteur fort détecté — accumulation recommandée avant la prochaine semaine.` :
                         selCard.signal==='A' ? `Signal A confirmé — progression attendue dans les 2-4 semaines. Volume inhabituel sur eBay.` :
                         `Signal B — opportunité d'entrée. Écart significatif entre valeur actuelle et valeur réelle estimée.`}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button onClick={()=>router.push('/alpha')} style={{ flex:2, padding:'12px', borderRadius:'10px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'0 4px 16px rgba(224,48,32,.4)' }}>
                      {selCard.signal ? `Voir signal Tier ${selCard.signal} →` : 'Voir le marché →'}
                    </button>
                    <button onClick={()=>setShareOpen(true)} style={{ flex:1, padding:'12px', borderRadius:'10px', background:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.8)', border:'1px solid rgba(255,255,255,.12)', fontSize:'13px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                      Partager
                    </button>
                    <button onClick={e=>toggleFav(selCard.id,e)} style={{ width:'44px', height:'44px', borderRadius:'10px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {favs.has(selCard.id)?'❤️':'🤍'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ════════════════════════════════════════════════
            VUE BINDER
        ════════════════════════════════════════════════ */}
        {view==='binder' && (
          <div style={{ position:'relative', zIndex:1, padding:'0 28px 28px', animation:'fadeUp .3s ease-out' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
              <div>
                <div style={{ fontSize:'14px', fontWeight:500, color:'rgba(255,255,255,.7)', fontFamily:'var(--font-display)' }}>Mon Binder · Collection complète</div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,.3)', marginTop:'2px' }}>Page {binderPage+1}/{binderPages} · {CARDS.length} cartes</div>
              </div>
              <div style={{ display:'flex', gap:'6px' }}>
                <button onClick={()=>setBinderPage(p=>Math.max(0,p-1))} disabled={binderPage===0} style={{ width:'36px', height:'36px', borderRadius:'9px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:binderPage===0?'rgba(255,255,255,.2)':'rgba(255,255,255,.6)', cursor:binderPage===0?'default':'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
                <button onClick={()=>setBinderPage(p=>Math.min(binderPages-1,p+1))} disabled={binderPage>=binderPages-1} style={{ width:'36px', height:'36px', borderRadius:'9px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:binderPage>=binderPages-1?'rgba(255,255,255,.2)':'rgba(255,255,255,.6)', cursor:binderPage>=binderPages-1?'default':'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', animation:'pageIn .25s ease-out' }}>
              {binderCards.map((card,idx)=>{
                const ec = EC[card.type]??'#888'
                const roi= Math.round(((card.curPrice-card.buyPrice)/card.buyPrice)*100)
                return (
                  <div key={card.id} className="bslot gem" style={{ background:`linear-gradient(145deg,${ec}20,${ec}08)`, border:`1.5px solid ${ec}40`, boxShadow:'0 4px 16px rgba(0,0,0,.5)', animation:`entrance .3s ${idx*.04}s ease-out both` }} onMouseMove={tiltMove} onMouseLeave={tiltEnd} onClick={()=>{setView('vitrine');setSelected(card.id)}}>
                    {HOLO_RARITIES.includes(card.rarity) && <div className="holo" />}
                    {HOLO_RARITIES.includes(card.rarity) && <div className="hm" />}
                    <div className="ptcl" style={{ background:ec, bottom:'22%', left:'22%' }} />
                    <div className="ptcl" style={{ background:ec, bottom:'32%', left:'62%' }} />
                    <div style={{ height:'2px', background:`linear-gradient(90deg,${ec},${ec}44)`, position:'absolute', top:0, left:0, right:0 }} />
                    <div style={{ height:'70%', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                      <div style={{ position:'absolute', width:'60%', height:'60%', borderRadius:'50%', background:EG[card.type]??'rgba(128,128,128,.4)', filter:'blur(14px)', opacity:.6 }} />
                      <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,${ec}CC,${ec}77)`, zIndex:1, boxShadow:`0 0 14px ${EG[card.type]??'rgba(128,128,128,.4)'}` }} />
                      {card.signal && <div style={{ position:'absolute', top:'6px', right:'6px', fontSize:'8px', fontWeight:700, background:TIER_STYLE[card.signal], color:'#fff', padding:'1px 6px', borderRadius:'4px', fontFamily:'var(--font-display)', zIndex:2 }}>{card.signal}</div>}
                      {favs.has(card.id) && <div style={{ position:'absolute', top:'6px', left:'6px', fontSize:'10px', zIndex:2 }}>❤️</div>}
                    </div>
                    <div style={{ padding:'8px 10px' }}>
                      <div style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,.85)', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.name}</div>
                      <div style={{ fontSize:'9px', color:'rgba(255,255,255,.3)', marginBottom:'5px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.set}</div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div style={{ fontSize:'13px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)' }}>€ {card.curPrice}</div>
                        <div style={{ fontSize:'11px', fontWeight:600, color:roi>=0?'#4ECCA3':'#FF6B8A' }}>{roi>=0?'+':''}{roi}%</div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {/* Empty slots to complete the grid */}
              {Array.from({length: Math.max(0, BINDER_SLOTS - binderCards.length)}).map((_,i)=>(
                <div key={`empty-${i}`} className="bslot empty" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                  <div style={{ fontSize:'18px', color:'rgba(255,255,255,.08)' }}>+</div>
                  <div style={{ fontSize:'9px', color:'rgba(255,255,255,.18)', textAlign:'center' }}>Emplacement libre</div>
                </div>
              ))}
            </div>

            {/* Page dots */}
            <div style={{ display:'flex', justifyContent:'center', gap:'6px', marginTop:'20px' }}>
              {Array.from({length:binderPages}).map((_,i)=>(
                <div key={i} onClick={()=>setBinderPage(i)} style={{ width:i===binderPage?20:6, height:'6px', borderRadius:'3px', background:i===binderPage?'rgba(255,255,255,.6)':'rgba(255,255,255,.15)', cursor:'pointer', transition:'all .2s' }} />
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            VUE WRAPPED
        ════════════════════════════════════════════════ */}
        {view==='wrapped' && (
          <div style={{ position:'relative', zIndex:1, animation:'fadeUp .35s ease-out' }}>
            {/* Hero */}
            <div style={{ padding:'40px 28px 28px', textAlign:'center', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(ellipse at 50% 60%,rgba(255,107,53,.12) 0%,transparent 55%)', pointerEvents:'none' }} />
              <div style={{ fontSize:'120px', fontWeight:700, color:'rgba(255,255,255,.04)', position:'absolute', top:'10px', left:'50%', transform:'translateX(-50%)', letterSpacing:'-6px', lineHeight:1, pointerEvents:'none', userSelect:'none' }}>2026</div>
              <div style={{ position:'relative' }}>
                <div style={{ fontSize:'11px', fontWeight:500, color:'rgba(255,255,255,.25)', textTransform:'uppercase', letterSpacing:'.18em', fontFamily:'var(--font-display)', marginBottom:'12px' }}>Ta collection en chiffres</div>
                <div style={{ fontSize:'52px', fontWeight:600, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-2px', lineHeight:1 }}>€ {totalCur.toLocaleString('fr-FR')}</div>
                <div style={{ fontSize:'16px', color:'#4ECCA3', marginTop:'8px', fontWeight:500 }}>+{totalROI}% depuis janvier · +€ {totalGain.toLocaleString('fr-FR')}</div>
              </div>
            </div>

            {/* Stats band */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderTop:'1px solid rgba(255,255,255,.07)', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
              {[
                { label:'Cartes',       value:String(CARDS.length)                                                            },
                { label:'Meilleur ROI', value:`+${Math.round(((bestCard.curPrice-bestCard.buyPrice)/bestCard.buyPrice)*100)}%`, color:'#FFD700' },
                { label:'Signaux S',    value:String(CARDS.filter(c=>c.signal==='S').length)                                   },
                { label:'Favoris',      value:String(favs.size)                                                                },
              ].map((s,i)=>(
                <div key={s.label} style={{ padding:'18px', borderRight:i<3?'1px solid rgba(255,255,255,.07)':'none', textAlign:'center' }}>
                  <div style={{ fontSize:'28px', fontWeight:600, color:s.color??'#fff', fontFamily:'var(--font-display)', letterSpacing:'-0.5px' }}>{s.value}</div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,.3)', marginTop:'4px', textTransform:'uppercase', letterSpacing:'.08em', fontFamily:'var(--font-display)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Top 3 podium */}
            <div style={{ padding:'24px 28px' }}>
              <div style={{ fontSize:'10px', fontWeight:500, color:'rgba(255,255,255,.25)', textTransform:'uppercase', letterSpacing:'.12em', fontFamily:'var(--font-display)', marginBottom:'14px' }}>Tes cartes les plus performantes</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {[...CARDS].sort((a,b)=>((b.curPrice-b.buyPrice)/b.buyPrice)-((a.curPrice-a.buyPrice)/a.buyPrice)).slice(0,3).map((card,i)=>{
                  const roi  = Math.round(((card.curPrice-card.buyPrice)/card.buyPrice)*100)
                  const ec   = EC[card.type]??'#888'
                  const medal= ['🥇','🥈','🥉'][i]
                  return (
                    <div key={card.id} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:'12px', padding:'12px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
                      <div style={{ fontSize:'20px', flexShrink:0 }}>{medal}</div>
                      <div style={{ width:'36px', height:'36px', borderRadius:'9px', background:`linear-gradient(145deg,${ec}25,${ec}10)`, border:`1px solid ${ec}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <div style={{ width:'14px', height:'14px', borderRadius:'50%', background:ec, opacity:.7 }} />
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', fontWeight:500, color:'rgba(255,255,255,.8)', fontFamily:'var(--font-display)' }}>{card.name}</div>
                        <div style={{ fontSize:'10px', color:'rgba(255,255,255,.3)' }}>{card.set} · {card.year}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'16px', fontWeight:600, color:'#4ECCA3', fontFamily:'var(--font-display)' }}>+{roi}%</div>
                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,.35)' }}>€ {card.curPrice}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Share CTA */}
            <div style={{ padding:'0 28px 28px', display:'flex', gap:'8px' }}>
              <button onClick={()=>setShareOpen(true)} style={{ flex:1, padding:'14px', borderRadius:'12px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'0 6px 20px rgba(224,48,32,.45)' }}>
                Partager mon Wrapped 2026 →
              </button>
              <button style={{ padding:'14px 20px', borderRadius:'12px', background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.6)', border:'1px solid rgba(255,255,255,.1)', fontSize:'14px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                Sauvegarder
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            SHARE SHEET
        ════════════════════════════════════════════════ */}
        {shareOpen && (
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.75)', zIndex:50, display:'flex', alignItems:'flex-end', borderRadius:'16px' }} onClick={()=>setShareOpen(false)}>
            <div style={{ width:'100%', background:'#0F0B07', borderTop:'1px solid rgba(255,255,255,.1)', borderRadius:'0 0 16px 16px', padding:'24px 28px', animation:'fadeUp .25s ease-out' }} onClick={e=>e.stopPropagation()}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
                <div style={{ fontSize:'14px', fontWeight:500, color:'rgba(255,255,255,.8)', fontFamily:'var(--font-display)' }}>Partager ma collection</div>
                <button onClick={()=>setShareOpen(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', fontSize:'18px', padding:0 }}>×</button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'20px' }}>
                {/* Story 9:16 */}
                <div className="share-fmt">
                  <div style={{ height:'140px', background:'#1A0A05', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 50% 40%,rgba(255,107,53,.2) 0%,transparent 60%)' }} />
                    <div style={{ width:'62px', height:'108px', borderRadius:'8px', background:'linear-gradient(145deg,rgba(255,107,53,.2),rgba(200,60,20,.08))', border:'1px solid rgba(255,107,53,.35)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'8px', position:'relative' }}>
                      <div style={{ fontSize:'6px', color:'rgba(255,255,255,.25)', letterSpacing:'.1em', marginBottom:'8px' }}>POKÉ ALPHA</div>
                      <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'radial-gradient(circle at 35% 35%,#FF9050,#E03020)', marginBottom:'8px' }} />
                      <div style={{ fontSize:'8px', fontWeight:500, color:'rgba(255,255,255,.7)', textAlign:'center', lineHeight:1.3 }}>Charizard Alt Art</div>
                      <div style={{ fontSize:'10px', fontWeight:500, color:'#fff', marginTop:'6px' }}>€ 920</div>
                      <div style={{ fontSize:'7px', color:'#4ECCA3', marginTop:'2px' }}>+53% ROI</div>
                    </div>
                  </div>
                  <div style={{ padding:'10px 12px', background:'rgba(255,255,255,.03)', borderTop:'1px solid rgba(255,255,255,.06)' }}>
                    <div style={{ fontSize:'12px', fontWeight:500, color:'rgba(255,255,255,.7)', fontFamily:'var(--font-display)' }}>Story Instagram</div>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,.3)', marginTop:'2px' }}>9:16 · TikTok · Reels</div>
                  </div>
                </div>

                {/* Grille 4 cartes */}
                <div className="share-fmt">
                  <div style={{ height:'140px', background:'#1A0A05', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:'108px', height:'108px', borderRadius:'10px', background:'#111', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3px', padding:'3px' }}>
                      {[EC.fire, EC.dark, EC.water, EC.psychic].map((c,i)=>(
                        <div key={i} style={{ borderRadius:'5px', background:`linear-gradient(145deg,${c}40,${c}18)`, border:`1px solid ${c}50` }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ padding:'10px 12px', background:'rgba(255,255,255,.03)', borderTop:'1px solid rgba(255,255,255,.06)' }}>
                    <div style={{ fontSize:'12px', fontWeight:500, color:'rgba(255,255,255,.7)', fontFamily:'var(--font-display)' }}>Grille Top 4</div>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,.3)', marginTop:'2px' }}>1:1 · Feed · Twitter</div>
                  </div>
                </div>

                {/* Carte investisseur */}
                <div className="share-fmt">
                  <div style={{ height:'140px', background:'#1A0A05', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:'160px', height:'90px', borderRadius:'10px', overflow:'hidden', position:'relative' }}>
                      <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#111,#1A1208)' }} />
                      <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 80% 40%,rgba(255,107,53,.12),transparent 60%)' }} />
                      <div style={{ position:'relative', padding:'12px 14px', height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                        <div>
                          <div style={{ fontSize:'7px', color:'rgba(255,255,255,.25)', letterSpacing:'.1em', textTransform:'uppercase' }}>Ma Collection</div>
                          <div style={{ fontSize:'18px', fontWeight:500, color:'#fff', letterSpacing:'-0.5px', marginTop:'3px', fontFamily:'var(--font-display)' }}>€ {totalCur.toLocaleString('fr-FR')}</div>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                          <div>
                            <div style={{ fontSize:'7px', color:'rgba(255,255,255,.25)' }}>ROI TOTAL</div>
                            <div style={{ fontSize:'12px', fontWeight:500, color:'#4ECCA3', fontFamily:'var(--font-display)' }}>+{totalROI}%</div>
                          </div>
                          <div style={{ fontSize:'7px', color:'rgba(255,255,255,.2)' }}>POKÉ ALPHA</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding:'10px 12px', background:'rgba(255,255,255,.03)', borderTop:'1px solid rgba(255,255,255,.06)' }}>
                    <div style={{ fontSize:'12px', fontWeight:500, color:'rgba(255,255,255,.7)', fontFamily:'var(--font-display)' }}>Carte investisseur</div>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,.3)', marginTop:'2px' }}>Valeur · ROI · Branding</div>
                  </div>
                </div>
              </div>

              <div style={{ display:'flex', gap:'8px' }}>
                <button style={{ flex:1, padding:'12px', borderRadius:'10px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'0 4px 16px rgba(224,48,32,.4)' }}>
                  Générer les 3 formats · PNG HD
                </button>
                <button style={{ padding:'12px 18px', borderRadius:'10px', background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.6)', border:'1px solid rgba(255,255,255,.1)', fontSize:'13px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                  Copier le lien
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
