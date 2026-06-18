/**
 * Source de verite UNIQUE du pricing portfolio (Kodo Engine).
 *
 * Valorise chaque ligne de portfolio_cards selon SON exemplaire :
 *  - Gradee ("PSA 10", "BGS 8.5"...) -> tier exact {COMPANY}_{GRADE} de price_matrix
 *  - Raw -> tier d'etat (NEAR_MINT par defaut)
 *  - Carte FR raw -> cote FR (price_signals) prioritaire
 *  - Fallback -> fair value (price_basis le trace)
 *  - Garde-fous: NM aberrant (insufficient_data) et gradee sans son tier (graded_no_data) -> NULL
 *
 * Appele par:
 *  - cron/portfolio-prices (scope vide = tout le portfolio, nuit)
 *  - db/query apres insert (scope { ids } = cartes ajoutees, immediat)
 *
 * Le CTE est IDENTIQUE dans les deux cas (meme regle partout). Seul le filtre de scope change.
 */

type SqlTag = (strings: TemplateStringsArray, ...values: any[]) => Promise<any[]>

export interface PricedRow {
  id: string
  current_price: number | null
  price_basis: string | null
}

/**
 * Price les lignes de portfolio_cards et met a jour current_price + price_basis.
 * @param sql  client neon (tagged template)
 * @param scope  { ids } pour cibler des lignes precises ; {} pour tout le portfolio
 * @returns les lignes mises a jour (id, current_price, price_basis)
 */
export async function priceCards(sql: SqlTag, scope: { ids?: string[] } = {}): Promise<PricedRow[]> {
  // Filtre de scope SANS concatenation SQL: si ids fourni, on borne par ANY($ids).
  // scopeAll=true court-circuite le filtre (tout le portfolio).
  const ids = scope.ids ?? null
  const scopeAll = ids === null

  await sql`ALTER TABLE portfolio_cards ADD COLUMN IF NOT EXISTS price_basis text`

  const rows = await sql`
    WITH fx AS (
      SELECT rate FROM fx_rates
      WHERE from_currency = 'USD' AND to_currency = 'EUR'
      ORDER BY rate_date DESC LIMIT 1
    ),
    resolved AS (
      SELECT pc.id AS pc_id,
             t.tier AS wanted_tier,
             best.spot, best.currency,
             kc.lang,
             ps.cote_fr_eur, ps.fair_value_eur, ps.fair_value_method
      FROM portfolio_cards pc
      JOIN k_cards kc ON kc.id = pc.k_card_id
      LEFT JOIN price_signals ps ON ps.print_id = kc.print_id
      LEFT JOIN LATERAL (SELECT rarity AS r FROM k_prints WHERE id = kc.print_id) kc_rarity ON true
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN pc.condition ~* '^(PSA|BGS|CGC|SGC|ACE|TAG)[ _]'
            THEN upper(replace(replace(trim(pc.condition), ' ', '_'), '.', '_'))
          WHEN upper(coalesce(pc.condition,'')) IN ('NM','NEAR MINT','NEAR_MINT') THEN 'NEAR_MINT'
          WHEN upper(coalesce(pc.condition,'')) IN ('LP','LIGHTLY PLAYED','LIGHTLY_PLAYED') THEN 'LIGHTLY_PLAYED'
          WHEN upper(coalesce(pc.condition,'')) IN ('MP','MODERATELY PLAYED','MODERATELY_PLAYED') THEN 'MODERATELY_PLAYED'
          WHEN upper(coalesce(pc.condition,'')) IN ('HP','HEAVILY PLAYED','HEAVILY_PLAYED') THEN 'HEAVILY_PLAYED'
          WHEN upper(coalesce(pc.condition,'')) IN ('DMG','DAMAGED') THEN 'DAMAGED'
          ELSE 'NEAR_MINT'
        END AS tier,
        CASE
          WHEN pc.variant ILIKE '%holo%' THEN 'Holofoil'
          WHEN pc.variant ILIKE '%reverse%' THEN 'Reverse_Holofoil'
          WHEN pc.variant IS NOT NULL AND pc.variant <> '' THEN 'Normal'
          WHEN kc_rarity.r ILIKE '%holo%' THEN 'Holofoil'
          ELSE 'Normal'
        END AS vmatch
      ) t
      LEFT JOIN LATERAL (
        SELECT pm.spot, pm.currency
        FROM price_matrix pm
        WHERE pm.print_id = kc.print_id
          AND pm.tier = t.tier
          AND pm.is_asking = false
          AND pm.spot IS NOT NULL
        ORDER BY
          CASE WHEN pm.variant = t.vmatch THEN 0 ELSE 1 END,
          CASE
            WHEN kc.lang = 'jp' THEN
              CASE pm.source WHEN 'ppt_tcgplayer' THEN 0 WHEN 'ppt_ebay' THEN 1 ELSE 2 END
            ELSE
              CASE pm.source WHEN 'tcgplayer' THEN 0 WHEN 'ppt_tcgplayer' THEN 1
                             WHEN 'ebay' THEN 2 WHEN 'ppt_ebay' THEN 3
                             WHEN 'cardmarket' THEN 4 ELSE 5 END
          END,
          pm.sale_count DESC NULLS LAST,
          pm.as_of DESC
        LIMIT 1
      ) best ON true
      WHERE (${scopeAll} OR pc.id = ANY(${ids as any}))
    )
    UPDATE portfolio_cards pc
    SET current_price = v.price_eur,
        price_basis = v.basis,
        updated_at = now()
    FROM (
      SELECT r.pc_id,
        CASE
          WHEN r.wanted_tier IN ('NEAR_MINT','LIGHTLY_PLAYED','MODERATELY_PLAYED','HEAVILY_PLAYED','DAMAGED')
            AND r.fair_value_method = 'insufficient_data' THEN NULL
          WHEN r.wanted_tier NOT IN ('NEAR_MINT','LIGHTLY_PLAYED','MODERATELY_PLAYED','HEAVILY_PLAYED','DAMAGED')
            AND r.spot IS NULL THEN NULL
          WHEN r.lang = 'fr' AND r.wanted_tier = 'NEAR_MINT' AND r.cote_fr_eur IS NOT NULL
            THEN ROUND(r.cote_fr_eur::numeric, 2)
          WHEN r.spot IS NOT NULL THEN
            ROUND((CASE WHEN r.currency = 'EUR' THEN r.spot
                        ELSE r.spot * (SELECT rate FROM fx) END)::numeric, 2)
          ELSE ROUND(r.fair_value_eur::numeric, 2)
        END AS price_eur,
        CASE
          WHEN r.wanted_tier IN ('NEAR_MINT','LIGHTLY_PLAYED','MODERATELY_PLAYED','HEAVILY_PLAYED','DAMAGED')
            AND r.fair_value_method = 'insufficient_data' THEN 'insufficient_data'
          WHEN r.wanted_tier NOT IN ('NEAR_MINT','LIGHTLY_PLAYED','MODERATELY_PLAYED','HEAVILY_PLAYED','DAMAGED')
            AND r.spot IS NULL THEN 'graded_no_data'
          WHEN r.lang = 'fr' AND r.wanted_tier = 'NEAR_MINT' AND r.cote_fr_eur IS NOT NULL THEN 'cote_fr'
          WHEN r.spot IS NOT NULL THEN 'tier:' || r.wanted_tier
          WHEN r.fair_value_eur IS NOT NULL THEN 'fair_value_fallback'
          ELSE NULL
        END AS basis
      FROM resolved r
    ) v
    WHERE v.pc_id = pc.id
      AND (v.price_eur IS NOT NULL OR v.basis IN ('insufficient_data','graded_no_data'))
      AND (pc.current_price IS DISTINCT FROM v.price_eur OR pc.price_basis IS DISTINCT FROM v.basis)
    RETURNING pc.id, pc.current_price, pc.price_basis
  `
  return (rows as any[]).map((r) => ({
    id: r.id,
    current_price: r.current_price != null ? Number(r.current_price) : null,
    price_basis: r.price_basis ?? null,
  }))
}
