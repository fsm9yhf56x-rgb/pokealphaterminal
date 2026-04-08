#!/usr/bin/env python3
"""#7 Badges rarete + #8 Hover premium sur la grille Index"""
from pathlib import Path

EA = '\u00e9'
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# Rarity color map
RARITY_MAP = """const RARITY_COLORS: Record<string,{bg:string;fg:string}> = {
  'Commune':       {bg:'#F1EFE8',fg:'#5F5E5A'},
  'Common':        {bg:'#F1EFE8',fg:'#5F5E5A'},
  'Peu Commune':   {bg:'#E1F5EE',fg:'#085041'},
  'Uncommon':      {bg:'#E1F5EE',fg:'#085041'},
  'Rare':          {bg:'#E6F1FB',fg:'#0C447C'},
  'Holo Rare':     {bg:'#EEEDFE',fg:'#3C3489'},
  'Ultra Rare':    {bg:'#FBEAF0',fg:'#72243E'},
  'Double Rare':   {bg:'#FBEAF0',fg:'#72243E'},
  'Illustration Rare': {bg:'#FAEEDA',fg:'#633806'},
  'Special Art Rare':  {bg:'#FAEEDA',fg:'#633806'},
  'Hyper Rare':    {bg:'#FAEEDA',fg:'#633806'},
  'Secret Rare':   {bg:'#FAEEDA',fg:'#633806'},
  'Alt Art':       {bg:'#FAEEDA',fg:'#633806'},
  'ACE SPEC Rare': {bg:'#FCEBEB',fg:'#791F1F'},
  'Shiny Rare':    {bg:'#EEEDFE',fg:'#3C3489'},
}
const getRarityColor = (r:string) => RARITY_COLORS[r] || {bg:'#F1EFE8',fg:'#5F5E5A'}
"""

# 1. Ajouter le rarity map apres les constantes TC
old_tc = "const TC: Record<string,string> = {"
assert old_tc in s, "CIBLE TC"
s = s.replace(old_tc, RARITY_MAP + "\n" + old_tc, 1)
print('  > rarity colors')

# 2. Badge rarete + hover sur les cartes grille
# Trouver le div image dans la grille
old_img_div = """                      <div style={{ height:cfg.imgH, background:'linear-gradient(145deg,#F6F6F6,#EEEEEE)', position:'relative', overflow:'hidden' }}>"""
new_img_div = """                      <div style={{ height:cfg.imgH, background:'#F5F5F5', position:'relative', overflow:'hidden' }}>
                        {card.rarity && (()=>{ const rc=getRarityColor(card.rarity); return <div style={{ position:'absolute', top:'6px', left:'6px', zIndex:2, padding:'2px 6px', borderRadius:'4px', background:rc.bg, fontSize:'8px', fontWeight:600, color:rc.fg, fontFamily:'var(--font-display)', letterSpacing:'.02em' }}>{card.rarity}</div> })()}"""
assert old_img_div in s, "CIBLE IMG DIV"
s = s.replace(old_img_div, new_img_div, 1)
print('  > rarity badge')

# 3. Hover premium — CSS
old_css_enc = ".enc-card.sel { border-color:#111 !important; box-shadow:0 8px 28px rgba(0,0,0,.1) !important; }"
if old_css_enc in s:
    new_css_enc = """.enc-card.sel { border-color:#111 !important; box-shadow:0 8px 28px rgba(0,0,0,.1) !important; }
        .enc-card { transition:transform .2s ease, box-shadow .2s ease, border-color .15s !important; }
        .enc-card:hover { transform:translateY(-4px) !important; box-shadow:0 12px 32px rgba(0,0,0,.08) !important; border-color:#D2D2D7 !important; }
        .enc-card:hover .card-img { transform:scale(1.03); }
        .enc-card .card-img { transition:transform .25s ease; }"""
    s = s.replace(old_css_enc, new_css_enc, 1)
    print('  > hover CSS')
else:
    # Chercher un autre point CSS
    old_css2 = ".enc-card {"
    if old_css2 in s:
        idx = s.find(old_css2)
        line_end = s.find("}", idx) + 1
        old_line = s[idx:line_end]
        new_line = old_line + """
        .enc-card { transition:transform .2s ease, box-shadow .2s ease !important; }
        .enc-card:hover { transform:translateY(-4px) !important; box-shadow:0 12px 32px rgba(0,0,0,.08) !important; border-color:#D2D2D7 !important; }
        .enc-card:hover .card-img { transform:scale(1.03); }
        .enc-card .card-img { transition:transform .25s ease; }"""
        s = s.replace(old_line, new_line, 1)
        print('  > hover CSS alt')

# 4. Rarity badge dans le panel detail aussi
old_detail_rarity = "Raret"
idx_raret = s.find("Raret")
if idx_raret > 0:
    # Chercher le span qui affiche la rarete
    area = s[idx_raret:idx_raret+200]
    old_val = ">{detail.rarity}</div>"
    if old_val in s:
        new_val = ">{detail.rarity && (()=>{ const rc=getRarityColor(detail.rarity); return <span style={{ padding:'2px 8px', borderRadius:'4px', background:rc.bg, color:rc.fg, fontSize:'11px', fontWeight:600 }}>{detail.rarity}</span> })()}</div>"
        s = s.replace(old_val, new_val, 1)
        print('  > detail rarity badge')

f.write_text(s, 'utf-8')
print('OK')
