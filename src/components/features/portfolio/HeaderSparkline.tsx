'use client'

import { useEffect, useMemo, useState } from 'react'

const PERIODS = ['7J', '1M', '3M', '6M', '1A', 'Tout'] as const
type Period = typeof PERIODS[number]

type Point = { day: string; value: number; cost: number }

/**
 * Mini-graphe d'evolution pour le header Portfolio (persona Investisseur).
 * VRAIE donnee : /api/portfolio/history (snapshots quotidiens).
 * Si < 2 points : ligne plate au niveau de la valeur actuelle (historique en construction).
 */
export function HeaderSparkline({
  totalValue,
  height = 84,
}: {
  totalValue: number
  height?: number
}) {
  const [period, setPeriod] = useState<Period>('1M')
  const [points, setPoints] = useState<Point[]>([])
  const [enough, setEnough] = useState(false)
  const [loading, setLoading] = useState(true)
  const width = 560

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/portfolio/history?period=${period}`)
      .then(r => r.ok ? r.json() : { points: [], hasEnoughData: false })
      .then(d => { if (alive) { setPoints(d.points || []); setEnough(!!d.hasEnoughData) } })
      .catch(() => { if (alive) { setPoints([]); setEnough(false) } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [period])

  // Serie a tracer : vraie si assez de points, sinon ligne plate (valeur actuelle)
  const series = useMemo(() => {
    if (enough && points.length >= 2) return points.map(p => p.value)
    return [totalValue, totalValue] // ligne plate
  }, [enough, points, totalValue])

  const first = series[0]
  const lastVal = series[series.length - 1]
  const isUp = lastVal >= first
  const stroke = enough ? (isUp ? '#2E9E6A' : '#E03020') : '#AEAEB2' // gris si pas encore de vraie courbe

  const padX = 6, padTop = 12, padBottom = 14
  const min = Math.min(...series)
  const max = Math.max(...series)
  const range = max - min || Math.max(1, max * 0.1)

  const { linePath, areaPath, pts } = useMemo(() => {
    const w = width - padX * 2
    const h = height - padTop - padBottom
    const p = series.map((v, i) => {
      const x = padX + (series.length === 1 ? 0.5 : i / (series.length - 1)) * w
      const y = padTop + h - ((v - min) / range) * h
      return [x, y] as const
    })
    let d = `M ${p[0][0]},${p[0][1]}`
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i]
      const p1 = p[i]
      const p2 = p[i + 1]
      const p3 = p[i + 2] || p2
      const c1x = p1[0] + (p2[0] - p0[0]) / 6
      const c1y = p1[1] + (p2[1] - p0[1]) / 6
      const c2x = p2[0] - (p3[0] - p1[0]) / 6
      const c2y = p2[1] - (p3[1] - p1[1]) / 6
      d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`
    }
    const last = p[p.length - 1]
    const area = d + ` L ${last[0]},${height - padBottom} L ${p[0][0]},${height - padBottom} Z`
    return { linePath: d, areaPath: area, pts: p }
  }, [series, width, height, min, range])

  const gradId = `hspark-${enough ? (isUp ? 'up' : 'down') : 'flat'}`
  const last = pts[pts.length - 1]
  const fmt = (v: number) => v >= 1000 ? `€${(v / 1000).toFixed(1)}K` : `€${Math.round(v)}`
  const dotEvery = Math.max(1, Math.round(series.length / 8))

  // Periodes selectionnables : on grise celles non couvertes (mais on laisse cliquer, l'API borne)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 9.5, fontWeight: 600, color: '#86868B', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-display)' }}>
          {enough ? 'Évolution' : 'Évolution · en construction'}
        </span>
        <div style={{
          display: 'flex', gap: 1,
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          border: '1px solid rgba(0,0,0,0.04)',
          borderRadius: 8, padding: 2,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
        }}>
          {PERIODS.map(p => {
            const active = period === p
            return (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: '3px 9px', borderRadius: 999, border: 'none',
                background: active ? 'rgba(255,255,255,0.95)' : 'transparent',
                color: active ? '#1D1D1F' : '#86868B',
                fontSize: 10, fontWeight: active ? 600 : 500, cursor: 'pointer',
                fontFamily: 'var(--font-display)', transition: 'all .15s', whiteSpace: 'nowrap',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
              }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#1D1D1F' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#86868B' }}
              >{p}</button>
            )
          })}
        </div>
      </div>

      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible', opacity: loading ? 0.5 : 1, transition: 'opacity .2s' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={enough ? 0.16 : 0.08} />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((g, i) => {
          const y = padTop + (height - padTop - padBottom) * g
          return <line key={i} x1={padX} y1={y} x2={width - padX} y2={y} stroke="rgba(0,0,0,0.05)" strokeWidth={1} />
        })}
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={enough ? undefined : '5 4'} />
        {enough && pts.map((p, i) => (i % dotEvery === 0 || i === pts.length - 1)
          ? <circle key={i} cx={p[0]} cy={p[1]} r={1.8} fill={stroke} opacity={0.5} /> : null)}
        <circle cx={last[0]} cy={last[1]} r={3.5} fill={stroke} />
        <circle cx={last[0]} cy={last[1]} r={6} fill={stroke} opacity={0.16} />
        {enough && <>
          <text x={padX} y={9} fontSize={8.5} fill="#AEAEB2" fontFamily="var(--font-data, monospace)">{fmt(max)}</text>
          <text x={padX} y={height - 3} fontSize={8.5} fill="#AEAEB2" fontFamily="var(--font-data, monospace)">{fmt(min)}</text>
        </>}
      </svg>
    </div>
  )
}
