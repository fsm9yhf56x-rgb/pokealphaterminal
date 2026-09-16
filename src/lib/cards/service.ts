/**
 * Service Cards — recherche encyclopédie mobile.
 *
 * La recherche précédente construisait un DISTINCT de tout k_cards avant de
 * filtrer. Sur le catalogue de production, ce plan dépassait 30 secondes.
 * Ici, on sélectionne d'abord un petit ensemble de candidats indexables
 * (nom trigramme, numéro ou set), puis seulement on applique tous les mots.
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

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

export async function searchCards(
  q: string,
  lang?: string,
  includePrices = true,
): Promise<{ cards: CardSearchHit[]; total: number }> {
  const tokens = normalize(q).split(/\s+/).filter(Boolean).slice(0, 6)
  if (tokens.length === 0) return { cards: [], total: 0 }

  const first = tokens[0]
  const tokenPatterns = tokens.map((token) => `%${token}%`)
  const params: any[] = [first, tokenPatterns[0], ...tokenPatterns, lang?.toLowerCase() ?? null]
  const langIndex = 3 + tokenPatterns.length
  const allTokens = tokenPatterns.map((_, index) => `e.h LIKE $${index + 3}`).join(' AND ')

  const rows = await sql.query(
    `WITH name_hits AS (
       SELECT kc.id, kc.print_id, kc.lang, kc.name_localized AS name,
              kp.set_id, COALESCE(ks.name_fr, ks.name) AS set_name,
              kc.rarity_normalized AS rarity, kc.image_url, kc.has_image,
              similarity(lower(kc.name_localized), $1) AS sim
       FROM k_cards kc
       JOIN k_prints kp ON kp.id = kc.print_id
       LEFT JOIN k_sets ks ON ks.id = kp.set_id
       WHERE ks.hidden IS NOT TRUE
         AND (lower(kc.name_localized) % $1
              OR lower(unaccent(kc.name_localized)) LIKE $2)
         AND ($${langIndex}::text IS NULL OR lower(kc.lang) = $${langIndex})
       ORDER BY similarity(lower(kc.name_localized), $1) DESC,
                (kc.has_image IS TRUE) DESC
       LIMIT 180
     ),
     meta_hits AS (
       SELECT kc.id, kc.print_id, kc.lang, kc.name_localized AS name,
              kp.set_id, COALESCE(ks.name_fr, ks.name) AS set_name,
              kc.rarity_normalized AS rarity, kc.image_url, kc.has_image,
              similarity(lower(kc.name_localized), $1) AS sim
       FROM k_cards kc
       JOIN k_prints kp ON kp.id = kc.print_id
       LEFT JOIN k_sets ks ON ks.id = kp.set_id
       WHERE ks.hidden IS NOT TRUE
         AND (lower(kp.number) = $1
              OR lower(kp.set_id) LIKE $2
              OR lower(COALESCE(ks.name_fr, ks.name, '')) LIKE $2)
         AND ($${langIndex}::text IS NULL OR lower(kc.lang) = $${langIndex})
       ORDER BY (kc.has_image IS TRUE) DESC
       LIMIT 180
     ),
     candidates AS (
       SELECT * FROM name_hits
       UNION ALL
       SELECT * FROM meta_hits
     ),
     enriched AS (
       SELECT c.*,
              lower(unaccent(concat_ws(' ', c.name, c.set_name, c.print_id, c.rarity))) AS h,
              row_number() OVER (
                PARTITION BY c.print_id, c.lang
                ORDER BY (c.has_image IS TRUE) DESC, c.sim DESC
              ) AS duplicate_rank
       FROM candidates c
     ),
     matched AS (
       SELECT * FROM enriched e
       WHERE e.duplicate_rank = 1 AND ${allTokens}
     )
     SELECT id, print_id, lang, name, set_id, set_name, rarity,
            image_url, has_image, count(*) OVER() AS total
     FROM matched
     ORDER BY (lower(unaccent(name)) = $1) DESC,
              (lower(unaccent(name)) LIKE $2) DESC,
              (has_image IS TRUE) DESC,
              sim DESC,
              name ASC
     LIMIT 60`,
    params,
  )

  const total = rows.length ? Number((rows[0] as any).total) : 0

  if (!includePrices) {
    return {
      cards: (rows as any[]).map(({ total: _total, ...row }) => {
        const localId = String(row.print_id).slice(String(row.print_id).lastIndexOf('-') + 1)
        return {
          ...row,
          image_url:
            row.image_url ??
            getCardImageUrl({ lang: row.lang, setId: row.set_id, localId }) ??
            null,
          current_price: null,
          price_basis: null,
        }
      }) as CardSearchHit[],
      total,
    }
  }

  // Les prix enrichissent les résultats, mais ne doivent jamais bloquer la
  // fonction principale. Après 1,2 s on rend le catalogue sans prix.
  const pricePromise = getDisplayPrices(sql, (rows as any[]).map((row) => String(row.id)))
    .catch((error) => {
      console.error('[cards search] prices unavailable', error)
      return {} as Awaited<ReturnType<typeof getDisplayPrices>>
    })
  const dp = await Promise.race([
    pricePromise,
    new Promise<Awaited<ReturnType<typeof getDisplayPrices>>>((resolve) =>
      setTimeout(() => resolve({}), 1_200),
    ),
  ])

  return {
    cards: (rows as any[]).map(({ total: _total, ...row }) => {
      const localId = String(row.print_id).slice(String(row.print_id).lastIndexOf('-') + 1)
      return {
        ...row,
        image_url:
          row.image_url ??
          getCardImageUrl({ lang: row.lang, setId: row.set_id, localId }) ??
          null,
        current_price: dp[String(row.id).toLowerCase()]?.displayEur ?? null,
        price_basis: dp[String(row.id).toLowerCase()]?.basis ?? null,
      }
    }) as CardSearchHit[],
    total,
  }
}
