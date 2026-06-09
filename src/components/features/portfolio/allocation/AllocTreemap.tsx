'use client'

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import type { AllocAggregates, TreemapNode } from './Allocation'
import { deriveEra } from './Allocation'
import { usePersona } from '@/lib/usePersona'
import { SNOW } from '@/lib/design/snow'

// Drapeau lu par CustomNode (content renderer recharts, hors arbre React -> pas de hook possible).
// Synchronise depuis AllocTreemap avant chaque rendu. OK en solo : un seul treemap monte a la fois.
let __treemapShowPnl = true

/**
 * Treemap Recharts v7 - piece maitresse visuelle d\'Allocation.
 * 1 rectangle = 1 set, taille = valeur, couleur = ROI moyen.
 * Vue "carte de poids" du portfolio facon Bloomberg premium.
 */
export function AllocTreemap({ agg }: { agg: AllocAggregates }) {
  const { show } = usePersona()
  __treemapShowPnl = show.pnl
  if (agg.treemapData.length === 0) return null

  // Couleur des cellules : ROI (investor) conservé tel quel,
  // ou recoloré par ère (collector) — recharts lit le champ `fill`.
  const treemapColored = show.pnl
    ? agg.treemapData
    : (agg.treemapData as TreemapNode[]).map(n => ({ ...n, fill: eraColor(n.name) }))

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
        .alloc-treemap-mobile { display: none; }
        @media (max-width: 1024px) {
          .alloc-treemap-desktop { display: none; }
          .alloc-treemap-mobile { display: block; }
          .alloc-treemap-hover-hint { display: none; }
          .alloc-treemap-legend-mobile { display: inline !important; }
        }
        /* Recharts cell hover effect via CSS */
        .alloc-treemap-wrapper svg .recharts-rectangle:hover {
          filter: brightness(1.08) saturate(1.1);
          cursor: pointer;
        }
      `}</style>
      <SectionTitle>{show.pnl ? 'Carte de valeur' : 'Mes séries'}</SectionTitle>

      <div className="alloc-treemap-card" style={{
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: 18,
        padding: 22,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
      }}>
        {/* Legend — ères (collector) vs ROI gradient (investor) */}
        {!show.pnl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' as const }}>
            {agg.treemapData.length > 0 && (() => {
              const eras = Array.from(new Set((agg.treemapData as TreemapNode[]).map(n => deriveEra(n.name))))
              return eras.map(era => (
                <span key={era} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '4px 11px 4px 9px', borderRadius: 999,
                  background: `linear-gradient(180deg, ${ERA_COLORS[era] ?? '#86868B'}1F, ${ERA_COLORS[era] ?? '#86868B'}0F)`,
                  border: `1px solid ${ERA_COLORS[era] ?? '#86868B'}33`,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(0,0,0,0.03)',
                  backdropFilter: 'blur(10px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(10px) saturate(160%)',
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: ERA_COLORS[era] ?? '#86868B', flexShrink: 0,
                    boxShadow: `0 0 5px ${ERA_COLORS[era] ?? '#86868B'}66`,
                  }} />
                  <span style={{
                    fontSize: 11, color: '#1D1D1F',
                    fontFamily: 'var(--font-sora, Sora, sans-serif)', fontWeight: 600,
                    letterSpacing: '-0.005em', whiteSpace: 'nowrap',
                  }}>{era}</span>
                </span>
              ))
            })()}
          </div>
        ) : (
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

        )}

        {/* Treemap (desktop) */}
        <div className="alloc-treemap-wrapper alloc-treemap-desktop" style={{ width: '100%', height: 420 }}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treemapColored as any}
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

        {/* Liste rankee (mobile) — treemap illisible + tooltip hover mort au doigt */}
        <div className="alloc-treemap-mobile">
          <TreemapMobileList nodes={agg.treemapData as TreemapNode[]} />
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
          <span className="alloc-treemap-hover-hint">
            <strong style={{ color: '#86868B' }}>Taille</strong> = {show.pnl ? 'valeur du set' : 'taille du set'} ·{' '}
            <strong style={{ color: '#86868B' }}>Couleur</strong> = {show.pnl ? 'performance moyenne' : 'ère du set'}
          </span>
          <span className="alloc-treemap-legend-mobile" style={{ display: 'none' }}>
            <strong style={{ color: '#86868B' }}>Barre</strong> = poids ·{' '}
            <strong style={{ color: '#86868B' }}>%</strong> ROI moyen du set
          </span>
          <span className="alloc-treemap-hover-hint" style={{ fontStyle: 'italic' as const, opacity: 0.7 }}>
            Survolez pour les détails
          </span>
        </div>
      </div>
    </div>
  )
}

/* Vue mobile : liste rankee des sets. Tout est visible (valeur, poids,
   cartes, ROI) — ce que le tooltip cachait au survol, impossible au doigt. */
function TreemapMobileList({ nodes }: { nodes: TreemapNode[] }) {
  const { show } = usePersona()
  const sorted = [...nodes].sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map((n, i) => {
        const roi = Number(n.avgROI ?? 0)
        const roiColor = roi > 0.5 ? '#1D9E75' : roi < -0.5 ? '#C42E1F' : '#86868B'
        const count = Number(n.count ?? 0)
        return (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(0,0,0,0.05)',
            borderRadius: 12,
            padding: '12px 14px',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'baseline', gap: 10, marginBottom: 9,
            }}>
              <span style={{
                fontSize: 13.5, fontWeight: 700, color: '#1D1D1F',
                fontFamily: 'var(--font-sora, Sora, sans-serif)',
                letterSpacing: '-0.01em',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{n.name}</span>
              <span style={{
                fontSize: 13, fontWeight: 700, color: '#1D1D1F',
                fontFamily: 'var(--font-data, "Space Mono", monospace)',
                flexShrink: 0,
              }}>{show.pnl ? formatEUR(n.size) : `${n.count} carte${n.count>1?'s':''}`}</span>
            </div>
            <div style={{
              height: 7, borderRadius: 4,
              background: 'rgba(0,0,0,0.08)',
              overflow: 'hidden', marginBottom: 8,
            }}>
              <div style={{
                width: `${Math.max(4, Number(n.pct ?? 0))}%`,
                height: '100%', borderRadius: 4,
                background: show.pnl ? barColor(Number(n.avgROI ?? 0), n.fill) : eraColor(n.name),
              }} />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 11, color: '#86868B',
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
            }}>
              <span>
                <strong style={{ color: '#1D1D1F', fontFamily: 'var(--font-data, "Space Mono", monospace)' }}>
                  {Number(n.pct ?? 0).toFixed(1)}%
                </strong> du portfolio · {count} carte{count > 1 ? 's' : ''}
              </span>
              {show.pnl && <span style={{
                fontFamily: 'var(--font-data, "Space Mono", monospace)',
                fontWeight: 700, color: roiColor, flexShrink: 0,
              }}>{roi >= 0 ? '+' : ''}{roi.toFixed(1)}%</span>}
            </div>
          </div>
        )
      })}
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

  // Fond verre clair => texte toujours sombre, sans ombre baveuse.
  const accent = fill || '#8E949C'
  const textColor = '#1D1D1F'
  const shadowColor = 'rgba(255,255,255,0.6)'

  // Rayon arrondi adapte a la taille de la cellule
  const radius = Math.min(8, Math.min(width, height) / 4)

  return (
    <g>
      {/* Cellule = verre clair teinté très léger par l'ère */}
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(0, width - 2)}
        height={Math.max(0, height - 2)}
        rx={radius}
        ry={radius}
        style={{
          fill: '#FFFFFF',
          opacity: 0.45,
          stroke: `${accent}66`,
          strokeWidth: 1.5,
          transition: 'filter .2s ease, opacity .2s ease',
        }}
      />
      {/* Wash d'accent très subtil par-dessus le verre */}
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(0, width - 2)}
        height={Math.max(0, height - 2)}
        rx={radius}
        ry={radius}
        style={{ fill: accent, opacity: 0.16, pointerEvents: 'none' }}
      />
      {/* Barre d'accent latérale = identité d'ère */}
      <rect
        x={x + 1}
        y={y + 1}
        width={5}
        height={Math.max(0, height - 2)}
        rx={2.5}
        ry={2.5}
        style={{ fill: accent, opacity: 1, pointerEvents: 'none' }}
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
          x={x + 16}
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
            {__treemapShowPnl ? formatEURcompact(size) : `${props.count ?? ''}`}
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
        {__treemapShowPnl && <Row label="Valeur"   value={formatEUR(d.size)} />}
        {__treemapShowPnl && <Row label="Poids"    value={`${Number(d.pct ?? 0).toFixed(1)}%`} />}
        <Row label="Cartes"   value={`${d.count}`} />
        {__treemapShowPnl && <div style={{
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
        </div>}
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

/* Couleur de barre mobile : ROI neutre -> bleu neutre lisible (pas le gris
   central du treemap qui se fond), sinon vert/rouge selon performance. */
const ERA_COLORS: Record<string, string> = {
  'Vintage WOTC':     '#D4AF37', // or premium
  'EX':               '#2A82DD', // bleu
  'DPP / HGSS':       '#0E9E8E', // teal
  'Black & White':    '#5C6270', // ardoise
  'XY':               '#C44E8E', // magenta
  'Sun & Moon':       '#E07B39', // orange
  'Sword & Shield':   '#4F5FC4', // indigo
  'Scarlet & Violet': '#D93A3A', // rouge
  'Autre':            '#8E949C', // gris
  'N/A':              '#B4B9C0', // gris clair
}

function eraColor(setName: string): string {
  const era = deriveEra(setName)
  return ERA_COLORS[era] ?? '#86868B'
}

function barColor(roi: number, fill?: string): string {
  if (roi > 0.5)  return '#1D9E75'
  if (roi < -0.5) return '#C42E1F'
  return '#9CA3AF'
}
