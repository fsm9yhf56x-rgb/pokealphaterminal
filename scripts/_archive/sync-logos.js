const fs = require('fs')
const path = require('path')
const BASE = 'https://api.tcgdex.net/v2'
const OUT = path.join(__dirname, '..', 'public', 'data')
const delay = ms => new Promise(r => setTimeout(r, ms))

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

async function main() {
  console.log('Fetching set details for logos...')
  const sets = await fetchJSON(`${BASE}/en/sets`)
  console.log(`${sets.length} sets to process`)
  
  const logoMap = {} // { setId: { logo, serie } }
  
  for (let i = 0; i < sets.length; i += 8) {
    const batch = sets.slice(i, i + 8)
    const results = await Promise.allSettled(
      batch.map(s => fetchJSON(`${BASE}/en/sets/${s.id}`))
    )
    results.forEach((r, j) => {
      const sid = batch[j].id
      if (r.status === 'fulfilled' && r.value) {
        logoMap[sid] = {
          logo: r.value.logo ? r.value.logo + '/low.webp' : null,
          serie: r.value.serie?.name || null
        }
      }
    })
    process.stdout.write(`  ${Math.min(i+8, sets.length)}/${sets.length}\r`)
    if (i + 8 < sets.length) await delay(250)
  }

  // Enrich all 3 language set files
  for (const lang of ['EN','FR','JP']) {
    const fp = path.join(OUT, `sets-${lang}.json`)
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'))
    let enriched = 0
    data.forEach(s => {
      if (logoMap[s.id]) {
        s.logo = logoMap[s.id].logo
        s.serie = logoMap[s.id].serie || s.serie
        enriched++
      }
    })
    fs.writeFileSync(fp, JSON.stringify(data))
    console.log(`\n${lang}: ${enriched}/${data.length} sets enriched`)
  }
  console.log('\nDone!')
}
main().catch(e => { console.error(e); process.exit(1) })
