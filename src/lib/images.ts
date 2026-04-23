/**
 * Image URL resolution for Pokémon cards.
 *
 * Single source of truth for all card image URLs on the platform.
 * Images are served from Cloudflare R2 (public bucket).
 *
 * ── Path convention on R2 ──
 *   en/{setId}/{localId}.webp    for EN cards
 *   fr/{setId}/{localId}.webp    for FR cards
 *   jp/{setId}/{localId}.jpg     for JP cards
 *
 * Note: `setId` on R2 is stored WITHOUT the lang prefix
 * (e.g. "base1", not "en-base1"). This function strips it.
 */

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export type Lang = 'EN' | 'FR' | 'JP';

export interface CardImageParams {
  /** Accepts 'EN'|'FR'|'JP' (canonical) or any string (permissive, normalized internally). */
  lang: Lang | string;
  setId: string;       // "base1" or "en-base1" (prefix auto-stripped)
  localId: string;     // "1", "001", "SWSH-001", etc.
}

export interface ResolveCardImageParams {
  lang?: Lang | string;
  setId?: string;
  localId?: string;
  fallbackUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────

const R2_BASE =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
  'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev';

const TCGDEX_BASE = 'https://assets.tcgdex.net';

// Legacy URLs we migrated away from (still appear in some localStorage/IndexedDB)
const LEGACY_SUPABASE_STORAGE =
  'https://jtheycxwbkweehfezyem.supabase.co/storage/v1/object/public/card-images';

// ─────────────────────────────────────────────────────────────────────────
// Utilities (exported for testing)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Removes known variant suffixes from a setId so that variants (1st Edition,
 * Shadowless, etc.) point to the base set's images on R2.
 *
 *   "base1-shadowless-ns" → "base1"
 *   "base1-shadowless"    → "base1"
 *   "base1-1st"           → "base1"
 *   "en-base1"            → "base1"  (lang prefix also stripped)
 *   "base1"               → "base1"
 */
export function normalizeSetId(setId: string): string {
  if (!setId) return setId;
  return setId
    .replace(/^(en|fr|jp)-/i, '')
    .replace(/-shadowless(-ns)?$/i, '')
    .replace(/-1st(-ed|-edition)?$/i, '')
    .replace(/-unlimited$/i, '');
}

/**
 * Normalizes various lang inputs into a canonical 2-letter path component.
 *   "EN" / "en" / "En"  → "en"
 *   "FR" / "fr"         → "fr"
 *   "JP" / "jp"         → "jp"
 *   anything else       → lowercased first 2 chars (permissive fallback)
 */
export function langToPath(lang: Lang | string): string {
  if (!lang) return 'en';
  const code = String(lang).toLowerCase().slice(0, 2);
  return ['en', 'fr', 'jp'].includes(code) ? code : 'en';
}

/**
 * Cleans up URLs that still point to the legacy Supabase Storage bucket.
 * If the input URL matches the legacy pattern, it is rewritten to R2.
 * Otherwise the URL is returned unchanged.
 *
 * Used at the boundary where old data (localStorage, IndexedDB) enters the app.
 */
export function cleanLegacyUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.includes(LEGACY_SUPABASE_STORAGE)) {
    return url.replace(LEGACY_SUPABASE_STORAGE, R2_BASE);
  }
  return url;
}

// ─────────────────────────────────────────────────────────────────────────
// Core: build R2 URL from (lang, setId, localId)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Returns the R2 URL for a card image. No fallback, no legacy handling —
 * this is the canonical URL.
 *
 * Returns '' if required fields are missing (rather than throwing).
 */
export function getCardImageUrl(params: CardImageParams): string {
  const { lang, setId, localId } = params;
  if (!setId || !localId) return '';

  const langPath = langToPath(lang);
  const cleanSet = normalizeSetId(setId);
  const ext = langPath === 'jp' ? 'jpg' : 'webp';

  return `${R2_BASE}/${langPath}/${cleanSet}/${localId}.${ext}`;
}

/**
 * Same as getCardImageUrl but returns a low-res variant for thumbnails.
 * (Currently both return the same — R2 doesn't have low-res variants yet —
 * but having the function separate lets us add variants later without a
 * breaking change.)
 */
export function getCardImageUrlLow(params: CardImageParams): string {
  return getCardImageUrl(params);
}

// ─────────────────────────────────────────────────────────────────────────
// Resolver: smart fallback chain
// ─────────────────────────────────────────────────────────────────────────

/**
 * Resolves the best available image URL for a card.
 *
 * Priority order:
 *   1. Compute R2 URL from (lang, setId, localId) if all present
 *   2. Fall back to `fallbackUrl` (existing URL from DB, cleaned of legacy)
 *   3. Empty string
 *
 * Use this at render time when you might have either a stored URL
 * (e.g. from `portfolio_cards.image_url`) or structured fields.
 */
export function resolveCardImage(params: ResolveCardImageParams): string {
  const { lang, setId, localId, fallbackUrl } = params;

  // 1. Prefer computed R2 URL if we have the fields
  if (lang && setId && localId) {
    const url = getCardImageUrl({
      lang: lang as Lang,
      setId,
      localId,
    });
    if (url) return url;
  }

  // 2. Fall back to stored URL (cleaned)
  if (fallbackUrl) return cleanLegacyUrl(fallbackUrl);

  return '';
}

// ─────────────────────────────────────────────────────────────────────────
// TCGdex fallback (last resort, network-dependent)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Builds a TCGdex CDN URL. Only use this as a last-resort fallback —
 * R2 should cover 99%+ of cards. Returns '' for JP (TCGdex doesn't host JP).
 */
export function getTcgdexFallbackUrl(params: CardImageParams): string {
  const { lang, setId, localId } = params;
  if (!setId || !localId) return '';
  const langPath = langToPath(lang);
  if (langPath === 'jp') return ''; // TCGdex has no JP images
  const cleanSet = normalizeSetId(setId);
  return `${TCGDEX_BASE}/${langPath}/${cleanSet}/${localId}/high.webp`;
}

// ─────────────────────────────────────────────────────────────────────────
// Re-exports for backward compatibility (DO NOT USE in new code)
// These will be removed once all call sites migrate.
// ─────────────────────────────────────────────────────────────────────────

/** @deprecated Use {@link cleanLegacyUrl} instead. */
export const cleanImageUrl = cleanLegacyUrl;
