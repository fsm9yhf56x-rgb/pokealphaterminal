-- ========================================================================
-- Canonical Card Mapping — connect card_aliases to tcg_cards
-- 2026-05-19
--
-- Goal: provide a single canonical key (tcg_cards.id) reachable from any
-- price snapshot, regardless of source convention (UUID PT, slug TCGdex,
-- future eBay item_id, etc.).
--
-- Strategy:
--   1. Add tcg_card_id column to card_aliases
--   2. Backfill via algorithmic reconciliation (set_slug + local_id + lang)
--   3. Create prices_canonical view that resolves all conventions
-- ========================================================================

-- 1. Add canonical link column
ALTER TABLE card_aliases
  ADD COLUMN IF NOT EXISTS tcg_card_id text;

CREATE INDEX IF NOT EXISTS idx_card_aliases_tcg_card_id
  ON card_aliases(tcg_card_id)
  WHERE tcg_card_id IS NOT NULL;

-- 2. Backfill — match via (set_slug, local_id, lang)
-- Strategy: tcg_cards.set_id is prefixed by lang (e.g. 'en-svp', 'fr-base1')
-- card_aliases.set_slug is NOT prefixed (e.g. 'svp', 'base1')
-- So we strip the prefix from tcg_cards.set_id to match.
UPDATE card_aliases a
SET tcg_card_id = c.id
FROM tcg_cards c
WHERE a.tcg_card_id IS NULL
  AND c.local_id = a.card_number_clean
  AND c.lang = a.lang
  AND (
    c.set_id = a.set_slug                          -- direct match (rare)
    OR c.set_id = CONCAT(LOWER(a.lang), '-', a.set_slug)  -- lang-prefixed
  );

-- 3. Stats post-backfill (info)
DO $$
DECLARE
  total int;
  matched int;
BEGIN
  SELECT COUNT(*) INTO total FROM card_aliases;
  SELECT COUNT(*) INTO matched FROM card_aliases WHERE tcg_card_id IS NOT NULL;
  RAISE NOTICE 'card_aliases backfill: % / % matched (%.1f%%)',
    matched, total, 100.0 * matched / NULLIF(total, 0);
END $$;
