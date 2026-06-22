'use client'

import { useEffect, useState } from 'react'

export interface CardInfo {
  id: string
  name: string
  local_id: string
  lang: 'EN' | 'FR' | 'JP' | string
  rarity_normalized: string
  image_url: string | null
  set_id: string
  set_name: string | null
  release_date: string | null
  era: string | null
}

export interface PriceEntry {
  variant: string
  condition: string | null
  price_avg: number
  price_low: number | null
  price_high: number | null
  currency: string
  nb_sales: number | null
  fetched_at: string
}

export interface HistoryPoint {
  date: string
  price: number
}

export interface KodoSignals {
  fairValueEur: number | null
  fairValueMethod: string | null
  coteFrEur: number | null
  coteLang: any | null
  liquidityScore: number | null
  spreadUsEuPct: number | null
  gradeEvPsa10Eur: number | null
}
export interface SpotlightData {
  card: CardInfo
  kodo: KodoSignals | null
  prices: {
    bySource: Record<string, PriceEntry[]>
    frByCondition?: Record<string, { price: number; saleCount: number; isAsking: boolean }>
    marketEst: number | null
    primaryCurrency: string
    history?: HistoryPoint[]
  }
}

export interface UseSpotlightDataResult {
  data: SpotlightData | null
  loading: boolean
  error: string | null
}

export function useSpotlightData(
  cardId: string | null | undefined,
  lang?: string | null,
  condition?: string | null,
): UseSpotlightDataResult {
  const [data, setData] = useState<SpotlightData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!cardId) { setData(null); return }
    let cancelled = false
    setLoading(true)
    setError(null)

    const langParam = lang ? `&lang=${encodeURIComponent(lang)}` : ''
    const condParam = condition ? `&condition=${encodeURIComponent(condition)}` : ''
    fetch(`/api/spotlight?card_id=${encodeURIComponent(cardId)}${langParam}${condParam}`)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        if (j.error) { setError(j.error); setLoading(false); return }
        setData(j)
        setLoading(false)
      })
      .catch(e => {
        if (cancelled) return
        setError(e?.message || 'fetch failed')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [cardId, lang, condition])

  return { data, loading, error }
}
