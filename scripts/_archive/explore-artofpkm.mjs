#!/usr/bin/env node
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteerExtra.use(StealthPlugin())

const browser = await puppeteerExtra.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')

// Capture all image URLs
const imageUrls = []
page.on('request', req => {
  const url = req.url()
  if (req.resourceType() === 'image' && /\.(jpg|jpeg|png|webp)/i.test(url)) {
    imageUrls.push(url)
  }
})

// Test with Base Set (set 6 = PMCG Base Set)
console.log('━━━ Testing /sets/6 (PMCG Base Set) ━━━')
await page.goto('https://www.artofpkm.com/sets/6', { waitUntil: 'networkidle2', timeout: 30000 })
await new Promise(r => setTimeout(r, 3000))
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await new Promise(r => setTimeout(r, 3000))

// Get HTML structure
const pageStructure = await page.evaluate(() => {
  const allImgs = Array.from(document.querySelectorAll('img'))
  return allImgs.slice(0, 10).map(img => ({
    src: img.src,
    alt: img.alt,
    parentHref: img.closest('a')?.href || null,
  }))
})

console.log(`\nFirst 10 <img> on page:`)
for (const i of pageStructure) {
  console.log(`  alt="${i.alt?.slice(0, 30)}" src="${i.src?.slice(0, 90)}"`)
}

// Find card links pattern
const cardLinks = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a'))
    .map(a => a.href)
    .filter(h => h.includes('/card') || h.includes('/cards/'))
    .slice(0, 5)
})
console.log(`\nCard links pattern: ${cardLinks.length > 0 ? cardLinks[0] : 'NONE'}`)
for (const l of cardLinks) console.log(`  ${l}`)

console.log(`\n━━━ All unique image domains used ━━━`)
const domains = new Set()
for (const u of imageUrls) {
  try { domains.add(new URL(u).host) } catch {}
}
for (const d of domains) console.log(`  ${d}`)

console.log(`\n━━━ Sample 10 image URLs (likely card images) ━━━`)
const cardImages = imageUrls.filter(u => !u.includes('logo') && !u.includes('icon')).slice(0, 10)
for (const u of cardImages) console.log(`  ${u}`)

await browser.close()
