'use client'

import type { UndervaluedFilters, SignalTier } from '@/lib/useUndervalued'

interface Stats {
  total: number
  sCount: number
  aCount: number
  bCount: number
}

/**
 * Filtres pour les signaux : tier (S/A/B/Tous) + min upside + min confidence.
 * Layout horizontal compact avec sliders ergonomiques.
 */
export function SEFilters({
  filters, updateFilter, resetFilters, stats,
}: {
  filters: UndervaluedFilters
  updateFilter: <K extends keyof UndervaluedFilters>(k: K, v: UndervaluedFilters[K]) => void
  resetFilters: () => void
  stats: Stats
}) {
  const hasActiveFilters =
    filters.tier !== 'ALL' ||
    filters.minUpside > 0 ||
    filters.minConfidence > 0

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '14px 18px',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        alignItems: 'center',
      }}>
        {/* Tier filter */}
        <div>
          <Label>Tier</Label>
          <TierSegmented
            value={filters.tier}
            onChange={(v) => updateFilter('tier', v)}
            counts={{ S: stats.sCount, A: stats.aCount, B: stats.bCount, ALL: stats.total }}
          />
        </div>

        {/* Min upside slider */}
        <div>
          <Label>
            Upside minimum
            <Value>{filters.minUpside > 0 ? `+${filters.minUpside}%` : 'Tout'}</Value>
          </Label>
          <Slider
            min={0}
            max={500}
            step={10}
            value={filters.minUpside}
            onChange={(v) => updateFilter('minUpside', v)}
            color="var(--perf-up)"
          />
        </div>

        {/* Min confidence slider */}
        <div>
          <Label>
            Confidence minimum
            <Value>{filters.minConfidence > 0 ? `${filters.minConfidence}%` : 'Tout'}</Value>
          </Label>
          <Slider
            min={0}
            max={100}
            step={5}
            value={filters.minConfidence}
            onChange={(v) => updateFilter('minConfidence', v)}
            color="var(--accent)"
          />
        </div>
      </div>

      {/* Reset bar (only if filters active) */}
      {hasActiveFilters && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <span style={{
            fontSize: '11px',
            color: 'var(--ink-muted)',
            fontFamily: 'var(--font-display)',
          }}>
            Filtres actifs · résultats restreints
          </span>
          <button
            onClick={resetFilters}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              color: 'var(--ink-muted)',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)'
              e.currentTarget.style.color = 'var(--ink-muted)'
            }}
          >Réinitialiser</button>
        </div>
      )}
    </div>
  )
}

/* ── TierSegmented ───────────────────────── */

const TIER_COLORS: Record<string, string> = {
  S: '#B8860B',
  A: 'var(--perf-up)',
  B: 'var(--ink-muted)',
  ALL: 'var(--ink)',
}

function TierSegmented({
  value, onChange, counts,
}: {
  value: SignalTier | 'ALL'
  onChange: (v: SignalTier | 'ALL') => void
  counts: Record<string, number>
}) {
  const options: { value: SignalTier | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Tous' },
    { value: 'S',   label: 'S' },
    { value: 'A',   label: 'A' },
    { value: 'B',   label: 'B' },
  ]

  return (
    <div style={{
      display: 'flex',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      {options.map((opt, i) => {
        const isActive = value === opt.value
        const color = TIER_COLORS[opt.value]
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              padding: '8px 4px',
              background: isActive ? color : 'transparent',
              color: isActive ? 'var(--surface)' : 'var(--ink-muted)',
              border: 'none',
              borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              transition: 'all 0.12s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <span>{opt.label}</span>
            <span style={{
              fontSize: '9px',
              opacity: isActive ? 0.85 : 0.6,
              fontFamily: 'var(--font-data, var(--font-display))',
            }}>
              {counts[opt.value]?.toLocaleString('fr-FR') || 0}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ── Slider ──────────────────────────────── */

function Slider({
  min, max, step, value, onChange, color,
}: {
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  color: string
}) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div style={{ position: 'relative', height: '24px', display: 'flex', alignItems: 'center' }}>
      {/* Track */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0,
        height: '4px',
        background: 'var(--border)',
        borderRadius: '2px',
      }} />
      {/* Fill */}
      <div style={{
        position: 'absolute',
        left: 0,
        width: `${pct}%`,
        height: '4px',
        background: color,
        borderRadius: '2px',
        transition: 'width 0.1s',
      }} />
      {/* Native input (invisible thumb but functional) */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          opacity: 0,
          cursor: 'pointer',
          margin: 0,
        }}
      />
      {/* Custom thumb */}
      <div style={{
        position: 'absolute',
        left: `calc(${pct}% - 7px)`,
        width: '14px',
        height: '14px',
        background: 'var(--surface)',
        border: `2px solid ${color}`,
        borderRadius: '50%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        pointerEvents: 'none',
        transition: 'left 0.1s',
      }} />
    </div>
  )
}

/* ── Atoms ───────────────────────────────── */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: '8px',
      fontSize: '10px',
      fontWeight: 600,
      color: 'var(--ink-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      fontFamily: 'var(--font-display)',
    }}>{children}</div>
  )
}

function Value({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 600,
      color: 'var(--ink)',
      textTransform: 'none',
      letterSpacing: 'normal',
      fontFamily: 'var(--font-data, var(--font-display))',
      fontVariantNumeric: 'tabular-nums',
    }}>{children}</span>
  )
}
