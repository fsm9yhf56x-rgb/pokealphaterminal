// Recherche tolerante, PURE (zero I/O, zero React) : Index, picker scelle et
// modal d'ajout doivent repondre pareil a la meme frappe.
//
// LE PROBLEME QU'ELLE RESOUT : on comparait la saisie au seul NOM. Or ce que le
// collectionneur a sous les yeux, c'est ce qui est IMPRIME sur la carte —
// "EB1", "ME1", "134/132" — et ce qu'il copie depuis une marketplace, c'est
// "Herbizarre ME1 (134/132)". Aucune de ces chaines n'existe dans un champ.

/** minuscules, sans accents, ponctuation en espaces. Le '#' et les parentheses
 *  sont du bruit : sans ca, "(134/132)" ne rencontre jamais "134/132". */
export const norm = (s: unknown): string =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9/.]+/g, ' ')
    .replace(/\.(?![0-9])/g, ' ')   // point final ou devant une lettre = ponctuation
    .trim()

// Code officiel FR <-> prefixe technique. Derive de sealed-fr.mjs, ou il sert
// deja a apparier les annonces eBay : un vendeur ecrit "EB07", jamais "swsh7".
const CODE_FR: Record<string, string> = {
  swsh: 'eb', sv: 'ev', sm: 'sl', bw: 'nb', me: 'me',
  hgss: 'hs', pl: 'pt', dp: 'dp', xy: 'xy', ex: 'ex', col: 'hs',
}

/** swsh7 -> [swsh7, eb7, eb07] ; me01 -> [me01, me1] ; sv03.5 -> [sv3.5, ev3.5] */
export function setIdAliases(setId?: string | null): string[] {
  const id = norm(setId).replace(/\s+/g, '')
  if (!id) return []
  const m = /^([a-z]+)([0-9]+(?:\.[0-9]+)?)(.*)$/.exec(id)
  if (!m) return [id]
  const [, prefixe, num, reste] = m
  const out = new Set<string>([id])
  const sansZero = num.replace(/^0+(?=[0-9])/, '')
  const avecZero = /^[0-9]$/.test(sansZero) ? '0' + sansZero : sansZero
  for (const p of [prefixe, CODE_FR[prefixe]].filter(Boolean) as string[]) {
    out.add(p + sansZero + reste)
    out.add(p + avecZero + reste)
  }
  return [...out]
}

/** 134 avec un total de 132 -> [134, 134/132]. Les deux graphies circulent. */
export function numberAliases(localId?: string | null, total?: number | null): string[] {
  const n = norm(localId).replace(/\s+/g, '')
  if (!n) return []
  const out = new Set<string>([n, n.replace(/^0+(?=[0-9])/, '')])
  if (total) for (const v of [...out]) out.add(v + '/' + total)
  return [...out].filter(Boolean)
}

export interface Searchable {
  name?: string | null
  setId?: string | null
  setName?: string | null      // nom affiche (FR le plus souvent)
  setNameEn?: string | null    // k_sets.name — un FR cherche parfois le nom EN
  localId?: string | null
  setTotal?: number | null
  extra?: Array<string | null | undefined>  // rarete, SKU, artiste...
}

/** Le sac d'alias d'un objet. A calculer UNE fois par carte, pas par frappe. */
export function aliasBag(o: Searchable): string {
  const parts: string[] = [
    norm(o.name), norm(o.setName), norm(o.setNameEn),
    ...setIdAliases(o.setId),
    ...numberAliases(o.localId, o.setTotal),
    ...(o.extra || []).map(norm),
  ]
  // Borne par des espaces : un jeton numerique se teste alors par includes(' 134 ')
  // au lieu de split(' ') — 22 529 tableaux alloues a chaque frappe sinon.
  return ' ' + parts.filter(Boolean).join(' ') + ' '
}

/**
 * CHAQUE JETON doit trouver preneur, pas la chaine entiere.
 * "herbizarre me1 134/132" = trois contraintes qui se cumulent — c'est ce qui
 * fait qu'un copier-coller de marketplace fonctionne, alors qu'un includes()
 * sur la chaine complete ne rencontre jamais rien.
 * Un jeton purement numerique doit matcher un MOT entier : "5" ne doit pas
 * ramener toutes les cartes 15, 25, 150.
 */
export interface CompiledQuery {
  /** jetons libres : simple sous-chaine */
  libres: string[]
  /** jetons numeriques, deja bornes d'espaces : mot entier exige */
  nombres: string[]
  vide: boolean
}

/** A appeler UNE fois par frappe, pas une fois par carte. */
export function compileQuery(query: string): CompiledQuery {
  const jetons = norm(query).split(' ').filter(Boolean)
  const libres: string[] = []
  const nombres: string[] = []
  for (const j of jetons) {
    if (/^[0-9]+(\/[0-9]+)?$/.test(j)) nombres.push(' ' + j + ' ')
    else libres.push(j)
  }
  return { libres, nombres, vide: jetons.length === 0 }
}

/** Zero allocation : que des includes() sur un sac deja borne. */
export function matchCompiled(bag: string, c: CompiledQuery): boolean {
  if (c.vide) return true
  for (const n of c.nombres) if (!bag.includes(n)) return false
  for (const l of c.libres) if (!bag.includes(l)) return false
  return true
}

/**
 * Nombre de jetons satisfaits. Sert la DEGRADATION : la conjonction stricte est
 * juste quand tous les jetons sont bons (c'est elle qui fait marcher le
 * copier-coller de marketplace), mais un seul mot fautif rendait zero resultat
 * alors qu'un autre jeton correspondait parfaitement. "em1 herbi" ne doit pas
 * effacer les Herbizarre.
 */
export function scoreCompiled(bag: string, c: CompiledQuery): number {
  let n = 0
  for (const x of c.nombres) if (bag.includes(x)) n++
  for (const l of c.libres) if (bag.includes(l)) n++
  return n
}

export const queryTokenCount = (c: CompiledQuery): number =>
  c.libres.length + c.nombres.length

/** Confort : compile puis compare. A eviter dans une boucle. */
export function matchQuery(bag: string, query: string): boolean {
  return matchCompiled(bag.startsWith(' ') ? bag : ' ' + bag + ' ', compileQuery(query))
}
