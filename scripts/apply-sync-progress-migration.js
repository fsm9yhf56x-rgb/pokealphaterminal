require('dotenv').config({ path: '.env.production.local' });
const { neon } = require('@neondatabase/serverless');

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS sync_progress (
    job_id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    items_total INTEGER NOT NULL DEFAULT 0,
    items_done INTEGER NOT NULL DEFAULT 0,
    items_skipped INTEGER NOT NULL DEFAULT 0,
    items_failed INTEGER NOT NULL DEFAULT 0,
    items_pending JSONB NOT NULL DEFAULT '[]'::jsonb,
    items_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
    items_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    credits_consumed INTEGER NOT NULL DEFAULT 0,
    credits_budget INTEGER,
    cards_inserted INTEGER NOT NULL DEFAULT 0,
    cards_updated INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sync_progress_status ON sync_progress(status, job_type)`,
  `CREATE INDEX IF NOT EXISTS idx_sync_progress_last_run ON sync_progress(last_run_at DESC)`,
  `COMMENT ON TABLE sync_progress IS 'Tracking des jobs de sync longs (multi-jours). Remplace les fichiers JSON locaux.'`,
];

(async () => {
  const sql = neon(process.env.DATABASE_URL);

  console.log(`Executing ${STATEMENTS.length} statements\n`);
  for (let i = 0; i < STATEMENTS.length; i++) {
    const stmt = STATEMENTS[i];
    const preview = stmt.slice(0, 90).replace(/\s+/g, ' ');
    try {
      await sql.query(stmt);
      console.log(`[${i+1}/${STATEMENTS.length}] OK: ${preview}...`);
    } catch (e) {
      console.error(`[${i+1}/${STATEMENTS.length}] FAIL: ${preview}`);
      console.error('  Error:', e.message);
      process.exit(1);
    }
  }

  // Verify
  const cols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name='sync_progress'
    ORDER BY ordinal_position;
  `;
  console.log('\n=== sync_progress columns ===');
  cols.forEach(c => console.log(c.column_name.padEnd(25) + '| ' + c.data_type));

  const rows = await sql`SELECT COUNT(*) AS n FROM sync_progress;`;
  console.log('\nsync_progress rows:', rows[0].n);
})();
