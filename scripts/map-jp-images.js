const { createClient } = require('@supabase/supabase-js')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const BUCKET = 'card-images'
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`
const DELAY = 80
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
  const { data: blob } = await supabase.storage.from(BUCKET).download(fromPath)
  if (!blob) return false
  const buffer = Buffer.from(await blob.arrayBuffer())
  const ext = fromPath.endsWith('.jpg') ? 'image/jpeg' : 'image/webp'
  const { error } = await supabase.storage.from(BUCKET).upload(toPath, buffer, { contentType: ext, upsert: true })
  return !error
}

async function main() {
  console.log('═══ Mapping TCGDex JP → pokemon-card.com JP images ═══\n')

  // 1. Load all JP cards from our DB (pokemon-card.com source)
  console.log('Loading JP cards from DB...')
  let jpCards = []
  let page = 0
  while (true) {
    const { data, error } = await supabase
      .from('tcg_cards')
      .select('id, name, local_id, set_id, image_local')
      .eq('lang', 'JP')
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (error || !data || data.length === 0) break
    jpCards.push(...data)
    page++
  }
  console.log(`  ${jpCards.length} JP cards in DB\n`)

  // Build name lookup: Japanese name → [{setCode, cardId, imagePath}]
  const jpNameMap = new Map()
  for (const card of jpCards) {
    const name = card.name?.trim()
    if (!name) continue
    if (!jpNameMap.has(name)) jpNameMap.set(name, [])
    // Extract set code from set_id (format: jp-SV1S)
    const setCode = card.set_id?.replace('jp-', '') || ''
    jpNameMap.get(name).push({
      setCode,
      cardId: card.local_id,
      imagePath: card.image_local,
    })
  }
  console.log(`  ${jpNameMap.size} unique JP names indexed\n`)

  // 2. Iterate TCGDex JP sets
  const tcgdexSets = await fetchJSON('https://api.tcgdex.net/v2/ja/sets')
  if (!tcgdexSets) { console.error('Failed to fetch TCGDex JP sets'); return }
  console.log(`  ${tcgdexSets.length} TCGDex JP sets\n`)

  let mapped = 0, notFound = 0, alreadyHad = 0
  const batch = []

  for (const set of tcgdexSets) {
    const setData = await fetchJSON(`https://api.tcgdex.net/v2/ja/sets/${set.id}`)
    if (!setData?.cards) continue

    let setMapped = 0

    for (const card of setData.cards) {
      const jpName = card.name?.trim()
      if (!jpName) continue

      const tcgdexPath = `jp-tcgdex/${set.id}/${card.localId}.webp`

      // Check if already mapped
      const exists = await imageExists(`jp-tcgdex/${set.id}/${card.localId}.webp`)
      if (exists) { alreadyHad++; continue }

      // Find matching JP card by name
      const matches = jpNameMap.get(jpName) || []
      
      if (matches.length > 0) {
        // Use first match's image
        const match = matches[0]
        const sourcePath = `jp/${match.setCode}/${match.cardId}.jpg`
        
        // Copy the JP image to a TCGDex-compatible path
        const destPath = `jp/${set.id}/${card.localId}.jpg`
        const destExists = await imageExists(destPath)
        if (destExists) { alreadyHad++; continue }

        const ok = await copyImage(sourcePath, destPath)
        if (ok) {
          setMapped++
          mapped++

          // Update tcg_cards with the new path
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
        } else {
          notFound++
        }
      } else {
        notFound++
      }

      await sleep(DELAY)
    }

    if (setMapped > 0) {
      console.log(`  ${set.id} (${set.name}): ${setMapped} mapped`)
    }
  }

  // Final batch
  if (batch.length > 0) {
    await supabase.from('tcg_cards').upsert(batch, { onConflict: 'id' })
  }

  console.log(`\n═══ MAPPING COMPLETE ═══`)
  console.log(`  Mapped: ${mapped}`)
  console.log(`  Already had: ${alreadyHad}`)
  console.log(`  Not found: ${notFound}`)
}

main().catch(console.error)
