import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Liste blanche : on ne surveille QUE ce qui est cense tourner.
// Les fossiles sync_logs (prices_ebay_*, prices_tcgdex_*, alpha_signals_compute...)
// sont ignores : plus aucun script vivant ne les produit.
const DATA_CHECKS: Array<{ name: string; table: string; col: string; thresholdH: number; note: string }> = [
  { name: 'catalogue (tcg_sets)',        table: 'tcg_sets',          col: 'updated_at',  thresholdH: 8 * 24, note: 'sync-catalog cron lundi 04h' },
  { name: 'prix signals',                table: 'price_signals',     col: 'computed_at', thresholdH: 30,     note: 'kodo-consolidate nocturne' },
  { name: 'prix matrix',                 table: 'price_matrix',      col: 'as_of',       thresholdH: 30,     note: 'kodo-consolidate nocturne' },
  { name: 'graded (graded_prices_ppt)',  table: 'graded_prices_ppt', col: 'fetched_at',  thresholdH: 8 * 24, note: 'rotation graded par lots' },
]

// Curseur kodo_sync_state : job_id surveilles + leur seuil. Les autres job_id
// (mappings one-shot 'completed') sont ignores volontairement.
const CURSOR_CHECKS: Array<{ jobId: string; thresholdH: number; note: string }> = [
  { jobId: 'kodo_ingest_prices_v1', thresholdH: 30, note: 'ingest prix EN/JP' },
  { jobId: 'kodo_ingest_eu_fr',     thresholdH: 30, note: 'ingest prix FR' },
]

export async function GET() {
  const url = process.env.DATABASE_URL
  if (!url) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL absente' }, { status: 500 })
  }
  const sql = neon(url)
  const checks: Array<Record<string, unknown>> = []

  // 1) Fraicheur de la donnee (max timestamp par table)
  for (const c of DATA_CHECKS) {
    try {
      const rows = (await sql.query(
        `SELECT round(EXTRACT(EPOCH FROM (now() - max("${c.col}")))/3600, 1) AS age_h FROM "${c.table}"`
      )) as Array<{ age_h: number | null }>
      const ageH = rows[0]?.age_h == null ? null : Number(rows[0].age_h)
      const stale = ageH == null || ageH > c.thresholdH
      checks.push({ kind: 'data', name: c.name, age_h: ageH, threshold_h: c.thresholdH, stale, note: c.note })
    } catch (e) {
      checks.push({ kind: 'data', name: c.name, age_h: null, threshold_h: c.thresholdH, stale: true, error: (e as Error).message, note: c.note })
    }
  }

  // 2) Curseur des ingests (kodo_sync_state.last_run_at)
  for (const c of CURSOR_CHECKS) {
    try {
      const rows = (await sql`
        SELECT status,
               round(EXTRACT(EPOCH FROM (now() - last_run_at))/3600, 1) AS age_h,
               items_done, items_total
        FROM kodo_sync_state WHERE job_id = ${c.jobId} LIMIT 1
      `) as Array<{ status: string | null; age_h: number | null; items_done: number | null; items_total: number | null }>
      if (!rows.length) {
        checks.push({ kind: 'cursor', name: c.jobId, age_h: null, threshold_h: c.thresholdH, stale: true, note: c.note + ' (introuvable)' })
        continue
      }
      const r = rows[0]
      const ageH = r.age_h == null ? null : Number(r.age_h)
      const stale = ageH == null || ageH > c.thresholdH
      checks.push({
        kind: 'cursor', name: c.jobId, status: r.status, age_h: ageH, threshold_h: c.thresholdH,
        stale, progress: `${r.items_done ?? '?'}/${r.items_total ?? '?'}`, note: c.note,
      })
    } catch (e) {
      checks.push({ kind: 'cursor', name: c.jobId, age_h: null, threshold_h: c.thresholdH, stale: true, error: (e as Error).message, note: c.note })
    }
  }

  const healthy = checks.every(c => c.stale === false)
  return NextResponse.json({
    ok: true,
    healthy,
    checked_at: new Date().toISOString(),
    stale_count: checks.filter(c => c.stale).length,
    checks,
  })
}
