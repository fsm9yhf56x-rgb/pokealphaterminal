#!/usr/bin/env python3
"""2: set color, 3: owned pills, 4: stagger anim, 6: active filter"""
from pathlib import Path

f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# ═══ 2: NOM DU SET EN COULEUR PAR ERE ═══
ERA_COLORS = """const ERA_COLORS: Record<string,string> = {
  'Original (WotC)':'#854F0B', 'EX':'#993C1D', 'DP / Platinum':'#0F6E56',
  'Black & White':'#444441', 'XY':'#185FA5', 'Sun & Moon':'#BA7517',
  'Sword & Shield':'#534AB7', 'Scarlet & Violet':'#A32D2D', 'Autre':'#5F5E5A',
}
"""
old_rarity = "const RARITY_COLORS"
assert old_rarity in s, "CIBLE RARITY"
s = s.replace(old_rarity, ERA_COLORS + "const RARITY_COLORS", 1)
print('  > era colors')

# Chercher ou le set name est affiche dans la grille
old_setname = """                          {card.setName}{card.localId ? ` #${card.localId}` : ''}"""
if old_setname not in s:
    # Chercher un pattern alternatif
    import re
    m = re.search(r"card\.setName.*card\.localId", s)
    if m:
        old_setname = s[s.rfind("{", 0, m.start()):s.find("\n", m.end())]
        print(f'  > found setname at: {repr(old_setname[:60])}')

# Chercher le subtitle dans la grille (apres card.name)
idx_grid_subtitle = s.find("card.setName")
grid_subs = []
while idx_grid_subtitle > 0:
    grid_subs.append(idx_grid_subtitle)
    idx_grid_subtitle = s.find("card.setName", idx_grid_subtitle + 1)

# Le premier est dans les search suggestions, le deuxieme dans la grille
# Chercher dans la zone des enc-card
for idx in grid_subs:
    area = s[max(0,idx-200):idx]
    if "Parfait" in area or "fontSize:'9px'" in area or "color:'#999'" in area or "color:'#AAA'" in area:
        line_start = s.rfind("\n", 0, idx) + 1
        line_end = s.find("\n", idx)
        old_line = s[line_start:line_end]
        if "card.setName" in old_line and "ERA_COLORS" not in old_line:
            new_line = old_line
            # Colorer le setName
            new_line = new_line.replace("card.setName", "card.setName")
            break

# Approche directe: modifier le style de la ligne subtitle dans la grille
# Chercher la div qui contient set + localId dans les card grid
old_sub_style = """style={{ fontSize:'9px', color:'#999'"""
if old_sub_style in s:
    new_sub_style = """style={{ fontSize:'9px', color:ERA_COLORS[card.era]||'#999'"""
    s = s.replace(old_sub_style, new_sub_style, 1)
    print('  > set name colored')
else:
    old_sub_style2 = """fontSize:cfg.subSize"""
    idx_sub = s.find(old_sub_style2)
    if idx_sub > 0:
        # Trouver le color dans la meme ligne
        area = s[idx_sub:idx_sub+200]
        if "color:'#999'" in area:
            s = s[:idx_sub] + area.replace("color:'#999'", "color:ERA_COLORS[card.era]||'#999'", 1) + s[idx_sub+200:]
            print('  > set name colored (alt)')
        elif "color:'#AAA'" in area:
            s = s[:idx_sub] + area.replace("color:'#AAA'", "color:ERA_COLORS[card.era]||'#AAA'", 1) + s[idx_sub+200:]
            print('  > set name colored (alt2)')

# ═══ 3: OWNED COUNT DANS PILLS POPULAIRES ═══
old_pills_count = """                    {nm} <span style={{ opacity:.5 }}>{ct}</span>"""
new_pills_count = """                    {nm} <span style={{ opacity:.5 }}>{(()=>{ const ow=allCards.filter(c=>c.setId===sid&&isOwned(c)).length; return ow>0?ow+'/'+ct:ct })()}</span>"""
if old_pills_count in s:
    s = s.replace(old_pills_count, new_pills_count, 1)
    print('  > pills owned count')

# ═══ 4: STAGGER ANIMATION ═══
# Deja present via cardIn animation, mais ajouter un stagger
old_card_anim = """animation:`cardIn .22s ${Math.min(idx,24)*.018}s ease-out both`"""
if old_card_anim in s:
    # Deja la, ajuster le timing pour plus de fluidite
    new_card_anim = """animation:`cardIn .28s ${Math.min(idx,18)*.025}s ease-out both`"""
    s = s.replace(old_card_anim, new_card_anim, 1)
    print('  > stagger anim tuned')
else:
    print('  > stagger: looking for card style...')
    # Chercher le style de la card grid
    idx_enc_card = s.find("className={`enc-card${")
    if idx_enc_card > 0:
        line_end = s.find("}}>", idx_enc_card) + 3
        old_card = s[idx_enc_card:line_end]
        if 'animation' not in old_card:
            new_card = old_card.replace("}}>", ", animation:`cardIn .28s ${Math.min(idx,18)*.025}s ease-out both` }}>")
            s = s.replace(old_card, new_card, 1)
            print('  > stagger added')

# ═══ 6: FILTRE ACTIF COLORE ═══
old_fsel_era = """className="fsel" value={filEra}"""
new_fsel_era = """className="fsel" value={filEra} style={{ background:filEra!=='all'?'#FFF5F0':'', borderColor:filEra!=='all'?'#FFD0C0':'', color:filEra!=='all'?'#C84B00':'#AAA' }}"""
# Verifier s'il n'y a pas deja un style
idx_fsel = s.find(old_fsel_era)
if idx_fsel > 0:
    # Checker si un style suit deja
    after = s[idx_fsel+len(old_fsel_era):idx_fsel+len(old_fsel_era)+20]
    if 'style' not in after:
        s = s.replace(old_fsel_era, new_fsel_era, 1)
        print('  > era filter colored')

old_fsel_rar = """className="fsel" value={filRarity}"""
if old_fsel_rar in s:
    idx_fr = s.find(old_fsel_rar)
    after_fr = s[idx_fr+len(old_fsel_rar):idx_fr+len(old_fsel_rar)+10]
    if 'style' not in after_fr:
        pass  # Il a deja un style inline apres
    # Le select rarete a deja un style, modifions-le
    old_rar_style = "style={{ maxWidth:'180px', color:filRarity==='all'?'#AAA':'#111' }}"
    new_rar_style = "style={{ maxWidth:'180px', color:filRarity==='all'?'#AAA':'#534AB7', background:filRarity!=='all'?'#EEEDFE':'', borderColor:filRarity!=='all'?'#CECBF6':'' }}"
    if old_rar_style in s:
        s = s.replace(old_rar_style, new_rar_style, 1)
        print('  > rarity filter colored')

f.write_text(s, 'utf-8')
print('OK')
