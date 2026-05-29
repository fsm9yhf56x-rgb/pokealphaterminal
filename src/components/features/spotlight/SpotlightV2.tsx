'use client'

import { useSpotlightData } from './useSpotlightData'
import { SpotlightHero } from './sections/SpotlightHero'
import { SpotlightChart } from './sections/SpotlightChart'
import { SpotlightTLDR } from './sections/SpotlightTLDR'
import { SpotlightStates } from './sections/SpotlightStates'
import { SpotlightPopExpandable } from './sections/SpotlightPopExpandable'
import { JpPriceSoon } from './sections/JpPriceSoon'
import { SNOW, FONT } from './snowTokens'

export interface PortfolioContext {
  qty: number
  buyPrice: number | null
  acquiredAt: string | null
  condition?: string | null
  graded?: boolean
}

export interface SpotlightV2Props {
  cardId: string
  lang?: 'EN' | 'FR' | 'JP' | string
  portfolio?: PortfolioContext | null
  imageUrl?: string | null
  hideHero?: boolean
}

const GLASS_CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.45)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  borderRadius: 16,
  padding: '14px 18px',
  border: 'none',
  boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)',
}

const SkeletonBox = ({ height, opacity = 0.5 }: { height: number; opacity?: number }) => (
  <div style={{
    ...GLASS_CARD,
    height,
    background: `rgba(255,255,255,${opacity * 0.5})`,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  }}>
    <div style={{
      position: 'absolute' as const,
      inset: 0,
      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
      animation: 'kcShimmer 1.4s ease-in-out infinite',
    }} />
  </div>
)

export function SpotlightV2({ cardId, lang, portfolio }: SpotlightV2Props) {
  const { data, loading, error } = useSpotlightData(cardId, lang, portfolio?.condition)

  if (error) return <div style={{ padding: 24, fontSize: 13, color: SNOW.red, fontFamily: FONT.body }}>Erreur : {error}</div>

  const card = data?.card
  const prices = data?.prices
  const hasHistory = prices?.history && prices.history.length >= 2
  const isJp = (lang || card?.lang || '').toString().toUpperCase().startsWith('J')

  return (
    <div style={{
      background: 'transparent',
      color: SNOW.ink, fontFamily: FONT.body,
      padding: '18px 22px 14px',
      display: 'flex', flexDirection: 'column' as const, gap: 10,
      position: 'relative' as const,
      isolation: 'isolate' as const,
      overflow: 'hidden' as const,
    }}>
      <div style={{ position: 'relative' as const, zIndex: 1, display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        {card && prices ? (
          <div style={GLASS_CARD}>
            <SpotlightHero card={card} prices={prices} portfolio={portfolio} hideTitle hidePrice={isJp} />
          </div>
        ) : (
          <SkeletonBox height={80} />
        )}

        {isJp ? (
          <JpPriceSoon cardId={cardId} />
        ) : (
        <>
        {hasHistory ? (
          <div style={GLASS_CARD}>
            <SpotlightChart history={prices!.history} />
          </div>
        ) : loading ? (
          <SkeletonBox height={200} />
        ) : null}

        {prices ? (
          <SpotlightTLDR prices={prices} />
        ) : (
          <SkeletonBox height={60} />
        )}

        {prices ? (
          <SpotlightStates prices={prices} portfolio={portfolio} />
        ) : (
          <SkeletonBox height={140} />
        )}
        </>
        )}

        {card ? (
          <SpotlightPopExpandable cardId={card.id} lang={card.lang} />
        ) : (
          <SkeletonBox height={100} />
        )}
      </div>
    </div>
  )
}
