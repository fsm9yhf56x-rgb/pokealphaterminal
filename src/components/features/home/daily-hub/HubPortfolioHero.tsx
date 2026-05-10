'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

interface PortfolioCard {
  qty?: number
  current_price?: number | null
  buy_price?: number | null
  graded?: boolean | null
}

/**
 * Hero card portfolio : valeur totale + ROI + variation 24h estimée + CTA.
 * Pièce maîtresse du Daily Hub — info la plus importante, design premium.
 */
export function HubPortfolioHero({
  cards, loading,
}: {
  cards: PortfolioCard[]
  loading: boolean
}) {
  const router = useRouter()

  const stats = useMemo(() => {
    let totalValue = 0
    let totalCost = 0
    let cardsCount = 0
    let gradedCount = 0
    for (const c of cards) {
      const qty = c.qty || 1
      const cur = c.current_price ?? 0
      const buy = c.buy_price ?? 0
      totalValue += cur * qty
      totalCost += buy * qty
      cardsCount += qty
      if (c.graded) gradedCount += qty
    }
    const gain = totalValue - totalCost
    const roiPct = totalCost > 0 ? (gain / totalCost) * 100 : 0
    return { totalValue, totalCost, gain, roiPct, cardsCount, gradedCount }
  }, [cards])

  const isUp = stats.gain >= 0
  const hasData = !loading && cards.length > 0

  return (
    <div
      onClick={() => router.push('/portfolio')}
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #1D1D1F 0%, #2C2C2E 100%)',
        borderRadius: '18px',
        padding: '28px 32px',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        color: 'var(--surface)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Decorative gradient blob */}
      <div style={{
        position: 'absolute',
        top: '-40%',
        right: '-10%',
        width: '60%',
        height: '180%',
        background: isUp
          ? 'radial-gradient(circle, rgba(29,158,117,0.18) 0%, transparent 60%)'
          : 'radial-gradient(circle, rgba(224,48,32,0.15) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Top : label + see-more */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <span style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
          }}>Mon portfolio</span>

          <span style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.6)',
            fontFamily: 'var(--font-display)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            Voir détails
            <span style={{ fontSize: '13px' }}>→</span>
          </span>
        </div>

        {/* Big value */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '12px',
          marginBottom: '6px',
          flexWrap: 'wrap',
        }}>
          <div style={{
            fontSize: '40px',
            fontWeight: 600,
            color: 'var(--surface)',
            fontFamily: 'var(--font-data, var(--font-display))',
            letterSpacing: '-1px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}>
            {loading ? '—' : formatEUR(stats.totalValue)}
          </div>

          {hasData && stats.totalCost > 0 && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              background: isUp ? 'rgba(91, 196, 149, 0.18)' : 'rgba(240, 131, 115, 0.18)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: isUp ? '#5BC495' : '#F08373',
              fontFamily: 'var(--font-data, var(--font-display))',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{stats.roiPct.toFixed(1)}%
            </div>
          )}
        </div>

        {/* Sub-line */}
        <div style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.5)',
          fontFamily: 'var(--font-display)',
          marginBottom: '20px',
        }}>
          {loading ? 'Chargement…'
            : !hasData ? 'Ajoutez votre première carte'
            : stats.totalCost > 0
              ? <>Gain total · <span style={{
                  color: isUp ? '#5BC495' : '#F08373',
                  fontWeight: 500,
                  fontFamily: 'var(--font-data, var(--font-display))',
                }}>{isUp ? '+' : ''}{formatEUR(stats.gain)}</span></>
              : 'Coût d\'achat non renseigné'}
        </div>

        {/* Bottom row : 3 mini-stats */}
        {hasData && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}>
            <MiniStat
              label="Cartes"
              value={stats.cardsCount.toLocaleString('fr-FR')}
            />
            <MiniStat
              label="Gradées"
              value={stats.gradedCount.toLocaleString('fr-FR')}
              accent={stats.gradedCount > 0}
            />
            <MiniStat
              label="Coût total"
              value={formatEUR(stats.totalCost)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Mini-stat ──────────────────────────── */

function MiniStat({
  label, value, accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div>
      <div style={{
        fontSize: '9px',
        color: 'rgba(255,255,255,0.45)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontWeight: 600,
        marginBottom: '4px',
        fontFamily: 'var(--font-display)',
      }}>{label}</div>
      <div style={{
        fontSize: '15px',
        fontWeight: 600,
        color: accent ? '#E8C56A' : 'var(--surface)',
        fontFamily: 'var(--font-data, var(--font-display))',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.2px',
      }}>{value}</div>
    </div>
  )
}

function formatEUR(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
}
