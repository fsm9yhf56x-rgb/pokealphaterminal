'use client'

import { useEffect, useState } from 'react'
import { SNOW, FONT, fmtPrice } from '../snowTokens'

interface Point { day: string; price: number }

export function SpotlightHistory({ cardId }: { cardId: string }) {
  const [points, setPoints] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    // history route may already exist; try cardmarket source primarily
    fetch(`/api/prices/history?card_ref=${encodeURIComponent(cardId)}&source=cardmarket&variant=raw&limit=60`)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        const arr = (j?.data || j?.points || []).map((p: any) => ({
          day: p.fetched_at || p.day || p.date,
          price: Number(p.price_avg || p.price || 0),
        })).filter((p: Point) => p.price > 0)
        setPoints(arr)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [cardId])

  if (loading) return null
  if (points.length < 2) return null

  const prices = points.map(p => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const last = prices[prices.length - 1]
  const first = prices[0]
  const delta = ((last - first) / first) * 100

  const width = 600
  const height = 100
  const xStep = points.length > 1 ? width / (points.length - 1) : 0
  const yScale = (p: number) => height - 8 - ((p - min) / Math.max(1, max - min)) * (height - 16)
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * xStep).toFixed(1)} ${yScale(p.price).toFixed(1)}`).join(' ')
  const areaPath = linePath + ` L ${width} ${height} L 0 ${height} Z`

  return (
    <Section title="Historique de prix" count={`${points.length} snapshots · Cardmarket`}>
      <div style={{ background: SNOW.surface, borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 500, fontFamily: FONT.data }}>{fmtPrice(last, 'EUR')}</span>
          <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 6, fontSize: 11, fontWeight: 500, fontFamily: FONT.data, background: delta >= 0 ? SNOW.greenLight : SNOW.redLight, color: delta >= 0 ? SNOW.green : SNOW.red }}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1).replace('.', ',')}% · {points.length}j
          </span>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: 100 }}>
          <defs>
            <linearGradient id="kcSpark" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={SNOW.red} stopOpacity="0.18" />
              <stop offset="100%" stopColor={SNOW.red} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#kcSpark)" />
          <path d={linePath} stroke={SNOW.red} strokeWidth="2" fill="none" />
          <circle cx={(points.length - 1) * xStep} cy={yScale(last)} r="4" fill={SNOW.red} />
        </svg>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '14px 0 0' }}>
        <Kpi label="VAR" value={`${delta >= 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')}%`} color={delta >= 0 ? SNOW.green : SNOW.red} />
        <Kpi label="ATH" value={fmtPrice(max, 'EUR')} />
        <Kpi label="ATL" value={fmtPrice(min, 'EUR')} />
      </div>
    </Section>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: SNOW.surface, borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 9, color: SNOW.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, fontFamily: FONT.display }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, fontFamily: FONT.data, marginTop: 2, color: color || SNOW.ink }}>{value}</div>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: SNOW.muted, margin: 0 }}>{title}</h2>
        {count ? <span style={{ fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.data }}>{count}</span> : null}
      </div>
      {children}
    </div>
  )
}
