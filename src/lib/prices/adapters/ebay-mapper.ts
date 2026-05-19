/**
 * eBay Browse adapter — universal Pokemon card price extractor.
 *
 * Captures listings actifs from eBay US (Pokemon category 183454)
 * for ANY language (EN/FR/JP) via smart title parsing.
 *
 * Key responsibilities:
 *  - Build optimal search query per card (lang-aware)
 *  - Filter pollution (custom, proxy, lots, bundles, fakes)
 *  - Parse title to extract grade, condition, set, localId
 *  - Aggregate listings into median + range (IQR outlier filter)
 *  - Emit PriceSnapshot[] normalized to canonical schema
 */

import type { PriceSnapshot } from '../types'

// ============================================================
// CONFIGURATION
// ============================================================

const EBAY_POKEMON_CATEGORY = '183454'

const BLACKLIST_KEYWORDS = [
  'custom', 'proxy', 'fake', 'replica', 'reprint',
  'lot of', 'bundle', 'set of', 'collection of',
  'sticker', 'magnet', 'style', 'fan art', 'art only',
  'opened pack', 'mystery', 'random',
  'binder', 'sleeve', 'protector',
  'playmat', 'deck box',
] as const

// Grading patterns — order matters (specific first)
// Returns variant string compatible with prices_snapshots.variant
const GRADE_PATTERNS: Array<[RegExp, string]> = [
  [/\bPSA\s*10\b/i, 'psa_10'],
  [/\bPSA\s*9(?:\.5)?\b/i, 'psa_9'],
  [/\bPSA\s*8(?:\.5)?\b/i, 'psa_8'],
  [/\bPSA\s*7\b/i, 'psa_7'],
  [/\bBGS\s*10(?:\s*Black|\s*Pristine)?\b/i, 'bgs_10'],
  [/\bBGS\s*9\.?5\b/i, 'bgs_9_5'],
  [/\bBGS\s*9\b/i, 'bgs_9'],
  [/\bBGS\s*8\.?5\b/i, 'bgs_8_5'],
  [/\bBGS\s*8\b/i, 'bgs_8'],
  [/\bBeckett\s*10\b/i, 'bgs_10'],
  [/\bBeckett\s*9\.?5\b/i, 'bgs_9_5'],
  [/\bBeckett\s*9\b/i, 'bgs_9'],
  [/\bCGC\s*10(?:\s*Pristine|\s*Perfect)?\b/i, 'cgc_10'],
  [/\bCGC\s*9\.?5\b/i, 'cgc_9_5'],
  [/\bCGC\s*9\b/i, 'cgc_9'],
  [/\bCGC\s*8\.?5\b/i, 'cgc_8_5'],
  [/\bCGC\s*8\b/i, 'cgc_8'],
  [/\bSGC\s*10\b/i, 'sgc_10'],
  [/\bSGC\s*9\.?5\b/i, 'sgc_9_5'],
  [/\bPCA\s*10\b/i, 'pca_10'],
  [/\bPCA\s*9\b/i, 'pca_9'],
  [/\bCCC\s*10\b/i, 'ccc_10'],
  [/\bCCC\s*9\b/i, 'ccc_9'],
]

// Condition patterns (only when no grade detected — raw cards)
const CONDITION_PATTERNS: Array<[RegExp, string]> = [
  [/\bGem\s*Mint\b/i, 'NEAR_MINT'],
  [/\bMint\b(?!\s*Condition)/i, 'NEAR_MINT'],
  [/\bNear\s*Mint\b|\bNM\b/i, 'NEAR_MINT'],
  [/\bLightly\s*Played\b|\bLP\b/i, 'LIGHTLY_PLAYED'],
  [/\bModerately\s*Played\b|\bMP\b/i, 'MODERATELY_PLAYED'],
  [/\bHeavily\s*Played\b|\bHP\b/i, 'HEAVILY_PLAYED'],
  [/\bDamaged\b|\bDMG\b|\bPoor\b/i, 'DAMAGED'],
  [/\bExcellent\b|\bEX\b/i, 'LIGHTLY_PLAYED'],
  [/\bGood\b(?!\s*Luck)/i, 'MODERATELY_PLAYED'],
]

// ============================================================
// QUERY BUILDING
// ============================================================

export interface CardForQuery {
  name: string
  card_number?: string | null
  set_name?: string | null
  set_id?: string | null
  local_id?: string | null
  lang: 'EN' | 'FR' | 'JA'
}

/**
 * Build optimal eBay search query for a card.
 * Strategy: name + lang qualifier + set name + card number when available.
 */
export function buildEbayQuery(card: CardForQuery): string {
  const parts: string[] = []

  // 1. "Pokemon" anchor word (eBay scoring favors first words)
  parts.push('Pokemon')

  // 2. Card name — strip apostrophes/quotes which eBay url-encoding can break
  const cleanName = card.name.replace(/['']/g, '')
  parts.push(cleanName)

  // 3. Lang qualifier (CRITICAL for JP — eBay searches English titles)
  if (card.lang === 'JA') parts.push('Japanese')
  else if (card.lang === 'FR') parts.push('French')

  // 4. Set context — also strip apostrophes
  if (card.set_name) parts.push(card.set_name.replace(/['']/g, ''))

  // 5. Card number for disambiguation
  if (card.local_id) parts.push(card.local_id)
  else if (card.card_number) parts.push(card.card_number.split('/')[0])

  // Pollution filtered client-side via parseEbayTitle().hasPollution
  // (eBay Browse scoring drops query → 0 results with too many -keyword exclusions,
  //  esp. for niche cards like JP vintage with long queries)

  return parts.join(' ')
}

/**
 * Build complete eBay Browse API URL.
 */
export function buildEbayUrl(query: string, limit = 30): string {
  // sort=price REMOVED: empirically causes 0 results on niche/JP queries
  const params = new URLSearchParams({
    q: query,
    category_ids: EBAY_POKEMON_CATEGORY,
    limit: String(limit),
  })
  return `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`
}

// ============================================================
// TITLE PARSING
// ============================================================

export interface ParsedTitle {
  grade: string | null // 'psa_10', 'bgs_9_5', etc. — null if raw
  condition: string | null // 'NEAR_MINT' etc. — null if graded
  isJapanese: boolean
  isFrench: boolean
  hasPollution: boolean
  localId: string | null // extracted from title if present
}

export function parseEbayTitle(title: string): ParsedTitle {
  const t = title.toLowerCase()

  // Pollution check first (fast reject)
  const hasPollution = BLACKLIST_KEYWORDS.some(kw => t.includes(kw))

  // Grade detection (priority over condition)
  let grade: string | null = null
  for (const [pattern, label] of GRADE_PATTERNS) {
    if (pattern.test(title)) {
      grade = label
      break
    }
  }

  // Condition only matters for raw (non-graded) cards
  let condition: string | null = null
  if (!grade) {
    for (const [pattern, label] of CONDITION_PATTERNS) {
      if (pattern.test(title)) {
        condition = label
        break
      }
    }
    // Default to NEAR_MINT if no condition explicit (eBay default is "Used" or "Mint")
    if (!condition) condition = 'NEAR_MINT'
  }

  // Lang qualifiers
  const isJapanese = /\bjapanese\b|\bjp\b|\bjapan\b/i.test(title)
  const isFrench = /\bfrench\b|\bfrancais\b|\bfrançais\b/i.test(title)

  // Try to extract card number (e.g., "028/060", "No. 006", "#143")
  const localIdMatch =
    title.match(/\b(\d{3})\/\d{3}\b/) ||
    title.match(/\bno\.?\s*(\d{1,3})\b/i) ||
    title.match(/#(\d{1,3})\b/)
  const localId = localIdMatch ? localIdMatch[1].padStart(3, '0') : null

  return { grade, condition, isJapanese, isFrench, hasPollution, localId }
}

// ============================================================
// AGGREGATION (Median + IQR outlier filter)
// ============================================================

export interface PriceAggregate {
  count: number
  median: number
  low: number
  high: number
  q1: number // 25th percentile
  q3: number // 75th percentile
  prices: number[] // sorted, after outlier removal
}

/**
 * Aggregate a list of prices using IQR filter for outliers.
 * Returns null if too few datapoints to be meaningful (< 3).
 */
export function aggregatePrices(rawPrices: number[]): PriceAggregate | null {
  // Lower threshold to 2 (was 3) — many niche cards (JP vintage, FR rare) have
  // only 2-3 listings per variant after lang filter. IQR still meaningful at n=2.
  if (rawPrices.length < 2) return null

  const sorted = [...rawPrices].sort((a, b) => a - b)
  const q1 = percentile(sorted, 0.25)
  const q3 = percentile(sorted, 0.75)
  const iqr = q3 - q1
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr

  const filtered = sorted.filter(p => p >= lowerBound && p <= upperBound)
  if (filtered.length < 1) return null

  return {
    count: filtered.length,
    median: percentile(filtered, 0.5),
    low: filtered[0],
    high: filtered[filtered.length - 1],
    q1: percentile(filtered, 0.25),
    q3: percentile(filtered, 0.75),
    prices: filtered,
  }
}

function percentile(sorted: number[], p: number): number {
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo)
}

// ============================================================
// SNAPSHOT BUILDER
// ============================================================

export interface EbayListing {
  title: string
  price_value: number
  price_currency: string
  condition?: string
}

/**
 * Convert raw eBay listings into normalized PriceSnapshot[].
 *
 * Groups listings by (grade or condition), aggregates per group,
 * emits 1 snapshot per group.
 *
 * @param card - canonical card reference
 * @param listings - raw eBay items
 * @param fxRate - USD to EUR conversion rate
 */
export function buildEbaySnapshots(
  card: {
    card_ref: string
    lang: 'EN' | 'FR' | 'JA'
    name?: string
    set_name?: string | null
    local_id?: string | null
  },
  listings: EbayListing[],
  fxRate: number = 0.92,
): PriceSnapshot[] {
  // Pre-compute discriminators for title-level matching
  const localIdPadded = card.local_id ? card.local_id.padStart(3, '0') : null
  const localIdRaw = card.local_id || null
  // Set keywords: split set_name into discriminant words (≥4 chars, exclude stopwords)
  const setKeywords = card.set_name
    ? card.set_name.toLowerCase()
        .split(/[\s&\-]+/)
        .filter(w => w.length >= 4 && !['series', 'with', 'from'].includes(w))
    : []
  // Card name words for fuzzy name matching
  const nameWords = card.name
    ? card.name.toLowerCase().split(/\s+/).filter(w => w.length >= 3)
    : []

  const valid = listings
    .map(l => ({ listing: l, parsed: parseEbayTitle(l.title), titleLower: l.title.toLowerCase() }))
    .filter(({ parsed, listing, titleLower }) => {
      if (parsed.hasPollution) return false
      if (!listing.price_value || listing.price_value <= 0) return false

      // Lang qualifier (strict for JP, loose for FR — many FR listings omit "French")
      if (card.lang === 'JA' && !parsed.isJapanese) return false
      if (card.lang === 'FR' && parsed.isJapanese) return false
      // For EN: reject listings that explicitly say "Japanese" or "French" (those are non-EN)
      if (card.lang === 'EN' && (parsed.isJapanese || parsed.isFrench)) return false

      // Name match: at least ONE name word in title (loose for vintage misspells)
      if (nameWords.length > 0) {
        const nameMatch = nameWords.some(w => titleLower.includes(w))
        if (!nameMatch) return false
      }

      // Discriminator: set keyword OR local_id must appear (prevents same-name pollution)
      let identifierMatched = setKeywords.length === 0 && !localIdPadded // if neither provided, allow

      if (!identifierMatched && setKeywords.length > 0) {
        if (setKeywords.some(k => titleLower.includes(k))) identifierMatched = true
      }
      if (!identifierMatched && localIdPadded) {
        // Common eBay formats: "004/060", "#004", "No. 004", " 004 ", " 4/" (unpadded)
        const patterns = [
          new RegExp(`\\b${localIdPadded}/`),
          new RegExp(`#${localIdPadded}\\b`),
          new RegExp(`\\bno\\.?\\s*${localIdPadded}\\b`),
          new RegExp(`\\b${localIdPadded}\\b`),
          localIdRaw ? new RegExp(`\\b${localIdRaw}/`) : null,
        ].filter(Boolean) as RegExp[]
        if (patterns.some(p => p.test(listing.title))) identifierMatched = true
      }

      return identifierMatched
    })

  // Step 2: Group by (grade || condition)
  const groups = new Map<string, EbayListing[]>()
  for (const { listing, parsed } of valid) {
    const key = parsed.grade || `raw_${parsed.condition}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(listing)
  }

  // Step 3: Aggregate each group and emit snapshot
  const snapshots: PriceSnapshot[] = []
  for (const [key, items] of groups.entries()) {
    const prices = items.map(i =>
      i.price_currency === 'USD' ? i.price_value * fxRate : i.price_value
    )
    const agg = aggregatePrices(prices)
    if (!agg) continue

    const isGraded = !key.startsWith('raw_')
    const variant = isGraded ? key : 'raw'
    const condition = isGraded ? null : (key.replace('raw_', '') as any)

    snapshots.push({
      card_ref: card.card_ref,
      source: 'ebay',
      lang: card.lang,
      variant: variant as any,
      condition: condition as any,
      price_avg: round2(agg.median),
      price_low: round2(agg.low),
      price_high: round2(agg.high),
      price_median: round2(agg.median),
      nb_sales: agg.count,
      currency: 'EUR',
      source_meta: {
        agg_method: 'iqr_median',
        n_listings_raw: items.length,
        n_listings_kept: agg.count,
        q1: round2(agg.q1),
        q3: round2(agg.q3),
        fx_rate_used: fxRate,
      },
    })
  }

  return snapshots
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
