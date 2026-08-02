/**
 * Service domaine Cards — recherche encyclopédie (k_cards).
 * Utilisé par /api/v1/cards/search (mobile + web demain).
 * Trigramme dispo (idx_kcards_name_trgm) → tri par similarité.
 */

import { sql } from '@/lib/db/sql'

export interface CardSearchHit {
  id: string          // {lang}-{set}-{num} (EN/FR) ou jp-{tcgPlayerId}
  print_id: string    // {set}-{num}
  lang: string
  name: string        // name_localized
  current_price: number | null
}

export async function searchCards(q: string, lang?: string): Promise<CardSearchHit[]> {
  const like = `%${q}%`
  const rows = await sql`
    SELECT kc.id, kc.print_id, kc.lang, kc.name_localized AS name,
           CASE
             WHEN ps.fair_value_method = 'insufficient_data' THEN NULL
             WHEN lower(kc.lang) = 'fr' THEN COALESCE(ps.cote_fr_eur, ps.fair_value_eur)
             ELSE ps.fair_value_eur
           END AS current_price
    FROM k_cards kc
    LEFT JOIN price_signals ps
      ON ps.print_id = kc.print_id AND lower(ps.lang) = lower(kc.lang)
    WHERE (${lang ?? null}::text IS NULL OR kc.lang = lower(${lang ?? null}))
      AND (lower(kc.name_localized) LIKE lower(${like}) OR kc.print_id ILIKE ${like})
    ORDER BY similarity(lower(kc.name_localized), lower(${q})) DESC
    LIMIT 25
  `
  return (rows as any[]).map((r) => ({
    ...r,
    current_price: r.current_price == null ? null : Number(r.current_price),
  })) as CardSearchHit[]
}
