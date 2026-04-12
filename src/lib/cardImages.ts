const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jtheycxwbkweehfezyem.supabase.co'
const BUCKET = 'card-images'
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`

// TCGDex CDN fallback
const TCGDEX_BASE = 'https://assets.tcgdex.net'

/**
 * Résout l'URL d'image d'une carte.
 * Priorité : Supabase Storage > TCGDex CDN > placeholder
 */
export function getCardImageUrl(opts: {
  lang: 'EN' | 'FR' | 'JP' | string
  setId?: string
  localId?: string
  cardId?: string
  image?: string // URL existante (TCGDex ou autre)
}): string {
  const { lang, setId, localId, cardId, image } = opts
  const langCode = lang === 'EN' ? 'en' : lang === 'FR' ? 'fr' : lang === 'JP' ? 'jp' : lang.toLowerCase()

  // JP with pokemon-card.com cardId
  if (langCode === 'jp' && cardId) {
    return `${STORAGE_BASE}/jp/${setId || 'unknown'}/${cardId}.jpg`
  }

  // JP from TCGDex (no cardId) → use EN image as fallback (same artwork)
  if (langCode === 'jp' && setId && localId) {
    return `${STORAGE_BASE}/jp/${setId}/${localId}.jpg`
  }

  // EN/FR use setId/localId (.webp)
  if (setId && localId) {
    return `${STORAGE_BASE}/${langCode}/${setId}/${localId}.webp`
  }

  // Fallback: existing image URL (TCGDex CDN)
  if (image) {
    return image.includes('/high.webp') ? image : `${image}/high.webp`
  }

  // No image available
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

  // Fallback: TCGDex CDN (EN version)
  let fallback = ''
  if (opts.setId && opts.localId) {
    fallback = `${TCGDEX_BASE}/${langCode}/${opts.setId}/${opts.localId}/high.webp`
  }
  if (opts.image) {
    fallback = opts.image.includes('/high.webp') ? opts.image : `${opts.image}/high.webp`
  }

  // If lang is JP or FR, also try EN version as last fallback
  if ((opts.lang === 'JP' || opts.lang === 'FR') && opts.setId && opts.localId) {
    fallback = `${STORAGE_BASE}/en/${opts.setId}/${opts.localId}.webp`
  }

  return [primary, fallback]
}
