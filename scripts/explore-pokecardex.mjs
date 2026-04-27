#!/usr/bin/env node
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteerExtra.use(StealthPlugin())

const browser = await puppeteerExtra.launch({
  headless: false,  // visible to debug
  args: ['--no-sandbox'],
})
const page = await browser.newPage()
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')

// Listen to all network requests to capture API calls + image CDN
const requests = []
page.on('request', req => {
  const url = req.url()
  if (url.includes('api') || url.includes('cdn') || url.includes('image') || /\.(jpg|png|webp)/i.test(url)) {
    requests.push({ url, type: req.resourceType(), method: req.method() })
  }
})

console.log('━━━ Step 1: Visit /sets to find Diamant & Perle ━━━')
await page.goto('https://www.pokecardex.com/sets', { waitUntil: 'networkidle2', timeout: 30000 })
await new Promise(r => setTimeout(r, 5000))

// Check what's on the page now
const setLinks = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a'))
    .map(a => ({ text: a.textContent?.trim() || '', href: a.getAttribute('href') || '' }))
    .filter(a => a.text && a.href && (a.text.toLowerCase().includes('diamant') || a.href.toLowerCase().includes('dp')))
})

console.log(`Found ${setLinks.length} DP-related links:`)
for (const l of setLinks.slice(0, 10)) {
  console.log(`  [${l.href}] ${l.text}`)
}

console.log('\n━━━ Step 2: Click first DP link, see what happens ━━━')
if (setLinks.length > 0) {
  const target = setLinks[0]
  console.log(`Navigating to: ${target.href}`)
  
  if (target.href.startsWith('/')) {
    await page.goto(`https://www.pokecardex.com${target.href}`, { waitUntil: 'networkidle2', timeout: 30000 })
  } else if (target.href.startsWith('http')) {
    await page.goto(target.href, { waitUntil: 'networkidle2', timeout: 30000 })
  }
  await new Promise(r => setTimeout(r, 5000))
  
  console.log(`Current URL: ${page.url()}`)
  
  // Find images on this page
  const images = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .map(img => ({
        src: img.src || img.getAttribute('data-src') || '',
        alt: img.getAttribute('alt') || '',
      }))
      .filter(i => i.src && !i.src.includes('logo') && !i.src.includes('icon'))
  })
  
  console.log(`\nImages found on page: ${images.length}`)
  for (const i of images.slice(0, 10)) {
    console.log(`  alt="${i.alt.slice(0, 30)}" src="${i.src.slice(0, 100)}"`)
  }
}

console.log(`\n━━━ All API/Image requests captured (${requests.length}) ━━━`)
const seen = new Set()
for (const r of requests) {
  if (seen.has(r.url)) continue
  seen.add(r.url)
  console.log(`  [${r.type.padEnd(10)}] ${r.url}`)
  if (seen.size >= 30) break
}

await browser.close()
