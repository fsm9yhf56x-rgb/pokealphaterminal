'use client'

import { useState, useEffect } from 'react'

export type SignalTier = 'S' | 'A' | 'B'

export interface SpreadSignal {
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

export interface SpreadFilters {
  tier: SignalTier | 'ALL'
  minUpside: number   // %
  minConfidence: number
}

const DEFAULT_FILTERS: SpreadFilters = {
  tier: 'ALL',
  minUpside: 0,
  minConfidence: 0,
}

/**
 * Hook qui charge tous les signaux sous-évalués depuis la vue SQL.
 * Filtres appliqués côté client (127 signaux ~30KB, négligeable).
 */
export function useSpreads(enabled = true) {
  const [allSignals, setAllSignals] = useState<SpreadSignal[]>([])
  const [filters, setFilters] = useState<SpreadFilters>(DEFAULT_FILTERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* Load once at mount */
  useEffect(() => {
    if (!enabled) { setLoading(false); return }
    let cancelled = false
    loadSignals()
    async function loadSignals() {
      // TODO Kodo v2.0: Spreads Cross-Marketplace (feature SOON, cf /market/spreads).
      // Debranche de undervalued_signals_v1 (legacy <- prices_v2, en cours de suppression).
      // Recalcul a faire sur price_signals (spread_us_eu_pct / fair_value_eur / cote_fr_eur)
      // + price_matrix au moment du dev v2.0. Les consommateurs (HubInsight ignore v2,
      // HubKpis [0]||null, HubSpreadsTeaser = teaser SOON autonome) tolerent le vide.
      setLoading(false)
      setAllSignals([])
    }
    return () => { cancelled = true }
  }, [enabled])

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

  function updateFilter<K extends keyof SpreadFilters>(k: K, v: SpreadFilters[K]) {
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
