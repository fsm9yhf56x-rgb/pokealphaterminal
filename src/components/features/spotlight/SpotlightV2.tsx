'use client'

import { useState } from 'react'
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

type SpotTab = 'vue' | 'marche' | 'pop'

export function SpotlightV2({ cardId, lang, portfolio }: SpotlightV2Props) {
  const [tab, setTab] = useState<SpotTab>('vue')
  const { data, loading, error } = useSpotlightData(cardId, lang, portfolio?.condition)

  if (error) return <div style={{ padding: 24, fontSize: 13, color: SNOW.red, fontFamily: FONT.body }}>Erreur : {error}</div>

  const card = data?.card
  const prices = data?.prices
  const hasHistory = prices?.history && prices.history.length >= 2
  const isJp = (lang || card?.lang || '').toString().toUpperCase().startsWith('J')

  return (
    <div className="spotv2-root" style={{
      background: 'transparent',
      color: SNOW.ink, fontFamily: FONT.body,
      padding: '18px 22px 14px',
      display: 'flex', flexDirection: 'column' as const, gap: 10,
      position: 'relative' as const,
      isolation: 'isolate' as const,
      overflow: 'hidden' as const,
    }}>
      <style>{`
        .spot-tabbar { display: none; }
        @media (max-width: 900px) {
          .spot-tabbar { display: flex; gap: 4px; padding: 4px; background: rgba(0,0,0,0.04); border-radius: 12px; position: sticky; top: 0; z-index: 5; margin-bottom: 4px; }
          .spot-tabbar button { flex: 1; padding: 9px 6px; border: none; border-radius: 9px; background: transparent; color: #86868B; font-size: 12px; font-weight: 600; cursor: pointer; font-family: var(--font-dm, 'DM Sans', sans-serif); transition: all .2s; }
          .spot-tabbar button.on { background: #fff; color: #1D1D1F; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95); }
          .spot-sec { display: none !important; }
          .spot-sec.on { display: block !important; }
          .spot-sec-vue.on { display: flex !important; flex-direction: column; gap: 5px !important; }
          /* DENSIFICATION MAX mobile */
          .spot-tabbar { margin-bottom: 5px !important; padding: 3px !important; }
          .spot-tabbar button { padding: 6px 6px !important; font-size: 11px !important; }
          .spotv2-root { padding: 2px 11px 6px !important; gap: 5px !important; }
          .spotv2-root .spot-sec > div,
          .spotv2-root > div > div[style*="border-radius"] { padding: 8px 10px !important; }
          .spotv2-root [style*="font-size: 32"],
          .spotv2-root [style*="fontSize: 32"] { font-size: 22px !important; }
        }
      `}</style>

      <div style={{ position: 'relative' as const, zIndex: 1, display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        {!isJp && (
          <div className="spot-tabbar">
            <button className={tab === 'vue' ? 'on' : ''} onClick={() => setTab('vue')}>Vue</button>
            <button className={tab === 'marche' ? 'on' : ''} onClick={() => setTab('marche')}>Marché</button>
            <button className={tab === 'pop' ? 'on' : ''} onClick={() => setTab('pop')}>Population</button>
          </div>
        )}
        {card && prices ? (
          <div style={GLASS_CARD}>
            <SpotlightHero card={card} prices={prices} portfolio={portfolio} hidePrice={isJp} />
          </div>
        ) : (
          <SkeletonBox height={80} />
        )}

        {isJp ? (
          <JpPriceSoon cardId={cardId} />
        ) : (
        <>
        <div className={`spot-sec spot-sec-vue ${tab === 'vue' ? 'on' : ''}`}>
        {hasHistory ? (
          <div style={GLASS_CARD}>
            <SpotlightChart history={prices!.history} />
          </div>
        ) : loading ? (
          <SkeletonBox height={200} />
        ) : null}

        {prices ? (
          <SpotlightTLDR prices={prices} portfolio={portfolio} />
        ) : (
          <SkeletonBox height={60} />
        )}
        </div>

        <div className={`spot-sec ${tab === 'marche' ? 'on' : ''}`}>
        {prices ? (
          <SpotlightStates prices={prices} portfolio={portfolio} />
        ) : (
          <SkeletonBox height={140} />
        )}
        </div>
        </>
        )}

        <div className={`spot-sec ${tab === 'pop' ? 'on' : ''}`}>
        {card ? (
          <SpotlightPopExpandable cardId={card.id} lang={card.lang} />
        ) : (
          <SkeletonBox height={100} />
        )}
        </div>
      </div>
    </div>
  )
}
