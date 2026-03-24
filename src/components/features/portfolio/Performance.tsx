'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/Card'

const PERIODS = ['7J','1M','3M','6M','1A','Tout'] as const
type Period = typeof PERIODS[number]

const PERF_DATA: Record<Period, {date:string;value:number;index:number}[]> = {
  '7J': [
    {date:'Lun',value:51200,index:2710},{date:'Mar',value:51800,index:2720},
    {date:'Mer',value:52400,index:2730},{date:'Jeu',value:53100,index:2750},
    {date:'Ven',value:52800,index:2745},{date:'Sam',value:53900,index:2780},
    {date:'Dim',value:54280,index:2841},
  ],
  '1M': [
    {date:'S1',value:47000,index:2600},{date:'S2',value:49000,index:2650},
    {date:'S3',value:51500,index:2720},{date:'S4',value:54280,index:2841},
  ],
  '3M': [
    {date:'Jan',value:40000,index:2400},{date:'Fév',value:44000,index:2520},
    {date:'Mar',value:54280,index:2841},
  ],
  '6M': [
    {date:'Oct',value:32000,index:2200},{date:'Nov',value:36000,index:2300},
    {date:'Déc',value:38000,index:2350},{date:'Jan',value:40000,index:2400},
    {date:'Fév',value:44000,index:2520},{date:'Mar',value:54280,index:2841},
  ],
  '1A': [
    {date:'Avr',value:24000,index:1900},{date:'Juil',value:30000,index:2100},
    {date:'Oct',value:32000,index:2200},{date:'Jan',value:40000,index:2400},
    {date:'Mar',value:54280,index:2841},
  ],
  'Tout': [
    {date:'2024',value:18000,index:1600},{date:'Avr',value:24000,index:1900},
    {date:'Juil',value:30000,index:2100},{date:'2025',value:40000,index:2400},
    {date:'Mar',value:54280,index:2841},
  ],
}

function MiniChart({ data, color }: { data:{value:number}[]; color:string }) {
  const W=200, H=40
  const vals = data.map(d=>d.value)
  const min  = Math.min(...vals), max = Math.max(...vals)
  const pts   = vals.map((v,i) => `${(i/(vals.length-1))*W},${H-((v-min)/(max-min||1))*(H-4)-2}`)
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow:'visible' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
      <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#E03020', flexShrink:0 }} />
      <span style={{ fontSize:'10px', fontWeight:600, color:'#888', textTransform:'uppercase' as const, letterSpacing:'0.1em', fontFamily:'var(--font-display)' }}>{children}</span>
      <div style={{ flex:1, height:'1px', background:'linear-gradient(90deg,#EBEBEB,transparent)' }} />
    </div>
  )
}

export function Performance() {
  const [period, setPeriod] = useState<Period>('1M')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const data = PERF_DATA[period]

  // Draw chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)

    const vals  = data.map(d => d.value)
    const idxs  = data.map(d => d.index)
    const allV  = [...vals,...idxs]
    const minV  = Math.min(...allV)*0.97
    const maxV  = Math.max(...allV)*1.02
    const toY   = (v:number) => H - ((v-minV)/(maxV-minV))*H
    const toX   = (i:number) => (i/(data.length-1))*(W-1)

    // Grid lines
    ctx.strokeStyle = '#F0F0F0'
    ctx.lineWidth   = 1
    for (let i=0;i<4;i++) {
      const y = (H/4)*i
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke()
    }

    // Index line
    ctx.beginPath()
    ctx.strokeStyle = '#D4D4D4'
    ctx.lineWidth   = 1.5
    ctx.setLineDash([4,4])
    data.forEach((d,i) => { i===0?ctx.moveTo(toX(i),toY(d.index)):ctx.lineTo(toX(i),toY(d.index)) })
    ctx.stroke()
    ctx.setLineDash([])

    // Portfolio area fill
    ctx.beginPath()
    data.forEach((d,i) => { i===0?ctx.moveTo(toX(i),toY(d.value)):ctx.lineTo(toX(i),toY(d.value)) })
    ctx.lineTo(toX(data.length-1), H)
    ctx.lineTo(0, H)
    ctx.closePath()
    ctx.fillStyle = 'rgba(46,158,106,0.06)'
    ctx.fill()

    // Portfolio line
    ctx.beginPath()
    ctx.strokeStyle = '#2E9E6A'
    ctx.lineWidth   = 2.5
    ctx.lineJoin    = 'round'
    data.forEach((d,i) => { i===0?ctx.moveTo(toX(i),toY(d.value)):ctx.lineTo(toX(i),toY(d.value)) })
    ctx.stroke()

    // Dots
    data.forEach((d,i) => {
      ctx.beginPath()
      ctx.arc(toX(i), toY(d.value), 3, 0, Math.PI*2)
      ctx.fillStyle = '#2E9E6A'
      ctx.fill()
    })

    // X labels
    ctx.fillStyle = '#BBBBBB'
    ctx.font      = '11px var(--font-display, system-ui)'
    ctx.textAlign = 'center'
    data.forEach((d,i) => ctx.fillText(d.date, toX(i), H+16))
  }, [period, data])

  const first = data[0].value, last = data[data.length-1].value
  const gain  = last - first
  const roi   = Math.round((gain/first)*100)

  return (
    <>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .period-btn:hover  { background:#F0F0F0 !important; }
        .period-btn.active { background:#111 !important; color:#fff !important; }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        <div style={{ marginBottom:'22px' }}>
          <p style={{ fontSize:'10px', color:'#888', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Portfolio</p>
          <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:0 }}>Performance</h1>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'22px' }}>
          {[
            { label:'Valeur actuelle', value:'€ 54,280', sub:'Portfolio total',         color:'#111'    },
            { label:'Gain',            value:`+€ ${gain.toLocaleString('fr-FR')}`, sub:`Sur ${period}`, color:'#2E9E6A' },
            { label:'ROI période',     value:`+${roi}%`,  sub:`vs Index +${Math.round((data[data.length-1].index-data[0].index)/data[0].index*100)}%`, color:'#2E9E6A' },
            { label:'Best month',      value:'+€ 8,200',  sub:'Février 2026',           color:'#FF8C00' },
          ].map((s,i) => (
            <div key={i} style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:'12px', padding:'14px 16px' }}>
              <div style={{ fontSize:'9px', color:'#888', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:'var(--font-display)', marginBottom:'6px' }}>{s.label}</div>
              <div style={{ fontSize:'20px', fontWeight:600, color:s.color, fontFamily:'var(--font-display)', letterSpacing:'-0.5px', lineHeight:1, marginBottom:'4px' }}>{s.value}</div>
              <div style={{ fontSize:'10px', color:'#888' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* CHART */}
        <SecTitle>Courbe de valeur</SecTitle>
        <Card padding="lg" style={{ marginBottom:'18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
            <div style={{ display:'flex', gap:'16px', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <div style={{ width:'16px', height:'2px', background:'#2E9E6A', borderRadius:'2px' }} />
                <span style={{ fontSize:'11px', color:'#888', fontFamily:'var(--font-display)' }}>Mon portfolio</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <div style={{ width:'16px', height:'2px', background:'#D4D4D4', borderRadius:'2px', borderStyle:'dashed', borderWidth:'1px 0' }} />
                <span style={{ fontSize:'11px', color:'#888', fontFamily:'var(--font-display)' }}>Cards Index</span>
              </div>
            </div>
            <div style={{ display:'flex', gap:'4px', background:'#F5F5F5', borderRadius:'8px', padding:'3px' }}>
              {PERIODS.map(p => (
                <button key={p} className={`period-btn${period===p?' active':''}`} onClick={() => setPeriod(p)} style={{ padding:'4px 10px', borderRadius:'6px', border:'none', background:period===p?'#111':'transparent', color:period===p?'#fff':'#666', fontSize:'11px', fontWeight:500, cursor:'pointer', fontFamily:'var(--font-display)', transition:'all 0.12s' }}>{p}</button>
              ))}
            </div>
          </div>
          <div style={{ position:'relative', paddingBottom:'24px' }}>
            <canvas ref={canvasRef} width={800} height={200} style={{ width:'100%', height:'200px', display:'block' }} />
          </div>
        </Card>

        {/* BREAKDOWN */}
        <SecTitle>Performance par carte</SecTitle>
        <Card padding="none">
          {[
            { name:'Charizard Alt Art', set:'SV151',          buy:620,  cur:920,  mini:[620,680,720,800,850,920] },
            { name:'Umbreon VMAX Alt',  set:'Evolving Skies', buy:540,  cur:880,  mini:[540,580,620,700,780,880] },
            { name:'Rayquaza VMAX Alt', set:'Evolving Skies', buy:480,  cur:740,  mini:[480,520,560,620,680,740] },
            { name:'Charizard VMAX',    set:'Champion Path',  buy:280,  cur:420,  mini:[280,300,320,360,390,420] },
            { name:'Blastoise Base',    set:'Base Set',        buy:480,  cur:620,  mini:[480,500,520,560,590,620] },
          ].map((c,i) => {
            const roi = Math.round(((c.cur-c.buy)/c.buy)*100)
            return (
              <div key={c.name} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 160px', gap:'0', padding:'12px 16px', borderBottom: i<4 ? '1px solid #F5F5F5' : 'none', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)', marginBottom:'2px' }}>{c.name}</div>
                  <div style={{ fontSize:'10px', color:'#888' }}>{c.set}</div>
                </div>
                <div style={{ textAlign:'right', fontSize:'12px', color:'#888', fontFamily:'var(--font-display)' }}>€ {c.buy}</div>
                <div style={{ textAlign:'right', fontSize:'12px', fontWeight:500, color:'#111', fontFamily:'var(--font-display)' }}>€ {c.cur}</div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#2E9E6A', fontFamily:'var(--font-display)' }}>+{roi}%</div>
                  <div style={{ fontSize:'10px', color:'#2E9E6A' }}>+€ {c.cur-c.buy}</div>
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <MiniChart data={c.mini.map(v=>({value:v}))} color="#2E9E6A" />
                </div>
              </div>
            )
          })}
        </Card>

      </div>
    </>
  )
}
