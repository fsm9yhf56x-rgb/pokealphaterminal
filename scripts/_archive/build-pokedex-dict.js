const fs = require('fs')
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchJSON(url) {
  try { const r = await fetch(url); if (!r.ok) return null; return r.json() } catch { return null }
}

async function main() {
  console.log('═══ Building Pokédex JP→EN+FR dictionary ═══\n')

  const all = await fetchJSON('https://pokeapi.co/api/v2/pokemon-species?limit=1500')
  const dict = {} // { jpName: { en: "...", fr: "..." } }
  let count = 0

  for (const species of all.results) {
    const data = await fetchJSON(species.url)
    if (!data?.names) continue

    const jpNames = data.names.filter(n => n.language.name === 'ja' || n.language.name === 'ja-Hrkt')
    const enName = data.names.find(n => n.language.name === 'en')?.name
    const frName = data.names.find(n => n.language.name === 'fr')?.name

    if (enName) {
      jpNames.forEach(n => {
        if (n.name) dict[n.name] = { en: enName, fr: frName || enName }
      })
    }

    count++
    if (count % 100 === 0) process.stdout.write(`  ${count}/${all.results.length}\r`)
    await sleep(25)
  }

  console.log(`\n${Object.keys(dict).length} entries`)

  fs.writeFileSync('public/data/pokedex-jp-en.json', JSON.stringify(dict))
  const size = (fs.statSync('public/data/pokedex-jp-en.json').size / 1024).toFixed(0)
  console.log(`pokedex-jp-en.json: ${size} KB`)

  // Sanity
  const checks = ['リザードン','ピカチュウ','フシギダネ','ミュウツー','ブラッキー','ゲンガー']
  checks.forEach(jp => {
    const v = dict[jp]
    console.log(`  ${jp} → EN: ${v?.en || '?'} | FR: ${v?.fr || '?'}`)
  })

  console.log('\n✅ Done')
}

main().catch(console.error)
