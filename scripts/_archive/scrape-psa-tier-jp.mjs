#!/usr/bin/env node
/**
 * Scrape all JAPANESE sets in a PSA tier (hot/warm/cold).
 * 
 * HOT JP : 14 sets daily   - current SV releases
 * WARM JP: 30 sets weekly  - SV early mainline + popular promos
 * COLD JP: 471 sets monthly - vintage Japanese, exclusivities, older
 *
 * Usage: node scripts/scrape-psa-tier-jp.mjs --tier=hot
 */
import { spawn } from 'child_process'
import { getSetsForTierJp } from './lib/psa-tiers-jp.mjs'
import { PSA_HEADINGS_JP } from './lib/psa-headings-jp.mjs'

const tier = process.argv.find(a => a.startsWith('--tier='))?.split('=')[1]
if (!tier) {
  console.error('Usage: --tier=hot|warm|cold')
  process.exit(1)
}

const allSetIds = Object.keys(PSA_HEADINGS_JP)
const tierSets = getSetsForTierJp(tier, allSetIds)

// Prefix with 'jp-' for the scraper
let sets = tierSets.map(s => `jp-${s}`)

// Optional chunking for COLD tier (too big for single GitHub Actions runner)
const chunkIndex = parseInt(process.env.CHUNK_INDEX || '-1')
const chunkTotal = parseInt(process.env.CHUNK_TOTAL || '1')
if (chunkIndex >= 0 && chunkTotal > 1) {
  const chunkSize = Math.ceil(sets.length / chunkTotal)
  const start = chunkIndex * chunkSize
  const end = Math.min(start + chunkSize, sets.length)
  sets = sets.slice(start, end)
  console.log(`📦 Chunk ${chunkIndex + 1}/${chunkTotal}: sets ${start}-${end - 1}`)
}

console.log(`🇯🇵 Scraping ${sets.length} JAPANESE sets in tier "${tier}"`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// JP scraping is more aggressive on Cloudflare; use longer delays
const SLEEP_BETWEEN = tier === 'hot' ? 10000 : tier === 'warm' ? 12000 : 15000

let successes = 0
let failures = 0
const failedSets = []

for (const setId of sets) {
  console.log(`\n=== ${setId} ===`)
  const code = await new Promise((resolve) => {
    const child = spawn('node', ['scripts/scrape-psa-set.mjs', `--setId=${setId}`], {
      stdio: 'inherit',
    })
    child.on('close', resolve)
  })

  if (code === 0) {
    successes++
  } else {
    failures++
    failedSets.push(setId)
  }

  await new Promise(r => setTimeout(r, SLEEP_BETWEEN))
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`JP Tier "${tier}" complete:`)
console.log(`  ✅ Successes: ${successes} / ${sets.length}`)
console.log(`  ❌ Failures:  ${failures}`)

if (failures > 0) {
  console.log(`  Failed sets: ${failedSets.join(', ')}`)
  process.exit(1)
}
