'use client'

import { useState } from 'react'
import { useExplorerSearch } from '@/lib/useExplorerSearch'
import { ExplorerSearch } from './ExplorerSearch'
import { ExplorerFilters } from './ExplorerFilters'
import { ExplorerResults } from './ExplorerResults'
import { ExplorerGrid } from './ExplorerGrid'
import { ExplorerTable } from './ExplorerTable'
import { ExplorerDrawer } from './ExplorerDrawer'
import { ExplorerSavedSearches } from './ExplorerSavedSearches'
import { ExplorerExportCSV } from './ExplorerExportCSV'

/**
 * Explorer = moteur de recherche du marché.
 * Layout : header (search) → filters panel collapsible → results (grid|table) → drawer detail.
 */
export function Explorer() {
  const search = useExplorerSearch()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedCardRef, setSelectedCardRef] = useState<string | null>(null)

  const selectedCard = selectedCardRef
    ? search.results.find(r => r.card_ref === selectedCardRef) || null
    : null

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Header />

      <ExplorerSearch
        q={search.filters.q}
        onChange={(q) => search.updateFilter('q', q)}
        onToggleFilters={() => setFiltersOpen(o => !o)}
        filtersOpen={filtersOpen}
        loading={search.loading}
      />

      {filtersOpen && (
        <ExplorerFilters
          filters={search.filters}
          updateFilter={search.updateFilter}
          resetFilters={search.resetFilters}
        />
      )}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <ExplorerSavedSearches
          currentFilters={search.filters}
          onLoad={(f) => {
            // Load each filter
            Object.entries(f).forEach(([k, v]) => {
              search.updateFilter(k as any, v as any)
            })
          }}
        />
        <ExplorerExportCSV results={search.results} />
      </div>

      <ExplorerResults
        loading={search.loading}
        error={search.error}
        total={search.total}
        showingFrom={search.showingFrom}
        showingTo={search.showingTo}
        currentPage={search.filters.page}
        totalPages={search.totalPages}
        view={search.view}
        sortField={search.filters.sortField}
        sortDir={search.filters.sortDir}
        onPageChange={(p) => search.updateFilter('page', p)}
        onViewChange={search.setView}
        onSortChange={(field, dir) => {
          search.updateFilter('sortField', field)
          search.updateFilter('sortDir', dir)
        }}
      />

      {search.hasResults && (
        search.view === 'grid' ? (
          <ExplorerGrid
            results={search.results}
            onSelect={setSelectedCardRef}
          />
        ) : (
          <ExplorerTable
            results={search.results}
            onSelect={setSelectedCardRef}
            sortField={search.filters.sortField}
            sortDir={search.filters.sortDir}
            onSortChange={(field, dir) => {
              search.updateFilter('sortField', field)
              search.updateFilter('sortDir', dir)
            }}
          />
        )
      )}

      {!search.loading && !search.hasResults && !search.error && (
        <EmptyState hasQuery={search.filters.q.length > 0} />
      )}

      <ExplorerDrawer
        card={selectedCard}
        onClose={() => setSelectedCardRef(null)}
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
      <h1 style={{
        fontSize: '26px',
        fontWeight: 600,
        color: 'var(--ink)',
        fontFamily: 'var(--font-display)',
        letterSpacing: '-0.5px',
        margin: 0,
      }}>Explorer</h1>
      <p style={{
        fontSize: '12px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-display)',
        marginTop: '6px',
      }}>Recherchez parmi 33 000 cartes avec prix réels du marché.</p>
    </div>
  )
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div style={{
      padding: '60px 20px',
      textAlign: 'center',
      background: 'var(--surface)',
      border: '2px dashed var(--border-strong)',
      borderRadius: '12px',
    }}>
      <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}>🔍</div>
      <div style={{
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--ink)',
        fontFamily: 'var(--font-display)',
        marginBottom: '6px',
      }}>
        {hasQuery ? 'Aucun résultat' : 'Lancez une recherche'}
      </div>
      <div style={{
        fontSize: '12px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-display)',
      }}>
        {hasQuery
          ? 'Essayez d\'élargir vos filtres ou modifiez la requête.'
          : 'Tapez le nom d\'une carte, d\'un set ou d\'un Pokémon.'}
      </div>
    </div>
  )
}
