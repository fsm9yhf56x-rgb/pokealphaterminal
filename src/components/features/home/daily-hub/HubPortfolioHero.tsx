'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import type { MarketIndex } from '@/lib/useMarketData'

interface PortfolioCard {
  qty?: number
  current_price?: number | null
  buy_price?: number | null
  graded?: boolean | null
}

/**
 * Hero card portfolio : valeur + ROI + comparaison vs indice + sparkline 7j.
 * Pièce maîtresse du Daily Hub — info la plus importante, design premium.
 */
export function HubPortfolioHero({
  cards, indices, loading,
}: {
  cards: PortfolioCard[]
  indices: MarketIndex[]
  loading: boolean
}) {
  const router = useRouter()

  const stats = useMemo(() => {
    let totalValue = 0
    let totalCost = 0
    let cardsCount = 0
    let gradedCount = 0
    for (const c of cards) {
      const qty = c.qty || 1
      const cur = c.current_price ?? 0
      const buy = c.buy_price ?? 0
      totalValue += cur * qty
      totalCost += buy * qty
      cardsCount += qty
      if (c.graded) gradedCount += qty
    }
    const gain = totalValue - totalCost
    const roiPct = totalCost > 0 ? (gain / totalCost) * 100 : 0
    return { totalValue, totalCost, gain, roiPct, cardsCount, gradedCount }
  }, [cards])

  const sparklinePoints = useMemo(
    () => generateSparklinePoints(stats.totalValue, stats.roiPct),
    [stats.totalValue, stats.roiPct]
  )

  // Pick the most relevant index for comparison (default to vintage_us)
  const benchmarkIndex = indices.find(i => i.id === 'vintage_us') || indices[0] || null

  const isUp = stats.gain >= 0
  const hasData = !loading && cards.length > 0

  return (
    <div
      onClick={() => router.push('/portfolio')}
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #1D1D1F 0%, #2C2C2E 100%)',
        borderRadius: '18px',
        padding: '28px 32px',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        color: 'var(--surface)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Decorative gradient blob */}
      <div style={{
        position: 'absolute',
        top: '-40%',
        right: '-10%',
        width: '60%',
        height: '180%',
        background: isUp
          ? 'radial-gradient(circle, rgba(29,158,117,0.18) 0%, transparent 60%)'
          : 'radial-gradient(circle, rgba(224,48,32,0.15) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '24px',
        alignItems: 'center',
      }}>
        {/* Left : value + meta */}
        <div style={{ minWidth: 0 }}>
          {/* Top : label + see-more */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            <span style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
            }}>Mon portfolio</span>
          </div>

          {/* Big value */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '12px',
            marginBottom: '6px',
            flexWrap: 'wrap',
          }}>
            <div style={{
              fontSize: '40px',
              fontWeight: 600,
              color: 'var(--surface)',
              fontFamily: 'var(--font-data, var(--font-display))',
              letterSpacing: '-1px',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}>
              {loading ? '—' : formatEUR(stats.totalValue)}
            </div>

            {hasData && stats.totalCost > 0 && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                background: isUp ? 'rgba(91, 196, 149, 0.18)' : 'rgba(240, 131, 115, 0.18)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: isUp ? '#5BC495' : '#F08373',
                fontFamily: 'var(--font-data, var(--font-display))',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{stats.roiPct.toFixed(1)}%
              </div>
            )}
          </div>

          {/* Sub-line : gain + benchmark comparison */}
          <div style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.55)',
            fontFamily: 'var(--font-display)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}>
            {loading ? <span>Chargement…</span>
              : !hasData ? <span>Ajoutez votre première carte</span>
              : stats.totalCost > 0
                ? (
                  <>
                    <span>
                      Gain · <span style={{
                        color: isUp ? '#5BC495' : '#F08373',
                        fontWeight: 500,
                        fontFamily: 'var(--font-data, var(--font-display))',
                      }}>{isUp ? '+' : ''}{formatEUR(stats.gain)}</span>
                    </span>
                    {benchmarkIndex && benchmarkIndex.change_24h_pct !== 0 && (
                      <>
                        <span style={{ opacity: 0.4 }}>·</span>
                        <BenchmarkComparison
                          portfolioROI={stats.roiPct}
                          indexLabel={benchmarkIndex.label}
                          indexROI={benchmarkIndex.change_24h_pct}
                        />
                      </>
                    )}
                  </>
                )
                : <span>Coût d'achat non renseigné</span>}
          </div>

          {/* Bottom row : 3 mini-stats */}
          {hasData && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}>
              <MiniStat
                label="Cartes"
                value={stats.cardsCount.toLocaleString('fr-FR')}
              />
              <MiniStat
                label="Gradées"
                value={stats.gradedCount.toLocaleString('fr-FR')}
                accent={stats.gradedCount > 0}
              />
              <MiniStat
                label="Coût total"
                value={formatEUR(stats.totalCost)}
              />
            </div>
          )}
        </div>

        {/* Right : sparkline */}
        {hasData && (
          <div style={{
            width: '180px',
            height: '90px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
          }}>
            <Sparkline points={sparklinePoints} isUp={isUp} />
            <div style={{
              fontSize: '9px',
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontFamily: 'var(--font-display)',
              marginTop: '6px',
              fontWeight: 600,
            }}>7 derniers jours</div>
          </div>
        )}
      </div>

      {/* Bottom-right see more (always visible) */}
      <div style={{
        position: 'absolute',
        bottom: '14px',
        right: '20px',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'var(--font-display)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        zIndex: 2,
      }}>
        Voir détails <span style={{ fontSize: '13px' }}>→</span>
      </div>
    </div>
  )
}

/* ── Sparkline ──────────────────────────── */

function Sparkline({ points, isUp }: { points: number[]; isUp: boolean }) {
  const W = 180, H = 60
  if (points.length < 2) return null

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const stepX = W / (points.length - 1)

  const coords = points.map((p, i) => {
    const x = i * stepX
    const y = H - ((p - min) / range) * H
    return { x, y }
  })

  // Smooth path with cubic bezier
  let pathD = `M ${coords[0].x},${coords[0].y}`
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]
    const curr = coords[i]
    const cp1x = prev.x + (curr.x - prev.x) / 2
    const cp1y = prev.y
    const cp2x = prev.x + (curr.x - prev.x) / 2
    const cp2y = curr.y
    pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`
  }

  const areaD = `${pathD} L ${W},${H} L 0,${H} Z`

  const color = isUp ? '#5BC495' : '#F08373'
  const gradId = isUp ? 'sparkUp' : 'sparkDown'

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD}  fill={`url(#${gradId})`} />
      <path d={pathD}  fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Final dot */}
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="3" fill={color} />
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="3" fill={color}>
        <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

/* ── Sparkline data generator ────────────── */

function generateSparklinePoints(currentValue: number, roiPct: number): number[] {
  // V1 : approximation visuelle. Génère 7 points avec une trajectoire cohérente.
  // V2 (futur) : utiliser portfolio_value_history table pour data réelle.
  if (currentValue === 0) return []
  const trend = roiPct / 100 / 7 // daily trend approx
  const startValue = currentValue / (1 + (roiPct / 100) * 0.5) // simulate progression
  const points: number[] = []
  const n = 7
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const noise = Math.sin(i * 1.7) * (currentValue * 0.015)
    const linear = startValue + (currentValue - startValue) * t
    points.push(linear + noise)
  }
  // Ensure final point is exactly current value
  points[n - 1] = currentValue
  return points
}

/* ── Benchmark comparison ───────────────── */

function BenchmarkComparison({
  portfolioROI, indexLabel, indexROI,
}: {
  portfolioROI: number
  indexLabel: string
  indexROI: number
}) {
  const diff = portfolioROI - indexROI
  const isOutperforming = diff >= 0
  const color = isOutperforming ? '#5BC495' : '#F08373'

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      color: 'rgba(255,255,255,0.5)',
    }}>
      vs {indexLabel}
      <span style={{
        color,
        fontWeight: 600,
        fontFamily: 'var(--font-data, var(--font-display))',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {isOutperforming ? '+' : ''}{diff.toFixed(1)} pts
      </span>
    </span>
  )
}

/* ── Mini-stat ──────────────────────────── */

function MiniStat({
  label, value, accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div>
      <div style={{
        fontSize: '9px',
        color: 'rgba(255,255,255,0.45)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontWeight: 600,
        marginBottom: '4px',
        fontFamily: 'var(--font-display)',
      }}>{label}</div>
      <div style={{
        fontSize: '15px',
        fontWeight: 600,
        color: accent ? '#E8C56A' : 'var(--surface)',
        fontFamily: 'var(--font-data, var(--font-display))',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.2px',
      }}>{value}</div>
    </div>
  )
}

function formatEUR(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
}
