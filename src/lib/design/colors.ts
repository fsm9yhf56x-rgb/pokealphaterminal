/**
 * PokéAlpha Design System — Semantic Colors (Strict Bloomberg rules)
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  RULES                                                       ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  • SNOW.*    → factual data (prices, names, dates)          ║
 * ║                NEVER use perf colors on bare factual data    ║
 * ║  • PERF.*    → variations, ROI, deltas                       ║
 * ║                ONLY when accompanied by a sign (+/−)         ║
 * ║  • ACCENT.*  → primary CTA, alpha signals, live indicator    ║
 * ║  • PREMIUM.* → Pro badges, PSA 10, whale tier                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * ❌ ANTI-PATTERNS
 *   - Green on a bare price: "€130,51" in green is lying to the user
 *   - Green gradient background on purely informational blocks
 *   - Accent red for passive info
 *   - Color as decoration without semantic intent
 *
 * ✅ LEGITIMATE
 *   - "+12.4%" in green (variation with sign)
 *   - "+€85 ROI" in green (explicit gain)
 *   - Ownership checkmark in green (positive state, not price)
 *   - Live dot in green (status indicator)
 */

// ─── Structure (Snow+ palette) ─────────────────────────────────
export const SNOW = {
  bg:         '#FFFFFF',
  bgApp:      '#FAFBFC',  // page background (legacy)
  surface:    '#F5F5F7',
  borderSoft: '#E5E5EA',
  borderMid:  '#C7C7CC',
  ink:        '#1D1D1F',
  muted:      '#6E6E73',
  dim:        '#86868B',
  faint:      '#AEAEB2',
} as const

// ─── Performance (variations only, never on bare prices) ───────
export const PERF = {
  up:       '#1D9E75',
  upSoft:   '#E1F5EE',
  down:     '#E03020',
  downSoft: '#FDEDEA',
} as const

// ─── Accent (CTA, live, alerts) ────────────────────────────────
export const ACCENT = {
  primary:     '#E03020',
  primarySoft: 'rgba(224,48,32,0.06)',
  primaryHover:'#C82010',
} as const

// ─── Premium (Pro, top-tier) ───────────────────────────────────
export const PREMIUM = {
  gold:     '#D4AF37',
  goldSoft: '#F5ECA0',
  goldDark: '#8B7320',
} as const

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Semantic color for a delta value.
 * Returns muted gray for null/zero — no false positive signal.
 */
export function deltaColor(value: number | null | undefined): string {
  if (value == null || value === 0) return SNOW.muted
  return value > 0 ? PERF.up : PERF.down
}

/**
 * Formats a percentage with sign + semantic color.
 * @example formatDelta(12.4) → { text: '+12.4%', color: '#1D9E75' }
 * @example formatDelta(-3.1) → { text: '-3.1%',  color: '#E03020' }
 * @example formatDelta(null) → { text: '—',      color: '#6E6E73' }
 */
export function formatDelta(
  value: number | null | undefined,
  opts?: { digits?: number }
): { text: string; color: string } {
  if (value == null) return { text: '—', color: SNOW.muted }
  const digits = opts?.digits ?? 1
  const sign = value > 0 ? '+' : ''
  return {
    text: `${sign}${value.toFixed(digits)}%`,
    color: deltaColor(value),
  }
}

/**
 * Formats an absolute gain/loss amount with currency + semantic color.
 * @example formatGain(85, 'EUR') → { text: '+€85.00', color: '#1D9E75' }
 */
export function formatGain(
  value: number | null | undefined,
  currency: 'EUR' | 'USD' | 'GBP' = 'EUR'
): { text: string; color: string } {
  if (value == null) return { text: '—', color: SNOW.muted }
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  const abs = Math.abs(value)
  return {
    text: `${sign}${symbol}${abs.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    color: deltaColor(value),
  }
}
