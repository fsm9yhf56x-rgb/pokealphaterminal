/**
 * Snow+ Design System — source unique de tokens et primitives visuelles.
 *
 * Sert TOUS les écrans de Kodo Cards. Si un nouveau bloc nécessite un token
 * absent ici, on l'ajoute ICI plutôt qu'en inline.
 *
 * Pattern d'usage:
 *   import { SNOW, FONT, GLASS, RADIUS, EASE, SHADOW } from '@/lib/design/snow'
 *   <div style={{ ...GLASS.card, padding: 16, borderRadius: RADIUS.lg }}>
 */

import type { CSSProperties } from 'react'

// ─── Colors ──────────────────────────────────────────────────────────────────
export const SNOW = {
  // Surfaces
  bg: '#FFFFFF',
  surface: '#F5F5F7',
  surfaceSoft: '#FBFBFC',
  surfaceTint: '#FAFAFB',

  // Borders
  border: '#E5E5EA',
  borderSoft: '#F0F0F2',
  borderHover: '#C7C7CC',

  // Text
  ink: '#1D1D1F',
  inkSoft: '#3A3A3C',
  muted: '#6E6E73',
  mutedLight: '#86868B',
  mutedExtraLight: '#AEAEB2',

  // Accents
  red: '#E03020',
  redLight: '#FCEBEB',
  redDark: '#8B0E04',

  green: '#27500A',
  greenLight: '#EAF3DE',
  greenAccent: '#26A65B',

  amber: '#FFF8E5',
  amberDark: '#8A6500',

  // Slabs (PSA / CGC / BGS / SGC / PCA / CCC)
  blue: '#E6F1FB',
  blueDark: '#185FA5',
  pink: '#FBEAF0',
  pinkDark: '#4B1528',
  purple: '#EEEDFE',
  purpleDark: '#26215C',
  teal: '#E0F4F2',
  tealDark: '#0E5E55',
} as const

// ─── Typography ──────────────────────────────────────────────────────────────
export const FONT = {
  display: 'var(--font-sora, "Sora", sans-serif)',
  body: 'var(--font-dm, "DM Sans", sans-serif)',
  data: 'var(--font-data, "Space Mono", monospace)',
} as const

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const

// ─── Radius ──────────────────────────────────────────────────────────────────
export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  pill: 999,
} as const

// ─── Easing & Durations ──────────────────────────────────────────────────────
export const EASE = {
  apple: 'cubic-bezier(.2,.8,.2,1)',
  smooth: 'ease',
  smoothOut: 'cubic-bezier(.16,1,.3,1)',
} as const

export const DURATION = {
  fast: '.15s',
  base: '.2s',
  slow: '.3s',
  slower: '.5s',
} as const

// ─── Shadows ─────────────────────────────────────────────────────────────────
export const SHADOW = {
  card: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
  lift: '0 8px 32px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
  modal: '0 24px 80px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.08)',
  inset: 'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)',
  insetSubtle: 'inset 0 1px 0 rgba(255,255,255,0.7)',
} as const

// ─── Glass primitives ────────────────────────────────────────────────────────
// Le secret sauce du Spotlight, désormais accessible partout.
export const GLASS = {
  /** Card glass standard (Spotlight cards) */
  card: {
    background: 'rgba(255,255,255,0.45)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: RADIUS.lg,
    border: 'none',
    boxShadow: `${SHADOW.card}, ${SHADOW.inset}`,
  } as CSSProperties,

  /** Version moins prononcée (sub-blocs, listes) */
  cardSoft: {
    background: 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(12px) saturate(150%)',
    WebkitBackdropFilter: 'blur(12px) saturate(150%)',
    borderRadius: RADIUS.md,
    border: `1px solid ${SNOW.borderSoft}`,
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  } as CSSProperties,

  /** Version overlay (modals, popovers) */
  cardElevated: {
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(40px) saturate(200%)',
    WebkitBackdropFilter: 'blur(40px) saturate(200%)',
    borderRadius: RADIUS.xl,
    border: 'none',
    boxShadow: `${SHADOW.modal}, ${SHADOW.inset}`,
  } as CSSProperties,

  /** Bouton glass (transparent + blur, ex: secondary action) */
  button: {
    background: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(20px) saturate(200%)',
    WebkitBackdropFilter: 'blur(20px) saturate(200%)',
    border: `1px solid ${SNOW.border}`,
    boxShadow: `0 2px 8px rgba(0,0,0,0.04), ${SHADOW.insetSubtle}`,
  } as CSSProperties,
} as const

// ─── Common transitions ──────────────────────────────────────────────────────
export const TRANSITION = {
  all: `all ${DURATION.base} ${EASE.apple}`,
  fast: `all ${DURATION.fast} ${EASE.apple}`,
  transform: `transform ${DURATION.base} ${EASE.smooth}`,
  opacity: `opacity ${DURATION.fast} ${EASE.smooth}`,
} as const

// ─── Helpers ────────────────────────────────────────────────────────────────
export function fmtPrice(
  value: number | null | undefined,
  currency: string = 'EUR',
  usdToEur: number = 0.92,
): string {
  if (value == null || isNaN(value)) return '—'
  const eur = currency === 'USD' ? value * usdToEur : value
  if (eur >= 1000) return `${Math.round(eur).toLocaleString('fr-FR')} €`
  if (eur >= 100) return `${Math.round(eur).toLocaleString('fr-FR')} €`
  return `${eur.toFixed(2).replace('.', ',')} €`
}

export function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `il y a ${d}j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
