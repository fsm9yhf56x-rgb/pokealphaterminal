// Logger de sync — migré Supabase → Neon (@neondatabase/serverless)
const { neon } = require('@neondatabase/serverless');

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL manquante (sync-logger)');
  return neon(url);
}

async function startSyncLog(jobName, triggeredBy = 'manual') {
  try {
    const sql = getSql();
    const rows = await sql`
      INSERT INTO sync_logs (job_name, status, triggered_by)
      VALUES (${jobName}, 'running', ${triggeredBy})
      RETURNING id, started_at
    `;
    const data = rows[0];
    console.log(`📝 sync_log #${String(data.id).slice(0, 8)} started (${jobName})`);
    return { id: data.id, startedAt: new Date(data.started_at) };
  } catch (e) {
    console.error('⚠️ startSyncLog failed:', e.message);
    return { id: null, startedAt: new Date() };
  }
}

async function finishSyncLog(logId, status, stats = {}, error = null) {
  if (!logId) return;
  try {
    const sql = getSql();
    await sql`
      UPDATE sync_logs
      SET status = ${status},
          stats = ${JSON.stringify(stats)},
          error = ${error},
          finished_at = NOW()
      WHERE id = ${logId}
    `;
    const duration = stats.duration_ms ? ` (${stats.duration_ms}ms)` : '';
    const icon = status === 'success' ? '✅' : '❌';
    console.log(`${icon} sync_log #${String(logId).slice(0, 8)} ${status}${duration}`);
  } catch (e) {
    console.error('⚠️ finishSyncLog failed:', e.message);
  }
}

async function getRecentRuns(jobName, limit = 5) {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM sync_logs
      WHERE job_name = ${jobName}
      ORDER BY started_at DESC
      LIMIT ${limit}
    `;
    return rows || [];
  } catch {
    return [];
  }
}

module.exports = { startSyncLog, finishSyncLog, getRecentRuns };
