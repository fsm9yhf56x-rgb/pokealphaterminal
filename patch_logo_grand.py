#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Logo size + glow
s = s.replace("height:'64px', maxWidth:'300px', objectFit:'contain', position:'relative', filter:'drop-shadow(0 2px 8px rgba(0,0,0,.08))'", 
              "height:'96px', maxWidth:'400px', objectFit:'contain', position:'relative', filter:'drop-shadow(0 4px 16px rgba(0,0,0,.1))'")

# Glow bigger
s = s.replace("width:'200px', height:'200px', borderRadius:'50%', background:'radial-gradient(circle, rgba(224,48,32,.04) 0%, transparent 70%)'",
              "width:'340px', height:'180px', borderRadius:'50%', background:'radial-gradient(ellipse, rgba(224,48,32,.06) 0%, rgba(224,48,32,.02) 40%, transparent 70%)'")

# Lines longer
s = s.replace("height:'1px', width:'32px', background:'linear-gradient(to right, transparent, #D2D2D7)'",
              "height:'1px', width:'48px', background:'linear-gradient(to right, transparent, #C7C7CC)'")
s = s.replace("height:'1px', width:'32px', background:'linear-gradient(to left, transparent, #D2D2D7)'",
              "height:'1px', width:'48px', background:'linear-gradient(to left, transparent, #C7C7CC)'")

# Text bigger
s = s.replace("fontSize:'12px', color:'#86868B', fontFamily:'var(--font-display)', letterSpacing:'.03em'",
              "fontSize:'13px', color:'#6E6E73', fontFamily:'var(--font-display)', letterSpacing:'.04em', fontWeight:500")

# More padding
s = s.replace("marginTop:'4px', padding:'16px 0 12px'",
              "marginTop:'4px', padding:'20px 0 16px'")

f.write_text(s, 'utf-8')
print('OK — logo 96px + glow + lignes + texte')
