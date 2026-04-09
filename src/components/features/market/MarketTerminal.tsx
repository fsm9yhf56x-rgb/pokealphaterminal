'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

// ── GENERATE REALISTIC PRICE HISTORY ──
function genHistory(base: number, volatility: number, trend: number, days: number): number[] {
  const start = Math.max(base * 0.35, base * (1 - trend * (days / 365) * 0.6))
  const pts: number[] = [start]
  for (let i = 1; i <= days; i++) {
    const noise = (Math.random() - 0.48) * volatility * pts[i - 1]
    const t = trend * pts[i - 1] / 365
    pts.push(Math.max(pts[i - 1] + noise + t, start * 0.6))
  }
  // Normalize so last value is close to base
  const ratio = base / pts[pts.length - 1]
  return pts.map(v => Math.round(v * ratio))
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

type IndexId = 'global'|'sealed'|'vintage'|'modern'|'jp'|'us'|'fr'|'trophy'
const INDICES: {id:IndexId;label:string;ticker:string;color:string;desc:string}[] = [
  { id:'global',  label:'PKA Global',   ticker:'PKA',  color:'#E03020', desc:'Toutes cartes confondues' },
  { id:'sealed',  label:'PKA Sealed',   ticker:'SEAL', color:'#42A5F5', desc:'Boosters, displays, ETB' },
  { id:'vintage', label:'PKA Vintage',  ticker:'VNTG', color:'#FFD700', desc:'Cartes avant 2003' },
  { id:'modern',  label:'PKA Modern',   ticker:'MODN', color:'#2E9E6A', desc:'Sword & Shield, SV' },
  { id:'jp',      label:'PKA Japanese', ticker:'JP',   color:'#C855D4', desc:'March\u00e9 japonais' },
  { id:'us',      label:'PKA US Market',    ticker:'US',   color:'#3B82F6', desc:'Marché américain eBay + TCGPlayer' },
  { id:'fr',      label:'PKA French',       ticker:'FR',   color:'#1D4ED8', desc:'Premium cartes françaises vs EN' },
  { id:'trophy',  label:'PKA Trophy',       ticker:'TRPH', color:'#B45309', desc:'Illustrator, Tropical Mega, No.1 Trainer' },
]

function getVolume(data:number[]):number[]{
  return data.map((_,i)=>{
    if(i===0)return Math.round(Math.random()*50+10)
    const change=Math.abs(data[i]-data[i-1])/data[i-1]
    return Math.round((Math.random()*40+10)*(1+change*20))
  })
}
function calcMA(data:number[],w:number):(number|null)[]{
  return data.map((_,i)=>{if(i<w-1)return null;let sum=0;for(let j=i-w+1;j<=i;j++)sum+=data[j];return Math.round(sum/w)})
}

type Period = '1J'|'1S'|'1M'|'3M'|'1A'|'3A'|'5A'|'MAX'
const PERIOD_DAYS: Record<Period,number> = {'1J':1,'1S':7,'1M':30,'3M':90,'1A':365,'3A':1095,'5A':1825,'MAX':3650}

const MOVERS = [
  { name:'Rayquaza Gold Star',   set:'EX Deoxys',      price:740, change:31.2, vol:48,  img:'/img/cards/rayquaza-gold-star.webp', grade:'Raw' },
  { name:'Umbreon VMAX Alt Art', set:'Evolving Skies', price:880, change:24.1, vol:112, img:'/img/cards/umbreon-vmax-alt.webp', grade:'Raw' },
  { name:'Charizard ex Alt Art', set:'Obsidian Flames',price:920, change:21.3, vol:203, img:'/img/cards/charizard-ex-alt.webp', grade:'Raw' },
  { name:'Gengar VMAX Alt Art',  set:'Fusion Strike',  price:340, change:18.4, vol:67,  img:'/img/cards/gengar-vmax-alt.webp' },
  { name:'Lugia Neo Genesis',    set:'Neo Genesis',    price:580, change:15.2, vol:31,  img:'/img/cards/lugia-neo.webp' },
  { name:'Mew ex Alt Art',       set:'Pok\u00e9mon 151',price:142, change:12.8, vol:95,  img:'/img/cards/mew-ex-alt.webp' },
  { name:'Blastoise Base Set',   set:'Base Set',       price:620, change:-4.2, vol:24,  img:'/img/cards/blastoise-base.webp' },
  { name:'Pikachu VMAX RR',      set:'Vivid Voltage',  price:110, change:-3.8, vol:89,  img:'/img/cards/pikachu-vmax-rr.webp' },
  { name:'Mewtwo GX Rainbow',    set:'Unified Minds',  price:95,  change:-2.9, vol:44,  img:'/img/cards/mewtwo-gx-rainbow.webp', grade:'Raw' },
  { name:'Charizard ex Alt PSA 10', set:'Obsidian Flames',price:1680,change:18.2,vol:31, img:'/img/cards/charizard-ex-alt.webp', grade:'PSA 10' },
  { name:'Umbreon VMAX Alt PSA 10', set:'Evolving Skies', price:1600,change:22.4,vol:18, img:'/img/cards/umbreon-vmax-alt.webp', grade:'PSA 10' },
  { name:'Gengar VMAX Alt BGS 9.5', set:'Fusion Strike',  price:480, change:14.2,vol:12, img:'/img/cards/gengar-vmax-alt.webp', grade:'BGS 9.5' },
]

const TRANSACTIONS = [
  { card:'Charizard ex Alt Art',  price:1240, type:'buy'  as const, source:'eBay',  seller:'RedDragonKai', lang:'EN', grade:'PSA 10' },
  { card:'Umbreon VMAX Alt Art',     price:880,  type:'buy'  as const, source:'CM',    seller:'SakuraTCG',    lang:'JP', grade:'Raw' },
  { card:'Rayquaza Gold Star',     price:720,  type:'sell' as const, source:'eBay',  seller:'GoldStarFR',   lang:'EN', grade:'PSA 9' },
  { card:'Lugia Neo Genesis',      price:580,  type:'buy'  as const, source:'eBay',  seller:'VintageJP',    lang:'JP', grade:'PSA 8' },
  { card:'Gengar VMAX Alt Art',      price:340,  type:'buy'  as const, source:'CM',    seller:'PsychicDeck',  lang:'FR', grade:'Raw' },
  { card:'Mew ex Alt Art',           price:142,  type:'sell' as const, source:'eBay',  seller:'NewCollect',   lang:'EN', grade:'Raw' },
  { card:'Pikachu Illustrator',    price:4200, type:'buy'  as const, source:'Goldin',seller:'WhaleJP',      lang:'JP', grade:'PSA 10' },
  { card:'Blastoise Base Set',     price:620,  type:'sell' as const, source:'CM',    seller:'VintageEU',    lang:'EN', grade:'PCA 9' },
  { card:'Espeon VMAX Alt Art',      price:418,  type:'buy'  as const, source:'CM',    seller:'EeveeFanFR',   lang:'FR', grade:'CGC 9.5' },
  { card:'Dragonite V Alt Art',      price:290,  type:'buy'  as const, source:'eBay',  seller:'DragonLord',   lang:'EN', grade:'Raw' },
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
function Chart({ data, color, period, height=360, volume, ma7, ma30 }: { data:number[]; color:string; period:Period; height?:number; volume?:number[]; ma7?:(number|null)[]; ma30?:(number|null)[] }) {
  const ref = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{x:number;y:number;val:number;idx:number}|null>(null)
  const W = 800, H = height, ML = 58, MR = 14, MT = 20, MB = 32
  const cw = W - ML - MR, ch = H - MT - MB
  const mn = Math.min(...data), mx = Math.max(...data), range = mx - mn || 1
  const first = data[0], last = data[data.length - 1]
  const isUp = last >= first

  // Smart Y ticks
  const rawStep = range / 6
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const nice = [1,2,2.5,5,10].find(n => n * mag >= rawStep) || 10
  const step = nice * mag
  const yMin = Math.floor(mn / step) * step
  const yTicks: number[] = []
  for (let v = yMin; v <= mx + step * .5; v += step) if (v >= mn - step * .5) yTicks.push(Math.round(v * 100) / 100)

  // X ticks
  const xCount = period === '1J' ? 8 : period === '1S' ? 7 : period === '1M' ? 6 : 6
  const xTicks: {idx:number;label:string}[] = []
  for (let i = 0; i < xCount; i++) {
    const idx = Math.round(i / (xCount - 1) * (data.length - 1))
    const d = new Date(); d.setDate(d.getDate() - (data.length - 1 - idx))
    let l = ''
    if (period === '1J') l = d.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})
    else if (['3A','5A','MAX'].includes(period)) l = d.toLocaleDateString('fr-FR', {month:'short',year:'numeric'})
    else if (period === '1A') l = d.toLocaleDateString('fr-FR', {month:'short',year:'2-digit'})
    else l = d.toLocaleDateString('fr-FR', {day:'numeric',month:'short'})
    xTicks.push({idx, label: l})
  }

  const px = (i: number) => ML + (i / (data.length - 1)) * cw
  const py = (v: number) => MT + (1 - (v - mn) / range) * ch
  const pts = data.map((v, i) => ({x: px(i), y: py(v), v}))

  // Smooth bezier
  const pathD = pts.length > 2 ? pts.reduce((a, p, i) => {
    if (i === 0) return 'M ' + p.x + ' ' + p.y
    const pr = pts[i-1], cx = (pr.x + p.x) / 2
    return a + ' C ' + cx + ' ' + pr.y + ' ' + cx + ' ' + p.y + ' ' + p.x + ' ' + p.y
  }, '') : pts.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y).join(' ')
  const areaD = pathD + ' L ' + pts[pts.length-1].x + ' ' + (MT + ch) + ' L ' + pts[0].x + ' ' + (MT + ch) + ' Z'

  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    const rx = (e.clientX - r.left) / r.width
    const dx = (rx * W - ML) / cw
    const idx = Math.round(dx * (data.length - 1))
    if (idx >= 0 && idx < pts.length) setHover({x: pts[idx].x, y: pts[idx].y, val: pts[idx].v, idx})
  }, [data, pts, W, ML, cw])

  const hoverLabel = (idx: number) => {
    const d = new Date(); d.setDate(d.getDate() - (data.length - 1 - idx))
    if (period === '1J') return d.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})
    return d.toLocaleDateString('fr-FR', {weekday:'short', day:'numeric', month:'long', year:'numeric'})
  }

  const fmtY = (v: number) => v >= 10000 ? (v/1000).toFixed(0) + 'k' : v >= 1000 ? (v/1000).toFixed(1) + 'k' : v.toLocaleString('fr-FR')
  const fmtFull = (v: number) => v.toLocaleString('fr-FR')

  const volH = ch * .14

  return (
    <svg ref={ref} viewBox={'0 0 ' + W + ' ' + H} style={{width:'100%', height, display:'block', cursor:'crosshair', userSelect:'none'}} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={.08}/>
          <stop offset="40%" stopColor={color} stopOpacity={.04}/>
          <stop offset="100%" stopColor={color} stopOpacity={0}/>
        </linearGradient>
        <linearGradient id="vup" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E9E6A" stopOpacity={.2}/>
          <stop offset="100%" stopColor="#2E9E6A" stopOpacity={.06}/>
        </linearGradient>
        <linearGradient id="vdn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E03020" stopOpacity={.2}/>
          <stop offset="100%" stopColor="#E03020" stopOpacity={.06}/>
        </linearGradient>
      </defs>

      {/* Background subtle grid */}
      {yTicks.map(v => {
        const y = py(v)
        if (y < MT - 4 || y > MT + ch + 4) return null
        return <g key={v}>
          <line x1={ML} x2={W - MR} y1={y} y2={y} stroke="rgba(0,0,0,.04)" strokeWidth={.5}/>
          <text x={ML - 10} y={y + 3.5} textAnchor="end" fill="#BBB" fontSize={10} fontFamily="var(--font-data)" fontWeight={500}>{fmtY(v)}</text>
        </g>
      })}

      {/* X labels */}
      {xTicks.map(t => (
        <g key={t.idx}>
          <line x1={px(t.idx)} x2={px(t.idx)} y1={MT} y2={MT + ch} stroke="rgba(0,0,0,.02)" strokeWidth={.5}/>
          <text x={px(t.idx)} y={H - 8} textAnchor="middle" fill="#BBB" fontSize={10} fontFamily="var(--font-display)" fontWeight={400}>{t.label}</text>
        </g>
      ))}

      {/* Opening price baseline */}
      <line x1={ML} x2={W - MR} y1={py(first)} y2={py(first)} stroke="rgba(0,0,0,.06)" strokeWidth={.5} strokeDasharray="6,4"/>
      <text x={W - MR + 4} y={py(first) + 3} fill="#CCC" fontSize={8} fontFamily="var(--font-data)">ouv.</text>

      {/* Volume bars */}
      {volume && volume.length === data.length && (() => {
        const maxV = Math.max(...volume)
        return <g>{volume.map((v, i) => {
          const bx = px(i)
          const bh = (v / maxV) * volH
          const bw = Math.max(cw / data.length * .65, 1.2)
          const up = data[i] >= (i > 0 ? data[i-1] : data[i])
          return <rect key={'v'+i} x={bx - bw/2} y={MT + ch - bh} width={bw} height={bh} fill={up ? 'url(#vup)' : 'url(#vdn)'} rx={.5}/>
        })}</g>
      })()}

      {/* Area + Main curve */}
      <path d={areaD} fill="url(#cg)"/>
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>

      {/* MA7 */}
      {ma7 && (() => {
        const p = (ma7 as (number|null)[]).reduce((a: string, v, i) => { if (v === null) return a; return a + (a ? 'L' : 'M') + ' ' + px(i) + ' ' + py(v) }, '')
        return p ? <path d={p} fill="none" stroke="#EF9F27" strokeWidth={1} strokeDasharray="4,3" opacity={.5}/> : null
      })()}

      {/* MA30 */}
      {ma30 && (() => {
        const p = (ma30 as (number|null)[]).reduce((a: string, v, i) => { if (v === null) return a; return a + (a ? 'L' : 'M') + ' ' + px(i) + ' ' + py(v) }, '')
        return p ? <path d={p} fill="none" stroke="#7E57C2" strokeWidth={1} strokeDasharray="6,4" opacity={.4}/> : null
      })()}

      {/* End dot with glow */}
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={6} fill={color} fillOpacity={.12}/>
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={3.5} fill={color} stroke="#fff" strokeWidth={2}/>

      {/* Start dot */}
      <circle cx={pts[0].x} cy={pts[0].y} r={2} fill="#CCC" stroke="#fff" strokeWidth={1.5}/>

      {/* Current price line extending to right edge */}
      <line x1={pts[pts.length-1].x} x2={W - MR} y1={pts[pts.length-1].y} y2={pts[pts.length-1].y} stroke={color} strokeWidth={.5} strokeDasharray="3,3" opacity={.4}/>
      <rect x={W - MR - 1} y={pts[pts.length-1].y - 9} width={MR + 1} height={18} fill={color} rx={2}/>
      <text x={W - MR/2} y={pts[pts.length-1].y + 3} textAnchor="middle" fill="#fff" fontSize={7.5} fontWeight={600} fontFamily="var(--font-data)">{fmtY(last)}</text>

      {/* Legend */}
      {(ma7 || ma30 || volume) && <g>
        <text x={ML + 4} y={MT + 12} fill="#CCC" fontSize={9} fontFamily="var(--font-display)">
          {'—'} Prix
        </text>
        {ma7 && <><circle cx={ML + 50} cy={MT + 9} r={3} fill="#EF9F27"/><text x={ML + 58} y={MT + 12} fill="#CCC" fontSize={9} fontFamily="var(--font-display)">MA7</text></>}
        {ma30 && <><circle cx={ML + 90} cy={MT + 9} r={3} fill="#7E57C2"/><text x={ML + 98} y={MT + 12} fill="#CCC" fontSize={9} fontFamily="var(--font-display)">MA30</text></>}
      </g>}

      {/* Hover */}
      {hover && <>
        {/* Crosshair */}
        <line x1={hover.x} x2={hover.x} y1={MT} y2={MT + ch} stroke="rgba(0,0,0,.12)" strokeWidth={.5}/>
        <line x1={ML} x2={W - MR} y1={hover.y} y2={hover.y} stroke="rgba(0,0,0,.06)" strokeWidth={.5} strokeDasharray="2,2"/>

        {/* Point */}
        <circle cx={hover.x} cy={hover.y} r={6} fill={color} fillOpacity={.12}/>
        <circle cx={hover.x} cy={hover.y} r={4} fill={color} stroke="#fff" strokeWidth={2}/>

        {/* Y-axis price tag */}
        <rect x={0} y={hover.y - 11} width={ML - 6} height={22} rx={4} fill={color}/>
        <text x={(ML - 6) / 2} y={hover.y + 3.5} textAnchor="middle" fill="#fff" fontSize={9} fontWeight={600} fontFamily="var(--font-data)">{fmtY(hover.val)}</text>

        {/* Top tooltip */}
        {(() => {
          const pctChange = ((hover.val - first) / first * 100)
          const tw = 140, th = 52
          const tx = Math.min(Math.max(hover.x - tw/2, ML), W - MR - tw)
          return <g>
            <rect x={tx} y={2} width={tw} height={th} rx={8} fill="#111" fillOpacity={.95}/>
            <text x={tx + tw/2} y={22} textAnchor="middle" fill="#fff" fontSize={16} fontWeight={700} fontFamily="var(--font-data)">{fmtFull(hover.val)} {'€'}</text>
            <text x={tx + tw/2} y={40} textAnchor="middle" fill={pctChange >= 0 ? '#4ADE80' : '#F87171'} fontSize={11} fontWeight={600} fontFamily="var(--font-data)">
              {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%{volume && volume[hover.idx] ? ' · ' + volume[hover.idx] + ' tx' : ''}
            </text>
          </g>
        })()}

        {/* Bottom date */}
        {(() => {
          const dw = 150
          const dx = Math.min(Math.max(hover.x - dw/2, ML), W - MR - dw)
          return <g>
            <rect x={dx} y={MT + ch + 4} width={dw} height={20} rx={4} fill="rgba(0,0,0,.06)"/>
            <text x={dx + dw/2} y={MT + ch + 17} textAnchor="middle" fill="#888" fontSize={9} fontFamily="var(--font-display)">{hoverLabel(hover.idx)}</text>
          </g>
        })()}
      </>}
    </svg>
  )
}



// ── COUNTUP ──
function CountUp({ target, suffix='', duration=1000 }: { target:number; suffix?:string; duration?:number }) {
  const [val, setVal] = useState(0)
  const ref = useRef(0)
  useEffect(() => {
    const t0 = performance.now()
    ;(function f(t: number) {
      const p = Math.min((t - t0) / duration, 1)
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) ref.current = requestAnimationFrame(f)
    })(t0)
    return () => cancelAnimationFrame(ref.current)
  }, [target, duration])
  return <>{val.toLocaleString('fr-FR')}{suffix}</>
}

// ── GRADE BADGES ──
const GRADE_STYLES: Record<string,{bg:string;color:string;border:string}> = {
  'PSA 10': {bg:'linear-gradient(135deg,#FEF3C7,#FDE68A)',color:'#92400E',border:'#F59E0B'},
  'PSA 9':  {bg:'linear-gradient(135deg,#F5F5F7,#E8E8ED)',color:'#555',border:'#C7C7CC'},
  'PSA 8':  {bg:'#F5F5F7',color:'#888',border:'#D4D4D4'},
  'CGC 10': {bg:'linear-gradient(135deg,#EFF6FF,#DBEAFE)',color:'#1E40AF',border:'#60A5FA'},
  'CGC 9.5':{bg:'#EFF6FF',color:'#2563EB',border:'#93C5FD'},
  'BGS 10': {bg:'linear-gradient(135deg,#FEF2F2,#FECACA)',color:'#991B1B',border:'#F87171'},
  'BGS 9.5':{bg:'#FEF2F2',color:'#B91C1C',border:'#FCA5A5'},
  'PCA 10': {bg:'linear-gradient(135deg,#F0FDF4,#DCFCE7)',color:'#166534',border:'#4ADE80'},
  'PCA 9':  {bg:'#F0FFF4',color:'#22C55E',border:'#BBF7D0'},
  'Raw':    {bg:'transparent',color:'#AAA',border:'#E5E5EA'},
}
function GradeBadge({grade,size='md'}:{grade:string;size?:'sm'|'md'|'lg'}){
  const st=GRADE_STYLES[grade]||GRADE_STYLES['Raw']
  if(!grade||grade==='Raw')return <span style={{fontSize:9,color:'#BBB',background:'#F5F5F7',padding:'1px 5px',borderRadius:3,fontFamily:'var(--font-data)'}}>Raw</span>
  const sz=size==='lg'?{fs:11,px:10,py:3}:size==='sm'?{fs:8,px:5,py:1}:{fs:9,px:7,py:2}
  return(
    <span style={{fontSize:sz.fs,fontWeight:700,color:st.color,background:st.bg,border:'1px solid '+st.border,padding:sz.py+'px '+sz.px+'px',borderRadius:4,fontFamily:'var(--font-data)',letterSpacing:'.02em',whiteSpace:'nowrap',lineHeight:1,display:'inline-flex',alignItems:'center'}}>
      {grade}
    </span>
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
  const [showMA, setShowMA] = useState(true)
  const [showVol, setShowVol] = useState(true)
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
  const chartVol = useMemo(() => getVolume(chartData), [chartData])
  const chartMA7 = useMemo(() => calcMA(chartData, 7), [chartData])
  const chartMA30 = useMemo(() => calcMA(chartData, 30), [chartData])

  // Live feed
  useEffect(() => {
    if (feedPaused) return
    const t = setInterval(() => {
      const src = TRANSACTIONS[Math.floor(Math.random() * TRANSACTIONS.length)]
      const variation = 1 + (Math.random() - 0.5) * 0.1
      const tx = { ...src, id: Date.now(), time: "\u00c0 l'instant", price: Math.round(src.price * variation), grade: src.grade }
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
        @keyframes stagger{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .stat-box{transition:all .2s cubic-bezier(.2,.8,.2,1) !important;cursor:default;animation:stagger .4s ease-out both}
        .stat-box:nth-child(1){animation-delay:.05s}.stat-box:nth-child(2){animation-delay:.1s}.stat-box:nth-child(3){animation-delay:.15s}.stat-box:nth-child(4){animation-delay:.2s}.stat-box:nth-child(5){animation-delay:.25s}
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
        .stat-box:hover{border-color:#C7C7CC;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.03)}
        .idx-card{transition:all .2s cubic-bezier(.2,.8,.2,1) !important;animation:stagger .4s ease-out both}
        .idx-card:nth-child(1){animation-delay:.1s}.idx-card:nth-child(2){animation-delay:.15s}.idx-card:nth-child(3){animation-delay:.2s}.idx-card:nth-child(4){animation-delay:.25s}
        .idx-card:nth-child(5){animation-delay:.3s}.idx-card:nth-child(6){animation-delay:.35s}.idx-card:nth-child(7){animation-delay:.4s}.idx-card:nth-child(8){animation-delay:.45s}
        .idx-card:hover{transform:translateY(-2px) !important;box-shadow:0 6px 20px rgba(0,0,0,.06) !important}
        .idx-card.on{transform:translateY(-2px) !important;box-shadow:0 0 0 1.5px var(--ac),0 6px 20px rgba(0,0,0,.06) !important}
        .mv-row{transition:all .12s !important}
        .mv-row:hover{background:#FAFAFA !important;transform:translateX(2px)}
        .tx-row{transition:all .12s !important}
        .tx-row:hover{background:#FAFAFA !important}
        @keyframes txSlide{from{opacity:0;transform:translateX(-8px);background:#F0FFF6}to{opacity:1;transform:translateX(0);background:transparent}}
        @keyframes countUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .tx-new{animation:txSlide .4s ease-out !important}
        .sentiment-bar{height:6px;border-radius:99px;overflow:hidden;display:flex}
        .sentiment-bar div{height:100%;transition:width .5s ease}
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
      
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes stagger{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .stat-box{transition:all .2s cubic-bezier(.2,.8,.2,1) !important;cursor:default;animation:stagger .4s ease-out both}
        .stat-box:nth-child(1){animation-delay:.05s}.stat-box:nth-child(2){animation-delay:.1s}.stat-box:nth-child(3){animation-delay:.15s}.stat-box:nth-child(4){animation-delay:.2s}.stat-box:nth-child(5){animation-delay:.25s}
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
        .stat-box:hover{border-color:#C7C7CC;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.03)}
        .idx-card{transition:all .2s cubic-bezier(.2,.8,.2,1) !important;animation:stagger .4s ease-out both}
        .idx-card:nth-child(1){animation-delay:.1s}.idx-card:nth-child(2){animation-delay:.15s}.idx-card:nth-child(3){animation-delay:.2s}.idx-card:nth-child(4){animation-delay:.25s}
        .idx-card:nth-child(5){animation-delay:.3s}.idx-card:nth-child(6){animation-delay:.35s}.idx-card:nth-child(7){animation-delay:.4s}.idx-card:nth-child(8){animation-delay:.45s}
        .idx-card:hover{transform:translateY(-2px) !important;box-shadow:0 6px 20px rgba(0,0,0,.06) !important}
        .idx-card.on{transform:translateY(-2px) !important;box-shadow:0 0 0 1.5px var(--ac),0 6px 20px rgba(0,0,0,.06) !important}
        .mv-row{transition:all .12s !important}
        .mv-row:hover{background:#FAFAFA !important;transform:translateX(2px)}
        .tx-row{transition:all .12s !important}
        .tx-row:hover{background:#FAFAFA !important}
        @keyframes txSlide{from{opacity:0;transform:translateX(-8px);background:#F0FFF6}to{opacity:1;transform:translateX(0);background:transparent}}
        @keyframes countUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .tx-new{animation:txSlide .4s ease-out !important}
        .sentiment-bar{height:6px;border-radius:99px;overflow:hidden;display:flex}
        .sentiment-bar div{height:100%;transition:width .5s ease}
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
            <h1 style={{ fontSize:28, fontWeight:700, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-.6px', margin:'0 0 6px' }}>Market Terminal</h1>
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
        
        {/* ═══ MARKET PULSE ═══ */}
        <div style={{ display:'flex', gap:8, marginBottom:18 }}>
          <div style={{ flex:1, background:'#fff', border:'1px solid #EBEBEB', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:11, fontWeight:600, color:'#888', fontFamily:'var(--font-display)' }}>Sentiment march{'é'}</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#2E9E6A', fontFamily:'var(--font-data)' }}>Hausse</span>
            </div>
            <div className="sentiment-bar" style={{ marginBottom:6 }}>
              <div style={{ width:'68%', background:'linear-gradient(90deg,#2E9E6A,#4ADE80)', borderRadius:'99px 0 0 99px' }} />
              <div style={{ width:'32%', background:'linear-gradient(90deg,#F87171,#E03020)', borderRadius:'0 99px 99px 0' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#AAA', fontFamily:'var(--font-data)' }}>
              <span>68% acheteurs</span>
              <span>32% vendeurs</span>
            </div>
          </div>
          <div style={{ flex:1, background:'#fff', border:'1px solid #EBEBEB', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:11, fontWeight:600, color:'#888', fontFamily:'var(--font-display)' }}>Fear & Greed Index</span>
              <span style={{ fontSize:20, fontWeight:700, color:'#2E9E6A', fontFamily:'var(--font-data)' }}>72</span>
            </div>
            <div style={{ height:6, background:'#F0F0F0', borderRadius:99, overflow:'hidden', marginBottom:6 }}>
              <div style={{ height:'100%', width:'72%', background:'linear-gradient(90deg,#E03020 0%,#EF9F27 30%,#2E9E6A 70%,#2E9E6A 100%)', borderRadius:99, transition:'width .5s ease' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#BBB', fontFamily:'var(--font-display)' }}>
              <span>Peur extr{'ê'}me</span>
              <span>Neutre</span>
              <span>Avidit{'é'}</span>
            </div>
          </div>
          <div style={{ flex:1, background:'#fff', border:'1px solid #EBEBEB', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:11, fontWeight:600, color:'#888', fontFamily:'var(--font-display)', marginBottom:8 }}>Activit{'é'} 24h</div>
            <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:40 }}>
              {[32,45,28,52,68,41,55,72,38,61,78,65,43,58,82,71,48,63,54,89,67,74,56,81].map((v,i) => (
                <div key={i} style={{ flex:1, height:v+'%', background:i===23?'#E03020':i>20?'#2E9E6A':'#E5E5EA', borderRadius:1.5, transition:'height .3s ease' }} />
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#BBB', fontFamily:'var(--font-data)', marginTop:4 }}>
              <span>00h</span>
              <span>12h</span>
              <span>Maintenant</span>
            </div>
          </div>
        </div>

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
                  <span style={{ fontSize:10, fontWeight:600, color:on?i.color:'#888', fontFamily:'var(--font-display)', letterSpacing:'.04em', transition:'color .15s' }}>{i.ticker}</span>
                  <Spark data={spark} color={pct >= 0 ? '#2E9E6A' : '#E03020'} w={48} h={16} />
                </div>
                <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--font-data)', letterSpacing:'-1px', marginBottom:2, lineHeight:1 }}>{cur.toLocaleString('fr-FR')}</div>
                <div style={{ fontSize:11, fontWeight:600, color:pct >= 0 ? '#2E9E6A' : '#E03020', fontFamily:'var(--font-data)' }}>
                  {pct >= 0 ? '\u25b2' : '\u25bc'} {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                </div>
                <div style={{ fontSize:9, color:'#CCC', marginTop:2 }}>{i.desc}</div>
              </div>
            )
          })}
        </div>

        {/* ═══ CHART ═══ */}
        <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:14, padding:'20px 22px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:idx.color }} />
                <span style={{ fontSize:14, fontWeight:600, fontFamily:'var(--font-display)' }}>{idx.label}</span>
              </div>
              <div style={{ display:'flex', alignItems:'baseline', gap:10, marginTop:4 }}>
                <span style={{ fontSize:32, fontWeight:700, fontFamily:'var(--font-data)', letterSpacing:'-1.5px' }}><CountUp target={curVal} duration={1000}/></span>
                <span style={{ fontSize:14, fontWeight:600, color:isUp?'#2E9E6A':'#E03020', fontFamily:'var(--font-data)', background:isUp?'rgba(46,158,106,.06)':'rgba(224,48,32,.06)', padding:'2px 10px', borderRadius:6 }}>
                  {isUp?'\u25b2':'\u25bc'} {isUp?'+':''}{chgAbs.toLocaleString('fr-FR')} ({isUp?'+':''}{chgPct.toFixed(2)}%)
                </span>
              </div>
              <div style={{ display:'flex', gap:16, marginTop:8, fontSize:11, color:'#AAA', fontFamily:'var(--font-data)' }}>
                <span>H <strong style={{color:'#2E9E6A'}}>{Math.max(...chartData).toLocaleString('fr-FR')}</strong></span>
                <span>L <strong style={{color:'#E03020'}}>{Math.min(...chartData).toLocaleString('fr-FR')}</strong></span>
                <span>Amp <strong style={{color:'#555'}}>{(Math.max(...chartData)-Math.min(...chartData)).toLocaleString('fr-FR')}</strong></span>
                <span>Moy <strong style={{color:'#555'}}>{Math.round(chartData.reduce((a:number,b:number)=>a+b,0)/chartData.length).toLocaleString('fr-FR')}</strong></span>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ display:'flex', gap:4 }}>
                {(['1J','1S','1M','3M','1A','3A','5A','MAX'] as Period[]).map(p => (
                  <button key={p} className={`per-btn${period===p?' on':''}`} onClick={() => setPeriod(p)}>{p}</button>
                ))}
              </div>
              <div style={{ height:16, width:1, background:'#EBEBEB' }} />
              <button className={`per-btn${showMA?' on':''}`} onClick={() => setShowMA(v=>!v)} style={{ fontSize:10 }}>MA</button>
              <button className={`per-btn${showVol?' on':''}`} onClick={() => setShowVol(v=>!v)} style={{ fontSize:10 }}>Vol</button>
            </div>
          </div>
          <Chart data={chartData} color={isUp ? '#2E9E6A' : '#E03020'} period={period} height={360} volume={showVol?chartVol:undefined} ma7={showMA?chartMA7:undefined} ma30={showMA&&chartData.length>30?chartMA30:undefined} />
        </div>

        {/* ═══ MOVERS + FEED ═══ */}
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
              {(moverTab === 'up' ? moversUp : moversDown).map((m, mIdx) => (
                <div key={m.name} className="mv-row" onClick={()=>openCard(m.name)}>
                  <span style={{ fontSize:10, fontWeight:700, color:'#CCC', fontFamily:'var(--font-data)', width:16, textAlign:'center', flexShrink:0 }}>{mIdx+1}</span>
                  <img src={m.img} alt="" style={{ width:36, height:50, objectFit:'cover', borderRadius:5, border:'1px solid #F0F0F0', flexShrink:0 }} onError={e=>{const t=e.target as HTMLImageElement;t.style.background='#F5F5F7';t.style.padding='4px'}} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:1 }}>
                      <span style={{ fontSize:10, color:'#BBB' }}>{m.set} {'\u00b7'} {m.vol} tx</span>
                      {m.grade && <GradeBadge grade={m.grade} size="sm"/>}
                    </div>
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
                <div key={tx.id} className={`tx-row${tx.id === newTx ? ' tx-new' : ''}`}>
                  <div style={{ width:28, height:28, borderRadius:8, background:tx.type==='buy'?'#F0FFF6':'#FFF0EE', border:`1px solid ${tx.type==='buy'?'#AAEEC8':'#FFD8D0'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0, color:tx.type==='buy'?'#2E9E6A':'#E03020', position:'relative' }}>
                    {tx.type === 'buy' ? '\u2197' : '\u2199'}
                    {tx.id === newTx && <div style={{ position:'absolute', top:-2, right:-2, width:7, height:7, borderRadius:'50%', background:'#2E9E6A', border:'1.5px solid #fff', animation:'pulse 1s infinite' }}/>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <span style={{ fontSize:12, fontWeight:500, fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.card}</span>
                      {tx.grade && <GradeBadge grade={tx.grade} size="sm"/>}
                    </div>
                    <div style={{ fontSize:10, color:'#BBB', marginTop:1 }}><span style={{fontSize:9,fontWeight:600,color:tx.source==='eBay'?'#378ADD':tx.source==='CM'?'#EF9F27':'#888',background:tx.source==='eBay'?'rgba(55,138,221,.06)':tx.source==='CM'?'rgba(239,159,39,.06)':'#F5F5F7',padding:'1px 5px',borderRadius:3}}>{tx.source}</span> {tx.seller} {'\u00b7'} {tx.lang} {'\u00b7'} {tx.time}</div>
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

      </div>
    </>
  )
}