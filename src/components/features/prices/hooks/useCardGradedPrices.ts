'use client'

/**
 * useCardGradedPrices — fetches graded price breakdown for a single card.
 *
 * Returns a map of variant (e.g. "psa_10") to price object.
 * Variants supported: psa_*, cgc_*, bgs_*, sgc_*, pca_*, ccc_* (incl. half-grades).
 *
 * Source: prices_canonical view (latest snapshot per (tcg_card_id, variant)).
 */

import { useEffect, useState } from 'react'

export interface GradedPrice {
  price_avg: number
  price_low: number | null
  price_high: number | null
  currency: string
  source: string
  fetched_at: string
  nb_sales: number | null
}

export type GradedPricesMap = Record<string, GradedPrice>

export interface UseCardGradedPricesResult {
  prices: GradedPricesMap
  loading: boolean
  error: string | null
  hasData: boolean
}

const EMPTY: GradedPricesMap = {}

/**
 * @param params - either { tcgCardId } OR { setSlug, cardNumber }
 */
export function useCardGradedPrices(
  params:
    | { tcgCardId?: string | null; lang?: string | null }
    | { setSlug?: string | null; cardNumber?: string | null; lang?: string | null }
    | null
): UseCardGradedPricesResult {
  const [prices, setPrices] = useState<GradedPricesMap>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tcgCardId = (params as any)?.tcgCardId ?? null
  const setSlug = (params as any)?.setSlug ?? null
  const cardNumber = (params as any)?.cardNumber ?? null
  const lang = (params as any)?.lang ?? null

  useEffect(() => {
    if (!tcgCardId && !(setSlug && cardNumber)) {
      setPrices(EMPTY)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const langParam = lang ? `&lang=${encodeURIComponent(lang)}` : ''
    const url = tcgCardId
      ? `/api/prices/graded?tcg_card_id=${encodeURIComponent(tcgCardId)}${langParam}`
      : `/api/prices/graded?set_slug=${encodeURIComponent(setSlug!)}&card_number=${encodeURIComponent(cardNumber!)}${langParam}`

    fetch(url)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return
        if (json.error) {
          setError(json.error)
          setLoading(false)
          return
        }
        setPrices(json.data || EMPTY)
        setLoading(false)
      })
      .catch(e => {
        if (cancelled) return
        setError(e?.message || 'fetch failed')
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [tcgCardId, setSlug, cardNumber, lang])

  const hasData = Object.keys(prices).length > 0

  return { prices, loading, error, hasData }
}

/** Display order: highest-prestige grading first, then by grade desc */
export const GRADE_VARIANT_ORDER = [
  'psa_10', 'psa_9_5', 'psa_9', 'psa_8_5', 'psa_8', 'psa_7', 'psa_6', 'psa_5',
  'cgc_10', 'cgc_9_5', 'cgc_9', 'cgc_8_5', 'cgc_8', 'cgc_7',
  'bgs_10', 'bgs_9_5', 'bgs_9', 'bgs_8_5', 'bgs_8',
  'sgc_10', 'sgc_9_5', 'sgc_9', 'sgc_8',
  'pca_10', 'pca_9', 'pca_8',
  'ccc_10', 'ccc_9', 'ccc_8',
] as const

/** Display label: "PSA 10", "CGC 9.5", "BGS 9.5", etc. */
export function formatGradeLabel(variant: string): string {
  const m = variant.match(/^([a-z]+)_(\d+)(?:_(\d+))?$/)
  if (!m) return variant.toUpperCase()
  const [, slab, gradeInt, gradeDec] = m
  const grade = gradeDec ? `${gradeInt}.${gradeDec}` : gradeInt
  return `${slab.toUpperCase()} ${grade}`
}

/** Slab company short name */
export function getSlabCompany(variant: string): string {
  return variant.split('_')[0].toUpperCase()
}
