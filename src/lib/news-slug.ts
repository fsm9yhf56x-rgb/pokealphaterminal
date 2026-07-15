/**
 * Slug déterministe d'un titre d'actu (utilisé par le ticker ET la page /actu).
 * Même entrée -> même slug des deux côtés, avec un petit hash pour l'unicité.
 *
 * Le hash porte sur la forme NORMALISÉE, pas sur le titre brut : deux titres
 * qui ne diffèrent que par la ponctuation ou les guillemets typographiques
 * ("… ‘Storm Emeralda’ Revealed!" vs "… “Storm Emeralda” Revealed") donnaient
 * la même base lisible mais deux hashs différents -> ON CONFLICT (slug) ne
 * voyait pas le doublon et le même article apparaissait deux fois dans le fil.
 *
 * Le hash porte sur la normalisation COMPLÈTE (avant troncature à 70) : deux
 * titres longs partageant leurs 70 premiers caractères restent distincts.
 */
export function newsSlug(title: string): string {
  const norm = (title || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const base = norm.slice(0, 70)
  let h = 0
  for (let i = 0; i < norm.length; i++) h = (h * 31 + norm.charCodeAt(i)) >>> 0
  return `${base || 'actu'}-${h.toString(36)}`
}
