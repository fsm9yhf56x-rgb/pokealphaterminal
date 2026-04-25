'use client'

import { useEffect, useRef, useState } from 'react'
import type { PsaPopResponse } from '@/lib/psa/types'

const TTL_MS = 60_000
const cache = new Map<string, { ts: number; data: PsaPopResponse }>()
const inflight = new Map<string, Promise<PsaPopResponse>>()

interface State {
  data: PsaPopResponse | null
  isLoading: boolean
  error: string | null
}

export function usePsaPop(cardRef: string | null | undefined) {
  const [state, setState] = useState<State>({ data: null, isLoading: !!cardRef, error: null })
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!cardRef) {
      setState({ data: null, isLoading: false, error: null })
      return
    }

    // Cache hit
    const hit = cache.get(cardRef)
    if (hit && Date.now() - hit.ts < TTL_MS) {
      setState({ data: hit.data, isLoading: false, error: null })
      return
    }

    // Dedup: parallel mounts share one fetch
    let promise = inflight.get(cardRef)
    if (!promise) {
      promise = fetch(`/api/psa/pop?card_ref=${encodeURIComponent(cardRef)}`)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err?.error || `HTTP ${res.status}`)
          }
          const json = (await res.json()) as PsaPopResponse
          cache.set(cardRef, { ts: Date.now(), data: json })
          return json
        })
        .finally(() => inflight.delete(cardRef))
      inflight.set(cardRef, promise)
    }

    setState((s) => ({ ...s, isLoading: true, error: null }))
    promise
      .then((data) => {
        if (mountedRef.current) setState({ data, isLoading: false, error: null })
      })
      .catch((err) => {
        if (mountedRef.current) setState({ data: null, isLoading: false, error: err.message })
      })
  }, [cardRef])

  return state
}
