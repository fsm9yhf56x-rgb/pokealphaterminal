-- Table pour tracker l'avancement des syncs longs (graded EN, JP matching, etc.)
-- Remplace les fichiers JSON locaux par persistance Neon (idempotent, observable)

CREATE TABLE IF NOT EXISTS sync_progress (
  job_id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,             -- 'graded_ppt_en' | 'graded_ppt_jp' | 'fr_waitlist' | ...
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'running' | 'completed' | 'failed' | 'paused'

  -- Items list (sets, cards, etc.)
  items_total INTEGER NOT NULL DEFAULT 0,
  items_done INTEGER NOT NULL DEFAULT 0,
  items_skipped INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,

  -- Items list (JSONB)
  items_pending JSONB NOT NULL DEFAULT '[]'::jsonb,   -- a traiter
  items_completed JSONB NOT NULL DEFAULT '[]'::jsonb, -- deja fait
  items_errors JSONB NOT NULL DEFAULT '[]'::jsonb,    -- {item, error, retries}

  -- Cost tracking
  credits_consumed INTEGER NOT NULL DEFAULT 0,
  credits_budget INTEGER,             -- budget total alloue

  -- Stats
  cards_inserted INTEGER NOT NULL DEFAULT 0,
  cards_updated INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Metadata libre (langue, parametres, etc.)
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_progress_status ON sync_progress(status, job_type);
CREATE INDEX IF NOT EXISTS idx_sync_progress_last_run ON sync_progress(last_run_at DESC);

COMMENT ON TABLE sync_progress IS
  'Tracking des jobs de sync longs (multi-jours). Remplace les fichiers JSON locaux.';
