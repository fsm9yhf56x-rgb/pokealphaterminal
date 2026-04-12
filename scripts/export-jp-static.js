const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function main() {
  console.log('═══ Exporting JP data to static JSON ═══\n')

  // 1. Load all JP sets
  const { data: sets } = await supabase.from('tcg_sets').select('*').eq('lang', 'JP').order('id')
  console.log(`${sets.length} JP sets`)

  // 2. Load all JP cards
  let allCards = []
  let from = 0
  while (true) {
    const { data } = await supabase.from('tcg_cards').select('*').eq('lang', 'JP').range(from, from + 999)
    if (!data || data.length === 0) break
    allCards.push(...data)
    from += 1000
  }
  console.log(`${allCards.length} JP cards loaded`)

  // 3. Group cards by set
  const cardsBySet = {}
  allCards.forEach(c => {
    const setId = (c.set_id || '').replace('jp-', '')
    if (!cardsBySet[setId]) cardsBySet[setId] = []
    cardsBySet[setId].push({
      lid: c.local_id || '',
      n: c.name || '',
      r: c.rarity || '',
      img: c.image_local || '',
    })
  })

  // 4. Build sets JSON (same format as EN/FR)
  const setsJson = sets.map(s => ({
    id: s.id.replace('jp-', ''),
    name: s.name,
    total: s.total_cards || cardsBySet[s.id.replace('jp-', '')]?.length || 0,
    releaseDate: s.release_date || null,
  }))

  // 5. Write files
  const outDir = path.join('public', 'data', 'jp')
  fs.mkdirSync(outDir, { recursive: true })

  fs.writeFileSync(path.join(outDir, 'sets.json'), JSON.stringify(setsJson))
  console.log(`Written sets.json (${setsJson.length} sets)`)

  fs.writeFileSync(path.join(outDir, 'cards.json'), JSON.stringify(cardsBySet))
  console.log(`Written cards.json (${Object.keys(cardsBySet).length} sets, ${allCards.length} cards)`)

  // Stats
  const fileSize = (f) => (fs.statSync(f).size / 1024 / 1024).toFixed(2) + ' MB'
  console.log(`\nFile sizes:`)
  console.log(`  sets.json: ${fileSize(path.join(outDir, 'sets.json'))}`)
  console.log(`  cards.json: ${fileSize(path.join(outDir, 'cards.json'))}`)

  console.log('\n✅ Done — JP static data ready')
}

main().catch(console.error)
