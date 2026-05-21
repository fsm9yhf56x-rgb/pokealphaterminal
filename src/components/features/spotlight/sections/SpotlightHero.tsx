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
  portfolio?: PortfolioContext | null
  hideTitle?: boolean
}

export function SpotlightHero({ card, prices, portfolio, hideTitle }: Props) {
  const userCondition = portfolio?.condition ? normalizeCondition(portfolio.condition) : 'NEAR_MINT'
  const userGraded = portfolio?.graded || false

  let userPriceEntry: PriceEntry | null = null
  if (!userGraded) {
    userPriceEntry = (prices.bySource.ebay || []).find(p => p.variant === 'raw' && p.condition === userCondition) || null
  }

  const ebayNm = prices.bySource.ebay?.find(p => p.variant === 'raw' && p.condition === 'NEAR_MINT')
  const cm = prices.bySource.cardmarket?.find(p => p.variant === 'raw')
  const heroPrice = userPriceEntry?.price_avg ?? ebayNm?.price_avg ?? prices.marketEst ?? cm?.price_avg ?? null

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
    <div style={{ padding: '0' }}>
      {!hideTitle ? (
        <>
          <div style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 500, color: SNOW.mutedLight, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14 }}>{flag}</span>
            <span>{lang}</span>
            <span style={{ color: '#D8D8DD' }}>·</span>
            <span>{card.set_name}{year ? ` ${year}` : ''}</span>
            <span style={{ color: '#D8D8DD' }}>·</span>
            <span style={{ fontFamily: FONT.data }}>#{card.local_id}</span>
          </div>
          <h1 style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 500, letterSpacing: '-0.022em', lineHeight: 1.1, margin: '0 0 2px' }}>{card.name}</h1>
          <p style={{ fontSize: 12, color: SNOW.mutedLight, margin: 0 }}>
            {card.rarity_normalized || ''}{card.rarity_normalized ? ' · Wizards of the Coast' : 'Wizards of the Coast'}
          </p>
        </>
      ) : null}

      <div style={{ marginTop: hideTitle ? 0 : 10 }}>
        <div style={{ fontSize: 10, color: SNOW.muted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontWeight: 500, fontFamily: FONT.display, marginBottom: 4 }}>
          {showPortfolio ? 'Ton exemplaire' : 'Prix de marché'} · {userStateLabel}{' '}
          <span style={{ fontFamily: 'Times New Roman, serif', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0, color: SNOW.mutedLight, fontWeight: 400 }}>
            {userStateSub}
          </span>
        </div>
        <div>
          <span style={{ fontFamily: FONT.display, fontSize: 36, fontWeight: 500, letterSpacing: '-0.028em', lineHeight: 1, color: SNOW.ink }}>{priceMain}</span>
          <span style={{ fontSize: 22, color: SNOW.mutedLight, fontWeight: 400, fontFamily: FONT.display }}>{priceCents}</span>
        </div>
        {showPortfolio && portfolio!.qty > 1 ? (
          <div style={{ fontSize: 12, color: SNOW.mutedLight, marginTop: 6 }}>
            × {portfolio!.qty} exemplaires = <strong style={{ color: SNOW.ink, fontWeight: 500 }}>{fmtPrice((heroPrice || 0) * portfolio!.qty, 'EUR')}</strong>
          </div>
        ) : null}
        {roi != null ? (
          <div style={{ fontSize: 12, marginTop: 6, color: roi >= 0 ? '#00A368' : SNOW.red }}>
            <strong style={{ fontWeight: 500 }}>{roi >= 0 ? '+' : ''}{roi.toFixed(1).replace('.', ',')} %</strong> depuis ton achat ({fmtPrice(portfolio!.buyPrice!, 'EUR')})
          </div>
        ) : null}
      </div>
    </div>
  )
}
