'use client'

import { usePortfolio } from '@/lib/usePortfolio'
import { useMarketData } from '@/lib/useMarketData'
import { useSpreads } from '@/lib/useSpreads'
import { HubHeader } from './HubHeader'
import { HubPortfolioHero } from './HubPortfolioHero'
import { HubKpis } from './HubKpis'
import { HubMovers } from './HubMovers'
import { HubSpreadsTeaser } from './HubSpreadsTeaser'

/**
 * Daily Hub : page d'accueil quotidienne, vue à 5 secondes.
 * Réutilise les hooks existants (usePortfolio + useMarketData + useSpreads)
 * pour une vision agrégée sans query supplémentaire.
 */
export function DailyHub() {
  const portfolio = usePortfolio()
  const market = useMarketData()
  const spreads = useSpreads()

  return (
    <div style={{
      width: '100%',
      maxWidth: '1100px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    }}>
      <HubHeader />

      <HubPortfolioHero
        cards={portfolio.cards || []}
        loading={portfolio.loading}
      />

      <HubKpis
        topSpread={spreads.allSignals[0] || null}
        topIndex={market.indices[0] || null}
        cardsCount={portfolio.cards?.length || 0}
        loading={market.loading || spreads.loading || portfolio.loading}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '14px',
      }}>
        <HubMovers
          cards={portfolio.cards || []}
          loading={portfolio.loading}
        />
        <HubSpreadsTeaser
          signals={spreads.allSignals.slice(0, 3)}
          loading={spreads.loading}
        />
      </div>
    </div>
  )
}
