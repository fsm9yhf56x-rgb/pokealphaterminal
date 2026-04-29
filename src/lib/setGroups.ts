/**
 * Set grouping utility for organized dropdowns.
 *
 * Groups TCG sets by era (Wizards/Classic, Neo, e-card, EX, DP/Platinum, BW, XY, SM, SWSH, SV, etc.)
 * and orders sets within each group with their variants (1st Edition, Shadowless) clustered
 * right after the parent set.
 *
 * Use case: <select> dropdowns with <optgroup> for "Add a series" / "Add a card"
 * forms in Holdings, Encyclopedie, etc.
 */

import type { TCGSet } from './tcgApi'

// Era detection: maps a set ID prefix or pattern to a human-readable era label.
// Covers FR/EN IDs (lowercase: base1, neo1, sm1...) AND JP IDs (uppercase: PMCG1, S1, SV1, SM1...).
const ERAS: Array<{ label: string; matcher: (id: string) => boolean; order: number }> = [
  // ───────── FR/EN eras (lowercase IDs from sets-EN.json / sets-FR.json) ─────────
  { label: 'Classic (Wizards)', matcher: (id) => /^(base[1-5]|basep|jumbo|np)/.test(id), order: 1 },
  { label: 'Gym (Wizards)', matcher: (id) => /^gym[12]/.test(id), order: 2 },
  { label: 'Neo (Wizards)', matcher: (id) => /^neo[1-4]/.test(id), order: 3 },
  { label: 'Legendary Collection', matcher: (id) => /^lc/.test(id), order: 4 },
  { label: 'e-Card (Wizards)', matcher: (id) => /^ecard|^pop[1-2]/.test(id), order: 5 },
  { label: 'EX', matcher: (id) => /^(ex[0-9]+|exu|exf|exr|tk-ex|pop[3-5])/.test(id), order: 6 },
  { label: 'Diamond & Pearl / Platinum', matcher: (id) => /^(dp|pl|tk-dp|pop[6-9])/.test(id), order: 7 },
  { label: 'HeartGold SoulSilver', matcher: (id) => /^(hgss|tk-hs|col1)/.test(id), order: 8 },
  { label: 'Black & White', matcher: (id) => /^(bw|tk-bw|dv1|2011bw|2012bw|2013bw)/.test(id), order: 9 },
  { label: 'XY', matcher: (id) => /^(xy[0-9]|tk-xy|g1|2014xy|2015xy|2016xy|rc|dc1|wp)/.test(id), order: 10 },
  { label: 'Sun & Moon', matcher: (id) => /^(sm[0-9]|tk-sm|2017sm|2018sm|2019sm|sma|det1)/.test(id), order: 11 },
  { label: 'Sword & Shield', matcher: (id) => /^(swsh|cel25|2021swsh|2022swsh)/.test(id), order: 12 },
  { label: 'Scarlet & Violet', matcher: (id) => /^(sv[0-9]|svp|2023sv|2024sv|sve)/.test(id), order: 13 },
  { label: 'Mega Evolution', matcher: (id) => /^(me|mee|mep|B[12])/.test(id), order: 14 },
  { label: 'Pokemon TCG Pocket', matcher: (id) => /^(A[0-9]|P-A|B[0-9])/.test(id), order: 15 },

  // ───────── JP eras (uppercase IDs from sets-JP.json) ─────────
  { label: '旧裏 Old Back (JP)', matcher: (id) => /^(PMCG|VS[0-9]|web[0-9])/.test(id), order: 21 },
  { label: 'ネオ Neo (JP)', matcher: (id) => /^neo[0-9]/.test(id), order: 22 },
  { label: 'eカード e-Card (JP)', matcher: (id) => /^E[0-9]/.test(id), order: 23 },
  { label: 'ADV (JP)', matcher: (id) => /^ADV/.test(id), order: 24 },
  { label: 'DP / PCG (JP)', matcher: (id) => /^(PCG|LL)/.test(id), order: 25 },
  { label: 'LEGEND L (JP)', matcher: (id) => /^L[0-9P]/.test(id), order: 26 },
  { label: 'BW (JP)', matcher: (id) => /^BW/.test(id), order: 27 },
  { label: 'XY (JP)', matcher: (id) => /^XY/.test(id), order: 28 },
  { label: 'SM Sun & Moon (JP)', matcher: (id) => /^(SM[0-9a-zA-Z]|sn[0-9])/.test(id), order: 29 },
  { label: 'S Sword & Shield (JP)', matcher: (id) => /^S[0-9]/.test(id), order: 30 },
  { label: 'SV Scarlet & Violet (JP)', matcher: (id) => /^SV[0-9a-zA-Z]/.test(id), order: 31 },
  { label: 'sv Pokémon TCG Pocket (JP)', matcher: (id) => /^sv[a-z0-9]/.test(id), order: 32 },
  { label: 'CP / CS Concept Packs (JP)', matcher: (id) => /^(CP[0-9]|CS[0-9])/.test(id), order: 33 },
  { label: 'M Mega Evolution (JP)', matcher: (id) => /^M[0-9]/.test(id), order: 34 },
  { label: 'Sa / SVa Spéciaux (JP)', matcher: (id) => /^(Sa|SVa|sva)/.test(id), order: 35 },
]

/** Detect era for a given set ID. Variants (-1st, -shadowless) inherit parent era. */
function detectEra(setId: string): { label: string; order: number } {
  const cleanId = setId.replace(/-shadowless(-ns)?|-1st/g, '')
  for (const era of ERAS) {
    if (era.matcher(cleanId)) return { label: era.label, order: era.order }
  }
  return { label: 'Autres', order: 99 }
}

/** Get the parent set ID of a variant, or the ID itself if not a variant */
function parentId(setId: string): string {
  return setId.replace(/-shadowless(-ns)?|-1st/g, '')
}

/** Variant priority within a set group: parent → 1st Ed → Shadowless → Shadowless 1st Ed */
function variantOrder(setId: string): number {
  if (setId.endsWith('-shadowless-ns')) return 3
  if (setId.endsWith('-shadowless')) return 2
  if (setId.endsWith('-1st')) return 1
  return 0 // parent (Unlimited)
}

export interface SetGroup {
  label: string
  order: number
  sets: TCGSet[]
}

/**
 * Group sets by era, with variants clustered next to their parent.
 *
 * Example output structure:
 *   [
 *     { label: 'Classic (Wizards)', sets: [base1, base1-1st, base1-shadowless, base2, base2-1st, ...] },
 *     { label: 'Neo (Wizards)', sets: [neo1, neo1-1st, neo2, neo2-1st, ...] },
 *     ...
 *   ]
 */
export function groupSetsByEra(sets: TCGSet[]): SetGroup[] {
  // Step 1: assign era to each set
  const annotated = sets.map(s => ({
    set: s,
    era: detectEra(s.id),
    parent: parentId(s.id),
    variantOrder: variantOrder(s.id),
  }))

  // Step 2: bucket by era
  const buckets = new Map<string, { order: number; items: typeof annotated }>()
  for (const item of annotated) {
    const key = item.era.label
    if (!buckets.has(key)) {
      buckets.set(key, { order: item.era.order, items: [] })
    }
    buckets.get(key)!.items.push(item)
  }

  // Step 3: within each bucket, sort by parent ID then by variant order
  const groups: SetGroup[] = []
  for (const [label, { order, items }] of buckets.entries()) {
    items.sort((a, b) => {
      if (a.parent !== b.parent) return a.parent.localeCompare(b.parent)
      return a.variantOrder - b.variantOrder
    })
    groups.push({ label, order, sets: items.map(i => i.set) })
  }

  // Step 4: order groups by era order
  groups.sort((a, b) => a.order - b.order)
  return groups
}

/**
 * JP set ID → French translation lookup for historically important sets.
 * Used to enrich JP set names in dropdowns: "拡張パック · Set de Base"
 *
 * Coverage: PMCG (Wizards JP), neo, VS, web (exclusive JP), E (e-Card),
 * ADV (Ruby/Sapphire era), PCG (DP era), L/LL (HGSS era).
 *
 * Modern sets (SM, SWSH, SV) are not mapped — their JP names usually mirror EN.
 */
export const JP_SET_TRANSLATIONS: Record<string, string> = {
  // PMCG - Wizards JP (Old Back era)
  'PMCG1': 'Set de Base',
  'PMCG2': 'Jungle',
  'PMCG3': 'Fossile',
  'PMCG4': 'Team Rocket',
  'PMCG5': 'Gym Heroes',
  'PMCG6': 'Gym Challenge',

  // Neo Era
  'neo1': 'Neo Genesis',
  'neo2': 'Neo Discovery',
  'neo3': 'Neo Revelation',
  'neo4': 'Neo Destiny',

  // Exclusivement JP
  'VS1': 'Cards VS (JP only)',
  'web1': 'Cards Web (JP only)',

  // e-Card Era
  'E1': 'Expedition Base Set',
  'E2': 'Aquapolis',
  'E3': 'Skyridge',
  'E4': 'Mysterious Mountains (JP only)',

  // ADV (Ruby & Sapphire) Era
  'ADV1': 'Ruby & Sapphire',
  'ADV2': 'Sandstorm',
  'ADV3': 'Dragon',
  'ADV4': 'Team Magma vs Team Aqua',
  'ADV5': 'Hidden Legends',

  // PCG (Diamond & Pearl, Platinum) Era
  'PCG1': 'EX Deoxys',
  'PCG2': 'EX Emerald',
  'PCG3': 'EX Team Rocket Returns',
  'PCG4': 'EX Unseen Forces',
  'PCG5': 'EX Delta Species',
  'PCG6': 'EX Legend Maker',
  'PCG7': 'EX Holon Phantoms',
  'PCG8': 'EX Crystal Guardians',
  'PCG9': 'EX Dragon Frontiers',
  'PCG10': 'World Champions Pack',

  // LEGEND Era (HGSS)
  'L1a': 'HeartGold Collection',
  'L1b': 'SoulSilver Collection',
  'L2': 'Reviving Legends',
  'L3': 'Clash at the Summit',
  'LL': 'Lost Link',
}

/**
 * Enrich a TCG set with display info for JP language:
 * - Adds French translation suffix if available in JP_SET_TRANSLATIONS
 * - Adds [ID] suffix for disambiguation when set name is ambiguous (duplicate names like "Triplet Beat")
 *
 * Returns the formatted display name (without total — caller adds " (N)" separately).
 */
export function formatJPSetName(set: TCGSet, allSets: TCGSet[]): string {
  const fr = JP_SET_TRANSLATIONS[set.id]
  if (fr) {
    return `${set.name} · ${fr}`
  }
  // Ambiguous? Check if multiple sets share the same name
  const sameName = allSets.filter(s => s.name === set.name)
  if (sameName.length > 1) {
    return `${set.name} [${set.id}]`
  }
  return set.name
}

/**
 * Convenience: filter to only "core" sets (skip Trainer Kits, Promo, McDonalds, Jumbo, etc.)
 * Used when we want a cleaner dropdown with only mainline expansions.
 */
export function filterCoreSets(sets: TCGSet[]): TCGSet[] {
  return sets.filter(s => {
    const id = s.id
    if (/^tk-/.test(id)) return false              // Trainer kits
    if (/^[0-9]+(sm|bw|xy|swsh|sv)/.test(id)) return false // McDonalds (2018sm, 2021swsh, etc.)
    if (/^(jumbo|wp|np|mep|svp|smp|swshp|xyp|bwp|hgssp|dpp|basep|bwd|bwf|bwt|bwm|bws|bwo|bwh|smr|swshs|svm|exf|exr)$/.test(id)) return false
    if (id.startsWith('aopkm')) return false        // Pokemon TCG Pocket (filtered earlier in pipeline)
    return true
  })
}
