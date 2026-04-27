#!/usr/bin/env node
/**
 * Import artofpkm-cards.json into Supabase tcg_sets + tcg_cards.
 * Handles duplicate localIds within a set by adding -2, -3 suffix.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf-8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim()
const sb = createClient(url, key)

const data = JSON.parse(readFileSync('scripts/data/artofpkm-cards.json', 'utf-8'))
console.log(`Loaded ${Object.keys(data).length} sets\n`)

const ERA_TO_SERIES = {
  'MEGA':              'mega',
  'Scarlet & Violet':  'sv',
  'Sword & Shield':    'swsh',
  'Sun & Moon':        'sm',
  'X&Y BREAK':         'xy',
  'X&Y':               'xy',
  'Black & White':     'bw',
  'LEGEND':            'hgss',
  'DPt':               'dp',
  'DP':                'dp',
  'PCG':               'ex',
  'ADV':               'ex',
  'e-Card':            'ecard',
  'VS & Web':          'neo',
  'Neo':               'neo',
  'PMCG':              'base',
}

// Build sets to upsert
const setsToUpsert = []
for (const [aopkmId, info] of Object.entries(data)) {
  if (info.error || !info.cards || info.cards.length === 0) continue
  setsToUpsert.push({
    id: `aopkm-${aopkmId}`,
    name: info.setName || `Set ${aopkmId}`,
    lang: 'JP',
    total_cards: info.cards.length,
    series: ERA_TO_SERIES[info.era] || null,
    era: info.era || null,
    artofpkm_id: aopkmId,
    artofpkm_url: info.url || `https://www.artofpkm.com/sets/${aopkmId}`,
    source: 'artofpkm',
    is_active: true,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
}

console.log(`Upserting ${setsToUpsert.length} sets...`)
let setsUpserted = 0
for (let i = 0; i < setsToUpsert.length; i += 100) {
  const batch = setsToUpsert.slice(i, i + 100)
  const { error } = await sb.from('tcg_sets').upsert(batch, { onConflict: 'id' })
  if (error) { console.error(error.message); break }
  setsUpserted += batch.length
}
console.log(`Sets done: ${setsUpserted}\n`)

// Build cards with disambiguated IDs
console.log('Building cards (with dup disambiguation)...')
const cardsToUpsert = []
let totalDupsResolved = 0

for (const [aopkmId, info] of Object.entries(data)) {
  if (info.error || !info.cards) continue
  
  // Track localId occurrences within this set
  const localIdCounter = {}
  
  for (const c of info.cards) {
    const lid = c.localId
    localIdCounter[lid] = (localIdCounter[lid] || 0) + 1
    
    // First occurrence: keep localId as is
    // 2nd, 3rd, etc.: append -2, -3, ...
    let finalLocalId = lid
    if (localIdCounter[lid] > 1) {
      finalLocalId = `${lid}-${localIdCounter[lid]}`
      totalDupsResolved++
    }
    
    cardsToUpsert.push({
      id: `aopkm-${aopkmId}-${finalLocalId}`,
      set_id: `aopkm-${aopkmId}`,
      local_id: finalLocalId,
      name: c.name || '',
      lang: 'JP',
      image_url: c.image,
      has_image: true,
      image_synced_at: new Date().toISOString(),
      source: 'artofpkm',
      is_active: true,
      synced_at: new Date().toISOString(),
    })
  }
}

console.log(`Total cards: ${cardsToUpsert.length}`)
console.log(`Duplicates resolved with suffix: ${totalDupsResolved}\n`)

// Final dedup check (should be 0)
const ids = cardsToUpsert.map(c => c.id)
const idSet = new Set(ids)
if (ids.length !== idSet.size) {
  console.error(`⚠️  Still ${ids.length - idSet.size} duplicate IDs after disambiguation!`)
  // Find them
  const counts = {}
  for (const id of ids) counts[id] = (counts[id] || 0) + 1
  for (const [id, n] of Object.entries(counts)) {
    if (n > 1) console.error(`  ${id}: ${n}x`)
  }
  process.exit(1)
}

console.log('✅ All IDs unique. Upserting...')
let cardsUpserted = 0
const startTime = Date.now()
for (let i = 0; i < cardsToUpsert.length; i += 500) {
  const batch = cardsToUpsert.slice(i, i + 500)
  const { error } = await sb.from('tcg_cards').upsert(batch, { onConflict: 'id' })
  if (error) {
    console.error(`Batch error at ${i}: ${error.message}`)
    break
  }
  cardsUpserted += batch.length
  const elapsed = (Date.now() - startTime) / 1000
  const rate = cardsUpserted / elapsed || 1
  const eta = Math.round((cardsToUpsert.length - cardsUpserted) / rate)
  if (cardsUpserted % 2500 === 0 || cardsUpserted === cardsToUpsert.length) {
    console.log(`  Cards: ${cardsUpserted}/${cardsToUpsert.length} | ${rate.toFixed(0)}/s | ETA ${eta}s`)
  }
}

console.log(`\n━━━ DONE ━━━`)
console.log(`Sets:  ${setsUpserted}`)
console.log(`Cards: ${cardsUpserted}`)
console.log(`Time: ${Math.round((Date.now() - startTime) / 1000)}s`)
