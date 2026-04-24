'use client'

/**
 * usePriceHistory — React hook to fetch and cache /api/prices/history.
 *
 * Usage:
 *   const { data, loading, error } = usePriceHistory({
 *     card_ref: 'xxx',
 *     timeframe: '30d',
 *   });
 *
 * Features:
 *   - In-memory dedup: the same (card_ref, timeframe) pair never triggers
 *     two parallel requests across components.
 *   - Typed errors: `PRO_REQUIRED` lets callers render an upgrade CTA.
 *   - Auto-refetch when params change.
 *   - Cache is session-scoped (cleared on page reload) and lightweight.
 */

import { useEffect, useRef, useState } from 'react'
import type {
  PriceHistoryError,
  PriceHistoryResponse,
  PriceTimeframe,
} from '../types'

export interface UsePriceHistoryParams {
  card_ref: string | null | undefined
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

export function usePriceHistory(params: UsePriceHistoryParams): UsePriceHistoryResult {
  const { card_ref, timeframe, enabled = true } = params
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
    if (!enabled || !card_ref) {
      setData(null); setError(null); setLoading(false)
      return
    }

    const key = cacheKey(card_ref, timeframe)
    const now = Date.now()
    const cached = cache.get(key)

    if (cached?.kind === 'resolved' && now - cached.ts < CACHE_TTL_MS) {
      setData(cached.value); setError(null); setLoading(false)
      return
    }
    if (cached?.kind === 'error' && now - cached.ts < CACHE_TTL_MS) {
      setData(null); setError(cached.error); setLoading(false)
      return
    }

    setLoading(true); setError(null)

    let promise: Promise<PriceHistoryResponse>
    if (cached?.kind === 'pending') {
      promise = cached.promise
    } else {
      promise = fetchHistory(card_ref, timeframe)
      cache.set(key, { kind: 'pending', promise })
    }

    promise
      .then((value) => {
        cache.set(key, { kind: 'resolved', value, ts: Date.now() })
        if (!mountedRef.current) return
        setData(value); setError(null); setLoading(false)
      })
      .catch((err: any) => {
        const code: PriceHistoryErrorCode = err?.code || 'NETWORK'
        const message: string = err?.message || 'Unknown error'
        cache.set(key, { kind: 'error', error: { code, message }, ts: Date.now() })
        if (!mountedRef.current) return
        setData(null); setError({ code, message }); setLoading(false)
      })
  }, [card_ref, timeframe, enabled, nonce])

  const refetch = () => {
    if (card_ref) {
      cache.delete(cacheKey(card_ref, timeframe))
      setNonce((n) => n + 1)
    }
  }

  return { data, loading, error, refetch }
}
