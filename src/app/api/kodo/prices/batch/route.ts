import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'
import { checkPublicRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/kodo/prices/batch?ids=en-ex1-8,fr-ex1-8,... (max 200)
// Reponse legere pour grilles: fairValue + cote langue + liquidite
export async function GET(req: NextRequest) {
  // Route publique : protection cout / abus (fail-open si Upstash down).
  const _rl = await checkPublicRateLimit(req, 'data')
  if (_rl) return _rl

  try {
    const idsParam = req.nextUrl.searchParams.get('ids') || ''
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 200)
    if (!ids.length) return NextResponse.json({ prices: {} })

    const rows = await sql.query(
      `SELECT kc.id, kc.lang,
              ps.fair_value_eur, ps.fair_value_method, ps.cote_fr_eur,
              ps.liquidity_score, ps.computed_at
       FROM k_cards kc
       LEFT JOIN price_signals ps ON ps.print_id = kc.print_id AND ps.lang = kc.lang
       WHERE lower(kc.id) = ANY($1)`, [ids.map(x => x.toLowerCase())])

    // REPLI EXCELLENT. Quand la regle FR stricte ne trouve aucune source pure,
    // fair_value_eur est NULL par construction (insufficient_data) et la tuile
    // reste vide alors que la fiche montre une echelle par etat complete.
    // DECAY.EXCELLENT=1.00 -> la ligne EXCELLENT est le prix headline.
    // ATTENTION : kodo_state vit par print_id, SANS langue — la valeur est donc
    // partagee avec la carte anglaise. Ce n'est pas une cote FR, c'est une
    // reference europeenne : l'UI doit l'afficher comme telle (basis='eu_ref').
    const muets = (rows as any[])
      .filter(r => r.fair_value_eur == null && r.cote_fr_eur == null)
      .map(r => String(r.id))
    const repli: Record<string, number> = {}
    if (muets.length) {
      const rf = await sql.query(
        `SELECT kc.id, pm.spot
           FROM k_cards kc
           JOIN price_matrix pm ON pm.print_id = kc.print_id
          WHERE kc.id = ANY($1) AND pm.market = 'EU'
            AND pm.tier = 'EXCELLENT' AND pm.source = 'kodo_state'`, [muets])
      for (const r of rf as any[]) {
        if (r.spot != null) repli[String(r.id).toLowerCase()] = Number(r.spot)
      }
    }

    const prices: Record<string, any> = {}
    for (const r of rows as any[]) {
      const fair = r.fair_value_eur != null ? Number(r.fair_value_eur) : null
      const coteFr = r.cote_fr_eur != null ? Number(r.cote_fr_eur) : null
      const key = String(r.id).toLowerCase()
      const direct = r.lang === 'fr' && coteFr != null ? coteFr : fair
      const ref = direct == null ? (repli[key] ?? null) : null
      prices[key] = {
        fairValueEur: fair,
        // Pour une carte FR, privilegier la cote FR quand elle existe
        displayEur: direct != null ? direct : ref,
        coteFrEur: coteFr,
        method: r.fair_value_method ?? null,
        // 'eu_ref' -> l'UI doit distinguer visuellement : reference EU (toutes
        // langues), pas une cote de la langue affichee.
        basis: direct != null ? 'cote' : (ref != null ? 'eu_ref' : null),
        liquidity: r.liquidity_score ?? null,
      }
    }
    return NextResponse.json({ prices, engine: 'kodo-v1' })
  } catch (e: any) {
    console.error('[kodo/prices/batch]', e.message)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
