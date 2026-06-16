const { createClient } = require('@supabase/supabase-js')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const BUCKET = 'card-images'
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`
const DELAY = 60
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchJSON(url) {
  try { const r = await fetch(url); if (!r.ok) return null; return r.json() } catch { return null }
}

async function imageExists(path) {
  const parts = path.split('/')
  const folder = parts.slice(0,-1).join('/')
  const file = parts[parts.length-1]
  const { data } = await supabase.storage.from(BUCKET).list(folder, { search: file })
  return data && data.length > 0
}

async function copyImage(fromPath, toPath) {
  try {
    const { data: blob } = await supabase.storage.from(BUCKET).download(fromPath)
    if (!blob) return false
    const buffer = Buffer.from(await blob.arrayBuffer())
    const ext = fromPath.endsWith('.jpg') ? 'image/jpeg' : 'image/webp'
    const { error } = await supabase.storage.from(BUCKET).upload(toPath, buffer, { contentType: ext, upsert: true })
    return !error
  } catch { return false }
}

// ── Normalize JP name for fuzzy matching ──
function normalize(name) {
  if (!name) return ''
  return name
    // Full-width → half-width
    .replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    // Common Pokemon suffixes normalization
    .replace(/\s+/g, '')
    .replace(/ー/g, '')  // long vowel mark
    .replace(/・/g, '')  // middle dot
    .replace(/\(/g, '').replace(/\)/g, '')
    .replace(/（/g, '').replace(/）/g, '')
    .replace(/「/g, '').replace(/」/g, '')
    .replace(/『/g, '').replace(/』/g, '')
    .replace(/EX$/i, 'ex')
    .replace(/GX$/i, 'gx')
    .replace(/V$/i, 'v')
    .replace(/VMAX$/i, 'vmax')
    .replace(/VSTAR$/i, 'vstar')
    .replace(/ex$/i, 'ex')
    .toLowerCase()
}

// Extract base Pokemon name (before ex/V/GX etc)
function baseName(name) {
  if (!name) return ''
  return name
    .replace(/\s*(ex|EX|GX|gx|V|VMAX|VSTAR|BREAK|δ|☆|◇|♢|LV\.X|FB|GL|[CEG4])$/g, '')
    .replace(/\s+/g, '')
    .trim()
}

async function main() {
  console.log('═══ Improved JP Mapping — fuzzy + base name + set matching ═══\n')

  // 1. Load all JP cards from DB
  console.log('Loading JP cards from DB...')
  let jpCards = []
  let page = 0
  while (true) {
    const { data } = await supabase
      .from('tcg_cards')
      .select('id, name, local_id, set_id, image_local')
      .eq('lang', 'JP')
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (!data || data.length === 0) break
    jpCards.push(...data)
    page++
  }
  console.log(`  ${jpCards.length} JP cards in DB`)

  // Build multiple indexes
  const exactMap = new Map()     // exact name → cards
  const normalMap = new Map()    // normalized name → cards
  const baseMap = new Map()      // base pokemon name → cards

  for (const card of jpCards) {
    const name = card.name?.trim()
    if (!name) continue
    const setCode = card.set_id?.replace('jp-', '') || ''
    const entry = { setCode, cardId: card.local_id }

    // Exact
    if (!exactMap.has(name)) exactMap.set(name, [])
    exactMap.get(name).push(entry)

    // Normalized
    const norm = normalize(name)
    if (!normalMap.has(norm)) normalMap.set(norm, [])
    normalMap.get(norm).push(entry)

    // Base name
    const base = baseName(name)
    if (base && base.length > 1) {
      if (!baseMap.has(base)) baseMap.set(base, [])
      baseMap.get(base).push(entry)
    }
  }

  console.log(`  Exact: ${exactMap.size} names`)
  console.log(`  Normalized: ${normalMap.size} names`)
  console.log(`  Base: ${baseMap.size} names\n`)

  // 2. TCGDex JP set → pokemon-card.com set mapping (best guess by era)
  const SET_MAP = {
    // Sword & Shield era
    'S1H':'S1H', 'S1W':'S1W', 'S2':'S2', 'S3':'SV3', 'S3a':'S3a', 'S4':'SV4K',
    'S4a':'S4a', 'S5R':'S5R', 'S5I':'S5R', 'S6K':'SV6', 'S6H':'SV6',
    'S7R':'S7R', 'S7D':'S7R', 'S8':'SV8', 'S8a':'S8a', 'S8b':'S8b',
    'S9':'S9', 'S9a':'S9a', 'S10':'SV10', 'S10b':'S10b', 'S11':'SV11W',
    'S11a':'S11a', 'S12':'S12', 'S12a':'S12a',
    // SV era
    'SV1S':'SV1S', 'SV1V':'SV1V', 'SV1a':'SV1a', 'SV2D':'SV2D', 'SV2P':'SV2P',
    'SV2a':'SV2a', 'SV3':'SV3', 'SV3a':'SV3a', 'SV4K':'SV4K', 'SV4M':'SV4M',
    'SV4a':'SV4a', 'SV5K':'SV5K', 'SV5M':'SV5K', 'SV5a':'SV5a',
    'SV6':'SV6', 'SV6a':'SV6a', 'SV7':'SV7', 'SV7a':'SV7a',
    'SV8':'SV8', 'SV8a':'SV8a', 'SV9':'SV9', 'SV9a':'SV9a',
    'SV10':'SV10', 'SV11B':'SV11B', 'SV11W':'SV11W',
    'SVLS':'SVLS', 'SVLN':'SVLN', 'SVK':'SVK',
    // SM era
    'SM1S':'SM1S', 'SM1M':'SM1M', 'SM1p':'SM1p', 'SM2p':'SM2p',
    'SM3p':'SM3p', 'SM4p':'SM4p', 'SM5S':'SM5S', 'SM5M':'SM5M',
    'SM5p':'SM5p', 'SM6':'SM6', 'SM6b':'SM6b', 'SM7':'SM7', 'SM7a':'SM7a',
    'SM8':'SM8', 'SM8b':'SM8b', 'SM9':'SM9', 'SM9a':'SM9a', 'SM9b':'SM9b',
    'SM10':'SM10', 'SM11':'SM11', 'SM11a':'SM11a', 'SM12a':'SM12a',
    'SMA':'SMA', 'SMB':'SMB', 'SMC':'SMC', 'SMD':'SMD', 'SME':'SME',
    'SMF':'SMF', 'SMG':'SMG', 'SMH':'SMH', 'SMI':'SMI', 'SMJ':'SMJ',
    'SMK':'SMK', 'SML':'SML', 'SMM':'SMM', 'SMN':'SMN', 'SMP':'SMP',
    // Mega era
    'M1S':'M1S', 'M1L':'M1S', 'M2':'M2', 'M2a':'M2a', 'M3':'M3', 'M4':'M4',
    // XY era
    'XYA':'XYA', 'XYB':'XYB', 'XYC':'XYC', 'XYD':'XYD', 'XYE':'XYE',
    'XYF':'XYF', 'XYG':'XYG', 'XYH':'XYH',
    // BW era
    'BW1':'BW', 'BWP':'BWP',
    // DP era  
    'DP1':'DP1', 'DP2':'DP2', 'DP3':'DP3', 'DP4':'DP4', 'DP5':'DP5',
    'DPP':'DPP',
  }

  // 3. Iterate TCGDex JP sets
  const tcgdexSets = await fetchJSON('https://api.tcgdex.net/v2/ja/sets')
  if (!tcgdexSets) return
  console.log(`Processing ${tcgdexSets.length} TCGDex JP sets...\n`)

  let mapped = 0, skipped = 0, notFound = 0
  const batch = []
  const methods = { exact: 0, normalized: 0, base: 0 }

  for (const set of tcgdexSets) {
    const setData = await fetchJSON(`https://api.tcgdex.net/v2/ja/sets/${set.id}`)
    if (!setData?.cards) continue

    let setMapped = 0

    for (const card of setData.cards) {
      const jpName = card.name?.trim()
      if (!jpName) continue

      const destPath = `jp/${set.id}/${card.localId}.jpg`
      const exists = await imageExists(destPath)
      if (exists) { skipped++; continue }

      // Try matching strategies in order
      let match = null
      let method = ''

      // Strategy 1: Exact name match
      const exactMatches = exactMap.get(jpName)
      if (exactMatches?.length) {
        // Prefer same set if mapped
        const mappedSet = SET_MAP[set.id]
        match = mappedSet
          ? exactMatches.find(m => m.setCode === mappedSet) || exactMatches[0]
          : exactMatches[0]
        method = 'exact'
      }

      // Strategy 2: Normalized name match
      if (!match) {
        const norm = normalize(jpName)
        const normMatches = normalMap.get(norm)
        if (normMatches?.length) {
          const mappedSet = SET_MAP[set.id]
          match = mappedSet
            ? normMatches.find(m => m.setCode === mappedSet) || normMatches[0]
            : normMatches[0]
          method = 'normalized'
        }
      }

      // Strategy 3: Base pokemon name (without suffix)
      if (!match) {
        const base = baseName(jpName)
        if (base && base.length > 2) {
          const baseMatches = baseMap.get(base)
          if (baseMatches?.length) {
            match = baseMatches[0]
            method = 'base'
          }
        }
      }

      // Strategy 4: Partial match — first 3+ chars of name
      if (!match && jpName.length >= 3) {
        const prefix = jpName.slice(0, Math.min(jpName.length, 4))
        for (const [name, entries] of exactMap) {
          if (name.startsWith(prefix)) {
            match = entries[0]
            method = 'base'
            break
          }
        }
      }

      if (match) {
        const sourcePath = `jp/${match.setCode}/${match.cardId}.jpg`
        const ok = await copyImage(sourcePath, destPath)
        if (ok) {
          setMapped++
          mapped++
          methods[method] = (methods[method] || 0) + 1

          batch.push({
            id: `jp-tcgdex-${set.id}-${card.localId}`,
            set_id: `jp-${set.id}`,
            local_id: card.localId,
            name: jpName,
            lang: 'JP',
            image_local: `${STORAGE_BASE}/${destPath}`,
            synced_at: new Date().toISOString(),
          })

          if (batch.length >= 200) {
            await supabase.from('tcg_cards').upsert(batch, { onConflict: 'id' })
            batch.length = 0
          }
        } else { notFound++ }
      } else {
        notFound++
      }

      await sleep(DELAY)
    }

    if (setMapped > 0) {
      console.log(`  ${set.id} (${set.name}): +${setMapped} mapped`)
    }
  }

  if (batch.length > 0) {
    await supabase.from('tcg_cards').upsert(batch, { onConflict: 'id' })
  }

  console.log(`\n═══ IMPROVED MAPPING COMPLETE ═══`)
  console.log(`  New mapped: ${mapped}`)
  console.log(`  Already had: ${skipped}`)
  console.log(`  Still missing: ${notFound}`)
  console.log(`  Methods: exact=${methods.exact}, normalized=${methods.normalized}, base=${methods.base}`)
}

main().catch(console.error)
