import type { CSSProperties } from 'react'

/** Un scelle porte card_number 'SEALED'. Regle unique, partout.
 *  Signature volontairement permissive : les points d appel manipulent des
 *  formes tres differentes (holding, ligne d API, candidat d insight). */
export const isSealed = (c?: any): boolean =>
  String(c?.number ?? c?.card_number ?? '') === 'SEALED'

/** REMPLISSAGE. Un scelle n a pas le ratio d une carte : sa photo est CONTENUE
 *  dans le cadre, jamais rognee, sinon le logo de serie saute en premier. */
export const kthumbFit = (c?: any): CSSProperties =>
  isSealed(c)
    ? { objectFit: 'contain', background: '#F5F5F7', padding: '6%', boxSizing: 'border-box' }
    : { objectFit: 'cover' }

/** CADRE. A n utiliser QUE la ou aucune grille n est a preserver (bandeau,
 *  fiche). Dans une grille mixte cartes+scelle, garder le ratio carte : deux
 *  ratios cote a cote cassent l alignement des lignes. */
export const kthumbFrame = (c?: any, cardRatio: string = '63/88'): CSSProperties =>
  ({ aspectRatio: isSealed(c) ? '4 / 3' : cardRatio })
