/**
 * Service Sets — le catalogue des séries et leurs cartes.
 * Alimente : étagère réelle, complétion, fantômes, cascade "Compléter".
 */

import { sql } from '@/lib/db/sql'
import { getCardImageUrl } from '@/lib/images'

export async function listSets() {
  const rows = await sql`
    SELECT id, name, name_fr, series, total_cards, logo_url, langs, release_date
    FROM k_sets
    WHERE hidden IS NOT TRUE
    ORDER BY release_date DESC NULLS LAST, id DESC
  `
  return rows
}

export async function listSetCards(setId: string, lang: string) {
  const rows = await sql`
    SELECT kc.id, kc.print_id, kc.lang, kc.name_localized AS name,
           regexp_replace(kc.print_id, '^.*-', '') AS card_number,
           kc.rarity_normalized AS rarity, kc.image_url, kc.has_image,
           CASE
             WHEN ps.fair_value_method = 'insufficient_data' THEN NULL
             WHEN lower(kc.lang) = 'fr' THEN COALESCE(ps.cote_fr_eur, ps.fair_value_eur)
             ELSE ps.fair_value_eur
           END AS current_price
    FROM k_cards kc
    LEFT JOIN price_signals ps
      ON ps.print_id = kc.print_id AND lower(ps.lang) = lower(kc.lang)
    WHERE regexp_replace(kc.print_id, '-[^-]+$', '') = ${setId}
      AND kc.lang = lower(${lang})
    ORDER BY length(regexp_replace(kc.print_id, '^.*-', '')),
             regexp_replace(kc.print_id, '^.*-', '')
  `
  return (rows as any[]).map((r) => ({
    ...r,
    image_url:
      r.image_url ??
      getCardImageUrl({ lang: r.lang, setId, localId: r.card_number }) ??
      null,
    current_price: r.current_price == null ? null : Number(r.current_price),
  }))
}
