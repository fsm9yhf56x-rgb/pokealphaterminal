'use client'

import { useEffect } from 'react'
import { getCardImageUrl } from '@/lib/images'
import type { SpreadSignal } from '@/lib/useSpreads'

/**
 * Drawer slide-in : détail complet du signal avec breakdown EU vs US,
 * confidence breakdown, et CTA "Voir sur eBay/Cardmarket".
 */
export function SPDrawer({
  signal, onClose,
}: {
  signal: SpreadSignal | null
  onClose: () => void
}) {
  const isOpen = signal !== null

  /* ESC to close */
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!signal) return null

  const imgUrl = signal.set_slug && signal.card_number
    ? getCardImageUrl({
        lang: 'EN',
        setId: signal.set_slug,
        localId: signal.card_number,
      })
    : ''

  const tierStyle = TIER_STYLES[signal.signal_tier]
  const profitEur = signal.gap_eur
  const margin = (signal.gap_eur / signal.price_eu) * 100

  // Search URLs (informational, no affiliate yet)
  const cardmarketSearchUrl = `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(signal.card_name)}`
  const ebaySearchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`${signal.card_name} ${signal.set_name || ''}`)}&_sop=12`

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.32)',
          backdropFilter: 'blur(2px)',
          zIndex: 100,
          animation: 'fadeIn 0.2s ease-out',
        }}
      />
      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
      `}</style>

      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: '100%',
        maxWidth: '460px',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.08)',
        zIndex: 101,
        overflowY: 'auto',
        animation: 'slideIn 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        fontFamily: 'var(--font-display)',
      }}>
        {/* Header sticky */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>◆</span>
            <span style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>Spread géographique</span>
          </div>
          <button
            onClick={onClose}
            title="Fermer (ESC)"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--ink-muted)',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >×</button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Tier banner */}
          <div style={{
            background: tierStyle.headerBg,
            border: `1px solid ${tierStyle.borderColor}`,
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
              }}>
                <div style={{
                  padding: '4px 10px',
                  background: tierStyle.tierBg,
                  color: tierStyle.tierFg,
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '5px',
                  fontFamily: 'var(--font-data, var(--font-display))',
                }}>{signal.signal_tier}</div>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: tierStyle.labelColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>{tierStyle.label}</span>
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--ink-muted)',
              }}>{signal.reason}</div>
            </div>

            <div style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--perf-up)',
              fontFamily: 'var(--font-data, var(--font-display))',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.5px',
            }}>+{signal.upside_pct.toFixed(0)}%</div>
          </div>

          {/* Image + name */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              width: '180px',
              aspectRatio: '0.7',
              margin: '0 auto 14px',
              background: '#F5F5F7',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
            }}>
              {imgUrl ? (
                <img
                  src={imgUrl}
                  alt={signal.card_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--ink-faint)', fontSize: '36px',
                }}>🃏</div>
              )}
            </div>

            <h2 style={{
              fontSize: '17px',
              fontWeight: 600,
              color: 'var(--ink)',
              letterSpacing: '-0.3px',
              margin: '0 0 4px',
              textAlign: 'center',
            }}>{signal.card_name}</h2>
            <div style={{
              fontSize: '11px',
              color: 'var(--ink-muted)',
              textAlign: 'center',
            }}>
              {[signal.set_name, signal.variant && signal.variant !== 'raw' ? signal.variant : null]
                .filter(Boolean).join(' · ') || '—'}
            </div>
          </div>

          {/* Arbitrage breakdown */}
          <Section title="L'opportunité d'arbitrage">
            <div style={{
              background: '#FAFAFA',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '14px',
            }}>
              {/* Buy → Sell flow */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '14px',
              }}>
                <PriceBlock
                  label="Acheter sur"
                  source="Cardmarket EU"
                  price={signal.price_eu}
                  color="var(--ink)"
                />
                <ArrowFlow />
                <PriceBlock
                  label="Revendre sur"
                  source={`eBay US · ${signal.ebay_sales} ventes`}
                  price={signal.price_us}
                  color="var(--perf-up)"
                  highlighted
                />
              </div>

              {/* Margin breakdown */}
              <div style={{
                paddingTop: '12px',
                borderTop: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}>
                <Stat label="Profit brut" value={`+${formatEUR(profitEur)}`} color="var(--perf-up)" />
                <Stat label="Marge potentielle" value={`+${margin.toFixed(0)}%`} color="var(--perf-up)" />
              </div>
            </div>
          </Section>

          {/* Confidence breakdown */}
          <Section title="Indice de confiance">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 14px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
            }}>
              <ConfidenceRing pct={signal.confidence} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  marginBottom: '4px',
                }}>{signal.confidence}/100</div>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--ink-muted)',
                  lineHeight: 1.4,
                }}>
                  Calculé sur volume eBay ({signal.ebay_sales} ventes), liquidité multi-sources, magnitude du gap, et prix absolu.
                </div>
              </div>
            </div>
          </Section>

          {/* CTAs */}
          <Section title="Vérifier les sources">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <ExternalLink
                label="Voir sur Cardmarket EU"
                hint="Source d'achat"
                url={cardmarketSearchUrl}
                color="#B95A0B"
              />
              <ExternalLink
                label="Voir sur eBay US"
                hint={`${signal.ebay_sales} ventes récentes · revente`}
                url={ebaySearchUrl}
                color="#1A56DB"
              />
            </div>
          </Section>

          {/* Disclaimer */}
          <div style={{
            marginTop: '20px',
            padding: '10px 12px',
            background: '#FAFAFA',
            borderRadius: '8px',
            fontSize: '10px',
            color: 'var(--ink-muted)',
            lineHeight: 1.4,
            fontStyle: 'italic',
          }}>
            ⚠ Ces signaux sont indicatifs. Vérifiez l'état exact de la carte, les variantes (1ère édition vs reprint), et les frais de port avant tout achat. Kodo Cards n'est pas responsable des décisions d'investissement.
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Sub-components ──────────────────────── */

function PriceBlock({
  label, source, price, color, highlighted,
}: {
  label: string
  source: string
  price: number
  color: string
  highlighted?: boolean
}) {
  return (
    <div style={{
      padding: '10px',
      background: highlighted ? 'var(--perf-up-soft)' : 'var(--surface)',
      border: `1px solid ${highlighted ? 'var(--green-border)' : 'var(--border)'}`,
      borderRadius: '8px',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '9px',
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '4px',
        fontWeight: 600,
      }}>{label}</div>
      <div style={{
        fontSize: '17px',
        fontWeight: 700,
        color,
        fontFamily: 'var(--font-data, var(--font-display))',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.3px',
        marginBottom: '2px',
      }}>{formatEUR(price)}</div>
      <div style={{
        fontSize: '9px',
        color: 'var(--ink-muted)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{source}</div>
    </div>
  )
}

function ArrowFlow() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="10" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <path d="M7 11h8M11 7l4 4-4 4" stroke="var(--perf-up)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function Stat({
  label, value, color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div>
      <div style={{
        fontSize: '9px',
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '4px',
        fontWeight: 600,
      }}>{label}</div>
      <div style={{
        fontSize: '15px',
        fontWeight: 700,
        color,
        fontFamily: 'var(--font-data, var(--font-display))',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.3px',
      }}>{value}</div>
    </div>
  )
}

function ConfidenceRing({ pct, size }: { pct: number; size: number }) {
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference

  const color = pct >= 75 ? 'var(--perf-up)'
              : pct >= 50 ? 'var(--premium)'
              : 'var(--ink-muted)'

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 700,
        color,
        fontFamily: 'var(--font-data, var(--font-display))',
      }}>{pct}</div>
    </div>
  )
}

function ExternalLink({
  label, hint, url, color,
}: {
  label: string
  hint: string
  url: string
  color: string
}) {
  return (
    <button
      onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        cursor: 'pointer',
        color: 'var(--ink)',
        textAlign: 'left',
        fontFamily: 'var(--font-display)',
        transition: 'all 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.background = '#FAFAFA'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.background = 'var(--surface)'
      }}
    >
      <div>
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--ink)',
          marginBottom: '2px',
        }}>{label}</div>
        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
        }}>{hint}</div>
      </div>
      <span style={{ color, fontSize: '14px' }}>↗</span>
    </button>
  )
}

function Section({
  title, children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        fontSize: '9px',
        fontWeight: 600,
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '10px',
      }}>{title}</div>
      {children}
    </div>
  )
}

/* ── Tier styles (drawer version) ────────── */

const TIER_STYLES: Record<'S' | 'A' | 'B', {
  headerBg: string
  borderColor: string
  tierBg: string
  tierFg: string
  labelColor: string
  label: string
}> = {
  S: {
    headerBg: 'linear-gradient(135deg, #FFF8E1, #FFFCF0)',
    borderColor: '#F5D78E',
    tierBg: '#B8860B',
    tierFg: '#FFFFFF',
    labelColor: '#8A6500',
    label: 'Signal fort',
  },
  A: {
    headerBg: 'linear-gradient(135deg, var(--perf-up-soft), #F8FFFC)',
    borderColor: 'var(--green-border)',
    tierBg: 'var(--perf-up)',
    tierFg: '#FFFFFF',
    labelColor: '#1D9E75',
    label: 'Opportunité',
  },
  B: {
    headerBg: 'var(--surface)',
    borderColor: 'var(--border)',
    tierBg: 'var(--ink-muted)',
    tierFg: '#FFFFFF',
    labelColor: 'var(--ink-muted)',
    label: 'À surveiller',
  },
}

function formatEUR(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
}
