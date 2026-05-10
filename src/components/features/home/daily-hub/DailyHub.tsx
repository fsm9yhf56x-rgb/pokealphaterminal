'use client'

import { usePortfolio } from '@/lib/usePortfolio'
import { useMarketData } from '@/lib/useMarketData'
import { useSpreads } from '@/lib/useSpreads'
import { HubHeader } from './HubHeader'
import { HubInsight } from './HubInsight'
import { HubPortfolioHero } from './HubPortfolioHero'
import { HubKpis } from './HubKpis'
import { HubMovers } from './HubMovers'
import { HubSpreadsTeaser } from './HubSpreadsTeaser'
import { HubMarketMovers } from './HubMarketMovers'
import { HubAlerts } from './HubAlerts'
import { HubSparkles } from './HubSparkles'
import { HubFooterQuote } from './HubFooterQuote'

/**
 * Daily Hub V3 (full hook mode) : page d'accueil quotidienne premium.
 * Lecture progressive JE -> NOUS -> MARCHE avec stagger animations + visual hooks.
 */
export function DailyHub() {
  const portfolio = usePortfolio()
  const market = useMarketData()
  const spreads = useSpreads()

  return (
    <>
      <HubSparkles cards={portfolio.cards || []} />

      <div style={{
        width: '100%',
        maxWidth: '1100px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        <style>{`
          @keyframes hub-fadein {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0);   }
          }
          .hub-stagger > * {
            opacity: 0;
            animation: hub-fadein 0.5s cubic-bezier(0.32, 0.72, 0, 1) forwards;
          }
          .hub-stagger > *:nth-child(1) { animation-delay: 0ms; }
          .hub-stagger > *:nth-child(2) { animation-delay: 80ms; }
          .hub-stagger > *:nth-child(3) { animation-delay: 160ms; }
          .hub-stagger > *:nth-child(4) { animation-delay: 240ms; }
          .hub-stagger > *:nth-child(5) { animation-delay: 320ms; }
          .hub-stagger > *:nth-child(6) { animation-delay: 400ms; }
          .hub-stagger > *:nth-child(7) { animation-delay: 480ms; }
        `}</style>

        <div className="hub-stagger" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          <HubHeader />

          <HubInsight
            cards={portfolio.cards || []}
            spreads={spreads.allSignals}
            indices={market.indices}
            loading={portfolio.loading || spreads.loading || market.loading}
          />

          <HubPortfolioHero
            cards={portfolio.cards || []}
            indices={market.indices}
            loading={portfolio.loading || market.loading}
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
              signals={spreads.allSignals}
              loading={spreads.loading}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '14px',
          }}>
            <HubMarketMovers />
            <HubAlerts
              cards={portfolio.cards || []}
              loading={portfolio.loading}
            />
          </div>

          <HubFooterQuote />
        </div>
      </div>
    </>
  )
}
