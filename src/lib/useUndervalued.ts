'use client'

import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export type SignalTier = 'S' | 'A' | 'B'

export interface UndervaluedSignal {
  card_ref: string
  card_name: string
  set_name: string | null
  set_slug: string | null
  card_number: string | null
  variant: string | null
  price_eu: number
  price_us: number
  gap_eur: number
  upside_pct: number
  ebay_sales: number
  has_graded: boolean
  confidence: number
  signal_tier: SignalTier
  reason: string
}

export interface UndervaluedFilters {
  tier: SignalTier | 'ALL'
  minUpside: number   // %
  minConfidence: number
}

const DEFAULT_FILTERS: UndervaluedFilters = {
  tier: 'ALL',
  minUpside: 0,
  minConfidence: 0,
}

/**
 * Hook qui charge tous les signaux sous-évalués depuis la vue SQL.
 * Filtres appliqués côté client (127 signaux ~30KB, négligeable).
 */
export function useUndervalued() {
  const [allSignals, setAllSignals] = useState<UndervaluedSignal[]>([])
  const [filters, setFilters] = useState<UndervaluedFilters>(DEFAULT_FILTERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* Load once at mount */
  useEffect(() => {
    let cancelled = false
    loadSignals()
    async function loadSignals() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: qErr } = await (supabase as any)
          .from('undervalued_signals_v1')
          .select('*')
        if (qErr) throw new Error(qErr.message)
        if (cancelled) return
        const enriched: UndervaluedSignal[] = (data || []).map((r: any) => ({
          card_ref: r.card_ref,
          card_name: r.card_name || 'Unknown',
          set_name: r.set_name,
          set_slug: r.set_slug,
          card_number: r.card_number,
          variant: r.variant,
          price_eu: Number(r.price_eu) || 0,
          price_us: Number(r.price_us) || 0,
          gap_eur: Number(r.gap_eur) || 0,
          upside_pct: Number(r.upside_pct) || 0,
          ebay_sales: Number(r.ebay_sales) || 0,
          has_graded: !!r.has_graded,
          confidence: Number(r.confidence) || 0,
          signal_tier: (r.signal_tier as SignalTier) || 'B',
          reason: r.reason || '',
        }))
        setAllSignals(enriched)
      } catch (e: any) {
        if (cancelled) return
        console.warn('[useUndervalued]', e)
        setError(e.message || 'Failed to load signals')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    return () => { cancelled = true }
  }, [])

  /* Apply filters */
  const filtered = allSignals.filter(s => {
    if (filters.tier !== 'ALL' && s.signal_tier !== filters.tier) return false
    if (filters.minUpside > 0 && s.upside_pct < filters.minUpside) return false
    if (filters.minConfidence > 0 && s.confidence < filters.minConfidence) return false
    return true
  })

  /* Stats per tier */
  const stats = {
    total: allSignals.length,
    sCount: allSignals.filter(s => s.signal_tier === 'S').length,
    aCount: allSignals.filter(s => s.signal_tier === 'A').length,
    bCount: allSignals.filter(s => s.signal_tier === 'B').length,
    avgUpside: allSignals.length > 0
      ? Math.round(allSignals.reduce((sum, s) => sum + s.upside_pct, 0) / allSignals.length)
      : 0,
    bestSignal: allSignals[0] || null,
  }

  function updateFilter<K extends keyof UndervaluedFilters>(k: K, v: UndervaluedFilters[K]) {
    setFilters(prev => ({ ...prev, [k]: v }))
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  return {
    signals: filtered,
    allSignals,
    stats,
    filters,
    updateFilter,
    resetFilters,
    loading,
    error,
  }
}
