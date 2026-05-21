'use client'

import { useSpotlightData } from './useSpotlightData'
import { SpotlightHero } from './sections/SpotlightHero'
import { SpotlightChart } from './sections/SpotlightChart'
import { SpotlightTLDR } from './sections/SpotlightTLDR'
import { SpotlightStates } from './sections/SpotlightStates'
import { SpotlightPopExpandable } from './sections/SpotlightPopExpandable'
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
  border: '1px solid rgba(255,255,255,0.55)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)',
}

export function SpotlightV2({ cardId, lang, portfolio }: SpotlightV2Props) {
  const { data, loading, error } = useSpotlightData(cardId, lang)

  if (loading) return <div style={{ padding: 22, display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
      <div className="kc-loading-glass" style={{ height: 80 }} />
      <div className="kc-loading-glass" style={{ height: 200 }} />
      <div className="kc-loading-glass" style={{ height: 60 }} />
      <div className="kc-loading-glass" style={{ height: 140 }} />
    </div>
  if (error) return <div style={{ padding: 24, fontSize: 13, color: SNOW.red, fontFamily: FONT.body }}>Erreur : {error}</div>
  if (!data) return null

  const { card, prices } = data

  return (
    <div style={{
      background: 'linear-gradient(180deg, #F5F5F7 0%, #EEEEF1 100%)',
      color: SNOW.ink, fontFamily: FONT.body,
      padding: '18px 22px 14px',
      display: 'flex', flexDirection: 'column' as const, gap: 10,
      position: 'relative' as const,
      isolation: 'isolate' as const,
      overflow: 'hidden' as const,
    }}>
      <div style={{ position: 'absolute' as const, top: '2%', left: '-12%', width: '55%', height: '40%', background: 'radial-gradient(circle, rgba(255,165,80,0.38) 0%, transparent 70%)', filter: 'blur(72px)', pointerEvents: 'none' as const, zIndex: 0, animation: 'kcHaloDrift 22s ease-in-out infinite' }} />
      <div style={{ position: 'absolute' as const, top: '25%', right: '-8%', width: '50%', height: '35%', background: 'radial-gradient(circle, rgba(110,150,255,0.34) 0%, transparent 70%)', filter: 'blur(78px)', pointerEvents: 'none' as const, zIndex: 0, animation: 'kcHaloDrift 28s ease-in-out infinite reverse' }} />
      <div style={{ position: 'absolute' as const, top: '50%', left: '15%', width: '60%', height: '40%', background: 'radial-gradient(circle, rgba(195,135,245,0.28) 0%, transparent 70%)', filter: 'blur(85px)', pointerEvents: 'none' as const, zIndex: 0, animation: 'kcHaloDrift 28s ease-in-out infinite' }} />
      <div style={{ position: 'absolute' as const, bottom: '5%', right: '10%', width: '45%', height: '30%', background: 'radial-gradient(circle, rgba(0,210,150,0.24) 0%, transparent 70%)', filter: 'blur(68px)', pointerEvents: 'none' as const, zIndex: 0, animation: 'kcHaloDrift 20s ease-in-out infinite reverse' }} />
      <div style={{ position: 'absolute' as const, bottom: '15%', left: '5%', width: '40%', height: '35%', background: 'radial-gradient(circle, rgba(255,90,140,0.18) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' as const, zIndex: 0 }} />

      <div style={{ position: 'relative' as const, zIndex: 1, display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        <div style={GLASS_CARD}>
          <SpotlightHero card={card} prices={prices} portfolio={portfolio} hideTitle />
        </div>

        {prices.history && prices.history.length >= 2 ? (
          <div style={GLASS_CARD}>
            <SpotlightChart history={prices.history} />
          </div>
        ) : null}

        <SpotlightTLDR prices={prices} />
        <SpotlightStates prices={prices} portfolio={portfolio} />
        <SpotlightPopExpandable cardId={card.id} />
      </div>
    </div>
  )
}
