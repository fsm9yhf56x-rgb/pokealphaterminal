#!/bin/bash
DL() {
  local file="$1" wiki="$2"
  local out="public/img/games/jp/$file"
  if [ -f "$out" ] && [ $(stat -f%z "$out" 2>/dev/null || echo 0) -gt 1000 ]; then echo "SKIP: $file"; return; fi
  local real=$(curl -s "https://archives.bulbagarden.net/wiki/File:$wiki" | grep -oE "https://archives.bulbagarden.net/media/upload/[^\"]+" | grep -v thumb | head -1)
  if [ -n "$real" ]; then
    curl -s -o "$out" "$real"
    echo "OK: jp/$file"
  else echo "FAIL: jp/$file"; fi
  sleep 1
}
mkdir -p public/img/games/jp public/img/games/en
for f in public/img/games/*.png; do cp "$f" "public/img/games/en/$(basename $f)" 2>/dev/null; done
DL "red.png" "Red_JP_boxart.png"
DL "blue.png" "Blue_JP_boxart.png"
DL "yellow.png" "Yellow_JP_boxart.png"
DL "gold.png" "Gold_JP_boxart.png"
DL "silver.png" "Silver_JP_boxart.png"
DL "crystal.png" "Crystal_JP_boxart.png"
DL "ruby.png" "Ruby_JP_boxart.png"
DL "sapphire.png" "Sapphire_JP_boxart.png"
DL "emerald.png" "Emerald_JP_boxart.png"
DL "firered.png" "FireRed_JP_boxart.png"
DL "leafgreen.png" "LeafGreen_JP_boxart.png"
DL "diamond.png" "Diamond_JP_boxart.png"
DL "pearl.png" "Pearl_JP_boxart.png"
DL "platinum.png" "Platinum_JP_boxart.png"
DL "hgss-hg.png" "HeartGold_JP_boxart.png"
DL "hgss-ss.png" "SoulSilver_JP_boxart.png"
DL "stadium.png" "Stadium_JP_boxart.png"
DL "stadium2.png" "Stadium_2_JP_boxart.png"
DL "snap.png" "Snap_JP_boxart.png"
DL "colosseum.png" "Colosseum_JP_boxart.png"
DL "xd.png" "XD_JP_boxart.png"
DL "pinball.png" "Pinball_JP_boxart.png"
DL "tcg-gb.png" "TCG_JP_boxart.png"
DL "puzzle.png" "Puzzle_Challenge_JP_boxart.png"
DL "ranger.png" "Ranger_JP_boxart.png"
DL "mystery-red.png" "Red_Rescue_Team_JP_boxart.png"
DL "mystery-blue.png" "Blue_Rescue_Team_JP_boxart.png"
echo "JP: $(ls public/img/games/jp/*.png 2>/dev/null | wc -l) EN: $(ls public/img/games/en/*.png 2>/dev/null | wc -l)"
