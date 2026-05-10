'use client'

import { useRouter } from 'next/navigation'
import type { SpreadSignal } from '@/lib/useSpreads'

/**
 * Teaser des top spreads du jour — vue compact, click = aller à /market/spreads.
 * Garde le focus sur l'opportunité (upside + tier) sans la complexité du drawer.
 */
export function HubSpreadsTeaser({
  signals, loading,
}: {
  signals: SpreadSignal[]
  loading: boolean
}) {
  const router = useRouter()

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <SectionLabel>Spreads du jour</SectionLabel>
        <button
          onClick={() => router.push('/market/spreads')}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '11px',
            color: 'var(--ink-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >Voir tout <span>→</span></button>
      </div>

      {loading ? (
        <LoadingState />
      ) : signals.length === 0 ? (
        <EmptyState />
      ) : (
        signals.map((s, i) => (
          <Row
            key={s.card_ref}
            signal={s}
            isLast={i === signals.length - 1}
            onClick={() => router.push('/market/spreads')}
          />
        ))
      )}
    </div>
  )
}

/* ── Row ─────────────────────────────────── */

function Row({
  signal, isLast, onClick,
}: {
  signal: SpreadSignal
  isLast: boolean
  onClick: () => void
}) {
  const tierStyle = TIER_STYLES[signal.signal_tier]

  return (
    <button
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr auto',
        gap: '12px',
        width: '100%',
        padding: '11px 16px',
        border: 'none',
        borderTop: '1px solid var(--border)',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        alignItems: 'center',
        transition: 'background 0.1s',
        fontFamily: 'var(--font-display)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.015)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Tier badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '24px',
        background: tierStyle.bg,
        color: tierStyle.fg,
        fontSize: '11px',
        fontWeight: 700,
        borderRadius: '5px',
        fontFamily: 'var(--font-data, var(--font-display))',
        letterSpacing: '0.05em',
      }}>{signal.signal_tier}</div>

      {/* Name + meta (EU → US prices) */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--ink)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '2px',
        }}>{signal.card_name}</div>
        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-data, var(--font-display))',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          EU {formatEUR(signal.price_eu)} <span style={{ color: 'var(--ink-faint)' }}>→</span> US {formatEUR(signal.price_us)}
        </div>
      </div>

      {/* Upside */}
      <div style={{
        textAlign: 'right',
        fontSize: '14px',
        fontWeight: 700,
        color: 'var(--perf-up)',
        fontFamily: 'var(--font-data, var(--font-display))',
        fontVariantNumeric: 'tabular-nums',
      }}>
        +{signal.upside_pct.toFixed(0)}%
      </div>
    </button>
  )
}

/* ── States ──────────────────────────────── */

function LoadingState() {
  return (
    <div style={{
      padding: '40px 16px',
      textAlign: 'center',
      fontSize: '11px',
      color: 'var(--ink-faint)',
      fontFamily: 'var(--font-display)',
    }}>Détection des signaux…</div>
  )
}

function EmptyState() {
  return (
    <div style={{
      padding: '32px 20px',
      textAlign: 'center',
      fontSize: '11px',
      color: 'var(--ink-muted)',
      fontFamily: 'var(--font-display)',
      lineHeight: 1.5,
    }}>
      <div style={{ fontSize: '20px', opacity: 0.4, marginBottom: '6px' }}>◆</div>
      Aucun spread détecté pour le moment.<br />
      Le scanner s'exécute toutes les 4 heures.
    </div>
  )
}

/* ── Atoms ─────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    }}>
      <div style={{
        width: '5px', height: '5px',
        borderRadius: '50%',
        background: 'var(--accent)',
      }} />
      <span style={{
        fontSize: '10px',
        fontWeight: 600,
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: 'var(--font-display)',
      }}>{children}</span>
    </div>
  )
}

const TIER_STYLES: Record<'S' | 'A' | 'B', { bg: string; fg: string }> = {
  S: { bg: '#FFF8E1', fg: '#B8860B' },
  A: { bg: 'var(--perf-up-soft)', fg: 'var(--perf-up)' },
  B: { bg: 'var(--surface)', fg: 'var(--ink-muted)' },
}

function formatEUR(v: number): string {
  if (v >= 1000) return `€${(v / 1000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}
