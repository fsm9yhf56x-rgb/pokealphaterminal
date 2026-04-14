const R2_BASE = 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev'
// TCGDex CDN fallback
const TCGDEX_BASE = 'https://assets.tcgdex.net'
/**
 * Résout l'URL d'image d'une carte.
 * Priorité : Cloudflare R2 > TCGDex CDN > placeholder
 */
export function getCardImageUrl(opts: {
  lang: 'EN' | 'FR' | 'JP' | string
  setId?: string
  localId?: string
  cardId?: string
  image?: string
}): string {
  const { lang, setId, localId, cardId, image } = opts
  const langCode = lang === 'EN' ? 'en' : lang === 'FR' ? 'fr' : lang === 'JP' ? 'jp' : lang.toLowerCase()
  // JP with pokemon-card.com cardId
  if (langCode === 'jp' && cardId) {
    return `${R2_BASE}/jp/${setId || 'unknown'}/${cardId}.jpg`
  }
  // JP from TCGDex (no cardId)
  if (langCode === 'jp' && setId && localId) {
    return `${R2_BASE}/jp/${setId}/${localId}.jpg`
  }
  // EN/FR use setId/localId (.webp)
  if (setId && localId) {
    return `${R2_BASE}/${langCode}/${setId}/${localId}.webp`
  }
  // Fallback: existing image URL
  if (image) {
    return image.includes('/high.webp') ? image : `${image}/high.webp`
  }
  return ''
}
/**
 * URL avec fallback chaîné pour <img onError>
 * Retourne [primary, fallback]
 */
export function getCardImageWithFallback(opts: {
  lang: 'EN' | 'FR' | 'JP' | string
  setId?: string
  localId?: string
  cardId?: string
  image?: string
}): [string, string] {
  const primary = getCardImageUrl(opts)
  const langCode = opts.lang === 'EN' ? 'en' : opts.lang === 'FR' ? 'fr' : 'en'
  // Fallback: TCGDex CDN
  let fallback = ''
  if (opts.setId && opts.localId) {
    fallback = `${TCGDEX_BASE}/${langCode}/${opts.setId}/${opts.localId}/high.webp`
  }
  if (opts.image) {
    fallback = opts.image.includes('/high.webp') ? opts.image : `${opts.image}/high.webp`
  }
  // FR/JP → try EN on R2 as last fallback
  if ((opts.lang === 'JP' || opts.lang === 'FR') && opts.setId && opts.localId) {
    fallback = `${R2_BASE}/en/${opts.setId}/${opts.localId}.webp`
  }
  return [primary, fallback]
}
