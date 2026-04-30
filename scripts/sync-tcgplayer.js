// Backfill local TCGPlayer — déclenche le endpoint /api/prices/tcgplayer en boucle
// Utile pour : init catalog complet, debug, force refresh
//
// Usage :
//   node scripts/sync-tcgplayer.js --market=EN --runs=50
//   node scripts/sync-tcgplayer.js --market=JP --runs=100
//   node scripts/sync-tcgplayer.js --market=both --runs=80
//
// Vars requises (dans .env.local) :
//   PROD_URL          (ex: https://pokealphaterminal.io)
//   CRON_SECRET       (le même que sur Vercel)

require('dotenv').config({ path: '.env.local' })

const PROD_URL = process.env.PROD_URL || 'https://pokealphaterminal.io'
const CRON_SECRET = process.env.CRON_SECRET || ''

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET missing in .env.local')
  process.exit(1)
}

const args = process.argv.slice(2)
function getArg(name, def) {
  const a = args.find((x) => x.startsWith(`--${name}=`))
  return a ? a.split('=')[1] : def
}

const market = (getArg('market', 'EN') || 'EN').toUpperCase()
const runs = parseInt(getArg('runs', '10'), 10)
const sleepMs = parseInt(getArg('sleep', '3000'), 10)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function callOnce(mkt) {
  const url = `${PROD_URL}/api/prices/tcgplayer?market=${mkt}`
  const t0 = Date.now()
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${CRON_SECRET}` } })
    const data = await r.json()
    const dur = Date.now() - t0
    return { ok: r.ok, status: r.status, data, duration: dur }
  } catch (e) {
    return { ok: false, status: 0, error: e.message, duration: Date.now() - t0 }
  }
}

async function runMarket(mkt, n) {
  console.log(`\n═══ Market ${mkt} — ${n} runs ═══\n`)
  let totalCards = 0
  let totalUpdated = 0
  let okCount = 0
  let lastSet = null
  for (let i = 1; i <= n; i++) {
    const res = await callOnce(mkt)
    if (res.ok && res.data?.ok) {
      okCount++
      totalCards += res.data.totalCards || 0
      totalUpdated += res.data.totalUpdated || 0
      lastSet = res.data.lastSet
      console.log(
        `  [${i}/${n}] ✅ ${res.duration}ms | set=${res.data.lastSet} | cards=${res.data.totalCards} | upd=${res.data.totalUpdated}`
      )
    } else if (res.data?.skipped) {
      console.log(`  [${i}/${n}] ⏭️  Skipped: ${res.data.reason}`)
      break
    } else {
      console.log(`  [${i}/${n}] ❌ HTTP ${res.status} | ${res.error || JSON.stringify(res.data).slice(0, 200)}`)
    }
    if (i < n) await sleep(sleepMs)
  }
  console.log(`\n[${mkt}] Done — ${okCount}/${n} runs OK | ${totalCards} cards | ${totalUpdated} snapshots written | last=${lastSet}`)
  return { totalCards, totalUpdated, okCount }
}

async function main() {
  console.log(`TCGPlayer backfill runner — ${PROD_URL}`)
  console.log(`Market: ${market} | Runs: ${runs} | Sleep: ${sleepMs}ms\n`)

  if (market === 'BOTH') {
    await runMarket('EN', runs)
    await runMarket('JP', runs)
  } else {
    await runMarket(market, runs)
  }

  console.log('\n✅ All done.')
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
