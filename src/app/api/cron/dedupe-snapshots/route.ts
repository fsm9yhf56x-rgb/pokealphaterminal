/**
 * GET /api/cron/dedupe-snapshots
 *
 * Policy de retention prices_snapshots: garde 1 snapshot par
 * (card_ref, source, variant, condition, jour) — le plus recent.
 * Supprime les doublons intra-jour crees par le cron prix (toutes les 4h).
 * Historique conserve indefiniment a granularite 1/jour.
 *
 * Lots de 25k avec garde-fou pour ne pas saturer le WAL Neon.
 * Protege par CRON_SECRET (header Authorization: Bearer ou ?secret=).
 */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: Request) {
  // Auth cron
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  const authHeader = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  const ok = expected && (secret === expected || authHeader === `Bearer ${expected}`)
  if (!ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    let totalDeleted = 0
    let round = 0
    const MAX_ROUNDS = 30 // 30 × 25k = 750k max par run (large marge pour 1 journee de doublons)

    while (round < MAX_ROUNDS) {
      round++
      const res = await sql`
        DELETE FROM prices_snapshots
        WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
              PARTITION BY card_ref, source, variant, condition, DATE(fetched_at)
              ORDER BY fetched_at DESC
            ) AS rn
            FROM prices_snapshots
          ) t
          WHERE rn > 1
          LIMIT 25000
        )
        RETURNING id
      `
      const n = res.length
      totalDeleted += n
      if (n === 0) break
    }

    const after = await sql`SELECT COUNT(*)::int AS rows FROM prices_snapshots`

    return NextResponse.json({
      ok: true,
      deleted: totalDeleted,
      rounds: round,
      rows_remaining: after[0].rows,
      note: round >= MAX_ROUNDS ? 'MAX_ROUNDS atteint, relancer si besoin' : 'complet',
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'internal', message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
