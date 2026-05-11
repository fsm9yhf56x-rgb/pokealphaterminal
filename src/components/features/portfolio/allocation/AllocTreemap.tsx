'use client'

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import type { AllocAggregates, TreemapNode } from './Allocation'

/**
 * Treemap Recharts : 1 rectangle = 1 set, taille = valeur, couleur = ROI moyen.
 * Vue "carte de poids" du portfolio façon Bloomberg.
 */
export function AllocTreemap({ agg }: { agg: AllocAggregates }) {
  if (agg.treemapData.length === 0) return null

  return (
    <div>
      <SectionTitle>Carte de valeur</SectionTitle>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px',
      }}>
        {/* Legend ROI */}
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
          <ROIScale />
        </div>

        {/* Treemap */}
        <div style={{ width: '100%', height: '380px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={agg.treemapData as any}
              dataKey="size"
              stroke="var(--surface)"
              content={<CustomNode />}
              isAnimationActive={true}
              animationDuration={400}
            >
              <Tooltip content={<TreemapTooltip />} />
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
          Taille = valeur du set · Couleur = ROI moyen
        </div>
      </div>
    </div>
  )
}

/* Custom rectangle renderer for the treemap */
function CustomNode(props: any) {
  const { x, y, width, height, name, size, pct, fill } = props
  if (width <= 0 || height <= 0) return null

  // Show label only if rectangle is large enough
  const showName  = width > 70 && height > 32
  const showValue = width > 70 && height > 50
  const showPct   = width > 50 && height > 24

  // Text color depending on background luminance
  const textColor = isLightColor(fill) ? '#1D1D1F' : '#FFFFFF'

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
          strokeWidth: 2,
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
      {showValue && (
        <text
          x={x + 8}
          y={y + 34}
          fill={textColor}
          fontSize="10"
          fontFamily="var(--font-data, var(--font-display))"
          opacity={0.85}
          style={{ pointerEvents: 'none' }}
        >
          {formatEURcompact(size)}
        </text>
      )}
      {showPct && !showValue && (
        // Compact view: only pct
        <text
          x={x + 8}
          y={y + 32}
          fill={textColor}
          fontSize="9"
          fontFamily="var(--font-data, var(--font-display))"
          opacity={0.85}
          style={{ pointerEvents: 'none' }}
        >
          {pct?.toFixed(0)}%
        </text>
      )}
    </g>
  )
}

function TreemapTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as TreemapNode
  if (!d || !d.name) return null

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
        <Row label="Valeur"   value={formatEUR(d.size)} />
        <Row label="Poids"    value={`${(d.pct ?? 0).toFixed(1)}%`} />
        <Row label="Cartes"   value={`${d.count}`} />
        <Row
          label="ROI moyen"
          value={`${d.avgROI >= 0 ? '+' : ''}${(d.avgROI ?? 0).toFixed(1)}%`}
          valueColor={d.avgROI >= 0 ? 'var(--perf-up)' : 'var(--perf-down)'}
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

function ROIScale() {
  const stops = [
    { roi: '-50%+', color: '#E03020' },
    { roi: '-20%',  color: '#E87F73' },
    { roi: '0%',    color: '#E5E5EA' },
    { roi: '+20%',  color: '#A8DCC4' },
    { roi: '+50%+', color: '#1D9E75' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {stops.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '2px',
            background: s.color,
          }} />
          <span style={{ fontSize: '10px' }}>{s.roi}</span>
        </div>
      ))}
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

/* ── Utils ───────────────────────────────────── */

function isLightColor(hex: string): boolean {
  if (!hex || !hex.startsWith('#')) return true
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Luminance perçue
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

function formatEURcompact(v: number): string {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `€${(v / 1_000).toFixed(1)}K`
  return `€${(v ?? 0).toFixed(0)}`
}
