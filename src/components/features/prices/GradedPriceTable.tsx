'use client'

/**
 * GradedPriceTable — displays graded slab prices (PSA, CGC, BGS, SGC, PCA, CCC).
 *
 * Reads from useCardGradedPrices hook (calls /api/prices/graded).
 * Falls back gracefully when no graded data is available.
 *
 * Design: Snow+ system, sibling to ConditionPriceTable.
 * Shows grade column, slab pill, price, sales count, freshness.
 */

import { useCardGradedPrices, GRADE_VARIANT_ORDER, formatGradeLabel, getSlabCompany } from './hooks/useCardGradedPrices'

const SNOW = {
  bg: '#FFFFFF',
  surface: '#F5F5F7',
  border: '#E5E5EA',
  borderSoft: '#EBEBEF',
  ink: '#1D1D1F',
  muted: '#6E6E73',
  mutedLight: '#86868B',
  red: '#E03020',
  green: '#26A65B',
  // Slab company colors (subtle backgrounds)
  psa: '#F0F4FA',
  cgc: '#FAF0F4',
  bgs: '#F4FAF0',
  sgc: '#F4F0FA',
  pca: '#FAF4F0',
  ccc: '#F0FAFA',
}

const SLAB_BG: Record<string, string> = {
  PSA: SNOW.psa, CGC: SNOW.cgc, BGS: SNOW.bgs,
  SGC: SNOW.sgc, PCA: SNOW.pca, CCC: SNOW.ccc,
}

interface GradedPriceTableProps {
  tcgCardId?: string | null
  setSlug?: string | null
  cardNumber?: string | null
  lang?: 'EN' | 'FR' | 'JP' | string | null
  hideWhenEmpty?: boolean
  usdToEur?: number
}

const USD_EUR_DEFAULT = 0.92

function fmtPrice(value: number | null | undefined, currency: string, usdToEur: number): string {
  if (value == null) return '—'
  const eur = currency === 'USD' ? value * usdToEur : value
  if (eur >= 1000) return `${Math.round(eur).toLocaleString('fr-FR')} €`
  if (eur >= 100) return `${Math.round(eur)} €`
  return `${eur.toFixed(2)} €`
}

function fmtFreshness(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'à l’instant'
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days}j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export function GradedPriceTable({
  tcgCardId, setSlug, cardNumber, lang,
  hideWhenEmpty = false, usdToEur = USD_EUR_DEFAULT,
}: GradedPriceTableProps) {
  const params = tcgCardId
    ? { tcgCardId, lang }
    : (setSlug && cardNumber ? { setSlug, cardNumber, lang } : null)
  const { prices, loading, hasData } = useCardGradedPrices(params)

  if (loading) {
    return (
      <div style={{ padding: 16, fontSize: 13, color: SNOW.muted, fontFamily: 'var(--font-dm, sans-serif)' }}>
        Chargement des prix gradés…
      </div>
    )
  }

  if (!hasData) {
    if (hideWhenEmpty) return null
    return (
      <div style={{
        padding: 12, fontSize: 12, color: SNOW.mutedLight,
        fontFamily: 'var(--font-dm, sans-serif)', textAlign: 'center',
        background: SNOW.surface, borderRadius: 10,
      }}>
        Aucun prix gradé disponible
      </div>
    )
  }

  // Sort variants by GRADE_VARIANT_ORDER (psa_10 first, then desc), fallback alphabetical
  const orderIdx = new Map(GRADE_VARIANT_ORDER.map((v, i) => [v, i]))
  const sortedVariants = Object.keys(prices).sort((a, b) => {
    const ia = orderIdx.get(a as any) ?? 999
    const ib = orderIdx.get(b as any) ?? 999
    if (ia !== ib) return ia - ib
    return a.localeCompare(b)
  })

  return (
    <div style={{
      background: SNOW.bg,
      border: `1px solid ${SNOW.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      fontFamily: 'var(--font-dm, sans-serif)',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        background: SNOW.surface,
        borderBottom: `1px solid ${SNOW.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: SNOW.muted,
          fontFamily: 'var(--font-display, sans-serif)',
        }}>
          Listings actifs · eBay
        </span>
        <span style={{
          fontSize: 10,
          color: SNOW.mutedLight,
          fontFamily: 'var(--font-data, monospace)',
        }}>
          {sortedVariants.length} grade{sortedVariants.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Disclaimer */}
      <div style={{
        padding: '8px 14px',
        background: '#FFF8E5',
        borderBottom: `1px solid ${SNOW.borderSoft}`,
        fontSize: 10,
        color: '#8A6500',
        fontFamily: 'var(--font-dm, sans-serif)',
        lineHeight: 1.4,
      }}>
        Prix demandés (asks), pas des prix de vente conclus. Indicatif uniquement.
      </div>

      {/* Rows */}
      <div>
        {sortedVariants.map((variant, i) => {
          const p = prices[variant]
          const slab = getSlabCompany(variant)
          return (
            <div key={variant} style={{
              padding: '10px 14px',
              display: 'grid',
              gridTemplateColumns: '90px 1fr auto',
              gap: 10,
              alignItems: 'center',
              borderBottom: i < sortedVariants.length - 1 ? `1px solid ${SNOW.borderSoft}` : 'none',
            }}>
              <span style={{
                display: 'inline-block',
                padding: '3px 8px',
                background: SLAB_BG[slab] || SNOW.surface,
                color: SNOW.ink,
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                textAlign: 'center',
                fontFamily: 'var(--font-data, monospace)',
              }}>
                {formatGradeLabel(variant)}
              </span>
              <span style={{
                fontSize: 11,
                color: SNOW.mutedLight,
                fontFamily: 'var(--font-dm, sans-serif)',
              }}>
                {p.nb_sales ? `${p.nb_sales} vente${p.nb_sales > 1 ? 's' : ''}` : ''}
                {' · '}
                {fmtFreshness(p.fetched_at)}
              </span>
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: SNOW.ink,
                fontFamily: 'var(--font-data, monospace)',
                textAlign: 'right',
              }}>
                {fmtPrice(p.price_avg, p.currency, usdToEur)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
