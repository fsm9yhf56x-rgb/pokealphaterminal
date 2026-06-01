/**
 * /api/releases
 *
 * Sets Pokemon TCG a venir (cardCount=0 + releaseDate > now).
 * Source: sync_progress.items_pending (job 'tcg_sets_upcoming_meta').
 */

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_req: NextRequest) {
  try {
    const result = await sql.query(`
      SELECT items_pending, last_run_at
      FROM sync_progress
      WHERE job_id = 'tcg_sets_upcoming_meta';
    `)

    if (result.length === 0) {
      return NextResponse.json({ count: 0, sets: [], lastSynced: null })
    }

    const rawSets = result[0].items_pending || []
    const now = new Date()

    const sets = (Array.isArray(rawSets) ? rawSets : [])
      .filter((s: any) => s && s.releaseDate)
      .map((s: any) => {
        const releaseDate = new Date(s.releaseDate)
        const daysUntil = Math.ceil((releaseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const releaseDateLocale = releaseDate.toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', year: 'numeric'
        })
        return {
          name: s.name,
          slug: s.tcgPlayerId,
          pptId: s.pptId,
          series: s.series,
          releaseDate: s.releaseDate,
          releaseDateLocale,
          imageUrl: s.imageUrl,
          daysUntil,
          isReleased: daysUntil <= 0,
        }
      })
      .sort((a: any, b: any) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime())

    return NextResponse.json({
      count: sets.length,
      sets,
      lastSynced: result[0].last_run_at,
    })
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 })
  }
}
