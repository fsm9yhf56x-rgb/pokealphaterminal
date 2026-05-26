-- Phase DB-5 v0.9 · Audit Indexes
--
-- Ajoute idx_alpha_signals_computed_at pour anticiper la croissance de la table.
-- Actuellement 120 rows -> Seq Scan optimal pour PG.
-- A 10k+ rows (v1.0+) -> Index Scan sera essentiel pour rester < 100ms.
--
-- Pattern d'usage : SELECT * FROM alpha_signals ORDER BY computed_at DESC LIMIT N

CREATE INDEX IF NOT EXISTS idx_alpha_signals_computed_at 
  ON alpha_signals (computed_at DESC);
