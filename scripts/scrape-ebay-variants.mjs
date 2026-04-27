#!/usr/bin/env node
/**
 * Scrape eBay sold listings for the 1042 vintage variant cards
 * (Shadowless + 1st Edition sets) and write to prices_snapshots.
 *
 * Architecture:
 * - eBay Browse API officielle (api.ebay.com)
 * - OAuth via EBAY_APP_ID + EBAY_CERT_ID
 * - Query construction par carte : "<Name> <Set> <Edition> <Number>"
 * - Filtre prix min selon edition + condition
 * - Trim outliers (10% bas, 20% haut)
 * - Insert dans prices_snapshots (table moderne)
 *
 * Usage:
 *   node scripts/scrape-ebay-variants.mjs --setId=base1-shadowless [--dry-run] [--limit=10]
 *   node scripts/scrape-ebay-variants.mjs --all
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// ── Init ──
let supabaseUrl, supabaseKey, ebayAppId, ebayCertId
try {
  const env = readFileSync('.env.local', 'utf-8')
  supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1].trim()
  supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1].trim()
  ebayAppId = env.match(/^EBAY_APP_ID=(.+)$/m)?.[1].trim()
  ebayCertId = env.match(/^EBAY_CERT_ID=(.+)$/m)?.[1].trim()
} catch {
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  ebayAppId = process.env.EBAY_APP_ID
  ebayCertId = process.env.EBAY_CERT_ID
}
if (!supabaseUrl || !supabaseKey || !ebayAppId || !ebayCertId) {
  console.error('❌ Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EBAY_APP_ID, EBAY_CERT_ID')
  process.exit(1)
}
const sb = createClient(supabaseUrl, supabaseKey)
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ── eBay OAuth token ──
async function getEbayToken() {
  const auth = Buffer.from(`${ebayAppId}:${ebayCertId}`).toString('base64')
  const r = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${auth}` },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  })
  if (!r.ok) throw new Error(`OAuth failed: ${r.status} ${await r.text()}`)
  const d = await r.json()
  return d.access_token
}

// ── Set name mapping (PCA-style → human-readable) ──
const SET_NAMES = {
  'en-base1-shadowless':    'Base Set Shadowless',
  'en-base1-shadowless-ns': 'Base Set 1st Edition Shadowless',
  'en-base2-1st':           'Jungle 1st Edition',
  'en-base3-1st':           'Fossil 1st Edition',
  'en-base5-1st':           'Team Rocket 1st Edition',
  'en-gym1-1st':            'Gym Heroes 1st Edition',
  'en-gym2-1st':            'Gym Challenge 1st Edition',
  'en-neo1-1st':            'Neo Genesis 1st Edition',
  'en-neo2-1st':            'Neo Discovery 1st Edition',
  'en-neo3-1st':            'Neo Revelation 1st Edition',
  'en-neo4-1st':            'Neo Destiny 1st Edition',
}

// ── Edition flags (used in query construction) ──
function getEdition(setId) {
  if (setId.endsWith('-shadowless-ns')) return { firstEd: true, shadowless: true, label: '1st_ed_shadowless' }
  if (setId.endsWith('-shadowless'))    return { firstEd: false, shadowless: true, label: 'shadowless' }
  if (setId.endsWith('-1st'))           return { firstEd: true, shadowless: false, label: '1st_ed' }
  return { firstEd: false, shadowless: false, label: 'unlimited' }
}

// ── Build eBay query ──
function buildEbayQuery(name, localId, totalCards, setName, edition) {
  let q = name + ' '
  if (localId) q += `${localId}/${totalCards} `
  q += setName + ' '
  // Append edition keywords (eBay search is keyword-based)
  if (edition.firstEd) q += '1st edition '
  if (edition.shadowless) q += 'shadowless '
  q += 'holo'
  // Exclude common spam terms
  q += ' -custom -proxy -reprint -fan -art -sticker -lot -bundle -graded -psa -bgs -cgc'
  return q.trim()
}

// ── Min price floor (filters out misclassified cheap commons) ──
function minPrice(edition, rarity) {
  const isHolo = rarity?.toLowerCase().includes('holo') || rarity?.toLowerCase().includes('rare')
  if (edition.firstEd && edition.shadowless) return isHolo ? 200 : 30   // 1st Ed Shadowless = ultra rare
  if (edition.firstEd)                       return isHolo ? 100 : 10
  if (edition.shadowless)                    return isHolo ? 30 : 5
  return 1
}

// ── eBay API: search recent listings ──
async function searchEbay(token, query, minPriceUSD) {
  const url = 'https://api.ebay.com/buy/browse/v1/item_summary/search?'
    + 'q=' + encodeURIComponent(query)
    + '&category_ids=183454'  // Pokemon Trading Card category
    + '&filter=' + encodeURIComponent(`price:[${minPriceUSD}..],conditionIds:{1000|1500|2000|2500|3000}`)
    + '&limit=50&sort=price'
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
    },
  })
  if (!r.ok) throw new Error(`eBay search failed: ${r.status}`)
  return r.json()
}

// ── Trim outliers + compute stats ──
function computeStats(prices) {
  if (prices.length === 0) return null
  const sorted = [...prices].sort((a, b) => a - b)
  // Aggressive outlier trim: 20% bottom, 30% top (eBay buy-it-now has lots of overpriced listings)
  const trimLow = Math.max(1, Math.floor(sorted.length * 0.2))
  const trimHigh = Math.max(1, Math.floor(sorted.length * 0.3))
  const trimmed = sorted.length > 5 ? sorted.slice(trimLow, sorted.length - trimHigh) : sorted
  if (trimmed.length === 0) return null
  // Use median as primary signal (robust to outliers), avg as secondary
  const median = trimmed[Math.floor(trimmed.length / 2)]
  const avg = Math.round(trimmed.reduce((s, p) => s + p, 0) / trimmed.length * 100) / 100
  return {
    avg,
    median,
    low: sorted[0],
    high: sorted[sorted.length - 1],
    nbSales: prices.length,
    trimmedCount: trimmed.length,
  }
}

// ── Main scrape function ──
async function scrapeSet(setId, opts = {}) {
  const setName = SET_NAMES[setId]
  if (!setName) {
    console.error(`❌ Unknown setId: ${setId}`)
    return { ok: false }
  }

  console.log(`\n📡 ${setId} → "${setName}"`)
  const edition = getEdition(setId)

  // Get all cards in this set
  const { data: cards, error } = await sb
    .from('tcg_cards')
    .select('id, local_id, name, rarity')
    .eq('set_id', setId)
    
  if (error) {
    console.error('  ❌ DB error:', error.message)
    return { ok: false }
  }
  if (!cards || cards.length === 0) {
    console.log('  ⚠️  No cards found')
    return { ok: false }
  }

  // Sort numerically by local_id (DB sort treats it as string: 1, 10, 100...)
  cards.sort((a, b) => {
    const an = parseInt((a.local_id || '0').replace(/\D/g, '')) || 0
    const bn = parseInt((b.local_id || '0').replace(/\D/g, '')) || 0
    return an - bn
  })

  // Get total cards in set for "X/Y" query format
  const { data: setData } = await sb.from('tcg_sets').select('total_cards').eq('id', setId).single()
  const totalCards = setData?.total_cards || 102

  console.log(`  📚 ${cards.length} cards to scrape`)

  // Get token once
  const token = await getEbayToken()
  console.log('  🔑 eBay OAuth OK')

  let success = 0, empty = 0, errors = 0
  const snapshots = []
  const limit = opts.limit ? Math.min(opts.limit, cards.length) : cards.length

  for (let i = 0; i < limit; i++) {
    const card = cards[i]
    const minPriceUSD = minPrice(edition, card.rarity)
    const query = buildEbayQuery(card.name, card.local_id, totalCards, setName, edition)
    const cardLabel = `[${String(i + 1).padStart(3)}/${limit}] ${card.local_id.padEnd(4)} ${card.name.slice(0, 25).padEnd(27)}`

    try {
      const result = await searchEbay(token, query, minPriceUSD)
      const items = result.itemSummaries || []
      // Client-side filters to isolate raw (non-graded, English, single card) listings
      const rawItems = items.filter(it => {
        const title = (it.title || '').toLowerCase()
        // Exclude graded cards (any grading service or grade indicator)
        if (/\b(psa|bgs|cgc|sgc|ace|tag|gma|hga|graded|grade|grading|encapsulated|slabbed|slab|cert|authenticated|gem mint|gem-mint|10\.0|9\.5|9\.0|gma|black label|pristine)\b/.test(title)) return false
        // Exclude clearly damaged/altered listings
        if (/\b(damaged|heavily played|played|poor|worn|creased|bent|water|tear|crease|stained|reprint|reproduction|fake|proxy|custom|fanart|fan art|sticker|altered)\b/.test(title)) return false
        // Exclude non-English variants (FR/DE/IT/ES/JP/KR/CN are different markets with different prices)
        if (/\b(french|francaise|fran[cç]ais|german|deutsche|italian|italiano|italiana|spanish|espa[nñ]ol|japanese|japonais|korean|cor[eé]en|chinese|portuguese|portugais|dutch|n[ée]erlandais|polish|polonais|russian|russe)\b/.test(title)) return false
        // Exclude lots / bundles / playsets
        if (/\b(lot|bundle|set of|playset|bulk|wholesale|collection of \d|x\d{2,}|full set|complete set|empty pack|wrapper)\b/.test(title)) return false
        // Must mention edition explicitly to be sure (defends against mismatched results)
        return true
      })
      const prices = rawItems
        .map(it => parseFloat(it.price?.value || '0'))
        .filter(p => p >= minPriceUSD && p < 50000)

      const stats = computeStats(prices)
      if (!stats) {
        console.log(`${cardLabel} → no listings ≥ $${minPriceUSD}`)
        empty++
        await sleep(150)
        continue
      }

      console.log(`${cardLabel} → med $${String(stats.median).padStart(6)} | avg $${String(stats.avg).padStart(7)} (${stats.nbSales} actifs, ${stats.trimmedCount} trim, $${stats.low}-$${stats.high})`)

      snapshots.push({
        card_ref: card.id,
        source: 'ebay',
        variant: edition.label,
        price_avg: stats.avg,
        price_low: stats.low,
        price_high: stats.high,
        price_median: stats.median,
        nb_sales: stats.nbSales,
        period_days: 30,
        currency: 'USD',
        source_meta: {
          query,
          min_price_filter: minPriceUSD,
          set_name: setName,
          rarity: card.rarity,
        },
      })
      success++
    } catch (e) {
      console.log(`${cardLabel} → ERR ${e.message.slice(0, 40)}`)
      errors++
    }
    await sleep(200)  // 5 req/s max
  }

  // Insert all snapshots
  if (!opts.dryRun && snapshots.length > 0) {
    console.log(`\n  💾 Inserting ${snapshots.length} snapshots...`)
    const { error: insErr } = await sb.from('prices_snapshots').insert(snapshots)
    if (insErr) {
      console.error('  ❌ Insert failed:', insErr.message)
      return { ok: false, success, empty, errors }
    }
    console.log('  ✅ Done')
  } else if (opts.dryRun) {
    console.log(`\n  🔍 Dry run: ${snapshots.length} snapshots NOT inserted`)
  }

  return { ok: true, success, empty, errors }
}

// ── Main ──
const args = process.argv.slice(2)
const setIdArg = args.find(a => a.startsWith('--setId='))?.split('=')[1]
const allFlag = args.includes('--all')
const dryRun = args.includes('--dry-run')
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0') || null

const ALL_VARIANT_SETS = Object.keys(SET_NAMES)

if (!setIdArg && !allFlag) {
  console.error('Usage:')
  console.error('  node scripts/scrape-ebay-variants.mjs --setId=en-base1-shadowless [--dry-run] [--limit=10]')
  console.error('  node scripts/scrape-ebay-variants.mjs --all [--dry-run]')
  console.error('\nValid setIds:')
  for (const s of ALL_VARIANT_SETS) console.error(`  ${s}`)
  process.exit(1)
}

const setsToScrape = allFlag ? ALL_VARIANT_SETS : [setIdArg]
console.log(`🎯 Scraping ${setsToScrape.length} variant sets${dryRun ? ' (DRY RUN)' : ''}\n`)

let grandTotal = { success: 0, empty: 0, errors: 0 }
for (const setId of setsToScrape) {
  const r = await scrapeSet(setId, { dryRun, limit })
  if (r.ok) {
    grandTotal.success += r.success
    grandTotal.empty += r.empty
    grandTotal.errors += r.errors
  }
  if (allFlag) await sleep(2000)  // pause between sets
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`✅ Success: ${grandTotal.success} cards priced`)
console.log(`⚠️  Empty:   ${grandTotal.empty} cards (no listings)`)
console.log(`❌ Errors:  ${grandTotal.errors} cards`)
