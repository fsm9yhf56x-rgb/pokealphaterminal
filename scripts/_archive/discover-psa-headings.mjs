#!/usr/bin/env node
/**
 * Crawl PSA TCG cards by year, find Pokemon sets, extract headingIDs.
 *
 * URL pattern:
 *   /pop/tcg-cards/156940          → year index
 *   /pop/tcg-cards/{year}/{id}     → year detail (lists sets)
 *   /pop/tcg-cards/{year}/{slug}/{headingId} → individual set
 */
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteerExtra.use(StealthPlugin())

const YEARS_TO_CRAWL = [1999, 2000, 2001, 2002]  // covers all WOTC era

console.log('🔍 Crawling PSA TCG year pages for Pokemon sets...\n')

const browser = await puppeteerExtra.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
})

const page = await browser.newPage()
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')

// Step 1: Get year IDs from main index
console.log('Step 1: Loading TCG year index...')
await page.goto('https://www.psacard.com/pop/tcg-cards/156940', { waitUntil: 'networkidle2', timeout: 30000 })
await new Promise(r => setTimeout(r, 2000))

const yearLinks = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a[href*="/pop/tcg-cards/"]'))
    .map(a => ({ text: (a.textContent || '').trim(), href: a.getAttribute('href') || '' }))
    .filter(l => /^\d{4}(-\d{2})?$/.test(l.text))
})

console.log(`Found ${yearLinks.length} year links\n`)

const yearMap = {}
for (const yl of yearLinks) {
  const m = yl.href.match(/\/(\d+)$/)
  if (m && YEARS_TO_CRAWL.some(y => yl.text === String(y))) {
    yearMap[yl.text] = { yearId: m[1], href: yl.href }
  }
}

console.log('Mapped years:', yearMap)

// Step 2: For each year, load the page and extract Pokemon sets
const allPokemonSets = []

for (const [year, info] of Object.entries(yearMap)) {
  const fullUrl = `https://www.psacard.com${info.href}`
  console.log(`\n━━━ Crawling ${year}: ${fullUrl}`)

  await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise(r => setTimeout(r, 2500))

  const setLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="/pop/tcg-cards/"]'))
      .map(a => ({ text: (a.textContent || '').trim().replace(/\s+/g, ' '), href: a.getAttribute('href') || '' }))
      .filter(l => l.text && /\/\d+$/.test(l.href))
  })

  const pokemonSets = setLinks.filter(l => {
    const t = l.text.toLowerCase()
    return t.includes('pokemon') || t.includes('pokémon')
  })

  console.log(`   Found ${pokemonSets.length} Pokemon sets in ${year}`)
  for (const s of pokemonSets) {
    const m = s.href.match(/\/(\d+)$/)
    const headingId = m ? m[1] : '?'
    console.log(`     [${headingId.padEnd(8)}] ${s.text}`)
    allPokemonSets.push({ year, headingId, name: s.text, href: s.href })
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`📊 TOTAL Pokemon sets found: ${allPokemonSets.length}\n`)

// Suggest mapping for our target sets
const TARGETS = [
  { ourId: 'base2',  keywords: ['jungle'] },
  { ourId: 'base3',  keywords: ['fossil'] },
  { ourId: 'base4',  keywords: ['base set 2'] },
  { ourId: 'base5',  keywords: ['team rocket'] },
  { ourId: 'gym1',   keywords: ['gym heroes'] },
  { ourId: 'gym2',   keywords: ['gym challenge'] },
  { ourId: 'neo1',   keywords: ['neo genesis'] },
  { ourId: 'neo2',   keywords: ['neo discovery'] },
  { ourId: 'neo3',   keywords: ['neo revelation'] },
  { ourId: 'neo4',   keywords: ['neo destiny'] },
]

console.log('🎯 Suggested mappings:')
for (const t of TARGETS) {
  const matches = allPokemonSets.filter(s => {
    const t_lower = s.name.toLowerCase()
    return t.keywords.every(k => t_lower.includes(k))
  })
  if (matches.length === 1) {
    console.log(`  ${t.ourId.padEnd(8)} → headingId=${matches[0].headingId.padEnd(8)} [${matches[0].name}]`)
  } else if (matches.length > 1) {
    console.log(`  ${t.ourId.padEnd(8)} → AMBIGUOUS:`)
    for (const m of matches) console.log(`              [${m.headingId.padEnd(8)}] ${m.name}`)
  } else {
    console.log(`  ${t.ourId.padEnd(8)} → NOT_FOUND`)
  }
}

await browser.close()
console.log('\n✅ Done')
