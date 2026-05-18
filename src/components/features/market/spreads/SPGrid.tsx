'use client'

import { getCardImageUrl } from '@/lib/images'
import type { SpreadSignal } from '@/lib/useSpreads'

/**
 * Grid de signaux : cartes avec image + tier badge + upside + confidence + reasoning.
 * Pro gate : Free → 1ère carte visible, 2-N blurées avec overlay.
 */
export function SPGrid({
  signals, isPro, onSelect,
}: {
  signals: SpreadSignal[]
  isPro: boolean
  onSelect: (signal: SpreadSignal) => void
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '14px',
    }}>
      {signals.map((sig, i) => (
        <SignalCard
          key={sig.card_ref}
          signal={sig}
          gated={!isPro && i > 0}
          onClick={() => onSelect(sig)}
        />
      ))}
    </div>
  )
}

function SignalCard({
  signal, gated, onClick,
}: {
  signal: SpreadSignal
  gated: boolean
  onClick: () => void
}) {
  const tierStyle = TIER_STYLES[signal.signal_tier]
  const imgUrl = signal.set_slug && signal.card_number
    ? getCardImageUrl({
        lang: 'EN',  // Most signals are EN cards (CM EU vs eBay US)
        setId: signal.set_slug,
        localId: signal.card_number,
      })
    : ''

  return (
    <div
      onClick={gated ? undefined : onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        overflow: 'hidden',
        cursor: gated ? 'default' : 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        filter: gated ? 'blur(5px)' : 'none',
        pointerEvents: gated ? 'none' : 'auto',
        userSelect: gated ? 'none' : 'auto',
      }}
      onMouseEnter={(e) => {
        if (gated) return
        e.currentTarget.style.borderColor = 'var(--ink)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)'
      }}
      onMouseLeave={(e) => {
        if (gated) return
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Top : tier ribbon + upside */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        background: tierStyle.headerBg,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            padding: '3px 8px',
            background: tierStyle.tierBg,
            color: tierStyle.tierFg,
            fontSize: '11px',
            fontWeight: 700,
            borderRadius: '4px',
            fontFamily: 'var(--font-data, var(--font-display))',
            letterSpacing: '0.05em',
          }}>{signal.signal_tier}</div>
          <span style={{
            fontSize: '9px',
            color: tierStyle.labelColor,
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
          }}>{tierStyle.label}</span>
        </div>

        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--perf-up)',
          fontFamily: 'var(--font-data, var(--font-display))',
          fontVariantNumeric: 'tabular-nums',
        }}>
          +{signal.upside_pct.toFixed(0)}%
        </div>
      </div>

      {/* Body : image + name + meta */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '70px 1fr',
        gap: '12px',
        padding: '14px',
      }}>
        {/* Image */}
        <div style={{
          aspectRatio: '0.7',
          background: '#F5F5F7',
          borderRadius: '6px',
          overflow: 'hidden',
        }}>
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={signal.card_name}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink-faint)', fontSize: '20px',
            }}>🃏</div>
          )}
        </div>

        {/* Name + meta + prices */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--ink)',
            fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{signal.card_name}</div>

          <div style={{
            fontSize: '10px',
            color: 'var(--ink-muted)',
            fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: '4px',
          }}>{signal.set_name || signal.set_slug || '—'}</div>

          {/* Prices : EU → US */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '6px',
            fontFamily: 'var(--font-data, var(--font-display))',
            fontVariantNumeric: 'tabular-nums',
          }}>
            <div>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--ink)',
              }}>{formatEUR(signal.price_eu)}</div>
              <div style={{
                fontSize: '8px',
                color: 'var(--ink-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontFamily: 'var(--font-display)',
              }}>EU</div>
            </div>

            <div style={{
              color: 'var(--ink-faint)',
              fontSize: '14px',
            }}>→</div>

            <div>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--perf-up)',
              }}>{formatEUR(signal.price_us)}</div>
              <div style={{
                fontSize: '8px',
                color: 'var(--ink-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontFamily: 'var(--font-display)',
              }}>US</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer : confidence + sales */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderTop: '1px solid var(--border)',
        background: '#FAFAFA',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <ConfidenceRing pct={signal.confidence} size={28} />
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--ink)',
              fontFamily: 'var(--font-display)',
            }}>Confidence</div>
            <div style={{
              fontSize: '9px',
              color: 'var(--ink-muted)',
              fontFamily: 'var(--font-display)',
            }}>{signal.ebay_sales} ventes US</div>
          </div>
        </div>

        {signal.has_graded && (
          <span style={{
            padding: '2px 6px',
            background: 'var(--premium)',
            color: 'var(--surface)',
            fontSize: '8px',
            fontWeight: 700,
            borderRadius: '4px',
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>GRADED</span>
        )}
      </div>
    </div>
  )
}

/* ── Confidence ring ──────────────────────── */

function ConfidenceRing({ pct, size }: { pct: number; size: number }) {
  const stroke = 3
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference

  const color = pct >= 75 ? 'var(--perf-up)'
              : pct >= 50 ? 'var(--premium)'
              : 'var(--ink-muted)'

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
          style={{ transition: 'stroke-dashoffset 0.6s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '9px',
        fontWeight: 700,
        color,
        fontFamily: 'var(--font-data, var(--font-display))',
      }}>{pct}</div>
    </div>
  )
}

/* ── Tier styles ─────────────────────────── */

const TIER_STYLES: Record<'S' | 'A' | 'B', {
  headerBg: string
  tierBg: string
  tierFg: string
  labelColor: string
  label: string
}> = {
  S: {
    headerBg: 'linear-gradient(135deg, #FFF8E1, #FFFCF0)',
    tierBg: '#B8860B',
    tierFg: '#FFFFFF',
    labelColor: '#8A6500',
    label: 'Signal fort',
  },
  A: {
    headerBg: 'linear-gradient(135deg, var(--perf-up-soft), #F8FFFC)',
    tierBg: 'var(--perf-up)',
    tierFg: '#FFFFFF',
    labelColor: '#1D9E75',
    label: 'Opportunité',
  },
  B: {
    headerBg: 'var(--surface)',
    tierBg: 'var(--ink-muted)',
    tierFg: '#FFFFFF',
    labelColor: 'var(--ink-muted)',
    label: 'À surveiller',
  },
}

function formatEUR(v: number): string {
  if (v >= 1000) return `€${Number(v / 1000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}
