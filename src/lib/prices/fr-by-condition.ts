/** RÈGLE 5 — Prix FR par état : UNE seule implémentation.
 *  Consommée par /api/spotlight (fiche) ET par le moteur portfolio (priceCards).
 *  Règle : annonces Cardmarket FR (breakdown FR/FR, saleCount>=FR_MIN_ASKING,
 *  garde-fou outlier x5), sinon repli kodo_state marqué derived. */
export const FR_RAW_TIERS = ['NEAR_MINT','EXCELLENT','LIGHTLY_PLAYED','MODERATELY_PLAYED','HEAVILY_PLAYED','DAMAGED'] as const
export const FR_MIN_ASKING = 3

/** Échelle de décote, ancrée sur EXCELLENT = 1.00 (identique à kodo_state,
 *  vérifiée sur les prints qui possèdent déjà l'échelle complète). */
export const DECAY: Record<string, number> = {
  NEAR_MINT: 1.38, EXCELLENT: 1.00, LIGHTLY_PLAYED: 0.79,
  MODERATELY_PLAYED: 0.65, HEAVILY_PLAYED: 0.53, DAMAGED: 0.42,
}
export interface FrCond { price: number; saleCount: number; isAsking: boolean; derived?: boolean }

export function buildFrByCondition(matrixRows: any[], coteRef: number | null): Record<string, FrCond> {
  const out: Record<string, FrCond> = {}
  const outlierMax = coteRef != null ? coteRef * 5 : Infinity
  for (const r of matrixRows) {
    if (!(FR_RAW_TIERS as readonly string[]).includes(r.tier)) continue
    if (r.source !== 'cardmarket_unsold') continue
    const fr = r.country_breakdown?.FR?.language?.FR
    if (!fr || fr.avg == null) continue
    const price = Number(fr.avg)
    const sc = Number(fr.saleCount ?? 0)
    if (!(price > 0) || price > outlierMax) continue
    if (sc < FR_MIN_ASKING) continue
    const prev = out[r.tier]
    if (!prev || sc > prev.saleCount) out[r.tier] = { price: Math.round(price * 100) / 100, saleCount: sc, isAsking: true }
  }
  for (const r of matrixRows) {
    if (r.source !== 'kodo_state') continue
    if (!(FR_RAW_TIERS as readonly string[]).includes(r.tier)) continue
    if (out[r.tier]) continue
    const k = Number(r.spot)
    if (!(k > 0)) continue
    out[r.tier] = { price: Math.round(k * 100) / 100, saleCount: 0, isAsking: true, derived: true }
  }
  // ÉTAGE 3 — Dès qu'UN prix raw valide existe (vente conclue ou annonce en
  // cours, quel que soit l'état), on ancre dessus et on extrapole les états
  // manquants avec la même échelle que kodo_state. Marqué derived (~).
  const missing = (FR_RAW_TIERS as readonly string[]).filter((t) => !out[t])
  if (missing.length) {
    let anchor: { price: number; tier: string; sold: boolean; sales: number } | null = null
    for (const r of matrixRows) {
      const tier = String(r.tier)
      if (!DECAY[tier]) continue
      if (r.source === 'kodo_state') continue
      const fr = r.country_breakdown?.FR?.language?.FR
      const price = Number(fr?.avg ?? r.spot)
      if (!(price > 0) || price > outlierMax) continue
      const sold = r.is_asking === false
      const sales = Number(fr?.saleCount ?? r.sale_count ?? 0)
      const better = !anchor
        || (sold && !anchor.sold)
        || (sold === anchor.sold && sales > anchor.sales)
      if (better) anchor = { price, tier, sold, sales }
    }
    if (anchor) {
      const base = anchor.price / DECAY[anchor.tier]
      for (const t of missing) {
        const v = Math.round(base * DECAY[t] * 100) / 100
        if (v > 0) out[t] = { price: v, saleCount: 0, isAsking: !anchor.sold, derived: true }
      }
    }
  }
  return out
}

/** condition portfolio -> tier FR (même échelle que la fiche). */
export function rawTierFromCondition(condition: string | null | undefined): string {
  const c = String(condition ?? '').trim().toUpperCase()
  if (['NM','MT','MINT','NEAR MINT','NEAR_MINT'].includes(c)) return 'NEAR_MINT'
  if (['EX','GD','GOOD','EXCELLENT'].includes(c)) return 'EXCELLENT'
  if (['LP','LIGHTLY PLAYED','LIGHTLY_PLAYED'].includes(c)) return 'LIGHTLY_PLAYED'
  if (['MP','PL','PLAYED','MODERATELY PLAYED','MODERATELY_PLAYED'].includes(c)) return 'MODERATELY_PLAYED'
  if (['HP','HEAVILY PLAYED','HEAVILY_PLAYED'].includes(c)) return 'HEAVILY_PLAYED'
  if (['DMG','PO','POOR','DAMAGED'].includes(c)) return 'DAMAGED'
  return 'NEAR_MINT'
}

/** EN/JP : NEAR_MINT vendu (is_asking=false), source au plus gros volume.
 *  Même règle que le headline de la fiche. */
export function pickNearMintNonFr(matrixRows: any[], fxUsdEur: number): number | null {
  let best: { price: number; sales: number } | null = null
  for (const m of matrixRows) {
    if (m.tier !== 'NEAR_MINT' || m.is_asking) continue
    const raw = Number(m.spot)
    if (!(raw > 0)) continue
    const price = String(m.currency).toUpperCase() === 'USD' ? raw * fxUsdEur : raw
    const sales = Number(m.sale_count ?? 0)
    if (!best || sales > best.sales) best = { price, sales }
  }
  return best ? Math.round(best.price * 100) / 100 : null
}
