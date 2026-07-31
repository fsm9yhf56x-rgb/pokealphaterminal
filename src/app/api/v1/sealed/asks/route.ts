import { NextResponse } from 'next/server'
import { ebayItemUrl, affiliationActive } from '@/lib/ebay-link'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/sealed/asks?p=fr-sm12-display&limit=12
 *
 * Les ANNONCES REELLES d'un produit, triees du moins cher au plus cher.
 *
 * Distinction a garder en tete cote UI : la cote (sealed_prices.market_eur) est
 * une mediane decotee, personne ne vend a ce prix. Ces lignes-ci sont ce qu'on
 * peut acheter maintenant. Deux natures differentes, deux blocs distincts.
 *
 * FRAICHEUR : le journal est rafraichi une fois par nuit. Une annonce vue a
 * 07h30 peut etre vendue a midi — d'ou seenAt renvoye a l'appelant, qui doit
 * l'afficher. Un lien mort deçoit et ne rapporte aucune commission.
 */
export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams
    const product = (sp.get('p') || '').trim()
    if (!product || !/^[a-z]{2}-[a-z0-9._-]+$/i.test(product)) {
      return NextResponse.json({ error: 'parametre p invalide' }, { status: 400 })
    }
    const limit = Math.min(Math.max(Number(sp.get('limit') || 12), 1), 50)
    const lang = product.slice(0, 2).toLowerCase()

    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.DATABASE_URL as string)

    // excluded = false : les rejets (lots, precommandes, non scelles, defauts)
    // n'ont rien a faire dans une liste d'achat. Ils restent au journal pour le
    // controle qualite, pas pour l'utilisateur.
    const rows = await sql.query(
      `SELECT item_id, title, price, currency, seller, condition_raw,
              image_url, last_seen_at
         FROM sealed_asks_raw
        WHERE sealed_id = $1
          AND excluded = false
          AND price > 0
          AND last_seen_at > now() - interval '3 days'
        ORDER BY price ASC
        LIMIT $2`,
      [product, limit]
    ) as Array<Record<string, unknown>>

    const asks = rows
      .map((r) => {
        const url = ebayItemUrl(String(r.item_id), lang, 'sealed-' + product)
        if (!url) return null
        return {
          url,
          title: String(r.title ?? ''),
          price: Number(r.price),
          currency: String(r.currency ?? 'EUR'),
          seller: r.seller ? String(r.seller) : null,
          condition: r.condition_raw ? String(r.condition_raw) : null,
          image: r.image_url ? String(r.image_url) : null,
          seenAt: r.last_seen_at ? new Date(String(r.last_seen_at)).toISOString() : null,
        }
      })
      .filter(Boolean)

    return NextResponse.json(
      { product, count: asks.length, affiliate: affiliationActive(), asks },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } }
    )
  } catch (e) {
    console.error('[api/v1/sealed/asks]', e)
    return NextResponse.json({ error: 'erreur serveur' }, { status: 500 })
  }
}
