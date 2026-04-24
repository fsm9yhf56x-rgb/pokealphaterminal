'use client'

/**
 * PriceHistoryChart — Terminal-style price history visualization.
 *
 * States handled:
 *   - loading    : skeleton shimmer while fetching
 *   - insufficient: variant A of mockup — skeleton + progress bar N/5
 *   - ok         : full chart (variant C of mockup)
 *   - pro-gated  : when the user picks 90d/1y/all without Pro, auto-revert to 30d
 *
 * Pure SVG rendering — no Recharts dependency.
 *
 * Input: accepts EITHER a resolved `card_ref` OR `setId`+`localId`
 * (which resolves to `tcgdex-{setId}-{localId}` — same convention as
 * /api/prices/tcgdex uses when seeding prices_snapshots).
 */

import { useEffect, useMemo, useState } from 'react'
import { usePriceHistory } from './hooks/usePriceHistory'
import type { PricePoint, PriceTimeframe } from './types'

// ─────────────────────────────────────────────────────────────────────────
// Design tokens (Snow+)
// ─────────────────────────────────────────────────────────────────────────

const SNOW = {
  bg: '#FFFFFF',
  surface: '#F5F5F7',
  borderSoft: '#E5E5EA',
  borderMid: '#C7C7CC',
  ink: '#1D1D1F',
  muted: '#6E6E73',
  dim: '#86868B',
  accent: '#E03020',
  accentSoft: 'rgba(224, 48, 32, 0.06)',
  green: '#1D9E75',
  red: '#E03020',
} as const

const TIMEFRAMES: { key: PriceTimeframe; label: string; pro: boolean }[] = [
  { key: '7d', label: '7d', pro: false },
  { key: '30d', label: '30d', pro: false },
  { key: '90d', label: '90d', pro: true },
  { key: 'all', label: 'All', pro: true },
]

// ─────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────

export interface PriceHistoryChartProps {
  /** Direct PokeTrace-style card_ref. Takes priority over setId/localId. */
  card_ref?: string | null
  /** Alternative: set slug (e.g. 'base1', 'base1-shadowless'). Combined with localId. */
  setId?: string | null
  /** Alternative: local card id within the set (e.g. '4'). */
  localId?: string | null
  cardName?: string
  cardSubtitle?: string // e.g. "Base Set · #4 · 1st Edition"
  /** Pro flag from useAuth(); determines whether Pro timeframes are accessible. */
  isPro?: boolean
  /** Initial timeframe. Defaults to '30d'. */
  defaultTimeframe?: PriceTimeframe
  /** Shown in lieu of card_ref if the lookup returns insufficient_data. */
  currency?: string
  /** If true, render nothing while data is insufficient (default: false, shows progress state). */
  hideWhenInsufficient?: boolean
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function formatPrice(n: number | null | undefined, currency = 'USD'): string {
  if (n == null) return '—'
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'
  if (Math.abs(n) >= 1000) {
    return `${symbol}${Math.round(n / 100) / 10}k`
  }
  return `${symbol}${n.toFixed(2)}`
}

function formatPriceFull(n: number | null | undefined, currency = 'USD'): string {
  if (n == null) return '—'
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'
  return `${symbol}${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPct(n: number | null | undefined): { text: string; color: string } {
  if (n == null) return { text: '—', color: SNOW.muted }
  const sign = n > 0 ? '+' : ''
  return {
    text: `${sign}${n.toFixed(1)}%`,
    color: n > 0 ? SNOW.green : n < 0 ? SNOW.red : SNOW.muted,
  }
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function niceTicks(min: number, max: number, count = 3): number[] {
  if (!isFinite(min) || !isFinite(max) || min === max) return [min]
  const step = (max - min) / count
  const out: number[] = []
  for (let i = 0; i <= count; i++) out.push(min + step * i)
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// Sub: stats strip
// ─────────────────────────────────────────────────────────────────────────

function StatsStrip({
  change7d,
  change30d,
  ath,
  atl,
  dim = false,
}: {
  change7d: number | null
  change30d: number | null
  ath: number | null
  atl: number | null
  dim?: boolean
}) {
  const c7 = formatPct(change7d)
  const c30 = formatPct(change30d)
  const cells = [
    { label: 'Var 7j', value: c7.text, color: dim ? SNOW.muted : c7.color },
    { label: 'Var 30j', value: c30.text, color: dim ? SNOW.muted : c30.color },
    { label: 'ATH', value: ath != null ? formatPrice(ath) : '—', color: dim ? SNOW.muted : SNOW.ink },
    { label: 'ATL', value: atl != null ? formatPrice(atl) : '—', color: dim ? SNOW.muted : SNOW.ink },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        borderTop: `0.5px solid ${SNOW.borderSoft}`,
        borderBottom: `0.5px solid ${SNOW.borderSoft}`,
        marginBottom: 12,
        opacity: dim ? 0.45 : 1,
      }}
    >
      {cells.map((c, i) => (
        <div
          key={c.label}
          style={{
            padding: '8px 6px',
            borderRight: i < 3 ? `0.5px solid ${SNOW.borderSoft}` : 'none',
            fontFamily: 'var(--font-data, monospace)',
          }}
        >
          <div
            style={{
              fontSize: 8,
              color: SNOW.muted,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 2,
            }}
          >
            {c.label}
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: c.color }}>{c.value}</div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sub: timeframe selector
// ─────────────────────────────────────────────────────────────────────────

function TimeframePicker({
  selected,
  onSelect,
  isPro,
  onRequestPro,
}: {
  selected: PriceTimeframe
  onSelect: (t: PriceTimeframe) => void
  isPro: boolean
  onRequestPro: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        background: SNOW.surface,
        borderRadius: 6,
        padding: 2,
        fontFamily: 'var(--font-data, monospace)',
        fontSize: 10,
      }}
    >
      {TIMEFRAMES.map((t) => {
        const active = t.key === selected
        const locked = t.pro && !isPro
        return (
          <button
            key={t.key}
            onClick={() => (locked ? onRequestPro() : onSelect(t.key))}
            style={{
              padding: '3px 9px',
              border: 0,
              background: active ? SNOW.bg : 'transparent',
              color: active ? SNOW.ink : SNOW.muted,
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: active ? 500 : 400,
              boxShadow: active ? `0 0 0 0.5px ${SNOW.borderSoft}` : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontFamily: 'inherit',
              fontSize: 'inherit',
            }}
          >
            <span>{t.label}</span>
            {t.pro && (
              <span
                style={{
                  background: SNOW.accent,
                  color: 'white',
                  fontSize: 7,
                  padding: '1px 3px',
                  borderRadius: 2,
                  lineHeight: 1,
                  opacity: locked ? 0.6 : 1,
                }}
              >
                PRO
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sub: insufficient state chart body (variant A of mockup)
// ─────────────────────────────────────────────────────────────────────────

function InsufficientChart({
  points,
  raw_count,
  min_points,
}: {
  points: PricePoint[]
  raw_count: number
  min_points: number
}) {
  const have = points.length
  const pct = Math.min(100, Math.round((raw_count / min_points) * 100))

  // If we have 0-1 points, show purely illustrative skeleton
  const prices = points.map((p) => p.price).filter((x) => x != null) as number[]
  const min = prices.length ? Math.min(...prices) : 0
  const max = prices.length ? Math.max(...prices) : 1
  const range = max - min || 1

  return (
    <>
      <div style={{ height: 130, position: 'relative', marginBottom: 6 }}>
        <svg viewBox="0 0 300 130" width="100%" height="100%" preserveAspectRatio="none">
          <line x1="28" y1="8" x2="295" y2="8" stroke={SNOW.borderSoft} strokeWidth="0.5" strokeDasharray="1,3" />
          <line x1="28" y1="50" x2="295" y2="50" stroke={SNOW.borderSoft} strokeWidth="0.5" strokeDasharray="1,3" />
          <line x1="28" y1="92" x2="295" y2="92" stroke={SNOW.borderSoft} strokeWidth="0.5" strokeDasharray="1,3" />
          <line x1="28" y1="120" x2="295" y2="120" stroke={SNOW.borderMid} strokeWidth="0.5" />

          {/* Render the 1-2 real points we have as dots with a dashed link */}
          {have >= 1 && points.map((p, i) => {
            const x = have <= 1 ? 150 : 32 + (263 * i) / (have - 1)
            const y = have <= 1 ? 65 : 110 - (((p.price ?? min) - min) / range) * 90
            return <circle key={i} cx={x} cy={y} r="2.5" fill={SNOW.accent} />
          })}
          {have === 2 && (
            <line
              x1={32}
              y1={110 - (((points[0].price ?? min) - min) / range) * 90}
              x2={295}
              y2={110 - (((points[1].price ?? min) - min) / range) * 90}
              stroke={SNOW.accent}
              strokeWidth="1"
              strokeDasharray="3,4"
              opacity="0.4"
            />
          )}

          <text
            x="150"
            y="20"
            fontFamily="var(--font-sans, system-ui)"
            fontSize="10"
            fill={SNOW.muted}
            textAnchor="middle"
            fontWeight="500"
          >
            Graphe disponible à partir de {min_points} snapshots
          </text>
          <text
            x="150"
            y="36"
            fontFamily="var(--font-data, monospace)"
            fontSize="9"
            fill={SNOW.borderMid}
            textAnchor="middle"
          >
            Actuellement: {raw_count}/{min_points}
          </text>
        </svg>
      </div>

      <div style={{ marginTop: 10, marginBottom: 6 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 9,
            fontFamily: 'var(--font-data, monospace)',
            color: SNOW.muted,
            marginBottom: 4,
          }}
        >
          <span>Historique en cours</span>
          <span>
            {raw_count}/{min_points} snapshots
          </span>
        </div>
        <div
          style={{
            height: 3,
            background: SNOW.surface,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: SNOW.accent,
              transition: 'width 600ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sub: real chart body (variant C of mockup)
// ─────────────────────────────────────────────────────────────────────────

interface HoverPoint {
  x: number
  y: number
  price: number
  date: string
}

function RealChart({ points, currency }: { points: PricePoint[]; currency: string }) {
  const [hover, setHover] = useState<HoverPoint | null>(null)

  const { path, areaPath, dots, xLabels, yLabels, bounds } = useMemo(() => {
    const VB = { w: 300, h: 130 }
    const PADDING = { left: 28, right: 5, top: 8, bottom: 18 }
    const innerW = VB.w - PADDING.left - PADDING.right
    const innerH = VB.h - PADDING.top - PADDING.bottom

    const prices = points.map((p) => p.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const range = maxPrice - minPrice || 1
    const padRange = range * 0.15

    const yMin = Math.max(0, minPrice - padRange)
    const yMax = maxPrice + padRange

    const n = points.length
    const xFor = (i: number) => PADDING.left + (innerW * i) / Math.max(1, n - 1)
    const yFor = (price: number) =>
      PADDING.top + innerH - ((price - yMin) / (yMax - yMin)) * innerH

    const coords = points.map((p, i) => ({
      x: xFor(i),
      y: yFor(p.price),
      price: p.price,
      date: p.date,
    }))

    const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x},${c.y}`).join(' ')
    const areaPath =
      path +
      ` L ${coords[coords.length - 1].x},${PADDING.top + innerH} L ${coords[0].x},${PADDING.top + innerH} Z`

    // Y ticks (3 horizontal guides)
    const yTicks = niceTicks(yMin, yMax, 3)
    const yLabels = yTicks.map((v) => ({ value: v, y: yFor(v), text: formatPrice(v, currency) }))

    // X ticks (up to 3 dates)
    const xLabelIndices =
      n <= 2 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1]
    const xLabels = xLabelIndices.map((i) => ({
      x: xFor(i),
      text: formatDateShort(points[i].date),
    }))

    return {
      path,
      areaPath,
      dots: coords,
      xLabels,
      yLabels,
      bounds: { yMin, yMax, PADDING, innerW, innerH, VB },
    }
  }, [points, currency])

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const xInVB = ((e.clientX - rect.left) / rect.width) * bounds.VB.w

    // Find nearest dot
    let nearest = dots[0]
    let nearestDist = Math.abs(dots[0].x - xInVB)
    for (const d of dots) {
      const dist = Math.abs(d.x - xInVB)
      if (dist < nearestDist) {
        nearest = d
        nearestDist = dist
      }
    }
    setHover(nearest)
  }

  const handleMouseLeave = () => setHover(null)

  return (
    <div style={{ height: 150, position: 'relative', marginBottom: 6 }}>
      <svg viewBox="0 0 300 130" width="100%" height="130" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        {/* Y labels */}
        {yLabels.map((yl, i) => (
          <text
            key={i}
            x="2"
            y={yl.y + 3}
            fontFamily="var(--font-data, monospace)"
            fontSize="8"
            fill={SNOW.dim}
          >
            {yl.text}
          </text>
        ))}

        {/* Horizontal gridlines */}
        {yLabels.map((yl, i) => (
          <line
            key={i}
            x1={bounds.PADDING.left}
            y1={yl.y}
            x2={bounds.VB.w - bounds.PADDING.right}
            y2={yl.y}
            stroke={i === 0 || i === yLabels.length - 1 ? SNOW.borderMid : SNOW.borderSoft}
            strokeWidth="0.5"
            strokeDasharray={i === 0 || i === yLabels.length - 1 ? undefined : '1,3'}
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={SNOW.accentSoft} />

        {/* Main line */}
        <path
          d={path}
          stroke={SNOW.accent}
          strokeWidth="1.5"
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots */}
        {dots.map((d, i) => {
          const last = i === dots.length - 1
          return (
            <g key={i}>
              {last && <circle cx={d.x} cy={d.y} r="6" fill={SNOW.accent} fillOpacity="0.15" />}
              <circle cx={d.x} cy={d.y} r={last ? 2.5 : 1.5} fill={SNOW.accent} />
            </g>
          )
        })}

        {/* Hover crosshair + emphasized dot */}
        {hover && (
          <g>
            <line
              x1={hover.x}
              y1={bounds.PADDING.top}
              x2={hover.x}
              y2={bounds.VB.h - bounds.PADDING.bottom}
              stroke={SNOW.borderMid}
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            <circle cx={hover.x} cy={hover.y} r="4" fill={SNOW.bg} stroke={SNOW.accent} strokeWidth="1.5" />
          </g>
        )}

        {/* X labels */}
        {xLabels.map((xl, i) => (
          <text
            key={i}
            x={xl.x}
            y={bounds.VB.h - 4}
            fontFamily="var(--font-data, monospace)"
            fontSize="8"
            fill={SNOW.dim}
            textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
          >
            {xl.text}
          </text>
        ))}

        {/* Invisible hover area */}
        <rect
          x={bounds.PADDING.left}
          y={bounds.PADDING.top}
          width={bounds.innerW}
          height={bounds.innerH}
          fill="transparent"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: 'crosshair' }}
        />
      </svg>

      {/* Tooltip */}
      {hover && (
        <div
          style={{
            position: 'absolute',
            left: `${(hover.x / bounds.VB.w) * 100}%`,
            top: 0,
            transform: 'translate(-50%, -100%)',
            background: SNOW.ink,
            color: SNOW.bg,
            fontFamily: 'var(--font-data, monospace)',
            fontSize: 10,
            padding: '4px 8px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ fontWeight: 500 }}>{formatPriceFull(hover.price, currency)}</div>
          <div style={{ color: SNOW.dim, fontSize: 9 }}>{formatDateShort(hover.date)}</div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────

export function PriceHistoryChart({
  card_ref,
  setId,
  localId,
  cardName,
  cardSubtitle,
  isPro = false,
  defaultTimeframe = '30d',
  currency: currencyProp,
  hideWhenInsufficient = false,
}: PriceHistoryChartProps) {
  const [timeframe, setTimeframe] = useState<PriceTimeframe>(defaultTimeframe)
  const [showProToast, setShowProToast] = useState(false)

  // Resolve card_ref: explicit prop wins, else derive from setId+localId
  // using the deterministic tcgdex convention (see /api/prices/tcgdex).
  const effectiveCardRef = useMemo<string | null>(() => {
    if (card_ref) return card_ref
    if (setId && localId) return `tcgdex-${setId}-${localId}`
    return null
  }, [card_ref, setId, localId])

  const { data, loading, error } = usePriceHistory({ card_ref: effectiveCardRef, timeframe })

  // If server returned 403 PRO_REQUIRED (shouldn't normally happen since we gate client-side too),
  // fall back to 30d. useEffect so we don't setState during render.
  useEffect(() => {
    if (error?.code === 'PRO_REQUIRED') {
      setTimeframe('30d')
    }
  }, [error?.code])

  const currency = data?.currency || currencyProp || 'USD'
  const showInsufficient = !loading && data && data.insufficient_data
  const showChart = !loading && data && !data.insufficient_data && data.consolidated.length >= 2

  // Opt-in: hide entirely until real data exists (prevents noisy placeholder state)
  if (hideWhenInsufficient && !loading && (!data || data.insufficient_data)) return null

  // Hero price: current value from stats
  const heroPrice = data?.stats.current ?? null
  const heroDelta = data?.stats.change_30d_pct ?? null
  const heroDeltaF = formatPct(heroDelta)

  return (
    <div
      style={{
        background: SNOW.bg,
        border: `0.5px solid ${SNOW.borderSoft}`,
        borderRadius: 10,
        padding: 18,
        maxWidth: 340,
        fontFamily: 'var(--font-sans, system-ui)',
        color: SNOW.ink,
        animation: 'pka-fade-in 300ms ease-out',
      }}
    >
      <style>{`
        @keyframes pka-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      {cardName && (
        <>
          <div style={{ fontWeight: 500, fontSize: 18, marginBottom: 2 }}>{cardName}</div>
          {cardSubtitle && (
            <div style={{ fontSize: 12, color: SNOW.muted, marginBottom: 14 }}>{cardSubtitle}</div>
          )}
        </>
      )}

      {/* Hero price + delta */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
        <span style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.015em' }}>
          {loading ? '—' : formatPriceFull(heroPrice, currency)}
        </span>
        {!loading && heroDelta != null && (
          <>
            <span
              style={{
                fontSize: 12,
                color: heroDeltaF.color,
                fontFamily: 'var(--font-data, monospace)',
                fontWeight: 500,
              }}
            >
              {heroDeltaF.text}
            </span>
            <span style={{ fontSize: 10, color: SNOW.muted, fontFamily: 'var(--font-data, monospace)' }}>30d</span>
          </>
        )}
      </div>
      <div
        style={{
          fontSize: 10,
          color: SNOW.muted,
          fontFamily: 'var(--font-data, monospace)',
          marginBottom: 14,
        }}
      >
        {loading
          ? 'Chargement…'
          : data
            ? `${data.raw_count} snapshots · ${data.distinct_days} jour${data.distinct_days > 1 ? 's' : ''}`
            : ''}
      </div>

      {/* Stats */}
      <StatsStrip
        change7d={data?.stats.change_7d_pct ?? null}
        change30d={data?.stats.change_30d_pct ?? null}
        ath={data?.stats.ath?.price ?? null}
        atl={data?.stats.atl?.price ?? null}
        dim={!!showInsufficient}
      />

      {/* Timeframe + SPLIT row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <TimeframePicker
          selected={timeframe}
          onSelect={setTimeframe}
          isPro={isPro}
          onRequestPro={() => {
            setShowProToast(true)
            setTimeout(() => setShowProToast(false), 2800)
          }}
        />
        <button
          style={{
            background: 'transparent',
            border: `0.5px solid ${SNOW.borderSoft}`,
            color: SNOW.muted,
            fontSize: 9,
            padding: '3px 7px',
            borderRadius: 4,
            cursor: 'not-allowed',
            fontFamily: 'var(--font-data, monospace)',
            letterSpacing: '0.04em',
            opacity: 0.5,
          }}
          disabled
          title="Bientôt disponible"
        >
          SPLIT
        </button>
      </div>

      {/* Chart body */}
      {loading ? (
        <div
          style={{
            height: 130,
            background: `linear-gradient(90deg, ${SNOW.surface} 25%, ${SNOW.bg} 50%, ${SNOW.surface} 75%)`,
            backgroundSize: '200% 100%',
            animation: 'pka-shimmer 1.5s ease-in-out infinite',
            borderRadius: 4,
            marginBottom: 6,
          }}
        >
          <style>{`
            @keyframes pka-shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      ) : data && showInsufficient ? (
        <InsufficientChart
          points={data.consolidated}
          raw_count={data.raw_count}
          min_points={data.min_points_required}
        />
      ) : showChart && data ? (
        <RealChart points={data.consolidated} currency={currency} />
      ) : (
        <div
          style={{
            height: 130,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: SNOW.muted,
            fontSize: 11,
            fontFamily: 'var(--font-data, monospace)',
          }}
        >
          {error?.message || 'Aucune donnée'}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 8,
          borderTop: `0.5px dashed ${SNOW.borderSoft}`,
          marginTop: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              display: 'inline-block',
              width: 5,
              height: 5,
              background: SNOW.accent,
              borderRadius: '50%',
            }}
          />
          <span
            style={{
              fontSize: 9,
              color: SNOW.muted,
              fontFamily: 'var(--font-data, monospace)',
            }}
          >
            top_price consolidated
          </span>
        </div>
        <span
          style={{
            fontSize: 9,
            color: SNOW.dim,
            fontFamily: 'var(--font-data, monospace)',
          }}
        >
          ebay · tcg · cardmarket
        </span>
      </div>

      {/* Pro toast */}
      {showProToast && (
        <div
          style={{
            marginTop: 8,
            padding: '6px 10px',
            background: SNOW.ink,
            color: SNOW.bg,
            borderRadius: 4,
            fontSize: 11,
            fontFamily: 'var(--font-data, monospace)',
            textAlign: 'center',
          }}
        >
          Cette période est réservée aux utilisateurs Pro
        </div>
      )}
    </div>
  )
}

export default PriceHistoryChart
