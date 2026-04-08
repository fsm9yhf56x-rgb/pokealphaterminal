const fs = require('fs')
const path = require('path')
const API = 'https://www.pokemonpricetracker.com/api/v2/sealed-products'
const KEY = 'pokeprice_free_bb247fce3372fe07c360232dbc639cddafa8d697c6b8ed51'
const OUT = path.join(__dirname, '..', 'public', 'data', 'sealed-products.json')
const delay = ms => new Promise(r => setTimeout(r, ms))

async function fetchPage(search, offset = 0) {
  const url = `${API}?search=${encodeURIComponent(search)}&limit=50&offset=${offset}`
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + KEY } })
  if (res.status === 429) { console.log('  Rate limited, waiting 65s...'); await delay(65000); const r2 = await fetch(url, { headers: { Authorization: 'Bearer ' + KEY } }); if (!r2.ok) return null; return r2.json() }
  if (!res.ok) return null
  return res.json()
}

async function main() {
  // Load existing data
  let existing = []
  try { existing = JSON.parse(fs.readFileSync(OUT, 'utf8')) } catch {}
  const all = new Map()
  existing.forEach(p => all.set(p.id, p))
  console.log(`Existing: ${all.size} products`)

  const searches = ['booster box', 'elite trainer box', 'booster pack', 'booster bundle', 'collection box', 'premium collection', 'ultra premium', 'tin', 'blister']

  for (const s of searches) {
    console.log(`\nFetching: ${s}`)
    let offset = 0
    while (true) {
      const result = await fetchPage(s, offset)
      if (!result || !result.data) { console.log('  Skipped (rate limit or error)'); break }
      result.data.forEach(i => {
        if (!all.has(i.tcgPlayerId)) all.set(i.tcgPlayerId, {
          id: i.tcgPlayerId, name: i.name, setName: i.setName || '',
          price: i.unopenedPrice || 0,
          img200: i.imageCdnUrl200 || '', img400: i.imageCdnUrl400 || '', img800: i.imageCdnUrl800 || '',
        })
      })
      console.log(`  +${result.data.length} → unique: ${all.size}`)
      if (!result.metadata?.hasMore) break
      offset += 50
      await delay(3000)
    }
    await delay(5000)
  }

  fs.writeFileSync(OUT, JSON.stringify([...all.values()]))
  console.log(`\nSaved ${all.size} products`)
}

main().catch(e => { console.error(e); process.exit(1) })
