#!/bin/bash
SETS=(
  sm1 sm2 sm3 sm35 sm4 sm5 sm6 sm7 sm75 sm8 sm9 sm10 sm11 sm115 sm12
  det1
  smp-2017 smp-2018 smp-2019
  sm-tk-aloraichu sm-tk-lycanroc sm-tk-aloninetales sm-tk-alosandslash
  ba-blackwhitekyurem mega-powers premium-trainer-xy pokken-2017
  xy-bt-2017 xyp-2017 xy-bp-2017 xy-br-2017
  ba-mchar-mblast card-game-mtd
  kanto-friends-mini kanto-power-mini
  worlds-2019-fire worlds-2019-mind worlds-2019-perf worlds-2019-pika
  pkmn-promo-2018
  insert-2017 insert-2018 insert-2019
  online-2017 online-2018 online-2019
  mcd-2017 mcd-2018 mcd-2019
  worlds-2017 worlds-2018 worlds-2018-bis worlds-2019
)
echo "Batch scraping ${#SETS[@]} SM-era entries"
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
