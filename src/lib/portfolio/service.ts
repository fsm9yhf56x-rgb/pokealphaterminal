/**
 * Service domaine Portfolio — SERVEUR UNIQUEMENT. (v3, schéma complet)
 * Routes /api/v1/portfolio → session → délégation ici. Une seule politique.
 *
 * Résolution du prix, dans l'ordre :
 *   1. k_card_id direct (posé à l'ajout : chemin sûr)
 *   2. id construit {lang}-{set}-{num} (EN/FR)
 *   3. print_id + trigramme sur le nom (fix JP, pattern Goals)
 *   → règle Kodo (insufficient_data → NULL, FR = cote_fr_eur)
 *   → repli : pc.current_price (cron portfolio-prices)
 */

import { sql } from '@/lib/db/sql'

export interface PortfolioCardRow {
  id: string
  name: string
  set_id: string | null
  set_name: string | null
  card_number: string | null
  rarity: string | null
  lang: string | null
  card_type: string | null
  condition: string | null
  graded: boolean | null
  grade_company: string | null
  grade_value: string | null
  variant: string | null
  edition: string | null
  qty: number
  buy_price: number | null
  buy_date: string | null
  notes: string | null
  is_favorite: boolean | null
  showcase_position: number | null
  image_url: string | null
  created_at: string
  current_price: number | null
}

export async function listPortfolio(userId: string): Promise<PortfolioCardRow[]> {
  const rows = await sql`
    SELECT pc.id, pc.name, pc.set_id, pc.set_name, pc.card_number, pc.rarity,
           pc.lang, pc.card_type, pc.condition,
           pc.graded, pc.grade_company, pc.grade_value,
           pc.variant, pc.edition,
           pc.qty, pc.buy_price, pc.buy_date, pc.notes,
           pc.is_favorite, pc.showcase_position,
           pc.k_card_id, pc.price_basis, pc.image_url, pc.created_at,
           -- RÈGLE 5 : la lecture SERT la colonne écrite par le Kodo Engine
           -- (priceCards à l'ajout/modif + cron). AUCUN recalcul à la lecture :
           -- c'est lui qui écrasait le prix par exemplaire (LP 90,38 → 114 NM).
           pc.current_price
    FROM portfolio_cards pc
    LEFT JOIN LATERAL (
      SELECT kc.print_id, kc.lang
      FROM k_cards kc
      WHERE (pc.k_card_id IS NOT NULL AND kc.id = pc.k_card_id)
         OR (pc.set_id IS NOT NULL AND pc.card_number IS NOT NULL
             AND kc.lang = lower(pc.lang)
             AND (kc.id = lower(pc.lang) || '-' || pc.set_id || '-' || pc.card_number
                  OR kc.print_id = pc.set_id || '-' || pc.card_number))
      ORDER BY (kc.id = pc.k_card_id) DESC,
               (kc.id = lower(pc.lang) || '-' || pc.set_id || '-' || pc.card_number) DESC,
               similarity(lower(kc.name_localized), lower(pc.name)) DESC
      LIMIT 1
    ) kc ON true
    LEFT JOIN price_signals ps
      ON ps.print_id = kc.print_id AND lower(ps.lang) = lower(kc.lang)
    WHERE pc.user_id = ${userId}
    ORDER BY COALESCE(pc.showcase_position, 999999) ASC, pc.created_at DESC
  `
  return (rows as any[]).map((r) => ({
    ...r,
    qty: Number(r.qty ?? 1),
    buy_price: r.buy_price == null ? null : Number(r.buy_price),
    current_price: r.current_price == null ? null : Number(r.current_price),
  })) as PortfolioCardRow[]
}

export async function addPortfolioCard(
  userId: string,
  input: {
    name: string; set_id?: string | null; set_name?: string | null
    card_number?: string | null; lang?: string | null; rarity?: string | null
    card_type?: string | null; condition?: string | null
    graded?: boolean; grade_company?: string | null; grade_value?: string | null
    variant?: string | null; edition?: string | null
    qty?: number; buy_price?: number | null; buy_date?: string | null
    notes?: string | null; image_url?: string | null; k_card_id?: string | null
  },
): Promise<{ id: string }> {
  const rows = await sql`
    INSERT INTO portfolio_cards
      (user_id, name, set_id, set_name, card_number, lang, rarity, card_type,
       condition, graded, grade_company, grade_value, variant, edition,
       qty, buy_price, buy_date, notes, image_url, k_card_id)
    VALUES
      (${userId}, ${input.name}, ${input.set_id ?? null}, ${input.set_name ?? null},
       ${input.card_number ?? null}, ${input.lang ?? null}, ${input.rarity ?? null},
       ${input.card_type ?? null}, ${input.condition ?? null},
       ${input.graded ?? false}, ${input.grade_company ?? null}, ${input.grade_value ?? null},
       ${input.variant ?? null}, ${input.edition ?? null},
       ${input.qty ?? 1}, ${input.buy_price ?? null}, ${input.buy_date ?? null},
       ${input.notes ?? null}, ${input.image_url ?? null}, ${input.k_card_id ?? null})
    RETURNING id
  `
  return rows[0] as { id: string }
}

export async function updatePortfolioCard(
  userId: string,
  id: string,
  patch: {
    condition?: string | null; qty?: number | null; buy_price?: number | null
    graded?: boolean | null; grade_company?: string | null; grade_value?: string | null
    notes?: string | null; is_favorite?: boolean | null
    showcase_position?: number | null
  },
): Promise<void> {
  await sql`
    UPDATE portfolio_cards SET
      condition         = COALESCE(${patch.condition ?? null}, condition),
      qty               = COALESCE(${patch.qty ?? null}, qty),
      buy_price         = COALESCE(${patch.buy_price ?? null}, buy_price),
      graded            = COALESCE(${patch.graded ?? null}, graded),
      grade_company     = COALESCE(${patch.grade_company ?? null}, grade_company),
      grade_value       = COALESCE(${patch.grade_value ?? null}, grade_value),
      notes             = COALESCE(${patch.notes ?? null}, notes),
      is_favorite       = COALESCE(${patch.is_favorite ?? null}, is_favorite),
      showcase_position = COALESCE(${patch.showcase_position ?? null}, showcase_position),
      updated_at        = now()
    WHERE id = ${id} AND user_id = ${userId}
  `
}

export async function deletePortfolioCard(userId: string, id: string): Promise<void> {
  await sql`DELETE FROM portfolio_cards WHERE id = ${id} AND user_id = ${userId}`
}
