#!/usr/bin/env python3
"""Ajoute rarity aux ghost cards + backfill pour cartes existantes"""
from pathlib import Path

f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# 1. GridItem — ajouter rarity au type ghost
old_type = "type GridItem = { type:'owned'; card:CardItem } | { type:'ghost'; name:string; number:string; image:string }"
new_type = "type GridItem = { type:'owned'; card:CardItem } | { type:'ghost'; name:string; number:string; image:string; rarity:string }"
assert old_type in s, "CIBLE TYPE"
s = s.replace(old_type, new_type, 1)
print('  > GridItem rarity')

# 2. Grid buildGridItems — passer rarity
old_grid_ghost = "return { type:'ghost' as const, name:fc.name, number:fc.localId||'', image:fc.image||'' }\n    })"
new_grid_ghost = "return { type:'ghost' as const, name:fc.name, number:fc.localId||'', image:fc.image||'', rarity:fc.rarity||'' }\n    })"
assert old_grid_ghost in s, "CIBLE GRID GHOST BUILD"
s = s.replace(old_grid_ghost, new_grid_ghost, 1)
print('  > grid ghost rarity')

# 3. Shelf buildItems — passer rarity
old_shelf_ghost = "return { type:'ghost' as const, name:fc.name, number:fc.localId||'', image:fc.image||'' }"
new_shelf_ghost = "return { type:'ghost' as const, name:fc.name, number:fc.localId||'', image:fc.image||'', rarity:fc.rarity||'' }"
assert old_shelf_ghost in s, "CIBLE SHELF GHOST BUILD"
s = s.replace(old_shelf_ghost, new_shelf_ghost, 1)
print('  > shelf ghost rarity')

# 4. Shelf ghost render — afficher rarity
old_shelf_render = """<div style={{ fontSize:'10px', color:'#C7C7CC', fontFamily:'var(--font-data)', marginTop:'2px' }}>#{gi.number}</div>
                                    </div>
                                  </div>
                                )
                              }
                              const card=item.card"""
new_shelf_render = """<div style={{ display:'flex', alignItems:'center', gap:'3px', marginTop:'2px' }}>
                                        <span style={{ fontSize:'10px', color:'#C7C7CC', fontFamily:'var(--font-data)' }}>#{gi.number}</span>
                                        {gi.rarity&&<span style={{ fontSize:'9px', color:'#D2D2D7' }}>{gi.rarity}</span>}
                                      </div>
                                    </div>
                                  </div>
                                )
                              }
                              const card=item.card"""
assert old_shelf_render in s, "CIBLE SHELF GHOST RENDER"
s = s.replace(old_shelf_render, new_shelf_render, 1)
print('  > shelf ghost rarity render')

# 5. Grid ghost render — afficher rarity
old_grid_render = """<div style={{ fontSize:'10px',color:'#C7C7CC',fontFamily:'var(--font-data)',marginTop:'2px' }}>#{gi.number}</div>
                            </div>
                          </div>
                        )
                      }
                      const card=item.card"""
new_grid_render = """<div style={{ display:'flex',alignItems:'center',gap:'3px',marginTop:'2px' }}>
                                <span style={{ fontSize:'10px',color:'#C7C7CC',fontFamily:'var(--font-data)' }}>#{gi.number}</span>
                                {gi.rarity&&<span style={{ fontSize:'9px',color:'#D2D2D7' }}>{gi.rarity}</span>}
                              </div>
                            </div>
                          </div>
                        )
                      }
                      const card=item.card"""
assert old_grid_render in s, "CIBLE GRID GHOST RENDER"
s = s.replace(old_grid_render, new_grid_render, 1)
print('  > grid ghost rarity render')

# 6. Backfill rarity pour cartes existantes sans rarity
# Ajouter un effect qui met a jour les cartes sans rarity depuis shelfSetCards
old_welcome = "  // -- Fetch set logos via TCGDex API --"
new_welcome = """  // -- Backfill missing rarity from TCGDex --
  useEffect(() => {
    const needsFix = portfolio.filter(c => !c.rarity && c.number && c.number !== '???')
    if (needsFix.length === 0) return
    const setsToCheck = [...new Set(needsFix.map(c => c.set))]
    setsToCheck.forEach(setName => {
      const tcgCards = shelfSetCards[setName]
      if (!tcgCards || tcgCards.length === 0) return
      setPortfolio(prev => prev.map(c => {
        if (c.rarity || c.set !== setName) return c
        const match = tcgCards.find(tc => tc.localId === c.number)
        if (match?.rarity) return { ...c, rarity: match.rarity }
        return c
      }))
    })
  }, [shelfSetCards])

  // -- Fetch set logos via TCGDex API --"""
assert old_welcome in s, "CIBLE WELCOME"
s = s.replace(old_welcome, new_welcome, 1)
print('  > backfill rarity')

f.write_text(s, 'utf-8')
print('OK')
