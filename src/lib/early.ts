import { sql } from '@/lib/db/sql'
import { EARLY_SUPPORTER_SEATS } from '@/lib/stripe'

/** Nombre d'Early Supporters déjà inscrits. */
export async function earlyCount(): Promise<number> {
  const rows = await sql.query(
    'SELECT COUNT(*)::int AS n FROM profiles WHERE is_early_supporter = true',
    []
  )
  return Number(rows?.[0]?.n ?? 0)
}

/** Places Early Supporter restantes (>= 0). */
export async function earlySpotsLeft(): Promise<number> {
  const used = await earlyCount()
  return Math.max(0, EARLY_SUPPORTER_SEATS - used)
}

/** True si l'offre Early Supporter est encore ouverte. */
export async function isEarlyOpen(): Promise<boolean> {
  return (await earlySpotsLeft()) > 0
}

// FREE_CARD_LIMIT vit dans un fichier client-safe (sans sql).
// Import pour l'usage interne (canAddCards) + re-export pour les consommateurs.
import { FREE_CARD_LIMIT } from '@/lib/constants/plan'
export { FREE_CARD_LIMIT }

/**
 * Vérifie si un user peut ajouter `n` carte(s).
 * Plan payant = illimité. Gratuit = plafond FREE_CARD_LIMIT.
 */
export async function canAddCards(userId: string, n: number = 1): Promise<{
  ok: boolean
  plan: string
  current: number
  limit: number | null
  remaining: number | null
}> {
  const prof = await sql.query('SELECT plan FROM profiles WHERE id = $1', [userId])
  const plan = String(prof?.[0]?.plan ?? 'free')
  if (plan !== 'free') {
    return { ok: true, plan, current: 0, limit: null, remaining: null }
  }
  const cnt = await sql.query(
    'SELECT COUNT(*)::int AS n FROM portfolio_cards WHERE user_id = $1',
    [userId]
  )
  const current = Number(cnt?.[0]?.n ?? 0)
  const remaining = Math.max(0, FREE_CARD_LIMIT - current)
  return {
    ok: current + n <= FREE_CARD_LIMIT,
    plan, current, limit: FREE_CARD_LIMIT, remaining,
  }
}


/** Limite d'items wishlist pour le plan Gratuit. */
export const FREE_WISHLIST_LIMIT = 3

export async function canAddWishlist(userId: string, adding = 1): Promise<{
  ok: boolean; plan: string; current: number; limit: number | null; remaining: number | null
}> {
  const prof = await sql.query('SELECT plan FROM profiles WHERE id = $1', [userId])
  const plan = String(prof?.[0]?.plan ?? 'free')
  if (plan !== 'free') {
    return { ok: true, plan, current: 0, limit: null, remaining: null }
  }
  const cnt = await sql.query('SELECT COUNT(*)::int AS n FROM goal_wishlist WHERE user_id = $1', [userId])
  const current = Number(cnt?.[0]?.n ?? 0)
  const remaining = Math.max(0, FREE_WISHLIST_LIMIT - current)
  return { ok: current + adding <= FREE_WISHLIST_LIMIT, plan, current, limit: FREE_WISHLIST_LIMIT, remaining }
}
