#!/bin/bash
# Batch scrape multiple PSA sets, with delay between each
# to avoid hammering Cloudflare.

SETS=(base2 base3 base4 base5 basep gym1 gym2 neo1 neo2 neo3 neo4 lc ecard1)

echo "🚀 Batch scraping ${#SETS[@]} PSA sets"
echo "   Estimated time: ~${#SETS[@]}0s (${#SETS[@]} × ~10s)"
echo ""

for setId in "${SETS[@]}"; do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Scraping $setId..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  npm run psa:scrape -- --setId=$setId
  
  # Delay between sets (be nice to Cloudflare + PSA)
  sleep 5
done

echo ""
echo "✅ Batch complete. Verify in DB with:"
echo "   node scripts/verify-psa-base1.mjs"
