#!/bin/bash
DL() {
  local file="$1" url="$2"
  local out="public/img/games/en/$file"
  curl -s -o "$out" -L "$url"
  local sz=$(stat -f%z "$out" 2>/dev/null || echo 0)
  if [ "$sz" -gt 5000 ]; then echo "OK: $file ($sz)"; else echo "FAIL: $file ($sz)"; rm -f "$out"; fi
  sleep 1
}

# Wikipedia commons direct links
DL "diamond.png" "https://upload.wikimedia.org/wikipedia/en/a/a2/Pok%C3%A9mon_Diamond_cover.png"
DL "pearl.png" "https://upload.wikimedia.org/wikipedia/en/3/3e/Pok%C3%A9mon_Pearl_cover.png"
DL "emerald.png" "https://upload.wikimedia.org/wikipedia/en/a/a6/Pokemon_Emerald.jpg"
DL "hgss-hg.png" "https://upload.wikimedia.org/wikipedia/en/1/1e/Pok%C3%A9mon_HeartGold_cover.png"
DL "hgss-ss.png" "https://upload.wikimedia.org/wikipedia/en/3/3b/Pok%C3%A9mon_SoulSilver_cover.png"
DL "ranger.png" "https://upload.wikimedia.org/wikipedia/en/e/e3/Pok%C3%A9mon_Ranger_Coverart.png"
DL "mystery-red.png" "https://upload.wikimedia.org/wikipedia/en/6/6b/Pok%C3%A9mon_Mystery_Dungeon_Red_Rescue_Team_cover.png"
DL "mystery-blue.png" "https://upload.wikimedia.org/wikipedia/en/2/28/Pok%C3%A9mon_Mystery_Dungeon_Blue_Rescue_Team_cover.png"

echo ""
echo "EN total: $(ls public/img/games/en/*.png public/img/games/en/*.jpg 2>/dev/null | wc -l)"
