'use client'

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import type { AllocAggregates, TreemapNode } from './Allocation'

/**
 * Treemap Recharts v7 - piece maitresse visuelle d\'Allocation.
 * 1 rectangle = 1 set, taille = valeur, couleur = ROI moyen.
 * Vue "carte de poids" du portfolio facon Bloomberg premium.
 */
export function AllocTreemap({ agg }: { agg: AllocAggregates }) {
  if (agg.treemapData.length === 0) return null

  return (
    <div>
      <style>{`
        @keyframes treemapFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .alloc-treemap-card {
          transition: all .3s cubic-bezier(.2,.85,.3,1);
        }
        .alloc-treemap-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
        }
        .alloc-treemap-wrapper {
          animation: treemapFadeIn .5s cubic-bezier(.2,.85,.3,1);
        }
        /* Recharts cell hover effect via CSS */
        .alloc-treemap-wrapper svg .recharts-rectangle:hover {
          filter: brightness(1.08) saturate(1.1);
          cursor: pointer;
        }
      `}</style>
      <SectionTitle>Carte de valeur</SectionTitle>

      <div className="alloc-treemap-card" style={{
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: 18,
        padding: 22,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
      }}>
        {/* Legend ROI - gradient continu premium */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 16,
          flexWrap: 'wrap' as const,
        }}>
          <span style={{
            fontSize: 10.5,
            color: '#86868B',
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
            fontWeight: 700,
            flexShrink: 0,
          }}>
            ROI
          </span>
          <ROIGradient />
          <span style={{
            fontSize: 10.5,
            color: '#86868B',
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            marginLeft: 'auto',
          }}>
            <strong style={{ color: '#1D1D1F' }}>{agg.treemapData.length}</strong> sets
          </span>
        </div>

        {/* Treemap */}
        <div className="alloc-treemap-wrapper" style={{ width: '100%', height: 420 }}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={agg.treemapData as any}
              dataKey="size"
              stroke="rgba(255,255,255,0.45)"
              content={<CustomNode />}
              isAnimationActive={true}
              animationDuration={500}
              animationEasing="ease-out"
            >
              <Tooltip content={<TreemapTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </div>

        {/* Footer hint poetique */}
        <div style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 10.5,
          color: '#AEAEB2',
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
          gap: 12,
          flexWrap: 'wrap' as const,
        }}>
          <span>
            <strong style={{ color: '#86868B' }}>Taille</strong> = valeur du set ·{' '}
            <strong style={{ color: '#86868B' }}>Couleur</strong> = performance moyenne
          </span>
          <span style={{ fontStyle: 'italic' as const, opacity: 0.7 }}>
            Survolez pour les détails
          </span>
        </div>
      </div>
    </div>
  )
}

/* Custom rectangle renderer avec coins arrondis + inset glow */
function CustomNode(props: any) {
  const { x, y, width, height, name, size, pct, fill, depth } = props
  if (width <= 0 || height <= 0) return null
  if (depth === 0) return null  // skip root

  // Show label only if rectangle is large enough
  const showName  = width > 80 && height > 36
  const showValue = width > 80 && height > 56
  const showPct   = width > 56 && height > 26

  // Text color depending on background luminance
  const isLight = isLightColor(fill || '#E5E5EA')
  const textColor = isLight ? '#1D1D1F' : '#FFFFFF'
  const shadowColor = isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'

  // Rayon arrondi adapte a la taille de la cellule
  const radius = Math.min(8, Math.min(width, height) / 4)

  return (
    <g>
      {/* Cellule principale avec coins arrondis */}
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(0, width - 2)}
        height={Math.max(0, height - 2)}
        rx={radius}
        ry={radius}
        style={{
          fill: fill || '#E5E5EA',
          stroke: 'rgba(255,255,255,0.45)',
          strokeWidth: 1.5,
          transition: 'filter .2s ease, opacity .2s ease',
        }}
      />
      {/* Overlay shimmer subtle pour profondeur (gradient top white inset) */}
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(0, width - 2)}
        height={Math.max(0, height - 2)}
        rx={radius}
        ry={radius}
        style={{
          fill: 'url(#treemap-inset-gradient)',
          pointerEvents: 'none',
        }}
      />
      {/* Definitions reusables */}
      {depth === 1 && (
        <defs>
          <linearGradient id="treemap-inset-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
      )}
      {/* Set name */}
      {showName && (
        <text
          x={x + 12}
          y={y + 22}
          fill={textColor}
          fontSize="12"
          fontWeight="700"
          fontFamily="var(--font-sora, Sora, sans-serif)"
          style={{
            pointerEvents: 'none',
            textShadow: `0 1px 2px ${shadowColor}`,
            letterSpacing: '-0.01em',
          }}
        >
          {truncate(name, Math.max(6, Math.floor((width - 24) / 7)))}
        </text>
      )}
      {/* Value + percentage stacked */}
      {showValue && (
        <>
          <text
            x={x + 12}
            y={y + 40}
            fill={textColor}
            fontSize="11"
            fontWeight="600"
            fontFamily="var(--font-data, &quot;Space Mono&quot;, monospace)"
            opacity={0.95}
            style={{
              pointerEvents: 'none',
              textShadow: `0 1px 2px ${shadowColor}`,
            }}
          >
            {formatEURcompact(size)}
          </text>
          <text
            x={x + 12}
            y={y + 55}
            fill={textColor}
            fontSize="10"
            fontFamily="var(--font-data, &quot;Space Mono&quot;, monospace)"
            opacity={0.75}
            style={{
              pointerEvents: 'none',
              textShadow: `0 1px 2px ${shadowColor}`,
            }}
          >
            {pct?.toFixed(1)}%
          </text>
        </>
      )}
      {/* Compact view: only pct */}
      {showPct && !showValue && (
        <text
          x={x + 8}
          y={y + 34}
          fill={textColor}
          fontSize="10"
          fontWeight="600"
          fontFamily="var(--font-data, &quot;Space Mono&quot;, monospace)"
          opacity={0.9}
          style={{
            pointerEvents: 'none',
            textShadow: `0 1px 2px ${shadowColor}`,
          }}
        >
          {pct?.toFixed(0)}%
        </text>
      )}
    </g>
  )
}

/* Tooltip glass v7 premium ref SoonModal */
function TreemapTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as TreemapNode
  if (!d || !d.name) return null

  const isUp = d.avgROI >= 0

  return (
    <div style={{
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      border: '1px solid rgba(255,255,255,0.6)',
      borderRadius: 12,
      padding: '14px 18px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)',
      fontFamily: 'var(--font-sora, Sora, sans-serif)',
      minWidth: 200,
      position: 'relative' as const,
    }}>
      {/* Color indicator */}
      <div style={{
        position: 'absolute' as const,
        top: 12,
        right: 14,
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: d.fill || '#E5E5EA',
        boxShadow: `0 0 0 2px rgba(255,255,255,0.7), 0 1px 3px ${d.fill || '#E5E5EA'}40`,
      }} />
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        color: '#1D1D1F',
        marginBottom: 10,
        paddingRight: 24,
        letterSpacing: '-0.01em',
      }}>{d.name}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Row label="Valeur"   value={formatEUR(d.size)} />
        <Row label="Poids"    value={`${Number(d.pct ?? 0).toFixed(1)}%`} />
        <Row label="Cartes"   value={`${d.count}`} />
        <div style={{
          marginTop: 6,
          paddingTop: 8,
          borderTop: '1px solid rgba(0,0,0,0.06)',
        }}>
          <Row
            label="ROI moyen"
            value={`${isUp ? '+' : ''}${Number(d.avgROI ?? 0).toFixed(1)}%`}
            valueColor={isUp ? '#1D9E75' : '#C42E1F'}
            bold
          />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, valueColor, bold }: { label: string; value: string; valueColor?: string; bold?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 14,
      fontSize: 11.5,
    }}>
      <span style={{
        color: '#86868B',
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
      }}>{label}</span>
      <span style={{
        fontWeight: bold ? 700 : 600,
        color: valueColor || '#1D1D1F',
        fontFamily: 'var(--font-data, "Space Mono", monospace)',
      }}>{value}</span>
    </div>
  )
}

/* Gradient ROI continu premium */
function ROIGradient() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      maxWidth: 360,
    }}>
      <span style={{
        fontSize: 9.5,
        color: '#C42E1F',
        fontFamily: 'var(--font-data, "Space Mono", monospace)',
        fontWeight: 700,
        flexShrink: 0,
      }}>-50%</span>
      <div style={{
        flex: 1,
        height: 8,
        borderRadius: 4,
        background: 'linear-gradient(90deg, #C42E1F 0%, #E87F73 25%, #E5E5EA 50%, #A8DCC4 75%, #1D9E75 100%)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.6)',
        position: 'relative' as const,
      }}>
        {/* Marker 0% au centre */}
        <div style={{
          position: 'absolute' as const,
          left: '50%',
          top: '-3px',
          bottom: '-3px',
          width: 1.5,
          background: 'rgba(0,0,0,0.18)',
        }} />
      </div>
      <span style={{
        fontSize: 9.5,
        color: '#1D9E75',
        fontFamily: 'var(--font-data, "Space Mono", monospace)',
        fontWeight: 700,
        flexShrink: 0,
      }}>+50%</span>
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
        textTransform: 'uppercase' as const,
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

/* ── Utils ───────────────────────────────────── */

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

function formatEURcompact(v: number): string {
  if (v >= 1_000_000) return `€${Number(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `€${Number(v / 1_000).toFixed(1)}K`
  return `€${Number(v ?? 0).toFixed(0)}`
}
