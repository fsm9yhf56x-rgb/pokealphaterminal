import { NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'

export const dynamic = 'force-dynamic'

/**
 * GET /api/sets/logos
 * Retourne un map { [setId]: { logo, symbol, total, era, name } } depuis k_sets_export (Kodo Engine).
 * Sert a afficher les vrais logos officiels des sets (completion, etc.).
 */
export async function GET() {
  try {
    const r = await sql.query(`
      SELECT id, name, logo_url, NULL AS symbol_url, NULL AS era, total_cards
      FROM k_sets_export
      WHERE logo_url IS NOT NULL OR total_cards IS NOT NULL
    `)
    const rows: any[] = (r as any).rows ?? r ?? []
    const map: Record<string, { logo: string | null; symbol: string | null; total: number; era: string | null; name: string }> = {}
    for (const row of rows) {
      map[row.id] = {
        logo: row.logo_url ?? null,
        symbol: row.symbol_url ?? null,
        total: Number(row.total_cards ?? 0),
        era: row.era ?? null,
        name: row.name ?? row.id,
      }
    }
    return NextResponse.json({ sets: map }, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
    })
  } catch (e) {
    return NextResponse.json({ sets: {}, error: 'fetch_failed' }, { status: 200 })
  }
}
