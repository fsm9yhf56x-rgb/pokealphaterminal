'use client'

import { useMarketData } from '@/lib/useMarketData'
import { TermTicker } from './TermTicker'
import { TermStatus } from './TermStatus'
import { TermIndices } from './TermIndices'
import { TermHeatmap } from './TermHeatmap'
import { TermMovers } from './TermMovers'
import { TermHotCards } from './TermHotCards'
import { TermAlphaPreview } from './TermAlphaPreview'
import { TermActivityFeed } from './TermActivityFeed'

/**
 * Page d'accueil Market = Terminal Bloomberg-style.
 * Centralise les flux de données via useMarketData() (1 useEffect, 8 queries //).
 */
export function MarketTerminal({ isPro = false }: { isPro?: boolean }) {
  const data = useMarketData()

  if (data.loading) {
    return <LoadingState />
  }

  if (data.error) {
    return <ErrorState error={data.error} />
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* TICKER : sticky sous le header global (HEADER_H = 83px) */}
      <div style={{
        position: 'sticky',
        top: '83px',
        zIndex: 40,
        margin: '-32px -36px 0',
        padding: '12px 36px',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}>
        <TermTicker items={data.ticker} />
      </div>

      {/* CONTENT WRAPPER */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        marginTop: '20px',
      }}>
        <TermStatus
          status={data.marketStatus}
          lastUpdate={data.lastUpdate}
        />

        <TermIndices indices={data.indices} />

        <TermHeatmap nodes={data.heatmap} />

        <TermMovers
          gainers={data.topGainers}
          losers={data.topLosers}
        />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '16px',
        }}>
          <TermHotCards cards={data.hotCards} />
          <TermAlphaPreview signals={data.alphaPreview} isPro={isPro} />
        </div>

        <TermActivityFeed events={data.activityFeed} />
      </div>
    </div>
  )
}

/* ── States ───────────────────────────────── */

function LoadingState() {
  return (
    <div style={{
      padding: '60px 20px',
      textAlign: 'center',
      color: 'var(--ink-faint)',
      fontFamily: 'var(--font-display)',
      fontSize: '12px',
    }}>
      <div style={{
        width: '24px',
        height: '24px',
        border: '2px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        margin: '0 auto 12px',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      Chargement du marché…
    </div>
  )
}

function ErrorState({ error }: { error: string }) {
  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      background: 'var(--surface)',
      border: '1px solid var(--red-border)',
      borderRadius: '12px',
      maxWidth: '480px',
      margin: '40px auto',
    }}>
      <div style={{
        fontSize: '14px',
        color: 'var(--accent)',
        fontWeight: 600,
        marginBottom: '8px',
        fontFamily: 'var(--font-display)',
      }}>Marché indisponible</div>
      <div style={{
        fontSize: '12px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-display)',
        lineHeight: 1.5,
      }}>{error}</div>
      <div style={{
        fontSize: '10px',
        color: 'var(--ink-faint)',
        fontFamily: 'var(--font-display)',
        marginTop: '12px',
      }}>Le service reviendra automatiquement.</div>
    </div>
  )
}
