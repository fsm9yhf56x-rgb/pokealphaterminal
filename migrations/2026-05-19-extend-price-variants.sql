-- ========================================================================
-- Extend price_variants to support Bloomberg-grade granularity
-- 2026-05-19
--
-- Adds: psa1-7, psa9_5, bgs1-9_5, cgc1-9_5, sgc1-10, pca1-10, ccc1-10
-- Keeps: raw, holo, reverse_holo, 1st_ed, shadowless, sealed, other
-- Deprecates: nothing (additive only)
-- ========================================================================

ALTER TABLE prices_snapshots DROP CONSTRAINT IF EXISTS check_variant;

ALTER TABLE prices_snapshots ADD CONSTRAINT check_variant CHECK (variant = ANY (ARRAY[
  -- Raw card states
  'raw'::text, 'holo'::text, 'reverse_holo'::text,
  '1st_ed'::text, 'shadowless'::text, 'sealed'::text, 'other'::text,
  -- PSA grades
  'psa_10'::text, 'psa_9_5'::text, 'psa_9'::text, 'psa_8_5'::text, 'psa_8'::text,
  'psa_7'::text, 'psa_6'::text, 'psa_5'::text, 'psa_4'::text, 'psa_3'::text,
  'psa_2'::text, 'psa_1'::text,
  -- BGS grades (Beckett)
  'bgs_10'::text, 'bgs_9_5'::text, 'bgs_9'::text, 'bgs_8_5'::text, 'bgs_8'::text,
  'bgs_7'::text, 'bgs_6'::text, 'bgs_5'::text, 'bgs_4'::text, 'bgs_3'::text,
  -- CGC grades
  'cgc_10'::text, 'cgc_9_5'::text, 'cgc_9'::text, 'cgc_8_5'::text, 'cgc_8'::text,
  'cgc_7'::text, 'cgc_6'::text, 'cgc_5'::text,
  -- SGC grades
  'sgc_10'::text, 'sgc_9_5'::text, 'sgc_9'::text, 'sgc_8'::text, 'sgc_7'::text,
  -- PCA grades (France)
  'pca_10'::text, 'pca_9'::text, 'pca_8'::text, 'pca_7'::text,
  -- CCC grades (France)
  'ccc_10'::text, 'ccc_9'::text, 'ccc_8'::text, 'ccc_7'::text,
  -- Legacy compatibility (DO NOT REMOVE, used by historical snapshots)
  'psa10'::text, 'psa9'::text, 'psa8'::text, 'bgs10'::text, 'cgc10'::text
]));

-- Verify
DO $$
DECLARE n int;
BEGIN
  SELECT COUNT(*) INTO n FROM prices_snapshots WHERE variant IS NULL;
  RAISE NOTICE 'prices_snapshots without variant: %', n;
END $$;
