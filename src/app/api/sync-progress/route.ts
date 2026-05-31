/**
 * /api/sync-progress
 *
 * Endpoint d'observabilite pour les jobs long-running (sync_progress table).
 * Lecture seule. Aucune mutation. Pas de credentials exposes.
 *
 * Usage:
 *   GET /api/sync-progress                              → tous les jobs (lite)
 *   GET /api/sync-progress?job_id=graded_ppt_en_...     → 1 job (detail)
 */

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const jobId = url.searchParams.get('job_id')

  try {
    if (jobId) {
      // Detail d'un job (avec items_pending/completed/errors limites pour eviter payload geant)
      const result = await sql.query(`
        SELECT
          job_id, job_type, status,
          items_total, items_done, items_skipped, items_failed,
          credits_consumed, credits_budget,
          cards_inserted, cards_updated,
          created_at, started_at, last_run_at, completed_at,
          metadata, notes,
          jsonb_array_length(items_pending) AS pending_count,
          jsonb_array_length(items_completed) AS completed_count,
          jsonb_array_length(items_errors) AS errors_count,
          (items_pending #> '{}')::jsonb #>> '{0}' AS next_item,
          items_errors AS errors_last_50
        FROM sync_progress
        WHERE job_id = $1
      `, [jobId])

      if (result.length === 0) {
        return NextResponse.json({ error: 'Job not found', job_id: jobId }, { status: 404 })
      }
      const job = result[0]
      const progressPct = job.items_total > 0
        ? Math.round((job.items_done / job.items_total) * 100)
        : 0
      const budgetPct = job.credits_budget
        ? Math.round((job.credits_consumed / job.credits_budget) * 100)
        : null
      return NextResponse.json({ ...job, progress_pct: progressPct, budget_pct: budgetPct })
    }

    // Liste de tous les jobs (sans payload JSONB lourd)
    const result = await sql.query(`
      SELECT
        job_id, job_type, status,
        items_total, items_done,
        credits_consumed, credits_budget,
        cards_inserted,
        last_run_at, completed_at, started_at,
        CASE WHEN items_total > 0
          THEN ROUND((items_done::numeric / items_total) * 100)
          ELSE 0
        END AS progress_pct
      FROM sync_progress
      ORDER BY last_run_at DESC NULLS LAST, created_at DESC;
    `)

    return NextResponse.json({
      count: result.length,
      jobs: result,
    })
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 })
  }
}
