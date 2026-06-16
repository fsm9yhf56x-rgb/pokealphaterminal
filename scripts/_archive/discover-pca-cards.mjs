#!/usr/bin/env node
/**
 * For each PCA extension, fetch the full card list using authenticated session.
 * Output: /public/data/pca-cards.json
 */
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { readFileSync, writeFileSync } from 'fs'

puppeteerExtra.use(StealthPlugin())

const extensions = JSON.parse(readFileSync('public/data/pca-extensions.json', 'utf-8')).extensions
console.log(`Loaded ${extensions.length} PCA extensions to crawl\n`)

const browser = await puppeteerExtra.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})
const page = await browser.newPage()
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')

// Establish session by visiting /fr/rechercheCrt
console.log('Establishing session via /fr/rechercheCrt...')
await page.goto('https://pcagrade.com/fr/rechercheCrt', { waitUntil: 'networkidle2', timeout: 30000 })
await new Promise(r => setTimeout(r, 5000))
console.log('✅ Session ready\n')

const results = []
let processed = 0
const startTime = Date.now()

for (const ext of extensions) {
  processed++
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  process.stdout.write(`[${String(processed).padStart(3)}/${extensions.length}] ${(elapsed + 's').padStart(4)} ${ext.name.slice(0, 40).padEnd(42)} `)

  try {
    const cards = await page.evaluate(async (uuid) => {
      const res = await fetch(`/fr/carte/search?extensions=${uuid}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'text/html' },
      })
      if (!res.ok) return { error: `HTTP ${res.status}` }
      const html = await res.text()
      const tmp = document.createElement('div')
      tmp.innerHTML = html
      const carteDivs = Array.from(tmp.querySelectorAll('div.card.carte, div.carte'))
      const out = carteDivs.map(c => {
        const num = c.dataset?.num || c.getAttribute('data-num') || ''
        const name = c.querySelector('h5')?.textContent?.trim().replace(/\s+/g, ' ') || ''
        // Look for any UUID in the card div
        const id = c.id || ''
        const dataId = c.dataset?.id || c.dataset?.uuid || c.dataset?.cardUuid || ''
        // Check anchors with UUIDs
        const linkUuid = c.querySelector('a')?.getAttribute('href')?.match(/[0-9a-f-]{36}/)?.[0] || ''
        const onclickUuid = c.getAttribute('onclick')?.match(/[0-9a-f-]{36}/)?.[0] || ''
        const uuid = id.replace(/^card[_-]|^carte[_-]/, '') || dataId || linkUuid || onclickUuid
        return { num, name, uuid }
      }).filter(c => c.num || c.name)
      return out
    }, ext.uuid)

    if (cards.error) {
      console.log(`→ ERR ${cards.error}`)
      results.push({ ...ext, cards: [], error: cards.error })
    } else {
      console.log(`→ ${cards.length} cards`)
      results.push({ ...ext, cards })
    }
  } catch (e) {
    console.log(`→ ERR ${e.message.slice(0, 60)}`)
    results.push({ ...ext, cards: [], error: e.message.slice(0, 100) })
  }

  // Light pause to avoid hammering
  await new Promise(r => setTimeout(r, 300))
}

const totalCards = results.reduce((s, r) => s + (r.cards?.length || 0), 0)
const withCards = results.filter(r => r.cards?.length > 0).length
const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`✅ Total: ${results.length} extensions, ${totalCards} cards (in ${elapsed}s)`)
console.log(`   Extensions with cards: ${withCards}/${results.length}`)
console.log(`   Empty extensions:      ${results.length - withCards}`)

writeFileSync('public/data/pca-cards.json', JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: 'https://pcagrade.com/fr/carte/search',
  extensionCount: results.length,
  cardCount: totalCards,
  extensions: results,
}, null, 2))

console.log(`\n✅ Saved to public/data/pca-cards.json`)
console.log(`   File size: ${(JSON.stringify(results).length / 1024 / 1024).toFixed(1)} MB`)

await browser.close()
