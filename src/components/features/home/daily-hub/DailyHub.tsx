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
import { HubFooterQuote } from './HubFooterQuote'
import { UpgradeHook } from './UpgradeHook'
import { HubQuickActions } from './HubQuickActions'
import { HubMarketPulse } from './HubMarketPulse'
import { usePlan } from '@/lib/usePlan'
import { usePersona } from '@/lib/usePersona'
import { SNOW, FONT } from '@/lib/design/snow'

/**
 * Daily Hub v1.0 (BEDROCK) Snow+ : page accueil collectionneur.
 *
 * Hierarchie:
 *   1. Header (Bonjour, date, streak, market status)
 *   2. Insight intelligent v1 (master set / wishlist / streak)
 *   3. Portfolio Hero (valeur + ROI + sparkline)
 *   4. KPIs (Master Set / Valeur / Ma collection)
 *   5. Grille v1 [Top valeur · Du nouveau pour toi]
 *   6. Separateur "Bientot disponible"
 *   7. Grille SOON v2 [Alpha Signals · Marche en mouvement]
 *   8. Quote du jour
 */
export function DailyHub() {
  const portfolio = usePortfolio()
  const market = useMarketData()
  const spreads = useSpreads()
  const { isPremium } = usePlan()
  const { isCollector } = usePersona()

  return (
    <>

      <div style={{
        width: '100%',
        maxWidth: 1100,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
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
          .hub-stagger > *:nth-child(8) { animation-delay: 560ms; }
        `}</style>

        <div className="hub-stagger" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          {/* 1. Header */}
          <HubHeader />

          {/* 1b. Quick actions */}
          <HubQuickActions />

          {/* 2. Insight intelligent v1 */}
          <HubInsight
            cards={portfolio.cards || []}
            spreads={spreads.allSignals}
            indices={market.indices}
            loading={portfolio.loading || spreads.loading || market.loading}
          />

          {/* 3. Portfolio Hero (piece maitresse) */}
          <HubPortfolioHero
            cards={portfolio.cards || []}
            indices={market.indices}
            loading={portfolio.loading || market.loading}
          />

          {/* 4. KPIs v1 (Master Set / Valeur / Ma collection) */}
          <HubKpis
            topSpread={spreads.allSignals[0] || null}
            topIndex={market.indices[0] || null}
            cardsCount={portfolio.cards?.length || 0}
            loading={market.loading || spreads.loading || portfolio.loading}
          />

          {/* 5. Grille v1 - Ton portfolio */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 14,
          }}>
            <HubMovers
              cards={portfolio.cards || []}
              loading={portfolio.loading}
            />
          </div>

          {/* 6-7. Vitrine marché — investisseur uniquement */}
          {!isCollector && <>
          <SoonSectionLabel />
          <HubMarketPulse indices={market.indices} loading={market.loading} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 14,
          }}>
            <HubSpreadsTeaser
              signals={spreads.allSignals}
              loading={spreads.loading}
            />
            <HubMarketMovers />
          </div>
          </>}

          {/* 8. Quote du jour */}
          <HubFooterQuote />
        </div>
      </div>
    </>
  )
}

/* ── Separateur SOON v2 (discret, marque la transition v1 → v2) ─── */

function SoonSectionLabel() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginTop: 12,
      marginBottom: 4,
    }}>
      <div style={{
        flex: 1, height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${SNOW.borderSoft} 50%, transparent 100%)`,
      }} />
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        color: SNOW.mutedLight,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        fontFamily: FONT.display,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: SNOW.amberDark, opacity: 0.6,
          display: 'inline-block',
        }} />
        Bientôt disponible
      </span>
      <div style={{
        flex: 1, height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${SNOW.borderSoft} 50%, transparent 100%)`,
      }} />
    </div>
  )
}
