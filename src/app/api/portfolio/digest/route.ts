/**
 * GET /api/portfolio/digest
 *
 * Valorise le portfolio de l'utilisateur courant via la vue card_price_resolved
 * (source réelle : PPT pour EN). Calcul à la volée (source de vérité).
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { sql } from '@/lib/db/sql'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const rows = (await sql`
      SELECT
        pc.id,
        pc.name,
        pc.set_id,
        pc.card_number,
        pc.lang,
        COALESCE(pc.qty, 1)               AS qty,
        r.price_eur                       AS price_eur
      FROM portfolio_cards pc
      LEFT JOIN card_price_resolved r
        ON r.set_id = pc.set_id
       AND r.card_number = ltrim(pc.card_number, '0')
       AND r.lang = pc.lang
      WHERE pc.user_id = ${user.id}
    `) as Array<{
      id: string
      name: string
      set_id: string | null
      card_number: string | null
      lang: string | null
      qty: number
      price_eur: number | null
    }>

    let valueEur = 0
    let resolved = 0
    const items: Array<{
      name: string; set_id: string | null; card_number: string | null
      qty: number; price_eur: number; value_eur: number
    }> = []

    for (const r of rows) {
      const qty = Number(r.qty) || 1
      const price = r.price_eur != null ? Number(r.price_eur) : null
      if (price != null) {
        resolved++
        const v = price * qty
        valueEur += v
        items.push({
          name: r.name,
          set_id: r.set_id,
          card_number: r.card_number,
          qty,
          price_eur: price,
          value_eur: Math.round(v * 100) / 100,
        })
      }
    }

    items.sort((a, b) => b.value_eur - a.value_eur)

    return NextResponse.json({
      currency: 'EUR',
      value_eur: Math.round(valueEur * 100) / 100,
      cards_total: rows.length,
      cards_resolved: resolved,
      cards_unresolved: rows.length - resolved,
      top_value: items.slice(0, 5),
    })
  } catch (e: any) {
    console.error('[api/portfolio/digest]', e?.message)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
