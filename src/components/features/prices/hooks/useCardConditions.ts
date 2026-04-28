'use client'

/**
 * useCardConditions — fetches per-condition price breakdown for a single card.
 *
 * Returns a structured object indexed by source × condition:
 *   { ebay: { NEAR_MINT: {...}, LIGHTLY_PLAYED: {...}, ... },
 *     tcgplayer: { NEAR_MINT: {...}, ... } }
 *
 * Use case: Spotlight bloc "Prix par condition" — shows the value gradient
 * across NM → LP → MP → HP → DAMAGED for collectors making informed
 * buy/sell decisions.
 *
 * Source: prices_v2_by_condition view (latest snapshot per (card_ref, source, condition)).
 */

import { useEffect, useState } from 'react'

export type CardCondition =
  | 'NEAR_MINT'
  | 'LIGHTLY_PLAYED'
  | 'MODERATELY_PLAYED'
  | 'HEAVILY_PLAYED'
  | 'DAMAGED'

export type CardSource = 'ebay' | 'tcgplayer'

export interface ConditionPrice {
  price_avg: number | null
  price_low: number | null
  price_high: number | null
  price_median: number | null
  nb_sales: number | null
  currency: string
  fetched_at: string
}

export interface ConditionBreakdown {
  ebay: Partial<Record<CardCondition, ConditionPrice>>
  tcgplayer: Partial<Record<CardCondition, ConditionPrice>>
}

export interface UseCardConditionsResult {
  conditions: ConditionBreakdown | null
  loading: boolean
  error: string | null
  /** True if any condition data is available */
  hasData: boolean
}

const EMPTY_BREAKDOWN: ConditionBreakdown = { ebay: {}, tcgplayer: {} }

/**
 * Hook to fetch per-condition prices for a card.
 *
 * @param cardRef - PokeTrace card ID (UUID like "019bff77-bef8-...")
 *                  or null/undefined to skip fetching
 */
export function useCardConditions(
  cardRef: string | null | undefined
): UseCardConditionsResult {
  const [conditions, setConditions] = useState<ConditionBreakdown | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!cardRef) {
      setConditions(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/prices/conditions?card_ref=${encodeURIComponent(cardRef)}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return
        if (json.error) {
          setError(json.error)
          setLoading(false)
          return
        }
        setConditions(json.data || EMPTY_BREAKDOWN)
        setLoading(false)
      })
      .catch(e => {
        if (cancelled) return
        setError(e?.message || 'fetch failed')
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [cardRef])

  const hasData = !!conditions && (
    Object.keys(conditions.ebay).length > 0 ||
    Object.keys(conditions.tcgplayer).length > 0
  )

  return { conditions, loading, error, hasData }
}

/** Helper: get the best price across sources for a given condition */
export function getBestPriceForCondition(
  breakdown: ConditionBreakdown | null,
  condition: CardCondition
): ConditionPrice | null {
  if (!breakdown) return null
  const ebayPrice = breakdown.ebay[condition]?.price_avg ?? null
  const tcgPrice = breakdown.tcgplayer[condition]?.price_avg ?? null
  if (ebayPrice == null && tcgPrice == null) return null
  if (ebayPrice == null) return breakdown.tcgplayer[condition] ?? null
  if (tcgPrice == null) return breakdown.ebay[condition] ?? null
  return ebayPrice >= tcgPrice
    ? breakdown.ebay[condition] ?? null
    : breakdown.tcgplayer[condition] ?? null
}

/** Conditions ordered from best to worst quality */
export const CONDITION_ORDER: CardCondition[] = [
  'NEAR_MINT',
  'LIGHTLY_PLAYED',
  'MODERATELY_PLAYED',
  'HEAVILY_PLAYED',
  'DAMAGED',
]

/** Human-readable labels for UI */
export const CONDITION_LABELS: Record<CardCondition, string> = {
  NEAR_MINT: 'Near Mint',
  LIGHTLY_PLAYED: 'Lightly Played',
  MODERATELY_PLAYED: 'Moderately Played',
  HEAVILY_PLAYED: 'Heavily Played',
  DAMAGED: 'Damaged',
}

/** Short labels for compact UI (badges, columns) */
export const CONDITION_SHORT: Record<CardCondition, string> = {
  NEAR_MINT: 'NM',
  LIGHTLY_PLAYED: 'LP',
  MODERATELY_PLAYED: 'MP',
  HEAVILY_PLAYED: 'HP',
  DAMAGED: 'DMG',
}
