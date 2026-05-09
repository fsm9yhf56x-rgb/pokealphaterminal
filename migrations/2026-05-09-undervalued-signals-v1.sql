-- Undervalued Signals V1 (Cardmarket EU vs eBay US arbitrage)
-- Date: 2026-05-09
-- Used by: src/lib/useUndervalued.ts → SousEvalues page

CREATE OR REPLACE VIEW undervalued_signals_v1 AS
WITH base_signals AS (
  SELECT
    pv.card_ref,
    pv.card_name,
    pv.set_name,
    pv.set_slug,
    pv.card_number,
    pv.variant,
    pv.cardmarket_trend AS price_eu,
    pv.ebay_avg AS price_us,
    pv.ebay_sales,
    pv.tcg_avg,
    pv.has_graded,
    pv.tier AS source_tier,
    ROUND(((pv.ebay_avg / NULLIF(pv.cardmarket_trend, 0) - 1) * 100)::numeric, 1) AS upside_pct,
    ROUND((pv.ebay_avg - pv.cardmarket_trend)::numeric, 2) AS gap_eur
  FROM prices_v2 pv
  WHERE pv.cardmarket_trend > 5
    AND pv.ebay_avg > 0
    AND pv.ebay_sales >= 3
    AND pv.ebay_avg > pv.cardmarket_trend * 1.15
    AND pv.ebay_avg / pv.cardmarket_trend < 50
)
SELECT
  card_ref, card_name, set_name, set_slug, card_number, variant,
  price_eu, price_us, gap_eur, upside_pct,
  ebay_sales, has_graded,
  LEAST(100, GREATEST(0,
    LEAST(30, ebay_sales * 2)::int +
    (CASE WHEN tcg_avg > 0 THEN 20 ELSE 0 END) +
    LEAST(30, (upside_pct / 5)::int) +
    (CASE WHEN price_eu > 50 THEN 20 WHEN price_eu > 20 THEN 12 WHEN price_eu > 10 THEN 6 ELSE 0 END)
  ))::int AS confidence,
  CASE
    WHEN upside_pct >= 50 AND ebay_sales >= 8 THEN 'S'
    WHEN upside_pct >= 30 AND ebay_sales >= 5 THEN 'A'
    ELSE 'B'
  END AS signal_tier,
  CONCAT(
    'Cardmarket EU à €', ROUND(price_eu::numeric, 2)::text,
    ' vs eBay US €', ROUND(price_us::numeric, 2)::text,
    ' (', ebay_sales::text, ' ventes récentes)'
  ) AS reason
FROM base_signals
ORDER BY signal_tier ASC, upside_pct DESC, confidence DESC;
