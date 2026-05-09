'use client'

import { useState } from 'react'
import { useUndervalued, type UndervaluedSignal } from '@/lib/useUndervalued'
import { SEKpis } from './SEKpis'
import { SEFilters } from './SEFilters'
import { SEGrid } from './SEGrid'
import { SEDrawer } from './SEDrawer'
import { SEProGate } from './SEProGate'

/**
 * Page Sous-Évalués : Alpha Signals = cartes avec écart prix EU/US arbitrage.
 * Pro gate : Free voit 1 carte, Pro voit toutes les cartes.
 */
export function SousEvalues({ isPro = false }: { isPro?: boolean }) {
  const { signals, stats, filters, updateFilter, resetFilters, loading, error } = useUndervalued()
  const [selectedSignal, setSelectedSignal] = useState<UndervaluedSignal | null>(null)

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Header />

      <SEKpis stats={stats} loading={loading} />

      <SEFilters
        filters={filters}
        updateFilter={updateFilter}
        resetFilters={resetFilters}
        stats={stats}
      />

      {loading && <LoadingState />}
      {error && <ErrorState error={error} />}

      {!loading && !error && signals.length === 0 && stats.total === 0 && (
        <EmptyState message="Aucun signal détecté pour le moment. Le scanner s'exécute toutes les 4 heures." />
      )}

      {!loading && !error && signals.length === 0 && stats.total > 0 && (
        <EmptyState message="Aucun signal ne correspond aux filtres actuels. Essayez d'élargir les critères." />
      )}

      {!loading && !error && signals.length > 0 && (
        <>
          <SEGrid
            signals={signals}
            isPro={isPro}
            onSelect={setSelectedSignal}
          />
          {!isPro && signals.length > 1 && (
            <SEProGate hiddenCount={signals.length - 1} />
          )}
        </>
      )}

      <SEDrawer
        signal={selectedSignal}
        onClose={() => setSelectedSignal(null)}
      />
    </div>
  )
}

/* ── UI helpers ───────────────────────────── */

function Header() {
  return (
    <div>
      <p style={{
        fontSize: '10px',
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        margin: '0 0 4px',
        fontFamily: 'var(--font-display)',
      }}>Market</p>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
      }}>
        <h1 style={{
          fontSize: '26px',
          fontWeight: 600,
          color: 'var(--ink)',
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.5px',
          margin: 0,
        }}>Sous-évaluées</h1>

        <span style={{
          padding: '3px 8px',
          background: 'var(--accent)',
          color: 'var(--surface)',
          fontSize: '9px',
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          borderRadius: '4px',
        }}>Alpha Signals</span>
      </div>

      <p style={{
        fontSize: '12px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-display)',
        marginTop: '6px',
      }}>
        Cartes avec un écart de prix entre Cardmarket EU et eBay US — opportunités d'arbitrage géo détectées automatiquement.
      </p>
    </div>
  )
}

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
      Détection des signaux en cours…
    </div>
  )
}

function ErrorState({ error }: { error: string }) {
  return (
    <div style={{
      padding: '32px 20px',
      textAlign: 'center',
      background: 'var(--surface)',
      border: '1px solid var(--red-border)',
      borderRadius: '12px',
    }}>
      <div style={{
        fontSize: '14px',
        color: 'var(--accent)',
        fontWeight: 600,
        marginBottom: '6px',
        fontFamily: 'var(--font-display)',
      }}>Scanner indisponible</div>
      <div style={{
        fontSize: '12px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-display)',
      }}>{error}</div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      padding: '60px 20px',
      textAlign: 'center',
      background: 'var(--surface)',
      border: '2px dashed var(--border-strong)',
      borderRadius: '12px',
    }}>
      <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}>◆</div>
      <div style={{
        fontSize: '13px',
        color: 'var(--ink)',
        fontFamily: 'var(--font-display)',
        fontWeight: 500,
        marginBottom: '6px',
      }}>Pas de signaux pour le moment</div>
      <div style={{
        fontSize: '11px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-display)',
      }}>{message}</div>
    </div>
  )
}
