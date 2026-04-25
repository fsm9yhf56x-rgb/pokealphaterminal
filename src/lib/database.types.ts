export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  is_pro: boolean
  pro_until: string | null
  theme: string
  lang: string
  xp: number
  streak: number
  streak_last_date: string | null
  created_at: string
  updated_at: string
}

export interface PortfolioCard {
  id: string
  user_id: string
  name: string
  set_name: string | null
  set_id: string | null
  card_number: string | null
  lang: string
  rarity: string | null
  card_type: string | null
  condition: string
  graded: boolean
  grade_company: string | null
  grade_value: string | null
  qty: number
  buy_price: number | null
  buy_date: string | null
  current_price: number | null
  image_url: string | null
  notes: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export interface TcgSet {
  id: string
  name: string
  lang: string
  total_cards: number | null
  release_date: string | null
  era: string | null
  symbol_url: string | null
  synced_at: string
}

export interface TcgCard {
  id: string
  set_id: string | null
  local_id: string | null
  name: string
  lang: string
  rarity: string | null
  card_type: string | null
  hp: number | null
  has_image: boolean
  image_synced_at: string | null
  synced_at: string
}

export interface Price {
  id: number
  card_id: string
  source: string
  market: string
  condition: string
  grade: string | null
  price_avg: number | null
  price_low: number | null
  price_high: number | null
  sale_count: number | null
  currency: string
  recorded_at: string
  created_at: string
}

export interface WishlistItem {
  id: string
  user_id: string
  card_id: string | null
  card_name: string
  target_price: number | null
  alert_enabled: boolean
  created_at: string
}

export interface Badge {
  id: string
  user_id: string
  badge_type: string
  badge_name: string
  earned_at: string
}

// ─── PSA Pop Reports (added 2026-04-24) ─────────────────
export interface PsaCardMapping {
  card_ref: string
  psa_spec_id: string
  psa_set_id: string
  psa_card_name: string | null
  psa_card_number: string | null
  confidence: number
  variety: string | null
  manually_verified: boolean
  created_at: string
  updated_at: string
}

export interface PsaPopReport {
  id: number
  card_ref: string
  psa_spec_id: string
  pop_1: number | null
  pop_1_5: number | null
  pop_2: number | null
  pop_2_5: number | null
  pop_3: number | null
  pop_3_5: number | null
  pop_4: number | null
  pop_4_5: number | null
  pop_5: number | null
  pop_5_5: number | null
  pop_6: number | null
  pop_6_5: number | null
  pop_7: number | null
  pop_7_5: number | null
  pop_8: number | null
  pop_8_5: number | null
  pop_9: number | null
  pop_9_5: number | null
  pop_10: number | null
  pop_10_plus: number | null
  pop_authentic: number | null
  pop_qualifier: Record<string, number> | null
  pop_total: number
  variety: string | null
  subject_name: string | null
  card_number: string | null
  source_url: string
  scraped_at: string
}

export interface PsaPopLatest {
  card_ref: string
  psa_spec_id: string
  variety: string | null
  subject_name: string | null
  card_number: string | null
  pop_8: number | null
  pop_8_5: number | null
  pop_9: number | null
  pop_9_5: number | null
  pop_10: number | null
  pop_10_plus: number | null
  pop_total: number
  scraped_at: string
  pct_gem_mint: number
  pct_high_grade: number
  gem_mint_tier: 'very_rare' | 'rare' | 'uncommon' | 'common'
}

export type PsaScrapeStatus = 'pending' | 'processing' | 'done' | 'failed' | 'skipped'

export interface PsaScrapeQueueItem {
  card_ref: string
  priority: number
  status: PsaScrapeStatus
  attempts: number
  last_attempt_at: string | null
  last_error: string | null
  scheduled_for: string
  created_at: string
}
