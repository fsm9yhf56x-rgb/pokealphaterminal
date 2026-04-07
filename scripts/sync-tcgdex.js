const fs = require('fs')
const path = require('path')

const BASE = 'https://api.tcgdex.net/v2'
const LANGS = ['fr', 'en', 'ja']
const OUT = path.join(__dirname, '..', 'public', 'data')
const delay = ms => new Promise(r => setTimeout(r, ms))

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

async function syncLang(lang) {
  console.log(`\n[${lang.toUpperCase()}] Fetching sets...`)
  const sets = await fetchJSON(`${BASE}/${lang}/sets`)
  console.log(`  ${sets.length} sets found`)

  const setsMeta = []
  const allCards = {}

  for (let i = 0; i < sets.length; i++) {
    const s = sets[i]
    const sid = s.id
    process.stdout.write(`  [${i + 1}/${sets.length}] ${sid}...`)

    try {
      const detail = await fetchJSON(`${BASE}/${lang}/sets/${sid}`)
      setsMeta.push({
        id: detail.id,
        name: detail.name,
        logo: detail.logo ? detail.logo + '.png' : null,
        serie: detail.serie ? detail.serie.name : null,
        releaseDate: detail.releaseDate || null,
        total: detail.cards ? detail.cards.length : 0,
      })

      allCards[sid] = (detail.cards || []).map(c => ({
        id: c.id,
        lid: c.localId,
        n: c.name,
        img: c.image ? c.image + '/high.webp' : null,
        r: c.rarity || null,
      }))

      console.log(` ${allCards[sid].length} cards`)
      if (i % 10 === 9) await delay(300)
    } catch (e) {
      console.log(` SKIP: ${e.message}`)
    }
  }

  const langKey = lang === 'ja' ? 'JP' : lang.toUpperCase()
  fs.writeFileSync(path.join(OUT, `sets-${langKey}.json`), JSON.stringify(setsMeta))
  fs.writeFileSync(path.join(OUT, `cards-${langKey}.json`), JSON.stringify(allCards))
  const totalCards = Object.values(allCards).reduce((a, c) => a + c.length, 0)
  console.log(`[${langKey}] Done: ${setsMeta.length} sets, ${totalCards} cards`)
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  console.log('TCGDex Sync - ' + new Date().toISOString())

  for (const lang of LANGS) {
    await syncLang(lang)
    await delay(1000)
  }

  fs.writeFileSync(path.join(OUT, 'sync-meta.json'), JSON.stringify({
    lastSync: new Date().toISOString(),
    langs: ['FR', 'EN', 'JP'],
  }))

  console.log('\nDone! Files in public/data/')
}

main().catch(e => { console.error(e); process.exit(1) })
