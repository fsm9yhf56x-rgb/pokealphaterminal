#!/usr/bin/env node
/**
 * Step 1: Scrape /cards page to extract all artofpkm set IDs + names + eras
 * Output: scripts/data/artofpkm-sets.json
 */
import { writeFileSync, mkdirSync } from 'fs'
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteerExtra.use(StealthPlugin())

const browser = await puppeteerExtra.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')

console.log('━━━ Discovering all artofpkm sets ━━━')
await page.goto('https://www.artofpkm.com/cards', { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise(r => setTimeout(r, 3000))

// Extract era → sets mapping
const data = await page.evaluate(() => {
  const sets = []
  const eraHeaders = Array.from(document.querySelectorAll('h2'))
  
  for (const h2 of eraHeaders) {
    const era = h2.textContent?.trim() || ''
    if (!era || era === 'Eras') continue
    
    // Find all set cards/links after this h2 until next h2
    let el = h2.nextElementSibling
    while (el && el.tagName !== 'H2') {
      const links = el.querySelectorAll('a[href*="/sets/"]')
      for (const link of links) {
        const href = link.getAttribute('href')
        const m = href?.match(/\/sets\/(\d+)/)
        if (!m) continue
        const id = m[1]
        // Avoid duplicates
        if (sets.find(s => s.id === id)) continue
        const name = link.querySelector('h4')?.textContent?.trim() || link.textContent?.trim() || ''
        sets.push({ id, name, era, url: href.startsWith('http') ? href : `https://www.artofpkm.com${href}` })
      }
      el = el.nextElementSibling
    }
  }
  return sets
})

console.log(`Found ${data.length} sets across all eras\n`)

// Group by era for log
const byEra = {}
for (const s of data) {
  byEra[s.era] = (byEra[s.era] || 0) + 1
}
for (const [era, count] of Object.entries(byEra)) {
  console.log(`  ${era.padEnd(25)}: ${count} sets`)
}

mkdirSync('scripts/data', { recursive: true })
writeFileSync('scripts/data/artofpkm-sets.json', JSON.stringify(data, null, 2))
console.log(`\n✅ Saved ${data.length} sets → scripts/data/artofpkm-sets.json`)

await browser.close()
