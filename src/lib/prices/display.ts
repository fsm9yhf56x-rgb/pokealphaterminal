/** RÈGLE 5 — Source unique des prix d'affichage (grilles web ET mobile).
 *  batch, /api/v1/cards/search et /api/v1/sets consomment CETTE fonction. */
import { buildFrByCondition, pickNearMintNonFr } from '@/lib/prices/fr-by-condition'

export interface DisplayPrice {
  fairValueEur: number | null
  displayEur: number | null
  coteFrEur: number | null
  method: string | null
  basis: 'cote' | 'eu_ref' | null
  liquidity: number | null
}

export async function getDisplayPrices(
  sql: any,
  idsRaw: string[],
): Promise<Record<string, DisplayPrice>> {
  const ids = [...new Set(idsRaw.map((x) => String(x).trim().toLowerCase()).filter(Boolean))].slice(0, 400)
  if (!ids.length) return {}
  const rows = await sql.query(
    `SELECT kc.id, kc.lang,
            ps.fair_value_eur, ps.fair_value_method, ps.cote_fr_eur, ps.liquidity_score
     FROM k_cards kc
     LEFT JOIN price_signals ps ON ps.print_id = kc.print_id AND ps.lang = kc.lang
     WHERE lower(kc.id) = ANY($1)`, [ids])
  const muets = (rows as any[])
    .filter((r) => r.fair_value_eur == null && r.cote_fr_eur == null)
    .map((r) => String(r.id))
  const repli: Record<string, number> = {}
  if (muets.length) {
    const rf = await sql.query(
      `SELECT kc.id, pm.spot
         FROM k_cards kc
         JOIN price_matrix pm ON pm.print_id = kc.print_id
        WHERE kc.id = ANY($1) AND pm.market = 'EU'
          AND pm.tier = 'NEAR_MINT' AND pm.source = 'kodo_state'`, [muets])
    for (const r of rf as any[]) {
      if (r.spot != null) repli[String(r.id).toLowerCase()] = Number(r.spot)
    }
  }
  // HEADLINE NM (identique à la fiche) : table par état pour FR, ventes NM pour EN/JP.
  const fxRow = await sql.query(
    `SELECT rate FROM fx_rates WHERE from_currency='USD' AND to_currency='EUR' ORDER BY rate_date DESC LIMIT 1`)
  const fx = Number((fxRow as any[])?.[0]?.rate ?? 0.92)
  const nmRows = await sql.query(
    `SELECT pm.kodo_card_id, pm.tier, pm.source, pm.spot, pm.sale_count,
            pm.is_asking, pm.currency, pm.country_breakdown
       FROM price_matrix pm
      WHERE lower(pm.kodo_card_id) = ANY($1)
        AND pm.tier = 'NEAR_MINT' AND pm.spot IS NOT NULL AND pm.spot > 0`, [ids])
  const byCard = new Map<string, any[]>()
  for (const m of nmRows as any[]) {
    const k = String(m.kodo_card_id).toLowerCase()
    if (!byCard.has(k)) byCard.set(k, [])
    byCard.get(k)!.push(m)
  }
  const nmByCard: Record<string, { price: number; derived: boolean }> = {}
  for (const r of rows as any[]) {
    const key = String(r.id).toLowerCase()
    const mrows = byCard.get(key) ?? []
    if (!mrows.length) continue
    if (String(r.lang).toLowerCase() === 'fr') {
      const coteRef = r.cote_fr_eur != null ? Number(r.cote_fr_eur)
        : (r.fair_value_eur != null ? Number(r.fair_value_eur) : null)
      const nm = buildFrByCondition(mrows, coteRef).NEAR_MINT
      if (nm) nmByCard[key] = { price: nm.price, derived: !!nm.derived }
    } else {
      const p = pickNearMintNonFr(mrows, fx)
      if (p != null) nmByCard[key] = { price: p, derived: false }
    }
  }

  const out: Record<string, DisplayPrice> = {}
  for (const r of rows as any[]) {
    const fair = r.fair_value_eur != null ? Number(r.fair_value_eur) : null
    const coteFr = r.cote_fr_eur != null ? Number(r.cote_fr_eur) : null
    const key = String(r.id).toLowerCase()
    const direct = r.lang === 'fr' && coteFr != null ? coteFr : fair
    const ref = direct == null ? (repli[key] ?? null) : null
    out[key] = {
      fairValueEur: fair,
      displayEur: nmByCard[key]?.price ?? (direct != null ? direct : ref),
      coteFrEur: coteFr,
      method: r.fair_value_method ?? null,
      basis: nmByCard[key] ? (nmByCard[key].derived ? 'eu_ref' : 'cote')
        : (direct != null ? 'cote' : (ref != null ? 'eu_ref' : null)),
      liquidity: r.liquidity_score ?? null,
    }
  }
  return out
}
