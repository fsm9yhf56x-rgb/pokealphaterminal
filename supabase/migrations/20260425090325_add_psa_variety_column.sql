-- ═══════════════════════════════════════════════════════════
-- Add PSA variety dimension to pop reports
--
-- A single card_ref (e.g. base1-4 = Charizard Holo) can have
-- multiple PSA varieties: "" (Unlimited), "Shadowless",
-- "Black Dot Error", "Inverted Back", etc.
--
-- For varieties we map to our DB (Shadowless / 1st Edition),
-- card_ref points to the corresponding setId variant
-- (base1-shadowless-4, base1-1st-4).
--
-- For exotic varieties (Black Dot Error, Inverted Back, etc.),
-- we still capture the data even though no card_ref maps to it.
-- They are stored with card_ref = the canonical card (base1-4)
-- and the variety distinguishes them.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE psa_pop_reports
  ADD COLUMN IF NOT EXISTS variety        TEXT,
  ADD COLUMN IF NOT EXISTS subject_name   TEXT,
  ADD COLUMN IF NOT EXISTS card_number    TEXT;

ALTER TABLE psa_card_mapping
  ADD COLUMN IF NOT EXISTS variety        TEXT;

-- Drop the old unique constraint (card_ref, scraped_at)
-- since now multiple varieties of the same card can exist
ALTER TABLE psa_pop_reports
  DROP CONSTRAINT IF EXISTS uq_psa_pop_card_scrape;

-- New unique key: card_ref + psa_spec_id + scraped_at
-- (psa_spec_id uniquely identifies the variety in PSA's system)
ALTER TABLE psa_pop_reports
  ADD CONSTRAINT uq_psa_pop_card_spec_scrape
  UNIQUE (card_ref, psa_spec_id, scraped_at);

-- Index for fast variety lookup
CREATE INDEX IF NOT EXISTS idx_psa_pop_variety
  ON psa_pop_reports (card_ref, variety, scraped_at DESC);

-- Update the latest view to handle varieties
DROP VIEW IF EXISTS psa_pop_latest;

CREATE VIEW psa_pop_latest AS
SELECT DISTINCT ON (card_ref, psa_spec_id)
  card_ref,
  psa_spec_id,
  variety,
  subject_name,
  card_number,
  pop_8, pop_8_5, pop_9, pop_9_5, pop_10, pop_10_plus,
  pop_total,
  scraped_at,

  CASE
    WHEN pop_total > 0
    THEN ROUND(COALESCE(pop_10, 0)::numeric / pop_total * 100, 2)
    ELSE 0
  END AS pct_gem_mint,

  CASE
    WHEN pop_total > 0 THEN ROUND(
      (COALESCE(pop_9,0) + COALESCE(pop_9_5,0) + COALESCE(pop_10,0))::numeric
      / pop_total * 100,
      2
    )
    ELSE 0
  END AS pct_high_grade,

  CASE
    WHEN COALESCE(pop_10, 0) < 50    THEN 'very_rare'
    WHEN COALESCE(pop_10, 0) < 200   THEN 'rare'
    WHEN COALESCE(pop_10, 0) < 1000  THEN 'uncommon'
    ELSE 'common'
  END AS gem_mint_tier

FROM psa_pop_reports
ORDER BY card_ref, psa_spec_id, scraped_at DESC;

COMMENT ON COLUMN psa_pop_reports.variety IS
  'PSA variety modifier: "", "1st Edition", "Shadowless", "Black Dot Error", etc.';

COMMENT ON COLUMN psa_pop_reports.subject_name IS
  'PSA subject name as scraped (e.g. "Charizard-Holo"). For matching/debug.';

COMMENT ON COLUMN psa_pop_reports.card_number IS
  'PSA card number as scraped (e.g. "4" for Charizard). For matching/debug.';
