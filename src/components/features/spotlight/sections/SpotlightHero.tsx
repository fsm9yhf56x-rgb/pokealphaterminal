'use client'

import type { CardInfo, PriceEntry } from '../useSpotlightData'
import type { PortfolioContext } from '../SpotlightV2'
import { SNOW, FONT, fmtPrice } from '../snowTokens'

const FLAG: Record<string, string> = { EN: '🇺🇸', FR: '🇫🇷', JP: '🇯🇵' }
const LANG: Record<string, string> = { EN: 'Anglais', FR: 'Français', JP: 'Japonais' }

const COND_LABEL: Record<string, string> = {
  NEAR_MINT: 'Near Mint',
  LIGHTLY_PLAYED: 'Lightly Played',
  MODERATELY_PLAYED: 'Moderately Played',
  HEAVILY_PLAYED: 'Heavily Played',
  DAMAGED: 'Damaged',
}

const COND_SUB: Record<string, string> = {
  NEAR_MINT: 'comme neuf',
  LIGHTLY_PLAYED: 'légers défauts',
  MODERATELY_PLAYED: 'défauts visibles',
  HEAVILY_PLAYED: 'usure marquée',
  DAMAGED: 'abîmée',
}

function normalizeCondition(c: string | null | undefined): string {
  if (!c) return 'NEAR_MINT'
  if (c === 'Raw') return 'NEAR_MINT'
  return c.toUpperCase().replace(/ /g, '_')
}

interface Props {
  card: CardInfo
  prices: { bySource: Record<string, PriceEntry[]>; marketEst: number | null }
  kodo?: { fairValueEur: number | null; coteFrEur: number | null } | null
  portfolio?: PortfolioContext | null
  hideTitle?: boolean
  hidePrice?: boolean
}

export function SpotlightHero({ card, prices, portfolio, hideTitle, hidePrice, kodo }: Props) {
  const userCondition = portfolio?.condition ? normalizeCondition(portfolio.condition) : 'NEAR_MINT'
  const userGraded = portfolio?.graded || false

  let userPriceEntry: PriceEntry | null = null
  if (userGraded && portfolio?.condition) {
    // BEDROCK: l'user a une carte gradee -> lookup ppt_graded avec variant key
    // 'PSA 9' -> 'psa_9', 'CGC 9.5' -> 'cgc_9_5'
    const variantKey = portfolio.condition.toLowerCase().replace(/\s+/g, '_').replace('.', '_')
    userPriceEntry = (prices.bySource.ppt_graded || []).find(p => p.variant === variantKey) || null
  } else if (!userGraded) {
    userPriceEntry = (prices.bySource.ebay || []).find(p => p.variant === 'raw' && p.condition === userCondition) || null
  }

  const ebayNm = prices.bySource.ebay?.find(p => p.variant === 'raw' && p.condition === 'NEAR_MINT')
  const cm = prices.bySource.cardmarket?.find(p => p.variant === 'raw')
  // Carte FR -> cote FR ; sinon fair value Kodo. eBay/marketEst en dernier recours.
  const isFr = String(card.lang || '').toUpperCase() === 'FR'
  const kodoVal = isFr ? (kodo?.coteFrEur ?? kodo?.fairValueEur ?? null) : (kodo?.fairValueEur ?? null)
  // Gradee: le tier exact prime (userPriceEntry). Raw: Kodo prime sur eBay brut.
  const heroPrice = (portfolio?.curPrice ?? null) ?? userPriceEntry?.price_avg ?? kodoVal ?? ebayNm?.price_avg ?? prices.marketEst ?? cm?.price_avg ?? null

  const flag = FLAG[card.lang] || '🌐'
  const lang = LANG[card.lang] || card.lang
  const year = card.release_date ? new Date(card.release_date).getFullYear() : null

  const formatPrice = (v: number | null) => {
    if (v == null) return { main: '—', cents: '' }
    const rounded = Math.floor(v)
    const cents = Math.round((v - rounded) * 100)
    return { main: rounded.toLocaleString('fr-FR'), cents: cents > 0 ? `,${cents.toString().padStart(2, '0')} €` : ' €' }
  }
  const { main: priceMain, cents: priceCents } = formatPrice(heroPrice)

  const userStateLabel = userGraded ? 'Gradé' : COND_LABEL[userCondition] || 'Near Mint'
  const userStateSub = userGraded ? 'note à confirmer' : COND_SUB[userCondition] || 'comme neuf'

  let roi: number | null = null
  if (portfolio && portfolio.buyPrice && portfolio.buyPrice > 0 && heroPrice != null) {
    roi = ((heroPrice - portfolio.buyPrice) / portfolio.buyPrice) * 100
  }

  const showPortfolio = portfolio != null

  return (
    <div className="spot-hero-clean" style={{ padding: 0 }}>
      {!hideTitle ? (
        <>
          <div style={{ fontFamily: FONT.display, fontSize: 10.5, fontWeight: 600, color: SNOW.mutedLight, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13 }}>{flag}</span>
            <span>{lang}</span>
            <span style={{ color: '#D8D8DD' }}>·</span>
            <span>{card.set_name}{year ? ` ${year}` : ''}</span>
            <span style={{ color: '#D8D8DD' }}>·</span>
            <span style={{ fontFamily: FONT.data }}>#{card.local_id}</span>
            {card.rarity_normalized ? (<><span style={{ color: '#D8D8DD' }}>·</span><span>{String(card.rarity_normalized).split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}</span></>) : null}
          </div>
          <h1 style={{ fontFamily: FONT.display, fontSize: 25, fontWeight: 600, letterSpacing: '-0.022em', lineHeight: 1.15, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</h1>
        </>
      ) : null}
      {!hidePrice ? (
      <div style={{
        marginTop: hideTitle ? 0 : 14, paddingTop: hideTitle ? 0 : 14,
        borderTop: hideTitle ? 'none' : '1px solid rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
          <div style={{ fontSize: 9.5, color: SNOW.muted, textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 700, fontFamily: FONT.display }}>
            {showPortfolio ? 'Ton exemplaire' : 'Prix de marché'}
          </div>
          <div style={{ fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.display }}>{userStateLabel}</div>
        </div>
        <div style={{ textAlign: 'right' as const, flexShrink: 0, whiteSpace: 'nowrap' as const }}>
          <div>
            <span style={{ fontFamily: FONT.display, fontSize: 30, fontWeight: 600, letterSpacing: '-0.028em', lineHeight: 1, color: SNOW.ink }}>{priceMain}</span>
            <span style={{ fontSize: 18, color: SNOW.mutedLight, fontWeight: 400, fontFamily: FONT.display }}>{priceCents}</span>
          </div>
          {roi != null ? (
            <div style={{ fontSize: 11.5, marginTop: 4, color: roi >= 0 ? '#00A368' : SNOW.red, fontWeight: 600 }}>
              {roi >= 0 ? '+' : ''}{roi.toFixed(1).replace('.', ',')} % <span style={{ color: SNOW.mutedLight, fontWeight: 400 }}>depuis achat</span>
            </div>
          ) : null}
          {showPortfolio && portfolio!.qty > 1 ? (
            <div style={{ fontSize: 11, color: SNOW.mutedLight, marginTop: 3 }}>
              ×{portfolio!.qty} = <strong style={{ color: SNOW.ink, fontWeight: 500 }}>{fmtPrice((heroPrice || 0) * portfolio!.qty, 'EUR')}</strong>
            </div>
          ) : null}
        </div>
      </div>
      ) : null}
    </div>
  )
}
