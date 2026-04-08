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

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try { return await fetchJSON(url) }
    catch (e) { if (i === retries - 1) throw e; await delay(500 * (i + 1)) }
  }
}

async function batchFetch(urls, concurrency = 5) {
  const results = []
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(batch.map(u => fetchWithRetry(u)))
    results.push(...batchResults)
    if (i + concurrency < urls.length) await delay(200)
  }
  return results
}

async function syncLang(lang) {
  console.log(`\n[${lang.toUpperCase()}] Fetching sets...`)
  const sets = await fetchJSON(`${BASE}/${lang}/sets`)
  console.log(`  ${sets.length} sets found`)

  const setsMeta = []
  const allCards = {}
  let totalCards = 0

  for (let si = 0; si < sets.length; si++) {
    const sid = sets[si].id
    process.stdout.write(`  [${si + 1}/${sets.length}] ${sid}...`)

    try {
      const detail = await fetchWithRetry(`${BASE}/${lang}/sets/${sid}`)
      setsMeta.push({
        id: detail.id,
        name: detail.name,
        logo: detail.logo ? detail.logo + '.png' : null,
        serie: detail.serie ? detail.serie.name : null,
        releaseDate: detail.releaseDate || null,
        total: detail.cards ? detail.cards.length : 0,
      })

      const cards = detail.cards || []
      if (cards.length === 0) { console.log(' 0 cards'); continue }

      // Fetch individual card details for rarity (batch of 5)
      const cardUrls = cards.map(c => `${BASE}/${lang}/cards/${sid}-${c.localId}`)
      const cardResults = await batchFetch(cardUrls, 5)

      allCards[sid] = cards.map((c, i) => {
        const r = cardResults[i]
        const det = r.status === 'fulfilled' ? r.value : null
        return {
          id: c.id,
          lid: c.localId,
          n: c.name,
          img: c.image ? c.image + '/high.webp' : null,
          r: det ? det.rarity || null : null,
        }
      })

      totalCards += allCards[sid].length
      const withRarity = allCards[sid].filter(c => c.r).length
      console.log(` ${allCards[sid].length} cards (${withRarity} with rarity)`)
    } catch (e) {
      console.log(` SKIP: ${e.message}`)
    }
  }

  const langKey = lang === 'ja' ? 'JP' : lang.toUpperCase()
  fs.writeFileSync(path.join(OUT, `sets-${langKey}.json`), JSON.stringify(setsMeta))
  fs.writeFileSync(path.join(OUT, `cards-${langKey}.json`), JSON.stringify(allCards))
  console.log(`[${langKey}] Done: ${setsMeta.length} sets, ${totalCards} cards`)
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  console.log('TCGDex Sync (with rarity) - ' + new Date().toISOString())

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
