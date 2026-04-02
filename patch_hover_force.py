#!/usr/bin/env python3
"""Force le hover Lift & Shadow via CSS pur"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Ajouter le hover CSS juste apres la definition .pocket-shell base
# Chercher le .pocket-shell qui definit la transition
old_css = ".pocket-shell { position:relative;border-radius:12px;overflow:hidden;cursor:pointer;transition:transform .3s cubic-bezier(.22,.68,0,1.1),box-shadow .35s ease;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.04),0 1px 4px rgba(0,0,0,.02); }"
new_css = """.pocket-shell { position:relative;border-radius:12px;overflow:hidden;cursor:pointer;transition:transform .3s cubic-bezier(.22,.68,0,1.1),box-shadow .35s ease;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.04),0 1px 4px rgba(0,0,0,.02); }
        .pocket-shell:hover { transform:translateY(-8px) !important;box-shadow:0 20px 40px rgba(0,0,0,.10),0 8px 16px rgba(0,0,0,.04) !important; }"""

assert old_css in s, "CIBLE POCKET-SHELL CSS NON TROUVEE"
s = s.replace(old_css, new_css, 1)
print('  > hover CSS ajoute')

f.write_text(s, 'utf-8')
print('OK — hover Lift & Shadow via CSS')
