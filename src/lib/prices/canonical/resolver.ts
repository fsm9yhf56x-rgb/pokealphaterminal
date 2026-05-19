/**
 * Canonical card_id resolver
 *
 * Resolves any external reference (PokeTrace UUID, TCGdex slug, eBay item_id,
 * raw tcg_cards.id) to the canonical `tcg_cards.id` used as primary key
 * everywhere in the system.
 *
 * Strategy: priority chain
 *   1. Direct format match (prefix en-, fr-, aopkm-)
 *   2. Lookup card_aliases.poketrace_id
 *   3. Lookup card_aliases.tcgdex_card_ref
 *   4. Lookup card_aliases.ebay_card_ref
 *
 * Returns null if no resolution possible (card not yet aliased).
 */

import { sql } from '@/lib/db/sql'

const TCG_PREFIXES = ['en-', 'fr-', 'aopkm-']

/**
 * Quick check: is this ref already in tcg_cards.id format?
 */
export function isCanonicalRef(ref: string): boolean {
  if (!ref) return false
  return TCG_PREFIXES.some((p) => ref.startsWith(p))
}

/**
 * Resolve a single reference to tcg_card_id.
 * Returns null if cannot be resolved.
 */
export async function resolveTcgCardId(sourceRef: string): Promise<string | null> {
  if (!sourceRef) return null

  // 1. Direct canonical match
  if (isCanonicalRef(sourceRef)) {
    return sourceRef
  }

  // 2. Database lookup via card_aliases
  try {
    const rows = await sql.query(
      `SELECT tcg_card_id FROM card_aliases
       WHERE tcg_card_id IS NOT NULL
         AND (
           poketrace_id::text = $1
           OR tcgdex_card_ref = $1
           OR ebay_card_ref = $1
         )
       LIMIT 1`,
      [sourceRef]
    )
    return (rows[0] as any)?.tcg_card_id || null
  } catch {
    return null
  }
}

/**
 * Batch version: resolve multiple refs in one DB roundtrip.
 * Returns Map of sourceRef → tcg_card_id (null if unresolved).
 */
export async function resolveTcgCardIds(
  sourceRefs: string[],
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>()
  if (sourceRefs.length === 0) return result

  // Pre-fill canonical refs
  const needsLookup: string[] = []
  for (const ref of sourceRefs) {
    if (isCanonicalRef(ref)) {
      result.set(ref, ref)
    } else {
      needsLookup.push(ref)
    }
  }

  if (needsLookup.length === 0) return result

  try {
    const rows = await sql.query(
      `SELECT poketrace_id::text AS pt_id, tcgdex_card_ref, ebay_card_ref, tcg_card_id
       FROM card_aliases
       WHERE tcg_card_id IS NOT NULL
         AND (
           poketrace_id::text = ANY($1::text[])
           OR tcgdex_card_ref = ANY($1::text[])
           OR ebay_card_ref = ANY($1::text[])
         )`,
      [needsLookup]
    )

    for (const r of rows as any[]) {
      if (r.pt_id && needsLookup.includes(r.pt_id)) result.set(r.pt_id, r.tcg_card_id)
      if (r.tcgdex_card_ref && needsLookup.includes(r.tcgdex_card_ref)) {
        result.set(r.tcgdex_card_ref, r.tcg_card_id)
      }
      if (r.ebay_card_ref && needsLookup.includes(r.ebay_card_ref)) {
        result.set(r.ebay_card_ref, r.tcg_card_id)
      }
    }

    // Fill unresolved as null
    for (const ref of needsLookup) {
      if (!result.has(ref)) result.set(ref, null)
    }
  } catch {
    for (const ref of needsLookup) result.set(ref, null)
  }

  return result
}

/**
 * Persist a new source mapping into card_aliases.
 * Used when an adapter discovers a new external ref → tcg_card_id link.
 *
 * E.g. eBay scrape finds card "PSA 10 Charizard Japanese No.006" → matches
 *      tcg_card_id "en-base1-4" → we can record ebay_card_ref for next time.
 */
export async function recordSourceMapping(
  tcgCardId: string,
  source: 'ebay' | 'tcgdex' | 'poketrace' | 'tcgplayer',
  sourceRef: string,
): Promise<boolean> {
  if (!tcgCardId || !sourceRef) return false

  const column = {
    ebay: 'ebay_card_ref',
    tcgdex: 'tcgdex_card_ref',
    poketrace: 'poketrace_id',
    tcgplayer: 'tcgplayer_product_id',
  }[source]

  if (!column) return false

  try {
    // Find canonical alias for this tcg_card_id
    const rows = await sql.query(
      `SELECT canonical_id FROM card_aliases WHERE tcg_card_id = $1 LIMIT 1`,
      [tcgCardId]
    )
    const canonicalId = (rows[0] as any)?.canonical_id
    if (!canonicalId) return false

    // Update the slot
    await sql.query(
      `UPDATE card_aliases SET ${column} = $1, updated_at = now() WHERE canonical_id = $2`,
      [sourceRef, canonicalId]
    )
    return true
  } catch {
    return false
  }
}
