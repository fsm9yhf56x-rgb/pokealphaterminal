const R2_BASE = 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev'
const TCGDEX_BASE = 'https://assets.tcgdex.net'
const OLD_SUPABASE = 'https://jtheycxwbkweehfezyem.supabase.co/storage/v1/object/public/card-images'

export function normalizeSetId(setId: string): string {
  if (!setId) return setId
  return setId
    .replace(/-shadowless(-ns)?$/, '')
    .replace(/-1st(-ed|-edition)?$/, '')
    .replace(/-unlimited$/, '')
}

export function cleanImageUrl(url: string | undefined): string {
  if (!url) return ''
  if (url.includes(OLD_SUPABASE)) return url.replace(OLD_SUPABASE, R2_BASE)
  return url
}

export function getCardImageUrl(opts: {
  lang: 'EN' | 'FR' | 'JP' | string
  setId?: string
  localId?: string
  cardId?: string
  image?: string
}): string {
  const { lang, setId, localId, cardId, image } = opts
  const langCode = lang === 'EN' ? 'en' : lang === 'FR' ? 'fr' : lang === 'JP' ? 'jp' : lang.toLowerCase()
  if (langCode === 'jp' && cardId) return `${R2_BASE}/jp/${normalizeSetId(setId || 'unknown')}/${cardId}.jpg`
  if (langCode === 'jp' && setId && localId) return `${R2_BASE}/jp/${normalizeSetId(setId)}/${localId}.jpg`
  if (setId && localId) return `${R2_BASE}/${langCode}/${normalizeSetId(setId)}/${localId}.webp`
  if (image) {
    const cleaned = cleanImageUrl(image)
    // Si l'URL finit déjà par une extension, ne pas ajouter /high.webp
    if (cleaned.match(/\.(webp|jpg|png)$/)) return cleaned
    return cleaned.includes('/high.webp') ? cleaned : `${cleaned}/high.webp`
  }
  return ''
}

export function getCardImageWithFallback(opts: {
  lang: 'EN' | 'FR' | 'JP' | string
  setId?: string
  localId?: string
  cardId?: string
  image?: string
}): [string, string] {
  const primary = getCardImageUrl(opts)
  const langCode = opts.lang === 'EN' ? 'en' : opts.lang === 'FR' ? 'fr' : 'en'
  let fallback = ''
  if (opts.setId && opts.localId) {
    fallback = `${TCGDEX_BASE}/${langCode}/${normalizeSetId(opts.setId)}/${opts.localId}/high.webp`
  }
  if (opts.image) {
    const cleaned = cleanImageUrl(opts.image)
    if (cleaned.match(/\.(webp|jpg|png)$/)) {
      fallback = cleaned
    } else {
      fallback = cleaned.includes('/high.webp') ? cleaned : `${cleaned}/high.webp`
    }
  }
  if ((opts.lang === 'JP' || opts.lang === 'FR') && opts.setId && opts.localId) {
    fallback = `${R2_BASE}/en/${normalizeSetId(opts.setId)}/${opts.localId}.webp`
  }
  return [primary, fallback]
}
