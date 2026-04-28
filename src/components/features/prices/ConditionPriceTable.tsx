'use client'

/**
 * ConditionPriceTable — displays per-condition price breakdown.
 *
 * Reads from useCardConditions hook (which calls /api/prices/conditions).
 * Falls back gracefully when no condition data is available.
 *
 * Design: Snow+ system, monospace prices, subtle row separators,
 * delta vs NM in red/green for instant readability.
 */

import { useCardConditions, CONDITION_ORDER, CONDITION_SHORT, CONDITION_LABELS } from './hooks/useCardConditions'
import type { CardCondition, ConditionBreakdown } from './hooks/useCardConditions'

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
}

interface ConditionPriceTableProps {
  /** PokeTrace card UUID (direct lookup) */
  cardRef?: string | null | undefined
  /** Alternative: set_slug + card_number (resolved server-side) */
  setSlug?: string | null | undefined
  cardNumber?: string | null | undefined
  /** Optional: hide entirely when no data (default: shows skeleton message) */
  hideWhenEmpty?: boolean
  /** USD to EUR conversion rate (default 0.92, applies only to USD prices) */
  usdToEur?: number
}

const USD_EUR_DEFAULT = 0.92

function fmtPrice(value: number | null | undefined, currency: string, usdToEur: number): string {
  if (value == null) return '—'
  const eurValue = currency === 'USD' ? value * usdToEur : value
  if (eurValue >= 100) return `${Math.round(eurValue)} €`
  return `${eurValue.toFixed(2)} €`
}

function getBestNMPrice(breakdown: ConditionBreakdown): number | null {
  const ebay = breakdown.ebay.NEAR_MINT?.price_avg ?? null
  const tcg = breakdown.tcgplayer.NEAR_MINT?.price_avg ?? null
  if (ebay == null && tcg == null) return null
  if (ebay == null) return tcg
  if (tcg == null) return ebay
  return Math.max(ebay, tcg)
}

function fmtDelta(current: number | null, base: number | null): { text: string; color: string } {
  if (current == null || base == null || base === 0) return { text: '—', color: SNOW.mutedLight }
  const pct = ((current - base) / base) * 100
  if (Math.abs(pct) < 1) return { text: '—', color: SNOW.mutedLight }
  const text = `${pct > 0 ? '+' : ''}${Math.round(pct)}%`
  return { text, color: pct < 0 ? SNOW.red : SNOW.green }
}

export function ConditionPriceTable({ cardRef, setSlug, cardNumber, hideWhenEmpty = false, usdToEur = USD_EUR_DEFAULT }: ConditionPriceTableProps) {
  const params = cardRef
    ? { cardRef }
    : (setSlug && cardNumber ? { setSlug, cardNumber } : null)
  const { conditions, loading, hasData } = useCardConditions(params as any)

  if (loading) {
    return (
      <div style={{ padding: 16, fontSize: 13, color: SNOW.muted, fontFamily: 'var(--font-dm, sans-serif)' }}>
        Chargement des prix par condition…
      </div>
    )
  }

  if (!hasData || !conditions) {
    if (hideWhenEmpty) return null
    return (
      <div style={{
        padding: 16,
        fontSize: 12,
        color: SNOW.mutedLight,
        background: SNOW.surface,
        border: `0.5px solid ${SNOW.borderSoft}`,
        borderRadius: 8,
        textAlign: 'center',
        fontFamily: 'var(--font-dm, sans-serif)',
      }}>
        Pas encore de données par condition pour cette carte.
        <br />
        <span style={{ fontSize: 11, color: SNOW.mutedLight }}>
          (Le pipeline PokeTrace n&apos;a pas encore couvert cette carte. Réessayez après le prochain cron.)
        </span>
      </div>
    )
  }

  const nmReference = getBestNMPrice(conditions)

  return (
    <div style={{
      background: SNOW.bg,
      border: `0.5px solid ${SNOW.borderSoft}`,
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: `0.5px solid ${SNOW.borderSoft}`,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        color: SNOW.muted,
        textTransform: 'uppercase',
        fontFamily: 'var(--font-sora, sans-serif)',
      }}>
        Prix par condition
      </div>

      {/* Table */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--font-dm, sans-serif)',
        fontSize: 13,
      }}>
        <thead>
          <tr style={{ background: SNOW.surface }}>
            <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: SNOW.muted, fontSize: 11, letterSpacing: '0.04em' }}>État</th>
            <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, color: SNOW.muted, fontSize: 11, letterSpacing: '0.04em' }}>eBay</th>
            <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, color: SNOW.muted, fontSize: 11, letterSpacing: '0.04em' }}>TCGplayer</th>
            <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, color: SNOW.muted, fontSize: 11, letterSpacing: '0.04em' }}>Δ NM</th>
          </tr>
        </thead>
        <tbody>
          {CONDITION_ORDER.map((cond, idx) => {
            const ebayData = conditions.ebay[cond]
            const tcgData = conditions.tcgplayer[cond]
            const ebayInEur = ebayData ? (ebayData.currency === 'USD' ? ebayData.price_avg! * usdToEur : ebayData.price_avg!) : null
            const tcgInEur = tcgData ? (tcgData.currency === 'USD' ? tcgData.price_avg! * usdToEur : tcgData.price_avg!) : null
            const bestForRow = ebayInEur != null && tcgInEur != null ? Math.max(ebayInEur, tcgInEur) : (ebayInEur ?? tcgInEur)
            const nmInEur = nmReference != null ? nmReference * usdToEur : null
            const delta = fmtDelta(bestForRow, nmInEur)

            return (
              <tr key={cond} style={{
                borderTop: idx > 0 ? `0.5px solid ${SNOW.borderSoft}` : 'none',
              }}>
                <td style={{ padding: '10px 14px', color: SNOW.ink }}>
                  <span style={{ fontWeight: 600 }}>{CONDITION_SHORT[cond]}</span>
                  <span style={{ marginLeft: 6, color: SNOW.mutedLight, fontSize: 11 }}>
                    {CONDITION_LABELS[cond]}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', color: ebayData ? SNOW.ink : SNOW.mutedLight }}>
                  {ebayData ? fmtPrice(ebayData.price_avg, ebayData.currency, usdToEur) : '—'}
                  {ebayData?.nb_sales ? <span style={{ marginLeft: 4, fontSize: 10, color: SNOW.mutedLight }}>·{ebayData.nb_sales}</span> : null}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', color: tcgData ? SNOW.ink : SNOW.mutedLight }}>
                  {tcgData ? fmtPrice(tcgData.price_avg, tcgData.currency, usdToEur) : '—'}
                  {tcgData?.nb_sales ? <span style={{ marginLeft: 4, fontSize: 10, color: SNOW.mutedLight }}>·{tcgData.nb_sales}</span> : null}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: delta.color }}>
                  {delta.text}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Footer caption */}
      <div style={{
        padding: '8px 14px',
        borderTop: `0.5px solid ${SNOW.borderSoft}`,
        fontSize: 10,
        color: SNOW.mutedLight,
        background: SNOW.surface,
        fontFamily: 'var(--font-mono, monospace)',
      }}>
        Δ NM = écart vs Near Mint (meilleur prix). Volume affiché en petit.
      </div>
    </div>
  )
}
