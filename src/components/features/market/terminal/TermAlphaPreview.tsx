'use client'

import { useRouter } from 'next/navigation'
import type { AlphaSignalPreview } from '@/lib/useMarketData'

/**
 * Teaser des Alpha Signals dans Terminal.
 * Si !isPro : 1 signal visible, 2 blurés avec CTA upgrade.
 * Si isPro : 3 signaux visibles + lien vers la page complète.
 */
export function TermAlphaPreview({
  signals, isPro,
}: {
  signals: AlphaSignalPreview[]
  isPro: boolean
}) {
  const router = useRouter()
  const hasData = signals.length > 0

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      <Header isPro={isPro} />

      {!hasData ? (
        <EmptyState />
      ) : (
        <div style={{ position: 'relative' }}>
          {signals.slice(0, 3).map((sig, i) => (
            <SignalRow
              key={sig.id}
              signal={sig}
              isFirst={i === 0}
              isLast={i === Math.min(2, signals.length - 1)}
              gated={!isPro && i > 0}
            />
          ))}

          {/* Pro upgrade overlay (only if not Pro and >1 signal) */}
          {!isPro && signals.length > 1 && (
            <ProUpgradeOverlay onClick={() => router.push('/pricing')} />
          )}
        </div>
      )}

      {/* Footer link */}
      <button
        onClick={() => router.push('/market/signals')}
        style={{
          width: '100%',
          padding: '10px',
          background: 'transparent',
          border: 'none',
          borderTop: '1px solid var(--border)',
          color: 'var(--ink-muted)',
          fontSize: '11px',
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'var(--font-display)',
          transition: 'all 0.1s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#FAFAFA'
          e.currentTarget.style.color = 'var(--ink)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--ink-muted)'
        }}
      >
        Voir tous les signaux →
      </button>
    </div>
  )
}

function Header({ isPro }: { isPro: boolean }) {
  return (
    <div style={{
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '10px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{
          fontSize: '11px',
          color: 'var(--premium)',
          fontWeight: 700,
        }}>◆</span>
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          color: 'var(--ink-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontFamily: 'var(--font-display)',
        }}>Alpha Signals</span>
      </div>

      {isPro ? (
        <span style={{
          padding: '2px 7px',
          background: 'var(--premium-soft)',
          color: 'var(--premium-dark)',
          fontSize: '9px',
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          borderRadius: '4px',
        }}>PRO</span>
      ) : (
        <span style={{
          fontSize: '9px',
          color: 'var(--ink-faint)',
          fontFamily: 'var(--font-display)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>3 signaux disponibles</span>
      )}
    </div>
  )
}

function SignalRow({
  signal, isFirst, isLast, gated,
}: {
  signal: AlphaSignalPreview
  isFirst: boolean
  isLast: boolean
  gated: boolean
}) {
  const upside = signal.target_price > signal.current_price
    ? ((signal.target_price - signal.current_price) / signal.current_price) * 100
    : 0

  const tierStyle = TIER_STYLES[signal.tier]

  return (
    <div style={{
      padding: '12px 16px',
      borderTop: isFirst ? '1px solid var(--border)' : '1px solid var(--border)',
      filter: gated ? 'blur(4px)' : 'none',
      pointerEvents: gated ? 'none' : 'auto',
      userSelect: gated ? 'none' : 'auto',
      transition: 'background 0.1s',
    }}
    onMouseEnter={e => {
      if (!gated) e.currentTarget.style.background = 'rgba(0,0,0,0.015)'
    }}
    onMouseLeave={e => {
      if (!gated) e.currentTarget.style.background = 'transparent'
    }}
    >
      {/* Top row : tier + name + confidence */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '6px',
      }}>
        <div style={{
          padding: '2px 6px',
          background: tierStyle.bg,
          color: tierStyle.color,
          fontSize: '10px',
          fontWeight: 700,
          borderRadius: '4px',
          fontFamily: 'var(--font-data, var(--font-display))',
          flexShrink: 0,
        }}>{signal.tier}</div>

        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--ink)',
          fontFamily: 'var(--font-display)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
          minWidth: 0,
        }}>{signal.card_name}</div>

        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-data, var(--font-display))',
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 500 }}>{signal.confidence}%</span>
          <span style={{ marginLeft: '3px', opacity: 0.7 }}>conf.</span>
        </div>
      </div>

      {/* Bottom row : prices + upside */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '14px',
        fontSize: '11px',
        fontFamily: 'var(--font-data, var(--font-display))',
        fontVariantNumeric: 'tabular-nums',
      }}>
        <span style={{ color: 'var(--ink-muted)' }}>
          Actuel: <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{formatEUR(signal.current_price)}</span>
        </span>
        <span style={{ color: 'var(--ink-faint)' }}>→</span>
        <span style={{ color: 'var(--ink-muted)' }}>
          Cible: <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{formatEUR(signal.target_price)}</span>
        </span>
        {upside > 0 && (
          <span style={{
            marginLeft: 'auto',
            padding: '2px 6px',
            background: 'var(--perf-up-soft)',
            color: 'var(--perf-up)',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
          }}>
            +{upside.toFixed(0)}% upside
          </span>
        )}
      </div>

      {/* Reason (truncated) */}
      {signal.reason && (
        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          marginTop: '6px',
          fontStyle: 'italic',
          fontFamily: 'var(--font-display)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{signal.reason}</div>
      )}
    </div>
  )
}

function ProUpgradeOverlay({ onClick }: { onClick: () => void }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: '0',
      left: '0',
      right: '0',
      height: '60%',
      background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.95) 60%, rgba(255,255,255,1) 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: '14px',
      pointerEvents: 'none',
    }}>
      <button
        onClick={onClick}
        style={{
          padding: '8px 16px',
          background: 'var(--ink)',
          color: 'var(--surface)',
          border: 'none',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.02em',
          pointerEvents: 'auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          transition: 'all 0.12s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--accent)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--ink)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        🔒 Débloquer avec Pro
      </button>
      <div style={{
        marginTop: '6px',
        fontSize: '10px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-display)',
        textAlign: 'center',
      }}>
        Accès illimité aux signaux Alpha
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      padding: '32px 20px',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '11px',
        color: 'var(--ink-faint)',
        fontFamily: 'var(--font-display)',
        marginBottom: '4px',
      }}>Pas de signaux actifs pour le moment</div>
      <div style={{
        fontSize: '10px',
        color: 'var(--ink-faint)',
        fontFamily: 'var(--font-display)',
      }}>Les signaux Alpha apparaîtront dès détection.</div>
    </div>
  )
}

const TIER_STYLES: Record<'S' | 'A' | 'B', { bg: string; color: string }> = {
  S: { bg: '#FFF8E1', color: '#B8860B' },         // gold
  A: { bg: 'var(--perf-up-soft)', color: 'var(--perf-up)' },
  B: { bg: 'var(--surface)',      color: 'var(--ink-muted)' },
}

function formatEUR(v: number): string {
  if (v >= 1000) return `€${(v / 1000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}
