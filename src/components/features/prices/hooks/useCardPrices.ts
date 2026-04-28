'use client'

/**
 * useCardPrices — fetches per-card price details and exposes them in the
 * shape Holdings/Encyclopedie already consume:
 *
 *   Record<dkKey, { ebay, tcg, cardmarket, poketrace, estimated }>
 *
 * Where dkKey is one of:
 *   - "{set_slug}|{variant}|{number}"    (variant-specific)
 *   - "{set_slug}||{number}"             (variant-agnostic fallback)
 *
 * Design choices:
 *   - eBay/TCG values are only stored when source='poketrace' (sold-approximated)
 *     to avoid mixing active listings (Browse API) into our valuation layer.
 *     Browse listings live in the Deal Hunter, not here.
 *   - Cardmarket values are stored regardless of source (TCGdex aggregates
 *     Cardmarket trends, all considered "market truth").
 *   - Estimated weighted average: eBay 40% / TCG 30% / Cardmarket 30%.
 *     Falls back to PokeTrace top_price if no breakdown available.
 *
 * Usage:
 *   const { priceDetails, priceMap, loading } = useCardPrices(setIds, { byName: true })
 *
 * Params:
 *   setIds          : portfolio set IDs (with our internal slugs like
 *                     "base1-shadowless"). They get resolved to PokeTrace
 *                     slugs via /data/set-mapping-poketrace.json.
 *                     Pass null/undefined/empty array to fetch ALL prices
 *                     (used by Encyclopedie which displays all cards).
 *   options.byName  : if true, also indexes by lowercase card_name (Holdings
 *                     does this, Encyclopedie does not).
 */

import { useEffect, useRef, useState } from 'react'

const USD_TO_EUR = 0.92

export interface PriceDetail {
  ebay: number | null
  tcg: number | null
  cardmarket: number | null
  poketrace: number | null
  estimated: number | null
}

export interface PriceMapEntry {
  ebay: number | null
  tcg: number | null
  top: number | null
  tier: string | null
  /** internal — source priority marker ('pt' or 'ebay') */
  _src?: 'pt' | 'ebay'
}

export interface UseCardPricesResult {
  /** Indexed by "{set_slug}|{variant}|{number}" and "{set_slug}||{number}". */
  priceDetails: Record<string, PriceDetail>
  /** Indexed by variant key, slug key, and (if byName) name key. */
  priceMap: Record<string, PriceMapEntry>
  /** Set mapping (our internal setId → PokeTrace slug). */
  setMapping: Record<string, string>
  loading: boolean
  error: string | null
}

const cleanSetId = (s: string) => s.replace(/-shadowless(-ns)?|-1st/g, '')

function makePriceDetail(): PriceDetail {
  return { ebay: null, tcg: null, cardmarket: null, poketrace: null, estimated: null }
}

/**
 * Recompute weighted estimated price from the breakdown.
 * eBay 40% / TCG 30% / Cardmarket 30%.
 * Falls back to poketrace top_price if no breakdown.
 */
function recomputeEstimated(d: PriceDetail): void {
  const pairs: [number, number][] = []
  if (d.ebay) pairs.push([d.ebay, 0.4])
  if (d.tcg) pairs.push([d.tcg, 0.3])
  if (d.cardmarket) pairs.push([d.cardmarket, 0.3])
  if (pairs.length > 0) {
    const totalW = pairs.reduce((a, [, w]) => a + w, 0)
    d.estimated = Math.round((pairs.reduce((a, [p, w]) => a + p * w, 0) / totalW) * 100) / 100
  } else if (d.poketrace) {
    d.estimated = d.poketrace
  } else {
    d.estimated = null
  }
}

export function useCardPrices(
  setIds: (string | null | undefined)[] | null | undefined,
  options: { byName?: boolean } = {}
): UseCardPricesResult {
  const { byName = false } = options
  const [priceDetails, setPriceDetails] = useState<Record<string, PriceDetail>>({})
  const [priceMap, setPriceMap] = useState<Record<string, PriceMapEntry>>({})
  const [setMapping, setSetMapping] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  // Stable signature for the dependency array
  const setIdsKey = setIds && setIds.length > 0
    ? Array.from(new Set(setIds.filter(Boolean) as string[])).sort().join(',')
    : ''

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      try {
        // 1. Fetch set mapping
        const mappingRes = await fetch('/data/set-mapping-poketrace.json').catch(() => null)
        const mapping: Record<string, string> = mappingRes ? await mappingRes.json().catch(() => ({})) : {}
        if (!cancelled && mounted.current) setSetMapping(mapping)

        // 2. Build query: filtered by setIds if provided, else fetch all
        let url = '/api/prices'
        if (setIdsKey) {
          const ids = setIdsKey.split(',')
          const slugs = Array.from(new Set(
            ids.map(sid => mapping[sid] || mapping[cleanSetId(sid)] || '').filter(Boolean)
          ))
          if (slugs.length > 0) {
            url = '/api/prices?sets=' + slugs.join(',')
          } else {
            // No mapping found — return empty to avoid loading all prices unintentionally
            if (!cancelled && mounted.current) {
              setPriceDetails({})
              setPriceMap({})
              setLoading(false)
            }
            return
          }
        }

        const res = await fetch(url)
        const json = await res.json().catch(() => ({ data: null }))
        const data: any[] = json.data || []
        if (cancelled) return

        const details: Record<string, PriceDetail> = {}
        const map: Record<string, PriceMapEntry> = {}

        for (const p of data) {
          const isPT = p.source !== 'ebay'

          // ── priceMap construction ──
          if (p.card_number && p.set_slug) {
            const num = String(p.card_number).split('/')[0].replace(/^0+/, '') || '0'

            if (p.variant) {
              const vk = `${p.set_slug}|${p.variant}|${num}`
              const ex = map[vk]
              if (
                !ex ||
                (isPT && ex._src === 'ebay') ||
                (isPT === (ex._src !== 'ebay') && p.top_price && p.top_price > (ex.top || 0))
              ) {
                map[vk] = { ebay: p.ebay_avg, tcg: p.tcg_avg, top: p.top_price, tier: p.tier, _src: isPT ? 'pt' : 'ebay' }
              }
            }

            const sk = `${p.set_slug}|${num}`
            const exS = map[sk]
            if (
              !exS ||
              (isPT && exS._src === 'ebay') ||
              (isPT === (exS._src !== 'ebay') && p.top_price && p.top_price > (exS.top || 0))
            ) {
              map[sk] = { ebay: p.ebay_avg, tcg: p.tcg_avg, top: p.top_price, tier: p.tier, _src: isPT ? 'pt' : 'ebay' }
            }
          }

          if (byName) {
            const key = (p.card_name || '').toLowerCase()
            if (key) {
              // Use LOWEST price as conservative fallback by name
              const ex = map[key]
              if (!ex || (p.top_price && (!ex.top || p.top_price < ex.top))) {
                map[key] = { ebay: p.ebay_avg, tcg: p.tcg_avg, top: p.top_price, tier: p.tier }
              }
            }
          }

          // ── priceDetails construction ──
          if (!p.card_number || !p.set_slug) continue
          const num = String(p.card_number).split('/')[0].replace(/^0+/, '') || '0'
          const variant = p.variant || ''
          const dk = `${p.set_slug}|${variant}|${num}`
          if (!details[dk]) details[dk] = makePriceDetail()
          const d = details[dk]

          // Only store eBay/TCG/PokeTrace from PokeTrace source (sold-approximated).
          // Active eBay Browse listings stay out of valuation — they live in Deal Hunter.
          if (isPT && p.ebay_avg && (!d.ebay || p.ebay_avg > d.ebay)) {
            d.ebay = Math.round(p.ebay_avg * USD_TO_EUR * 100) / 100
          }
          if (isPT && p.tcg_avg && (!d.tcg || p.tcg_avg > d.tcg)) {
            d.tcg = Math.round(p.tcg_avg * USD_TO_EUR * 100) / 100
          }
          if (isPT && p.top_price && (!d.poketrace || p.top_price > d.poketrace)) {
            d.poketrace = Math.round(p.top_price * USD_TO_EUR * 100) / 100
          }
          // Cardmarket is always stored (TCGdex source = Cardmarket aggregate)
          if (p.cardmarket_avg && (!d.cardmarket || p.cardmarket_avg > d.cardmarket)) {
            d.cardmarket = Math.round(p.cardmarket_avg * 100) / 100
          }

          // Mirror to no-variant key (for fallback when card has no specific variant)
          const dk2 = `${p.set_slug}||${num}`
          if (variant && dk2 !== dk) {
            if (!details[dk2]) details[dk2] = makePriceDetail()
            const d2 = details[dk2]
            if (isPT && p.ebay_avg && (!d2.ebay || p.ebay_avg > d2.ebay)) {
              d2.ebay = Math.round(p.ebay_avg * USD_TO_EUR * 100) / 100
            }
            if (isPT && p.tcg_avg && (!d2.tcg || p.tcg_avg > d2.tcg)) {
              d2.tcg = Math.round(p.tcg_avg * USD_TO_EUR * 100) / 100
            }
            if (isPT && p.top_price && (!d2.poketrace || p.top_price > d2.poketrace)) {
              d2.poketrace = Math.round(p.top_price * USD_TO_EUR * 100) / 100
            }
            if (p.cardmarket_avg && (!d2.cardmarket || p.cardmarket_avg > d2.cardmarket)) {
              d2.cardmarket = Math.round(p.cardmarket_avg * 100) / 100
            }
          }
        }

        // Recompute estimated for every detail key
        for (const k of Object.keys(details)) recomputeEstimated(details[k])

        if (!cancelled && mounted.current) {
          setPriceDetails(details)
          setPriceMap(map)
          setLoading(false)
        }
      } catch (e: any) {
        if (!cancelled && mounted.current) {
          setError(e?.message || 'Unknown error')
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [setIdsKey, byName])

  return { priceDetails, priceMap, setMapping, loading, error }
}

/**
 * pickPrice — centralizes the variant-aware price lookup logic.
 * Tries variant key first, then variant alternatives (holo/normal),
 * then falls back to no-variant key.
 *
 * Used by Holdings/Encyclopedie when displaying a card's price details.
 */
export function pickPrice(
  priceDetails: Record<string, PriceDetail>,
  setSlug: string,
  number: string,
  variantHint?: string | null
): PriceDetail | null {
  if (!setSlug || !number) return null
  const num = String(number).split('/')[0].replace(/^0+/, '') || '0'

  // 1. Exact variant match
  if (variantHint) {
    const vk = `${setSlug}|${variantHint}|${num}`
    if (priceDetails[vk]?.estimated != null) return priceDetails[vk]
  }

  // 2. Common variant fallbacks
  const fallbacks = ['Unlimited_Holofoil', '1st_Edition_Holofoil', 'Holofoil', 'Normal']
  for (const v of fallbacks) {
    if (v === variantHint) continue
    const vk = `${setSlug}|${v}|${num}`
    if (priceDetails[vk]?.estimated != null) return priceDetails[vk]
  }

  // 3. No-variant key
  const nk = `${setSlug}||${num}`
  if (priceDetails[nk]?.estimated != null) return priceDetails[nk]

  return null
}
