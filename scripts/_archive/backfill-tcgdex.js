#!/usr/bin/env node
/**
 * Backfill tcg_cards : rarity + variants_simple + variants_detailed depuis TCGdex API.
 * Resumable via .tcgdex-progress.json
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const BASE = 'https://api.tcgdex.net/v2'
const PROGRESS_FILE = path.join(__dirname, '..', '.tcgdex-progress.json')
const BATCH_FETCH = 10
const BATCH_UPDATE = 100
const DELAY_BETWEEN_BATCHES = 200

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const delay = ms => new Promise(r => setTimeout(r, ms))
const LANG_MAP = { EN: 'en', FR: 'fr' }

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')) }
  catch { return { processedIds: [] } }
}
function saveProgress(p) { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p)) }

let firstError = null

// Convertit l'objet variants TCGdex en array de variants actifs
function variantsToArray(v) {
  if (!v || typeof v !== 'object') return null
  const active = Object.entries(v).filter(([_, val]) => val === true).map(([k]) => k)
  return active.length > 0 ? active : null
}

async function fetchCardData(lang, cardId) {
  const apiCode = LANG_MAP[lang]
  if (!apiCode) return null

  let stripped = cardId
  if (cardId.startsWith('en-')) stripped = cardId.slice(3)
  else if (cardId.startsWith('fr-')) stripped = cardId.slice(3)

  const url = `${BASE}/${apiCode}/cards/${stripped}`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      if (!firstError) {
        firstError = `${res.status} on ${url}`
        console.log(`First fetch error: ${firstError}`)
      }
      return null
    }
    const data = await res.json()
    return {
      rarity: data.rarity || null,
      hp: data.hp || null,
      card_type: data.category || null,
      variants_simple: variantsToArray(data.variants),
      variants_detailed: data.variants_detailed || null,
    }
  } catch (e) {
    if (!firstError) {
      firstError = `Exception: ${e.message} on ${url}`
      console.log(`First fetch error: ${firstError}`)
    }
    return null
  }
}

async function processBatch(cards) {
  const results = await Promise.all(cards.map(async c => {
    const data = await fetchCardData(c.lang, c.id)
    return { id: c.id, ...data }
  }))
  return results.filter(r => r && (r.rarity || r.variants_simple))
}

async function updateBatch(rows) {
  await Promise.all(rows.map(r =>
    supa.from('tcg_cards')
      .update({
        rarity: r.rarity,
        hp: r.hp,
        card_type: r.card_type,
        variants_simple: r.variants_simple,
        variants_detailed: r.variants_detailed,
      })
      .eq('id', r.id)
  ))
}

async function main() {
  console.log(`[${new Date().toISOString()}] Backfill TCGdex (rarity + variants) start`)
  const progress = loadProgress()
  const processed = new Set(progress.processedIds)
  console.log(`Resume: ${processed.size} cards already processed`)

  let allCards = []
  let offset = 0, pageSize = 1000

  console.log('Fetching all EN+FR cards (rarity OR variants null)...')
  while (true) {
    const { data, error } = await supa
      .from('tcg_cards')
      .select('id, lang, set_id')
      .in('lang', ['EN', 'FR'])
      .or('rarity.is.null,variants_simple.is.null')
      .range(offset, offset + pageSize - 1)
    if (error) { console.error(error); process.exit(1) }
    if (!data || data.length === 0) break
    allCards.push(...data)
    if (data.length < pageSize) break
    offset += pageSize
  }
  console.log(`Total EN+FR cards to process: ${allCards.length}`)

  allCards = allCards.filter(c => !processed.has(c.id))
  console.log(`After resume filter: ${allCards.length} remaining`)

  if (allCards[0]) {
    console.log(`Sample first card: ${allCards[0].id} (${allCards[0].lang})`)
  }

  let totalProcessed = 0, totalWithRarity = 0, totalWithVariants = 0

  for (let i = 0; i < allCards.length; i += BATCH_FETCH) {
    const chunk = allCards.slice(i, i + BATCH_FETCH)
    const results = await processBatch(chunk)

    if (results.length > 0) {
      for (let j = 0; j < results.length; j += BATCH_UPDATE) {
        await updateBatch(results.slice(j, j + BATCH_UPDATE))
      }
      totalWithRarity += results.filter(r => r.rarity).length
      totalWithVariants += results.filter(r => r.variants_simple).length
    }

    totalProcessed += chunk.length
    chunk.forEach(c => processed.add(c.id))

    if (totalProcessed % 500 === 0 || totalProcessed === allCards.length) {
      saveProgress({ processedIds: [...processed] })
      const pct = Math.round(100 * totalProcessed / allCards.length)
      console.log(`[${pct}%] ${totalProcessed}/${allCards.length} processed | rarity: ${totalWithRarity} | variants: ${totalWithVariants}`)
    }
    await delay(DELAY_BETWEEN_BATCHES)
  }

  saveProgress({ processedIds: [...processed] })
  console.log(`\n✓ Done. ${totalWithRarity} rarity + ${totalWithVariants} variants on ${totalProcessed} cards.`)
}

main().catch(e => { console.error(e); process.exit(1) })
