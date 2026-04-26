#!/bin/bash
SETS=(
  swsh125 cz-collection cz-mini
  sv1 sv2 sv3 sv35 sv4 sv45 sv5 sv6 sv65 sv7 sv8 sv85 sv9 sv10
  sv105a sv105b sv11 sv115 sv12 sv13
  sv-energies
  svp-2023 svp-2024 svp-2025 mep-2025 mep-2026
  sv151-upc sv151-mini paldea-mini paldea-fates-mini paldea-fates-mini-2
  vibrant-paldea-mini mega-heroes-mini
  tcg-classic-blastoise tcg-classic-charizard tcg-classic-venusaur
  klara-tournament paldea-luggage pgo-strong-bond
  my-first-bulbasaur my-first-charmander my-first-pikachu my-first-squirtle
  combined-powers-upc greninja-upc battle-academy-2024
  holiday-calendar-2023 holiday-calendar-2024 holiday-calendar-2025
  trick-trade-2023 trick-trade-2024
  wc22-adp wc22-cheryl wc22-palkia wc22-mew
  wc23-lugia wc23-kyogre wc23-psychic wc23-mew
  wc24-ancient wc24-crushing wc24-regidrago wc24-don
  ic-lac-2024 ic-eu-2024 ic-na-2024 ic-eu-2025 ic-lac-2025 ic-na-2025
  worlds-2023 worlds-2024 worlds-2025
  pkmn-promo-2023 pkmn-promo-2024 pkmn-promo-2025
  prize-pack-s2 prize-pack-s3 prize-pack-s4 prize-pack-s5
  prize-pack-s6 prize-pack-s7 prize-pack-s8
  prof-prog-2023 prof-prog-2024
  mcd-2023 mcd-2024 mcd-stickers-2023
  insert-2023 insert-2024 insert-2025
  tcglive-2023 tcglive-2024
)
echo "Batch scraping ${#SETS[@]} SV-era entries (FINAL)"
SUCCESSES=0
FAILURES=0
FAILED_SETS=()
for setId in "${SETS[@]}"; do
  echo ""
  echo "=== $setId ==="
  if npm run psa:scrape -- --setId=$setId; then
    SUCCESSES=$((SUCCESSES + 1))
  else
    FAILURES=$((FAILURES + 1))
    FAILED_SETS+=("$setId")
  fi
  sleep 12
done
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Successes: $SUCCESSES / ${#SETS[@]}"
echo "Failures:  $FAILURES"
if [ $FAILURES -gt 0 ]; then echo "Failed: ${FAILED_SETS[*]}"; fi
