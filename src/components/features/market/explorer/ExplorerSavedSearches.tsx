'use client'

import { useState, useEffect, useRef } from 'react'
import type { ExplorerFilters } from '@/lib/useExplorerSearch'
import { GlassButton } from '@/components/ui/GlassButton'

const LS_KEY = 'pka_saved_searches'

interface SavedSearch {
  id: string
  name: string
  filters: ExplorerFilters
  created_at: string
}

/**
 * Saved searches : sauvegarder/charger des combinaisons de filtres.
 * Stocké en localStorage (pas besoin de BDD pour V1).
 */
export function ExplorerSavedSearches({
  currentFilters, onLoad,
}: {
  currentFilters: ExplorerFilters
  onLoad: (filters: ExplorerFilters) => void
}) {
  const [saved, setSaved] = useState<SavedSearch[]>([])
  const [open, setOpen] = useState(false)
  const [namingMode, setNamingMode] = useState(false)
  const [newName, setNewName] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  /* Load from localStorage at mount */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setSaved(JSON.parse(raw))
    } catch {}
  }, [])

  /* Click outside to close */
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setNamingMode(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const persist = (items: SavedSearch[]) => {
    setSaved(items)
    try { localStorage.setItem(LS_KEY, JSON.stringify(items)) } catch {}
  }

  const hasActiveFilters =
    currentFilters.q ||
    currentFilters.lang !== 'ALL' ||
    currentFilters.set ||
    currentFilters.rarity ||
    currentFilters.minPrice != null ||
    currentFilters.maxPrice != null ||
    currentFilters.hasGraded != null

  const handleSave = () => {
    if (!newName.trim() || !hasActiveFilters) return
    const newItem: SavedSearch = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      filters: currentFilters,
      created_at: new Date().toISOString(),
    }
    persist([newItem, ...saved])
    setNewName('')
    setNamingMode(false)
  }

  const handleDelete = (id: string) => {
    persist(saved.filter(s => s.id !== id))
  }

  const handleLoad = (s: SavedSearch) => {
    onLoad(s.filters)
    setOpen(false)
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <GlassButton
        size="sm"
        active={open}
        onClick={() => setOpen(o => !o)}
        icon={<BookmarkIcon />}
        iconRight={saved.length > 0 ? (
          <span style={{
            padding: '1px 5px',
            background: 'var(--border)',
            color: 'var(--ink-muted)',
            fontSize: '9px', fontWeight: 700, borderRadius: '3px',
            fontFamily: 'var(--font-data, var(--font-display))',
          }}>{saved.length}</span>
        ) : undefined}
      >
        Recherches sauvées
      </GlassButton>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          minWidth: '280px',
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          zIndex: 50,
          overflow: 'hidden',
          fontFamily: 'var(--font-display)',
        }}>
          {/* Save current section */}
          <div style={{
            padding: '10px 12px',
            borderBottom: '1px solid var(--border)',
          }}>
            {!namingMode ? (
              <button
                onClick={() => setNamingMode(true)}
                disabled={!hasActiveFilters}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  background: hasActiveFilters ? 'var(--ink)' : 'var(--border)',
                  color: hasActiveFilters ? 'var(--surface)' : 'var(--ink-muted)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: hasActiveFilters ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-display)',
                }}
                title={hasActiveFilters ? 'Sauver la recherche actuelle' : 'Aucun filtre actif à sauver'}
              >
                + Sauver la recherche actuelle
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')   handleSave()
                    if (e.key === 'Escape')  { setNamingMode(false); setNewName('') }
                  }}
                  placeholder="Nom de la recherche…"
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    outline: 'none',
                    fontFamily: 'var(--font-display)',
                  }}
                />
                <button
                  onClick={handleSave}
                  disabled={!newName.trim()}
                  style={{
                    padding: '7px 12px',
                    background: newName.trim() ? 'var(--ink)' : 'var(--border)',
                    color: newName.trim() ? 'var(--surface)' : 'var(--ink-muted)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: newName.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: 'var(--font-display)',
                  }}
                >OK</button>
              </div>
            )}
          </div>

          {/* Saved list */}
          {saved.length === 0 ? (
            <div style={{
              padding: '20px 12px',
              textAlign: 'center',
              fontSize: '11px',
              color: 'var(--ink-faint)',
            }}>Aucune recherche sauvée pour le moment.</div>
          ) : (
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {saved.map((s) => (
                <SavedRow
                  key={s.id}
                  search={s}
                  onLoad={() => handleLoad(s)}
                  onDelete={() => handleDelete(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SavedRow({
  search, onLoad, onDelete,
}: {
  search: SavedSearch
  onLoad: () => void
  onDelete: () => void
}) {
  const summary = summarizeFilters(search.filters)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '8px',
        padding: '9px 12px',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <button
        onClick={onLoad}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
          minWidth: 0,
        }}
      >
        <div style={{
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--ink)',
          fontFamily: 'var(--font-display)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '2px',
        }}>{search.name}</div>
        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-display)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{summary}</div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (window.confirm(`Supprimer "${search.name}" ?`)) onDelete()
        }}
        title="Supprimer"
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--ink-faint)',
          fontSize: '11px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.12s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--accent)'
          e.currentTarget.style.borderColor = 'var(--accent)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--ink-faint)'
          e.currentTarget.style.borderColor = 'var(--border)'
        }}
      >×</button>
    </div>
  )
}

/* ── Helpers ──────────────────────────────── */

function summarizeFilters(f: ExplorerFilters): string {
  const parts: string[] = []
  if (f.q) parts.push(`"${f.q}"`)
  if (f.lang !== 'ALL') parts.push(f.lang)
  if (f.set) parts.push(f.set)
  if (f.rarity) parts.push(f.rarity)
  if (f.minPrice != null || f.maxPrice != null) {
    const range = `${f.minPrice ?? '0'}–${f.maxPrice ?? '∞'}€`
    parts.push(range)
  }
  if (f.hasGraded) parts.push('gradées')
  return parts.length ? parts.join(' · ') : 'Aucun filtre'
}

function BookmarkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path
        d="M2.5 1.5h6v8L5.5 7 2.5 9.5v-8z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
