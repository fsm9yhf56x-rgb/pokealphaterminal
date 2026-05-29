'use client'

/**
 * GradedPriceTable — affiche les prix de ventes confirmees sur cartes gradees.
 * Source: useCardGradedPrices -> /api/prices/graded -> graded_prices_ppt (real eBay sold).
 *
 * Design Snow+ :
 *  - Pills slab colores (PSA bleu / CGC rose / BGS vert / SGC violet)
 *  - Badge confidence (high vert / medium ambre / low gris) a cote du prix
 *  - Badge count "X ventes"
 *  - Tri par prix decroissant (PSA10 en haut, plus naturel a lire)
 *  - Filtre noise : masque grades < 2 ventes ET confidence=low
 */

import { useCardGradedPrices, formatGradeLabel, getSlabCompany } from './hooks/useCardGradedPrices'

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
  amber: '#B8860B',
  psa: '#F0F4FA',
  cgc: '#FAF0F4',
  bgs: '#F4FAF0',
  sgc: '#F4F0FA',
  pca: '#FAF4F0',
  ccc: '#F0FAFA',
  tag: '#F5F5F7',
}

const SLAB_BG: Record<string, string> = {
  PSA: SNOW.psa, CGC: SNOW.cgc, BGS: SNOW.bgs,
  SGC: SNOW.sgc, PCA: SNOW.pca, CCC: SNOW.ccc, TAG: SNOW.tag,
}

const CONFIDENCE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  high:   { bg: '#E8F5E9', color: '#1B5E20', label: 'confiance haute' },
  medium: { bg: '#FFF8E1', color: '#7C5800', label: 'confiance moy.' },
  low:    { bg: '#F5F5F7', color: '#6E6E73', label: 'confiance basse' },
}

interface GradedPriceData {
  price_avg: number
  price_low: number | null
  price_high: number | null
  currency: string
  source: string
  fetched_at: string
  nb_sales: number | null
  confidence?: string | null
  market_trend?: string | null
  median?: number | null
}

interface GradedPriceTableProps {
  tcgCardId?: string | null
  setSlug?: string | null
  cardNumber?: string | null
  lang?: 'EN' | 'FR' | 'JP' | string | null
  hideWhenEmpty?: boolean
  usdToEur?: number
}

function fmtPrice(value: number | null | undefined): string {
  if (value == null) return '—'
  if (value >= 1000) return `${Math.round(value).toLocaleString('fr-FR')} €`
  if (value >= 100) return `${Math.round(value)} €`
  return `${value.toFixed(2)} €`
}

function shouldShow(p: GradedPriceData): boolean {
  const lowConfidence = p.confidence === 'low'
  const fewSales = (p.nb_sales ?? 0) < 2
  return !(lowConfidence && fewSales)
}

export function GradedPriceTable({
  tcgCardId, setSlug, cardNumber, lang,
  hideWhenEmpty = false,
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
        Aucune vente gradée confirmée pour cette carte
      </div>
    )
  }

  const sortedVariants = Object.entries(prices as Record<string, GradedPriceData>)
    .filter(([, p]) => shouldShow(p))
    .sort(([, a], [, b]) => (b.price_avg || 0) - (a.price_avg || 0))
    .map(([variant]) => variant)

  if (sortedVariants.length === 0) {
    if (hideWhenEmpty) return null
    return (
      <div style={{
        padding: 12, fontSize: 12, color: SNOW.mutedLight,
        fontFamily: 'var(--font-dm, sans-serif)', textAlign: 'center',
        background: SNOW.surface, borderRadius: 10,
      }}>
        Données insuffisantes pour cette carte
      </div>
    )
  }

  return (
    <div style={{
      background: SNOW.bg,
      border: `1px solid ${SNOW.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      fontFamily: 'var(--font-dm, sans-serif)',
    }}>
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
          Ventes gradées · eBay sold
        </span>
        <span style={{
          fontSize: 10,
          color: SNOW.mutedLight,
          fontFamily: 'var(--font-data, monospace)',
        }}>
          {sortedVariants.length} grade{sortedVariants.length > 1 ? 's' : ''}
        </span>
      </div>

      <div style={{
        padding: '8px 14px',
        background: '#F4F8FA',
        borderBottom: `1px solid ${SNOW.borderSoft}`,
        fontSize: 10,
        color: SNOW.muted,
        lineHeight: 1.4,
      }}>
        Prix observés sur ventes confirmées eBay (90 derniers jours). Conversion USD → EUR.
      </div>

      <div>
        {sortedVariants.map((variant, i) => {
          const p = prices[variant] as GradedPriceData
          const slab = getSlabCompany(variant)
          const confKey = (p.confidence || 'low').toLowerCase()
          const conf = CONFIDENCE_STYLE[confKey] || CONFIDENCE_STYLE.low

          return (
            <div key={variant} style={{
              padding: '11px 14px',
              display: 'grid',
              gridTemplateColumns: '76px 1fr auto',
              gap: 10,
              alignItems: 'center',
              borderBottom: i < sortedVariants.length - 1 ? `1px solid ${SNOW.borderSoft}` : 'none',
            }}>
              <span style={{
                display: 'inline-block',
                padding: '4px 8px',
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: SNOW.muted }}>
                  {p.nb_sales ? `${p.nb_sales} vente${p.nb_sales > 1 ? 's' : ''}` : ''}
                </span>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 6px',
                  background: conf.bg,
                  color: conf.color,
                  fontSize: 9,
                  fontWeight: 600,
                  borderRadius: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {conf.label}
                </span>
              </div>

              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: SNOW.ink,
                fontFamily: 'var(--font-data, monospace)',
                textAlign: 'right',
              }}>
                {fmtPrice(p.price_avg)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
