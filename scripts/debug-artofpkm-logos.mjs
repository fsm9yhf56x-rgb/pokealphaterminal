#!/usr/bin/env node
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { writeFileSync } from 'fs'

puppeteerExtra.use(StealthPlugin())

const browser = await puppeteerExtra.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

await page.goto('https://www.artofpkm.com/cards', { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise(r => setTimeout(r, 5000))
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await new Promise(r => setTimeout(r, 3000))

// Save full HTML
const html = await page.content()
writeFileSync('/tmp/artofpkm-cards.html', html)
console.log(`HTML length: ${html.length}`)

// Inspect the actual structure
const debug = await page.evaluate(() => {
  // Find first /sets/ link
  const links = Array.from(document.querySelectorAll('a[href^="/sets/"]'))
  console.log(`Found ${links.length} links to /sets/`)
  
  if (links.length === 0) return { hasLinks: false, links: 0 }
  
  // Show structure of first few
  const samples = links.slice(0, 3).map(link => {
    return {
      href: link.getAttribute('href'),
      innerHTML: link.innerHTML.slice(0, 500),
      hasImg: !!link.querySelector('img'),
      imgCount: link.querySelectorAll('img').length,
      firstImgSrc: link.querySelector('img')?.src || 'NO IMG',
      firstImgDataSrc: link.querySelector('img')?.getAttribute('data-src') || 'NO DATA',
      // Check parent and children for context
      tagName: link.tagName,
      className: link.className,
    }
  })
  
  return { 
    linksCount: links.length,
    samples,
    // Also count standalone images that might be logos
    allImgs: document.querySelectorAll('img').length,
    imgsWithActiveStorage: document.querySelectorAll('img[src*="active_storage"]').length,
    imgsWithDataSrc: document.querySelectorAll('img[data-src]').length,
  }
})

console.log('\n━━━ Debug ━━━')
console.log(`Total links to /sets/: ${debug.linksCount}`)
console.log(`Total <img> on page: ${debug.allImgs}`)
console.log(`<img> with active_storage src: ${debug.imgsWithActiveStorage}`)
console.log(`<img> with data-src: ${debug.imgsWithDataSrc}`)

console.log('\n━━━ First 3 link samples ━━━')
for (const s of (debug.samples || [])) {
  console.log(`\nhref=${s.href}`)
  console.log(`  hasImg=${s.hasImg} imgCount=${s.imgCount}`)
  console.log(`  imgSrc: ${s.firstImgSrc?.slice(0, 100)}`)
  console.log(`  imgDataSrc: ${s.firstImgDataSrc?.slice(0, 100)}`)
  console.log(`  innerHTML preview: ${s.innerHTML.slice(0, 250).replace(/\s+/g, ' ')}`)
}

await browser.close()
