/**
 * PSA pop reports use language-agnostic card_refs ("base1-4"),
 * while tcg_cards uses language-prefixed IDs ("en-base1-4", "fr-base1-4").
 *
 * This helper strips the language prefix to match.
 */
export function toCanonicalRef(cardId: string): string {
  return cardId.replace(/^(en|fr|jp)-/, '')
}
