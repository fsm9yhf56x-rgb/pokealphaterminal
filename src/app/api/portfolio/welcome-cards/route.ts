import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { sql } from '@/lib/db/sql'

export const runtime = 'nodejs'

/**
 * Cartes "vitrine" pour l'écran de bienvenue (portfolio vide).
 *
 * prices_v2 JOIN set_aliases (tcgdex_slug = set_slug) pour récupérer
 * internal_set_id + lang. localId = dernier segment du card_ref, MAIS
 * uniquement s'il est plausible (numérique ou promo type XY107) — on rejette
 * les card_ref en UUID dont la "queue" n'est pas un vrai numéro de carte.
 *
 * setId envoyé brut (avec éventuel suffixe variant) : getCardImageUrl strippe
 * les variants (-shadowless, -1st...) pour pointer sur le set de base R2.
 *
 * Sur-échantillonne (12) : le client garde les 3 premières dont l'image charge.
 * Cache 1h, jamais de 500.
 */
const getWelcomeCards = unstable_cache(
  async () => {
    const rows = await sql`
      SELECT DISTINCT ON (p.card_name)
        p.card_name,
        regexp_replace(p.card_ref, '^.*-', '')                 AS local_id,
        regexp_replace(sa.internal_set_id, '^(en|fr|jp|aopkm)-', '') AS set_id,
        sa.lang
      FROM prices_v2 p
      JOIN set_aliases sa ON sa.tcgdex_slug = p.set_slug
      WHERE p.top_price > 80
        AND p.card_name IS NOT NULL
        AND sa.internal_set_id IS NOT NULL
        -- localId plausible : soit numérique pur, soit promo (lettres+chiffres courts)
        AND regexp_replace(p.card_ref, '^.*-', '') ~ '^([0-9]{1,4}|[A-Za-z]{1,4}[0-9]{1,4})$'
      ORDER BY p.card_name, p.top_price DESC
      LIMIT 40
    `
    // Mélange + 12 max
    const arr = rows as any[]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr.slice(0, 12)
  },
  ['welcome-cards-v2'],
  { revalidate: 3600 },
)

export async function GET() {
  try {
    const rows = await getWelcomeCards()
    const cards = rows.map((r) => ({
      name: r.card_name as string,
      lang: r.lang as string,
      setId: r.set_id as string,
      localId: String(r.local_id),
    }))
    return NextResponse.json(
      { cards },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } },
    )
  } catch (e: any) {
    return NextResponse.json({ cards: [], error: e?.message ?? 'error' }, { status: 200 })
  }
}
