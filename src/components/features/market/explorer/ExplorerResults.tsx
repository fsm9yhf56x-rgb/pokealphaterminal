'use client'

import type { SortField, SortDir, ViewMode } from '@/lib/useExplorerSearch'

/**
 * Toolbar des résultats : count + sort + view toggle (grid/table) + pagination.
 * Toujours visible (même quand pas de résultats : count = 0).
 */
export function ExplorerResults({
  loading, error, total, showingFrom, showingTo,
  currentPage, totalPages,
  view, sortField, sortDir,
  onPageChange, onViewChange, onSortChange,
}: {
  loading: boolean
  error: string | null
  total: number
  showingFrom: number
  showingTo: number
  currentPage: number
  totalPages: number
  view: ViewMode
  sortField: SortField
  sortDir: SortDir
  onPageChange: (p: number) => void
  onViewChange: (v: ViewMode) => void
  onSortChange: (field: SortField, dir: SortDir) => void
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '14px',
      flexWrap: 'wrap',
      padding: '10px 0',
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Left : count */}
      <div style={{
        fontSize: '12px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-display)',
      }}>
        {error ? (
          <span style={{ color: 'var(--accent)' }}>Erreur : {error}</span>
        ) : loading ? (
          <span>Recherche en cours…</span>
        ) : total === 0 ? (
          <span>Aucun résultat</span>
        ) : (
          <>
            <span style={{
              color: 'var(--ink)',
              fontFamily: 'var(--font-data, var(--font-display))',
              fontWeight: 600,
            }}>
              {showingFrom.toLocaleString('fr-FR')}–{showingTo.toLocaleString('fr-FR')}
            </span>
            <span> sur </span>
            <span style={{
              color: 'var(--ink)',
              fontFamily: 'var(--font-data, var(--font-display))',
              fontWeight: 600,
            }}>{total.toLocaleString('fr-FR')}</span>
            <span> cartes</span>
          </>
        )}
      </div>

      {/* Right : controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
      }}>
        <SortDropdown
          field={sortField}
          dir={sortDir}
          onChange={onSortChange}
        />

        <ViewToggle view={view} onChange={onViewChange} />

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onChange={onPageChange}
          />
        )}
      </div>
    </div>
  )
}

/* ── Sort dropdown ─────────────────────────── */

const SORT_OPTIONS: { field: SortField; dir: SortDir; label: string }[] = [
  { field: 'top_price',         dir: 'desc', label: 'Prix décroissant' },
  { field: 'top_price',         dir: 'asc',  label: 'Prix croissant' },
  { field: 'card_name',         dir: 'asc',  label: 'Nom A–Z' },
  { field: 'card_name',         dir: 'desc', label: 'Nom Z–A' },
  { field: 'cardmarket_trend',  dir: 'desc', label: 'Tendance ↑' },
  { field: 'ebay_sales',        dir: 'desc', label: 'Plus tradées' },
]

function SortDropdown({
  field, dir, onChange,
}: {
  field: SortField
  dir: SortDir
  onChange: (field: SortField, dir: SortDir) => void
}) {
  const currentValue = `${field}.${dir}`

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <select
        value={currentValue}
        onChange={(e) => {
          const [f, d] = e.target.value.split('.') as [SortField, SortDir]
          onChange(f, d)
        }}
        style={{
          appearance: 'none',
          padding: '7px 28px 7px 12px',
          border: '1px solid var(--border-strong)',
          borderRadius: '8px',
          background: 'var(--surface)',
          color: 'var(--ink)',
          fontSize: '12px',
          cursor: 'pointer',
          fontFamily: 'var(--font-display)',
          outline: 'none',
        }}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={`${opt.field}.${opt.dir}`} value={`${opt.field}.${opt.dir}`}>
            {opt.label}
          </option>
        ))}
      </select>
      {/* Chevron */}
      <svg
        width="10" height="10" viewBox="0 0 10 10" fill="none"
        style={{
          position: 'absolute',
          right: '10px',
          color: 'var(--ink-muted)',
          pointerEvents: 'none',
        }}
      >
        <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

/* ── View toggle (Grid | Table) ────────────── */

function ViewToggle({
  view, onChange,
}: {
  view: ViewMode
  onChange: (v: ViewMode) => void
}) {
  return (
    <div style={{
      display: 'flex',
      background: 'var(--surface)',
      border: '1px solid var(--border-strong)',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      <ViewBtn icon={<GridIcon />} active={view === 'grid'} onClick={() => onChange('grid')} title="Grille" />
      <div style={{ width: '1px', background: 'var(--border-strong)' }} />
      <ViewBtn icon={<TableIcon />} active={view === 'table'} onClick={() => onChange('table')} title="Table" />
    </div>
  )
}

function ViewBtn({
  icon, active, onClick, title,
}: {
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '32px',
        height: '32px',
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--surface)' : 'var(--ink-muted)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.12s',
      }}
    >{icon}</button>
  )
}

function GridIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="1.5" y="1.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <rect x="7.5" y="1.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <rect x="1.5" y="7.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <rect x="7.5" y="7.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
    </svg>
  )
}

function TableIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M1.5 3h10M1.5 6.5h10M1.5 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/* ── Pagination ────────────────────────────── */

function Pagination({
  currentPage, totalPages, onChange,
}: {
  currentPage: number
  totalPages: number
  onChange: (p: number) => void
}) {
  // Cap to a reasonable max (Supabase pagination)
  const MAX_VISIBLE = 50

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    }}>
      <PageBtn
        disabled={currentPage === 0}
        onClick={() => onChange(Math.max(0, currentPage - 1))}
        title="Page précédente"
      >‹</PageBtn>

      <div style={{
        padding: '0 10px',
        fontSize: '11px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-data, var(--font-display))',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{currentPage + 1}</span>
        <span> / </span>
        <span>{Math.min(totalPages, MAX_VISIBLE).toLocaleString('fr-FR')}</span>
        {totalPages > MAX_VISIBLE && (
          <span style={{ color: 'var(--ink-faint)', marginLeft: '4px' }}>+</span>
        )}
      </div>

      <PageBtn
        disabled={currentPage + 1 >= Math.min(totalPages, MAX_VISIBLE)}
        onClick={() => onChange(Math.min(MAX_VISIBLE - 1, currentPage + 1))}
        title="Page suivante"
      >›</PageBtn>
    </div>
  )
}

function PageBtn({
  disabled, onClick, title, children,
}: {
  disabled?: boolean
  onClick?: () => void
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        color: disabled ? 'var(--ink-faint)' : 'var(--ink)',
        fontSize: '14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.12s',
      }}
    >{children}</button>
  )
}
