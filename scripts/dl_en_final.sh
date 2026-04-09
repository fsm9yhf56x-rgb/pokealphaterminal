#!/bin/bash
DL() {
  local file="$1" page="$2"
  local out="public/img/games/en/$file"
  local real=$(curl -sL "https://en.wikipedia.org/wiki/$page" -H "User-Agent: Mozilla/5.0" | grep -oE 'upload\.wikimedia\.org/wikipedia/en/[^"]+\.(png|jpg)' | head -1)
  if [ -n "$real" ]; then
    curl -s -o "$out" -L "https://$real" -H "User-Agent: Mozilla/5.0"
    echo "OK: $file ($(stat -f%z "$out"))"
  else echo "FAIL: $file"; fi
  sleep 2
}
DL "pearl.png" "Pok%C3%A9mon_Diamond_and_Pearl"
DL "hgss-ss.png" "Pok%C3%A9mon_HeartGold_and_SoulSilver"
# Ranger — copy JP as EN fallback (same intl artwork)
cp public/img/games/jp/ranger.png public/img/games/en/ranger.png
echo "Ranger: copied JP as EN"
echo ""
echo "=== Sizes ==="
for f in diamond pearl emerald hgss-hg hgss-ss mystery-red mystery-blue ranger; do
  en=$(stat -f%z "public/img/games/en/$f.png" 2>/dev/null || echo "MISSING")
  jp=$(stat -f%z "public/img/games/jp/$f.png" 2>/dev/null || echo "MISSING")
  echo "$f: EN=$en JP=$jp $([ "$en" = "$jp" ] && echo "SAME" || echo "DIFF")"
done
