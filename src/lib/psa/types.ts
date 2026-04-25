/**
 * Shape of one PSA variant row (from psa_pop_latest view).
 */
export interface PsaPopVariant {
  card_ref: string
  psa_spec_id: string
  variety: string | null         // "1st Edition" / "Shadowless" / null = Unlimited
  subject_name: string | null
  card_number: string | null
  pop_8: number | null
  pop_8_5: number | null
  pop_9: number | null
  pop_9_5: number | null
  pop_10: number | null
  pop_total: number
  pct_gem_mint: number           // 0-100
  pct_high_grade: number         // 9 + 9.5 + 10
  gem_mint_tier: 'very_rare' | 'rare' | 'uncommon' | 'common'
  scraped_at: string
}

/**
 * Response from /api/psa/pop?card_ref=base1-4
 */
export interface PsaPopResponse {
  card_ref: string
  variants: PsaPopVariant[]      // mainstream visible to all
  premiumVariants: PsaPopVariant[]  // exotic, Pro-only (empty array if not Pro)
  isPro: boolean
  totalGraded: number            // sum of pop_total across all visible variants
  hasData: boolean
}

export interface PsaPopError {
  error: string
  code: 'MISSING_PARAMS' | 'INTERNAL' | 'NETWORK'
}

/**
 * The 3 mainstream varieties shown to all users.
 * Anything else (Black Dot Error, Inverted Back, Trainer Deck, etc.) → Pro only.
 */
export const MAINSTREAM_VARIETIES = new Set([
  null,            // Unlimited (variety field is NULL)
  '',              // some PSA entries use empty string
  '1st Edition',
  'Shadowless',
])

export function isMainstreamVariety(variety: string | null): boolean {
  return MAINSTREAM_VARIETIES.has(variety)
}
