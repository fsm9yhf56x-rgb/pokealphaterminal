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
