// src/lib/conditions-labels.ts
//
// SOURCE UNIQUE des libelles d'etat affiches. Six ecrans redefinissaient
// chacun leur table (KodoPricePanel, SpotlightStates, SpotlightRawConditions,
// SpotlightHero, PriceByConditionFR, Holdings) : ils divergeaient deja.
//
// === DECISION ALON 07/08, NE PAS ROUVRIR ===
// Nomenclature CARDMARKET a 6 rangs, pour TOUTES les cartes quelle que soit
// leur langue. Le public est francais : il achete et vend sur Cardmarket, il
// pense dans ce vocabulaire. Mint est volontairement EXCLU (reserve a une
// carte jamais touchee ; TCGplayer ne le propose meme pas a la vente).
//
// === POURQUOI LES TIERS NE CHANGENT PAS ===
// NEAR_MINT..DAMAGED sont des IDENTIFIANTS TECHNIQUES, pas du texte affiche.
// Les renommer aurait touche DECAY + STATE_PCT + le CASE SQL de
// kodo-price-by-state.mjs + ebay-condition.mjs + 18 674 prints x 6 lignes de
// price_matrix, pour zero gain visible. On change les MOTS, jamais les cles.
//
// === LE DECALAGE EST REEL, CE N'EST PAS UNE TRADUCTION MOT A MOT ===
// Les deux echelles ne se recouvrent pas :
//   TCGplayer (US, 5 rangs)  : Near Mint, Lightly Played, Moderately Played,
//                              Heavily Played, Damaged. PAS d'Excellent.
//   Cardmarket (EU, 7 rangs) : Mint, Near Mint, Excellent, Good,
//                              Light Played, Played, Poor.
// Une carte EX europeenne = Lightly Played US. Une carte LP europeenne =
// Heavily Played US. Traduire "Light Played" par "Lightly Played" serait une
// erreur de DEUX crans. La table ci-dessous est l'inverse exact de
// rawTierFromCondition (src/lib/prices/fr-by-condition.ts) : les deux doivent
// rester coherentes, c'est la meme bijection lue dans les deux sens.

export const CONDITION_TIERS = [
  'NEAR_MINT',
  'EXCELLENT',
  'LIGHTLY_PLAYED',
  'MODERATELY_PLAYED',
  'HEAVILY_PLAYED',
  'DAMAGED',
] as const

export type ConditionTier = (typeof CONDITION_TIERS)[number]

/** Tier technique -> libelle Cardmarket affiche. */
export const CONDITION_LABEL: Record<string, string> = {
  NEAR_MINT: 'Near Mint',
  EXCELLENT: 'Excellent',
  LIGHTLY_PLAYED: 'Good',
  MODERATELY_PLAYED: 'Light Played',
  HEAVILY_PLAYED: 'Played',
  DAMAGED: 'Poor',
  // Tiers hors echelle raw, gardes pour que les composants n'aient pas a
  // filtrer : ils apparaissent dans price_matrix mais pas dans le formulaire.
  MINT: 'Mint',
  AGGREGATED: 'Cardmarket EU',
}

/** Sigle court, pour les badges de vignette. */
export const CONDITION_SHORT: Record<string, string> = {
  NEAR_MINT: 'NM',
  EXCELLENT: 'EX',
  LIGHTLY_PLAYED: 'GD',
  MODERATELY_PLAYED: 'LP',
  HEAVILY_PLAYED: 'PL',
  DAMAGED: 'PO',
}

/** Liste ordonnee proposee a la saisie (formulaire d'ajout, modale d'edition). */
export const CONDITION_CHOICES: string[] = CONDITION_TIERS.map((t) => CONDITION_LABEL[t])

/**
 * Libelle affiche -> tier technique. Accepte les libelles Cardmarket ET les
 * anciens libelles US, parce que des lignes historiques les portent encore.
 * Doit rester l'inverse de rawTierFromCondition.
 */
export function tierFromLabel(label: string | null | undefined): ConditionTier | null {
  const c = String(label ?? '').trim().toUpperCase()
  if (!c) return null
  if (['NM', 'MT', 'MINT', 'NEAR MINT', 'NEAR_MINT'].includes(c)) return 'NEAR_MINT'
  if (['EX', 'EXCELLENT'].includes(c)) return 'EXCELLENT'
  if (['GD', 'GOOD'].includes(c)) return 'LIGHTLY_PLAYED'
  if (['LP', 'LIGHT PLAYED', 'LIGHT_PLAYED'].includes(c)) return 'MODERATELY_PLAYED'
  if (['PL', 'PLAYED'].includes(c)) return 'HEAVILY_PLAYED'
  if (['PO', 'POOR', 'DMG', 'DAMAGED'].includes(c)) return 'DAMAGED'
  // Alias US (lignes saisies avant le 07/08 avec la nomenclature TCGplayer)
  if (['LIGHTLY PLAYED', 'LIGHTLY_PLAYED'].includes(c)) return 'LIGHTLY_PLAYED'
  if (['MP', 'MODERATELY PLAYED', 'MODERATELY_PLAYED'].includes(c)) return 'MODERATELY_PLAYED'
  if (['HP', 'HEAVILY PLAYED', 'HEAVILY_PLAYED'].includes(c)) return 'HEAVILY_PLAYED'
  return null
}

/** Libelle a afficher pour un tier, avec repli lisible plutot qu'une cle brute. */
export function labelOfTier(tier: string | null | undefined): string {
  if (!tier) return '—'
  return CONDITION_LABEL[tier] ?? tier
}
