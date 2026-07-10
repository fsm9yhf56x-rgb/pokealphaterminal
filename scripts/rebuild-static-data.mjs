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
  const ALLOWED = ['tcg_cards', 'tcg_sets', 'k_cards_export', 'k_sets_export']
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
  let sets = await fetchAll('k_sets_export', { lang })
  let cards = await fetchAll('k_cards_export', { lang })
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
  
  // --- Repli cross-langue (FR/JP sans image -> EN puis JP) : via la base, pas de HEAD reseau ---
  const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev'
  const normSet = (id) => (id||'').replace(/^(en|fr|jp)-/i,'').replace(/-shadowless(-ns)?$/i,'').replace(/-1st(-ed|-edition)?$/i,'').replace(/-unlimited$/i,'')
  const printKey = (c) => c.print_id ? normSet(c.print_id) : normSet((normSet(c.set_id) + '-' + (c.local_id||'')))

  // Carte cross-langue : quelles langues ont une image pour chaque carte ?
  // k_cards_export n'expose pas print_id -> on requete k_cards (qui l'a) et on
  // construit la MEME cle que printKey() : normSet(set_id depuis le print) + '-' + local_id.
  // k_cards: id, print_id, lang, has_image ; le print_id encode deja set+numero.
  const imgRows = await sql`select print_id, lang from k_cards where has_image = true`
  const imgByPrint = new Map()
  for (const r of imgRows) {
    const k = normSet(r.print_id)            // print_id ex: base1-4 / jp-569634 -> cle stable
    if (!k) continue
    if (!imgByPrint.has(k)) imgByPrint.set(k, new Set())
    imgByPrint.get(k).add(String(r.lang||'').toLowerCase())
  }

  // Patterns TCGdex des langues de repli (EN, JP) pour reconstruire leurs URLs depuis ce build
  const fbLangs = lang === 'EN' ? ['jp'] : lang === 'FR' ? ['en','jp'] : ['en']
  for (const L of fbLangs) {
    const LU = L.toUpperCase()
    for (let i = 0; i < tcgdexSets.length; i += 6) {
      await Promise.all(tcgdexSets.slice(i, i+6).map(st => getTcgdexPattern(LU, st.id)))
    }
  }

  // URL NATIVE de la langue en cours de build (priorite sur c.image_url qui est
  // souvent l'URL EN en dur). Ne renvoie une URL que si imgByPrint confirme que la
  // langue courante a bien une image pour cette carte -> pas de 404, pas de reseau.
  function resolveNative(c) {
    const have = imgByPrint.get(printKey(c))
    const L = lang.toLowerCase()
    if (!have || !have.has(L)) return null
    const pat = TCGDEX_PATTERN_CACHE.get(`${lang}:${c.set_id}`)
             || TCGDEX_PATTERN_CACHE.get(`${lang}:${normSet(c.set_id)}`)
    if (pat) return `${pat.base}/${c.local_id}/high.webp`
    const ext = L === 'jp' ? 'jpg' : 'webp'
    return `${R2_BASE}/${L}/${normSet(c.set_id)}/${c.local_id}.${ext}`
  }

  function resolveCrossLang(c) {
    const k = printKey(c)
    const have = imgByPrint.get(k)
    if (!have) return null
    for (const L of fbLangs) {
      if (!have.has(L)) continue
      const pat = TCGDEX_PATTERN_CACHE.get(`${L.toUpperCase()}:${c.set_id}`)
                || TCGDEX_PATTERN_CACHE.get(`${L.toUpperCase()}:${normSet(c.set_id)}`)
      if (pat) return { url: `${pat.base}/${c.local_id}/high.webp`, lang: L }
      const ext = L === 'jp' ? 'jpg' : 'webp'
      return { url: `${R2_BASE}/${L}/${normSet(c.set_id)}/${c.local_id}.${ext}`, lang: L }
    }
    return null
  }

  // Build cardsBySet
  const cardsBySet = {}
  let imgFromUrl = 0, imgFromPattern = 0, imgFromFallback = 0, imgMissing = 0
  
  for (const c of cards) {
    const setKey = (c.set_id || '').replace(/^(fr-|en-|jp-)/, '')
    if (!cardsBySet[setKey]) cardsBySet[setKey] = []
    
    let img = ''
    let imgLang = c.image_url ? lang.toLowerCase() : ''
    
    // JP PPT: laisser img vide -> l'app reconstruit l'URL R2 via getCardImageUrl
    // (jp/{slug}/{localId}.jpg). NE PAS mettre l'image_url TCGPlayer CDN (souvent 403).
    if (lang === 'JP' && c.source === 'ppt') {
      img = ''  // has_image gere cote client par le fallback getCardImageUrl
      if (c.has_image) { imgFromUrl++; imgLang = 'jp' } else { const fb = resolveCrossLang(c); if (fb) { img = fb.url; imgLang = fb.lang; imgFromFallback++ } else imgMissing++ }
    }
    // Priority 1: image NATIVE de la langue courante si elle existe (evite de
    // recopier une image_url EN sur une carte FR/JP). Sinon, on garde image_url.
    else if (resolveNative(c)) {
      img = resolveNative(c)
      imgLang = lang.toLowerCase()
      imgFromPattern++
    }
    else if (c.image_url) {
      img = c.image_url
      imgFromUrl++
    }
    // Priority 2: TCGdex pattern (only for has_image=true and tcgdex source)
    else if (c.has_image && c.source !== 'artofpkm') {
      const pattern = TCGDEX_PATTERN_CACHE.get(`${lang}:${c.set_id}`)
      if (pattern) {
        img = `${pattern.base}/${c.local_id}/high.webp`
        imgLang = lang.toLowerCase()
        imgFromPattern++
      } else {
        const fb = resolveCrossLang(c)
        if (fb) { img = fb.url; imgLang = fb.lang; imgFromFallback++ } else imgMissing++
      }
    }
    // Priority 2.5: pas d'image native -> repli langue (EN puis JP)
    else {
      const fb = resolveCrossLang(c)
      if (fb) { img = fb.url; imgLang = fb.lang; imgFromFallback++ } else imgMissing++
    }
    
    cardsBySet[setKey].push({
      id: c.id,
      lid: c.local_id || '',
      n: c.name || '',
      img,
      imgLang: imgLang || undefined,
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
  
  console.log(`  Image sources: image_url=${imgFromUrl} | tcgdex=${imgFromPattern} | fallback_lang=${imgFromFallback} | missing=${imgMissing}`)
  console.log(`  Total: ${imgFromUrl + imgFromPattern + imgFromFallback}/${cards.length} cards with image (${((imgFromUrl + imgFromPattern + imgFromFallback) / cards.length * 100).toFixed(1)}%)`)
  console.log(`  ✅ Saved`)
}

(async () => {
  console.log('🔄 Rebuilding static JSON files from DB\n')
  for (const lang of ['EN', 'FR', 'JP']) {
    await exportLang(lang)
  }
  console.log('\n✅ Done. Hard refresh browser (Cmd+Shift+R).')
})()
