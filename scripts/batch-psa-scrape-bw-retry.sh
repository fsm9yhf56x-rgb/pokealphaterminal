#!/bin/bash
SETS=(
  bwp-2013
  bw-theme bw-tk-excadrill bw-tk-zoroark
  ba-keldeo ba-xerneas ba-energies
  pkmn-promo-2011 pkmn-promo-2013
  insert-2011 insert-2012 insert-2013
  mcd-2011 mcd-2012
  league-2011 illusion-2011
  worlds-2011 worlds-2012 worlds-2013-promo worlds-2013-deck
)
echo "🔁 Retry batch: ${#SETS[@]} BW-era entries"
SUCCESSES=0
FAILURES=0
FAILED_SETS=()
for setId in "${SETS[@]}"; do
  echo ""
  echo "=== Scraping $setId ==="
  if npm run psa:scrape -- --setId=$setId; then
    SUCCESSES=$((SUCCESSES + 1))
  else
    FAILURES=$((FAILURES + 1))
    FAILED_SETS+=("$setId")
    echo "  ❌ $setId failed, continuing..."
  fi
  sleep 10  # plus lent pour ne pas re-trigger Cloudflare
done
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Successes: $SUCCESSES / ${#SETS[@]}"
echo "❌ Failures: $FAILURES"
if [ $FAILURES -gt 0 ]; then
  echo "Failed sets: ${FAILED_SETS[*]}"
fi
