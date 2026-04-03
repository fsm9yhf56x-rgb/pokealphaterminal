#!/usr/bin/env python3
"""Minimap — barres rouges aux positions reelles des cartes possedees"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Trouver le bloc minimap et remplacer la logique isOwned
old_minimap = """const bars = Math.min(total, 150)
                            return (
                              <div className="minimap" style={{ marginTop:'8px' }}
                                onMouseDown={e => mmDown(setName, total, e)}>
                                {/* Micro-rectangles */}
                                <div style={{ position:'absolute', inset:'3px', display:'flex', gap:'1px', borderRadius:'4px', overflow:'hidden' }}>
                                  {Array.from({ length: bars }).map((_, i) => {
                                    const isOwned = i < owned
                                    return (
                                      <div key={i} style={{ flex:1, minWidth:'2px', borderRadius:'1.5px', background:isOwned ? '#E03020' : '#E5E5EA', opacity:isOwned ? (0.45 + (i / Math.max(owned, 1)) * 0.55) : 0.5 }} />
                                    )
                                  })}
                                </div>"""

new_minimap = """const bars = Math.min(total, 150)
                            const ownedNumbers = new Set(setCards.map(c => parseInt(c.number) || 0))
                            return (
                              <div className="minimap" style={{ marginTop:'8px' }}
                                onMouseDown={e => mmDown(setName, total, e)}>
                                {/* Micro-rectangles */}
                                <div style={{ position:'absolute', inset:'3px', display:'flex', gap:'1px', borderRadius:'4px', overflow:'hidden' }}>
                                  {Array.from({ length: bars }).map((_, i) => {
                                    const cardNum = total <= 150 ? i + 1 : Math.round((i / bars) * total) + 1
                                    const isOwned = ownedNumbers.has(cardNum)
                                    return (
                                      <div key={i} style={{ flex:1, minWidth:'2px', borderRadius:'1.5px', background:isOwned ? '#E03020' : '#E5E5EA', opacity:isOwned ? 0.9 : 0.5 }} />
                                    )
                                  })}
                                </div>"""

assert old_minimap in s, "CIBLE MINIMAP"
s = s.replace(old_minimap, new_minimap, 1)

f.write_text(s, 'utf-8')
print('OK — minimap positions reelles')
