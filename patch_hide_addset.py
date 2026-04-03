#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Trouver la ligne exacte du bouton
idx = s.find("setAddSetOpen(true)")
assert idx > 0, "CIBLE BTN"

# Trouver le <button avant
btn_start = s.rfind("<button", 0, idx)
# Trouver le </button> apres
btn_end = s.find("</button>", idx) + len("</button>")

# Wrapper dans un conditionnel
old_btn = s[btn_start:btn_end]
new_btn = "{(!binderSet||binderSet==='__all__')&&" + old_btn + "}"
s = s[:btn_start] + new_btn + s[btn_end:]

f.write_text(s, 'utf-8')
print('OK — bouton cache dans un set specifique')
