#!/usr/bin/env node
/**
 * Rebuild public/data/cards-{EN,FR,JP}.json + sets-{EN,FR,JP}.json from DB.
 * 
 * Image URL priority:
 *   1. tcg_cards.image_url (set explicitly e.g. by artofpkm import)
 *   2. TCGdex pattern (modern sets, discovered by API)
 *   3. R2 fallback (legacy sync)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'

// Priority 1: process.env (GitHub Actions / production)
// Priority 2: .env.local (local dev)
let url = process.env.NEXT_PUBLIC_SUPABASE_URL
let key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  try {
    const env = readFileSync('.env.local', 'utf-8')
    url = url || env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim()
    key = key || env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim()
  } catch {}
}
if (!url || !key) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(url, key)

async function fetchAll(table, filter) {
  const all = []
  let offset = 0
  while (true) {
    let q = sb.from(table).select('*')
    for (const [k, v] of Object.entries(filter)) q = q.eq(k, v)
    q = q.range(offset, offset + 999)
    const { data } = await q
    if (!data || data.length === 0) break
    all.push(...data)
    offset += data.length
    if (data.length < 1000) break
  }
  return all
}

// Cache TCGdex set pattern discovery
const TCGDEX_PATTERN_CACHE = new Map()

async function getTcgdexPattern(lang, setId) {
  const cacheKey = `${lang}:${setId}`
  if (TCGDEX_PATTERN_CACHE.has(cacheKey)) return TCGDEX_PATTERN_CACHE.get(cacheKey)
  
  const id = setId.replace(/^(en-|fr-|jp-)/, '')
  const apiLang = lang === 'JP' ? 'ja' : lang.toLowerCase()
  try {
    const r = await fetch(`https://api.tcgdex.net/v2/${apiLang}/sets/${id}`)
    if (!r.ok) {
      TCGDEX_PATTERN_CACHE.set(cacheKey, null)
      return null
    }
    const data = await r.json()
    const sample = (data.cards || []).find(c => c.image)
    if (!sample) {
      TCGDEX_PATTERN_CACHE.set(cacheKey, null)
      return null
    }
    const m = sample.image.match(/(https:\/\/assets\.tcgdex\.net\/[^/]+\/[^/]+\/[^/]+)\/(.+)$/)
    const pattern = m ? { base: m[1] } : { base: sample.image.replace(/\/[^/]+$/, '') }
    TCGDEX_PATTERN_CACHE.set(cacheKey, pattern)
    return pattern
  } catch {
    TCGDEX_PATTERN_CACHE.set(cacheKey, null)
    return null
  }
}

async function exportLang(lang) {
  console.log(`\n━━━ ${lang} ━━━`)
  const sets = await fetchAll('tcg_sets', { lang })
  const cards = await fetchAll('tcg_cards', { lang })
  console.log(`  Loaded ${sets.length} sets, ${cards.length} cards`)
  
  // Discover TCGdex patterns for all tcgdex-source sets that have any has_image cards
  const tcgdexSets = sets.filter(s => s.source !== 'artofpkm')
  console.log(`  Discovering TCGdex image patterns for ${tcgdexSets.length} sets...`)
  let processed = 0
  for (let i = 0; i < tcgdexSets.length; i += 5) {
    const batch = tcgdexSets.slice(i, i + 5)
    await Promise.all(batch.map(s => getTcgdexPattern(lang, s.id)))
    processed += batch.length
    if (processed % 50 === 0) console.log(`    ${processed}/${tcgdexSets.length}`)
  }
  
  // Build cardsBySet
  const cardsBySet = {}
  let imgFromUrl = 0, imgFromPattern = 0, imgMissing = 0
  
  for (const c of cards) {
    const setKey = (c.set_id || '').replace(/^(fr-|en-|jp-)/, '')
    if (!cardsBySet[setKey]) cardsBySet[setKey] = []
    
    let img = ''
    
    // Priority 1: explicit image_url
    if (c.image_url) {
      img = c.image_url
      imgFromUrl++
    }
    // Priority 2: TCGdex pattern (only for has_image=true and tcgdex source)
    else if (c.has_image && c.source !== 'artofpkm') {
      const pattern = TCGDEX_PATTERN_CACHE.get(`${lang}:${c.set_id}`)
      if (pattern) {
        img = `${pattern.base}/${c.local_id}/high.webp`
        imgFromPattern++
      } else {
        imgMissing++
      }
    } else {
      imgMissing++
    }
    
    cardsBySet[setKey].push({
      id: c.id,
      lid: c.local_id || '',
      n: c.name || '',
      img,
      r: c.rarity || '',
    })
  }
  
  // Sort cards within each set
  for (const k of Object.keys(cardsBySet)) {
    cardsBySet[k].sort((a, b) => {
      const an = parseInt((a.lid || '0').replace(/\D/g, '')) || 0
      const bn = parseInt((b.lid || '0').replace(/\D/g, '')) || 0
      return an - bn
    })
  }
  
  // Build sets array
  const setsArr = sets.map(s => ({
    id: s.id.replace(/^(fr-|en-|jp-)/, ''),
    name: s.name,
    logo: s.logo_url || null,
    serie: s.series || null,
    releaseDate: s.release_date || null,
    total: s.total_cards || cardsBySet[s.id.replace(/^(fr-|en-|jp-)/, '')]?.length || 0,
  }))
  
  writeFileSync(`public/data/cards-${lang}.json`, JSON.stringify(cardsBySet))
  writeFileSync(`public/data/sets-${lang}.json`, JSON.stringify(setsArr))
  
  console.log(`  Image sources: image_url=${imgFromUrl} | tcgdex_pattern=${imgFromPattern} | missing=${imgMissing}`)
  console.log(`  Total: ${imgFromUrl + imgFromPattern}/${cards.length} cards with image (${((imgFromUrl + imgFromPattern) / cards.length * 100).toFixed(1)}%)`)
  console.log(`  ✅ Saved`)
}

(async () => {
  console.log('🔄 Rebuilding static JSON files from DB\n')
  for (const lang of ['EN', 'FR', 'JP']) {
    await exportLang(lang)
  }
  console.log('\n✅ Done. Hard refresh browser (Cmd+Shift+R).')
})()
