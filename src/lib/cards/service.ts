/**
 * Service Cards — recherche encyclopédie. v4 MULTI-CRITÈRES
 * Chaque mot de la requête doit matcher : nom OU série OU numéro OU rareté.
 * "pikachu impulsion", "dracaufeu rare", "pika 48" → tous compris.
 * Renvoie aussi le TOTAL réel (au-delà de la limite).
 */

import { sql } from '@/lib/db/sql'
import { getCardImageUrl } from '@/lib/images'
import { getDisplayPrices } from '@/lib/prices/display'

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
    WITH base AS (
      SELECT DISTINCT ON (print_id, lang) *
      FROM k_cards
      ORDER BY print_id, lang, (has_image IS TRUE) DESC
    ),
    hay AS (
      SELECT b.*,
             lower(
               b.name_localized || ' ' ||
               COALESCE(ks.name_fr, '') || ' ' || COALESCE(ks.name, '') || ' ' ||
               b.print_id || ' ' ||
               COALESCE(b.rarity_normalized, '')
             ) AS h,
             ks.hidden AS set_hidden,
             COALESCE(ks.name_fr, ks.name) AS set_name
      FROM base b
      LEFT JOIN k_sets ks ON ks.id = regexp_replace(b.print_id, '-[^-]+$', '')
    ),
    -- PONT DE LANGUE : les prints trouvés (nom FR compris) ouvrent TOUTES
    -- leurs langues — print_id est partagé (fr-base1-4 / en-base1-4).
    matched AS (
      SELECT DISTINCT print_id FROM hay
      WHERE set_hidden IS NOT TRUE AND h LIKE ALL (${tokens})
    )
    SELECT kc.id, kc.print_id, kc.lang, kc.name_localized AS name,
           regexp_replace(kc.print_id, '-[^-]+$', '') AS set_id,
           kc.set_name,
           kc.rarity_normalized AS rarity, kc.image_url, kc.has_image,
           count(*) OVER() AS total
    FROM hay kc
    JOIN matched m ON m.print_id = kc.print_id
    WHERE (${lang ?? null}::text IS NULL OR kc.lang = lower(${lang ?? null}))
      AND kc.set_hidden IS NOT TRUE
    ORDER BY (kc.h LIKE ALL (${tokens})) DESC,
             (kc.has_image IS TRUE) DESC,
             similarity(lower(kc.name_localized), lower(${q})) DESC
    LIMIT 60
  `
  const total = rows.length ? Number((rows[0] as any).total) : 0
  const dp = await getDisplayPrices(sql, (rows as any[]).map((r) => String(r.id)))
  return {
    cards: (rows as any[]).map(({ total: _t, h: _h, set_hidden: _sh, ...r }) => {
      const localId = String(r.print_id).slice(String(r.print_id).lastIndexOf('-') + 1)
      return {
        ...r,
        image_url:
          r.image_url ??
          getCardImageUrl({ lang: r.lang, setId: r.set_id, localId }) ??
          null,
        current_price: dp[String(r.id).toLowerCase()]?.displayEur ?? null,
        price_basis: dp[String(r.id).toLowerCase()]?.basis ?? null,
      }
    }) as CardSearchHit[],
    total,
  }
}
