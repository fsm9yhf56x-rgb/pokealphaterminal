'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ExplorerFilters as TFilters, Lang } from '@/lib/useExplorerSearch'
import { GlassButton } from '@/components/ui/GlassButton'

/**
 * Panel filtres avancés (collapsible, ouvert/fermé par parent).
 * Filtres : Lang · Set · Rareté · Prix range · Graded only · Reset.
 */
export function ExplorerFilters({
  filters, updateFilter, resetFilters,
}: {
  filters: TFilters
  updateFilter: <K extends keyof TFilters>(k: K, v: TFilters[K]) => void
  resetFilters: () => void
}) {
  const [setOptions, setSetOptions] = useState<{ slug: string; name: string }[]>([])
  const [rarityOptions, setRarityOptions] = useState<string[]>([])
  const [optsLoading, setOptsLoading] = useState(true)

  /* Load distinct sets + rarities once at mount */
  useEffect(() => {
    let cancelled = false
    loadOptions()
    async function loadOptions() {
      setOptsLoading(true)
      try {
        const [setsRes, rarRes] = await Promise.all([
          (supabase as any)
            .from('prices_v2')
            .select('set_slug, set_name')
            .gt('top_price', 0)
            .limit(2000),
          (supabase as any)
            .from('card_aliases')
            .select('rarity_normalized')
            .not('rarity_normalized', 'is', null)
            .limit(5000),
        ])

        if (cancelled) return

        // Dedupe sets
        const setMap = new Map<string, string>()
        for (const r of (setsRes.data || []) as any[]) {
          if (r.set_slug) setMap.set(r.set_slug, r.set_name || r.set_slug)
        }
        const sets = [...setMap.entries()]
          .map(([slug, name]) => ({ slug, name }))
          .sort((a, b) => a.name.localeCompare(b.name))

        // Dedupe rarities
        const rarSet = new Set<string>()
        for (const r of (rarRes.data || []) as any[]) {
          if (r.rarity_normalized) rarSet.add(r.rarity_normalized)
        }
        const rarities = [...rarSet].sort()

        setSetOptions(sets)
        setRarityOptions(rarities)
      } finally {
        if (!cancelled) setOptsLoading(false)
      }
    }
    return () => { cancelled = true }
  }, [])

  const hasActiveFilters =
    filters.lang !== 'ALL' ||
    filters.set != null ||
    filters.rarity != null ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    filters.hasGraded != null

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '16px 18px',
      animation: 'slideDown 0.2s ease-out',
    }}>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
      }}>
        {/* Lang */}
        <Field label="Langue">
          <SegmentedControl
            options={[
              { value: 'ALL', label: 'Toutes' },
              { value: 'EN',  label: 'EN' },
              { value: 'FR',  label: 'FR' },
              { value: 'JA',  label: 'JA' },
            ]}
            value={filters.lang}
            onChange={(v) => updateFilter('lang', v as Lang)}
          />
        </Field>

        {/* Set */}
        <Field label="Set">
          <Select
            value={filters.set || ''}
            onChange={(v) => updateFilter('set', v || null)}
            disabled={optsLoading}
          >
            <option value="">Tous les sets</option>
            {setOptions.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </Select>
        </Field>

        {/* Rarity */}
        <Field label="Rareté">
          <Select
            value={filters.rarity || ''}
            onChange={(v) => updateFilter('rarity', v || null)}
            disabled={optsLoading}
          >
            <option value="">Toutes les raretés</option>
            {rarityOptions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </Field>

        {/* Price range */}
        <Field label="Prix (€)">
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <NumberInput
              placeholder="Min"
              value={filters.minPrice ?? ''}
              onChange={(v) => updateFilter('minPrice', v === '' ? null : Number(v))}
            />
            <span style={{ color: 'var(--ink-faint)', fontSize: '12px' }}>—</span>
            <NumberInput
              placeholder="Max"
              value={filters.maxPrice ?? ''}
              onChange={(v) => updateFilter('maxPrice', v === '' ? null : Number(v))}
            />
          </div>
        </Field>

        {/* Graded toggle */}
        <Field label="État">
          <SegmentedControl
            options={[
              { value: 'all',    label: 'Toutes' },
              { value: 'graded', label: 'Gradées' },
            ]}
            value={filters.hasGraded ? 'graded' : 'all'}
            onChange={(v) => updateFilter('hasGraded', v === 'graded' ? true : null)}
          />
        </Field>
      </div>

      {/* Footer : reset + active count */}
      {hasActiveFilters && (
        <div style={{
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <span style={{
            fontSize: '11px',
            color: 'var(--ink-muted)',
            fontFamily: 'var(--font-display)',
          }}>
            Filtres actifs · les résultats sont restreints
          </span>
          <GlassButton size="sm" onClick={resetFilters}>Réinitialiser</GlassButton>
        </div>
      )}
    </div>
  )
}

/* ── Form atoms ──────────────────────────── */

function Field({
  label, children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div style={{
        fontSize: '9px',
        fontWeight: 600,
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '6px',
        fontFamily: 'var(--font-display)',
      }}>{label}</div>
      {children}
    </div>
  )
}

function SegmentedControl({
  options, value, onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      padding: '3px',
      background: 'rgba(255,255,255,0.5)',
      backdropFilter: 'blur(18px) saturate(180%)',
      WebkitBackdropFilter: 'blur(18px) saturate(180%)',
      border: '0.5px solid rgba(255,255,255,0.6)',
      borderRadius: '999px',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
    }}>
      {options.map((opt) => {
        const on = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: '999px',
              border: 'none',
              background: on
                ? 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)'
                : 'transparent',
              color: on ? 'var(--ink)' : 'var(--ink-muted)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              transition: 'all 0.18s cubic-bezier(.2,.8,.2,1)',
              boxShadow: on ? '0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)' : 'none',
            }}
          >{opt.label}</button>
        )
      })}
    </div>
  )
}

function Select({
  value, onChange, disabled, children,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none',
          width: '100%',
          padding: '8px 28px 8px 10px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          background: 'var(--surface)',
          color: disabled ? 'var(--ink-faint)' : 'var(--ink)',
          fontSize: '12px',
          cursor: disabled ? 'wait' : 'pointer',
          fontFamily: 'var(--font-display)',
          outline: 'none',
          opacity: disabled ? 0.5 : 1,
        }}
      >{children}</select>
      <svg
        width="10" height="10" viewBox="0 0 10 10" fill="none"
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--ink-muted)',
          pointerEvents: 'none',
        }}
      >
        <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function NumberInput({
  value, onChange, placeholder,
}: {
  value: number | string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        flex: 1,
        width: '100%',
        padding: '8px 10px',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        background: 'var(--surface)',
        color: 'var(--ink)',
        fontSize: '12px',
        outline: 'none',
        fontFamily: 'var(--font-data, var(--font-display))',
        boxSizing: 'border-box',
      }}
    />
  )
}
