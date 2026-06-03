'use client'

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import type { MarketIndex } from '@/lib/useMarketData'
import { SNOW, FONT, GLASS, RADIUS } from '@/lib/design/snow'

export function TermIndices({ indices }: { indices: MarketIndex[] }) {
  if (indices.length === 0) return null

  return (
    <div>
      <SectionTitle>Indices marché</SectionTitle>
      <style>{`
        @keyframes idxIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .idx-card{transition:transform .35s cubic-bezier(.16,1,.3,1), box-shadow .35s}
        .idx-card:hover{transform:translateY(-3px) scale(1.006);box-shadow:0 14px 44px rgba(0,0,0,.09),0 0 0 0.5px rgba(255,255,255,.7)}
        @media (prefers-reduced-motion: reduce){ .idx-card,.idx-card:hover{animation:none !important;transform:none !important} }
      `}</style>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'12px' }}>
        {indices.map((idx,i) => (
          <IndexCard key={idx.id} index={idx} i={i} />
        ))}
      </div>
    </div>
  )
}

function IndexCard({ index, i }: { index: MarketIndex; i: number }) {
  const isUp = index.change_24h_pct >= 0
  const trendColor = isUp ? SNOW.greenAccent : SNOW.red
  const sign = isUp ? '+' : ''
  const hasData = index.sparkline.length > 0 && index.current > 0
  const chartData = index.sparkline.map((v, k) => ({ i: k, value: v }))

  return (
    <div className="idx-card" style={{
      ...GLASS.card,
      padding:'16px 18px',
      position:'relative',
      overflow:'hidden',
      boxShadow:`${GLASS.card.boxShadow as string}, 0 0 0 0.5px rgba(255,255,255,0.7)`,
      animation:`idxIn .4s cubic-bezier(.16,1,.3,1) ${i*55}ms both`,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:'9px', color:SNOW.mutedExtraLight, fontFamily:FONT.data, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'2px' }}>{index.ticker}</div>
          <div style={{ fontSize:'12px', fontWeight:600, color:SNOW.ink, fontFamily:FONT.display, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{index.label}</div>
        </div>
        {hasData && (
          <div style={{ display:'inline-flex', alignItems:'center', gap:'3px', padding:'3px 7px', background:isUp?'rgba(38,166,91,.10)':SNOW.redLight, borderRadius:'5px', flexShrink:0 }}>
            <span style={{ fontSize:'9px', color:trendColor, fontWeight:700 }}>{isUp ? '▲' : '▼'}</span>
            <span style={{ fontSize:'11px', fontWeight:700, color:trendColor, fontFamily:FONT.data, fontVariantNumeric:'tabular-nums' }}>
              {sign}{Number(index.change_24h_pct ?? 0).toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      <div style={{ fontSize:'24px', fontWeight:700, color:SNOW.ink, fontFamily:FONT.data, letterSpacing:'-0.5px', fontVariantNumeric:'tabular-nums', lineHeight:1.1, marginBottom:'4px' }}>{hasData ? formatValue(index.current) : '—'}</div>

      <div style={{ fontSize:'10px', color:SNOW.muted, fontFamily:FONT.body, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:'12px' }}>{index.description}</div>

      {hasData && chartData.length > 1 ? (
        <div style={{ width:'100%', height:'40px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top:4, right:0, bottom:0, left:0 }}>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Line type="monotone" dataKey="value" stroke={isUp ? SNOW.greenAccent : SNOW.red} strokeWidth={1.8} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ width:'100%', height:'40px', background:SNOW.border, borderRadius:'4px', opacity:0.3 }} />
      )}
    </div>
  )
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${Number(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000)     return `${Number(v / 1_000).toFixed(2)}K`
  return Number(v ?? 0).toFixed(0)
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
      <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:SNOW.red, flexShrink:0 }} />
      <span style={{ fontSize:'10px', fontWeight:600, color:SNOW.muted, textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:FONT.display }}>{children}</span>
      <div style={{ flex:1, height:'1px', background:`linear-gradient(90deg, ${SNOW.border}, transparent)` }} />
    </div>
  )
}
