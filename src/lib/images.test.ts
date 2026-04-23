import { describe, it, expect } from 'vitest';
import {
  normalizeSetId,
  langToPath,
  cleanLegacyUrl,
  getCardImageUrl,
  getCardImageUrlLow,
  resolveCardImage,
  getTcgdexFallbackUrl,
} from './images';

// ─────────────────────────────────────────────────────────────────────────
// normalizeSetId — strips variant suffixes + lang prefixes
// ─────────────────────────────────────────────────────────────────────────

describe('normalizeSetId', () => {
  it('returns setId unchanged when already canonical', () => {
    expect(normalizeSetId('base1')).toBe('base1');
    expect(normalizeSetId('swsh9')).toBe('swsh9');
    expect(normalizeSetId('me03')).toBe('me03');
  });

  it('strips lang prefix', () => {
    expect(normalizeSetId('en-base1')).toBe('base1');
    expect(normalizeSetId('fr-me03')).toBe('me03');
    expect(normalizeSetId('jp-20th')).toBe('20th');
  });

  it('strips -shadowless suffix', () => {
    expect(normalizeSetId('base1-shadowless')).toBe('base1');
  });

  it('strips -shadowless-ns suffix (1st Edition Shadowless)', () => {
    expect(normalizeSetId('base1-shadowless-ns')).toBe('base1');
  });

  it('strips -1st / -1st-ed / -1st-edition suffixes', () => {
    expect(normalizeSetId('base1-1st')).toBe('base1');
    expect(normalizeSetId('base1-1st-ed')).toBe('base1');
    expect(normalizeSetId('base1-1st-edition')).toBe('base1');
  });

  it('strips -unlimited suffix', () => {
    expect(normalizeSetId('base1-unlimited')).toBe('base1');
  });

  it('handles lang prefix + variant suffix together', () => {
    expect(normalizeSetId('en-base1-shadowless')).toBe('base1');
    expect(normalizeSetId('fr-base1-1st-edition')).toBe('base1');
  });

  it('is case-insensitive on prefix/suffix', () => {
    expect(normalizeSetId('EN-base1')).toBe('base1');
    expect(normalizeSetId('base1-SHADOWLESS')).toBe('base1');
  });

  it('returns empty input unchanged', () => {
    expect(normalizeSetId('')).toBe('');
  });

  it('does NOT strip partial matches mid-string', () => {
    // "-shadowlessXYZ" is not a suffix, should be preserved
    expect(normalizeSetId('some-shadowlessXYZ')).toBe('some-shadowlessXYZ');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// langToPath — canonical 2-letter path for lang
// ─────────────────────────────────────────────────────────────────────────

describe('langToPath', () => {
  it('lowercases 2-letter lang codes', () => {
    expect(langToPath('EN')).toBe('en');
    expect(langToPath('FR')).toBe('fr');
    expect(langToPath('JP')).toBe('jp');
  });

  it('accepts already-lowercased input', () => {
    expect(langToPath('en')).toBe('en');
    expect(langToPath('fr')).toBe('fr');
  });

  it('handles mixed case', () => {
    expect(langToPath('En')).toBe('en');
    expect(langToPath('Fr')).toBe('fr');
  });

  it('falls back to "en" for unsupported lang', () => {
    expect(langToPath('ES' as any)).toBe('en');
    expect(langToPath('de' as any)).toBe('en');
    expect(langToPath('xx' as any)).toBe('en');
  });

  it('falls back to "en" for empty / falsy input', () => {
    expect(langToPath('' as any)).toBe('en');
    expect(langToPath(undefined as any)).toBe('en');
    expect(langToPath(null as any)).toBe('en');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// cleanLegacyUrl — rewrites Supabase Storage URLs to R2
// ─────────────────────────────────────────────────────────────────────────

describe('cleanLegacyUrl', () => {
  it('rewrites Supabase Storage URL to R2', () => {
    const legacy =
      'https://jtheycxwbkweehfezyem.supabase.co/storage/v1/object/public/card-images/en/base1/4.webp';
    const result = cleanLegacyUrl(legacy);
    expect(result).toContain('pub-1aade8805ea544358d85a303c1feef41.r2.dev');
    expect(result).toContain('/en/base1/4.webp');
    expect(result).not.toContain('supabase.co');
  });

  it('leaves R2 URLs unchanged', () => {
    const r2 = 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev/en/base1/4.webp';
    expect(cleanLegacyUrl(r2)).toBe(r2);
  });

  it('leaves TCGdex URLs unchanged', () => {
    const tcgdex = 'https://assets.tcgdex.net/en/base/base1/4/high.webp';
    expect(cleanLegacyUrl(tcgdex)).toBe(tcgdex);
  });

  it('returns "" for null/undefined/empty', () => {
    expect(cleanLegacyUrl(null)).toBe('');
    expect(cleanLegacyUrl(undefined)).toBe('');
    expect(cleanLegacyUrl('')).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getCardImageUrl — canonical R2 URL builder
// ─────────────────────────────────────────────────────────────────────────

describe('getCardImageUrl', () => {
  const R2 = 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev';

  it('builds EN URL with .webp extension', () => {
    expect(getCardImageUrl({ lang: 'EN', setId: 'base1', localId: '4' })).toBe(
      `${R2}/en/base1/4.webp`
    );
  });

  it('builds FR URL with .webp extension', () => {
    expect(getCardImageUrl({ lang: 'FR', setId: 'me03', localId: '001' })).toBe(
      `${R2}/fr/me03/001.webp`
    );
  });

  it('builds JP URL with .jpg extension (not webp)', () => {
    expect(getCardImageUrl({ lang: 'JP', setId: '20th', localId: '31651' })).toBe(
      `${R2}/jp/20th/31651.jpg`
    );
  });

  it('strips lang prefix from setId before building URL', () => {
    // The bug we found: DB uses "en-base1" but R2 paths use "base1"
    expect(getCardImageUrl({ lang: 'EN', setId: 'en-base1', localId: '4' })).toBe(
      `${R2}/en/base1/4.webp`
    );
  });

  it('strips variant suffix for Base Set Shadowless', () => {
    // Same image on R2, just variant metadata differs
    expect(
      getCardImageUrl({ lang: 'EN', setId: 'base1-shadowless', localId: '4' })
    ).toBe(`${R2}/en/base1/4.webp`);
  });

  it('strips variant suffix for Base Set 1st Edition Shadowless', () => {
    expect(
      getCardImageUrl({ lang: 'EN', setId: 'base1-shadowless-ns', localId: '4' })
    ).toBe(`${R2}/en/base1/4.webp`);
  });

  it('preserves padding in localId (001 stays 001)', () => {
    expect(getCardImageUrl({ lang: 'FR', setId: 'me03', localId: '001' })).toBe(
      `${R2}/fr/me03/001.webp`
    );
    expect(getCardImageUrl({ lang: 'FR', setId: 'me03', localId: '1' })).toBe(
      `${R2}/fr/me03/1.webp`
    );
  });

  it('handles non-numeric localId (promo SWSH-001)', () => {
    expect(
      getCardImageUrl({ lang: 'EN', setId: 'swshp', localId: 'SWSH-001' })
    ).toBe(`${R2}/en/swshp/SWSH-001.webp`);
  });

  it('returns "" when setId missing', () => {
    expect(getCardImageUrl({ lang: 'EN', setId: '', localId: '4' })).toBe('');
  });

  it('returns "" when localId missing', () => {
    expect(getCardImageUrl({ lang: 'EN', setId: 'base1', localId: '' })).toBe('');
  });

  it('accepts lowercase lang as string', () => {
    expect(
      getCardImageUrl({ lang: 'en' as any, setId: 'base1', localId: '4' })
    ).toBe(`${R2}/en/base1/4.webp`);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// resolveCardImage — fallback chain
// ─────────────────────────────────────────────────────────────────────────

describe('resolveCardImage', () => {
  const R2 = 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev';

  it('prefers computed R2 URL when all fields present', () => {
    expect(
      resolveCardImage({
        lang: 'EN',
        setId: 'base1',
        localId: '4',
        fallbackUrl: 'https://something-else.com/img.png',
      })
    ).toBe(`${R2}/en/base1/4.webp`);
  });

  it('falls back to fallbackUrl when setId missing', () => {
    expect(
      resolveCardImage({
        lang: 'EN',
        localId: '4',
        fallbackUrl: 'https://cdn.example.com/img.png',
      })
    ).toBe('https://cdn.example.com/img.png');
  });

  it('falls back to fallbackUrl when localId missing', () => {
    expect(
      resolveCardImage({
        lang: 'EN',
        setId: 'base1',
        fallbackUrl: 'https://cdn.example.com/img.png',
      })
    ).toBe('https://cdn.example.com/img.png');
  });

  it('cleans legacy Supabase URLs in fallbackUrl', () => {
    const legacy =
      'https://jtheycxwbkweehfezyem.supabase.co/storage/v1/object/public/card-images/en/base1/4.webp';
    expect(resolveCardImage({ fallbackUrl: legacy })).toContain(
      'pub-1aade8805ea544358d85a303c1feef41.r2.dev'
    );
  });

  it('returns "" when nothing resolves', () => {
    expect(resolveCardImage({})).toBe('');
    expect(resolveCardImage({ lang: 'EN' })).toBe('');
    expect(resolveCardImage({ fallbackUrl: '' })).toBe('');
  });

  it('accepts string lang (loose typing for legacy callers)', () => {
    expect(
      resolveCardImage({
        lang: 'en',
        setId: 'base1',
        localId: '4',
      })
    ).toBe(`${R2}/en/base1/4.webp`);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getTcgdexFallbackUrl — last-resort external CDN
// ─────────────────────────────────────────────────────────────────────────

describe('getTcgdexFallbackUrl', () => {
  it('builds TCGdex URL for EN', () => {
    expect(
      getTcgdexFallbackUrl({ lang: 'EN', setId: 'base1', localId: '4' })
    ).toBe('https://assets.tcgdex.net/en/base1/4/high.webp');
  });

  it('builds TCGdex URL for FR', () => {
    expect(
      getTcgdexFallbackUrl({ lang: 'FR', setId: 'me03', localId: '001' })
    ).toBe('https://assets.tcgdex.net/fr/me03/001/high.webp');
  });

  it('returns "" for JP (TCGdex has no JP images)', () => {
    expect(
      getTcgdexFallbackUrl({ lang: 'JP', setId: '20th', localId: '31651' })
    ).toBe('');
  });

  it('returns "" when setId or localId missing', () => {
    expect(getTcgdexFallbackUrl({ lang: 'EN', setId: '', localId: '4' })).toBe('');
    expect(
      getTcgdexFallbackUrl({ lang: 'EN', setId: 'base1', localId: '' })
    ).toBe('');
  });

  it('strips variant suffix', () => {
    expect(
      getTcgdexFallbackUrl({
        lang: 'EN',
        setId: 'base1-shadowless',
        localId: '4',
      })
    ).toBe('https://assets.tcgdex.net/en/base1/4/high.webp');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getCardImageUrlLow — thumbnail variant (future-proofing)
// ─────────────────────────────────────────────────────────────────────────

describe('getCardImageUrlLow', () => {
  it('currently returns same URL as getCardImageUrl', () => {
    const params = { lang: 'EN' as const, setId: 'base1', localId: '4' };
    expect(getCardImageUrlLow(params)).toBe(getCardImageUrl(params));
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Regression tests — bugs we actually hit during the refactor
// ─────────────────────────────────────────────────────────────────────────

describe('regression: bugs from real usage', () => {
  const R2 = 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev';

  it('Base Set Shadowless should use base1/ path (not base1-shadowless/)', () => {
    // Pre-fix: returned /en/base1-shadowless/1.webp → 404
    // Post-fix: returns /en/base1/1.webp
    const url = getCardImageUrl({
      lang: 'EN',
      setId: 'base1-shadowless',
      localId: '1',
    });
    expect(url).toContain('/en/base1/1.webp');
    expect(url).not.toContain('shadowless');
  });

  it('Base Set 1st Ed Shadowless resolves to same image as Shadowless', () => {
    const url1 = getCardImageUrl({
      lang: 'EN',
      setId: 'base1-shadowless',
      localId: '1',
    });
    const url2 = getCardImageUrl({
      lang: 'EN',
      setId: 'base1-shadowless-ns',
      localId: '1',
    });
    expect(url1).toBe(url2);
  });

  it('DB set_id with lang prefix still builds correct R2 URL', () => {
    // DB stores "en-base1" as set_id; R2 path is "base1"
    expect(
      getCardImageUrl({ lang: 'EN', setId: 'en-base1', localId: '4' })
    ).toBe(`${R2}/en/base1/4.webp`);
  });

  it('JP cards use .jpg, not .webp (R2 upload format)', () => {
    const url = getCardImageUrl({ lang: 'JP', setId: '20th', localId: '31651' });
    expect(url).toMatch(/\.jpg$/);
    expect(url).not.toMatch(/\.webp$/);
  });
});
