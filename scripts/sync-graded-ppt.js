/**
 * sync-graded-ppt.js — sync graded prices PokemonPriceTracker → Neon
 *
 * Architecture:
 *   - 1 set PPT par requête via ?set=<name>&fetchAllInSet=true&includeEbay=true
 *   - 2 credits / carte (1 card + 1 ebay)
 *   - Upsert dans graded_prices_ppt (1 row par carte, JSONB grades)
 *   - Resumable via graded-ppt-progress.json (sets traités)
 *   - Safeguards: stop si credits < SAFETY_MIN, throttle 1s entre sets
 *
 * Usage:
 *   node scripts/sync-graded-ppt.js                 → tous les sets configurés
 *   node scripts/sync-graded-ppt.js --set "Jungle"  → 1 set
 *   node scripts/sync-graded-ppt.js --language japanese
 *
 * Mapping tcg_card_id:
 *   EN: <set> + "/<cardNumber>" → tcg_cards.id avec match (set_name, local_id)
 *   JP: même approche, language=japanese
 */

require('dotenv').config({ path: '.env.local', quiet: true })
const fs = require('fs')
const { Pool } = require('@neondatabase/serverless')

const KEY = process.env.POKEMON_PRICE_TRACKER_API_KEY
if (!KEY) { console.error('Missing POKEMON_PRICE_TRACKER_API_KEY'); process.exit(1) }

const PROGRESS = 'graded-ppt-progress.json'
const SAFETY_MIN = 1000          // arrêt si credits journaliers <= 1000
const THROTTLE_MS = 1200         // 50 req/min max (limite PPT = 60)
const PPT_BASE = 'https://www.pokemonpricetracker.com/api/v2'

// ----------------------------------------------------------------------------
// Sets à syncer (vintage + modern hot EN par défaut)
// Noms EXACTS comme retournés par PPT /api/v2/sets
// ----------------------------------------------------------------------------
const DEFAULT_SETS_EN = [
  // Vintage WOTC
  'Base Set', 'Base Set (Shadowless)', 'Jungle', 'Fossil', 'Base Set 2', 'Team Rocket',
  'Gym Heroes', 'Gym Challenge',
  'Neo Genesis', 'Neo Discovery', 'Neo Revelation', 'Neo Destiny',
  // Modern hot
  'SWSH07: Evolving Skies', 'SWSH11: Lost Origin', 'SWSH12: Silver Tempest',
  'SWSH: Crown Zenith',
  'SV: Scarlet & Violet 151', 'SV: Paldean Fates', 'SV: Shrouded Fable',
  'SV: Prismatic Evolutions',
  'SV08: Surging Sparks', 'SV09: Journey Together', 'SV10: Destined Rivals',
]

// ----------------------------------------------------------------------------
// Args CLI
// ----------------------------------------------------------------------------
const args = process.argv.slice(2)
function arg(name, def = null) {
  const i = args.indexOf('--' + name)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def
}
const onlySet = arg('set')
const language = arg('language', 'english')
const dryRun = args.includes('--dry-run')

const SETS = onlySet ? [onlySet] : DEFAULT_SETS_EN

const sleep = ms => new Promise(r => setTimeout(r, ms))
const loadJson = (path, def) => fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf8')) : def
const saveJson = (path, obj) => fs.writeFileSync(path, JSON.stringify(obj, null, 2))

// ----------------------------------------------------------------------------
// Fetch 1 set entier depuis PPT
// ----------------------------------------------------------------------------
async function fetchSet(setName, lang) {
  const url = `${PPT_BASE}/cards?set=${encodeURIComponent(setName)}&fetchAllInSet=true&includeEbay=true&language=${lang}`
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + KEY } })
  const remaining = Number(r.headers.get('x-ratelimit-daily-remaining') || 0)
  const consumed = r.headers.get('x-api-calls-consumed') || '?'

  if (!r.ok) {
    return { ok: false, status: r.status, remaining, error: await r.text().catch(() => '?') }
  }
  const j = await r.json()
  return {
    ok: true,
    remaining,
    consumed,
    cards: j.data || [],
    total: j.metadata?.total || 0,
  }
}

// ----------------------------------------------------------------------------
// Mapping PPT card → notre tcg_card_id
// ----------------------------------------------------------------------------
function buildTcgCardId(pptCard, lang) {
  const num = (pptCard.cardNumber || '').toString().split('/')[0].replace(/^0+/, '') || '0'
  const langPrefix = lang === 'japanese' ? 'jp' : 'en'
  // On stocke avec un setName-based key; le matching final vers tcg_cards.id
  // se fait via card_aliases côté API/route (déjà câblé).
  // Pour la table graded_prices_ppt, on utilise l'identifiant brut PPT:
  return `${langPrefix}-ppt-${pptCard.tcgPlayerId || pptCard.id}-${num}`
}

// ----------------------------------------------------------------------------
// Normalize les grades JSONB
// ----------------------------------------------------------------------------
function extractGrades(ebay) {
  if (!ebay?.salesByGrade) return { grades: {}, totals: {} }
  const grades = {}
  for (const [k, v] of Object.entries(ebay.salesByGrade)) {
    if (!v || k === 'ungraded') continue
    grades[k] = {
      smartPrice: v.smartMarketPrice?.price ?? null,
      confidence: v.smartMarketPrice?.confidence ?? null,
      method: v.smartMarketPrice?.method ?? null,
      count: v.count ?? 0,
      median: v.medianPrice ?? null,
      average: v.averagePrice ?? null,
      min: v.minPrice ?? null,
      max: v.maxPrice ?? null,
      marketTrend: v.marketTrend ?? null,
      marketPrice7Day: v.marketPrice7Day ?? null,
      dailyVolume7Day: v.dailyVolume7Day ?? null,
    }
  }
  return {
    grades,
    totals: {
      total_sales: ebay.totalSales ?? null,
      total_value: ebay.totalValue ?? null,
      date_range_start: ebay.dateRangeStart || null,
      date_range_end: ebay.dateRangeEnd || null,
    }
  }
}

// ----------------------------------------------------------------------------
// Upsert dans graded_prices_ppt
// ----------------------------------------------------------------------------
async function upsertCard(pool, pptCard, lang) {
  const tcgId = buildTcgCardId(pptCard, lang)
  const { grades, totals } = extractGrades(pptCard.ebay)

  const sql = `
    INSERT INTO graded_prices_ppt (
      tcg_card_id, ppt_card_id, ppt_tcgplayer_id,
      card_name, card_number, total_set_number, set_name, rarity, language,
      raw_market_usd, grades,
      total_sales, total_value, date_range_start, date_range_end,
      fetched_at, raw_response
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, NOW(), $16::jsonb
    )
    ON CONFLICT (tcg_card_id) DO UPDATE SET
      ppt_card_id = EXCLUDED.ppt_card_id,
      ppt_tcgplayer_id = EXCLUDED.ppt_tcgplayer_id,
      card_name = EXCLUDED.card_name,
      card_number = EXCLUDED.card_number,
      total_set_number = EXCLUDED.total_set_number,
      set_name = EXCLUDED.set_name,
      rarity = EXCLUDED.rarity,
      raw_market_usd = EXCLUDED.raw_market_usd,
      grades = EXCLUDED.grades,
      total_sales = EXCLUDED.total_sales,
      total_value = EXCLUDED.total_value,
      date_range_start = EXCLUDED.date_range_start,
      date_range_end = EXCLUDED.date_range_end,
      fetched_at = NOW(),
      raw_response = EXCLUDED.raw_response
  `
  await pool.query(sql, [
    tcgId,
    pptCard.id || '',
    pptCard.tcgPlayerId || null,
    pptCard.name || '',
    pptCard.cardNumber || null,
    pptCard.totalSetNumber || null,
    pptCard.setName || null,
    pptCard.rarity || null,
    lang,
    pptCard.prices?.market ?? null,
    JSON.stringify(grades),
    totals.total_sales,
    totals.total_value,
    totals.date_range_start,
    totals.date_range_end,
    JSON.stringify(pptCard),  // raw pour debug
  ])
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
;(async () => {
  console.log(`\n=== sync-graded-ppt ===`)
  console.log(`Language : ${language}`)
  console.log(`Sets     : ${SETS.length} (${onlySet || 'default list'})`)
  console.log(`Dry-run  : ${dryRun}`)
  console.log()

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const progress = loadJson(PROGRESS, { done: [], errors: [] })
  const done = new Set(progress.done)

  let cardsTotal = 0, cardsUpserted = 0, lastRemaining = 0

  try {
    for (const set of SETS) {
      const key = `${language}::${set}`
      if (done.has(key)) {
        console.log(`⏭️  ${set.padEnd(40)} (déjà fait)`)
        continue
      }

      const t0 = Date.now()
      const res = await fetchSet(set, language)
      lastRemaining = res.remaining || lastRemaining

      if (!res.ok) {
        console.log(`❌ ${set.padEnd(40)} status=${res.status} credits=${res.remaining}`)
        progress.errors.push({ set, language, status: res.status, error: res.error?.slice(0, 200) })
        saveJson(PROGRESS, progress)
        if (res.status === 429) { console.log('   429, attente 60s...'); await sleep(60000); continue }
        await sleep(THROTTLE_MS)
        continue
      }

      const cards = res.cards
      if (cards.length === 0) {
        console.log(`⚠️  ${set.padEnd(40)} 0 cartes (mauvais nom ?)`)
        progress.errors.push({ set, language, status: 'empty', total: res.total })
        saveJson(PROGRESS, progress)
        await sleep(THROTTLE_MS)
        continue
      }

      // Upsert
      if (!dryRun) {
        let upserted = 0
        for (const c of cards) {
          try {
            await upsertCard(pool, c, language)
            upserted++
          } catch (e) {
            progress.errors.push({ set, card: c.name, error: String(e.message).slice(0, 200) })
          }
        }
        cardsUpserted += upserted
        cardsTotal += cards.length
        done.add(key)
        progress.done = [...done]
        saveJson(PROGRESS, progress)
        const dt = Math.round((Date.now() - t0) / 1000)
        console.log(`✅ ${set.padEnd(40)} ${upserted}/${cards.length} cartes · ${dt}s · credits=${res.remaining} (consumed=${res.consumed})`)
      } else {
        console.log(`🔍 ${set.padEnd(40)} DRY-RUN ${cards.length} cartes seraient upserted · credits=${res.remaining}`)
      }

      // Safety stop
      if (lastRemaining > 0 && lastRemaining < SAFETY_MIN) {
        console.log(`\n⚠️  Credits proche du fond (${lastRemaining} < ${SAFETY_MIN}), arrêt préventif`)
        break
      }

      await sleep(THROTTLE_MS)
    }

    console.log(`\n=== RÉCAP ===`)
    console.log(`Sets traités     : ${done.size}`)
    console.log(`Cartes upserted  : ${cardsUpserted}/${cardsTotal}`)
    console.log(`Credits restants : ${lastRemaining}`)
    console.log(`Erreurs          : ${progress.errors.length}`)
    if (progress.errors.length) console.log(`  → voir ${PROGRESS}`)
  } finally {
    await pool.end()
  }
})()
