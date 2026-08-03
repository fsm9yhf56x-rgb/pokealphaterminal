/**
 * Service domaine Cards — recherche encyclopédie. v3
 * JOIN k_sets → nom de série humain (name_fr), sets cachés exclus.
 */

import { sql } from '@/lib/db/sql'

export interface CardSearchHit {
  id: string
  print_id: string
  lang: string
  name: string
  set_id: string
  set_name: string | null
  rarity: string | null
  image_url: string | null
  has_image: boolean | null
  current_price: number | null
}

export async function searchCards(q: string, lang?: string): Promise<CardSearchHit[]> {
  const like = `%${q}%`
  const rows = await sql`
    SELECT kc.id, kc.print_id, kc.lang, kc.name_localized AS name,
           regexp_replace(kc.print_id, '-[^-]+$', '') AS set_id,
           COALESCE(ks.name_fr, ks.name) AS set_name,
           kc.rarity_normalized AS rarity, kc.image_url, kc.has_image,
           CASE
             WHEN ps.fair_value_method = 'insufficient_data' THEN NULL
             WHEN lower(kc.lang) = 'fr' THEN COALESCE(ps.cote_fr_eur, ps.fair_value_eur)
             ELSE ps.fair_value_eur
           END AS current_price
    FROM k_cards kc
    LEFT JOIN k_sets ks
      ON ks.id = regexp_replace(kc.print_id, '-[^-]+$', '')
    LEFT JOIN price_signals ps
      ON ps.print_id = kc.print_id AND lower(ps.lang) = lower(kc.lang)
    WHERE (${lang ?? null}::text IS NULL OR kc.lang = lower(${lang ?? null}))
      AND (lower(kc.name_localized) LIKE lower(${like}) OR kc.print_id ILIKE ${like})
      AND (ks.hidden IS NOT TRUE)
    ORDER BY (kc.has_image IS TRUE) DESC,
             similarity(lower(kc.name_localized), lower(${q})) DESC
    LIMIT 30
  `
  return (rows as any[]).map((r) => ({
    ...r,
    current_price: r.current_price == null ? null : Number(r.current_price),
  })) as CardSearchHit[]
}
