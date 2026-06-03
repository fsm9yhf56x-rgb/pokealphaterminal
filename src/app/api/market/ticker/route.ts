import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { sql } from '@/lib/db/sql'

export const runtime = 'nodejs'

/**
 * Ticker global (AppShell) — top cartes par valeur + variation 7j réelle.
 * Prix : prices_v2.top_price (GREATEST des sources).
 * Variation : prices_snapshots dernier vs snapshot ≤ 7j (NULL si historique absent).
 * Cache 5 min partagé entre tous les visiteurs (unstable_cache).
 */
const getTickerRows = unstable_cache(
  async () => {
    const rows = await sql`
      WITH top_cards AS (
        SELECT card_ref, card_name, set_slug, set_name, top_price
        FROM prices_v2
        WHERE top_price > 20
          AND card_name IS NOT NULL
        ORDER BY top_price DESC
        LIMIT 24
      ),
      latest AS (
        SELECT DISTINCT ON (s.card_ref)
          s.card_ref, s.price_avg AS p_now
        FROM prices_snapshots s
        JOIN top_cards t ON t.card_ref = s.card_ref
        WHERE s.price_avg > 0
        ORDER BY s.card_ref, s.fetched_at DESC, s.price_avg DESC
      ),
      past AS (
        SELECT DISTINCT ON (s.card_ref)
          s.card_ref, s.price_avg AS p_then
        FROM prices_snapshots s
        JOIN top_cards t ON t.card_ref = s.card_ref
        WHERE s.price_avg > 0
          AND s.fetched_at <= NOW() - INTERVAL '7 days'
        ORDER BY s.card_ref, s.fetched_at DESC, s.price_avg DESC
      )
      SELECT
        t.card_ref,
        t.card_name,
        t.set_slug,
        t.top_price,
        CASE
          WHEN p.p_then > 0 AND l.p_now IS NOT NULL
          THEN ROUND((((l.p_now - p.p_then) / p.p_then) * 100)::numeric, 1)
          ELSE NULL
        END AS change_pct
      FROM top_cards t
      LEFT JOIN latest l ON l.card_ref = t.card_ref
      LEFT JOIN past   p ON p.card_ref = t.card_ref
      ORDER BY t.top_price DESC
    `
    return rows as any[]
  },
  ['market-ticker-v1'],
  { revalidate: 300 },
)

export async function GET() {
  try {
    const rows = await getTickerRows()
    const items = rows.map((r) => ({
      name: r.card_name ?? 'Carte',
      price: Number(r.top_price) || 0,
      changePct: r.change_pct == null ? null : Number(r.change_pct),
    }))
    return NextResponse.json(
      { items, count: items.length },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } },
    )
  } catch (e: any) {
    // Jamais de 500 : la barre se masque, c'est tout.
    return NextResponse.json({ items: [], error: e?.message ?? 'error' }, { status: 200 })
  }
}
