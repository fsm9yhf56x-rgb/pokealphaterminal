'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from './supabase'

/* ── Types ───────────────────────────────────── */

export type Lang = 'ALL' | 'EN' | 'FR' | 'JA'
export type SortField = 'top_price' | 'card_name' | 'cardmarket_trend' | 'ebay_sales'
export type SortDir   = 'asc' | 'desc'
export type ViewMode  = 'grid' | 'table'

export interface ExplorerFilters {
  q: string
  lang: Lang
  set: string | null         // set_slug or null
  rarity: string | null      // rarity_normalized or null
  minPrice: number | null
  maxPrice: number | null
  hasGraded: boolean | null  // null = all, true = only graded
  sortField: SortField
  sortDir: SortDir
  page: number
}

export interface ExplorerResult {
  card_ref: string
  card_name: string
  set_name: string | null
  set_slug: string | null
  tcgdex_set_id: string | null
  card_number: string | null
  lang: string | null
  rarity: string | null
  top_price: number
  cardmarket_trend: number | null
  ebay_avg: number | null
  ebay_sales: number | null
  tcg_avg: number | null
  psa10_avg: number | null
  has_graded: boolean
  tier: string | null
  variant: string | null
}

const PAGE_SIZE = 50

const DEFAULT_FILTERS: ExplorerFilters = {
  q: '',
  lang: 'ALL',
  set: null,
  rarity: null,
  minPrice: null,
  maxPrice: null,
  hasGraded: null,
  sortField: 'top_price',
  sortDir: 'desc',
  page: 0,
}

/* ── Hook ────────────────────────────────────── */

export function useExplorerSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<ExplorerFilters>(() =>
    parseURLToFilters(searchParams)
  )
  const [view, setView] = useState<ViewMode>('grid')

  const [results, setResults] = useState<ExplorerResult[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce timer for q
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Sync filters → URL */
  useEffect(() => {
    const url = filtersToURL(filters)
    const current = searchParams.toString()
    if (url !== current) {
      router.replace(`/market/explorer${url ? '?' + url : ''}`, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  /* Run search query (debounced for q field) */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(filters), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  async function runSearch(f: ExplorerFilters) {
    setLoading(true)
    setError(null)

    try {
      // Build query
      let q = (supabase as any)
        .from('prices_v2')
        .select('*', { count: 'exact' })
        .gt('top_price', 0)

      if (f.q && f.q.trim().length > 0) {
        q = q.ilike('card_name', `%${f.q.trim()}%`)
      }
      if (f.set) q = q.eq('set_slug', f.set)
      if (f.minPrice != null) q = q.gte('top_price', f.minPrice)
      if (f.maxPrice != null) q = q.lte('top_price', f.maxPrice)
      if (f.hasGraded === true) q = q.eq('has_graded', true)

      // Sort
      q = q.order(f.sortField, { ascending: f.sortDir === 'asc', nullsFirst: false })

      // Pagination
      const from = f.page * PAGE_SIZE
      const to   = from + PAGE_SIZE - 1
      q = q.range(from, to)

      const { data, count, error: qErr } = await q

      if (qErr) throw new Error(qErr.message)

      let rows = (data || []) as any[]

      // Lang/rarity filter (client-side, since prices_v2 doesn't have lang directly)
      // For Vague 1 we skip lang filtering and add it via JOIN in Vague 2 if needed
      // (or use card_aliases JOIN here later)

      const enriched: ExplorerResult[] = rows.map(r => ({
        card_ref: r.card_ref,
        card_name: r.card_name || 'Unknown',
        set_name: r.set_name,
        set_slug: r.set_slug,
        tcgdex_set_id: r.tcgdex_set_id || null,
        card_number: r.card_number || null,
        lang: r.lang || null,  // Resolved via set_aliases JOIN in prices_v2
        rarity: null,
        top_price: Number(r.top_price) || 0,
        cardmarket_trend: r.cardmarket_trend != null ? Number(r.cardmarket_trend) : null,
        ebay_avg: r.ebay_avg != null ? Number(r.ebay_avg) : null,
        ebay_sales: r.ebay_sales,
        tcg_avg: r.tcg_avg != null ? Number(r.tcg_avg) : null,
        psa10_avg: r.psa10_avg != null ? Number(r.psa10_avg) : null,
        has_graded: !!r.has_graded,
        tier: r.tier,
        variant: r.variant,
      }))

      setResults(enriched)
      setTotal(count || 0)
    } catch (e: any) {
      console.warn('[useExplorerSearch]', e)
      setError(e.message || 'Search failed')
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  /* Filter setters */
  const updateFilter = useCallback(<K extends keyof ExplorerFilters>(
    key: K, value: ExplorerFilters[K]
  ) => {
    setFilters(prev => {
      // Reset page if anything changes (except page itself)
      const newFilters = { ...prev, [key]: value }
      if (key !== 'page') newFilters.page = 0
      return newFilters
    })
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hasResults = results.length > 0
  const showingFrom = total === 0 ? 0 : filters.page * PAGE_SIZE + 1
  const showingTo   = Math.min((filters.page + 1) * PAGE_SIZE, total)

  return {
    /* State */
    filters, view, results, total, loading, error,
    /* Computed */
    totalPages, hasResults, showingFrom, showingTo, pageSize: PAGE_SIZE,
    /* Setters */
    updateFilter, resetFilters, setView,
  }
}

/* ── URL ↔ Filters serialization ─────────────── */

function parseURLToFilters(params: URLSearchParams | ReadonlyURLSearchParams): ExplorerFilters {
  const get = (k: string) => params.get(k)
  return {
    q: get('q') || '',
    lang: (get('lang') as Lang) || 'ALL',
    set: get('set'),
    rarity: get('rarity'),
    minPrice: get('min') ? Number(get('min')) : null,
    maxPrice: get('max') ? Number(get('max')) : null,
    hasGraded: get('graded') === '1' ? true : null,
    sortField: (get('sort') as SortField) || 'top_price',
    sortDir: (get('dir') as SortDir) || 'desc',
    page: Number(get('p') || 0),
  }
}

function filtersToURL(f: ExplorerFilters): string {
  const p = new URLSearchParams()
  if (f.q)              p.set('q', f.q)
  if (f.lang !== 'ALL') p.set('lang', f.lang)
  if (f.set)            p.set('set', f.set)
  if (f.rarity)         p.set('rarity', f.rarity)
  if (f.minPrice != null) p.set('min', String(f.minPrice))
  if (f.maxPrice != null) p.set('max', String(f.maxPrice))
  if (f.hasGraded)      p.set('graded', '1')
  if (f.sortField !== 'top_price') p.set('sort', f.sortField)
  if (f.sortDir   !== 'desc')      p.set('dir', f.sortDir)
  if (f.page > 0)       p.set('p', String(f.page))
  return p.toString()
}

// Type alias to avoid Next.js TypeScript pain on ReadonlyURLSearchParams
type ReadonlyURLSearchParams = ReturnType<typeof useSearchParams>
