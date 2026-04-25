'use client'

import { useState } from 'react'
import { usePsaPop } from './hooks/usePsaPop'
import { toCanonicalRef } from '@/lib/psa/canonical'
import type { PsaPopVariant } from '@/lib/psa/types'

const SNOW = {
  ink: '#1D1D1F',
  surface: '#F5F5F7',
  border: '#E5E5EA',
  borderDark: '#C7C7CC',
  muted: '#6E6E73',
  mutedSoft: '#86868B',
}
const ACCENT = '#E03020'
const PERF_UP = '#1F7A48'   // green for "premium" tiers
const TIER_BG: Record<string, { bg: string; ink: string }> = {
  very_rare: { bg: '#FFEFEC', ink: ACCENT },
  rare:      { bg: '#FFF6E0', ink: '#9A6B00' },
  uncommon:  { bg: '#EAF6F0', ink: PERF_UP },
  common:    { bg: SNOW.surface, ink: SNOW.muted },
}

interface Props {
  /** card.id from tcg_cards (e.g. "en-base1-4" or "fr-base1-4") */
  cardId: string
  /** when true, hide the whole block if no PSA data exists */
  hideWhenEmpty?: boolean
}

export function PsaPopBlock({ cardId, hideWhenEmpty = false }: Props) {
  const canonicalRef = toCanonicalRef(cardId)
  const { data, isLoading, error } = usePsaPop(canonicalRef)
  const [showPremium, setShowPremium] = useState(false)

  // Hide-when-empty mode: render nothing while loading or if no data
  if (hideWhenEmpty && (isLoading || !data?.hasData)) return null

  return (
    <div style={S.container}>
      <div style={S.header}>
        <span style={S.headerLabel}>POPULATION PSA</span>
        {data?.totalGraded ? (
          <span style={S.totalBadge}>{data.totalGraded.toLocaleString('fr-FR')} gradés</span>
        ) : null}
      </div>

      {isLoading && (
        <div style={S.empty}>
          <div style={{ ...S.skeletonRow, animationDelay: '0ms' }} />
          <div style={{ ...S.skeletonRow, animationDelay: '100ms' }} />
          <div style={{ ...S.skeletonRow, animationDelay: '200ms' }} />
        </div>
      )}

      {!isLoading && error && (
        <div style={S.empty}>
          <span style={{ color: SNOW.muted, fontSize: 13 }}>Erreur de chargement</span>
        </div>
      )}

      {!isLoading && !error && data && !data.hasData && (
        <div style={S.empty}>
          <span style={{ color: SNOW.muted, fontSize: 13, textAlign: 'center', padding: '12px 16px' }}>
            Pas encore de données PSA pour cette carte. Couverture en cours d&apos;extension.
          </span>
        </div>
      )}

      {!isLoading && !error && data && data.hasData && (
        <>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.thLeft}>VARIANTE</th>
                <th style={S.thRight}>PSA 10</th>
                <th style={S.thRight}>TOTAL</th>
                <th style={S.thRight}>% GEM</th>
                <th style={S.thRight}>RARETÉ</th>
              </tr>
            </thead>
            <tbody>
              {data.variants.map((v) => <Row key={v.psa_spec_id} v={v} />)}
            </tbody>
          </table>

          {data.premiumVariants.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowPremium((p) => !p)}
                style={S.premiumToggle}
              >
                <span>{showPremium ? '▼' : '▶'} Variantes rares ({data.premiumVariants.length})</span>
                <span style={S.proBadge}>PRO</span>
              </button>
              {showPremium && (
                <table style={{ ...S.table, marginTop: 0 }}>
                  <tbody>
                    {data.premiumVariants.map((v) => <Row key={v.psa_spec_id} v={v} />)}
                  </tbody>
                </table>
              )}
            </>
          )}

          {!data.isPro && (
            <div style={S.proHint}>
              <span style={S.proBadgeSmall}>PRO</span>
              <span>Variantes rares (Black Dot Error, Inverted Back, etc.) en plan Pro</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Row({ v }: { v: PsaPopVariant }) {
  const tier = TIER_BG[v.gem_mint_tier] || TIER_BG.common
  const variety = v.variety || 'Unlimited'
  return (
    <tr>
      <td style={S.tdLeft}>{variety}</td>
      <td style={S.tdNum}>{(v.pop_10 ?? 0).toLocaleString('fr-FR')}</td>
      <td style={S.tdNum}>{(v.pop_total ?? 0).toLocaleString('fr-FR')}</td>
      <td style={S.tdNum}>{(v.pct_gem_mint ?? 0).toFixed(2)}%</td>
      <td style={{ ...S.tdRight, padding: '8px 12px' }}>
        <span style={{ ...S.tierBadge, background: tier.bg, color: tier.ink }}>
          {labelForTier(v.gem_mint_tier)}
        </span>
      </td>
    </tr>
  )
}

function labelForTier(t: PsaPopVariant['gem_mint_tier']): string {
  switch (t) {
    case 'very_rare': return 'Ultra rare'
    case 'rare':      return 'Rare'
    case 'uncommon':  return 'Peu commun'
    case 'common':    return 'Commun'
    default:          return ''
  }
}

const S: Record<string, React.CSSProperties> = {
  container: {
    background: '#FFFFFF',
    border: `1px solid ${SNOW.border}`,
    borderRadius: 6,
    overflow: 'hidden',
    fontFamily: 'var(--font-dm, system-ui)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    background: SNOW.surface,
    borderBottom: `1px solid ${SNOW.border}`,
  },
  headerLabel: {
    fontFamily: 'var(--font-sora, system-ui)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: SNOW.ink,
  },
  totalBadge: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 11,
    color: SNOW.muted,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
  },
  thLeft: {
    textAlign: 'left',
    padding: '8px 12px',
    fontWeight: 600,
    fontSize: 10,
    letterSpacing: '0.06em',
    color: SNOW.muted,
    borderBottom: `1px solid ${SNOW.border}`,
  },
  thRight: {
    textAlign: 'right',
    padding: '8px 12px',
    fontWeight: 600,
    fontSize: 10,
    letterSpacing: '0.06em',
    color: SNOW.muted,
    borderBottom: `1px solid ${SNOW.border}`,
  },
  tdLeft: {
    padding: '10px 12px',
    color: SNOW.ink,
    borderBottom: `1px solid ${SNOW.border}`,
  },
  tdRight: {
    textAlign: 'right',
    borderBottom: `1px solid ${SNOW.border}`,
  },
  tdNum: {
    textAlign: 'right',
    padding: '10px 12px',
    fontFamily: 'var(--font-mono, monospace)',
    color: SNOW.ink,
    borderBottom: `1px solid ${SNOW.border}`,
    fontVariantNumeric: 'tabular-nums',
  },
  tierBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.04em',
  },
  empty: {
    minHeight: 80,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  skeletonRow: {
    height: 14,
    background: `linear-gradient(90deg, ${SNOW.surface} 0%, ${SNOW.border} 50%, ${SNOW.surface} 100%)`,
    backgroundSize: '200% 100%',
    borderRadius: 3,
    animation: 'psaPopShimmer 1.4s ease-in-out infinite',
  },
  premiumToggle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '10px 14px',
    background: 'transparent',
    border: 'none',
    borderTop: `1px solid ${SNOW.border}`,
    cursor: 'pointer',
    fontSize: 12,
    color: SNOW.ink,
    fontFamily: 'inherit',
  },
  proBadge: {
    fontFamily: 'var(--font-sora, system-ui)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#FFFFFF',
    background: ACCENT,
    padding: '3px 7px',
    borderRadius: 3,
  },
  proHint: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    background: SNOW.surface,
    borderTop: `1px solid ${SNOW.border}`,
    fontSize: 11,
    color: SNOW.muted,
  },
  proBadgeSmall: {
    fontFamily: 'var(--font-sora, system-ui)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#FFFFFF',
    background: ACCENT,
    padding: '2px 6px',
    borderRadius: 3,
  },
}
