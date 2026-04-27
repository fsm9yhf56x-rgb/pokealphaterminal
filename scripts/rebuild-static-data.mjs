#!/usr/bin/env node
/**
 * Rebuild public/data/cards-{EN,FR,JP}.json + sets-{EN,FR,JP}.json from DB.
 * Format strictly identical to current files (no UI changes needed).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf-8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim()
const sb = createClient(url, key)

const R2_BASE = 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev'
const TCGDEX_BASE = 'https://assets.tcgdex.net'

// Series prefix → TCGdex path
const SERIES_MAP = {
  ecard1: 'ecard', ecard2: 'ecard', ecard3: 'ecard',
  base1: 'base', base2: 'base', base3: 'base', base4: 'base', base5: 'base', basep: 'base',
  neo1: 'neo', neo2: 'neo', neo3: 'neo', neo4: 'neo',
  gym1: 'gym', gym2: 'gym',
  dp1: 'dp', dp2: 'dp', dp3: 'dp', dp4: 'dp', dp5: 'dp', dp6: 'dp', dp7: 'dp',
  pl1: 'pl', pl2: 'pl', pl3: 'pl', pl4: 'pl',
  hgss1: 'hgss', hgss2: 'hgss', hgss3: 'hgss', hgss4: 'hgss', hgssp: 'hgss',
  col1: 'col',
  bw: 'bw', xy: 'xy', sm: 'sm', swsh: 'swsh', sv: 'sv',
  ex: 'ex',
  pop: 'pop', cel25: 'cel25',
  me01: 'me', me02: 'me', me03: 'me', mep: 'me', mee: 'me',
  A1: 'A1', A2: 'A2', A3: 'A3', A4: 'A4',
  P: 'P-A',
}

function getSeries(setId) {
  const id = setId.replace(/^(fr-|en-|jp-)/, '')
  for (const k of Object.keys(SERIES_MAP).sort((a, b) => b.length - a.length)) {
    if (id.startsWith(k)) return SERIES_MAP[k]
  }
  return id.match(/^([a-z]+)/i)?.[1] || id
}

// Build the image URL for a card (R2 first, then TCGdex fallback)
function buildImageUrl(card, lang) {
  if (!card.has_image) return ''
  
  const setId = card.set_id.replace(/^(fr-|en-|jp-)/, '')
  const series = getSeries(card.set_id)
  const langPath = lang.toLowerCase() === 'jp' ? 'ja' : lang.toLowerCase()
  
  // For modern sets covered by R2 (sync-ed images), use R2
  // For vintage/recent, fallback to TCGdex
  // Format: https://pub-{hash}.r2.dev/{lang}/{setId}/{localId}.webp
  return `${R2_BASE}/${langPath}/${setId}/${card.local_id}.webp`
}

// Fetch all rows from a table with pagination
async function fetchAll(tableName, filter) {
  const all = []
  let offset = 0
  while (true) {
    let query = sb.from(tableName).select('*')
    for (const [k, v] of Object.entries(filter)) query = query.eq(k, v)
    query = query.range(offset, offset + 999)
    const { data, error } = await query
    if (error) {
      console.error(`Error: ${error.message}`)
      break
    }
    if (!data || data.length === 0) break
    all.push(...data)
    offset += data.length
    if (data.length < 1000) break
  }
  return all
}

async function exportLang(lang) {
  console.log(`\n━━━ Exporting ${lang} ━━━`)
  
  const sets = await fetchAll('tcg_sets', { lang })
  console.log(`  Sets: ${sets.length}`)
  
  const cards = await fetchAll('tcg_cards', { lang })
  console.log(`  Cards: ${cards.length}`)
  
  // Group cards by set_id (stripped of lang prefix)
  const cardsBySet = {}
  for (const c of cards) {
    const setKey = (c.set_id || '').replace(/^(fr-|en-|jp-)/, '')
    if (!cardsBySet[setKey]) cardsBySet[setKey] = []
    cardsBySet[setKey].push({
      id: c.id,
      lid: c.local_id || '',
      n: c.name || '',
      img: buildImageUrl(c, lang),
      r: c.rarity || '',
    })
  }
  
  // Sort cards within each set by local_id (numeric)
  for (const setKey of Object.keys(cardsBySet)) {
    cardsBySet[setKey].sort((a, b) => {
      const an = parseInt((a.lid || '0').replace(/\D/g, '')) || 0
      const bn = parseInt((b.lid || '0').replace(/\D/g, '')) || 0
      return an - bn
    })
  }
  
  // Sets array (matching the existing format)
  const setsArr = sets.map(s => ({
    id: s.id.replace(/^(fr-|en-|jp-)/, ''),
    name: s.name,
    logo: s.logo_url || null,
    serie: s.series || null,
    releaseDate: s.release_date || null,
    total: s.total_cards || cardsBySet[s.id.replace(/^(fr-|en-|jp-)/, '')]?.length || 0,
  }))
  
  // Write files
  const cardsPath = `public/data/cards-${lang}.json`
  const setsPath = `public/data/sets-${lang}.json`
  
  writeFileSync(cardsPath, JSON.stringify(cardsBySet))
  writeFileSync(setsPath, JSON.stringify(setsArr))
  
  // File size info
  const cardsSize = (Buffer.byteLength(JSON.stringify(cardsBySet)) / 1024 / 1024).toFixed(2)
  const setsSize = (Buffer.byteLength(JSON.stringify(setsArr)) / 1024).toFixed(0)
  
  console.log(`  ✅ ${cardsPath} (${cardsSize} MB, ${cards.length} cards)`)
  console.log(`  ✅ ${setsPath} (${setsSize} KB, ${setsArr.length} sets)`)
  
  return { cards: cards.length, sets: setsArr.length }
}

(async () => {
  console.log('🔄 Rebuilding static data files from DB\n')
  
  const stats = {}
  for (const lang of ['EN', 'FR', 'JP']) {
    stats[lang] = await exportLang(lang)
  }
  
  console.log('\n━━━ Summary ━━━')
  for (const lang of ['EN', 'FR', 'JP']) {
    console.log(`  ${lang}: ${stats[lang].cards} cards / ${stats[lang].sets} sets`)
  }
  console.log('\n✅ Done. Restart dev server (Ctrl+C, npm run dev) to see updates.')
})()
