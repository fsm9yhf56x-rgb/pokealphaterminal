/** Valeur canonique en base pour les produits scelles.
 *  L'UI peut afficher "Scelle" (FR) mais la DB ne stocke que SEALED. */
export const SEALED = 'Sealed'

/** Normalise une condition avant toute ecriture en base. */
export function normalizeCondition(c?: string): string {
  if (!c) return 'Raw'
  if (c === 'Scelle' || c === 'SCELLE' || c === 'sealed') return SEALED
  return c
}
