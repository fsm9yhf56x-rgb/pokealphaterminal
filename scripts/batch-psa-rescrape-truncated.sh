#!/bin/bash
SETS=(neo4 ecard1 ex6 ex8 ex9 ex13)
echo "🔁 Re-scraping ${#SETS[@]} truncated sets with pagination"
for setId in "${SETS[@]}"; do
  echo ""
  echo "=== Re-scraping $setId (paginated) ==="
  npm run psa:scrape -- --setId=$setId
  sleep 5
done
echo ""
echo "✅ Done."
