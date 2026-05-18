-- =========================================================================
-- Migration : prices_v2 → ajout tcgdex_set_id + lang (résolus via set_aliases)
-- Date      : 2026-05-18
-- Contexte  : Fix Explorer images. prices_v2.set_slug (ex: "base-set") +
--             card_number ("001/100") ne suffisent pas à reconstruire l'URL R2
--             (en/base1/4.webp). On ajoute 2 colonnes calculees via JOIN.
-- Couverture : 308/315 slugs (97.8 %)
-- Desambig  : EN > FR > JP (DISTINCT ON par tcgdex_slug)
-- =========================================================================

CREATE OR REPLACE VIEW prices_v2 AS
WITH latest_agg AS (
  SELECT
    prices_latest.card_ref AS pt_id,
    max(CASE WHEN prices_latest.source = 'ebay'      AND prices_latest.variant = 'raw' THEN prices_latest.price_avg END) AS ebay_avg,
    max(CASE WHEN prices_latest.source = 'ebay'      AND prices_latest.variant = 'raw' THEN prices_latest.price_low END) AS ebay_low,
    max(CASE WHEN prices_latest.source = 'ebay'      AND prices_latest.variant = 'raw' THEN prices_latest.price_high END) AS ebay_high,
    max(CASE WHEN prices_latest.source = 'ebay'      AND prices_latest.variant = 'raw' THEN prices_latest.nb_sales END) AS ebay_sales,
    max(CASE WHEN prices_latest.source = 'tcgplayer' AND prices_latest.variant = 'raw' THEN prices_latest.price_avg END) AS tcg_avg,
    max(CASE WHEN prices_latest.source = 'tcgplayer' AND prices_latest.variant = 'raw' THEN prices_latest.price_low END) AS tcg_low,
    max(CASE WHEN prices_latest.source = 'tcgplayer' AND prices_latest.variant = 'raw' THEN prices_latest.price_high END) AS tcg_high,
    max(CASE WHEN prices_latest.source = 'tcgplayer' AND prices_latest.variant = 'raw' THEN prices_latest.nb_sales END) AS tcg_sales,
    max(CASE WHEN prices_latest.source = 'cardmarket' AND prices_latest.variant = 'raw' THEN prices_latest.price_avg END) AS cardmarket_avg,
    max(CASE WHEN prices_latest.source = 'cardmarket' AND prices_latest.variant = 'raw' THEN prices_latest.price_low END) AS cardmarket_low,
    max(CASE WHEN prices_latest.source = 'cardmarket' AND prices_latest.variant = 'raw' THEN (prices_latest.source_meta ->> 'cardmarket_trend')::numeric END) AS cardmarket_trend,
    max(CASE WHEN prices_latest.variant = 'psa10' THEN prices_latest.price_avg END) AS psa10_avg,
    max(CASE WHEN prices_latest.variant = 'psa9'  THEN prices_latest.price_avg END) AS psa9_avg,
    bool_or(prices_latest.variant = ANY (ARRAY['psa10','psa9','psa8','bgs10','cgc10'])) AS has_graded,
    max(prices_latest.fetched_at) AS latest_fetched,
    max(CASE WHEN prices_latest.source IN ('ebay','tcgplayer') THEN prices_latest.currency END) AS latest_currency
  FROM prices_latest
  GROUP BY prices_latest.card_ref
),
alias_resolved AS (
  SELECT DISTINCT ON (tcgdex_slug)
    tcgdex_slug,
    lang AS resolved_lang,
    CASE
      WHEN internal_set_id LIKE 'en-%'    THEN substring(internal_set_id FROM 4)
      WHEN internal_set_id LIKE 'fr-%'    THEN substring(internal_set_id FROM 4)
      WHEN internal_set_id LIKE 'aopkm-%' THEN substring(internal_set_id FROM 7)
      ELSE internal_set_id
    END AS tcgdex_set_id
  FROM set_aliases
  ORDER BY
    tcgdex_slug,
    CASE lang
      WHEN 'EN' THEN 1
      WHEN 'FR' THEN 2
      WHEN 'JP' THEN 3
      ELSE 9
    END
)
SELECT
  p.id,
  p.card_name,
  p.card_number,
  p.set_slug,
  p.set_name,
  p.poketrace_id,
  p.variant,
  p.source,
  p.market,
  p.condition,
  p.poketrace_id AS card_ref,
  COALESCE(la.ebay_avg,   p.ebay_avg)   AS ebay_avg,
  COALESCE(la.ebay_low,   p.ebay_low)   AS ebay_low,
  COALESCE(la.ebay_high,  p.ebay_high)  AS ebay_high,
  COALESCE(la.ebay_sales, p.ebay_sales) AS ebay_sales,
  COALESCE(la.tcg_avg,    p.tcg_avg)    AS tcg_avg,
  COALESCE(la.tcg_low,    p.tcg_low)    AS tcg_low,
  COALESCE(la.tcg_high,   p.tcg_high)   AS tcg_high,
  COALESCE(la.tcg_sales,  p.tcg_sales)  AS tcg_sales,
  COALESCE(la.cardmarket_avg::real,   p.cardmarket_avg)   AS cardmarket_avg,
  COALESCE(la.cardmarket_low::real,   p.cardmarket_low)   AS cardmarket_low,
  COALESCE(la.cardmarket_trend::real, p.cardmarket_trend) AS cardmarket_trend,
  COALESCE(la.psa10_avg, p.psa10_avg) AS psa10_avg,
  COALESCE(la.psa9_avg,  p.psa9_avg)  AS psa9_avg,
  COALESCE(la.has_graded, p.has_graded, false) AS has_graded,
  GREATEST(
    COALESCE(la.ebay_avg, p.ebay_avg)::real,
    COALESCE(la.tcg_avg,  p.tcg_avg)::real,
    COALESCE(la.cardmarket_avg::real, p.cardmarket_avg)
  ) AS top_price,
  CASE
    WHEN GREATEST(
      COALESCE(la.ebay_avg, p.ebay_avg)::real,
      COALESCE(la.tcg_avg,  p.tcg_avg)::real,
      COALESCE(la.cardmarket_avg::real, p.cardmarket_avg)
    ) >= 20 THEN 'hot'
    WHEN GREATEST(
      COALESCE(la.ebay_avg, p.ebay_avg)::real,
      COALESCE(la.tcg_avg,  p.tcg_avg)::real,
      COALESCE(la.cardmarket_avg::real, p.cardmarket_avg)
    ) >= 1 THEN 'warm'
    ELSE 'cold'
  END AS tier,
  COALESCE(la.latest_currency, p.currency)   AS currency,
  COALESCE(la.latest_fetched,  p.fetched_at) AS fetched_at,
  ar.tcgdex_set_id,
  ar.resolved_lang AS lang
FROM _deprecated_prices p
  LEFT JOIN latest_agg     la ON la.pt_id = p.poketrace_id
  LEFT JOIN alias_resolved ar ON ar.tcgdex_slug = p.set_slug;
