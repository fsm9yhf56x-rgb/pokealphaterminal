'use client'

import type { ObjAggregates, EnrichedTarget } from './Objectifs'
import type { GoalMetric } from '@/lib/useGoals'

/**
 * Targets financiers : cards avec progress ring + meta + delete.
 * 4 metrics supportés : portfolio_value, cards_count, roi_pct, graded_count.
 */
export function ObjFinancialTargets({
  agg, onAddTarget, onDelete,
}: {
  agg: ObjAggregates
  onAddTarget: () => void
  onDelete: (id: string) => void
}) {
  return (
    <div>
      <style>{`
        .obj-target-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
        }
      `}</style>
      <SectionTitle>Objectifs personnels</SectionTitle>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '14px',
      }}>
        {agg.enrichedTargets.map(t => (
          <TargetCard key={t.id} target={t} onDelete={onDelete} />
        ))}

        {/* Add card slot */}
        <AddCard onClick={onAddTarget} />
      </div>
    </div>
  )
}

function TargetCard({
  target, onDelete,
}: {
  target: EnrichedTarget
  onDelete: (id: string) => void
}) {
  const ringColor = target.achieved
    ? '#1D9E75'
    : target.pct >= 75 ? '#C9A84C'
    : target.pct >= 30 ? '#1D1D1F'
    : '#AEAEB2'

  const fmt = formatterForMetric(target.metric, target.unit)
  const meta = METRIC_META[target.metric]

  return (
    <div className="obj-target-card" style={{
      background: 'rgba(255,255,255,0.65)',
      backdropFilter: 'blur(14px) saturate(180%)',
      WebkitBackdropFilter: 'blur(14px) saturate(180%)',
      border: target.achieved ? '1px solid rgba(29,158,117,0.4)' : '1px solid rgba(0,0,0,0.05)',
      borderRadius: 16,
      padding: '18px 20px',
      position: 'relative' as const,
      transition: 'all .3s cubic-bezier(.2,.85,.3,1)',
      boxShadow: target.achieved
        ? '0 1px 3px rgba(29,158,117,0.08), inset 0 1px 0 rgba(255,255,255,0.85), 0 0 0 1px rgba(29,158,117,0.06)'
        : '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
    }}>
      {/* Achieved badge glass v7 */}
      {target.achieved && (
        <div style={{
          position: 'absolute' as const,
          top: 12,
          right: 12,
          padding: '4px 10px',
          background: 'rgba(29,158,117,0.12)',
          color: '#1D9E75',
          fontSize: 9.5,
          fontWeight: 700,
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.06em',
          borderRadius: 99,
          border: '1px solid rgba(29,158,117,0.2)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>✓ Atteint</div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '64px 1fr',
        gap: '14px',
        alignItems: 'center',
      }}>
        {/* Progress ring */}
        <ProgressRing pct={target.pct} color={ringColor} />

        {/* Info */}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 10,
            color: '#86868B',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.06em',
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            fontWeight: 700,
            marginBottom: 5,
          }}>{meta.label}</div>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#1D1D1F',
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            whiteSpace: 'nowrap' as const,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 3,
            letterSpacing: '-0.01em',
          }}>{target.label || `Atteindre ${fmt(target.target_value)}`}</div>
          {target.deadline && (
            <div style={{
              fontSize: 10.5,
              color: '#86868B',
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
            }}>
              Deadline · {formatDeadline(target.deadline)}
            </div>
          )}
        </div>
      </div>

      {/* Bottom progress numbers */}
      <div style={{
        marginTop: 16,
        paddingTop: 14,
        borderTop: '1px solid rgba(0,0,0,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}>
        <div>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#1D1D1F',
            fontFamily: 'var(--font-data, "Space Mono", monospace)',
            letterSpacing: '-0.3px',
            lineHeight: 1.1,
          }}>{fmt(target.current)}</div>
          <div style={{
            fontSize: 10,
            color: '#86868B',
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            marginTop: 3,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            fontWeight: 600,
          }}>Actuel</div>
        </div>

        <div style={{ textAlign: 'right' as const }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#86868B',
            fontFamily: 'var(--font-data, "Space Mono", monospace)',
            lineHeight: 1.1,
          }}>{fmt(target.target_value)}</div>
          <div style={{
            fontSize: 10,
            color: '#AEAEB2',
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            marginTop: 3,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            fontWeight: 600,
          }}>Cible</div>
        </div>
      </div>

      {/* Delete on hover */}
      <button
        onClick={() => {
          if (window.confirm('Supprimer cet objectif ?')) onDelete(target.id)
        }}
        title="Supprimer"
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.5)',
          border: '1px solid rgba(0,0,0,0.08)',
          color: '#AEAEB2',
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.12s',
          opacity: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.color = '#C42E1F'
          e.currentTarget.style.borderColor = '#C42E1F'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.opacity = '0'
          e.currentTarget.style.color = '#AEAEB2'
          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'
        }}
      >×</button>
    </div>
  )
}

/* SVG Progress ring (no library) */
function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const size = 64
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute' as const, inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13,
        fontWeight: 700,
        color,
        fontFamily: 'var(--font-data, "Space Mono", monospace)',
        letterSpacing: '-0.02em',
      }}>{pct.toFixed(0)}%</div>
    </div>
  )
}

function AddCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.35)',
        backdropFilter: 'blur(10px) saturate(180%)',
        WebkitBackdropFilter: 'blur(10px) saturate(180%)',
        border: '2px dashed rgba(0,0,0,0.12)',
        borderRadius: 16,
        padding: 22,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        cursor: 'pointer',
        minHeight: 150,
        color: '#86868B',
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
        transition: 'all .25s cubic-bezier(.2,.85,.3,1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#1D1D1F'
        e.currentTarget.style.color = '#1D1D1F'
        e.currentTarget.style.background = 'rgba(255,255,255,0.55)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'
        e.currentTarget.style.color = '#86868B'
        e.currentTarget.style.background = 'rgba(255,255,255,0.35)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 300, lineHeight: 1 }}>+</div>
      <div style={{ fontSize: 12.5, fontWeight: 500 }}>Ajouter un objectif</div>
    </button>
  )
}

/* ── Helpers ──────────────────────────────── */

const METRIC_META: Record<GoalMetric, { label: string }> = {
  portfolio_value: { label: 'Valeur portfolio' },
  cards_count:     { label: 'Nombre de cartes' },
  roi_pct:         { label: 'ROI annuel' },
  graded_count:    { label: 'Cartes gradées' },
}

function formatterForMetric(metric: GoalMetric, unit?: string | null): (v: number) => string {
  switch (metric) {
    case 'portfolio_value':
      return (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
    case 'roi_pct':
      return (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
    case 'cards_count':
      return (v) => `${v.toLocaleString('fr-FR')} carte${v > 1 ? 's' : ''}`
    case 'graded_count':
      return (v) => `${v.toLocaleString('fr-FR')} gradée${v > 1 ? 's' : ''}`
    default:
      return (v) => `${v}${unit ? ' ' + unit : ''}`
  }
}

function formatDeadline(d: string): string {
  try {
    const date = new Date(d)
    return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(date)
  } catch { return d }
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
