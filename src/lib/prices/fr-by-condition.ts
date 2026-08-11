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
      // L'ancre doit elle-même être fiable : seuil FR_MIN_ASKING respecté.
      if (Number(fr?.saleCount ?? r.sale_count ?? 0) < FR_MIN_ASKING && r.is_asking !== false) continue
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

/** RÈGLE 5b — Cote FR affichée = l'état LE MIEUX DOCUMENTÉ, pas un tier fixe.
 *  Décision Alon 11/08 : la cote suit le volume réel (annonces/ventes), sinon
 *  on affiche un NEAR_MINT extrapolé pendant que le moteur de signaux dit
 *  insufficient_data — deux chiffres contradictoires sur la même fiche.
 *  Un état `derived` (saleCount 0, extrapolé par l'échelle DECAY) n'est JAMAIS
 *  une cote : s'il n'existe que des états derived, il n'y a pas de cote. */
export interface FrCote { tier: string; price: number; saleCount: number }
export function pickCoteFr(byCondition: Record<string, FrCond>): FrCote | null {
  let best: FrCote | null = null
  for (const tier of FR_RAW_TIERS) {
    const c = byCondition[tier]
    if (!c || c.derived) continue
    if (!(c.price > 0) || c.saleCount < FR_MIN_ASKING) continue
    if (!best || c.saleCount > best.saleCount) best = { tier, price: c.price, saleCount: c.saleCount }
  }
  return best
}

/** condition portfolio -> tier FR (même échelle que la fiche). */
export function rawTierFromCondition(condition: string | null | undefined): string {
  const c = String(condition ?? '').trim().toUpperCase()
  // Échelle Cardmarket FR (6 rangs) posée sur les 6 tiers kodo_state.
  // NM > EX > GD > LP > PL > PO  ⇄  NEAR_MINT > EXCELLENT > LIGHTLY_PLAYED
  //                                 > MODERATELY_PLAYED > HEAVILY_PLAYED > DAMAGED
  if (['NM','MT','MINT','NEAR MINT','NEAR_MINT'].includes(c)) return 'NEAR_MINT'
  if (['EX','EXCELLENT'].includes(c)) return 'EXCELLENT'
  if (['GD','GOOD'].includes(c)) return 'LIGHTLY_PLAYED'
  if (['LP','LIGHT PLAYED','LIGHT_PLAYED'].includes(c)) return 'MODERATELY_PLAYED'
  if (['PL','PLAYED'].includes(c)) return 'HEAVILY_PLAYED'
  if (['PO','POOR','DMG','DAMAGED'].includes(c)) return 'DAMAGED'
  // Alias US (cartes EN/JP saisies avec la nomenclature TCGplayer)
  if (['LIGHTLY PLAYED','LIGHTLY_PLAYED'].includes(c)) return 'LIGHTLY_PLAYED'
  if (['MP','MODERATELY PLAYED','MODERATELY_PLAYED'].includes(c)) return 'MODERATELY_PLAYED'
  if (['HP','HEAVILY PLAYED','HEAVILY_PLAYED'].includes(c)) return 'HEAVILY_PLAYED'
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
