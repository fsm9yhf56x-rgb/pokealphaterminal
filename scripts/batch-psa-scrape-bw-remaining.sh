#!/bin/bash
SETS=(
  bw-theme bw-tk-excadrill bw-tk-zoroark
  ba-keldeo ba-xerneas ba-energies
  pkmn-promo-2011 pkmn-promo-2013
  insert-2011 insert-2012 insert-2013
  mcd-2011 mcd-2012
  league-2011 illusion-2011
  worlds-2011 worlds-2012 worlds-2013-promo worlds-2013-deck
)
echo "🔁 Scraping ${#SETS[@]} remaining BW-era secondary sets"
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
    echo "  ❌ $setId failed"
  fi
  sleep 10
done
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Successes: $SUCCESSES / ${#SETS[@]}"
echo "Failures:  $FAILURES"
if [ $FAILURES -gt 0 ]; then
  echo "Failed: ${FAILED_SETS[*]}"
fi
