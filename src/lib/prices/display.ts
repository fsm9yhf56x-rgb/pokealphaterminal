/** RÈGLE 5 — Source unique des prix d'affichage (grilles web ET mobile).
 *  batch, /api/v1/cards/search et /api/v1/sets consomment CETTE fonction. */
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
          AND pm.tier = 'EXCELLENT' AND pm.source = 'kodo_state'`, [muets])
    for (const r of rf as any[]) {
      if (r.spot != null) repli[String(r.id).toLowerCase()] = Number(r.spot)
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
      displayEur: direct != null ? direct : ref,
      coteFrEur: coteFr,
      method: r.fair_value_method ?? null,
      basis: direct != null ? 'cote' : (ref != null ? 'eu_ref' : null),
      liquidity: r.liquidity_score ?? null,
    }
  }
  return out
}
