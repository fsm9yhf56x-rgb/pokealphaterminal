#!/usr/bin/env node
/**
 * Scrape all sets in a PSA tier (hot/warm/cold).
 * Usage: node scripts/scrape-psa-tier.mjs --tier=hot
 */
import { spawn } from 'child_process'
import { getSetsForTier } from './lib/psa-tiers.mjs'

const tier = process.argv.find(a => a.startsWith('--tier='))?.split('=')[1]
if (!tier) {
  console.error('Usage: --tier=hot|warm|cold')
  process.exit(1)
}

const sets = getSetsForTier(tier)
console.log(`🔁 Scraping ${sets.length} sets in tier "${tier}"`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

const SLEEP_BETWEEN = tier === 'hot' ? 8000 : tier === 'warm' ? 10000 : 12000

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
console.log(`Tier "${tier}" complete:`)
console.log(`  ✅ Successes: ${successes} / ${sets.length}`)
console.log(`  ❌ Failures:  ${failures}`)
if (failures > 0) {
  console.log(`  Failed sets: ${failedSets.join(', ')}`)
  process.exit(1)
}
