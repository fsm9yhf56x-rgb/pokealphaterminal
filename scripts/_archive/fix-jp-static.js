const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function main() {
  console.log('═══ Cleaning JP static data ═══\n')

  // 1. Load all JP cards
  let allCards = []
  let from = 0
  while (true) {
    const { data } = await supabase.from('tcg_cards').select('*').eq('lang', 'JP').range(from, from + 999)
    if (!data || data.length === 0) break
    allCards.push(...data)
    from += 1000
  }
  console.log(`Total JP cards in DB: ${allCards.length}`)

  // 2. Filter out ghost cards (name === local_id means not enriched)
  const real = allCards.filter(c => c.name && c.name !== c.local_id)
  const ghosts = allCards.length - real.length
  console.log(`Real cards: ${real.length}`)
  console.log(`Ghost cards removed: ${ghosts}`)

  // 3. Load sets
  const { data: sets } = await supabase.from('tcg_sets').select('*').eq('lang', 'JP').order('id')

  // 4. Group by set
  const cardsBySet = {}
  real.forEach(c => {
    const setId = (c.set_id || '').replace('jp-', '')
    if (!cardsBySet[setId]) cardsBySet[setId] = []
    cardsBySet[setId].push({
      lid: c.local_id || '',
      n: c.name || '',
      r: c.rarity || '',
      img: c.image_local || '',
    })
  })

  // 5. Sort cards within each set by lid
  Object.values(cardsBySet).forEach(cards => {
    cards.sort((a, b) => {
      const na = parseInt(a.lid) || 0
      const nb = parseInt(b.lid) || 0
      return na - nb
    })
  })

  // 6. Build sets JSON
  const setsJson = sets.map(s => {
    const setId = s.id.replace('jp-', '')
    return {
      id: setId,
      name: s.name,
      total: cardsBySet[setId]?.length || 0,
      releaseDate: s.release_date || null,
    }
  }).filter(s => s.total > 0)

  // 7. Write files
  fs.writeFileSync('public/data/sets-JP.json', JSON.stringify(setsJson))
  fs.writeFileSync('public/data/cards-JP.json', JSON.stringify(cardsBySet))

  const totalCards = Object.values(cardsBySet).reduce((a, b) => a + b.length, 0)
  console.log(`\nWritten: ${setsJson.length} sets, ${totalCards} cards`)
  console.log(`sets-JP.json: ${(fs.statSync('public/data/sets-JP.json').size/1024).toFixed(0)} KB`)
  console.log(`cards-JP.json: ${(fs.statSync('public/data/cards-JP.json').size/1024/1024).toFixed(2)} MB`)
  console.log('\n✅ Done')
}

main().catch(console.error)
