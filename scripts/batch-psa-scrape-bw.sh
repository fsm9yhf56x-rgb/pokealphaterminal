#!/bin/bash
SETS=(
  col1
  bw1 bw2 bw3 bw4 bw5 bw6 bw7 bw8 bw9 bw10 bw11
  rc dv1
  bwp-2011 bwp-2012 bwp-2013
  bw-theme bw-tk-excadrill bw-tk-zoroark
  ba-keldeo ba-xerneas ba-energies
  pkmn-promo-2011 pkmn-promo-2013
  insert-2011 insert-2012 insert-2013
  mcd-2011 mcd-2012
  league-2011 illusion-2011
  worlds-2011 worlds-2012 worlds-2013-promo worlds-2013-deck
)
echo "Batch scraping ${#SETS[@]} BW-era entries"
for setId in "${SETS[@]}"; do
  echo ""
  echo "=== Scraping $setId ==="
  npm run psa:scrape -- --setId=$setId
  sleep 4
done
echo ""
echo "Done."
