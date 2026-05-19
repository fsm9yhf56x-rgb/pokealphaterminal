-- ========================================================================
-- Backfill set_aliases from tcg_sets
-- 2026-05-19
--
-- Strategy:
--   1. For each tcg_sets row missing in set_aliases, insert one row
--   2. For en-*, aopkm-*, other: use tcg_sets.name directly (already EN)
--   3. For fr-*: lookup EN equivalent via id suffix match (fr-base1 -> en-base1)
--   4. tcgdex_slug derived by slugifying the EN name
-- ========================================================================

-- Helper function: slugify (idempotent)
CREATE OR REPLACE FUNCTION slugify(input text) RETURNS text AS $$
DECLARE
  result text;
BEGIN
  result := LOWER(input);
  -- Replace accents
  result := translate(result,
    'àáâãäåèéêëìíîïòóôõöùúûüýÿñçœæ''’',
    'aaaaaaeeeeiiiiooooouuuuyyncoea  ');
  -- Replace non-alphanumeric with hyphens
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  -- Strip leading/trailing hyphens
  result := trim(both '-' from result);
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Test the function (sanity check)
SELECT slugify('Set de Base') AS test1,
       slugify('Pokémon GO') AS test2,
       slugify('Base Set (No Rarity)') AS test3,
       slugify('Genetic Apex') AS test4;

-- ── Insert missing entries ──
-- For en-*/aopkm-*/other sets: their tcg_sets.name is already EN-compatible
INSERT INTO set_aliases (tcgdex_slug, lang, variant, internal_set_id, name, total_cards, notes)
SELECT
  slugify(ts.name)        AS tcgdex_slug,
  ts.lang                 AS lang,
  'standard'              AS variant,
  ts.id                   AS internal_set_id,
  ts.name                 AS name,
  ts.total_cards          AS total_cards,
  'auto-backfilled 2026-05-19 from tcg_sets' AS notes
FROM tcg_sets ts
WHERE NOT EXISTS (SELECT 1 FROM set_aliases sa WHERE sa.internal_set_id = ts.id)
  AND (ts.id LIKE 'en-%' OR ts.id LIKE 'aopkm-%' OR ts.id NOT LIKE '%-%' OR ts.id NOT LIKE 'fr-%')
ON CONFLICT DO NOTHING;

-- For fr-* sets: use the slug from their en-* equivalent (same suffix)
INSERT INTO set_aliases (tcgdex_slug, lang, variant, internal_set_id, name, total_cards, notes)
SELECT
  COALESCE(en_alias.tcgdex_slug, slugify(ts.name))  AS tcgdex_slug,
  ts.lang AS lang,
  'standard' AS variant,
  ts.id AS internal_set_id,
  COALESCE(en_alias.name, ts.name) AS name,
  ts.total_cards AS total_cards,
  CASE WHEN en_alias.tcgdex_slug IS NOT NULL
       THEN 'auto-backfilled 2026-05-19 (matched via EN equivalent)'
       ELSE 'auto-backfilled 2026-05-19 (FR name, no EN equivalent found)'
  END AS notes
FROM tcg_sets ts
LEFT JOIN set_aliases en_alias
  ON en_alias.internal_set_id = REPLACE(ts.id, 'fr-', 'en-')
  AND en_alias.lang = 'EN'
WHERE ts.id LIKE 'fr-%'
  AND NOT EXISTS (SELECT 1 FROM set_aliases sa WHERE sa.internal_set_id = ts.id)
ON CONFLICT DO NOTHING;

-- ── Stats ──
DO $$
DECLARE
  total int; with_slug int;
BEGIN
  SELECT COUNT(*) INTO total FROM set_aliases;
  SELECT COUNT(*) INTO with_slug FROM set_aliases WHERE tcgdex_slug IS NOT NULL AND tcgdex_slug != '';
  RAISE NOTICE 'set_aliases post-backfill: % rows, % with tcgdex_slug', total, with_slug;
END $$;

-- ── Coverage check vs tcg_sets ──
SELECT
  (SELECT COUNT(*) FROM tcg_sets) AS total_tcg_sets,
  (SELECT COUNT(*) FROM set_aliases) AS total_aliases,
  (SELECT COUNT(*) FROM tcg_sets ts 
   WHERE NOT EXISTS (SELECT 1 FROM set_aliases sa WHERE sa.internal_set_id = ts.id)
  ) AS still_missing;
