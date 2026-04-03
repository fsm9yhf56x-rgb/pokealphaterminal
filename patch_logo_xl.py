#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Logo 96 -> 140px
s = s.replace("height:'96px', maxWidth:'400px'", "height:'140px', maxWidth:'480px'")

# Shadow plus forte
s = s.replace("filter:'drop-shadow(0 4px 16px rgba(0,0,0,.1))'", "filter:'drop-shadow(0 6px 24px rgba(0,0,0,.12)) drop-shadow(0 2px 6px rgba(0,0,0,.06))'")

# Glow encore plus large + double layer
s = s.replace(
    "width:'340px', height:'180px', borderRadius:'50%', background:'radial-gradient(ellipse, rgba(224,48,32,.06) 0%, rgba(224,48,32,.02) 40%, transparent 70%)'",
    "width:'500px', height:'250px', borderRadius:'50%', background:'radial-gradient(ellipse, rgba(224,48,32,.07) 0%, rgba(255,107,53,.03) 35%, transparent 65%)'")

# Lignes 48 -> 64px + dot central
s = s.replace("height:'1px', width:'48px', background:'linear-gradient(to right, transparent, #C7C7CC)'",
              "height:'1px', width:'64px', background:'linear-gradient(to right, transparent, #AEAEB2)'")
s = s.replace("height:'1px', width:'48px', background:'linear-gradient(to left, transparent, #C7C7CC)'",
              "height:'1px', width:'64px', background:'linear-gradient(to left, transparent, #AEAEB2)'")

# Texte + grand
s = s.replace("fontSize:'13px', color:'#6E6E73', fontFamily:'var(--font-display)', letterSpacing:'.04em', fontWeight:500",
              "fontSize:'14px', color:'#6E6E73', fontFamily:'var(--font-display)', letterSpacing:'.05em', fontWeight:500")

# Plus de padding
s = s.replace("marginTop:'4px', padding:'20px 0 16px'",
              "marginTop:'0', padding:'28px 0 20px'")

# gap entre logo et texte
s = s.replace("gap:'8px', marginTop:'8px'", "gap:'8px', marginTop:'12px'")

f.write_text(s, 'utf-8')
print('OK — logo 140px')
