-- ========================================================================
-- prices_canonical — vue de résolution universelle des prix
-- 2026-05-19 (v2 syntax-fixed)
-- ========================================================================

DROP VIEW IF EXISTS prices_canonical CASCADE;

CREATE OR REPLACE VIEW prices_canonical AS
SELECT
  COALESCE(
    -- 1. Direct match if source writes tcg_cards.id format
    CASE
      WHEN p.card_ref LIKE 'en-%' OR p.card_ref LIKE 'fr-%' OR p.card_ref LIKE 'aopkm-%'
      THEN p.card_ref
      ELSE NULL
    END,
    -- 2. Via PokeTrace UUID
    (SELECT a.tcg_card_id FROM card_aliases a 
     WHERE a.poketrace_id::text = p.card_ref AND a.tcg_card_id IS NOT NULL LIMIT 1),
    -- 3. Via TCGdex slug
    (SELECT a.tcg_card_id FROM card_aliases a 
     WHERE a.tcgdex_card_ref = p.card_ref AND a.tcg_card_id IS NOT NULL LIMIT 1),
    -- 4. Via eBay ref (futur)
    (SELECT a.tcg_card_id FROM card_aliases a 
     WHERE a.ebay_card_ref = p.card_ref AND a.tcg_card_id IS NOT NULL LIMIT 1)
  ) AS tcg_card_id,
  p.card_ref AS source_card_ref,
  p.source,
  p.lang,
  p.variant,
  p.condition,
  p.price_avg,
  p.price_low,
  p.price_high,
  p.price_median,
  p.nb_sales,
  p.currency,
  p.fetched_at,
  p.source_meta
FROM prices_snapshots p;

DO $$
DECLARE total int; resolved int;
BEGIN
  SELECT COUNT(*) INTO total FROM prices_canonical;
  SELECT COUNT(*) INTO resolved FROM prices_canonical WHERE tcg_card_id IS NOT NULL;
  RAISE NOTICE 'prices_canonical: % / % resolved (%.1f%%)',
    resolved, total, 100.0 * resolved / NULLIF(total, 0);
END $$;
