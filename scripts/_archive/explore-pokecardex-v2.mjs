#!/usr/bin/env node
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteerExtra.use(StealthPlugin())

const browser = await puppeteerExtra.launch({
  headless: false,
  args: ['--no-sandbox'],
})
const page = await browser.newPage()
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

const apiCalls = []
page.on('request', req => {
  const url = req.url()
  // Capture XHR / fetch calls only (API)
  if (req.resourceType() === 'xhr' || req.resourceType() === 'fetch') {
    apiCalls.push({ url, method: req.method() })
  }
})

console.log('━━━ Visit /sets and wait MUCH longer ━━━')
await page.goto('https://www.pokecardex.com/sets', { waitUntil: 'networkidle2', timeout: 30000 })
await new Promise(r => setTimeout(r, 8000))  // wait extra 8s

// Scroll to trigger lazy load
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await new Promise(r => setTimeout(r, 3000))

// Now inspect what's rendered
const allLinks = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a'))
    .map(a => ({
      text: a.textContent?.trim().slice(0, 50) || '',
      href: a.getAttribute('href') || '',
    }))
})

// Filter to DP-related
const dpLinks = allLinks.filter(l => 
  l.text.toLowerCase().includes('diamant') ||
  l.text.toLowerCase().includes('perle') ||
  l.text.toLowerCase().includes('mystérieux') ||  // DP2 Trésors Mystérieux
  l.text.toLowerCase().includes('secrètes') ||    // DP3
  l.text.toLowerCase().includes('duels') ||       // DP4
  l.text.toLowerCase().includes('aube') ||        // DP5
  l.text.toLowerCase().includes('éveil') ||       // DP6
  l.text.toLowerCase().includes('tempête') ||     // DP7
  /\/dp\d?/i.test(l.href)
)

console.log(`Total links: ${allLinks.length}`)
console.log(`DP-related: ${dpLinks.length}`)
for (const l of dpLinks.slice(0, 15)) {
  console.log(`  [${l.href.padEnd(40)}] ${l.text}`)
}

console.log('\n━━━ All API XHR/fetch calls ━━━')
const seenApi = new Set()
for (const c of apiCalls) {
  if (seenApi.has(c.url)) continue
  seenApi.add(c.url)
  console.log(`  [${c.method.padEnd(4)}] ${c.url}`)
}

// Save full HTML snapshot
const html = await page.content()
const fs = await import('fs')
fs.writeFileSync('/tmp/pokecardex-sets.html', html)
console.log(`\n  Full HTML saved to /tmp/pokecardex-sets.html (${html.length} bytes)`)

await browser.close()
