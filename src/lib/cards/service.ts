/**
 * Service Cards — recherche encyclopédie. v4 MULTI-CRITÈRES
 * Chaque mot de la requête doit matcher : nom OU série OU numéro OU rareté.
 * "pikachu impulsion", "dracaufeu rare", "pika 48" → tous compris.
 * Renvoie aussi le TOTAL réel (au-delà de la limite).
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

export async function searchCards(
  q: string,
  lang?: string,
): Promise<{ cards: CardSearchHit[]; total: number }> {
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `%${t}%`)
  if (tokens.length === 0) return { cards: [], total: 0 }

  const rows = await sql`
    SELECT kc.id, kc.print_id, kc.lang, kc.name_localized AS name,
           regexp_replace(kc.print_id, '-[^-]+$', '') AS set_id,
           COALESCE(ks.name_fr, ks.name) AS set_name,
           kc.rarity_normalized AS rarity, kc.image_url, kc.has_image,
           CASE
             WHEN ps.fair_value_method = 'insufficient_data' THEN NULL
             WHEN lower(kc.lang) = 'fr' THEN COALESCE(ps.cote_fr_eur, ps.fair_value_eur)
             ELSE ps.fair_value_eur
           END AS current_price,
           count(*) OVER() AS total
    FROM k_cards kc
    LEFT JOIN k_sets ks
      ON ks.id = regexp_replace(kc.print_id, '-[^-]+$', '')
    LEFT JOIN price_signals ps
      ON ps.print_id = kc.print_id AND lower(ps.lang) = lower(kc.lang)
    WHERE (${lang ?? null}::text IS NULL OR kc.lang = lower(${lang ?? null}))
      AND (ks.hidden IS NOT TRUE)
      AND lower(
            kc.name_localized || ' ' ||
            COALESCE(ks.name_fr, '') || ' ' || COALESCE(ks.name, '') || ' ' ||
            kc.print_id || ' ' ||
            COALESCE(kc.rarity_normalized, '')
          ) LIKE ALL (${tokens})
    ORDER BY (kc.has_image IS TRUE) DESC,
             similarity(lower(kc.name_localized), lower(${q})) DESC
    LIMIT 60
  `
  const total = rows.length ? Number((rows[0] as any).total) : 0
  return {
    cards: (rows as any[]).map(({ total: _t, ...r }) => ({
      ...r,
      current_price: r.current_price == null ? null : Number(r.current_price),
    })) as CardSearchHit[],
    total,
  }
}
