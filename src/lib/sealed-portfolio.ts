// Forme UNIQUE d'une ligne de portefeuille scellee. Pure : zero I/O, zero import
// client. Chaque appelant fait son propre insert, mais personne ne redecide la
// forme — c'est cette forme que lit la valorisation nocturne.
//
// CLE DE VALORISATION : portfolio-pricing joint sur
//   sealed_prices.sealed_id = lower(lang) || '-' || set_id || '-' || card_type
// avec card_number = 'SEALED'. Trois champs doivent donc etre exacts :
//   - lang   : la langue DU PRODUIT, pas celle de l'ecran
//   - set_id : sans prefixe de langue (sm12, pas fr-sm12)
//   - card_type : le SKU (demi_display), JAMAIS le libelle ("Demi-display")
// Un seul de travers et la ligne n'est plus jamais repricee : son prix reste
// fige a la valeur d'ajout pendant que tout le reste se rafraichit.

export interface SealedSeedCore {
  name: string
  set_name: string | null
  set_id: string | null
  card_type: string | null   // SKU
  lang: string
  image_url: string | null
}

export const sealedKey = (lang: string, setId: string, sku: string) =>
  lang.toLowerCase() + '-' + setId + '-' + sku

/** set_id nu : la cle porte deja la langue, la repeter casse la jointure. */
export const stripLangPrefix = (setId?: string | null) =>
  String(setId ?? '').replace(/^(fr|en|jp)-/i, '') || null

export interface SealedAddOpts {
  qty?: number
  buyPrice?: number | null
  currentPrice?: number | null
}

/** Ligne portfolio_cards (utilisateur connecte). */
export function buildSealedDbRow(
  seed: SealedSeedCore, opts: SealedAddOpts, extra: { id: string; userId: string },
): Record<string, unknown> {
  return {
    id: extra.id,
    user_id: extra.userId,
    name: seed.name,
    set_name: seed.set_name || null,
    set_id: stripLangPrefix(seed.set_id),
    card_number: 'SEALED',
    lang: seed.lang,
    rarity: 'Sealed',
    card_type: seed.card_type || '',
    condition: 'Sealed',
    graded: false,
    qty: Number(opts.qty ?? 1) || 1,
    buy_price: opts.buyPrice ?? null,
    current_price: opts.currentPrice ?? null,
    image_url: seed.image_url || null,
  }
}

/** Ligne localStorage (visiteur). Memes valeurs, autres noms de champs. */
export function buildSealedLocalRow(
  seed: SealedSeedCore, opts: SealedAddOpts, extra: { id: string },
): Record<string, unknown> {
  return {
    id: extra.id,
    name: seed.name,
    set: seed.set_name || '',
    setId: stripLangPrefix(seed.set_id) ?? undefined,
    number: 'SEALED',
    rarity: 'Sealed',
    type: seed.card_type || '',
    lang: seed.lang,
    condition: 'Sealed',
    graded: false,
    buyPrice: opts.buyPrice ?? 0,
    curPrice: opts.currentPrice ?? 0,
    qty: Number(opts.qty ?? 1) || 1,
    image: seed.image_url || undefined,
  }
}
