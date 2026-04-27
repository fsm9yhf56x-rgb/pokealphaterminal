#!/usr/bin/env node
/**
 * Scrape all artofpkm sets (413 sets) → save to scripts/data/artofpkm-cards.json
 * Resumable: skips sets already in the output file.
 * 
 * Output structure:
 * {
 *   "6": {
 *     setName: "Base Set",
 *     era: "PMCG",
 *     scrapedAt: "2026-04-27T...",
 *     cards: [
 *       { localId: "1", name: "Bulbasaur", image: "https://www.artofpkm.com/rails/.../bulbasaur1.png" },
 *       ...
 *     ]
 *   }
 * }
 */
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { readFileSync, writeFileSync, existsSync } from 'fs'

puppeteerExtra.use(StealthPlugin())

const SETS_FILE = 'scripts/data/artofpkm-sets.json'
const CARDS_FILE = 'scripts/data/artofpkm-cards.json'
const RATE_LIMIT_MS = 1500  // 1.5s between sets

const allSets = JSON.parse(readFileSync(SETS_FILE, 'utf-8'))
console.log(`Loaded ${allSets.length} sets to scrape`)

// Resumable: load existing data
let scrapedData = {}
if (existsSync(CARDS_FILE)) {
  scrapedData = JSON.parse(readFileSync(CARDS_FILE, 'utf-8'))
  console.log(`Found existing data: ${Object.keys(scrapedData).length} sets already scraped`)
}

const browser = await puppeteerExtra.launch({ 
  headless: true, 
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] 
})
const page = await browser.newPage()
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')

const startTime = Date.now()
let scrapedCount = 0
let skippedCount = 0
let errorCount = 0
let totalCards = 0

for (let i = 0; i < allSets.length; i++) {
  const aopkmSet = allSets[i]
  
  // Skip already scraped
  if (scrapedData[aopkmSet.id]) {
    skippedCount++
    totalCards += scrapedData[aopkmSet.id].cards?.length || 0
    continue
  }
  
  const url = `https://www.artofpkm.com/sets/${aopkmSet.id}`
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await new Promise(r => setTimeout(r, 2000))
    
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
        const name = title.replace(/^Open\s+/, '').split(',')[0].trim()
        const imgUrl = link.getAttribute('href') || ''
        const fullImgUrl = imgUrl.startsWith('http') ? imgUrl : `https://www.artofpkm.com${imgUrl}`
        cards.push({ localId, name, image: fullImgUrl })
      }
      return { setName, cards }
    })
    
    scrapedData[aopkmSet.id] = {
      setName: data.setName,
      era: aopkmSet.era,
      url,
      scrapedAt: new Date().toISOString(),
      cards: data.cards,
    }
    
    scrapedCount++
    totalCards += data.cards.length
    
    // Save every 10 sets (resumable)
    if (scrapedCount % 10 === 0) {
      writeFileSync(CARDS_FILE, JSON.stringify(scrapedData, null, 2))
    }
    
    const elapsed = (Date.now() - startTime) / 1000
    const rate = scrapedCount / elapsed || 1
    const remaining = (allSets.length - i - 1)
    const eta = Math.round(remaining / rate)
    console.log(`  [${(i+1).toString().padStart(3)}/${allSets.length}] aopkm:${aopkmSet.id.padStart(3)} | ${aopkmSet.era.padEnd(15)} | ${data.cards.length.toString().padStart(3)} cards | ${aopkmSet.name.slice(0, 30)} | ETA ${Math.floor(eta/60)}m${eta%60}s`)
  } catch (err) {
    errorCount++
    console.log(`  [${(i+1).toString().padStart(3)}/${allSets.length}] aopkm:${aopkmSet.id.padStart(3)} | ERROR: ${err.message.slice(0, 50)}`)
    scrapedData[aopkmSet.id] = {
      setName: aopkmSet.name,
      era: aopkmSet.era,
      url,
      error: err.message,
      cards: [],
    }
  }
  
  await new Promise(r => setTimeout(r, RATE_LIMIT_MS))
}

// Final save
writeFileSync(CARDS_FILE, JSON.stringify(scrapedData, null, 2))

console.log(`\n━━━ DONE ━━━`)
console.log(`Scraped:  ${scrapedCount} sets`)
console.log(`Skipped:  ${skippedCount} (already cached)`)
console.log(`Errors:   ${errorCount}`)
console.log(`Total cards collected: ${totalCards}`)
console.log(`Time: ${Math.round((Date.now() - startTime) / 1000 / 60)}m`)
console.log(`File: ${CARDS_FILE}`)

await browser.close()
