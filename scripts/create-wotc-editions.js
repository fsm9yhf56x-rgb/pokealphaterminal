const fs = require('fs')

const setsEN = JSON.parse(fs.readFileSync('public/data/sets-EN.json', 'utf8'))
const cardsEN = JSON.parse(fs.readFileSync('public/data/cards-EN.json', 'utf8'))
const setsFR = JSON.parse(fs.readFileSync('public/data/sets-FR.json', 'utf8'))
const cardsFR = JSON.parse(fs.readFileSync('public/data/cards-FR.json', 'utf8'))
const mapping = JSON.parse(fs.readFileSync('public/data/set-mapping-poketrace.json', 'utf8'))

// Sets with 1st Edition + Unlimited
const wotcSets = [
  { id: 'base2', enName: 'Jungle', frName: 'Jungle', ptSlug: 'jungle' },
  { id: 'base3', enName: 'Fossil', frName: 'Fossile', ptSlug: 'fossil' },
  { id: 'base5', enName: 'Team Rocket', frName: 'Team Rocket', ptSlug: 'team-rocket' },
  { id: 'gym1', enName: 'Gym Heroes', frName: 'Gym Heroes', ptSlug: 'gym-heroes' },
  { id: 'gym2', enName: 'Gym Challenge', frName: 'Gym Challenge', ptSlug: 'gym-challenge' },
  { id: 'neo1', enName: 'Neo Genesis', frName: 'Neo Genesis', ptSlug: 'neo-genesis' },
  { id: 'neo2', enName: 'Neo Discovery', frName: 'Neo Discovery', ptSlug: 'neo-discovery' },
  { id: 'neo3', enName: 'Neo Revelation', frName: 'Neo Revelation', ptSlug: 'neo-revelation' },
  { id: 'neo4', enName: 'Neo Destiny', frName: 'Neo Destiny', ptSlug: 'neo-destiny' },
]

let created = 0

wotcSets.forEach(ws => {
  const baseCardsEN = cardsEN[ws.id]
  const baseSetEN = setsEN.find(s => s.id === ws.id)
  if (!baseCardsEN || !baseSetEN) { console.log('SKIP: ' + ws.id + ' not found'); return }

  // Create EN editions
  const editions = [
    { suffix: '-1st', label: '(1st Edition)', edition: '1st Edition' },
    { suffix: '-unlimited', label: '(Unlimited)', edition: 'Unlimited' },
  ]

  editions.forEach(ed => {
    const newId = ws.id + ed.suffix
    if (setsEN.find(s => s.id === newId)) { console.log('  Already exists: ' + newId); return }

    setsEN.push({
      id: newId, name: ws.enName + ' ' + ed.label,
      logo: baseSetEN.logo, serie: baseSetEN.serie,
      releaseDate: baseSetEN.releaseDate, total: baseCardsEN.length,
    })
    cardsEN[newId] = baseCardsEN.map(c => ({ ...c, id: newId + '-' + c.lid }))
    mapping[newId] = ws.ptSlug
    console.log('  EN: ' + newId + ' → ' + ws.enName + ' ' + ed.label + ' (' + baseCardsEN.length + ' cards)')
    created++
  })

  // Create FR editions (if FR exists)
  const baseCardsFR = cardsFR[ws.id]
  const baseSetFR = setsFR.find(s => s.id === ws.id)
  if (baseCardsFR && baseSetFR) {
    editions.forEach(ed => {
      const newId = ws.id + ed.suffix
      if (setsFR.find(s => s.id === newId)) return
      const frLabel = ed.suffix === '-1st' ? '(1ère Édition)' : '(Unlimited)'
      setsFR.push({
        id: newId, name: ws.frName + ' ' + frLabel,
        logo: baseSetFR.logo, serie: baseSetFR.serie,
        releaseDate: baseSetFR.releaseDate, total: baseCardsFR.length,
      })
      cardsFR[newId] = baseCardsFR.map(c => ({ ...c, id: newId + '-' + c.lid }))
      console.log('  FR: ' + newId + ' → ' + ws.frName + ' ' + frLabel)
      created++
    })
  }
})

fs.writeFileSync('public/data/sets-EN.json', JSON.stringify(setsEN))
fs.writeFileSync('public/data/cards-EN.json', JSON.stringify(cardsEN))
fs.writeFileSync('public/data/sets-FR.json', JSON.stringify(setsFR))
fs.writeFileSync('public/data/cards-FR.json', JSON.stringify(cardsFR))
fs.writeFileSync('public/data/set-mapping-poketrace.json', JSON.stringify(mapping, null, 2))

console.log('\nCreated: ' + created + ' new sets')
console.log('EN sets: ' + setsEN.length + ' | FR sets: ' + setsFR.length)
