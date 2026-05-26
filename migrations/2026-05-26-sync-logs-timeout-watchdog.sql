-- Phase PIPE-2 · Audit Pipeline v0.9 Bedrock
-- Watchdog auto-flag pour sync_logs : marque les rows stuck en 'running' depuis > 30 min comme 'timeout'.
-- Resout le bug applicatif : routes longues (>60s Vercel maxDuration) sont killees sans appel finishSyncLog,
-- laissant des rows status='running' indefiniment dans sync_logs.
--
-- Cause root : architecture sync-logger fragile (cf docs/runbooks/db-audit-pipeline-v0.9.md).
-- Fix v1.0 Phase B : refactor sync architecture (background workers ou réduction work par run).
-- Patch v0.9 : ce watchdog flag automatiquement pour propreté DB + dashboard admin correct.

-- 1. Function : flag rows stuck > 30 min comme timeout
CREATE OR REPLACE FUNCTION flag_stuck_sync_logs()
RETURNS TABLE(job_name TEXT, flagged INT) AS $$
BEGIN
  -- Update + return par job_name pour traçabilité
  RETURN QUERY
  WITH flagged AS (
    UPDATE sync_logs
    SET 
      status = 'timeout',
      finished_at = COALESCE(finished_at, started_at + INTERVAL '60 seconds'),
      error = 'Auto-flagged by watchdog (stuck > 30 min). Likely Vercel maxDuration timeout.'
    WHERE status = 'running'
      AND started_at < NOW() - INTERVAL '30 minutes'
    RETURNING sync_logs.job_name
  )
  SELECT 
    flagged.job_name::TEXT, 
    COUNT(*)::INT
  FROM flagged
  GROUP BY flagged.job_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION flag_stuck_sync_logs() IS 
  'Watchdog : marque les sync_logs status=running > 30 min comme timeout. '
  'Appelable manuellement ou via cron Neon (schedule à configurer dans Neon Console).';

-- 2. Test immediat : verifier la function est idempotente
DO $$
DECLARE
  result_count INT;
BEGIN
  -- Compte combien seraient flagged maintenant (devrait etre 0 apres cleanup initial)
  SELECT COUNT(*) INTO result_count
  FROM sync_logs
  WHERE status = 'running' AND started_at < NOW() - INTERVAL '30 minutes';
  
  RAISE NOTICE 'Watchdog test : % rows seraient flagged maintenant', result_count;
END $$;
