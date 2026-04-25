-- ═══════════════════════════════════════════════════════════
-- PSA Pop Reports — Sprint 1 (500 VIP cards scope)
-- 
-- Introduces:
--   - psa_card_mapping  : bridge card_ref ↔ PSA Spec ID
--   - psa_pop_reports   : historical population snapshots
--   - psa_pop_latest    : view with latest pop + derived metrics
--   - psa_scrape_queue  : resumable scraping priority queue
-- ═══════════════════════════════════════════════════════════


-- ── Table 1: Mapping card_ref ↔ PSA Spec ID ──────────────────
CREATE TABLE IF NOT EXISTS psa_card_mapping (
  card_ref            TEXT PRIMARY KEY,
  psa_spec_id         TEXT NOT NULL,
  psa_set_id          TEXT NOT NULL,
  psa_card_name       TEXT,
  psa_card_number     TEXT,
  confidence          NUMERIC(3,2) DEFAULT 1.0,
  manually_verified   BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psa_mapping_spec
  ON psa_card_mapping (psa_spec_id);

CREATE INDEX IF NOT EXISTS idx_psa_mapping_low_confidence
  ON psa_card_mapping (confidence)
  WHERE confidence < 1.0;


-- ── Table 2: Pop Reports (historical snapshots) ──────────────
CREATE TABLE IF NOT EXISTS psa_pop_reports (
  id                  BIGSERIAL PRIMARY KEY,
  card_ref            TEXT NOT NULL,
  psa_spec_id         TEXT NOT NULL,

  -- Populations per grade (half-point increments)
  pop_1               INT, pop_1_5  INT,
  pop_2               INT, pop_2_5  INT,
  pop_3               INT, pop_3_5  INT,
  pop_4               INT, pop_4_5  INT,
  pop_5               INT, pop_5_5  INT,
  pop_6               INT, pop_6_5  INT,
  pop_7               INT, pop_7_5  INT,
  pop_8               INT, pop_8_5  INT,
  pop_9               INT, pop_9_5  INT,
  pop_10              INT,

  -- Qualifiers
  pop_10_plus         INT,
  pop_authentic       INT,
  pop_qualifier       JSONB,

  pop_total           INT NOT NULL DEFAULT 0,

  -- Sourcing metadata
  source_url          TEXT NOT NULL,
  scraped_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_psa_pop_card_scrape UNIQUE (card_ref, scraped_at)
);

CREATE INDEX IF NOT EXISTS idx_psa_pop_card_ref
  ON psa_pop_reports (card_ref);

CREATE INDEX IF NOT EXISTS idx_psa_pop_scraped
  ON psa_pop_reports (scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_psa_pop_card_scraped
  ON psa_pop_reports (card_ref, scraped_at DESC);


-- ── View: latest pop per card + derived metrics ──────────────
CREATE OR REPLACE VIEW psa_pop_latest AS
SELECT DISTINCT ON (card_ref)
  card_ref,
  psa_spec_id,
  pop_8, pop_8_5, pop_9, pop_9_5, pop_10, pop_10_plus,
  pop_total,
  scraped_at,

  -- % GEM MINT (PSA 10) over total
  CASE
    WHEN pop_total > 0
    THEN ROUND(COALESCE(pop_10, 0)::numeric / pop_total * 100, 2)
    ELSE 0
  END AS pct_gem_mint,

  -- % High-grade (PSA 9 + 9.5 + 10)
  CASE
    WHEN pop_total > 0 THEN ROUND(
      (COALESCE(pop_9,0) + COALESCE(pop_9_5,0) + COALESCE(pop_10,0))::numeric
      / pop_total * 100,
      2
    )
    ELSE 0
  END AS pct_high_grade,

  -- Scarcity tier for PSA 10
  CASE
    WHEN COALESCE(pop_10, 0) < 50    THEN 'very_rare'
    WHEN COALESCE(pop_10, 0) < 200   THEN 'rare'
    WHEN COALESCE(pop_10, 0) < 1000  THEN 'uncommon'
    ELSE 'common'
  END AS gem_mint_tier

FROM psa_pop_reports
ORDER BY card_ref, scraped_at DESC;


-- ── Table 4: Scrape queue (priority + resumable) ─────────────
CREATE TABLE IF NOT EXISTS psa_scrape_queue (
  card_ref            TEXT PRIMARY KEY,
  priority            INT NOT NULL DEFAULT 100,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'done', 'failed', 'skipped')),
  attempts            INT NOT NULL DEFAULT 0,
  last_attempt_at     TIMESTAMPTZ,
  last_error          TEXT,
  scheduled_for       TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psa_queue_pending
  ON psa_scrape_queue (priority, scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_psa_queue_status
  ON psa_scrape_queue (status);


-- ── Row-Level Security ───────────────────────────────────────
ALTER TABLE psa_pop_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE psa_card_mapping  ENABLE ROW LEVEL SECURITY;
ALTER TABLE psa_scrape_queue  ENABLE ROW LEVEL SECURITY;

-- Public read for pop data (anyone browsing the app can see)
CREATE POLICY "public_read_psa_pop_reports"
  ON psa_pop_reports FOR SELECT USING (true);

CREATE POLICY "public_read_psa_card_mapping"
  ON psa_card_mapping FOR SELECT USING (true);

-- No policies on psa_scrape_queue: only service_role can read/write


-- ── Documentation ────────────────────────────────────────────
COMMENT ON TABLE psa_pop_reports IS
  'Historical PSA population snapshots per card. One row per scrape.';

COMMENT ON TABLE psa_card_mapping IS
  'Bridge between card_ref (our format: setId-localId) and PSA Spec IDs. Built at first scrape.';

COMMENT ON TABLE psa_scrape_queue IS
  'Priority queue for PSA scraping. Resumable across runs via status tracking.';

COMMENT ON VIEW psa_pop_latest IS
  'Latest pop per card + derived metrics (gem mint %, high-grade %, scarcity tier).';
