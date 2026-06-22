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

  // Donnée explicitement insuffisante -> rien (honnête).
  if (method === 'insufficient_data') return { price: null, source: null }

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
