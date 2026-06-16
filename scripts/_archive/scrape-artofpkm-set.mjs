#!/usr/bin/env node
/**
 * Scrape one artofpkm set page → extract all cards with localId + name + image URL.
 * Usage: node scrape-artofpkm-set.mjs <artofpkm_set_id>
 * Example: node scrape-artofpkm-set.mjs 6  (PMCG Base Set)
 */
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteerExtra.use(StealthPlugin())

const setId = process.argv[2]
if (!setId) {
  console.error('Usage: node scrape-artofpkm-set.mjs <artofpkm_set_id>')
  process.exit(1)
}

const browser = await puppeteerExtra.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

const url = `https://www.artofpkm.com/sets/${setId}`
console.log(`Scraping ${url}`)

await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise(r => setTimeout(r, 3000))
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await new Promise(r => setTimeout(r, 3000))

const data = await page.evaluate(() => {
  const setName = document.querySelector('h1')?.textContent?.trim() || ''
  const cards = []
  const links = Array.from(document.querySelectorAll('a[data-lightbox-url^="/sets/"]'))
  for (const link of links) {
    const lightboxUrl = link.getAttribute('data-lightbox-url') || ''
    const m = lightboxUrl.match(/\/sets\/\d+\/card\/(.+)$/)
    if (!m) continue
    const localId = m[1]
    
    const title = link.getAttribute('data-lightbox-title') || link.getAttribute('aria-label') || ''
    // Title format: "Bulbasaur, Base Set" → extract Pokemon name
    const name = title.replace(/^Open\s+/, '').split(',')[0].trim()
    
    const imgUrl = link.getAttribute('href') || ''
    const fullImgUrl = imgUrl.startsWith('http') ? imgUrl : `https://www.artofpkm.com${imgUrl}`
    
    cards.push({ localId, name, image: fullImgUrl })
  }
  return { setName, cards }
})

console.log(`\n━━━ Set: ${data.setName} ━━━`)
console.log(`Found ${data.cards.length} cards\n`)
console.log('First 5:')
for (const c of data.cards.slice(0, 5)) {
  console.log(`  [${c.localId.padEnd(5)}] ${c.name.padEnd(25)} → ${c.image.slice(-40)}`)
}
console.log('Last 3:')
for (const c of data.cards.slice(-3)) {
  console.log(`  [${c.localId.padEnd(5)}] ${c.name.padEnd(25)} → ${c.image.slice(-40)}`)
}

// Output JSON to stdout
console.log('\n━━━ JSON output ━━━')
console.log(JSON.stringify({
  artofpkm_set_id: setId,
  set_name: data.setName,
  cards_count: data.cards.length,
  cards: data.cards,
}, null, 2).slice(0, 800))

await browser.close()
