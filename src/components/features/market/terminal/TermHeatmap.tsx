'use client'

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import type { HeatmapNode } from '@/lib/useMarketData'

/**
 * Heatmap des sets actifs : taille = volume (€), couleur = variation 24h.
 * Façon Bloomberg "market overview" qui montre la santé globale en un coup d'œil.
 */
export function TermHeatmap({ nodes }: { nodes: HeatmapNode[] }) {
  if (nodes.length === 0) return null

  // Map nodes to Recharts treemap format
  const data = nodes.map(n => ({
    name: n.set_name,
    size: Math.max(n.volume, 1),  // avoid 0-size rectangles
    volume: n.volume,
    variation: n.variation_24h,
    cards: n.cards_count,
    fill: variationToColor(n.variation_24h),
  }))

  return (
    <div>
      <SectionTitle>Heatmap des sets · activité 24h</SectionTitle>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px',
      }}>
        {/* Variation legend */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '12px',
          fontSize: '10px',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-display)',
        }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Couleur =
          </span>
          <VariationScale />
          <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
            Taille = volume du set
          </span>
        </div>

        {/* Treemap */}
        <div style={{ width: '100%', height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={data as any}
              dataKey="size"
              stroke="var(--surface)"
              content={<HeatmapNode_ />}
              isAnimationActive={true}
              animationDuration={400}
            >
              <Tooltip content={<HeatmapTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </div>

        {/* Footer hint */}
        <div style={{
          marginTop: '10px',
          fontSize: '10px',
          color: 'var(--ink-faint)',
          fontFamily: 'var(--font-display)',
          textAlign: 'right',
        }}>
          {data.length} sets · top par activité
        </div>
      </div>
    </div>
  )
}

/* Custom rectangle renderer */
function HeatmapNode_(props: any) {
  const { x, y, width, height, name, fill, variation } = props
  if (width <= 0 || height <= 0) return null

  const showName = width > 60 && height > 28
  const showVar  = width > 80 && height > 44

  // Adaptive text color based on background
  const textColor = isLightColor(fill) ? '#1D1D1F' : '#FFFFFF'
  const isUp = variation >= 0

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: fill || '#E5E5EA',
          stroke: 'var(--surface)',
          strokeWidth: 1.5,
        }}
      />
      {showName && (
        <text
          x={x + 8}
          y={y + 18}
          fill={textColor}
          fontSize="11"
          fontWeight="600"
          fontFamily="var(--font-display)"
          style={{ pointerEvents: 'none' }}
        >
          {truncate(name, Math.max(6, Math.floor(width / 7)))}
        </text>
      )}
      {showVar && variation !== 0 && (
        <text
          x={x + 8}
          y={y + 34}
          fill={textColor}
          fontSize="10"
          fontFamily="var(--font-data, var(--font-display))"
          opacity={0.85}
          style={{ pointerEvents: 'none' }}
        >
          {isUp ? '▲' : '▼'} {variation >= 0 ? '+' : ''}{(variation ?? 0).toFixed(1)}%
        </text>
      )}
    </g>
  )
}

function HeatmapTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  if (!d || !d.name) return null

  const isUp = d.variation >= 0
  const trendColor = isUp ? 'var(--perf-up)' : 'var(--perf-down)'

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-strong)',
      borderRadius: '8px',
      padding: '10px 14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      fontFamily: 'var(--font-display)',
      minWidth: '180px',
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--ink)',
        marginBottom: '6px',
      }}>{d.name}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <Row label="Volume"   value={formatEUR(d.volume)} />
        <Row label="Cartes"   value={`${d.cards}`} />
        <Row
          label="Variation 24h"
          value={`${d.variation >= 0 ? '+' : ''}${(d.variation ?? 0).toFixed(2)}%`}
          valueColor={trendColor}
        />
      </div>
    </div>
  )
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: '12px',
      fontSize: '11px',
    }}>
      <span style={{ color: 'var(--ink-muted)' }}>{label}</span>
      <span style={{
        fontWeight: 500,
        color: valueColor || 'var(--ink)',
        fontFamily: 'var(--font-data, var(--font-display))',
      }}>{value}</span>
    </div>
  )
}

function VariationScale() {
  const stops = [
    { v: '-10%+', color: '#E03020' },
    { v: '-3%',   color: '#E87F73' },
    { v: '0%',    color: '#E5E5EA' },
    { v: '+3%',   color: '#A8DCC4' },
    { v: '+10%+', color: '#1D9E75' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {stops.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '2px',
            background: s.color,
          }} />
          <span style={{ fontSize: '10px' }}>{s.v}</span>
        </div>
      ))}
    </div>
  )
}

function variationToColor(v: number): string {
  // Variation 24h → couleur (clamp -15% / +15%)
  const clamped = Math.max(-15, Math.min(15, v))
  if (clamped >= 8)   return '#1D9E75'  // perf-up vif
  if (clamped >= 3)   return '#5BC495'
  if (clamped >= 1)   return '#A8DCC4'
  if (clamped >= -1)  return '#E5E5EA'  // neutre
  if (clamped >= -3)  return '#F5C2BB'
  if (clamped >= -8)  return '#E87F73'
  return '#E03020'  // perf-down vif
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

function isLightColor(hex: string): boolean {
  if (!hex || !hex.startsWith('#')) return true
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function formatEUR(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
}
