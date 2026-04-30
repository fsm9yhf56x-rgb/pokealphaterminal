/**
 * formatEUR — centralise le formatage des prix en EUR pour PokéAlpha.
 *
 * Variantes :
 *   - 'big'    : "EUR 1 235"        (Spotlight, Wrapped header, ShareSheet)
 *   - 'small'  : "1 234,56 €"       (cartes Encyclopedie, breakdown sources)
 *   - 'sign'   : "+EUR 1 235"       (gains/pertes, ROI)
 *   - 'short'  : "€ 1 235"          (Performance, Movers — alt prefix)
 *
 * Comportement :
 *   - null/0/undefined → "—"
 *   - Locale fr-FR (espaces fines, virgule décimale)
 *   - 'big' et 'short' : 0 décimale
 *   - 'small' : 2 décimales
 *   - 'sign' : 0 décimale, prefix +/- automatique
 */

export type EURVariant = 'big' | 'small' | 'sign' | 'short'

export function formatEUR(value: number | null | undefined, variant: EURVariant = 'big'): string {
  if (value == null || value === 0 || isNaN(value)) return '—'

  if (variant === 'small') {
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  }
  if (variant === 'short') {
    return '€ ' + value.toLocaleString('fr-FR')
  }
  if (variant === 'sign') {
    const sign = value > 0 ? '+' : ''
    return sign + 'EUR ' + value.toLocaleString('fr-FR')
  }
  // 'big' (default)
  return 'EUR ' + value.toLocaleString('fr-FR')
}
