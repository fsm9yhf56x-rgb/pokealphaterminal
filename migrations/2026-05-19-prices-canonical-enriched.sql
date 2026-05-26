-- ========================================================================
-- prices_canonical V3 — ENRICHED
-- 2026-05-19
-- 
-- One unified resolver view that serves BOTH:
--   (1) new clients needing tcg_card_id (canonical FK to tcg_cards)
--   (2) legacy clients needing set_slug / canonical_id / lang_canon
--       (used by market_indices_v1, prices_v2, undervalued_signals_v1)
-- ========================================================================

DROP VIEW IF EXISTS prices_canonical CASCADE;

CREATE OR REPLACE VIEW prices_canonical AS
SELECT
  -- ── NEW: canonical FK to tcg_cards ────────────────────────────────────
  COALESCE(
    CASE
      WHEN ps.card_ref LIKE 'en-%' OR ps.card_ref LIKE 'fr-%' OR ps.card_ref LIKE 'aopkm-%'
      THEN ps.card_ref
      ELSE NULL
    END,
    ca_pt.tcg_card_id,
    ca_tcg.tcg_card_id,
    ca_ebay.tcg_card_id
  ) AS tcg_card_id,

  -- ── LEGACY columns (used by market_indices_v1 / prices_v2) ─────────────
  ps.id,
  ps.card_ref,
  ps.source,
  ps.variant,
  ps.lang AS lang_snap,
  ps.condition,
  ps.price_avg,
  ps.price_low,
  ps.price_high,
  ps.price_median,
  ps.nb_sales,
  ps.fetched_at,
  ps.source_meta,
  ps.currency,

  COALESCE(ca_pt.canonical_id, ca_tcg.canonical_id, ca_ebay.canonical_id)               AS canonical_id,
  COALESCE(ca_pt.set_slug,     ca_tcg.set_slug,     ca_ebay.set_slug)                   AS set_slug,
  COALESCE(ca_pt.lang,         ca_tcg.lang,         ca_ebay.lang)                       AS lang_canon,
  COALESCE(ca_pt.rarity_normalized, ca_tcg.rarity_normalized, ca_ebay.rarity_normalized) AS rarity_normalized

FROM prices_snapshots ps
LEFT JOIN card_aliases ca_pt   ON ca_pt.poketrace_id::text  = ps.card_ref
LEFT JOIN card_aliases ca_tcg  ON ca_tcg.tcgdex_card_ref    = ps.card_ref
LEFT JOIN card_aliases ca_ebay ON ca_ebay.ebay_card_ref     = ps.card_ref;

-- Sanity check
DO $$
DECLARE total int; resolved int; with_set_slug int;
BEGIN
  SELECT COUNT(*) INTO total FROM prices_canonical;
  SELECT COUNT(*) INTO resolved FROM prices_canonical WHERE tcg_card_id IS NOT NULL;
  SELECT COUNT(*) INTO with_set_slug FROM prices_canonical WHERE set_slug IS NOT NULL;
  RAISE NOTICE 'prices_canonical V3 : % rows, tcg_card_id resolved = %, with set_slug = %',
    total, resolved, with_set_slug;
END $$;
