/**
 * Service domaine Goals / Wishlist — SERVEUR UNIQUEMENT.
 *
 * Toute la logique métier vit ici : CRUD + verrou plan Gratuit. Les routes
 * /api/v1/goals ne font que résoudre la session et déléguer à ces fonctions.
 * Web et mobile partageront donc la MÊME politique, écrite une seule fois.
 *
 * Règles :
 *   - Chaque fonction prend un userId déjà résolu côté serveur (jamais depuis le client).
 *   - Toutes les mutations sont scopées `WHERE user_id = ${userId}` (isolation stricte).
 *   - INSERT en colonnes explicites (jamais de spread d'objet client) → pas de colonne fantôme.
 *   - Neon renvoie NUMERIC en string → on normalise en Number à la sortie.
 */

import { sql } from '@/lib/db/sql'
import { canAddWishlist } from '@/lib/early'
import type {
  GoalTarget,
  WishlistItem,
  NewGoalTarget,
  NewWishlistItem,
  WishlistLimitError,
} from './types'

/* ── Lecture ─────────────────────────────── */

export async function listGoals(userId: string): Promise<{ targets: GoalTarget[]; wishlist: WishlistItem[] }> {
  const [tRows, wRows] = (await Promise.all([
    sql`SELECT id, metric, target_value, unit, label, deadline, created_at, updated_at
        FROM goal_targets
        WHERE user_id = ${userId}
        ORDER BY created_at DESC`,
    sql`
      SELECT gw.id, gw.card_name, gw.set_id, gw.set_name, gw.card_number, gw.lang, gw.rarity,
             gw.priority, gw.target_price, gw.notes, gw.acquired, gw.created_at, gw.updated_at,
             CASE
               WHEN ps.fair_value_method = 'insufficient_data' THEN NULL
               WHEN lower(gw.lang) = 'fr' THEN COALESCE(ps.cote_fr_eur, ps.fair_value_eur)
               ELSE ps.fair_value_eur
             END AS current_price
      FROM goal_wishlist gw
      LEFT JOIN k_cards kc
        ON gw.set_id IS NOT NULL AND gw.card_number IS NOT NULL
       AND kc.id = lower(gw.lang) || '-' || gw.set_id || '-' || gw.card_number
      LEFT JOIN price_signals ps
        ON ps.print_id = kc.print_id AND lower(ps.lang) = lower(kc.lang)
      WHERE gw.user_id = ${userId}
      ORDER BY gw.created_at DESC`,
  ])) as [any[], any[]]

  return {
    targets: tRows.map(normalizeTarget),
    wishlist: wRows.map(normalizeWish),
  }
}

/* ── Targets ─────────────────────────────── */

export async function createTarget(userId: string, input: NewGoalTarget): Promise<GoalTarget> {
  const rows = (await sql`
    INSERT INTO goal_targets (user_id, metric, target_value, unit, label, deadline)
    VALUES (${userId}, ${input.metric}, ${input.target_value},
            ${input.unit ?? null}, ${input.label ?? null}, ${input.deadline ?? null})
    RETURNING id, metric, target_value, unit, label, deadline, created_at, updated_at
  `) as any[]
  return normalizeTarget(rows[0])
}

export async function deleteTarget(userId: string, id: string): Promise<void> {
  await sql`DELETE FROM goal_targets WHERE id = ${id} AND user_id = ${userId}`
}

/* ── Wishlist ────────────────────────────── */

export async function createWishItem(
  userId: string,
  input: NewWishlistItem,
): Promise<WishlistItem | WishlistLimitError> {
  // Verrou plan Gratuit (3 items) — même source de vérité que /api/db/query.
  const chk = await canAddWishlist(userId, 1)
  if (!chk.ok) {
    return { error: 'wishlist_limit', current: chk.current, limit: chk.limit ?? undefined }
  }

  const rows = (await sql`
    INSERT INTO goal_wishlist
      (user_id, card_name, set_id, set_name, card_number, lang, rarity, priority, target_price, notes)
    VALUES
      (${userId}, ${input.card_name}, ${input.set_id ?? null}, ${input.set_name ?? null},
       ${input.card_number ?? null}, ${input.lang ?? null}, ${input.rarity ?? null},
       ${input.priority}, ${input.target_price ?? null}, ${input.notes ?? null})
    RETURNING id, card_name, set_id, set_name, card_number, lang, rarity, priority,
              target_price, notes, acquired, created_at, updated_at
  `) as any[]
  const item = normalizeWish(rows[0])
  // Cote calculée à l'insert aussi (pas seulement au GET) → affichage immédiat, cohérent avec le modal.
  item.current_price = await priceForItem(item.lang, item.set_id, item.card_number)
  return item
}

export async function deleteWishItem(userId: string, id: string): Promise<void> {
  await sql`DELETE FROM goal_wishlist WHERE id = ${id} AND user_id = ${userId}`
}

export async function updateWishItem(
  userId: string,
  id: string,
  patch: { acquired?: boolean; target_price?: number | null; priority?: 1 | 2 | 3 },
): Promise<WishlistItem | null> {
  // Mises à jour par champ fourni (undefined = ne pas toucher ; null = effacer). Toujours scopé user.
  if (patch.acquired !== undefined) {
    await sql`UPDATE goal_wishlist SET acquired = ${patch.acquired}, updated_at = now() WHERE id = ${id} AND user_id = ${userId}`
  }
  if (patch.target_price !== undefined) {
    await sql`UPDATE goal_wishlist SET target_price = ${patch.target_price}, updated_at = now() WHERE id = ${id} AND user_id = ${userId}`
  }
  if (patch.priority !== undefined) {
    await sql`UPDATE goal_wishlist SET priority = ${patch.priority}, updated_at = now() WHERE id = ${id} AND user_id = ${userId}`
  }
  const rows = (await sql`
    SELECT id, card_name, set_id, set_name, card_number, lang, rarity, priority,
           target_price, notes, acquired, created_at, updated_at
    FROM goal_wishlist WHERE id = ${id} AND user_id = ${userId} LIMIT 1
  `) as any[]
  if (!rows[0]) return null
  const item = normalizeWish(rows[0])
  item.current_price = await priceForItem(item.lang, item.set_id, item.card_number)
  return item
}

/* ── Normalisation (NUMERIC string → number) ── */

/** Cote actuelle d'une carte (règle Kodo headline), depuis price_signals. Null si non résoluble. */
async function priceForItem(
  lang: string | null | undefined,
  setId: string | null | undefined,
  cardNumber: string | null | undefined,
): Promise<number | null> {
  if (!lang || !setId || !cardNumber) return null
  const cardId = `${String(lang).toLowerCase()}-${setId}-${cardNumber}`
  const rows = (await sql`
    SELECT CASE
             WHEN ps.fair_value_method = 'insufficient_data' THEN NULL
             WHEN lower(kc.lang) = 'fr' THEN COALESCE(ps.cote_fr_eur, ps.fair_value_eur)
             ELSE ps.fair_value_eur
           END AS current_price
    FROM k_cards kc
    LEFT JOIN price_signals ps ON ps.print_id = kc.print_id AND lower(ps.lang) = lower(kc.lang)
    WHERE kc.id = ${cardId}
    LIMIT 1
  `) as any[]
  const v = rows[0]?.current_price
  return v == null ? null : Number(v)
}

function normalizeTarget(r: any): GoalTarget {
  return {
    id: r.id,
    metric: r.metric,
    target_value: Number(r.target_value ?? 0),
    unit: r.unit ?? null,
    label: r.label ?? null,
    deadline: r.deadline ?? null,
    created_at: r.created_at ?? undefined,
    updated_at: r.updated_at ?? undefined,
  }
}

function normalizeWish(r: any): WishlistItem {
  return {
    id: r.id,
    card_name: r.card_name,
    set_id: r.set_id ?? null,
    set_name: r.set_name ?? null,
    card_number: r.card_number ?? null,
    lang: r.lang ?? null,
    rarity: r.rarity ?? null,
    priority: (Number(r.priority) as 1 | 2 | 3) || 2,
    target_price: r.target_price == null ? null : Number(r.target_price),
    notes: r.notes ?? null,
    acquired: r.acquired ?? false,
    current_price: r.current_price == null ? null : Number(r.current_price),
    created_at: r.created_at ?? undefined,
    updated_at: r.updated_at ?? undefined,
  }
}
