'use client'

import { useEffect, useRef } from 'react'
import { GlassButton } from '@/components/ui/GlassButton'

/**
 * Barre de recherche principale + toggle pour le panel filtres.
 * Auto-focus au mount, ⌘K shortcut pour focus.
 */
export function ExplorerSearch({
  q, onChange, onToggleFilters, filtersOpen, loading,
}: {
  q: string
  onChange: (q: string) => void
  onToggleFilters: () => void
  filtersOpen: boolean
  loading: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
        <SearchIcon />
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Rechercher une carte, un set, un Pokémon…"
          autoFocus
          style={{
            width: '100%',
            padding: '12px 12px 12px 38px',
            paddingRight: q || loading ? '70px' : '60px',
            border: '1px solid var(--border-strong)',
            borderRadius: '999px',
            fontSize: '14px',
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(18px) saturate(180%)',
            WebkitBackdropFilter: 'blur(18px) saturate(180%)',
            color: 'var(--ink)',
            outline: 'none',
            fontFamily: 'var(--font-display)',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--ink)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.04)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-strong)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
        <div style={{
          position: 'absolute', right: '12px', display: 'flex',
          alignItems: 'center', gap: '6px', pointerEvents: 'none',
        }}>
          {loading && <Spinner />}
          {q && !loading && (
            <button
              onClick={() => onChange('')}
              title="Effacer"
              style={{
                width: '20px', height: '20px', borderRadius: '50%',
                background: 'var(--border)', border: 'none', color: 'var(--ink-muted)',
                fontSize: '11px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto',
                fontFamily: 'var(--font-display)', lineHeight: 1,
              }}
            >×</button>
          )}
          {!q && !loading && (
            <kbd style={{
              fontSize: '10px', color: 'var(--ink-faint)',
              fontFamily: 'var(--font-data, var(--font-display))',
              background: 'var(--border)', padding: '2px 6px',
              borderRadius: '4px', border: '1px solid var(--border-strong)',
            }}>⌘K</kbd>
          )}
        </div>
      </div>

      {/* Filtres toggle — GlassButton active */}
      <GlassButton
        active={filtersOpen}
        onClick={onToggleFilters}
        title={filtersOpen ? 'Fermer les filtres' : 'Ouvrir les filtres'}
        icon={<FiltersIcon active={filtersOpen} />}
        style={{ padding: '11px 16px', flexShrink: 0 }}
      >
        Filtres
      </GlassButton>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ position: 'absolute', left: '14px', color: 'var(--ink-muted)', pointerEvents: 'none' }}>
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function FiltersIcon({ active }: { active: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M1.5 3h10M3 6.5h7M5 10h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function Spinner() {
  return (
    <>
      <div style={{
        width: '14px', height: '14px', border: '2px solid var(--border)',
        borderTopColor: 'var(--accent)', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
