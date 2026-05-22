-- =====================================================================
-- Migration: PSA Japanese Set Mappings
-- Date: 2026-05-22
-- Purpose: Map PSA jp-XXX set codes to TCGdex aopkm-NNN set IDs
-- =====================================================================

CREATE TABLE IF NOT EXISTS psa_set_mappings (
  psa_set_code  TEXT PRIMARY KEY,
  tcg_set_id    TEXT NOT NULL,
  set_name      TEXT,
  confidence    TEXT NOT NULL DEFAULT 'auto',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT psa_set_mappings_tcg_set_id_fk
    FOREIGN KEY (tcg_set_id) REFERENCES tcg_sets(id) ON DELETE CASCADE,
  CONSTRAINT confidence_valid
    CHECK (confidence IN ('verified', 'auto', 'manual'))
);

CREATE INDEX IF NOT EXISTS idx_psa_set_mappings_tcg_set_id
  ON psa_set_mappings(tcg_set_id);

CREATE INDEX IF NOT EXISTS idx_psa_set_mappings_confidence
  ON psa_set_mappings(confidence);
