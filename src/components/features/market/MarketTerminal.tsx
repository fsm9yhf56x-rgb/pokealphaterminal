'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

// ── GENERATE REALISTIC PRICE HISTORY ──
function genHistory(base: number, volatility: number, trend: number, days: number): number[] {
  const pts: number[] = [base * (1 - trend * days / 365)]
  for (let i = 1; i <= days; i++) {
    const noise = (Math.random() - 0.48) * volatility * pts[i - 1]
    const t = trend * pts[i - 1] / 365
    pts.push(Math.max(pts[i - 1] + noise + t, pts[0] * 0.5))
  }
  return pts.map(v => Math.round(v))
}

const SEED_HISTORIES: Record<string, number[]> = {
  global:  genHistory(2841, 0.012, 0.15, 3650),
  sealed:  genHistory(4120, 0.008, 0.02, 3650),
  vintage: genHistory(8740, 0.015, 0.22, 3650),
  modern:  genHistory(3200, 0.018, 0.08, 3650),
  jp:      genHistory(5600, 0.020, 0.30, 3650),
  graded:  genHistory(6380, 0.014, 0.18, 3650),
  altart:  genHistory(4850, 0.022, 0.35, 3650),
  chase:   genHistory(3900, 0.019, 0.25, 3650),
  us:      genHistory(3100, 0.013, 0.12, 3650),
  fr:      genHistory(2200, 0.016, 0.20, 3650),
  trophy:  genHistory(18500, 0.010, 0.28, 3650),
}

type IndexId = 'global'|'sealed'|'vintage'|'modern'|'jp'
const INDICES: {id:IndexId;label:string;ticker:string;color:string;desc:string}[] = [
  { id:'global',  label:'PKA Global',   ticker:'PKA',  color:'#E03020', desc:'Toutes cartes confondues' },
  { id:'sealed',  label:'PKA Sealed',   ticker:'SEAL', color:'#42A5F5', desc:'Boosters, displays, ETB' },
  { id:'vintage', label:'PKA Vintage',  ticker:'VNTG', color:'#FFD700', desc:'Cartes avant 2003' },
  { id:'modern',  label:'PKA Modern',   ticker:'MODN', color:'#2E9E6A', desc:'Sword & Shield, SV' },
  { id:'jp',      label:'PKA Japanese', ticker:'JP',   color:'#C855D4', desc:'March\u00e9 japonais' },
]

type Period = '1J'|'1S'|'1M'|'3M'|'1A'|'3A'|'5A'|'MAX'
const PERIOD_DAYS: Record<Period,number> = {'1J':1,'1S':7,'1M':30,'3M':90,'1A':365,'3A':1095,'5A':1825,'MAX':3650}

const MOVERS = [
  { name:'Rayquaza Gold Star',   set:'EX Deoxys',      price:740, change:31.2, vol:48,  img:'https://assets.tcgdex.net/en/ex/ex7/107/high.webp' },
  { name:'Umbreon VMAX Alt Art', set:'Evolving Skies', price:880, change:24.1, vol:112, img:'https://assets.tcgdex.net/en/swsh/swsh7/215/high.webp' },
  { name:'Charizard ex Alt Art', set:'Obsidian Flames',price:920, change:21.3, vol:203, img:'https://assets.tcgdex.net/en/sv/sv3/234/high.webp' },
  { name:'Gengar VMAX Alt Art',  set:'Fusion Strike',  price:340, change:18.4, vol:67,  img:'https://assets.tcgdex.net/en/swsh/swsh8/271/high.webp' },
  { name:'Lugia Neo Genesis',    set:'Neo Genesis',    price:580, change:15.2, vol:31,  img:'https://assets.tcgdex.net/en/neo/neo1/9/high.webp' },
  { name:'Mew ex Alt Art',       set:'Pok\u00e9mon 151',price:142, change:12.8, vol:95,  img:'https://assets.tcgdex.net/en/sv/sv3pt5/205/high.webp' },
  { name:'Blastoise Base Set',   set:'Base Set',       price:620, change:-4.2, vol:24,  img:'https://assets.tcgdex.net/en/base/base1/2/high.webp' },
  { name:'Pikachu VMAX RR',      set:'Vivid Voltage',  price:110, change:-3.8, vol:89,  img:'https://assets.tcgdex.net/en/swsh/swsh4/188/high.webp' },
  { name:'Mewtwo GX Rainbow',    set:'Unified Minds',  price:95,  change:-2.9, vol:44,  img:'https://assets.tcgdex.net/en/sm/sm11/222/high.webp' },
]

const TRANSACTIONS = [
  { card:'Charizard ex Alt Art PSA 10',  price:1240, type:'buy'  as const, source:'eBay',  seller:'RedDragonKai', lang:'EN' },
  { card:'Umbreon VMAX Alt Art Raw',     price:880,  type:'buy'  as const, source:'CM',    seller:'SakuraTCG',    lang:'JP' },
  { card:'Rayquaza Gold Star PSA 9',     price:720,  type:'sell' as const, source:'eBay',  seller:'GoldStarFR',   lang:'EN' },
  { card:'Lugia Neo Genesis PSA 8',      price:580,  type:'buy'  as const, source:'eBay',  seller:'VintageJP',    lang:'JP' },
  { card:'Gengar VMAX Alt Art Raw',      price:340,  type:'buy'  as const, source:'CM',    seller:'PsychicDeck',  lang:'FR' },
  { card:'Mew ex Alt Art Raw',           price:142,  type:'sell' as const, source:'eBay',  seller:'NewCollect',   lang:'EN' },
  { card:'Pikachu Illustrator Promo',    price:4200, type:'buy'  as const, source:'Goldin',seller:'WhaleJP',      lang:'JP' },
  { card:'Blastoise Base Set PSA 9',     price:620,  type:'sell' as const, source:'CM',    seller:'VintageEU',    lang:'EN' },
  { card:'Espeon VMAX Alt Art Raw',      price:418,  type:'buy'  as const, source:'CM',    seller:'EeveeFanFR',   lang:'FR' },
  { card:'Dragonite V Alt Art Raw',      price:290,  type:'buy'  as const, source:'eBay',  seller:'DragonLord',   lang:'EN' },
]

// ── CARD DETAIL ──
type CardDetail = {
  name:string; set:string; img:string; price:number; change:number; vol:number
  rarity?:string; number?:string; psa10?:number; psa9?:number
}

function genCardHistory(price:number): Record<Period, number[]> {
  const full = genHistory(price, .018, .15, 3650)
  return {
    '1J': Array.from({length:48},(_,i)=>Math.round(price*(1+(Math.random()-.48)*.008*(48-i)))),
    '1S': full.slice(-7),
    '1M': full.slice(-30),
    '3M': full.slice(-90),
    '1A': full.slice(-365),
    '3A': full.slice(-1095),
    '5A': full.slice(-1825),
    'MAX': full,
  }
}

const CARD_DB: Record<string, CardDetail> = {}
MOVERS.forEach(m => { CARD_DB[m.name] = { ...m, rarity:'Ultra Rare', number:'---', psa10:Math.round(m.price*1.8), psa9:Math.round(m.price*1.2) } })

// Search helper
const ALL_CARDS = MOVERS.map(m => m.name)

// ── SPARKLINE ──
function Spark({ data, color, w=80, h=24 }: { data:number[]; color:string; w?:number; h?:number }) {
  if (data.length < 2) return null
  const mn = Math.min(...data), mx = Math.max(...data), range = mx - mn || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / range) * (h - 2) - 1}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display:'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── MAIN CHART ──
function Chart({ data, color, period }: { data:number[]; color:string; period:Period }) {
  const ref = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{x:number;y:number;val:number;idx:number}|null>(null)
  const W = 700, H = 220, PX = 0, PY = 12
  const mn = Math.min(...data), mx = Math.max(...data), range = mx - mn || 1
  const points = data.map((v, i) => ({
    x: PX + (i / (data.length - 1)) * (W - PX * 2),
    y: PY + (1 - (v - mn) / range) * (H - PY * 2),
    v
  }))
  const line = points.map(p => `${p.x},${p.y}`).join(' ')
  const area = `${points[0].x},${H} ${line} ${points[points.length-1].x},${H}`
  const isUp = data[data.length - 1] >= data[0]
  const c = color

  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const ratio = mx / rect.width
    const idx = Math.round(ratio * (data.length - 1))
    if (idx >= 0 && idx < points.length) {
      setHover({ x: points[idx].x, y: points[idx].y, val: points[idx].v, idx })
    }
  }, [data, points])

  const dateLabel = (idx: number) => {
    const d = new Date()
    const daysBack = data.length - 1 - idx
    d.setDate(d.getDate() - daysBack)
    if (period === '1J') return d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
    if (period === '3A' || period === '5A' || period === 'MAX') return d.toLocaleDateString('fr-FR', { month:'short', year:'numeric' })
    if (period === '1A') return d.toLocaleDateString('fr-FR', { month:'short', year:'2-digit' })
    return d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' })
  }

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:220, display:'block', cursor:'crosshair' }}
      onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity={0.15} />
          <stop offset="100%" stopColor={c} stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(r => (
        <line key={r} x1={PX} x2={W - PX} y1={PY + r * (H - PY * 2)} y2={PY + r * (H - PY * 2)} stroke="rgba(0,0,0,.04)" strokeWidth={1} />
      ))}
      <polygon points={area} fill="url(#cg)" />
      <polyline points={line} fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {hover && (
        <>
          <line x1={hover.x} x2={hover.x} y1={PY} y2={H - PY} stroke="rgba(0,0,0,.1)" strokeWidth={1} strokeDasharray="3,3" />
          <circle cx={hover.x} cy={hover.y} r={4} fill={c} stroke="#fff" strokeWidth={2} />
          <rect x={Math.min(hover.x - 44, W - 92)} y={Math.max(hover.y - 44, 0)} width={88} height={36} rx={8} fill="#111" />
          <text x={Math.min(hover.x, W - 48)} y={Math.max(hover.y - 26, 12)} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={600} fontFamily="var(--font-data)">{hover.val.toLocaleString('fr-FR')}</text>
          <text x={Math.min(hover.x, W - 48)} y={Math.max(hover.y - 13, 25)} textAnchor="middle" fill="rgba(255,255,255,.5)" fontSize={10} fontFamily="var(--font-display)">{dateLabel(hover.idx)}</text>
        </>
      )}
    </svg>
  )
}

// ── SECTION HEADER ──
function Sec({ children, right }: { children:React.ReactNode; right?:React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
      <div style={{ width:3, height:14, borderRadius:2, background:'#E03020', flexShrink:0 }} />
      <span style={{ fontSize:11, fontWeight:700, color:'#444', textTransform:'uppercase', letterSpacing:'.08em', fontFamily:'var(--font-display)' }}>{children}</span>
      <div style={{ flex:1, height:1, background:'#EBEBEB' }} />
      {right}
    </div>
  )
}

export function MarketTerminal({ isPro = false }: { isPro?: boolean }) {
  const [selIdx, setSelIdx] = useState<IndexId>('global')
  const [selCard, setSelCard] = useState<string|null>(null)
  const [recentCards, setRecentCards] = useState<string[]>([])
  const [cardPeriod, setCardPeriod] = useState<Period>('1M')
  const [searchQ, setSearchQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const cardHistories = useRef<Record<string, Record<Period,number[]>>>({})

  const getCardHistory = (name:string): Record<Period,number[]> => {
    if (!cardHistories.current[name]) {
      const card = CARD_DB[name]
      if (card) cardHistories.current[name] = genCardHistory(card.price)
    }
    return cardHistories.current[name] || genCardHistory(500)
  }

  const openCard = (name:string) => {
    if (!CARD_DB[name]) return
    setSelCard(name)
    setCardPeriod('1M')
    setSearchOpen(false)
    setSearchQ('')
    setRecentCards(prev => {
      const next = prev.filter(c => c !== name)
      next.unshift(name)
      return next.slice(0, 8)
    })
  }

  const navCard = (dir: -1|1) => {
    if (!selCard) return
    const idx = ALL_CARDS.indexOf(selCard)
    if (idx === -1) return
    const next = idx + dir
    if (next >= 0 && next < ALL_CARDS.length) openCard(ALL_CARDS[next])
  }

  // Keyboard navigation
  useEffect(() => {
    if (!selCard) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); navCard(-1) }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); navCard(1) }
      if (e.key === 'Escape') setSelCard(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selCard])

  const searchResults = useMemo(() => {
    if (!searchQ.trim()) return []
    const q = searchQ.toLowerCase()
    return ALL_CARDS.filter(c => c.toLowerCase().includes(q)).slice(0, 6)
  }, [searchQ])
  const [period, setPeriod] = useState<Period>('1M')
  const [feedPaused, setFeedPaused] = useState(false)
  const [feed, setFeed] = useState(TRANSACTIONS.map((t, i) => ({ ...t, id: i, time: `Il y a ${i * 2 + 1} min` })))
  const [newTx, setNewTx] = useState<number|null>(null)
  const [moverTab, setMoverTab] = useState<'up'|'down'>('up')

  const idx = INDICES.find(i => i.id === selIdx)!
  const history = SEED_HISTORIES[selIdx]
  const days = PERIOD_DAYS[period]
  const chartData = useMemo(() => {
    const slice = history.slice(-Math.min(days + 1, history.length))
    if (period === '1J') {
      const last = slice[slice.length - 1]
      return Array.from({ length: 48 }, (_, i) => Math.round(last + (Math.random() - 0.48) * last * 0.005))
    }
    return slice
  }, [selIdx, period, history, days])
  const curVal = chartData[chartData.length - 1]
  const startVal = chartData[0]
  const chgPct = ((curVal - startVal) / startVal * 100)
  const chgAbs = curVal - startVal
  const isUp = chgPct >= 0

  // Live feed
  useEffect(() => {
    if (feedPaused) return
    const t = setInterval(() => {
      const src = TRANSACTIONS[Math.floor(Math.random() * TRANSACTIONS.length)]
      const variation = 1 + (Math.random() - 0.5) * 0.1
      const tx = { ...src, id: Date.now(), time: "\u00c0 l'instant", price: Math.round(src.price * variation) }
      setFeed(prev => [tx, ...prev.slice(0, 19)])
      setNewTx(tx.id)
      setTimeout(() => setNewTx(null), 2000)
    }, 5000)
    return () => clearInterval(t)
  }, [feedPaused])

  const moversUp = MOVERS.filter(m => m.change > 0).sort((a, b) => b.change - a.change)
  const moversDown = MOVERS.filter(m => m.change < 0).sort((a, b) => a.change - b.change)
  const totalVol = MOVERS.reduce((s, m) => s + m.vol, 0)
  const totalTx = feed.length
  const topCard = MOVERS.reduce((a, b) => a.vol > b.vol ? a : b)
  const avgPrice = Math.round(MOVERS.reduce((s, m) => s + m.price, 0) / MOVERS.length)

  return (
    <>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes txSlide{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .idx-card{background:#fff;border:1px solid #EBEBEB;border-radius:12px;padding:14px 16px;cursor:pointer;transition:all .15s;position:relative;overflow:hidden}
        .idx-card:hover{border-color:#C7C7CC;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.04)}
        .idx-card.on{border-color:var(--ac);box-shadow:0 0 0 1px var(--ac),0 4px 12px rgba(0,0,0,.04)}
        .idx-card.on .idx-bar{opacity:1}
        .idx-bar{position:absolute;top:0;left:0;right:0;height:2.5px;border-radius:12px 12px 0 0;opacity:.3;transition:opacity .15s}
        .per-btn{padding:5px 14px;border-radius:7px;border:1px solid #EBEBEB;background:#fff;color:#888;font-size:11px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .12s}
        .per-btn:hover{border-color:#C7C7CC;color:#111}
        .per-btn.on{background:#111;color:#fff;border-color:#111}
        .mv-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #F5F5F5;transition:background .1s;cursor:pointer}
        .mv-row:last-child{border-bottom:none}
        .mv-row:hover{background:#FAFAFA}
        .tx-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #F5F5F5;transition:all .12s}
        .tx-row:last-child{border-bottom:none}
        .tx-row:hover{background:#FAFAFA}
        .tx-new{animation:txSlide .3s ease-out;background:#F5FFF9 !important}
        .tab-btn{padding:5px 14px;border-radius:7px;border:none;background:transparent;color:#888;font-size:11px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .12s}
        .tab-btn:hover{background:#F0F0F0}
        .tab-btn.on{background:#111;color:#fff}
        .stat-box{flex:1;background:#fff;border:1px solid #EBEBEB;border-radius:10px;padding:12px 14px;transition:all .15s}
        .stat-box:hover{border-color:#C7C7CC}
        .recent-tab{padding:5px 10px;border-radius:6px;border:1px solid #EBEBEB;background:#fff;font-size:10px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .12s;display:flex;align-items:center;gap:4px;white-space:nowrap;color:#888}
        .recent-tab:hover{border-color:#C7C7CC;color:#111}
        .recent-tab.on{background:#111;color:#fff;border-color:#111}
        .recent-tab .close{opacity:0;font-size:8px;margin-left:2px;transition:opacity .1s}
        .recent-tab:hover .close{opacity:.5}
        .nav-arrow{width:30px;height:30px;border-radius:8px;border:1px solid #EBEBEB;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s;color:#888;font-size:12px}
        .nav-arrow:hover:not(:disabled){border-color:#111;color:#111;background:#F8F8FA}
        .nav-arrow:disabled{opacity:.2;cursor:default}
        .see-also{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:background .1s;border:1px solid #F0F0F0}
        .see-also:hover{background:#F8F8FA;border-color:#EBEBEB}
      `}</style>

      <div style={{ animation:'fadeIn .25s ease-out', width:'100%' }}>

        {/* ── HEADER ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <p style={{ fontSize:10, color:'#AAA', textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Market</p>
            <h1 style={{ fontSize:26, fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-.5px', margin:'0 0 6px' }}>Terminal</h1>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#2E9E6A', animation:'pulse 1.5s infinite' }} />
              <span style={{ fontSize:11, color:'#2E9E6A', fontWeight:600, fontFamily:'var(--font-display)' }}>LIVE</span>
              <span style={{ fontSize:11, color:'#AAA' }}>{'\u00b7'} Mise {'\u00e0'} jour toutes les 15 min</span>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ position:'relative' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, background:'#F5F5F7', border:'1px solid #EBEBEB', borderRadius:9, padding:'6px 12px', cursor:'text', minWidth:220 }}
                onClick={()=>{setSearchOpen(true);setTimeout(()=>searchRef.current?.focus(),50)}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                {searchOpen ? (
                  <input ref={searchRef} value={searchQ} onChange={e=>setSearchQ(e.target.value)}
                    onBlur={()=>setTimeout(()=>setSearchOpen(false),200)}
                    onKeyDown={e=>{ if(e.key==='Escape'){setSearchOpen(false);setSearchQ('')} if(e.key==='Enter'&&searchResults.length>0)openCard(searchResults[0]) }}
                    placeholder="Rechercher une carte..."
                    style={{ border:'none', background:'transparent', outline:'none', fontSize:12, fontFamily:'var(--font-display)', color:'#111', width:160 }} />
                ) : (
                  <span style={{ fontSize:12, color:'#AAA', fontFamily:'var(--font-display)' }}>Rechercher une carte...</span>
                )}
              </div>
              {searchOpen && searchResults.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:'#fff', border:'1px solid #EBEBEB', borderRadius:10, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,.08)', zIndex:100 }}>
                  {searchResults.map(name => {
                    const card = CARD_DB[name]
                    return (
                      <div key={name} onMouseDown={()=>openCard(name)}
                        style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid #F5F5F5', transition:'background .1s' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='#FAFAFA')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                        {card && <img src={card.img} alt="" style={{ width:24, height:33, objectFit:'cover', borderRadius:3, flexShrink:0 }} />}
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:500, fontFamily:'var(--font-display)' }}>{name}</div>
                          <div style={{ fontSize:10, color:'#BBB' }}>{card?.set}</div>
                        </div>
                        <div style={{ fontSize:12, fontWeight:600, fontFamily:'var(--font-data)' }}>{card?.price} {'\u20ac'}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div style={{ fontSize:11, color:'#888', background:'#F5F5F7', padding:'6px 12px', borderRadius:8, fontFamily:'var(--font-data)' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
            </div>
          </div>
        </div>

        {/* ── MARKET STATS ── */}
        <div style={{ display:'flex', gap:8, marginBottom:18 }}>
          <div className="stat-box">
            <div style={{ fontSize:10, color:'#AAA', fontFamily:'var(--font-display)', marginBottom:4 }}>Volume 24h</div>
            <div style={{ fontSize:18, fontWeight:700, fontFamily:'var(--font-data)', letterSpacing:'-.5px' }}>{totalVol.toLocaleString('fr-FR')}</div>
            <div style={{ fontSize:10, color:'#AAA' }}>transactions</div>
          </div>
          <div className="stat-box">
            <div style={{ fontSize:10, color:'#AAA', fontFamily:'var(--font-display)', marginBottom:4 }}>Carte la + {'\u00e9'}chang{'\u00e9'}e</div>
            <div style={{ fontSize:14, fontWeight:600, fontFamily:'var(--font-display)', letterSpacing:'-.3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{topCard.name}</div>
            <div style={{ fontSize:10, color:'#AAA' }}>{topCard.vol} tx</div>
          </div>
          <div className="stat-box">
            <div style={{ fontSize:10, color:'#AAA', fontFamily:'var(--font-display)', marginBottom:4 }}>Prix moyen</div>
            <div style={{ fontSize:18, fontWeight:700, fontFamily:'var(--font-data)', letterSpacing:'-.5px' }}>{avgPrice} {'\u20ac'}</div>
            <div style={{ fontSize:10, color:'#AAA' }}>top movers</div>
          </div>
          <div className="stat-box">
            <div style={{ fontSize:10, color:'#AAA', fontFamily:'var(--font-display)', marginBottom:4 }}>March{'\u00e9'}</div>
            <div style={{ fontSize:18, fontWeight:700, fontFamily:'var(--font-data)', letterSpacing:'-.5px', color:isUp?'#2E9E6A':'#E03020' }}>{isUp?'+':''}{chgPct.toFixed(1)}%</div>
            <div style={{ fontSize:10, color:'#AAA' }}>PKA Global 24h</div>
          </div>
        </div>

        {/* ── INDICES ── */}
        <Sec>Indices Pok{'\u00e9'}Alpha</Sec>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20 }}>
          {INDICES.map(i => {
            const h = SEED_HISTORIES[i.id]
            const cur = h[h.length - 1]
            const prev = h[h.length - 2]
            const pct = ((cur - prev) / prev * 100)
            const spark = h.slice(-30)
            const on = selIdx === i.id
            return (
              <div key={i.id} className={`idx-card${on?' on':''}`} style={{ '--ac': i.color } as React.CSSProperties} onClick={() => setSelIdx(i.id)}>
                <div className="idx-bar" style={{ background:i.color }} />
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:10, fontWeight:600, color:'#888', fontFamily:'var(--font-display)', letterSpacing:'.04em' }}>{i.ticker}</span>
                  <Spark data={spark} color={pct >= 0 ? '#2E9E6A' : '#E03020'} w={48} h={16} />
                </div>
                <div style={{ fontSize:20, fontWeight:700, fontFamily:'var(--font-data)', letterSpacing:'-1px', marginBottom:2 }}>{cur.toLocaleString('fr-FR')}</div>
                <div style={{ fontSize:11, fontWeight:600, color:pct >= 0 ? '#2E9E6A' : '#E03020', fontFamily:'var(--font-data)' }}>
                  {pct >= 0 ? '\u25b2' : '\u25bc'} {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                </div>
                <div style={{ fontSize:9, color:'#CCC', marginTop:2 }}>{i.desc}</div>
              </div>
            )
          })}
        </div>

        {/* ── CHART ── */}
        <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:14, padding:'18px 20px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:idx.color }} />
                <span style={{ fontSize:14, fontWeight:600, fontFamily:'var(--font-display)' }}>{idx.label}</span>
              </div>
              <div style={{ display:'flex', alignItems:'baseline', gap:10, marginTop:4 }}>
                <span style={{ fontSize:30, fontWeight:700, fontFamily:'var(--font-data)', letterSpacing:'-1.5px' }}>{curVal.toLocaleString('fr-FR')}</span>
                <span style={{ fontSize:14, fontWeight:600, color:isUp?'#2E9E6A':'#E03020', fontFamily:'var(--font-data)' }}>
                  {isUp?'\u25b2':'\u25bc'} {isUp?'+':''}{chgAbs.toLocaleString('fr-FR')} ({isUp?'+':''}{chgPct.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div style={{ display:'flex', gap:4 }}>
              {(['1J','1S','1M','3M','1A','3A','5A','MAX'] as Period[]).map(p => (
                <button key={p} className={`per-btn${period===p?' on':''}`} onClick={() => setPeriod(p)}>{p}</button>
              ))}
            </div>
          </div>
          <Chart data={chartData} color={isUp ? '#2E9E6A' : '#E03020'} period={period} />
        </div>

        {/* ── MOVERS + FEED ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>

          {/* Movers */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <Sec>Top Movers {'\u00b7'} 24h</Sec>
              <div style={{ display:'flex', gap:3, background:'#F5F5F7', borderRadius:8, padding:3, flexShrink:0 }}>
                <button className={`tab-btn${moverTab==='up'?' on':''}`} onClick={()=>setMoverTab('up')}>{'\u25b2'} Hausse ({moversUp.length})</button>
                <button className={`tab-btn${moverTab==='down'?' on':''}`} onClick={()=>setMoverTab('down')}>{'\u25bc'} Baisse ({moversDown.length})</button>
              </div>
            </div>
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:14, overflow:'hidden' }}>
              {(moverTab === 'up' ? moversUp : moversDown).map(m => (
                <div key={m.name} className="mv-row" onClick={()=>openCard(m.name)}>
                  <img src={m.img} alt="" style={{ width:36, height:50, objectFit:'cover', borderRadius:5, border:'1px solid #F0F0F0', flexShrink:0 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>
                    <div style={{ fontSize:10, color:'#BBB', marginTop:1 }}>{m.set} {'\u00b7'} {m.vol} tx</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:15, fontWeight:700, fontFamily:'var(--font-data)', letterSpacing:'-.5px' }}>{m.price} {'\u20ac'}</div>
                    <div style={{ fontSize:12, fontWeight:600, color:m.change>=0?'#2E9E6A':'#E03020', fontFamily:'var(--font-data)' }}>
                      {m.change>=0?'+':''}{m.change}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feed */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <Sec right={
                <button onClick={() => setFeedPaused(p => !p)} style={{ fontSize:10, color:feedPaused?'#E03020':'#888', background:feedPaused?'#FFF0EE':'#F5F5F7', border:`1px solid ${feedPaused?'#FFD8D0':'#EBEBEB'}`, padding:'4px 10px', borderRadius:6, cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:500 }}>
                  {feedPaused ? '\u25b6 Reprendre' : '\u23f8 Pause'}
                </button>
              }>Transactions {'\u00b7'} Live</Sec>
            </div>
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:14, overflow:'hidden', maxHeight:520, overflowY:'auto' }}>
              {feed.map((tx, i) => (
                <div key={tx.id} className={`tx-row${tx.id === newTx ? ' tx-new' : ''}`} style={{cursor:'pointer'}} onClick={()=>{const match=ALL_CARDS.find(c=>tx.card.includes(c.split(' ')[0]));if(match)openCard(match)}}>
                  <div style={{ width:28, height:28, borderRadius:8, background:tx.type==='buy'?'#F0FFF6':'#FFF0EE', border:`1px solid ${tx.type==='buy'?'#AAEEC8':'#FFD8D0'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0, color:tx.type==='buy'?'#2E9E6A':'#E03020' }}>
                    {tx.type === 'buy' ? '\u2197' : '\u2199'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500, fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.card}</div>
                    <div style={{ fontSize:10, color:'#BBB', marginTop:1 }}>{tx.source} {'\u00b7'} {tx.seller} {'\u00b7'} {tx.lang} {'\u00b7'} {tx.time}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, fontFamily:'var(--font-data)', letterSpacing:'-.3px' }}>{tx.price.toLocaleString('fr-FR')} {'\u20ac'}</div>
                    <div style={{ fontSize:10, fontWeight:600, color:tx.type==='buy'?'#2E9E6A':'#E03020' }}>{tx.type==='buy'?'Achat':'Vente'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CARD DETAIL PANEL ── */}
        {selCard && CARD_DB[selCard] && (() => {
          const card = CARD_DB[selCard]
          const histories = getCardHistory(selCard)
          const cData = histories[cardPeriod] || []
          const cCur = cData[cData.length-1] || card.price
          const cStart = cData[0] || card.price
          const cPct = ((cCur-cStart)/cStart*100)
          const cUp = cPct >= 0
          return (
            <>
              <div onClick={()=>setSelCard(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.25)', zIndex:200, animation:'fadeIn .15s ease-out' }} />
              <div style={{ position:'fixed', top:0, right:0, bottom:0, width:420, background:'#fff', borderLeft:'1px solid #EBEBEB', zIndex:201, overflowY:'auto', boxShadow:'-8px 0 32px rgba(0,0,0,.08)', animation:'fadeIn .2s ease-out' }}>
                {/* Nav + Close */}
                <div style={{ padding:'12px 18px', borderBottom:'1px solid #F5F5F5' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:recentCards.length>1?8:0 }}>
                    <button className="nav-arrow" disabled={ALL_CARDS.indexOf(card.name)<=0} onClick={()=>navCard(-1)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <button className="nav-arrow" disabled={ALL_CARDS.indexOf(card.name)>=ALL_CARDS.length-1} onClick={()=>navCard(1)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                    <span style={{ fontSize:14, fontWeight:600, fontFamily:'var(--font-display)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.name}</span>
                    <span style={{ fontSize:10, color:'#BBB', fontFamily:'var(--font-data)', flexShrink:0 }}>
                      {ALL_CARDS.indexOf(card.name)+1}/{ALL_CARDS.length}
                    </span>
                    <button onClick={()=>setSelCard(null)} style={{ width:28, height:28, borderRadius:8, border:'1px solid #EBEBEB', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'#888', flexShrink:0 }}>{String.fromCharCode(215)}</button>
                  </div>
                  {recentCards.length > 1 && (
                    <div style={{ display:'flex', gap:4, overflowX:'auto', paddingTop:4 }}>
                      {recentCards.map(rc => (
                        <button key={rc} className={'recent-tab'+(rc===selCard?' on':'')} onClick={()=>openCard(rc)}>
                          {rc.split(' ').slice(0,2).join(' ')}
                          {rc!==selCard && <span className="close" onMouseDown={e=>{e.stopPropagation();setRecentCards(p=>p.filter(c=>c!==rc))}}>{String.fromCharCode(215)}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card image + price */}
                <div style={{ display:'flex', gap:16, padding:'16px 18px' }}>
                  <img src={card.img} alt="" style={{ width:100, height:140, objectFit:'cover', borderRadius:8, border:'1px solid #F0F0F0', boxShadow:'0 4px 16px rgba(0,0,0,.08)', flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, color:'#AAA', marginBottom:2, fontFamily:'var(--font-display)' }}>{card.set}</div>
                    <div style={{ fontSize:28, fontWeight:700, fontFamily:'var(--font-data)', letterSpacing:'-1.5px', lineHeight:1 }}>{cCur.toLocaleString('fr-FR')} {'\u20ac'}</div>
                    <div style={{ fontSize:14, fontWeight:600, color:cUp?'#2E9E6A':'#E03020', fontFamily:'var(--font-data)', marginTop:4 }}>
                      {cUp?'\u25b2':'\u25bc'} {cUp?'+':''}{cPct.toFixed(1)}%
                      <span style={{ color:'#AAA', fontWeight:400, fontSize:11, marginLeft:6 }}>{cUp?'+':''}{(cCur-cStart).toLocaleString('fr-FR')} {'\u20ac'}</span>
                    </div>
                    <div style={{ display:'flex', gap:4, marginTop:10 }}>
                      {(['1J','1S','1M','3M','1A','3A','5A','MAX'] as Period[]).map(p => (
                        <button key={p} className={`per-btn${cardPeriod===p?' on':''}`} onClick={()=>setCardPeriod(p)} style={{ padding:'3px 10px', fontSize:10 }}>{p}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div style={{ padding:'0 18px 16px' }}>
                  <Chart data={cData} color={cUp?'#2E9E6A':'#E03020'} period={cardPeriod} />
                </div>

                {/* Stats grid */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:'0 18px 16px' }}>
                  <div style={{ background:'#F8F8FA', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:9, color:'#AAA', fontFamily:'var(--font-display)', marginBottom:2 }}>Volume 24h</div>
                    <div style={{ fontSize:16, fontWeight:700, fontFamily:'var(--font-data)' }}>{card.vol}</div>
                  </div>
                  <div style={{ background:'#F8F8FA', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:9, color:'#AAA', fontFamily:'var(--font-display)', marginBottom:2 }}>Variation 24h</div>
                    <div style={{ fontSize:16, fontWeight:700, fontFamily:'var(--font-data)', color:card.change>=0?'#2E9E6A':'#E03020' }}>{card.change>=0?'+':''}{card.change}%</div>
                  </div>
                  {card.psa10 && <div style={{ background:'#F8F8FA', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:9, color:'#AAA', fontFamily:'var(--font-display)', marginBottom:2 }}>PSA 10</div>
                    <div style={{ fontSize:16, fontWeight:700, fontFamily:'var(--font-data)' }}>{card.psa10?.toLocaleString('fr-FR')} {'\u20ac'}</div>
                  </div>}
                  {card.psa9 && <div style={{ background:'#F8F8FA', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:9, color:'#AAA', fontFamily:'var(--font-display)', marginBottom:2 }}>PSA 9</div>
                    <div style={{ fontSize:16, fontWeight:700, fontFamily:'var(--font-data)' }}>{card.psa9?.toLocaleString('fr-FR')} {'\u20ac'}</div>
                  </div>}
                </div>

                {/* Recent sales for this card */}
                <div style={{ padding:'0 18px 18px' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#888', fontFamily:'var(--font-display)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>Derni{String.fromCharCode(232)}res ventes</div>
                  <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:10, overflow:'hidden' }}>
                    {[
                      { src:'eBay', grade:'PSA 10', p:card.psa10||0, ago:'2h', lang:'EN' },
                      { src:'CM',   grade:'Raw NM', p:card.price,     ago:'5h', lang:'FR' },
                      { src:'eBay', grade:'PSA 9',  p:card.psa9||0,  ago:'1j', lang:'EN' },
                      { src:'CM',   grade:'Raw LP', p:Math.round(card.price*.85), ago:'2j', lang:'JP' },
                      { src:'eBay', grade:'PSA 10', p:Math.round((card.psa10||0)*.97), ago:'3j', lang:'EN' },
                    ].map((sale,i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderBottom:i<4?'1px solid #F5F5F5':'none', fontSize:12 }}>
                        <span style={{ fontSize:10, fontWeight:600, color:sale.src==='eBay'?'#378ADD':'#EF9F27', background:sale.src==='eBay'?'rgba(55,138,221,.06)':'rgba(239,159,39,.06)', padding:'2px 6px', borderRadius:4, fontFamily:'var(--font-display)' }}>{sale.src}</span>
                        <span style={{ flex:1, color:'#555', fontFamily:'var(--font-display)' }}>{sale.grade}</span>
                        <span style={{ fontSize:10, color:'#BBB', fontFamily:'var(--font-display)' }}>{sale.lang} {String.fromCharCode(183)} {sale.ago}</span>
                        <span style={{ fontWeight:600, fontFamily:'var(--font-data)' }}>{sale.p.toLocaleString('fr-FR')} {'\u20ac'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Voir aussi */}
                <div style={{ padding:'0 18px 20px' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#888', fontFamily:'var(--font-display)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>Voir aussi</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {ALL_CARDS.filter(c => c !== selCard).slice(0, 4).map(name => {
                      const other = CARD_DB[name]
                      if (!other) return null
                      return (
                        <div key={name} className="see-also" onClick={()=>openCard(name)}>
                          <img src={other.img} alt="" style={{ width:24, height:33, objectFit:'cover', borderRadius:3, flexShrink:0 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:500, fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
                            <div style={{ fontSize:10, color:'#BBB' }}>{other.set}</div>
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, fontFamily:'var(--font-data)' }}>{other.price} {'\u20ac'}</div>
                            <div style={{ fontSize:10, fontWeight:600, color:other.change>=0?'#2E9E6A':'#E03020', fontFamily:'var(--font-data)' }}>{other.change>=0?'+':''}{other.change}%</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )
        })()}

      </div>
    </>
  )
}
