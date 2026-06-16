#!/usr/bin/env node
/**
 * Inspect /sets/<id>/cards page to understand:
 *  - How cards are listed (DOM structure)
 *  - Image URLs format
 *  - localId / number associated with each card
 */
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteerExtra.use(StealthPlugin())

const browser = await puppeteerExtra.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

// Test on Base Set (artofpkm id=6, PMCG era, should have 102 cards)
console.log('━━━ Inspecting /sets/6/cards (PMCG Base Set) ━━━')
await page.goto('https://www.artofpkm.com/sets/6/cards', { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise(r => setTimeout(r, 5000))
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await new Promise(r => setTimeout(r, 3000))

// Extract card info: image URL + nearby text (number)
const cards = await page.evaluate(() => {
  // Different possible structures
  const allLinks = Array.from(document.querySelectorAll('a[href*="/cards/"]'))
  const allImages = Array.from(document.querySelectorAll('img[src*="active_storage"]'))
  
  // Try linking each image to its card link by parent traversal
  const data = []
  for (const link of allLinks) {
    const img = link.querySelector('img')
    const href = link.getAttribute('href') || ''
    const text = link.textContent?.trim().slice(0, 50) || ''
    
    if (img) {
      // Get all text content nearby (might contain card number, name)
      const parent = link.closest('div, article, li')
      const parentText = parent?.textContent?.trim().slice(0, 100) || ''
      
      data.push({
        href,
        imgSrc: img.src,
        imgAlt: img.alt || '',
        linkText: text,
        nearbyText: parentText.slice(0, 80),
      })
    }
  }
  return data
})

console.log(`Found ${cards.length} card-link elements\n`)
console.log('━━━ First 8 cards ━━━')
for (const c of cards.slice(0, 8)) {
  console.log(`  href: ${c.href}`)
  console.log(`  alt:  "${c.imgAlt}"`)
  console.log(`  near: "${c.nearbyText.replace(/\s+/g, ' ')}"`)
  console.log(`  src:  ${c.imgSrc.slice(-60)}`)
  console.log()
}

console.log('━━━ Last 3 cards (to confirm we got all) ━━━')
for (const c of cards.slice(-3)) {
  console.log(`  alt:  "${c.imgAlt}"`)
  console.log(`  near: "${c.nearbyText.replace(/\s+/g, ' ')}"`)
}

await browser.close()
