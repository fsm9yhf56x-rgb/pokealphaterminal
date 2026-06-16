#!/usr/bin/env node
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { writeFileSync } from 'fs'

puppeteerExtra.use(StealthPlugin())

const browser = await puppeteerExtra.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

// Try multiple URL patterns
const urls = [
  'https://www.artofpkm.com/sets/6',
  'https://www.artofpkm.com/sets/6/cards',
]

for (const u of urls) {
  console.log(`\n━━━ ${u} ━━━`)
  try {
    const resp = await page.goto(u, { waitUntil: 'networkidle2', timeout: 60000 })
    console.log(`  Status: ${resp?.status()}`)
    console.log(`  Final URL: ${page.url()}`)
    
    await new Promise(r => setTimeout(r, 4000))
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await new Promise(r => setTimeout(r, 3000))
    
    // Count various selectors
    const stats = await page.evaluate(() => {
      return {
        title: document.title,
        h1: document.querySelector('h1')?.textContent?.trim() || '',
        totalImgs: document.querySelectorAll('img').length,
        activeStorageImgs: document.querySelectorAll('img[src*="active_storage"]').length,
        allLinks: document.querySelectorAll('a').length,
        cardLinks: document.querySelectorAll('a[href*="/cards/"]').length,
        articleEls: document.querySelectorAll('article').length,
        // Sample first article/card-like element HTML
        firstCardHtml: (() => {
          const candidates = ['article', '.card', '[class*="card"]', '.grid > *', '.grid-cols-2 > *', 'main > div > div > div']
          for (const sel of candidates) {
            const el = document.querySelector(sel)
            if (el) return { selector: sel, html: el.outerHTML.slice(0, 600) }
          }
          return null
        })(),
      }
    })
    
    console.log(`  Title: ${stats.title}`)
    console.log(`  H1: ${stats.h1}`)
    console.log(`  Total <img>: ${stats.totalImgs}`)
    console.log(`  active_storage <img>: ${stats.activeStorageImgs}`)
    console.log(`  Total <a>: ${stats.allLinks}`)
    console.log(`  Card links (/cards/): ${stats.cardLinks}`)
    console.log(`  <article> els: ${stats.articleEls}`)
    
    if (stats.firstCardHtml) {
      console.log(`\n  First card-like element (selector: ${stats.firstCardHtml.selector}):`)
      console.log(`  ${stats.firstCardHtml.html.replace(/\n/g, ' ').slice(0, 500)}`)
    }
    
    // Save HTML for offline inspection
    const html = await page.content()
    const filename = u.replace(/[^a-z0-9]/gi, '-')
    writeFileSync(`/tmp/${filename}.html`, html)
    console.log(`  Saved /tmp/${filename}.html (${html.length} bytes)`)
  } catch (e) {
    console.log(`  ERR: ${e.message}`)
  }
}

await browser.close()
