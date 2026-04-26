#!/bin/bash
SETS=(
  xy1 xy2 xy3 xy4 xy5 xy6 xy7 xy8 xy9 xy10 xy11 xy12
  g1 rc-xy dc1
  xyp-2014 xyp-2015 xyp-2016
  xy-tk-sylveon xy-tk-bisharp xy-tk-noivern xy-tk-wigglytuff
  xy-tk-latias xy-tk-latios xy-tk-pikalibre xy-tk-suicune
  xy-collector-chest xy-bt-blister
  ba-mewtwo-darkrai battle-articuno art-academy
  pokken-2015 pokken-2016
  bwp-2014 pkmn-promo-2014 pkmn-promo-2015
  insert-2014 insert-2015 insert-2016
  online-2015 online-2016
  mcd-2014 mcd-2015 mcd-2016
  worlds-2014 worlds-2015 worlds-2016 worlds-2016-deck
  scrap-2014
)
echo "Batch scraping ${#SETS[@]} XY-era entries"
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
