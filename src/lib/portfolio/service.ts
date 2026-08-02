/**
 * Service domaine Portfolio — SERVEUR UNIQUEMENT.
 * Même architecture que goals/service.ts : les routes /api/v1/portfolio
 * résolvent la session et délèguent ici. Web et mobile, une seule politique.
 *
 * Règles (identiques à Goals) :
 *   - userId toujours résolu serveur, jamais reçu du client.
 *   - Mutations scopées WHERE user_id = ${userId}.
 *   - INSERT en colonnes explicites.
 *   - NUMERIC Neon → Number à la sortie. Prix introuvable → null (l'UI affiche —).
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
  condition: string | null
  qty: number
  buy_price: number | null
  image_url: string | null
  current_price: number | null
}

/* ── Lecture : holdings valorisés (résolution prix = pattern Goals) ── */

export async function listPortfolio(userId: string): Promise<PortfolioCardRow[]> {
  const rows = await sql`
    SELECT pc.id, pc.name, pc.set_id, pc.set_name, pc.card_number, pc.rarity,
           pc.lang, pc.condition, pc.qty, pc.buy_price, pc.image_url,
           CASE
             WHEN ps.fair_value_method = 'insufficient_data' THEN NULL
             WHEN lower(pc.lang) = 'fr' THEN COALESCE(ps.cote_fr_eur, ps.fair_value_eur)
             ELSE ps.fair_value_eur
           END AS current_price
    FROM portfolio_cards pc
    LEFT JOIN LATERAL (
      SELECT kc.print_id, kc.lang
      FROM k_cards kc
      WHERE pc.set_id IS NOT NULL AND pc.card_number IS NOT NULL
        AND kc.lang = lower(pc.lang)
        AND (kc.id = lower(pc.lang) || '-' || pc.set_id || '-' || pc.card_number
             OR kc.print_id = pc.set_id || '-' || pc.card_number)
      ORDER BY (kc.id = lower(pc.lang) || '-' || pc.set_id || '-' || pc.card_number) DESC,
               similarity(lower(kc.name_localized), lower(pc.name)) DESC
      LIMIT 1
    ) kc ON true
    LEFT JOIN price_signals ps
      ON ps.print_id = kc.print_id AND lower(ps.lang) = lower(kc.lang)
    WHERE pc.user_id = ${userId}
      AND pc.card_number IS DISTINCT FROM 'SEALED'
    ORDER BY pc.name ASC
  `
  return (rows as any[]).map((r) => ({
    ...r,
    qty: Number(r.qty ?? 1),
    buy_price: r.buy_price == null ? null : Number(r.buy_price),
    current_price: r.current_price == null ? null : Number(r.current_price),
  })) as PortfolioCardRow[]
}

/* ── Écriture ── */

export async function addPortfolioCard(
  userId: string,
  input: {
    name: string; set_id?: string | null; set_name?: string | null
    card_number?: string | null; lang?: string | null; rarity?: string | null
    condition?: string | null; qty?: number; buy_price?: number | null
    image_url?: string | null
  },
): Promise<{ id: string }> {
  const rows = await sql`
    INSERT INTO portfolio_cards
      (user_id, name, set_id, set_name, card_number, lang, rarity, condition, qty, buy_price, image_url)
    VALUES
      (${userId}, ${input.name}, ${input.set_id ?? null}, ${input.set_name ?? null},
       ${input.card_number ?? null}, ${input.lang ?? null}, ${input.rarity ?? null},
       ${input.condition ?? null}, ${input.qty ?? 1}, ${input.buy_price ?? null},
       ${input.image_url ?? null})
    RETURNING id
  `
  return rows[0] as { id: string }
}

export async function updatePortfolioCard(
  userId: string,
  id: string,
  patch: { condition?: string | null; qty?: number | null; buy_price?: number | null },
): Promise<void> {
  await sql`
    UPDATE portfolio_cards SET
      condition = COALESCE(${patch.condition ?? null}, condition),
      qty       = COALESCE(${patch.qty ?? null}, qty),
      buy_price = COALESCE(${patch.buy_price ?? null}, buy_price),
      updated_at = now()
    WHERE id = ${id} AND user_id = ${userId}
  `
}

export async function deletePortfolioCard(userId: string, id: string): Promise<void> {
  await sql`DELETE FROM portfolio_cards WHERE id = ${id} AND user_id = ${userId}`
}
