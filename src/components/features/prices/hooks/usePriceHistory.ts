'use client'

/**
 * usePriceHistory — React hook to fetch and cache /api/prices/history.
 *
 * Supports BOTH:
 *   - single card_ref (legacy)
 *   - multiple card_refs (multi-source merge): all are fetched in parallel
 *     and their `consolidated` series are merged into one (max price per day,
 *     same logic as server-side top_price computation).
 *
 * In-memory dedup: same (card_ref, timeframe) pair never triggers two parallel requests.
 */

import { useEffect, useRef, useState } from 'react'
import type {
  PriceHistoryError,
  PriceHistoryResponse,
  PricePoint,
  PriceTimeframe,
  PriceStats,
} from '../types'

export interface UsePriceHistoryParams {
  card_ref?: string | null | undefined
  card_refs?: string[] | null | undefined
  timeframe: PriceTimeframe
  enabled?: boolean
}

export type PriceHistoryErrorCode = PriceHistoryError['code'] | 'NETWORK'

export interface UsePriceHistoryResult {
  data: PriceHistoryResponse | null
  loading: boolean
  error: { code: PriceHistoryErrorCode; message: string } | null
  refetch: () => void
}

type CacheEntry =
  | { kind: 'pending'; promise: Promise<PriceHistoryResponse> }
  | { kind: 'resolved'; value: PriceHistoryResponse; ts: number }
  | { kind: 'error'; error: { code: PriceHistoryErrorCode; message: string }; ts: number }

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60_000

function cacheKey(card_ref: string, timeframe: PriceTimeframe) {
  return `${card_ref}::${timeframe}`
}

async function fetchHistory(
  card_ref: string,
  timeframe: PriceTimeframe
): Promise<PriceHistoryResponse> {
  const params = new URLSearchParams({ card_ref, timeframe })
  const res = await fetch(`/api/prices/history?${params.toString()}`, { cache: 'default' })
  if (!res.ok) {
    let errBody: PriceHistoryError | null = null
    try { errBody = await res.json() } catch {}
    const e: any = new Error(errBody?.error || `HTTP ${res.status}`)
    e.code = errBody?.code || 'NETWORK'
    throw e
  }
  return (await res.json()) as PriceHistoryResponse
}

/**
 * Cached fetch — uses a single shared cache for both single and multi modes.
 */
async function cachedFetch(
  card_ref: string,
  timeframe: PriceTimeframe
): Promise<PriceHistoryResponse> {
  const key = cacheKey(card_ref, timeframe)
  const now = Date.now()
  const cached = cache.get(key)

  if (cached?.kind === 'resolved' && now - cached.ts < CACHE_TTL_MS) {
    return cached.value
  }
  if (cached?.kind === 'error' && now - cached.ts < CACHE_TTL_MS) {
    const e: any = new Error(cached.error.message)
    e.code = cached.error.code
    throw e
  }
  if (cached?.kind === 'pending') return cached.promise

  const promise = fetchHistory(card_ref, timeframe)
  cache.set(key, { kind: 'pending', promise })

  try {
    const value = await promise
    cache.set(key, { kind: 'resolved', value, ts: Date.now() })
    return value
  } catch (err: any) {
    const code: PriceHistoryErrorCode = err?.code || 'NETWORK'
    const message: string = err?.message || 'Unknown error'
    cache.set(key, { kind: 'error', error: { code, message }, ts: Date.now() })
    throw err
  }
}

/**
 * Merge multiple PriceHistoryResponse into one consolidated view.
 * - Keeps the richest currency (EUR > USD > GBP > others, deterministic).
 * - Concatenates `series` (preserving distinct source/variant pairs).
 * - Recomputes `consolidated` as max price per UTC day across all sources.
 * - Recomputes stats.current/ath/atl from the merged consolidated.
 */
function mergeResponses(responses: PriceHistoryResponse[]): PriceHistoryResponse {
  const valid = responses.filter(r => r != null)
  if (valid.length === 0) {
    // All insufficient → return the first (which has insufficient_data=true)
    return responses[0]
  }

  // Pick currency (EUR > USD > others)
  const priorityCurr = ['EUR', 'USD', 'GBP']
  const currencies = valid.map(r => r.currency).filter(Boolean)
  const currency = priorityCurr.find(c => currencies.includes(c)) || currencies[0] || 'USD'

  // Concat series
  const series = valid.flatMap(r => r.series || [])

  // Merge consolidated points by date — keep MAX price per day
  const byDate = new Map<string, PricePoint>()
  for (const r of valid) {
    for (const p of (r.consolidated || [])) {
      const existing = byDate.get(p.date)
      if (!existing || (p.price ?? 0) > (existing.price ?? 0)) {
        byDate.set(p.date, p)
      }
    }
  }
  const consolidated = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))

  // Recompute stats
  const prices = consolidated.map(p => p.price).filter((p): p is number => p != null)
  const current = prices.length ? prices[prices.length - 1] : null
  const ath = prices.length ? Math.max(...prices) : null
  const atl = prices.length ? Math.min(...prices) : null
  const athPoint = consolidated.find(p => p.price === ath) || null
  const atlPoint = consolidated.find(p => p.price === atl) || null

  // Compute change_7d_pct and change_30d_pct
  const now = Date.now()
  const find = (daysAgo: number) => {
    const target = now - daysAgo * 24 * 60 * 60 * 1000
    let best: PricePoint | null = null
    let bestDiff = Infinity
    for (const p of consolidated) {
      const t = new Date(p.date).getTime()
      const diff = Math.abs(t - target)
      if (diff < bestDiff) { bestDiff = diff; best = p }
    }
    return best
  }
  const p7 = find(7)
  const p30 = find(30)
  const change_7d_pct = (current != null && p7?.price != null && p7.price > 0)
    ? Math.round(((current - p7.price) / p7.price) * 1000) / 10 : null
  const change_30d_pct = (current != null && p30?.price != null && p30.price > 0)
    ? Math.round(((current - p30.price) / p30.price) * 1000) / 10 : null

  const stats: PriceStats = {
    current,
    ath: ath != null && athPoint ? { price: ath, date: athPoint.date } : null,
    atl: atl != null && atlPoint ? { price: atl, date: atlPoint.date } : null,
    change_7d_pct,
    change_30d_pct,
  }

  // raw_count and distinct_days = sum / max
  const raw_count = valid.reduce((s, r) => s + (r.raw_count || 0), 0)
  const distinct_days = consolidated.length

  return {
    card_ref: valid.map(r => r.card_ref).join(','),
    currency,
    timeframe: valid[0].timeframe,
    series,
    consolidated,
    stats,
    insufficient_data: consolidated.length < (valid[0].min_points_required ?? 5),
    min_points_required: valid[0].min_points_required,
    min_days_span_required: valid[0].min_days_span_required,
    raw_count,
    distinct_days,
  }
}

export function usePriceHistory(params: UsePriceHistoryParams): UsePriceHistoryResult {
  const { card_ref, card_refs, timeframe, enabled = true } = params

  // Resolve to a unique sorted list of refs
  const refsKey = (() => {
    const list: string[] = []
    if (card_ref) list.push(card_ref)
    if (card_refs?.length) list.push(...card_refs)
    return Array.from(new Set(list.filter(Boolean))).sort().join('|')
  })()

  const [data, setData] = useState<PriceHistoryResponse | null>(null)
  const [error, setError] = useState<UsePriceHistoryResult['error']>(null)
  const [loading, setLoading] = useState(false)
  const [nonce, setNonce] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!enabled || !refsKey) {
      setData(null); setError(null); setLoading(false)
      return
    }

    const refs = refsKey.split('|').filter(Boolean)
    setLoading(true); setError(null)

    Promise.all(refs.map(ref => cachedFetch(ref, timeframe).catch(err => ({ __error: err }))))
      .then((results) => {
        if (!mountedRef.current) return

        // Separate errors from successes
        const successes = results.filter((r): r is PriceHistoryResponse => !(r as any).__error)
        const errors = results.filter((r: any) => r.__error).map((r: any) => r.__error)

        if (successes.length === 0) {
          // All failed → propagate first error
          const err = errors[0]
          setError({ code: err?.code || 'NETWORK', message: err?.message || 'Unknown error' })
          setData(null)
        } else if (successes.length === 1) {
          setData(successes[0])
          setError(null)
        } else {
          setData(mergeResponses(successes))
          setError(null)
        }
        setLoading(false)
      })
  }, [refsKey, timeframe, enabled, nonce])

  const refetch = () => {
    if (refsKey) {
      const refs = refsKey.split('|').filter(Boolean)
      for (const r of refs) cache.delete(cacheKey(r, timeframe))
      setNonce((n) => n + 1)
    }
  }

  return { data, loading, error, refetch }
}
