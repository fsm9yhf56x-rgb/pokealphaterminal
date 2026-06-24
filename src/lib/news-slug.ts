/**
 * Slug déterministe d'un titre d'actu (utilisé par le ticker ET la page /actu).
 * Même entrée -> même slug des deux côtés, avec un petit hash pour l'unicité.
 */
export function newsSlug(title: string): string {
  const base = (title || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
  let h = 0
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0
  return `${base || 'actu'}-${h.toString(36)}`
}
