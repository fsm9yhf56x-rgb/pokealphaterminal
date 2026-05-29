'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useRef } from 'react'
import type { MarketIndex } from '@/lib/useMarketData'
import { SNOW, FONT, GLASS, RADIUS, TRANSITION, SHADOW } from '@/lib/design/snow'

interface PortfolioCard {
  qty?: number
  current_price?: number | null
  buy_price?: number | null
  graded?: boolean | null
  set_slug?: string | null
  set_name?: string | null
}

/**
 * Hero card portfolio Snow+ : valeur + ROI + benchmark + sparkline 7j.
 * Glass clair, hover tilt subtil, sparkline tons verts/rouges Snow+.
 * Piece maitresse du Daily Hub v1.0.
 */
export function HubPortfolioHero({
  cards, indices, loading,
}: {
  cards: PortfolioCard[]
  indices: MarketIndex[]
  loading: boolean
}) {
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement | null>(null)

  // Tilt 3D subtle (hook sublime garde de l'ancienne version)
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rotateY = (x - 0.5) * 4  // ±2deg (plus subtle qu'avant)
    const rotateX = -(y - 0.5) * 3
    el.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`
  }

  function handleMouseLeave() {
    const el = cardRef.current
    if (!el) return
    el.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0)'
  }

  const stats = useMemo(() => {
    let totalValue = 0
    let totalCost = 0
    let cardsCount = 0
    let gradedCount = 0
    const setValueMap = new Map<string, number>()

    for (const c of cards) {
      const qty = c.qty || 1
      const cur = c.current_price ?? 0
      const buy = c.buy_price ?? 0
      const value = cur * qty
      totalValue += value
      totalCost += buy * qty
      cardsCount += qty
      if (c.graded) gradedCount += qty
      const setKey = c.set_slug || c.set_name || 'unknown'
      setValueMap.set(setKey, (setValueMap.get(setKey) || 0) + value)
    }
    const gain = totalValue - totalCost
    const roiPct = totalCost > 0 ? (gain / totalCost) * 100 : 0

    let topSetPct = 0
    let topSetName = ''
    if (totalValue > 0) {
      let max = 0
      for (const [name, val] of setValueMap) {
        if (val > max) { max = val; topSetName = name }
      }
      topSetPct = (max / totalValue) * 100
    }
    const setsCount = setValueMap.size

    return { totalValue, totalCost, gain, roiPct, cardsCount, gradedCount, topSetPct, topSetName, setsCount }
  }, [cards])

  const sparklinePoints = useMemo(
    () => generateSparklinePoints(stats.totalValue, stats.roiPct),
    [stats.totalValue, stats.roiPct]
  )

  const benchmarkIndex = indices.find(i => i.id === 'vintage_us') || indices[0] || null
  const isUp = stats.gain >= 0
  const hasData = !loading && cards.length > 0

  return (
    <div
      ref={cardRef}
      onClick={() => router.push('/portfolio')}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...GLASS.card,
        position: 'relative',
        padding: '28px 32px',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s ease',
        transformStyle: 'preserve-3d' as any,
        willChange: 'transform',
        // entree animee
        animation: 'fadeIn .5s ease both',
      }}
    >
      {/* Blob decoratif coloré subtile (vert si gain, rouge si perte) */}
      {hasData && stats.totalCost > 0 && (
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-15%',
          width: '60%',
          height: '180%',
          background: isUp
            ? 'radial-gradient(circle, rgba(38,166,91,0.10) 0%, transparent 60%)'
            : 'radial-gradient(circle, rgba(224,48,32,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
          filter: 'blur(20px)',
        }} />
      )}

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
          {/* Top : label + status pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            <span style={{
              fontSize: 11,
              color: SNOW.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
              fontFamily: FONT.display,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{
                display: 'inline-block',
                width: 3,
                height: 12,
                background: SNOW.ink,
                borderRadius: 2,
              }} />
              Mon portfolio
            </span>
            {hasData && stats.totalValue === 0 && (
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                color: SNOW.amberDark,
                background: SNOW.amber,
                padding: '3px 8px',
                borderRadius: 999,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontFamily: FONT.data,
              }}>
                Prix en attente
              </span>
            )}
          </div>

          {/* Big value */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            marginBottom: 6,
            flexWrap: 'wrap',
          }}>
            <div style={{
              fontSize: 42,
              fontWeight: 700,
              color: SNOW.ink,
              fontFamily: FONT.display,
              letterSpacing: '-1.2px',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}>
              {loading ? '—'
                : hasData && stats.totalValue === 0
                  ? `${stats.cardsCount.toLocaleString('fr-FR')} cartes`
                  : formatEUR(stats.totalValue)}
            </div>

            {hasData && stats.totalCost > 0 && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 11px',
                background: isUp ? SNOW.greenLight : SNOW.redLight,
                borderRadius: RADIUS.md,
                fontSize: 14,
                fontWeight: 700,
                color: isUp ? SNOW.green : SNOW.red,
                fontFamily: FONT.data,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{stats.roiPct.toFixed(1)}%
              </div>
            )}
          </div>

          {/* Sub-line : gain + benchmark comparison */}
          <div style={{
            fontSize: 13,
            color: SNOW.muted,
            fontFamily: FONT.body,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}>
            {loading ? <span>Chargement…</span>
              : !hasData ? <span>Ajoute ta première carte pour démarrer</span>
              : stats.totalValue === 0
                ? (
                  <span>
                    Valorisation indisponible · {' '}
                    <span style={{ color: SNOW.amberDark, fontWeight: 500 }}>
                      Service prix temporairement indisponible
                    </span>
                  </span>
                )
              : stats.totalCost > 0
                ? (
                  <>
                    <span>
                      Gain latent · <strong style={{
                        color: isUp ? SNOW.green : SNOW.red,
                        fontWeight: 600,
                        fontFamily: FONT.data,
                      }}>{isUp ? '+' : ''}{formatEUR(stats.gain)}</strong>
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
                : (
                  <span>
                    Valeur estimée · {' '}
                    <span style={{ color: SNOW.amberDark, fontWeight: 500 }}>
                      Renseigne tes prix d'achat pour calculer ton ROI →
                    </span>
                  </span>
                )}
          </div>

          {/* Bottom row : 4 mini-stats */}
          {hasData && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 14,
              paddingTop: 16,
              borderTop: `1px solid ${SNOW.borderSoft}`,
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
                label="Sets"
                value={stats.setsCount.toLocaleString('fr-FR')}
              />
              <MiniStat
                label="Top set"
                value={stats.topSetPct > 0 ? `${stats.topSetPct.toFixed(0)}%` : '—'}
                accent={stats.topSetPct > 50}
                hint={stats.topSetPct > 50
                  ? 'Concentration élevée'
                  : stats.topSetPct > 30
                  ? 'Bien diversifié'
                  : 'Très diversifié'}
              />
            </div>
          )}
        </div>

        {/* Right : sparkline */}
        {hasData && (
          <div style={{
            width: 180,
            height: 90,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
          }}>
            <Sparkline points={sparklinePoints} isUp={isUp} />
            <div style={{
              fontSize: 9,
              color: SNOW.mutedLight,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontFamily: FONT.display,
              marginTop: 6,
              fontWeight: 600,
            }}>
              7 derniers jours
            </div>
          </div>
        )}
      </div>

      {/* Bottom-right see more */}
      <div style={{
        position: 'absolute',
        bottom: 14,
        right: 20,
        fontSize: 11,
        color: SNOW.muted,
        fontFamily: FONT.body,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        zIndex: 2,
        opacity: 0.7,
        transition: TRANSITION.fast,
      }}>
        Voir détails <span style={{ fontSize: 13 }}>→</span>
      </div>
    </div>
  )
}

/* ── Sparkline (Snow+) ──────────────────── */

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

  // Snow+ green/red
  const color = isUp ? SNOW.green : SNOW.red
  const gradId = isUp ? 'sparkUpSnow' : 'sparkDownSnow'

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD}  fill={`url(#${gradId})`} />
      <path d={pathD}  fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="3" fill={color} />
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="3" fill={color}>
        <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

/* ── Sparkline data generator (V1 mock) ───── */

function generateSparklinePoints(currentValue: number, roiPct: number): number[] {
  if (currentValue === 0) return []
  const startValue = currentValue / (1 + (roiPct / 100) * 0.5)
  const points: number[] = []
  const n = 7
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const noise = Math.sin(i * 1.7) * (currentValue * 0.015)
    const linear = startValue + (currentValue - startValue) * t
    points.push(linear + noise)
  }
  points[n - 1] = currentValue
  return points
}

/* ── Benchmark comparison (Snow+) ────────── */

function BenchmarkComparison({
  portfolioROI, indexLabel, indexROI,
}: {
  portfolioROI: number
  indexLabel: string
  indexROI: number
}) {
  const diff = portfolioROI - indexROI
  const isOutperforming = diff >= 0
  const color = isOutperforming ? SNOW.green : SNOW.red

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      color: SNOW.muted,
      fontFamily: FONT.body,
    }}>
      vs {indexLabel}
      <strong style={{
        color,
        fontWeight: 600,
        fontFamily: FONT.data,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {isOutperforming ? '+' : ''}{diff.toFixed(1)} pts
      </strong>
    </span>
  )
}

/* ── Mini-stat (Snow+) ─────────────────── */

function MiniStat({
  label, value, accent, hint,
}: {
  label: string
  value: string
  accent?: boolean
  hint?: string
}) {
  return (
    <div>
      <div style={{
        fontSize: 9,
        color: SNOW.mutedLight,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 600,
        marginBottom: 4,
        fontFamily: FONT.display,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 16,
        fontWeight: 700,
        color: accent ? SNOW.amberDark : SNOW.ink,
        fontFamily: FONT.data,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.3px',
        lineHeight: 1.1,
      }}>
        {value}
      </div>
      {hint && (
        <div style={{
          fontSize: 9,
          color: SNOW.mutedLight,
          fontFamily: FONT.body,
          marginTop: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {hint}
        </div>
      )}
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
