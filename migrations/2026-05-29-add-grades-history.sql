-- Ajoute colonne grades_history (extrait depuis raw_response.ebay.priceHistory)
ALTER TABLE graded_prices_ppt 
  ADD COLUMN IF NOT EXISTS grades_history JSONB;

-- Backfill depuis raw_response (zéro coût, juste un UPDATE)
UPDATE graded_prices_ppt
SET grades_history = COALESCE(raw_response->'ebay'->'priceHistory', '{}'::jsonb)
WHERE grades_history IS NULL OR grades_history = '{}'::jsonb;

-- Index sur les keys du JSONB (utile si on requête "toutes les cartes ayant un historique PSA10")
CREATE INDEX IF NOT EXISTS idx_graded_prices_ppt_grades_history
  ON graded_prices_ppt USING gin (grades_history);
