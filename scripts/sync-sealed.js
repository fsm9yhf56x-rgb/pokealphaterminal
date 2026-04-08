const fs = require('fs')
const path = require('path')
const API = 'https://www.pokemonpricetracker.com/api/v2/sealed-products'
const KEY = 'pokeprice_free_bb247fce3372fe07c360232dbc639cddafa8d697c6b8ed51'
const OUT_JSON = path.join(__dirname, '..', 'public', 'data', 'sealed-products.json')
const OUT_IMG = path.join(__dirname, '..', 'public', 'img', 'sealed')
const delay = ms => new Promise(r => setTimeout(r, ms))

async function fetchPage(search, offset) {
  const url = `${API}?search=${encodeURIComponent(search)}&limit=50&offset=${offset}`
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + KEY } })
  if (res.status === 429) return null
  if (!res.ok) return null
  return res.json()
}

async function fetchAll(search) {
  const items = []
  let offset = 0
  while (true) {
    const result = await fetchPage(search, offset)
    if (!result || !result.data || result.data.length === 0) break
    items.push(...result.data)
    process.stdout.write(`  ${search}: ${items.length}/${result.metadata?.total||'?'}\n`)
    if (!result.metadata?.hasMore) break
    offset += 50
    await delay(4000)
  }
  return items
}

async function downloadImg(url, id) {
  const out = path.join(OUT_IMG, id + '.jpg')
  if (fs.existsSync(out) && fs.statSync(out).size > 1000) return true
  try {
    const res = await fetch(url)
    if (!res.ok) return false
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 1000) return false
    fs.writeFileSync(out, buf)
    return true
  } catch { return false }
}

async function main() {
  if (!fs.existsSync(OUT_IMG)) fs.mkdirSync(OUT_IMG, { recursive: true })
  const all = new Map()
  const searches = ['booster box','elite trainer box','booster pack','booster bundle','collection box','premium collection','ultra premium','tin','blister','booster display']
  for (const s of searches) {
    console.log(`\nFetching: ${s}`)
    const items = await fetchAll(s)
    if (items.length === 0) { console.log('  Rate limited, stopping searches'); break }
    items.forEach(i => { if (!all.has(i.tcgPlayerId)) all.set(i.tcgPlayerId, i) })
    console.log(`  Unique total: ${all.size}`)
    await delay(5000)
  }
  if (all.size === 0) { console.log('No data fetched'); return }
  console.log(`\nDownloading ${all.size} images...`)
  let ok = 0, fail = 0
  const products = []
  for (const [id, p] of all) {
    const imgUrl = p.imageCdnUrl400 || p.imageCdnUrl || ''
    const success = imgUrl ? await downloadImg(imgUrl, id) : false
    products.push({
      id, name: p.name, set: p.setName || '', type: guessType(p.name),
      price: p.unopenedPrice || 0,
      img: success ? `/img/sealed/${id}.jpg` : imgUrl
    })
    if (success) ok++; else fail++
    if ((ok + fail) % 50 === 0) { console.log(`  ${ok+fail}/${all.size} (${ok} ok, ${fail} fail)`); await delay(200) }
  }
  fs.writeFileSync(OUT_JSON, JSON.stringify(products))
  console.log(`\nDone: ${products.length} products, ${ok} images local, ${fail} CDN fallback`)
}

function guessType(name) {
  const n = name.toLowerCase()
  if (n.includes('elite trainer') || n.includes('etb')) return 'etb'
  if (n.includes('booster box') || n.includes('display')) return 'display'
  if (n.includes('booster pack') || n.includes('sleeved')) return 'booster'
  if (n.includes('bundle')) return 'bundle'
  if (n.includes('tin')) return 'bundle'
  if (n.includes('collection') || n.includes('premium') || n.includes('ultra')) return 'bundle'
  if (n.includes('blister')) return 'booster'
  return 'bundle'
}

main().catch(e => { console.error(e); process.exit(1) })
