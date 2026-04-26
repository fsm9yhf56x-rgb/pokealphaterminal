#!/bin/bash
SETS=(
  swsh1 swsh2 swsh3 swsh35 swsh4 swsh45 swsh5 swsh6
  swsh7 swsh75 swsh8 swsh9 swsh10 swsh11 swsh12
  pgo
  swshp-2020 swshp-2021 swshp-2022
  smp-2020 smp-2021
  battle-academy-2020 battle-academy-2022 futsal
  galar-friends galar-power raid-battle
  cele-classic cele-upc cele-mini
  asia-25th creatures-25th first-partner
  arceus-vstar-upc intro-deck-swsh mew-v-box lucario-tyranitar
  fall-chest-2022 sv-preorder-bonus prize-pack-s1 sinnoh-stars
  worlds-2022
  insert-2020 insert-2021 insert-2022
  online-2020 online-2021 tcglive-2022
  mcd-2021 mcd-2022
)
echo "Batch scraping ${#SETS[@]} SWSH-era entries"
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
