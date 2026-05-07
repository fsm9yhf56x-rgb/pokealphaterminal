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
    ? 'var(--perf-up)'
    : target.pct >= 75 ? 'var(--premium)'
    : target.pct >= 30 ? 'var(--accent)'
    : 'var(--ink-faint)'

  const fmt = formatterForMetric(target.metric, target.unit)
  const meta = METRIC_META[target.metric]

  return (
    <div style={{
      background: 'var(--surface)',
      border: target.achieved ? '1px solid var(--green-border)' : '1px solid var(--border)',
      borderRadius: '14px',
      padding: '16px 18px',
      position: 'relative',
      transition: 'border-color 0.15s',
    }}>
      {/* Achieved badge */}
      {target.achieved && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          padding: '3px 8px',
          background: 'var(--perf-up-soft)',
          color: 'var(--perf-up)',
          fontSize: '9px',
          fontWeight: 600,
          fontFamily: 'var(--font-display)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderRadius: '6px',
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
            fontSize: '10px',
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'var(--font-display)',
            marginBottom: '4px',
          }}>{meta.label}</div>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--ink)',
            fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: '2px',
          }}>{target.label || `Atteindre ${fmt(target.target_value)}`}</div>
          {target.deadline && (
            <div style={{
              fontSize: '10px',
              color: 'var(--ink-muted)',
              fontFamily: 'var(--font-display)',
            }}>
              Deadline · {formatDeadline(target.deadline)}
            </div>
          )}
        </div>
      </div>

      {/* Bottom progress numbers */}
      <div style={{
        marginTop: '14px',
        paddingTop: '12px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}>
        <div>
          <div style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--ink)',
            fontFamily: 'var(--font-data, var(--font-display))',
            letterSpacing: '-0.3px',
          }}>{fmt(target.current)}</div>
          <div style={{
            fontSize: '10px',
            color: 'var(--ink-muted)',
            fontFamily: 'var(--font-display)',
          }}>Actuel</div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--ink-muted)',
            fontFamily: 'var(--font-data, var(--font-display))',
          }}>{fmt(target.target_value)}</div>
          <div style={{
            fontSize: '10px',
            color: 'var(--ink-muted)',
            fontFamily: 'var(--font-display)',
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
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--ink-faint)',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.12s',
          opacity: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.color = 'var(--accent)'
          e.currentTarget.style.borderColor = 'var(--accent)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.opacity = '0'
          e.currentTarget.style.color = 'var(--ink-faint)'
          e.currentTarget.style.borderColor = 'var(--border)'
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
          stroke="var(--border)"
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
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px',
        fontWeight: 600,
        color,
        fontFamily: 'var(--font-data, var(--font-display))',
      }}>{pct.toFixed(0)}%</div>
    </div>
  )
}

function AddCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: '2px dashed var(--border-strong)',
        borderRadius: '14px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
        minHeight: '140px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-display)',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--ink)'
        e.currentTarget.style.color = 'var(--ink)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-strong)'
        e.currentTarget.style.color = 'var(--ink-muted)'
      }}
    >
      <div style={{ fontSize: '24px', fontWeight: 300 }}>+</div>
      <div style={{ fontSize: '12px' }}>Ajouter un objectif</div>
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
