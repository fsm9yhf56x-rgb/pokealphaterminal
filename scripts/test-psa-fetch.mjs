#!/usr/bin/env node
/**
 * Isolated test of the PSA Puppeteer fetcher.
 * Does NOT touch DB. Just proves we can pull data through Cloudflare.
 *
 * Usage: node scripts/test-psa-fetch.mjs
 */

import { fetchPsaSetWithBrowser } from './lib/psa-fetcher.mjs'

const config = {
  categoryId: 156940,  // TCG Cards
  headingId: 57801,    // Pokemon Game (1999) — Base Set
}

console.log('🧪 Testing PSA fetcher (Puppeteer + stealth)...')
console.log(`   Target: Pokemon Game (1999) [heading=${config.headingId}]\n`)

const startTime = Date.now()

try {
  const { data, recordsTotal, source } = await fetchPsaSetWithBrowser(config)

  console.log(`\n✅ SUCCESS in ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
  console.log(`   Source: ${source}`)
  console.log(`   recordsTotal: ${recordsTotal}`)
  console.log(`   data.length: ${data.length}`)

  if (data.length > 0) {
    console.log(`\n📋 First 3 entries (sample):\n`)
    for (const e of data.slice(0, 3)) {
      console.log(
        `  [${e.SpecID}] ${(e.SubjectName || '').padEnd(30)} ` +
        `#${(e.CardNumber || '').padEnd(4)} ` +
        `Variety="${e.Variety || ''}" ` +
        `PSA10=${e.Grade10} Total=${e.GradeTotal || e.Total}`
      )
    }
    console.log('\n🎉 Cloudflare bypass confirmed. Ready to integrate into main scraper.')
  } else {
    console.log('\n⚠️  No data returned. Check headingID or PSA API format.')
  }
} catch (err) {
  console.error(`\n💥 FAILED in ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
  console.error(`   ${err.message}`)
  console.error(`\nNext step: review error and decide if we escalate (proxies?) or pivot to Plan D (manual CSV).`)
  process.exit(1)
}
