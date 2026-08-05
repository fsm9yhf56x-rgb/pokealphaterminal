/**
 * Types partagés du domaine Goals / Wishlist.
 *
 * Fichier volontairement SANS dépendance runtime : importable côté serveur
 * (service, routes /api/v1) comme côté client ('use client' hooks) sans jamais
 * embarquer Neon dans le bundle navigateur.
 */

export type GoalMetric = 'portfolio_value' | 'cards_count' | 'roi_pct' | 'graded_count'

export interface GoalTarget {
  id: string
  metric: GoalMetric
  target_value: number
  unit?: string | null
  label?: string | null
  deadline?: string | null
  created_at?: string
  updated_at?: string
}

export interface WishlistItem {
  id: string
  card_name: string
  set_id?: string | null
  set_name?: string | null
  card_number?: string | null
  lang?: string | null
  rarity?: string | null
  priority: 1 | 2 | 3
  target_price?: number | null
  /** 'below' = préviens-moi quand ça descend (acheter) ; 'above' = quand ça monte (vendre). */
  direction?: 'below' | 'above'
  notes?: string | null
  acquired?: boolean
  /** Cote actuelle (calculée serveur via price_signals, règle Kodo). Absente à la création. */
  current_price?: number | null
  created_at?: string
  updated_at?: string
}

/** Payloads de création (le serveur pose id / timestamps). */
export type NewGoalTarget = Omit<GoalTarget, 'id' | 'created_at' | 'updated_at'>
export type NewWishlistItem = Omit<WishlistItem, 'id' | 'created_at' | 'updated_at'>

/** Réponse sentinelle quand le verrou plan Gratuit (3 items) est atteint. */
export interface WishlistLimitError {
  error: 'wishlist_limit'
  current?: number
  limit?: number
}
