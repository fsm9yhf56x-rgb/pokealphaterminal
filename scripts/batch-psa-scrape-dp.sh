#!/bin/bash
SETS=(dp1 dp2 dp3 dp4 dp5 dp6 dp7 pl1 pl2 pl3 pl4 hgss1 hgss2 hgss3 hgss4)
echo "Batch scraping ${#SETS[@]} DP-era sets"
for setId in "${SETS[@]}"; do
  echo ""
  echo "=== Scraping $setId ==="
  npm run psa:scrape -- --setId=$setId
  sleep 5
done
echo ""
echo "Done."
