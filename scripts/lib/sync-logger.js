const { createClient } = require('@supabase/supabase-js');

function getSupa() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function startSyncLog(jobName, triggeredBy = 'manual') {
  const supa = getSupa();
  const { data, error } = await supa
    .from('sync_logs')
    .insert({
      job_name: jobName,
      status: 'running',
      triggered_by: triggeredBy,
    })
    .select('id, started_at')
    .single();
  if (error) {
    console.error('⚠️ startSyncLog failed:', error.message);
    return { id: null, startedAt: new Date() };
  }
  console.log(`📝 sync_log #${data.id.slice(0, 8)} started (${jobName})`);
  return { id: data.id, startedAt: new Date(data.started_at) };
}

async function finishSyncLog(logId, status, stats = {}, error = null) {
  if (!logId) return;
  const supa = getSupa();
  const { error: updErr } = await supa
    .from('sync_logs')
    .update({
      status,
      stats,
      error,
      finished_at: new Date().toISOString(),
    })
    .eq('id', logId);
  if (updErr) {
    console.error('⚠️ finishSyncLog failed:', updErr.message);
    return;
  }
  const duration = stats.duration_ms ? ` (${stats.duration_ms}ms)` : '';
  const icon = status === 'success' ? '✅' : '❌';
  console.log(`${icon} sync_log #${logId.slice(0, 8)} ${status}${duration}`);
}

async function getRecentRuns(jobName, limit = 5) {
  const supa = getSupa();
  const { data } = await supa
    .from('sync_logs')
    .select('*')
    .eq('job_name', jobName)
    .order('started_at', { ascending: false })
    .limit(limit);
  return data || [];
}

module.exports = {
  startSyncLog,
  finishSyncLog,
  getRecentRuns,
};
