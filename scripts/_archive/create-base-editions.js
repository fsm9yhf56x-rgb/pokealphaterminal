const fs = require('fs')

// Load current data
const setsEN = JSON.parse(fs.readFileSync('public/data/sets-EN.json', 'utf8'))
const cardsEN = JSON.parse(fs.readFileSync('public/data/cards-EN.json', 'utf8'))

const baseCards = cardsEN['base1']
if (!baseCards) { console.log('ERROR: base1 not found'); process.exit(1) }

console.log('Base Set cards:', baseCards.length)

// 1. Rename current base1 → base1-unlimited (what TCGDex has = unlimited)
const baseSet = setsEN.find(s => s.id === 'base1')
if (!baseSet) { console.log('ERROR: base1 set not found'); process.exit(1) }

// Create 3 editions
const editions = [
  {
    id: 'base1-unlimited',
    name: 'Base Set (Unlimited)',
    edition: 'Unlimited',
    ptSlug: 'base-set',
  },
  {
    id: 'base1-1st',
    name: 'Base Set (1st Edition)',
    edition: '1st Edition',
    ptSlug: 'base-set', // PokeTrace doesn't have separate 1st ed slug
  },
  {
    id: 'base1-shadowless',
    name: 'Base Set (1st Ed. Shadowless)',
    edition: '1st Edition Shadowless',
    ptSlug: 'base-set-shadowless',
  },
]

// Add new sets
editions.forEach(ed => {
  // Check if already exists
  if (setsEN.find(s => s.id === ed.id)) {
    console.log('  Already exists:', ed.id)
    return
  }
  setsEN.push({
    id: ed.id,
    name: ed.name,
    logo: baseSet.logo,
    serie: baseSet.serie,
    releaseDate: baseSet.releaseDate,
    total: baseCards.length,
  })
  console.log('  Created set:', ed.id, '→', ed.name)

  // Copy cards — same data, different setId, tag with edition
  cardsEN[ed.id] = baseCards.map(c => ({
    ...c,
    id: ed.id + '-' + c.lid,
    // For now: use same images (we'll replace with correct edition images later)
    // The unlimited images are what TCGDex has
    // Shadowless: our current base1 Supabase images
    img: c.img, 
  }))
  console.log('    Cards:', cardsEN[ed.id].length)
})

// Keep original base1 as-is (for backward compatibility with existing portfolios)
// But mark it as deprecated in favor of the 3 editions

// Update mapping
const mapping = JSON.parse(fs.readFileSync('public/data/set-mapping-poketrace.json', 'utf8'))
editions.forEach(ed => {
  mapping[ed.id] = ed.ptSlug
})
fs.writeFileSync('public/data/set-mapping-poketrace.json', JSON.stringify(mapping, null, 2))
console.log('\nMapping updated')

// Save
fs.writeFileSync('public/data/sets-EN.json', JSON.stringify(setsEN))
fs.writeFileSync('public/data/cards-EN.json', JSON.stringify(cardsEN))

console.log('\nDone!')
console.log('Sets EN:', setsEN.length)
console.log('Total cards-EN keys:', Object.keys(cardsEN).length)

// Also do FR
const setsFR = JSON.parse(fs.readFileSync('public/data/sets-FR.json', 'utf8'))
const cardsFR = JSON.parse(fs.readFileSync('public/data/cards-FR.json', 'utf8'))
const baseFR = cardsFR['base1']
const baseSetFR = setsFR.find(s => s.id === 'base1')

if (baseFR && baseSetFR) {
  const frEditions = [
    { id: 'base1-unlimited', name: 'Set de Base (Unlimited)' },
    { id: 'base1-1st', name: 'Set de Base (1ère Édition)' },
  ]
  // FR n'a pas de Shadowless
  frEditions.forEach(ed => {
    if (setsFR.find(s => s.id === ed.id)) return
    setsFR.push({
      id: ed.id,
      name: ed.name,
      logo: baseSetFR.logo,
      serie: baseSetFR.serie,
      releaseDate: baseSetFR.releaseDate,
      total: baseFR.length,
    })
    cardsFR[ed.id] = baseFR.map(c => ({ ...c, id: ed.id + '-' + c.lid }))
    console.log('FR created:', ed.id)
  })
  fs.writeFileSync('public/data/sets-FR.json', JSON.stringify(setsFR))
  fs.writeFileSync('public/data/cards-FR.json', JSON.stringify(cardsFR))
  console.log('FR updated')
}
