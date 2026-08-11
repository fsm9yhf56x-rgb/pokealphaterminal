// Source UNIQUE du prix d'affichage "Prix de marché" (headline).
// Tous les panneaux (SpotlightHero, CardDetailPage, Holdings) DOIVENT l'utiliser
// -> cohérence par construction : un seul chiffre partout, qui suit l'Engine Kodo.
//
// Règle Kodo:
//  - FR  : cote FR (Engine) d'abord. JAMAIS de prix US déguisé sur une carte FR.
//  - EN/JP: fair_value (Engine) d'abord, puis NM marché de la bonne langue.
//  - Aucune valeur fiable -> null (la UI affiche un fallback honnête).

export type DisplayKodo = {
  fairValueEur?: number | null
  fairValueMethod?: string | null
  coteFrEur?: number | null
} | null | undefined

export type DisplayPrices = {
  frByCondition?: Record<string, { price: number; saleCount: number; isAsking: boolean; derived?: boolean }> | null
  marketEst?: number | null
} | null | undefined

export type DisplaySource = { label: string; sub: string | null } | null

const METHOD_LABEL: Record<string, string> = {
  cardmarket_trend: 'Tendance Cardmarket',
  us_nm_fx: 'Marché US',
  insufficient_data: '',
}

/**
 * Retourne le prix d'affichage + un libellé de source, de façon cohérente.
 * @param lang  langue de la carte ('FR' | 'EN' | 'JP' ...)
 * @param prices  bloc prices de l'API spotlight (marketEst déjà lang-aware côté API)
 * @param kodo  signaux Engine (fairValueEur / coteFrEur)
 */
export function resolveDisplayPrice(
  lang: string | null | undefined,
  prices: DisplayPrices,
  kodo: DisplayKodo,
): { price: number | null; source: DisplaySource } {
  const isFr = String(lang || '').toUpperCase() === 'FR'
  const method = kodo?.fairValueMethod || ''

  // Donnée Engine insuffisante : on ne coupe PLUS avant d'avoir regardé la table
  // par état. Décision Alon 11/08 — la grille (display.ts, repli kodo_state)
  // affichait déjà ~4 002 EUR sur la vignette pendant que la fiche disait
  // "Données insuffisantes" : deux modules, deux règles, un seul produit.
  // Une échelle derived reste affichée, marquée "(indicative)" par le libellé
  // ci-dessous. Sans échelle du tout -> null, comme avant.
  const frNmFallback = isFr ? (prices as any)?.frByCondition?.NEAR_MINT : null
  if (method === 'insufficient_data' && !(frNmFallback && Number(frNmFallback.price) > 0)) {
    return { price: null, source: null }
  }

  // HEADLINE FR = NEAR_MINT de la table par état (même source que le bloc
  // "Prix par état" et que le moteur portfolio) : un seul prix de référence.
  if (isFr) {
    const nm = (prices as any)?.frByCondition?.NEAR_MINT
    if (nm && Number(nm.price) > 0) {
      return {
        price: Number(nm.price),
        source: {
          label: nm.derived ? 'Référence par état' : 'Annonces France · Near Mint',
          sub: null,
        },
      }
    }
  }

  // HEADLINE EN/JP = NEAR_MINT brut, source au plus gros volume — la même
  // ligne que le bloc "Prix par état" affiche en tête. Un seul prix de référence.
  if (!isFr) {
    const bySource = (prices as any)?.bySource || {}
    let best: { price: number; sales: number } | null = null
    for (const src of Object.keys(bySource)) {
      if (src === 'ppt_graded' || !Array.isArray(bySource[src])) continue
      for (const e of bySource[src]) {
        if (e?.variant !== 'raw' || e?.condition !== 'NEAR_MINT') continue
        const price = Number(e.price_avg)
        if (!(price > 0)) continue
        const sales = Number(e.nb_sales ?? 0)
        if (!best || sales > best.sales) best = { price, sales }
      }
    }
    if (best) {
      return {
        price: Math.round(best.price * 100) / 100,
        source: { label: 'Ventes confirmées · Near Mint', sub: null },
      }
    }
  }

  // Engine d'abord (FR -> cote FR), puis marketEst (déjà filtré par langue côté API).
  const engineVal = isFr
    ? (kodo?.coteFrEur ?? kodo?.fairValueEur ?? null)
    : (kodo?.fairValueEur ?? null)

  const price = engineVal ?? prices?.marketEst ?? null
  if (price == null) return { price: null, source: null }

  const source: DisplaySource = {
    label: METHOD_LABEL[method] || (isFr ? 'Cote France' : 'Estimation marché'),
    sub: null,
  }
  return { price, source }
}
