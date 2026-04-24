-- ═══════════════════════════════════════════════════════════
-- PHASE 7 — ROLLBACK SCRIPT (EMERGENCY)
-- Use this if the rename `prices` → `_deprecated_prices` breaks prod.
-- 
-- Usage: Paste into Supabase SQL Editor and run.
-- After running: also `git revert HEAD` on the repo to restore code.
-- ═══════════════════════════════════════════════════════════

-- 1) Drop the VIEW that depends on the renamed table
DROP VIEW IF EXISTS prices_v2 CASCADE;

-- 2) Rename the table back to its original name
ALTER TABLE _deprecated_prices RENAME TO prices;

-- 3) Recreate prices_v2 pointing to 'prices' (original schema from commit 5)
CREATE VIEW prices_v2 AS
WITH latest_agg AS (
  SELECT
    card_ref AS pt_id,
    MAX(CASE WHEN source='ebay' AND variant='raw' THEN price_avg END) AS ebay_avg,
    MAX(CASE WHEN source='ebay' AND variant='raw' THEN price_low END) AS ebay_low,
    MAX(CASE WHEN source='ebay' AND variant='raw' THEN price_high END) AS ebay_high,
    MAX(CASE WHEN source='ebay' AND variant='raw' THEN nb_sales END) AS ebay_sales,
    MAX(CASE WHEN source='tcgplayer' AND variant='raw' THEN price_avg END) AS tcg_avg,
    MAX(CASE WHEN source='tcgplayer' AND variant='raw' THEN price_low END) AS tcg_low,
    MAX(CASE WHEN source='tcgplayer' AND variant='raw' THEN price_high END) AS tcg_high,
    MAX(CASE WHEN source='tcgplayer' AND variant='raw' THEN nb_sales END) AS tcg_sales,
    MAX(CASE WHEN source='cardmarket' AND variant='raw' THEN price_avg END) AS cardmarket_avg,
    MAX(CASE WHEN source='cardmarket' AND variant='raw' THEN price_low END) AS cardmarket_low,
    MAX(CASE WHEN source='cardmarket' AND variant='raw' THEN (source_meta->>'cardmarket_trend')::numeric END) AS cardmarket_trend,
    MAX(CASE WHEN variant='psa10' THEN price_avg END) AS psa10_avg,
    MAX(CASE WHEN variant='psa9' THEN price_avg END) AS psa9_avg,
    bool_or(variant IN ('psa10','psa9','psa8','bgs10','cgc10')) AS has_graded,
    MAX(fetched_at) AS latest_fetched,
    MAX(CASE WHEN source='ebay' OR source='tcgplayer' THEN currency END) AS latest_currency
  FROM prices_latest
  GROUP BY card_ref
)
SELECT 
  p.id, p.card_name, p.card_number, p.set_slug, p.set_name,
  p.poketrace_id, p.variant, p.source, p.market, p.condition,
  p.poketrace_id AS card_ref,
  COALESCE(la.ebay_avg, p.ebay_avg) AS ebay_avg,
  COALESCE(la.ebay_low, p.ebay_low) AS ebay_low,
  COALESCE(la.ebay_high, p.ebay_high) AS ebay_high,
  COALESCE(la.ebay_sales, p.ebay_sales) AS ebay_sales,
  COALESCE(la.tcg_avg, p.tcg_avg) AS tcg_avg,
  COALESCE(la.tcg_low, p.tcg_low) AS tcg_low,
  COALESCE(la.tcg_high, p.tcg_high) AS tcg_high,
  COALESCE(la.tcg_sales, p.tcg_sales) AS tcg_sales,
  COALESCE(la.cardmarket_avg, p.cardmarket_avg) AS cardmarket_avg,
  COALESCE(la.cardmarket_low, p.cardmarket_low) AS cardmarket_low,
  COALESCE(la.cardmarket_trend, p.cardmarket_trend) AS cardmarket_trend,
  COALESCE(la.psa10_avg, p.psa10_avg) AS psa10_avg,
  COALESCE(la.psa9_avg, p.psa9_avg) AS psa9_avg,
  COALESCE(la.has_graded, p.has_graded, false) AS has_graded,
  GREATEST(
    COALESCE(la.ebay_avg, p.ebay_avg),
    COALESCE(la.tcg_avg, p.tcg_avg),
    COALESCE(la.cardmarket_avg, p.cardmarket_avg)
  ) AS top_price,
  CASE 
    WHEN GREATEST(
      COALESCE(la.ebay_avg, p.ebay_avg),
      COALESCE(la.tcg_avg, p.tcg_avg),
      COALESCE(la.cardmarket_avg, p.cardmarket_avg)
    ) >= 20 THEN 'hot'
    WHEN GREATEST(
      COALESCE(la.ebay_avg, p.ebay_avg),
      COALESCE(la.tcg_avg, p.tcg_avg),
      COALESCE(la.cardmarket_avg, p.cardmarket_avg)
    ) >= 1 THEN 'warm'
    ELSE 'cold'
  END AS tier,
  COALESCE(la.latest_currency, p.currency) AS currency,
  COALESCE(la.latest_fetched, p.fetched_at) AS fetched_at
FROM prices p
LEFT JOIN latest_agg la ON la.pt_id = p.poketrace_id;

-- 4) Sanity checks
SELECT COUNT(*) AS prices_count FROM prices;
SELECT COUNT(*) AS v2_count FROM prices_v2;
SELECT card_name, top_price FROM prices_v2 ORDER BY top_price DESC NULLS LAST LIMIT 1;
-- Expected: Charizard @ $15000
