#!/usr/bin/env node
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { writeFileSync } from 'fs'

puppeteerExtra.use(StealthPlugin())

const browser = await puppeteerExtra.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

console.log('━━━ Scraping /cards page ━━━')
await page.goto('https://www.artofpkm.com/cards', { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise(r => setTimeout(r, 5000))
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await new Promise(r => setTimeout(r, 3000))

const logos = await page.evaluate(() => {
  const result = []
  const links = Array.from(document.querySelectorAll('a[href^="/sets/"]'))
  
  for (const link of links) {
    const href = link.getAttribute('href') || ''
    const m = href.match(/\/sets\/(\d+)/)
    if (!m) continue
    const setId = m[1]
    
    // Get all imgs in the link, prefer the one with class lazy-load-bg
    const imgs = link.querySelectorAll('img')
    let logoUrl = ''
    let alt = ''
    
    for (const img of imgs) {
      // The real logo image has data-src starting with /rails/
      const dataSrc = img.getAttribute('data-src') || ''
      if (dataSrc.startsWith('/rails/')) {
        logoUrl = `https://www.artofpkm.com${dataSrc}`
        alt = img.getAttribute('alt') || ''
        break
      }
      // Or already loaded src
      const src = img.getAttribute('src') || ''
      if (src.includes('/rails/active_storage/')) {
        logoUrl = src.startsWith('http') ? src : `https://www.artofpkm.com${src}`
        alt = img.getAttribute('alt') || ''
        break
      }
    }
    
    if (logoUrl) result.push({ setId, name: alt, logoUrl })
  }
  return result
})

console.log(`Found ${logos.length} logos\n`)
console.log('Sample 5:')
for (const l of logos.slice(0, 5)) {
  console.log(`  [aopkm-${l.setId.padStart(3)}] ${l.name.slice(0, 30).padEnd(32)}`)
  console.log(`    ${l.logoUrl.slice(0, 100)}`)
}

writeFileSync('scripts/data/artofpkm-logos.json', JSON.stringify(logos, null, 2))
console.log(`\n✅ Saved scripts/data/artofpkm-logos.json`)

// Test 3 random URLs
console.log('\n━━━ Test 3 logo URLs ━━━')
for (const idx of [0, Math.floor(logos.length / 2), logos.length - 1]) {
  const l = logos[idx]
  if (!l) continue
  try {
    const r = await fetch(l.logoUrl, { method: 'HEAD' })
    console.log(`  ${r.status} | aopkm-${l.setId} | ${l.name.slice(0, 30)}`)
  } catch (e) {
    console.log(`  ERR ${e.message}`)
  }
}

await browser.close()
