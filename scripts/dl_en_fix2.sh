#!/bin/bash
DL() {
  local file="$1" page="$2" nth="$3"
  local out="public/img/games/en/$file"
  local real=$(curl -sL "https://en.wikipedia.org/wiki/$page" -H "User-Agent: Mozilla/5.0" | grep -oE 'upload\.wikimedia\.org/wikipedia/en/[^"]+\.(png|jpg)' | sed -n "${nth}p")
  if [ -n "$real" ]; then
    curl -s -o "$out" -L "https://$real" -H "User-Agent: Mozilla/5.0"
    echo "OK: $file ($(stat -f%z "$out"))"
  else echo "FAIL: $file"; fi
  sleep 2
}

# Pearl = 2nd image on Diamond/Pearl page
DL "pearl.png" "Pok%C3%A9mon_Diamond_and_Pearl" 2
# SoulSilver = 2nd image on HGSS page  
DL "hgss-ss.png" "Pok%C3%A9mon_HeartGold_and_SoulSilver" 2
# Mystery Blue = 2nd image
DL "mystery-blue.png" "Pok%C3%A9mon_Mystery_Dungeon:_Blue_Rescue_Team_and_Red_Rescue_Team" 2
# Ranger
DL "ranger.png" "Pok%C3%A9mon_Ranger_(video_game)" 1
