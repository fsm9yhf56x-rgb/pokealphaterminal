/**
 * Source de verite unique : mapping series (code DB k_sets.series) -> bloc affiche.
 * Libelles FR hybrides + couleurs. Utilise par l'encyclopedie ET la fiche carte.
 * Fallback par prefixe d'id pour les variantes vintage absentes de l'export.
 */

export const SERIES_TO_BLOC: Record<string, string> = {
  base: 'Original (WotC)', neo: 'Original (WotC)', ecard: 'Original (WotC)',
  ex: 'EX', pop: 'EX',
  dp: 'Diamant & Perle / Platine', pl: 'Diamant & Perle / Platine',
  pt: 'Diamant & Perle / Platine', hgss: 'Diamant & Perle / Platine', col: 'Diamant & Perle / Platine',
  bw: 'Noir & Blanc', dv: 'Noir & Blanc',
  xy: 'XY', g1: 'XY', dc: 'XY',
  sm: 'Soleil & Lune', det: 'Soleil & Lune', tg: 'Soleil & Lune',
  swsh: 'Épée & Bouclier', cel: 'Épée & Bouclier', pgo: 'Épée & Bouclier',
  sv: 'Écarlate & Violet',
  me: 'Méga-Évolution',
  pocket: 'Pokémon Pocket',
  promo: 'Promos & Coffrets',
}

export const BLOC_COLOR: Record<string, string> = {
  'Original (WotC)': '#854F0B', 'EX': '#993C1D', 'Diamant & Perle / Platine': '#0F6E56',
  'Noir & Blanc': '#444441', 'XY': '#185FA5', 'Soleil & Lune': '#BA7517',
  'Épée & Bouclier': '#534AB7', 'Écarlate & Violet': '#A32D2D',
  'Méga-Évolution': '#C2410C', 'Pokémon Pocket': '#7C3AED', 'Promos & Coffrets': '#5F5E5A',
}

// Fallback par prefixe d'id (cartes sans series, ex variantes vintage 1st Ed/Shadowless)
const PREFIX_TO_BLOC: { test: RegExp; bloc: string }[] = [
  { test: /^(base|jungle|fossil|teamrocket|gym|neo|si1|lc|ecard|expedition|aquapolis|skyridge|wizards|bp|si|tk)/i, bloc: 'Original (WotC)' },
  { test: /^(ex|pop|np)/i, bloc: 'EX' },
  { test: /^(dp|pl|pt|hgss|col|hs|ru)/i, bloc: 'Diamant & Perle / Platine' },
  { test: /^(bw|dv)/i, bloc: 'Noir & Blanc' },
  { test: /^(xy|g1|dc)/i, bloc: 'XY' },
  { test: /^(sm|smp|det|tg)/i, bloc: 'Soleil & Lune' },
  { test: /^(me|mee)/i, bloc: 'Méga-Évolution' },
  { test: /^(swsh|cel|pgo|sw|s)/i, bloc: 'Épée & Bouclier' },
  { test: /^(sv|sve|svp)/i, bloc: 'Écarlate & Violet' },
  { test: /^(a|b|p-a)/i, bloc: 'Pokémon Pocket' },
]

/** Resout le bloc { label, color } depuis le code series, avec repli sur l'id de carte/set. */
export function seriesToBloc(series?: string | null, id?: string | null): { label: string; color: string } | null {
  // 1) via le code series (source de verite)
  if (series) {
    const label = SERIES_TO_BLOC[String(series).toLowerCase()]
    if (label) return { label, color: BLOC_COLOR[label] || '#8A8A8E' }
  }
  // 2) repli par prefixe d'id (variantes vintage hors export)
  if (id) {
    const prefix = String(id).replace(/^(en|fr|jp|aopkm)-/i, '').split(/[-\d]/)[0].toLowerCase()
    for (const e of PREFIX_TO_BLOC) if (e.test.test(prefix)) return { label: e.bloc, color: BLOC_COLOR[e.bloc] || '#8A8A8E' }
  }
  return null
}
