-- Ajoute prices_by_condition à graded_prices_ppt (02/06/26)
-- Stocke les prix raw TCGplayer par condition: {"NM":556.84,"LP":509,"MP":369,"HP":281,"DMG":202}
-- Source: rr.prices.variants[primaryPrinting] (frais) avec fallback rr.prices.conditions
-- Rempli par le cron sync-graded-ppt.js (helper extractConditions) + backfill SQL one-shot.
-- Objectif: onglet Prix lit cette colonne legere au lieu de parser raw_response (~350KB)
ALTER TABLE graded_prices_ppt
  ADD COLUMN IF NOT EXISTS prices_by_condition jsonb;
