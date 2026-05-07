'use client'

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import type { MarketIndex } from '@/lib/useMarketData'

/**
 * 4 indices majeurs : Vintage US / Sealed / Modern FR / Graded.
 * Chaque card : ticker code + valeur + variation 24h + sparkline.
 */
export function TermIndices({ indices }: { indices: MarketIndex[] }) {
  if (indices.length === 0) return null

  return (
    <div>
      <SectionTitle>Indices marché</SectionTitle>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
      }}>
        {indices.map(idx => (
          <IndexCard key={idx.id} index={idx} />
        ))}
      </div>
    </div>
  )
}

function IndexCard({ index }: { index: MarketIndex }) {
  const isUp = index.change_24h_pct >= 0
  const trendColor = isUp ? 'var(--perf-up)' : 'var(--perf-down)'
  const sign = isUp ? '+' : ''
  const hasData = index.sparkline.length > 0 && index.current > 0

  // Shape sparkline data for Recharts
  const chartData = index.sparkline.map((v, i) => ({ i, value: v }))

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '16px 18px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top : ticker + label */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '10px',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: '9px',
            color: 'var(--ink-faint)',
            fontFamily: 'var(--font-data, var(--font-display))',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '2px',
          }}>{index.ticker}</div>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--ink)',
            fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{index.label}</div>
        </div>

        {/* Variation pill */}
        {hasData && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '3px 7px',
            background: isUp ? 'var(--perf-up-soft)' : 'var(--perf-down-soft)',
            borderRadius: '4px',
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: '9px',
              color: trendColor,
              fontWeight: 700,
            }}>{isUp ? '▲' : '▼'}</span>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: trendColor,
              fontFamily: 'var(--font-data, var(--font-display))',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {sign}{index.change_24h_pct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Value */}
      <div style={{
        fontSize: '24px',
        fontWeight: 600,
        color: 'var(--ink)',
        fontFamily: 'var(--font-data, var(--font-display))',
        letterSpacing: '-0.5px',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.1,
        marginBottom: '4px',
      }}>{hasData ? formatValue(index.current) : '—'}</div>

      {/* Description */}
      <div style={{
        fontSize: '10px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-display)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        marginBottom: '12px',
      }}>{index.description}</div>

      {/* Sparkline */}
      {hasData && chartData.length > 1 && (
        <div style={{ width: '100%', height: '40px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={isUp ? '#1D9E75' : '#E03020'}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state if no sparkline */}
      {!hasData && (
        <div style={{
          width: '100%',
          height: '40px',
          background: 'var(--border)',
          borderRadius: '4px',
          opacity: 0.3,
        }} />
      )}
    </div>
  )
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(2)}K`
  return v.toFixed(0)
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
