#!/usr/bin/env node
/**
 * Discover all PCA extensions (Pokemon sets) and save them to /public/data/pca-extensions.json
 * Each extension has its UUID + name + cardCount + symbol filename (used for setId mapping).
 */
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { writeFileSync, mkdirSync, existsSync } from 'fs'

puppeteerExtra.use(StealthPlugin())

const browser = await puppeteerExtra.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})
const page = await browser.newPage()
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')

console.log('━━━ Loading /fr/rechercheCrt ━━━')
await page.goto('https://pcagrade.com/fr/rechercheCrt', { waitUntil: 'networkidle2', timeout: 30000 })
await new Promise(r => setTimeout(r, 5000))

const extensions = await page.evaluate(() => {
  const lis = Array.from(document.querySelectorAll('li.li-extension'))
  return lis.map(li => {
    const text = (li.textContent || '').trim().replace(/\s+/g, ' ')
    const id = li.id || ''
    // Extract UUID from id like "pokemon_01996c7d-8766-9109-dae0-4953938f3319"
    const uuid = id.replace(/^pokemon_/, '')
    // Parse "<Name> | <Count>"
    const match = text.match(/^(.+?)\s*(?:\|\s*(\d+))?\s*$/)
    const name = match ? match[1].trim() : text
    const cardCount = match && match[2] ? parseInt(match[2]) : null
    // Extract symbol from background-image
    const style = li.getAttribute('style') || ''
    const symMatch = style.match(/url\(['"]?[^'"]*?\/([^'"\/\)]+)\.png['"]?\)/)
    const symbol = symMatch ? symMatch[1] : null
    return { uuid, name, cardCount, symbol }
  }).filter(e => e.uuid && e.name && !e.uuid.startsWith('pokemon_'))
})

console.log(`Found ${extensions.length} PCA Pokemon extensions`)

// Stats
const withCounts = extensions.filter(e => e.cardCount !== null)
const totalCards = withCounts.reduce((s, e) => s + (e.cardCount || 0), 0)
console.log(`  ${withCounts.length} with explicit card counts (total ${totalCards} cards)`)

// Save
mkdirSync('public/data', { recursive: true })
const outPath = 'public/data/pca-extensions.json'
writeFileSync(outPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: 'https://pcagrade.com/fr/rechercheCrt',
  count: extensions.length,
  extensions,
}, null, 2))
console.log(`✅ Saved to ${outPath}`)

// Sample first 10
console.log('\nFirst 10 entries:')
for (const e of extensions.slice(0, 10)) {
  console.log(`  [${(e.symbol || '?').padEnd(10)}] ${e.uuid} | ${e.name} (${e.cardCount || '?'} cards)`)
}

await browser.close()
