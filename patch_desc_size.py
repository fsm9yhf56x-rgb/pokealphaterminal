#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Binder grid — nom de carte
old = "const fsName=binderCols<=3?'14px':binderCols===4?'13px':binderCols===5?'12px':binderCols===6?'10px':'9px'"
new = "const fsName=binderCols<=3?'15px':binderCols===4?'14px':binderCols===5?'13px':binderCols===6?'12px':'11px'"
assert old in s
s = s.replace(old, new, 1)

# Binder grid — numero
s = s.replace(
    "fontSize:binderCols>=7?'8px':'10px', color:'#6E6E73', fontFamily:'var(--font-data)' }}>#{card.number}",
    "fontSize:binderCols>=7?'9px':'11px', color:'#6E6E73', fontFamily:'var(--font-data)' }}>#{card.number}"
)

# Binder grid — rarity
s = s.replace(
    "fontSize:binderCols>=7?'8px':'10px', color:'#6E6E73', fontFamily:'var(--font-display)', marginLeft:'2px'",
    "fontSize:binderCols>=7?'9px':'11px', color:'#6E6E73', fontFamily:'var(--font-display)', marginLeft:'2px'"
)

# Binder grid — flag emoji
s = s.replace(
    "fontSize:binderCols>=7?'9px':'11px' }}>{card.lang==='EN'?",
    "fontSize:binderCols>=7?'10px':'12px' }}>{card.lang==='EN'?"
)

# Shelf — nom carte 11px -> 13px
s = s.replace(
    "fontSize:'11px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.name}",
    "fontSize:'13px', fontWeight:700, color:'#1D1D1F', fontFamily:'var(--font-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.name}",
    1  # only first occurrence (shelf)
)

# Shelf — info line 9px -> 10px, 10px -> 11px
s = s.replace("fontSize:'9px', color:'#6E6E73', fontFamily:'var(--font-data)' }}>#{card.number}", "fontSize:'10px', color:'#6E6E73', fontFamily:'var(--font-data)' }}>#{card.number}", 1)
s = s.replace("fontSize:'9px', color:'#86868B' }}>{card.rarity}", "fontSize:'10px', color:'#86868B' }}>{card.rarity}", 1)
s = s.replace("fontSize:'10px' }}>{card.lang==='EN'?", "fontSize:'12px' }}>{card.lang==='EN'?", 1)

f.write_text(s, 'utf-8')
print('OK — descriptions plus lisibles')
