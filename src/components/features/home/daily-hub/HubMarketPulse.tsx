'use client'

import { useRouter } from 'next/navigation'
import type { MarketIndex } from '@/lib/useMarketData'
import { SNOW, FONT, GLASS, RADIUS } from '@/lib/design/snow'

/**
 * HubMarketPulse — les 4 indices de marché réels (sparkline + variation 24h).
 * Données 100% réelles (vue SQL market_indices). Gaté premium côté orchestrateur.
 */
export function HubMarketPulse({
  indices, loading,
}: {
  indices: MarketIndex[]
  loading: boolean
}) {
  const router = useRouter()
  const hasData = !loading && indices.length > 0

  return (
    <div style={{ ...GLASS.card, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{
          fontSize: 11, color: SNOW.muted, textTransform: 'uppercase',
          letterSpacing: '0.1em', fontWeight: 600, fontFamily: FONT.display,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ display: 'inline-block', width: 3, height: 12, background: SNOW.ink, borderRadius: 2 }} />
          Pouls du marché
        </span>
        <button
          onClick={() => router.push('/market')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: SNOW.muted, fontFamily: FONT.body,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          Voir le marché <span style={{ fontSize: 13 }}>→</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{
            height: 78, borderRadius: RADIUS.md,
            background: 'linear-gradient(90deg, rgba(0,0,0,0.03) 25%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.03) 75%)',
            backgroundSize: '200% 100%', animation: 'kcShimmer 1.4s ease-in-out infinite',
          }} />
        ))}

        {hasData && indices.map((idx) => {
          const up = idx.change_24h_pct >= 0
          const color = up ? SNOW.green : SNOW.red
          return (
            <button
              key={idx.id}
              onClick={() => router.push('/market')}
              style={{
                ...GLASS.cardSoft,
                padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: 8,
                transition: 'transform .2s cubic-bezier(.2,.8,.2,1)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: SNOW.inkSoft,
                  fontFamily: FONT.display, whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{idx.label}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color, fontFamily: FONT.data,
                  fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                }}>
                  {up ? '▲' : '▼'} {up ? '+' : ''}{idx.change_24h_pct.toFixed(1)}%
                </span>
              </div>
              <MiniSpark points={idx.sparkline} up={up} />
            </button>
          )
        })}

        {!loading && !hasData && (
          <div style={{ fontSize: 13, color: SNOW.mutedLight, fontFamily: FONT.body, gridColumn: '1 / -1', padding: '8px 0' }}>
            Indices indisponibles pour le moment.
          </div>
        )}
      </div>
    </div>
  )
}

function MiniSpark({ points, up }: { points: number[]; up: boolean }) {
  const W = 150, H = 34
  if (!points || points.length < 2) {
    return <div style={{ height: H, display: 'flex', alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: SNOW.mutedExtraLight, fontFamily: FONT.body }}>—</span>
    </div>
  }
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const stepX = W / (points.length - 1)
  const coords = points.map((p, i) => ({ x: i * stepX, y: H - ((p - min) / range) * H }))
  let d = `M ${coords[0].x},${coords[0].y}`
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1], curr = coords[i]
    const cx = prev.x + (curr.x - prev.x) / 2
    d += ` C ${cx},${prev.y} ${cx},${curr.y} ${curr.x},${curr.y}`
  }
  const color = up ? SNOW.green : SNOW.red
  const area = `${d} L ${W},${H} L 0,${H} Z`
  const gid = `pulse-${up ? 'u' : 'd'}`
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.20" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
