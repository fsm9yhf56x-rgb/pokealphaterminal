-- ============================================================================
-- Migration : graded_prices_ppt — graded prices via PokemonPriceTracker
-- Date      : 2026-05-29
-- Rationale : Remplace prices_canonical (asks eBay listings, 21k€ Dracaufeu)
--             par real eBay sold data via PPT API ($9.99 API plan).
--             1 ligne par carte, JSONB pour tous les grades (PSA/CGC/BGS/SGC/...).
-- ============================================================================

CREATE TABLE IF NOT EXISTS graded_prices_ppt (
  -- Identité
  tcg_card_id        TEXT PRIMARY KEY,           -- ex: "en-base1-4", "aopkm-..."
  ppt_card_id        TEXT NOT NULL,              -- ObjectId Mongo PPT
  ppt_tcgplayer_id   TEXT,                       -- ex: "45167" (entier en string)

  -- Contexte carte (snapshot du fetch PPT)
  card_name          TEXT NOT NULL,
  card_number        TEXT,                       -- ex: "4/102"
  total_set_number   TEXT,
  set_name           TEXT,
  rarity             TEXT,
  language           TEXT NOT NULL,              -- 'english' | 'japanese'

  -- Prix raw (pour cohérence cross-source)
  raw_market_usd     NUMERIC(12, 2),             -- prices.market

  -- LA donnée principale : tous les grades en JSONB
  -- Structure: { "psa10": { "smartPrice": 14875, "confidence": "high", "count": 12, "median": 14500, ... }, ... }
  grades             JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Sales velocity & metadata (utile pour confidence/Hot scoring)
  total_sales        INTEGER,                    -- ebay.totalSales 90j
  total_value        NUMERIC(14, 2),             -- ebay.totalValue
  date_range_start   TIMESTAMPTZ,
  date_range_end     TIMESTAMPTZ,

  -- Tracking
  fetched_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_response       JSONB                       -- copie brute pour debug/migration
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_graded_prices_ppt_fetched_at
  ON graded_prices_ppt (fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_graded_prices_ppt_language
  ON graded_prices_ppt (language);

-- Index GIN sur grades pour requêtes type "toutes les PSA10 > 1000$"
CREATE INDEX IF NOT EXISTS idx_graded_prices_ppt_grades
  ON graded_prices_ppt USING gin (grades);

-- Vue pratique : un row "flat" pour le drawer (PSA10 / PSA9 / PSA8 / CGC10 en colonnes)
CREATE OR REPLACE VIEW graded_prices_flat AS
SELECT
  tcg_card_id,
  card_name,
  card_number,
  set_name,
  rarity,
  language,
  raw_market_usd,
  total_sales,
  (grades->'psa10'->>'smartPrice')::NUMERIC AS psa10_smart_usd,
  (grades->'psa10'->>'count')::INTEGER      AS psa10_count,
  (grades->'psa10'->>'confidence')          AS psa10_confidence,
  (grades->'psa9'->>'smartPrice')::NUMERIC  AS psa9_smart_usd,
  (grades->'psa9'->>'count')::INTEGER       AS psa9_count,
  (grades->'psa8'->>'smartPrice')::NUMERIC  AS psa8_smart_usd,
  (grades->'psa8'->>'count')::INTEGER       AS psa8_count,
  (grades->'cgc10'->>'smartPrice')::NUMERIC AS cgc10_smart_usd,
  (grades->'cgc9'->>'smartPrice')::NUMERIC  AS cgc9_smart_usd,
  (grades->'bgs10'->>'smartPrice')::NUMERIC AS bgs10_smart_usd,
  fetched_at
FROM graded_prices_ppt;

COMMENT ON TABLE graded_prices_ppt IS 'Real eBay sold graded prices via PokemonPriceTracker API. Refresh par roulement, ~bi-mensuel.';
COMMENT ON COLUMN graded_prices_ppt.grades IS 'JSONB structure: { "psa10": {smartPrice, confidence, count, median, min, max, marketTrend}, "psa9": {...}, ... }';
