#!/usr/bin/env node
/**
 * Rebuild public/data/cards-{EN,FR,JP}.json + sets-{EN,FR,JP}.json from DB.
 * 
 * Image URL priority:
 *   1. tcg_cards.image_url (set explicitly e.g. by artofpkm import)
 *   2. TCGdex pattern (modern sets, discovered by API)
 *   3. R2 fallback (legacy sync)
 */
import { neon } from '@neondatabase/serverless'
import { readFileSync, writeFileSync } from 'fs'

// Priority 1: process.env (GitHub Actions / production)
// Priority 2: .env.local (local dev)
let databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  for (const file of ['.env.production.local', '.env.local']) {
    try {
      const env = readFileSync(file, 'utf-8')
      const mm = env.match(/^DATABASE_URL=(.+)$/m)
      if (mm) { databaseUrl = mm[1].trim().replace(/^["']|["']$/g, ''); break }
    } catch {}
  }
}
if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL')
  process.exit(1)
}
const sql = neon(databaseUrl)

async function fetchAll(table, filter) {
  // Whitelist des tables autorisees (anti-injection sur nom de table)
  const ALLOWED = ['tcg_cards', 'tcg_sets']
  if (!ALLOWED.includes(table)) throw new Error(`Table non autorisee: ${table}`)
  const all = []
  let offset = 0
  // Construit la clause WHERE parametree depuis le filtre
  const keys = Object.keys(filter)
  const whereClause = keys.length
    ? 'WHERE ' + keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ')
    : ''
  const baseParams = keys.map((k) => filter[k])
  while (true) {
    const text = `SELECT * FROM ${table} ${whereClause} ORDER BY 1 LIMIT 1000 OFFSET ${offset}`
    const data = await sql.query(text, baseParams)
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
  let sets = await fetchAll('tcg_sets', { lang })
  let cards = await fetchAll('tcg_cards', { lang })
  // JP: ne garder que PPT (aopkm/artofpkm deprecie, remplace par PPT)
  if (lang === 'JP') {
    sets = sets.filter(s => s.source === 'ppt')
    cards = cards.filter(c => c.source === 'ppt')
    console.log(`  JP: filtre source=ppt -> ${sets.length} sets, ${cards.length} cards`)
  }
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
    
    // JP PPT: laisser img vide -> l'app reconstruit l'URL R2 via getCardImageUrl
    // (jp/{slug}/{localId}.jpg). NE PAS mettre l'image_url TCGPlayer CDN (souvent 403).
    if (lang === 'JP' && c.source === 'ppt') {
      img = ''  // has_image gere cote client par le fallback getCardImageUrl
      if (c.has_image) imgFromUrl++; else imgMissing++
    }
    // Priority 1: explicit image_url (EN/FR ou autres sources)
    else if (c.image_url) {
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
