/**
 * PSA scrape frequency tiers.
 *
 * HOT  → daily (sets récents, gradation très active : sv8.5+, latest releases)
 * WARM → weekly (SV early + SWSH récents : pop change régulier)
 * COLD → monthly (vintage + ères stables : pop change lent)
 *
 * Total time per tier (with rate limit safety):
 *   HOT  ~3 min  (15 sets × ~12s)
 *   WARM ~10 min (~50 sets)
 *   COLD ~60 min (~225 sets, run la nuit)
 */

export const TIER_HOT = [
  // SV très récents (gradation explosive)
  'sv85',  // Prismatic Evolutions
  'sv9',   // Journey Together
  'sv10',  // Destined Rivals
  'sv105a', 'sv105b',  // Black Bolt / White Flare
  'sv11',  // Mega Evolution
  'sv115', // Phantasmal Flames
  'sv12',  // Ascended Heroes
  'sv13',  // Perfect Order
  // Promos récents
  'svp-2025',
  'mep-2025', 'mep-2026',
  // World Championships récents
  'worlds-2024', 'worlds-2025',
]

export const TIER_WARM = [
  // SV early (encore très chassés)
  'sv1', 'sv2', 'sv3', 'sv35', 'sv4', 'sv45',
  'sv5', 'sv6', 'sv65', 'sv7', 'sv8',
  // SWSH récents
  'swsh10', 'swsh11', 'swsh12', 'swsh125', 'swsh75', 'swsh45',
  'swsh7', 'swsh8', 'swsh9',
  // Pokemon GO (toujours chassé)
  'pgo',
  // SV Promos older
  'svp-2023', 'svp-2024',
  'svp-2025',  // overlap with HOT, OK
  // World Champ Decks récents
  'wc23-lugia', 'wc23-kyogre', 'wc23-psychic', 'wc23-mew',
  'wc24-ancient', 'wc24-crushing', 'wc24-regidrago', 'wc24-don',
  // 151 specials
  'sv151-upc', 'sv151-mini',
  // Boxes récents
  'arceus-vstar-upc', 'combined-powers-upc', 'greninja-upc',
  'cele-upc', 'cele-classic', 'cele-mini',
]

export const TIER_COLD = [
  // WOTC vintage
  'base1', 'base2', 'base3', 'base4', 'base5', 'basep',
  'gym1', 'gym2',
  'neo1', 'neo2', 'neo3', 'neo4',
  'lc', 'ecard1',
  // EX era
  'ex1', 'ex2', 'ex3', 'ex4', 'ex5', 'ex6', 'ex7', 'ex8',
  'ex9', 'ex10', 'ex11', 'ex12', 'ex13', 'ex14', 'ex15', 'ex16',
  // DP-Plat-HGSS
  'dp1', 'dp2', 'dp3', 'dp4', 'dp5', 'dp6', 'dp7',
  'pl1', 'pl2', 'pl3', 'pl4',
  'hgss1', 'hgss2', 'hgss3', 'hgss4',
  // BW
  'col1',
  'bw1', 'bw2', 'bw3', 'bw4', 'bw5', 'bw6', 'bw7', 'bw8', 'bw9', 'bw10', 'bw11',
  'rc', 'dv1',
  'bwp-2011', 'bwp-2012', 'bwp-2013', 'bwp-2014',
  // XY
  'xy1', 'xy2', 'xy3', 'xy4', 'xy5', 'xy6', 'xy7', 'xy8', 'xy9', 'xy10', 'xy11', 'xy12',
  'g1', 'rc-xy', 'dc1',
  'xyp-2014', 'xyp-2015', 'xyp-2016', 'xyp-2017',
  // SM
  'sm1', 'sm2', 'sm3', 'sm35', 'sm4',
  'sm5', 'sm6', 'sm7', 'sm75', 'sm8',
  'sm9', 'sm10', 'sm11', 'sm115', 'sm12',
  'det1',
  'smp-2017', 'smp-2018', 'smp-2019', 'smp-2020', 'smp-2021',
  // SWSH older
  'swsh1', 'swsh2', 'swsh3', 'swsh35', 'swsh4',
  'swshp-2020', 'swshp-2021', 'swshp-2022',
  // Battle Academies, Trainer Kits, World Champs anciens, Insert Cards, etc.
  'battle-academy-2020', 'battle-academy-2022', 'battle-academy-2024',
  'futsal', 'galar-friends', 'galar-power', 'raid-battle',
  'asia-25th', 'creatures-25th', 'first-partner',
  'intro-deck-swsh', 'mew-v-box', 'lucario-tyranitar', 'fall-chest-2022',
  'sv-preorder-bonus', 'prize-pack-s1',
  'sinnoh-stars', 'worlds-2022',
  'paldea-mini', 'paldea-fates-mini', 'paldea-fates-mini-2',
  'vibrant-paldea-mini', 'mega-heroes-mini',
  'tcg-classic-blastoise', 'tcg-classic-charizard', 'tcg-classic-venusaur',
  'klara-tournament', 'paldea-luggage', 'pgo-strong-bond',
  'my-first-bulbasaur', 'my-first-charmander', 'my-first-pikachu', 'my-first-squirtle',
  'holiday-calendar-2023', 'holiday-calendar-2024', 'holiday-calendar-2025',
  'trick-trade-2023', 'trick-trade-2024',
  'wc22-adp', 'wc22-cheryl', 'wc22-palkia', 'wc22-mew',
  'ic-lac-2024', 'ic-eu-2024', 'ic-na-2024',
  'ic-eu-2025', 'ic-lac-2025', 'ic-na-2025',
  'worlds-2011', 'worlds-2013-promo', 'worlds-2013-deck',
  'worlds-2014', 'worlds-2015', 'worlds-2016', 'worlds-2016-deck',
  'worlds-2017', 'worlds-2018', 'worlds-2018-bis', 'worlds-2019',
  'worlds-2023',
  'worlds-2019-fire', 'worlds-2019-mind', 'worlds-2019-perf', 'worlds-2019-pika',
  'pkmn-promo-2011', 'pkmn-promo-2013', 'pkmn-promo-2014', 'pkmn-promo-2015',
  'pkmn-promo-2018', 'pkmn-promo-2023', 'pkmn-promo-2024', 'pkmn-promo-2025',
  'prize-pack-s2', 'prize-pack-s3', 'prize-pack-s4',
  'prize-pack-s5', 'prize-pack-s6', 'prize-pack-s7', 'prize-pack-s8',
  'prof-prog-2023', 'prof-prog-2024',
  'mcd-2011', 'mcd-2012', 'mcd-2014', 'mcd-2015', 'mcd-2016',
  'mcd-2017', 'mcd-2018', 'mcd-2019',
  'mcd-2021', 'mcd-2022', 'mcd-2023', 'mcd-2024', 'mcd-stickers-2023',
  'insert-2011', 'insert-2012', 'insert-2013',
  'insert-2014', 'insert-2015', 'insert-2016',
  'insert-2017', 'insert-2018', 'insert-2019',
  'insert-2020', 'insert-2021', 'insert-2022', 'insert-2023',
  'insert-2024', 'insert-2025',
  'online-2015', 'online-2016', 'online-2017', 'online-2018',
  'online-2019', 'online-2020', 'online-2021',
  'tcglive-2022', 'tcglive-2023', 'tcglive-2024',
  'sv-energies',
  'bw-theme', 'bw-tk-excadrill', 'bw-tk-zoroark',
  'ba-keldeo', 'ba-xerneas', 'ba-energies',
  'ba-blackwhitekyurem', 'ba-mchar-mblast',
  'ba-mewtwo-darkrai', 'battle-articuno', 'art-academy',
  'card-game-mtd', 'kanto-friends-mini', 'kanto-power-mini',
  'sm-tk-aloraichu', 'sm-tk-lycanroc', 'sm-tk-aloninetales', 'sm-tk-alosandslash',
  'mega-powers', 'premium-trainer-xy', 'pokken-2015', 'pokken-2016', 'pokken-2017',
  'xy-bt-2017', 'xy-bp-2017', 'xy-br-2017',
  'xy-tk-sylveon', 'xy-tk-bisharp', 'xy-tk-noivern', 'xy-tk-wigglytuff',
  'xy-tk-latias', 'xy-tk-latios', 'xy-tk-pikalibre', 'xy-tk-suicune',
  'xy-collector-chest', 'xy-bt-blister',
  'league-2011', 'illusion-2011', 'scrap-2014',
]

export function getSetsForTier(tier) {
  if (tier === 'hot') return TIER_HOT
  if (tier === 'warm') return TIER_WARM
  if (tier === 'cold') return TIER_COLD
  throw new Error(`Unknown tier: ${tier}`)
}
