'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/* ── Types ───────────────────────────────────── */

export type Lang = 'ALL' | 'EN' | 'FR' | 'JA'
export type SortField = 'top_price' | 'card_name' | 'cardmarket_trend' | 'ebay_sales' | 'grade_ev' | 'spread_pct'
export type SortDir   = 'asc' | 'desc'
export type ViewMode  = 'grid' | 'table'

export interface ExplorerFilters {
  q: string
  lang: Lang
  set: string | null
  rarity: string | null
  minPrice: number | null
  maxPrice: number | null
  hasGraded: boolean | null
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
  top_source?: string | null
  top_sales?: number | null
  top_condition?: string | null
  fv_method?: string | null
  grade_ev?: number | null
  spread_pct?: number | null
  liquidity?: number | null
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
  // Anti-race: seule la derniere requete lancee peut ecrire le state
  const reqIdRef = useRef(0)

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
    const myReq = ++reqIdRef.current
    setLoading(true)
    setError(null)

    try {
      const url = `/api/market/explorer?${filtersToQuery(f)}`
      const res = await fetch(url)
      const json = await res.json()
      if (myReq !== reqIdRef.current) return // une requete plus recente a pris le relais
      if (json.error) throw new Error(json.error)

      setResults(Array.isArray(json.results) ? json.results : [])
      setTotal(Number(json.total) || 0)
    } catch (e: any) {
      if (myReq !== reqIdRef.current) return
      console.warn('[useExplorerSearch]', e)
      setError(e.message || 'Search failed')
      setResults([])
      setTotal(0)
    } finally {
      if (myReq === reqIdRef.current) setLoading(false)
    }
  }

  /* Filter setters */
  const updateFilter = useCallback(<K extends keyof ExplorerFilters>(
    key: K, value: ExplorerFilters[K]
  ) => {
    setFilters(prev => {
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

/* ── Query string pour l'API ─────────────────── */

function filtersToQuery(f: ExplorerFilters): string {
  const p = new URLSearchParams()
  if (f.q)                p.set('q', f.q.trim())
  if (f.lang !== 'ALL')   p.set('lang', f.lang)
  if (f.set)              p.set('set', f.set)
  if (f.rarity)           p.set('rarity', f.rarity)
  if (f.minPrice != null) p.set('min', String(f.minPrice))
  if (f.maxPrice != null) p.set('max', String(f.maxPrice))
  if (f.hasGraded)        p.set('graded', '1')
  p.set('sort', f.sortField)
  p.set('dir', f.sortDir)
  p.set('p', String(f.page))
  return p.toString()
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

type ReadonlyURLSearchParams = ReturnType<typeof useSearchParams>
