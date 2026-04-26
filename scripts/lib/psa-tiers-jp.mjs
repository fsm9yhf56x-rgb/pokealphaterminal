/**
 * PSA Japanese tier classification.
 * 
 * HOT (~14)  : daily   — current SV releases (highly active grading)
 * WARM (~30) : weekly  — recent SV mainline + popular promos
 * COLD (~485): monthly — vintage Japanese, exclusivities, older sets
 *
 * Identifiers match keys in psa-headings-jp.mjs (without 'jp-' prefix).
 */

export const TIER_HOT_JP = [
  // SV récents 2025
  'SV9', 'SV9A', 'SV10', 'SV11B', 'SV11W', 'SV-P',
  'MC',          // Start Deck 100 Battle Collection
  'M1L', 'M1S',  // Mega Brave / Mega Symphonia (latest 2025)
  'M2', 'M2A',   // Inferno X / Mega Dream EX
  'M3', 'M4',    // Nullifying Zero / Ninja Spinner (2026)
  'M-P',         // Mega promos
]

export const TIER_WARM_JP = [
  // SV early mainline
  'SV1S', 'SV1V', 'SV1A',
  'SV2A',                    // Pokemon 151 Japanese
  'SV2D', 'SV2P',
  'SV3', 'SV3A',
  'SV4A', 'SV4K', 'SV4M',
  'SV5A', 'SV5K', 'SV5M',
  'SV6', 'SV6A',
  'SV7', 'SV7A',
  'SV8', 'SV8A',
  // SwSh/Sun&Moon récents (2022-2024)
  // Promos modernes
  'WCS23',                   // Worlds 2023 Yokohama Decks
  // Starter/Build Box récents
  'SVD', 'SVF', 'SVG', 'SVK', 'SVN',
  // Premium
  'MA', 'MBD', 'MBG', 'MP1',
]

// COLD = everything else from psa-headings-jp.mjs
// We'll auto-compute it: all setIds NOT in HOT or WARM
export function getColdTierJp(allSetIds) {
  const hotWarm = new Set([...TIER_HOT_JP, ...TIER_WARM_JP])
  return allSetIds.filter(s => !hotWarm.has(s))
}

export function getSetsForTierJp(tier, allSetIds) {
  if (tier === 'hot')  return TIER_HOT_JP
  if (tier === 'warm') return TIER_WARM_JP
  if (tier === 'cold') return getColdTierJp(allSetIds)
  throw new Error(`Unknown tier: ${tier}`)
}
