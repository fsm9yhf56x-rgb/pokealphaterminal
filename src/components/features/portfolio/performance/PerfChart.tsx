'use client'

import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { PerfAggregates } from './Performance'

const PERIODS = ['7J', '1M', '3M', '6M', '1A', 'Tout'] as const
type Period = typeof PERIODS[number]

/**
 * Line chart Recharts : valeur du portfolio dans le temps.
 *
 * V1: data minimale (cost vs value actuelle, 2 points).
 * V2 (à venir): vraie time-series via snapshots + portfolio_cards JOIN.
 */
export function PerfChart({ agg }: { agg: PerfAggregates }) {
  const [period, setPeriod] = useState<Period>('1M')

  const chartData = useMemo(() => {
    return buildPlaceholderSeries(agg, period)
  }, [agg, period])

  const isUp = agg.totalGain >= 0
  const lineColor = isUp ? 'var(--perf-up)' : 'var(--perf-down)'

  return (
    <div>
      <SectionTitle>Évolution de la valeur</SectionTitle>

      <div style={{
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: 16,
        padding: 22,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
      }}>
        {/* Top bar : legend + period selector */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <LegendItem color={isUp ? '#1D9E75' : '#E03020'} label="Mon portfolio" />
            <LegendItem color="#AEAEB2" label="Coût d'acquisition" dashed />
          </div>

          <PeriodSelector value={period} onChange={setPeriod} />
        </div>

        {/* Chart */}
        <div style={{ width: '100%', height: '240px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#F0F0F0" strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#AEAEB2"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                style={{ fontFamily: 'var(--font-display)' }}
              />
              <YAxis
                stroke="#AEAEB2"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => formatEURcompact(v)}
                width={48}
                style={{ fontFamily: 'var(--font-data, var(--font-display))' }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#E5E5EA', strokeDasharray: '4 4' }} />

              {/* Cost reference line (dashed, neutral) */}
              <ReferenceLine
                y={agg.totalCost}
                stroke="#AEAEB2"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />

              {/* Portfolio value line (solid, colored) */}
              <Line
                type="monotone"
                dataKey="value"
                stroke={isUp ? '#1D9E75' : '#E03020'}
                strokeWidth={2.5}
                dot={{ r: 3, fill: isUp ? '#1D9E75' : '#E03020', strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)' }}
                isAnimationActive={true}
                animationDuration={400}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* V1 note */}
        <div style={{
          marginTop: 14,
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(10px) saturate(180%)',
          WebkitBackdropFilter: 'blur(10px) saturate(180%)',
          border: '1px solid rgba(0,0,0,0.04)',
          borderRadius: 9,
          fontSize: 10.5,
          color: '#86868B',
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
        }}>
          <strong style={{ color: '#1D1D1F' }}>Bientôt :</strong> historique complet
          des valeurs (snapshots quotidiens). Pour l'instant, projection simple basée
          sur le coût d'acquisition et la valeur actuelle.
        </div>
      </div>
    </div>
  )
}

/**
 * V1 placeholder : produit une courbe simple basée sur le coût et la valeur actuelle.
 * V2 swap : remplacer par fetchSnapshotSeries(holdings, period) qui interroge prices_snapshots.
 */
function buildPlaceholderSeries(
  agg: PerfAggregates,
  period: Period
): { label: string; value: number }[] {
  const start = agg.totalCost
  const end   = agg.totalValue

  const pointCounts: Record<Period, number> = {
    '7J': 7, '1M': 4, '3M': 3, '6M': 6, '1A': 12, 'Tout': 8,
  }
  const labels: Record<Period, string[]> = {
    '7J':   ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
    '1M':   ['S1', 'S2', 'S3', 'S4'],
    '3M':   ['M-2', 'M-1', 'M0'],
    '6M':   ['M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'M0'],
    '1A':   ['Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar'],
    'Tout': ['2024', 'Q2', 'Q3', 'Q4', '2025', 'Q2', 'Q3', 'Aujourd\'hui'],
  }

  const n = pointCounts[period]
  const lbls = labels[period]

  // Smooth interpolation cost → end
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    // ease-in-out curve for visual interest
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    const value = start + (end - start) * eased
    return {
      label: lbls[i] || `${i + 1}`,
      value: Math.round(value),
    }
  })
}

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div style={{
      display: 'flex',
      gap: 2,
      background: 'rgba(255,255,255,0.45)',
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      border: '1px solid rgba(0,0,0,0.04)',
      borderRadius: 9,
      padding: 3,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
    }}>
      {PERIODS.map(p => {
        const active = value === p
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            style={{
              padding: '6px 12px',
              borderRadius: 7,
              border: 'none',
              background: active ? '#1D1D1F' : 'transparent',
              color: active ? '#fff' : '#86868B',
              fontSize: 11.5,
              fontWeight: active ? 600 : 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
              transition: 'all .2s cubic-bezier(.2,.85,.3,1)',
              boxShadow: active ? '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.14)' : 'none',
            }}
            onMouseEnter={e => {
              if (!active) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.7)'
                e.currentTarget.style.color = '#1D1D1F'
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#86868B'
              }
            }}
          >
            {p}
          </button>
        )
      })}
    </div>
  )
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{
        width: '14px',
        height: '2px',
        background: dashed ? 'transparent' : color,
        borderTop: dashed ? `1.5px dashed ${color}` : 'none',
        borderRadius: '2px',
      }} />
      <span style={{
        fontSize: 11.5,
        color: '#86868B',
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
        fontWeight: 500,
      }}>{label}</span>
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div style={{
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255,255,255,0.6)',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
      fontFamily: 'var(--font-sora, Sora, sans-serif)',
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: '#86868B',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 3,
      }}>{label}</div>
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        color: '#1D1D1F',
        fontFamily: 'var(--font-data, "Space Mono", monospace)',
      }}>{formatEUR(p.value)}</div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 14,
    }}>
      <div style={{
        width: 5, height: 5,
        borderRadius: '50%',
        background: '#C42E1F',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 10.5, fontWeight: 600,
        color: '#86868B',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
      }}>{children}</span>
      <div style={{
        flex: 1, height: 1,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.06), transparent)',
      }} />
    </div>
  )
}

function formatEUR(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
}

function formatEURcompact(v: number): string {
  if (v >= 1_000_000) return `€${Number(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `€${Number(v / 1_000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}
