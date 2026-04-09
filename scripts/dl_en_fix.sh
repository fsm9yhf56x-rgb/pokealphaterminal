#!/bin/bash
DL() {
  local file="$1" wiki="$2"
  local out="public/img/games/en/$file"
  local real=$(curl -s "https://archives.bulbagarden.net/wiki/File:$wiki" | grep -oE "https://archives.bulbagarden.net/media/upload/[^\"]+" | grep -v thumb | head -1)
  if [ -n "$real" ]; then
    curl -s -o "$out" "$real"
    local sz=$(stat -f%z "$out" 2>/dev/null || echo 0)
    if [ "$sz" -gt 1000 ]; then echo "OK: $file ($sz)"; else echo "SMALL: $file"; fi
  else echo "FAIL: $file ($wiki)"; fi
  sleep 1
}

# Try EN-specific names
DL "diamond.png" "Diamond_EN_boxart.png"
DL "pearl.png" "Pearl_EN_boxart.png"
DL "emerald.png" "Emerald_EN_boxart.png"
DL "hgss-hg.png" "HeartGold_EN_boxart.png"
DL "hgss-ss.png" "SoulSilver_EN_boxart.png"
DL "ranger.png" "Ranger_EN_boxart.png"
DL "mystery-red.png" "Red_Rescue_Team_EN_boxart.png"
DL "mystery-blue.png" "Blue_Rescue_Team_EN_boxart.png"

# Try alternate patterns
DL "diamond.png" "DP_Diamond_EN.png"
DL "pearl.png" "DP_Pearl_EN.png"
DL "emerald.png" "Emerald_boxart_EN.png"

echo "Done"
