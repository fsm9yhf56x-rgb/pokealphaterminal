#!/bin/bash
DL() {
  local file="$1" page="$2"
  local out="public/img/games/en/$file"
  if [ -f "$out" ] && [ $(stat -f%z "$out" 2>/dev/null || echo 0) -gt 50000 ]; then echo "SKIP: $file"; return; fi
  local real=$(curl -sL "https://en.wikipedia.org/wiki/$page" | grep -oE 'upload\.wikimedia\.org/wikipedia/en/[^"]+\.(png|jpg)' | head -1)
  if [ -n "$real" ]; then
    curl -s -o "$out" -L "https://$real" -H "User-Agent: Mozilla/5.0"
    local sz=$(stat -f%z "$out" 2>/dev/null || echo 0)
    if [ "$sz" -gt 5000 ]; then echo "OK: $file ($sz)"; else echo "SMALL: $file ($sz)"; fi
  else echo "FAIL: $file"; fi
  sleep 2
}

DL "diamond.png" "Pok%C3%A9mon_Diamond_and_Pearl"
DL "pearl.png" "Pok%C3%A9mon_Diamond_and_Pearl"
DL "emerald.png" "Pok%C3%A9mon_Emerald"
DL "hgss-hg.png" "Pok%C3%A9mon_HeartGold_and_SoulSilver"
DL "hgss-ss.png" "Pok%C3%A9mon_HeartGold_and_SoulSilver"
DL "ranger.png" "Pok%C3%A9mon_Ranger_(video_game)"
DL "mystery-red.png" "Pok%C3%A9mon_Mystery_Dungeon:_Blue_Rescue_Team_and_Red_Rescue_Team"
DL "mystery-blue.png" "Pok%C3%A9mon_Mystery_Dungeon:_Blue_Rescue_Team_and_Red_Rescue_Team"

echo ""
echo "EN: $(ls public/img/games/en/ | wc -l) files"
