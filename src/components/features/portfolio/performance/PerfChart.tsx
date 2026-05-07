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
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px',
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
          marginTop: '12px',
          padding: '8px 12px',
          background: 'var(--accent-soft)',
          borderRadius: '6px',
          fontSize: '10px',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-display)',
        }}>
          <strong style={{ color: 'var(--ink)' }}>Bientôt :</strong> historique complet
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
      gap: '2px',
      background: '#F5F5F7',
      borderRadius: '8px',
      padding: '3px',
    }}>
      {PERIODS.map(p => {
        const active = value === p
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: 'none',
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? 'var(--surface)' : 'var(--ink-muted)',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => {
              if (!active) e.currentTarget.style.background = '#EBEBEB'
            }}
            onMouseLeave={e => {
              if (!active) e.currentTarget.style.background = 'transparent'
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
        fontSize: '11px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-display)',
      }}>{label}</span>
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-strong)',
      borderRadius: '8px',
      padding: '8px 12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      fontFamily: 'var(--font-display)',
    }}>
      <div style={{
        fontSize: '10px',
        fontWeight: 600,
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '2px',
      }}>{label}</div>
      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--ink)',
        fontFamily: 'var(--font-data, var(--font-display))',
      }}>{formatEUR(p.value)}</div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      marginBottom: '12px',
    }}>
      <div style={{
        width: '5px', height: '5px',
        borderRadius: '50%',
        background: 'var(--accent)',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: '10px', fontWeight: 600,
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontFamily: 'var(--font-display)',
      }}>{children}</span>
      <div style={{
        flex: 1, height: '1px',
        background: 'linear-gradient(90deg, var(--border), transparent)',
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
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `€${(v / 1_000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}
